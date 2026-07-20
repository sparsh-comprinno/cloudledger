import { GlueClient, GetDatabasesCommand, GetCrawlersCommand, GetJobsCommand } from '@aws-sdk/client-glue';
import { AthenaClient, ListWorkGroupsCommand } from '@aws-sdk/client-athena';
import { EMRClient, ListClustersCommand } from '@aws-sdk/client-emr';

export const scanAnalytics = {
  async glueDatabases(config, region) {
    const client = new GlueClient(config);
    const resp = await client.send(new GetDatabasesCommand({}));
    return (resp.DatabaseList || []).map(db => ({
      service: 'Glue', resource_type: 'Database',
      resource_id: db.Name, name: db.Name,
      status: 'active', region,
      arn: `arn:aws:glue:${region}:*:database/${db.Name}`, monthly_cost: 0,
      details: { description: db.Description || '', location: db.LocationUri || '' },
    }));
  },

  async glueCrawlers(config, region) {
    const client = new GlueClient(config);
    const resp = await client.send(new GetCrawlersCommand({}));
    return (resp.Crawlers || []).map(c => ({
      service: 'Glue', resource_type: 'Crawler',
      resource_id: c.Name || '', name: c.Name || '',
      status: c.State || 'unknown', region,
      arn: `arn:aws:glue:${region}:*:crawler/${c.Name}`, monthly_cost: 0,
      details: { database: c.DatabaseName || '', role: c.Role || '' },
    }));
  },

  async glueJobs(config, region) {
    const client = new GlueClient(config);
    const resp = await client.send(new GetJobsCommand({}));
    return (resp.Jobs || []).map(j => ({
      service: 'Glue', resource_type: 'Job',
      resource_id: j.Name || '', name: j.Name || '',
      status: 'active', region,
      arn: `arn:aws:glue:${region}:*:job/${j.Name}`, monthly_cost: 0,
      details: { workers: String(j.NumberOfWorkers || 0), command: j.Command?.Name || '' },
    }));
  },

  async athena(config, region) {
    const client = new AthenaClient(config);
    const resp = await client.send(new ListWorkGroupsCommand({}));
    return (resp.WorkGroups || []).map(wg => ({
      service: 'Athena', resource_type: 'Workgroup',
      resource_id: wg.Name || '', name: wg.Name || '',
      status: wg.State || 'unknown', region,
      arn: `arn:aws:athena:${region}:*:workgroup/${wg.Name}`, monthly_cost: 0,
      details: { engine: wg.EngineVersion?.EffectiveEngineVersion || '' },
    }));
  },

  async emr(config, region) {
    const client = new EMRClient(config);
    const resp = await client.send(new ListClustersCommand({}));
    return (resp.Clusters || []).map(c => ({
      service: 'EMR', resource_type: 'Cluster',
      resource_id: c.Id || '', name: c.Name || '',
      status: c.Status?.State || 'unknown', region,
      arn: c.ClusterArn || '', monthly_cost: 0,
      details: { hours: String(c.NormalizedInstanceHours || 0) },
    }));
  },
};
