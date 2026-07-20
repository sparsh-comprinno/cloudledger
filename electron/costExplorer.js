import { CostExplorerClient, GetCostAndUsageCommand, GetCostForecastCommand } from '@aws-sdk/client-cost-explorer';

export async function getCostData(config) {
  const costData = {
    total_monthly_cost: 0,
    cost_by_service: {},
    monthly_trend: [],
    forecast: 0,
  };

  const client = new CostExplorerClient(config);
  const now = new Date();
  const end = now.toISOString().split('T')[0];
  const start30 = new Date(now - 30 * 86400000).toISOString().split('T')[0];
  const start180 = new Date(now - 180 * 86400000);
  const trendStart = `${start180.getFullYear()}-${String(start180.getMonth() + 1).padStart(2, '0')}-01`;

  // Cost by service (last 30 days)
  try {
    const resp = await client.send(new GetCostAndUsageCommand({
      TimePeriod: { Start: start30, End: end },
      Granularity: 'MONTHLY',
      Metrics: ['UnblendedCost'],
      GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }],
    }));
    for (const result of resp.ResultsByTime || []) {
      for (const group of result.Groups || []) {
        const svc = group.Keys?.[0] || 'Unknown';
        const amount = parseFloat(group.Metrics?.UnblendedCost?.Amount || '0');
        costData.cost_by_service[svc] = Math.round((costData.cost_by_service[svc] || 0) + amount * 100) / 100;
      }
    }
    costData.total_monthly_cost = Math.round(Object.values(costData.cost_by_service).reduce((a, b) => a + b, 0) * 100) / 100;
  } catch (e) {
    // Cost Explorer might not be enabled
  }

  // Monthly trend (last 6 months)
  try {
    const resp = await client.send(new GetCostAndUsageCommand({
      TimePeriod: { Start: trendStart, End: end },
      Granularity: 'MONTHLY',
      Metrics: ['UnblendedCost'],
    }));
    for (const result of resp.ResultsByTime || []) {
      const month = (result.TimePeriod?.Start || '').substring(0, 7);
      const cost = parseFloat(result.Total?.UnblendedCost?.Amount || '0');
      costData.monthly_trend.push({ month, cost: Math.round(cost * 100) / 100 });
    }
  } catch { /* skip */ }

  // Forecast
  try {
    const forecastStart = new Date(now.getTime() + 86400000).toISOString().split('T')[0];
    const forecastEnd = new Date(now.getTime() + 30 * 86400000).toISOString().split('T')[0];
    const resp = await client.send(new GetCostForecastCommand({
      TimePeriod: { Start: forecastStart, End: forecastEnd },
      Granularity: 'MONTHLY',
      Metric: 'UNBLENDED_COST',
    }));
    costData.forecast = Math.round(parseFloat(resp.Total?.Amount || '0') * 100) / 100;
  } catch { /* skip */ }

  return costData;
}

export function matchCostsToResources(resources, costData) {
  // Count how many resources belong to each service
  const serviceCounts = {};
  for (const r of resources) {
    serviceCounts[r.service] = (serviceCounts[r.service] || 0) + 1;
  }

  // Map our internal service names to Cost Explorer's naming
  const ceNameMap = {
    'EC2': 'Amazon Elastic Compute Cloud - Compute',
    'S3': 'Amazon Simple Storage Service',
    'RDS': 'Amazon Relational Database Service',
    'Lambda': 'AWS Lambda',
    'DynamoDB': 'Amazon DynamoDB',
    'ECS': 'Amazon EC2 Container Service',
    'CloudFront': 'Amazon CloudFront',
    'Route 53': 'Amazon Route 53',
    'ELB': 'Elastic Load Balancing',
    'CloudWatch': 'Amazon CloudWatch',
    'SNS': 'Amazon Simple Notification Service',
    'SQS': 'Amazon Simple Queue Service',
    'Kinesis': 'Amazon Kinesis',
    'ElastiCache': 'Amazon ElastiCache',
    'Redshift': 'Amazon Redshift',
    'OpenSearch': 'Amazon OpenSearch Service',
    'EFS': 'Amazon Elastic File System',
    'SageMaker': 'Amazon SageMaker',
    'Glue': 'AWS Glue',
    'Step Functions': 'AWS Step Functions',
    'API Gateway': 'Amazon API Gateway',
    'Secrets Manager': 'AWS Secrets Manager',
    'KMS': 'AWS Key Management Service',
    'CloudTrail': 'AWS CloudTrail',
    'VPC': 'Amazon Virtual Private Cloud',
    'ECR': 'Amazon EC2 Container Registry (ECR)',
    'CodeBuild': 'AWS CodeBuild',
    'CodePipeline': 'AWS CodePipeline',
    'Transfer Family': 'AWS Transfer Family',
    'WAFv2': 'AWS WAF',
    'IoT Core': 'AWS IoT',
    'FSx': 'Amazon FSx',
    'WorkSpaces': 'Amazon WorkSpaces',
  };

  for (const resource of resources) {
    const ceName = ceNameMap[resource.service];
    // Try exact match, then our internal name, then fuzzy
    const serviceCost = costData.cost_by_service[ceName]
      || costData.cost_by_service[resource.service]
      || Object.entries(costData.cost_by_service).find(([k]) => k.includes(resource.service) || resource.service.includes(k))?.[1]
      || 0;

    if (serviceCost > 0) {
      const count = serviceCounts[resource.service] || 1;
      resource.monthly_cost = Math.round((serviceCost / count) * 100) / 100;
    }
  }

  return resources;
}
