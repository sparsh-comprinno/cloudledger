import { CloudWatchClient, DescribeAlarmsCommand } from '@aws-sdk/client-cloudwatch';
import { CloudWatchLogsClient, DescribeLogGroupsCommand } from '@aws-sdk/client-cloudwatch-logs';
import { CloudTrailClient, DescribeTrailsCommand } from '@aws-sdk/client-cloudtrail';
import { ConfigServiceClient, DescribeConfigRulesCommand } from '@aws-sdk/client-config-service';

export const scanMonitoring = {
  async alarms(config, region) {
    const client = new CloudWatchClient(config);
    const resp = await client.send(new DescribeAlarmsCommand({}));
    return (resp.MetricAlarms || []).map(a => ({
      service: 'CloudWatch', resource_type: 'Alarm',
      resource_id: a.AlarmName || '', name: a.AlarmName || '',
      status: a.StateValue || 'unknown', region,
      arn: a.AlarmArn || '', monthly_cost: 0,
      details: { metric: a.MetricName || '', namespace: a.Namespace || '' },
    }));
  },

  async logGroups(config, region) {
    const client = new CloudWatchLogsClient(config);
    const resp = await client.send(new DescribeLogGroupsCommand({}));
    return (resp.logGroups || []).map(lg => ({
      service: 'CloudWatch', resource_type: 'Log Group',
      resource_id: lg.logGroupName || '', name: lg.logGroupName || '',
      status: 'active', region,
      arn: lg.arn || '', monthly_cost: 0,
      details: { stored_bytes: String(lg.storedBytes || 0), retention_days: String(lg.retentionInDays || 'Never') },
    }));
  },

  async cloudtrail(config, region) {
    const client = new CloudTrailClient(config);
    const resp = await client.send(new DescribeTrailsCommand({}));
    return (resp.trailList || []).map(t => ({
      service: 'CloudTrail', resource_type: 'Trail',
      resource_id: t.Name || '', name: t.Name || '',
      status: 'active', region,
      arn: t.TrailARN || '', monthly_cost: 0,
      details: { s3_bucket: t.S3BucketName || '', multi_region: String(t.IsMultiRegionTrail || false) },
    }));
  },

  async configRules(config, region) {
    const client = new ConfigServiceClient(config);
    const resp = await client.send(new DescribeConfigRulesCommand({}));
    return (resp.ConfigRules || []).map(r => ({
      service: 'AWS Config', resource_type: 'Config Rule',
      resource_id: r.ConfigRuleId || '', name: r.ConfigRuleName || '',
      status: r.ConfigRuleState || 'unknown', region,
      arn: r.ConfigRuleArn || '', monthly_cost: 0, details: {},
    }));
  },
};
