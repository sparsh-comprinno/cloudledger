import { ResourceGroupsTaggingAPIClient, GetResourcesCommand } from '@aws-sdk/client-resource-groups-tagging-api';

/**
 * Catch-all scanner using the Resource Groups Tagging API.
 * This picks up ANY resource that has an ARN and participates in tagging,
 * covering 200+ AWS service types. We deduplicate against what was already
 * found by the individual scanners above.
 */
export async function scanAllTaggedResources(config, region, alreadyFound) {
  const client = new ResourceGroupsTaggingAPIClient(config);
  const resources = [];

  // Build dedup sets
  const knownArns = new Set(alreadyFound.filter(r => r.arn).map(r => r.arn));
  const knownIds = new Set(alreadyFound.map(r => r.resource_id));

  let paginationToken = undefined;
  do {
    const resp = await client.send(new GetResourcesCommand({
      ResourcesPerPage: 100,
      PaginationToken: paginationToken || undefined,
    }));

    for (const mapping of resp.ResourceTagMappingList || []) {
      const arn = mapping.ResourceARN || '';
      if (knownArns.has(arn)) continue;

      const parsed = parseArn(arn);
      if (knownIds.has(parsed.resourceId)) continue;

      const name = (mapping.Tags || []).find(t => t.Key === 'Name')?.Value || '';

      const details = {};
      for (const tag of mapping.Tags || []) {
        if (tag.Key !== 'Name' && Object.keys(details).length < 15) {
          details[`tag:${tag.Key}`] = tag.Value || '';
        }
      }

      resources.push({
        service: parsed.service,
        resource_type: parsed.resourceType,
        resource_id: parsed.resourceId,
        name,
        status: 'active',
        region: parsed.region || region,
        arn,
        monthly_cost: 0,
        details,
      });
    }

    paginationToken = resp.PaginationToken;
  } while (paginationToken);

  return resources;
}

function parseArn(arn) {
  const parts = arn.split(':');
  if (parts.length < 6) {
    return { service: 'Unknown', resourceType: 'Resource', resourceId: arn, region: null };
  }

  const serviceRaw = parts[2];
  const region = parts[3] || null;
  const resourcePart = parts.slice(5).join(':');

  const service = friendlyServiceName(serviceRaw);

  let resourceType = 'Resource';
  let resourceId = resourcePart;

  if (resourcePart.includes('/')) {
    const idx = resourcePart.indexOf('/');
    resourceType = friendlyResourceType(resourcePart.substring(0, idx));
    resourceId = resourcePart.substring(idx + 1);
  } else if (resourcePart.includes(':')) {
    const idx = resourcePart.indexOf(':');
    resourceType = friendlyResourceType(resourcePart.substring(0, idx));
    resourceId = resourcePart.substring(idx + 1);
  }

  return { service, resourceType, resourceId, region };
}

