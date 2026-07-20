import { CloudFrontClient, ListDistributionsCommand } from '@aws-sdk/client-cloudfront';
import { Route53Client, ListHostedZonesCommand } from '@aws-sdk/client-route-53';
import { TransferClient, ListServersCommand } from '@aws-sdk/client-transfer';
import { DataSyncClient, ListTasksCommand } from '@aws-sdk/client-datasync';
import { WorkSpacesClient, DescribeWorkspacesCommand } from '@aws-sdk/client-workspaces';
import { DirectoryServiceClient, DescribeDirectoriesCommand } from '@aws-sdk/client-directory-service';

export const scanMisc = {
  async cloudfront(config, region) {
    const client = new CloudFrontClient(config);
    const resp = await client.send(new ListDistributionsCommand({}));
    const items = resp.DistributionList?.Items || [];
    return items.map(d => ({
      service: 'CloudFront', resource_type: 'Distribution',
      resource_id: d.Id || '', name: d.DomainName || '',
      status: d.Status || 'unknown', region: 'global',
      arn: d.ARN || '', monthly_cost: 0,
      details: { domain: d.DomainName || '', origins: String(d.Origins?.Quantity || 0) },
    }));
  },

  async route53(config, region) {
    const client = new Route53Client(config);
    const resp = await client.send(new ListHostedZonesCommand({}));
    return (resp.HostedZones || []).map(z => {
      const id = (z.Id || '').replace('/hostedzone/', '');
      return {
        service: 'Route 53', resource_type: 'Hosted Zone',
        resource_id: id, name: z.Name || '',
        status: 'active', region: 'global',
        arn: `arn:aws:route53:::hostedzone/${id}`, monthly_cost: 0,
        details: { records: String(z.ResourceRecordSetCount || 0), private: String(z.Config?.PrivateZone || false) },
      };
    });
  },

  async transfer(config, region) {
    const client = new TransferClient(config);
    const resp = await client.send(new ListServersCommand({}));
    return (resp.Servers || []).map(s => ({
      service: 'Transfer Family', resource_type: 'Server',
      resource_id: s.ServerId || '', name: s.ServerId || '',
      status: s.State || 'unknown', region,
      arn: s.Arn || '', monthly_cost: 0,
      details: { endpoint_type: s.EndpointType || '', domain: s.Domain || '' },
    }));
  },

  async datasync(config, region) {
    const client = new DataSyncClient(config);
    const resp = await client.send(new ListTasksCommand({}));
    return (resp.Tasks || []).map(t => ({
      service: 'DataSync', resource_type: 'Task',
      resource_id: t.TaskArn || '', name: t.Name || '',
      status: t.Status || 'unknown', region,
      arn: t.TaskArn || '', monthly_cost: 0, details: {},
    }));
  },

  async workspaces(config, region) {
    const client = new WorkSpacesClient(config);
    const resp = await client.send(new DescribeWorkspacesCommand({}));
    return (resp.Workspaces || []).map(ws => ({
      service: 'WorkSpaces', resource_type: 'Workspace',
      resource_id: ws.WorkspaceId || '', name: ws.UserName || '',
      status: ws.State || 'unknown', region,
      arn: `arn:aws:workspaces:${region}:*:workspace/${ws.WorkspaceId}`, monthly_cost: 0,
      details: { bundle: ws.BundleId || '', compute: ws.WorkspaceProperties?.ComputeTypeName || '' },
    }));
  },

  async directoryService(config, region) {
    const client = new DirectoryServiceClient(config);
    const resp = await client.send(new DescribeDirectoriesCommand({}));
    return (resp.DirectoryDescriptions || []).map(d => ({
      service: 'Directory Service', resource_type: 'Directory',
      resource_id: d.DirectoryId || '', name: d.Name || '',
      status: d.Stage || 'unknown', region,
      arn: `arn:aws:ds:${region}:*:directory/${d.DirectoryId}`, monthly_cost: 0,
      details: { type: d.Type || '', size: d.Size || '' },
    }));
  },
};
