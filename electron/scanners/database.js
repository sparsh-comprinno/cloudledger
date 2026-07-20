import { RDSClient, DescribeDBInstancesCommand, DescribeDBClustersCommand } from '@aws-sdk/client-rds';
import { DynamoDBClient, ListTablesCommand, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { ElastiCacheClient, DescribeCacheClustersCommand } from '@aws-sdk/client-elasticache';
import { RedshiftClient, DescribeClustersCommand } from '@aws-sdk/client-redshift';
import { OpenSearchClient, ListDomainNamesCommand } from '@aws-sdk/client-opensearch';
import { DocDBClient, DescribeDBClustersCommand as DocDBDescribeCommand } from '@aws-sdk/client-docdb';
import { NeptuneClient, DescribeDBClustersCommand as NeptuneDescribeCommand } from '@aws-sdk/client-neptune';
import { QLDBClient, ListLedgersCommand } from '@aws-sdk/client-qldb';
import { TimestreamWriteClient, ListDatabasesCommand } from '@aws-sdk/client-timestream-write';

export const scanDatabase = {
  async rdsInstances(config, region) {
    const client = new RDSClient(config);
    const resp = await client.send(new DescribeDBInstancesCommand({}));
    return (resp.DBInstances || []).map(db => ({
      service: 'RDS', resource_type: 'DB Instance',
      resource_id: db.DBInstanceIdentifier || '', name: db.DBInstanceIdentifier || '',
      status: db.DBInstanceStatus || 'unknown', region,
      arn: db.DBInstanceArn || '', monthly_cost: 0,
      details: { class: db.DBInstanceClass || '', engine: db.Engine || '', version: db.EngineVersion || '', storage_gb: String(db.AllocatedStorage || 0), multi_az: String(db.MultiAZ || false) },
    }));
  },

  async rdsClusters(config, region) {
    const client = new RDSClient(config);
    const resp = await client.send(new DescribeDBClustersCommand({}));
    return (resp.DBClusters || []).map(c => ({
      service: 'RDS', resource_type: 'Aurora Cluster',
      resource_id: c.DBClusterIdentifier || '', name: c.DBClusterIdentifier || '',
      status: c.Status || 'unknown', region,
      arn: c.DBClusterArn || '', monthly_cost: 0,
      details: { engine: c.Engine || '', version: c.EngineVersion || '', members: String(c.DBClusterMembers?.length || 0) },
    }));
  },

  async dynamoDbTables(config, region) {
    const client = new DynamoDBClient(config);
    const resources = [];
    const resp = await client.send(new ListTablesCommand({}));
    for (const tableName of resp.TableNames || []) {
      try {
        const desc = await client.send(new DescribeTableCommand({ TableName: tableName }));
        const t = desc.Table;
        resources.push({
          service: 'DynamoDB', resource_type: 'Table',
          resource_id: tableName, name: tableName,
          status: t?.TableStatus || 'active', region,
          arn: t?.TableArn || '', monthly_cost: 0,
          details: { items: String(t?.ItemCount || 0), size_bytes: String(t?.TableSizeBytes || 0), billing: t?.BillingModeSummary?.BillingMode || 'PROVISIONED' },
        });
      } catch { resources.push({ service: 'DynamoDB', resource_type: 'Table', resource_id: tableName, name: tableName, status: 'active', region, arn: '', monthly_cost: 0, details: {} }); }
    }
    return resources;
  },

  async elasticache(config, region) {
    const client = new ElastiCacheClient(config);
    const resp = await client.send(new DescribeCacheClustersCommand({}));
    return (resp.CacheClusters || []).map(c => ({
      service: 'ElastiCache', resource_type: 'Cluster',
      resource_id: c.CacheClusterId || '', name: c.CacheClusterId || '',
      status: c.CacheClusterStatus || 'unknown', region,
      arn: c.ARN || '', monthly_cost: 0,
      details: { engine: c.Engine || '', node_type: c.CacheNodeType || '', nodes: String(c.NumCacheNodes || 0) },
    }));
  },

  async redshift(config, region) {
    const client = new RedshiftClient(config);
    const resp = await client.send(new DescribeClustersCommand({}));
    return (resp.Clusters || []).map(c => ({
      service: 'Redshift', resource_type: 'Cluster',
      resource_id: c.ClusterIdentifier || '', name: c.ClusterIdentifier || '',
      status: c.ClusterStatus || 'unknown', region,
      arn: `arn:aws:redshift:${region}:*:cluster:${c.ClusterIdentifier}`, monthly_cost: 0,
      details: { node_type: c.NodeType || '', nodes: String(c.NumberOfNodes || 0) },
    }));
  },

  async opensearch(config, region) {
    const client = new OpenSearchClient(config);
    const resp = await client.send(new ListDomainNamesCommand({}));
    return (resp.DomainNames || []).map(d => ({
      service: 'OpenSearch', resource_type: 'Domain',
      resource_id: d.DomainName || '', name: d.DomainName || '',
      status: 'active', region, arn: '', monthly_cost: 0,
      details: { engine: d.EngineType || '' },
    }));
  },

  async documentDb(config, region) {
    const client = new DocDBClient(config);
    const resp = await client.send(new DocDBDescribeCommand({}));
    return (resp.DBClusters || []).map(c => ({
      service: 'DocumentDB', resource_type: 'Cluster',
      resource_id: c.DBClusterIdentifier || '', name: c.DBClusterIdentifier || '',
      status: c.Status || 'unknown', region,
      arn: c.DBClusterArn || '', monthly_cost: 0,
      details: { engine: c.Engine || '', members: String(c.DBClusterMembers?.length || 0) },
    }));
  },

  async neptune(config, region) {
    const client = new NeptuneClient(config);
    const resp = await client.send(new NeptuneDescribeCommand({}));
    return (resp.DBClusters || []).map(c => ({
      service: 'Neptune', resource_type: 'Cluster',
      resource_id: c.DBClusterIdentifier || '', name: c.DBClusterIdentifier || '',
      status: c.Status || 'unknown', region,
      arn: c.DBClusterArn || '', monthly_cost: 0,
      details: { engine: c.Engine || '' },
    }));
  },

  async qldb(config, region) {
    const client = new QLDBClient(config);
    const resp = await client.send(new ListLedgersCommand({}));
    return (resp.Ledgers || []).map(l => ({
      service: 'QLDB', resource_type: 'Ledger',
      resource_id: l.Name || '', name: l.Name || '',
      status: l.State || 'unknown', region, arn: '', monthly_cost: 0, details: {},
    }));
  },

  async timestream(config, region) {
    const client = new TimestreamWriteClient(config);
    const resp = await client.send(new ListDatabasesCommand({}));
    return (resp.Databases || []).map(db => ({
      service: 'Timestream', resource_type: 'Database',
      resource_id: db.DatabaseName || '', name: db.DatabaseName || '',
      status: 'active', region, arn: db.Arn || '', monthly_cost: 0, details: {},
    }));
  },
};
