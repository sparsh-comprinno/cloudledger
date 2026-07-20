import { fromIni, fromEnv } from '@aws-sdk/credential-providers';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { scanCompute } from './scanners/compute.js';
import { scanNetworking } from './scanners/networking.js';
import { scanStorage } from './scanners/storage.js';
import { scanDatabase } from './scanners/database.js';
import { scanContainers } from './scanners/containers.js';
import { scanServerless } from './scanners/serverless.js';
import { scanMessaging } from './scanners/messaging.js';
import { scanMonitoring } from './scanners/monitoring.js';
import { scanSecurity } from './scanners/security.js';
import { scanAnalytics } from './scanners/analytics.js';
import { scanDevtools } from './scanners/devtools.js';
import { scanManagement } from './scanners/management.js';
import { scanMlIot } from './scanners/mlIot.js';
import { scanMisc } from './scanners/misc.js';
import { scanAllTaggedResources } from './scanners/resourceExplorer.js';
import { getCostData, matchCostsToResources } from './costExplorer.js';

export async function startScan(credentials, progressCallback) {
  const startTime = Date.now();
  const config = buildAwsConfig(credentials);
  const region = credentials.region;

  // Validate credentials first with a quick STS call
  progressCallback({
    current_service: 'Validating credentials...',
    services_scanned: 0,
    total_services: 85,
    resources_found: 0,
    percentage: 0,
    log_message: 'Validating AWS credentials...',
  });

  try {
    const stsClient = new STSClient(config);
    const identity = await stsClient.send(new GetCallerIdentityCommand({}));
    progressCallback({
      current_service: 'Credentials validated',
      services_scanned: 0,
      total_services: 85,
      resources_found: 0,
      percentage: 1,
      log_message: `✓ Authenticated as ${identity.Arn}`,
    });
  } catch (err) {
    throw new Error(`Authentication failed: ${err.message}. Check your credentials and try again.`);
  }

  let allResources = [];
  let serviceIndex = 0;
  const totalServices = 85;

  const scanService = async (name, scanFn) => {
    serviceIndex++;
    const pct = (serviceIndex / totalServices) * 100;
    progressCallback({
      current_service: name,
      services_scanned: serviceIndex,
      total_services: totalServices,
      resources_found: allResources.length,
      percentage: pct,
      log_message: `Scanning ${name}...`,
    });

    try {
      const resources = await scanFn(config, region);
      allResources.push(...resources);
      progressCallback({
        current_service: name,
        services_scanned: serviceIndex,
        total_services: totalServices,
        resources_found: allResources.length,
        percentage: pct,
        log_message: `✓ ${name} - found ${resources.length} resources`,
      });
    } catch (err) {
      progressCallback({
        current_service: name,
        services_scanned: serviceIndex,
        total_services: totalServices,
        resources_found: allResources.length,
        percentage: pct,
        log_message: `⚠ ${name} - ${err.message || err}`,
      });
    }
  };

  // ===== COMPUTE =====
  await scanService('EC2 Instances', (c, r) => scanCompute.instances(c, r));
  await scanService('EBS Volumes', (c, r) => scanCompute.volumes(c, r));
  await scanService('EBS Snapshots', (c, r) => scanCompute.snapshots(c, r));
  await scanService('AMIs', (c, r) => scanCompute.amis(c, r));
  await scanService('Security Groups', (c, r) => scanCompute.securityGroups(c, r));
  await scanService('Key Pairs', (c, r) => scanCompute.keyPairs(c, r));
  await scanService('Elastic IPs', (c, r) => scanCompute.elasticIps(c, r));
  await scanService('Network Interfaces', (c, r) => scanCompute.networkInterfaces(c, r));
  await scanService('Launch Templates', (c, r) => scanCompute.launchTemplates(c, r));
  await scanService('Auto Scaling Groups', (c, r) => scanCompute.autoScalingGroups(c, r));

  // ===== NETWORKING =====
  await scanService('VPCs', (c, r) => scanNetworking.vpcs(c, r));
  await scanService('Subnets', (c, r) => scanNetworking.subnets(c, r));
  await scanService('Route Tables', (c, r) => scanNetworking.routeTables(c, r));
  await scanService('Internet Gateways', (c, r) => scanNetworking.internetGateways(c, r));
  await scanService('NAT Gateways', (c, r) => scanNetworking.natGateways(c, r));
  await scanService('VPC Endpoints', (c, r) => scanNetworking.vpcEndpoints(c, r));
  await scanService('Transit Gateways', (c, r) => scanNetworking.transitGateways(c, r));
  await scanService('Load Balancers (Classic)', (c, r) => scanNetworking.classicElbs(c, r));
  await scanService('Load Balancers (v2)', (c, r) => scanNetworking.elbv2(c, r));
  await scanService('Target Groups', (c, r) => scanNetworking.targetGroups(c, r));

  // ===== STORAGE =====
  await scanService('S3 Buckets', (c, r) => scanStorage.s3Buckets(c, r));
  await scanService('EFS File Systems', (c, r) => scanStorage.efs(c, r));
  await scanService('FSx File Systems', (c, r) => scanStorage.fsx(c, r));
  await scanService('Storage Gateway', (c, r) => scanStorage.storageGateway(c, r));

  // ===== DATABASES =====
  await scanService('RDS Instances', (c, r) => scanDatabase.rdsInstances(c, r));
  await scanService('RDS Clusters (Aurora)', (c, r) => scanDatabase.rdsClusters(c, r));
  await scanService('DynamoDB Tables', (c, r) => scanDatabase.dynamoDbTables(c, r));
  await scanService('ElastiCache Clusters', (c, r) => scanDatabase.elasticache(c, r));
  await scanService('Redshift Clusters', (c, r) => scanDatabase.redshift(c, r));
  await scanService('OpenSearch Domains', (c, r) => scanDatabase.opensearch(c, r));
  await scanService('DocumentDB Clusters', (c, r) => scanDatabase.documentDb(c, r));
  await scanService('Neptune Clusters', (c, r) => scanDatabase.neptune(c, r));
  await scanService('QLDB Ledgers', (c, r) => scanDatabase.qldb(c, r));
  await scanService('Timestream Databases', (c, r) => scanDatabase.timestream(c, r));

  // ===== CONTAINERS =====
  await scanService('ECS Clusters', (c, r) => scanContainers.ecsClusters(c, r));
  await scanService('ECS Services', (c, r) => scanContainers.ecsServices(c, r));
  await scanService('EKS Clusters', (c, r) => scanContainers.eksClusters(c, r));
  await scanService('ECR Repositories', (c, r) => scanContainers.ecrRepos(c, r));

  // ===== SERVERLESS =====
  await scanService('Lambda Functions', (c, r) => scanServerless.lambdaFunctions(c, r));
  await scanService('Lambda Layers', (c, r) => scanServerless.lambdaLayers(c, r));
  await scanService('Step Functions', (c, r) => scanServerless.stepFunctions(c, r));
  await scanService('API Gateway (REST)', (c, r) => scanServerless.apiGatewayRest(c, r));
  await scanService('API Gateway (HTTP/WS)', (c, r) => scanServerless.apiGatewayV2(c, r));
  await scanService('AppSync APIs', (c, r) => scanServerless.appsync(c, r));
  await scanService('EventBridge', (c, r) => scanServerless.eventbridge(c, r));

  // ===== MESSAGING =====
  await scanService('SNS Topics', (c, r) => scanMessaging.snsTopics(c, r));
  await scanService('SQS Queues', (c, r) => scanMessaging.sqsQueues(c, r));
  await scanService('Kinesis Streams', (c, r) => scanMessaging.kinesis(c, r));
  await scanService('Firehose Streams', (c, r) => scanMessaging.firehose(c, r));
  await scanService('Amazon MQ', (c, r) => scanMessaging.mq(c, r));
  await scanService('MSK Clusters', (c, r) => scanMessaging.msk(c, r));

  // ===== MONITORING =====
  await scanService('CloudWatch Alarms', (c, r) => scanMonitoring.alarms(c, r));
  await scanService('CloudWatch Log Groups', (c, r) => scanMonitoring.logGroups(c, r));
  await scanService('CloudTrail Trails', (c, r) => scanMonitoring.cloudtrail(c, r));
  await scanService('Config Rules', (c, r) => scanMonitoring.configRules(c, r));

  // ===== SECURITY =====
  await scanService('IAM Users', (c, r) => scanSecurity.iamUsers(c, r));
  await scanService('IAM Roles', (c, r) => scanSecurity.iamRoles(c, r));
  await scanService('IAM Policies', (c, r) => scanSecurity.iamPolicies(c, r));
  await scanService('KMS Keys', (c, r) => scanSecurity.kmsKeys(c, r));
  await scanService('Secrets Manager', (c, r) => scanSecurity.secrets(c, r));
  await scanService('ACM Certificates', (c, r) => scanSecurity.acmCerts(c, r));
  await scanService('WAFv2 Web ACLs', (c, r) => scanSecurity.wafv2(c, r));
  await scanService('GuardDuty', (c, r) => scanSecurity.guardduty(c, r));
  await scanService('Shield', (c, r) => scanSecurity.shield(c, r));

  // ===== ANALYTICS =====
  await scanService('Glue Databases', (c, r) => scanAnalytics.glueDatabases(c, r));
  await scanService('Glue Crawlers', (c, r) => scanAnalytics.glueCrawlers(c, r));
  await scanService('Glue Jobs', (c, r) => scanAnalytics.glueJobs(c, r));
  await scanService('Athena Workgroups', (c, r) => scanAnalytics.athena(c, r));
  await scanService('EMR Clusters', (c, r) => scanAnalytics.emr(c, r));

  // ===== DEV TOOLS =====
  await scanService('CodeBuild Projects', (c, r) => scanDevtools.codebuild(c, r));
  await scanService('CodePipeline', (c, r) => scanDevtools.codepipeline(c, r));
  await scanService('CodeCommit Repos', (c, r) => scanDevtools.codecommit(c, r));
  await scanService('CodeDeploy Apps', (c, r) => scanDevtools.codedeploy(c, r));
  await scanService('CloudFormation Stacks', (c, r) => scanDevtools.cloudformation(c, r));

  // ===== MANAGEMENT =====
  await scanService('SSM Parameters', (c, r) => scanManagement.ssmParameters(c, r));
  await scanService('Backup Vaults', (c, r) => scanManagement.backupVaults(c, r));
  await scanService('Elastic Beanstalk', (c, r) => scanManagement.beanstalk(c, r));
  await scanService('Lightsail Instances', (c, r) => scanManagement.lightsail(c, r));
  await scanService('Batch Environments', (c, r) => scanManagement.batch(c, r));

  // ===== ML & IoT =====
  await scanService('SageMaker Endpoints', (c, r) => scanMlIot.sagemakerEndpoints(c, r));
  await scanService('SageMaker Notebooks', (c, r) => scanMlIot.sagemakerNotebooks(c, r));
  await scanService('IoT Things', (c, r) => scanMlIot.iotThings(c, r));
  await scanService('Cognito User Pools', (c, r) => scanMlIot.cognitoUserPools(c, r));
  await scanService('Cognito Identity Pools', (c, r) => scanMlIot.cognitoIdentityPools(c, r));

  // ===== MISC =====
  await scanService('CloudFront Distributions', (c, r) => scanMisc.cloudfront(c, r));
  await scanService('Route 53 Hosted Zones', (c, r) => scanMisc.route53(c, r));
  await scanService('Transfer Family', (c, r) => scanMisc.transfer(c, r));
  await scanService('DataSync Tasks', (c, r) => scanMisc.datasync(c, r));
  await scanService('WorkSpaces', (c, r) => scanMisc.workspaces(c, r));
  await scanService('Directory Service', (c, r) => scanMisc.directoryService(c, r));

  // ===== CATCH-ALL: Resource Groups Tagging API =====
  await scanService('Resource Groups (Catch-All)', async (c, r) => {
    return await scanAllTaggedResources(c, r, allResources);
  });

  // ===== COST EXPLORER =====
  progressCallback({
    current_service: 'Cost Explorer',
    services_scanned: totalServices,
    total_services: totalServices,
    resources_found: allResources.length,
    percentage: 99,
    log_message: 'Querying AWS Cost Explorer...',
  });

  const costData = await getCostData(config);
  allResources = matchCostsToResources(allResources, costData);

  const duration = (Date.now() - startTime) / 1000;

  progressCallback({
    current_service: 'Complete!',
    services_scanned: totalServices,
    total_services: totalServices,
    resources_found: allResources.length,
    percentage: 100,
    log_message: `✅ Scan complete! Found ${allResources.length} resources in ${duration.toFixed(1)}s`,
  });

  return {
    resources: allResources,
    cost_data: costData,
    scan_duration_seconds: duration,
    total_resources: allResources.length,
    services_scanned: totalServices,
    errors: [],
  };
}

function buildAwsConfig(credentials) {
  const region = credentials.region;
  const requestTimeout = 30000; // 30 second timeout per API call

  if (credentials.use_env_vars) {
    return { region, credentials: fromEnv(), requestHandler: { requestTimeout } };
  }

  if (credentials.use_profile) {
    return {
      region,
      credentials: fromIni({ profile: credentials.profile || 'default' }),
      requestHandler: { requestTimeout },
    };
  }

  // Static credentials (manual entry)
  const creds = {
    accessKeyId: credentials.access_key_id,
    secretAccessKey: credentials.secret_access_key,
  };
  if (credentials.session_token) {
    creds.sessionToken = credentials.session_token;
  }

  return { region, credentials: creds, requestHandler: { requestTimeout } };
}
