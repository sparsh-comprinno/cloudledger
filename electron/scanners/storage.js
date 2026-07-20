import { S3Client, ListBucketsCommand, GetBucketLocationCommand } from '@aws-sdk/client-s3';
import { EFSClient, DescribeFileSystemsCommand } from '@aws-sdk/client-efs';
import { FSxClient, DescribeFileSystemsCommand as FSxDescribeCommand } from '@aws-sdk/client-fsx';
import { StorageGatewayClient, ListGatewaysCommand } from '@aws-sdk/client-storage-gateway';

export const scanStorage = {
  async s3Buckets(config, region) {
    const client = new S3Client(config);
    const resources = [];
    const resp = await client.send(new ListBucketsCommand({}));
    for (const bucket of resp.Buckets || []) {
      try {
        const loc = await client.send(new GetBucketLocationCommand({ Bucket: bucket.Name }));
        const bucketRegion = loc.LocationConstraint || 'us-east-1';
        if (bucketRegion !== region && region !== 'us-east-1') continue;
        resources.push({
          service: 'S3', resource_type: 'Bucket',
          resource_id: bucket.Name || '', name: bucket.Name || '',
          status: 'active', region: bucketRegion,
          arn: `arn:aws:s3:::${bucket.Name}`, monthly_cost: 0,
          details: { created: bucket.CreationDate?.toISOString() || '' },
        });
      } catch { /* skip inaccessible buckets */ }
    }
    return resources;
  },

  async efs(config, region) {
    const client = new EFSClient(config);
    const resp = await client.send(new DescribeFileSystemsCommand({}));
    return (resp.FileSystems || []).map(fs => ({
      service: 'EFS', resource_type: 'File System',
      resource_id: fs.FileSystemId || '', name: fs.Name || '',
      status: fs.LifeCycleState || 'unknown', region,
      arn: fs.FileSystemArn || '', monthly_cost: 0,
      details: { performance_mode: fs.PerformanceMode || '', throughput_mode: fs.ThroughputMode || '', size_bytes: String(fs.SizeInBytes?.Value || 0) },
    }));
  },

  async fsx(config, region) {
    const client = new FSxClient(config);
    const resp = await client.send(new FSxDescribeCommand({}));
    return (resp.FileSystems || []).map(fs => ({
      service: 'FSx', resource_type: 'File System',
      resource_id: fs.FileSystemId || '',
      name: fs.Tags?.find(t => t.Key === 'Name')?.Value || '',
      status: fs.Lifecycle || 'unknown', region,
      arn: fs.ResourceARN || '', monthly_cost: 0,
      details: { type: fs.FileSystemType || '', storage_gb: String(fs.StorageCapacity || 0) },
    }));
  },

  async storageGateway(config, region) {
    const client = new StorageGatewayClient(config);
    const resp = await client.send(new ListGatewaysCommand({}));
    return (resp.Gateways || []).map(gw => ({
      service: 'Storage Gateway', resource_type: 'Gateway',
      resource_id: gw.GatewayId || '', name: gw.GatewayName || '',
      status: gw.GatewayOperationalState || 'active', region,
      arn: gw.GatewayARN || '', monthly_cost: 0,
      details: { type: gw.GatewayType || '' },
    }));
  },
};