function friendlyServiceName(raw) {
  const map = {
    ec2: 'EC2', s3: 'S3', rds: 'RDS', lambda: 'Lambda', dynamodb: 'DynamoDB',
    ecs: 'ECS', eks: 'EKS', ecr: 'ECR', elasticloadbalancing: 'ELB',
    autoscaling: 'Auto Scaling', cloudformation: 'CloudFormation', cloudwatch: 'CloudWatch',
    logs: 'CloudWatch Logs', sns: 'SNS', sqs: 'SQS', iam: 'IAM', kms: 'KMS',
    secretsmanager: 'Secrets Manager', ssm: 'Systems Manager', states: 'Step Functions',
    apigateway: 'API Gateway', cloudfront: 'CloudFront', route53: 'Route 53',
    elasticache: 'ElastiCache', redshift: 'Redshift', es: 'OpenSearch', opensearch: 'OpenSearch',
    kinesis: 'Kinesis', firehose: 'Kinesis Firehose', glue: 'Glue', athena: 'Athena',
    elasticmapreduce: 'EMR', sagemaker: 'SageMaker', codebuild: 'CodeBuild',
    codepipeline: 'CodePipeline', codecommit: 'CodeCommit', codedeploy: 'CodeDeploy',
    elasticbeanstalk: 'Elastic Beanstalk', appsync: 'AppSync', 'cognito-idp': 'Cognito',
    'cognito-identity': 'Cognito', events: 'EventBridge', mq: 'Amazon MQ',
    kafka: 'MSK', docdb: 'DocumentDB', neptune: 'Neptune', qldb: 'QLDB',
    timestream: 'Timestream', backup: 'AWS Backup', transfer: 'Transfer Family',
    apprunner: 'App Runner', lightsail: 'Lightsail', iot: 'IoT Core',
    wafv2: 'WAFv2', waf: 'WAF', shield: 'Shield', guardduty: 'GuardDuty',
    inspector2: 'Inspector', acm: 'ACM', ds: 'Directory Service', workspaces: 'WorkSpaces',
    fsx: 'FSx', elasticfilesystem: 'EFS', storagegateway: 'Storage Gateway',
    datasync: 'DataSync', batch: 'AWS Batch', ram: 'RAM', cloudtrail: 'CloudTrail',
    config: 'AWS Config', amplify: 'Amplify', appconfig: 'AppConfig', appflow: 'AppFlow',
    connect: 'Amazon Connect', dms: 'DMS', forecast: 'Forecast', gamelift: 'GameLift',
    globalaccelerator: 'Global Accelerator', grafana: 'Managed Grafana',
    kendra: 'Kendra', cassandra: 'Keyspaces', lakeformation: 'Lake Formation',
    lex: 'Lex', geo: 'Location Service', macie2: 'Macie', memorydb: 'MemoryDB',
    airflow: 'MWAA', 'network-firewall': 'Network Firewall', aoss: 'OpenSearch Serverless',
    personalize: 'Personalize', pinpoint: 'Pinpoint', proton: 'Proton',
    quicksight: 'QuickSight', robomaker: 'RoboMaker', servicediscovery: 'Cloud Map',
    textract: 'Textract', transcribe: 'Transcribe', translate: 'Translate',
    xray: 'X-Ray', mediaconvert: 'MediaConvert', medialive: 'MediaLive',
    mediapackage: 'MediaPackage', securityhub: 'Security Hub', fis: 'Fault Injection Simulator',
    'vpc-lattice': 'VPC Lattice', synthetics: 'CloudWatch Synthetics',
    pipes: 'EventBridge Pipes', scheduler: 'EventBridge Scheduler',
    codeartifact: 'CodeArtifact', comprehend: 'Comprehend', rekognition: 'Rekognition',
    iotsitewise: 'IoT SiteWise', iotevents: 'IoT Events', greengrass: 'IoT Greengrass',
    organizations: 'Organizations', 'access-analyzer': 'IAM Access Analyzer',
  };
  if (map[raw]) return map[raw];
  // Title-case fallback
  return raw.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function friendlyResourceType(raw) {
  const map = {
    instance: 'Instance', volume: 'Volume', snapshot: 'Snapshot',
    'security-group': 'Security Group', vpc: 'VPC', subnet: 'Subnet',
    db: 'DB Instance', cluster: 'Cluster', function: 'Function',
    table: 'Table', bucket: 'Bucket', queue: 'Queue', topic: 'Topic',
    alarm: 'Alarm', rule: 'Rule', stack: 'Stack', key: 'Key',
    secret: 'Secret', certificate: 'Certificate', distribution: 'Distribution',
    repository: 'Repository', project: 'Project', pipeline: 'Pipeline',
    environment: 'Environment', service: 'Service', endpoint: 'Endpoint',
    'log-group': 'Log Group', stream: 'Stream', broker: 'Broker',
    'file-system': 'File System', gateway: 'Gateway', detector: 'Detector',
    'web-acl': 'Web ACL', domain: 'Domain', ledger: 'Ledger',
    loadbalancer: 'Load Balancer', targetgroup: 'Target Group',
    natgateway: 'NAT Gateway', stateMachine: 'State Machine',
    'event-bus': 'Event Bus', workspace: 'Workspace', directory: 'Directory',
  };
  if (map[raw]) return map[raw];
  return raw.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
