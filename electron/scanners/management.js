import { SSMClient, DescribeParametersCommand } from '@aws-sdk/client-ssm';
import { BackupClient, ListBackupVaultsCommand } from '@aws-sdk/client-backup';
import { ElasticBeanstalkClient, DescribeEnvironmentsCommand } from '@aws-sdk/client-elastic-beanstalk';
import { LightsailClient, GetInstancesCommand } from '@aws-sdk/client-lightsail';
import { BatchClient, DescribeComputeEnvironmentsCommand } from '@aws-sdk/client-batch';

export const scanManagement = {
  async ssmParameters(config, region) {
    const client = new SSMClient(config);
    const resp = await client.send(new DescribeParametersCommand({}));
    return (resp.Parameters || []).map(p => ({
      service: 'Systems Manager', resource_type: 'Parameter',
      resource_id: p.Name || '', name: p.Name || '',
      status: 'active', region,
      arn: `arn:aws:ssm:${region}:*:parameter${p.Name?.startsWith('/') ? '' : '/'}${p.Name}`, monthly_cost: 0,
      details: { type: p.Type || '', tier: p.Tier || '' },
    }));
  },

  async backupVaults(config, region) {
    const client = new BackupClient(config);
    const resp = await client.send(new ListBackupVaultsCommand({}));
    return (resp.BackupVaultList || []).map(v => ({
      service: 'AWS Backup', resource_type: 'Backup Vault',
      resource_id: v.BackupVaultName || '', name: v.BackupVaultName || '',
      status: 'active', region,
      arn: v.BackupVaultArn || '', monthly_cost: 0,
      details: { recovery_points: String(v.NumberOfRecoveryPoints || 0) },
    }));
  },

  async beanstalk(config, region) {
    const client = new ElasticBeanstalkClient(config);
    const resp = await client.send(new DescribeEnvironmentsCommand({}));
    return (resp.Environments || []).map(env => ({
      service: 'Elastic Beanstalk', resource_type: 'Environment',
      resource_id: env.EnvironmentId || '', name: env.EnvironmentName || '',
      status: env.Status || 'unknown', region,
      arn: env.EnvironmentArn || '', monthly_cost: 0,
      details: { health: env.Health || '', app: env.ApplicationName || '' },
    }));
  },

  async lightsail(config, region) {
    const client = new LightsailClient(config);
    const resp = await client.send(new GetInstancesCommand({}));
    return (resp.instances || []).map(i => ({
      service: 'Lightsail', resource_type: 'Instance',
      resource_id: i.name || '', name: i.name || '',
      status: i.state?.name || 'unknown', region,
      arn: i.arn || '', monthly_cost: 0,
      details: { blueprint: i.blueprintId || '', bundle: i.bundleId || '', public_ip: i.publicIpAddress || '' },
    }));
  },

  async batch(config, region) {
    const client = new BatchClient(config);
    const resp = await client.send(new DescribeComputeEnvironmentsCommand({}));
    return (resp.computeEnvironments || []).map(env => ({
      service: 'AWS Batch', resource_type: 'Compute Environment',
      resource_id: env.computeEnvironmentName || '', name: env.computeEnvironmentName || '',
      status: env.state || 'unknown', region,
      arn: env.computeEnvironmentArn || '', monthly_cost: 0,
      details: { type: env.type || '', status: env.status || '' },
    }));
  },
};
