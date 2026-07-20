import { ECSClient, ListClustersCommand, DescribeClustersCommand, ListServicesCommand, DescribeServicesCommand } from '@aws-sdk/client-ecs';
import { EKSClient, ListClustersCommand as EKSListCommand, DescribeClusterCommand } from '@aws-sdk/client-eks';
import { ECRClient, DescribeRepositoriesCommand } from '@aws-sdk/client-ecr';

export const scanContainers = {
  async ecsClusters(config, region) {
    const client = new ECSClient(config);
    const list = await client.send(new ListClustersCommand({}));
    if (!list.clusterArns?.length) return [];
    const desc = await client.send(new DescribeClustersCommand({ clusters: list.clusterArns }));
    return (desc.clusters || []).map(c => ({
      service: 'ECS', resource_type: 'Cluster',
      resource_id: c.clusterName || '', name: c.clusterName || '',
      status: c.status || 'unknown', region,
      arn: c.clusterArn || '', monthly_cost: 0,
      details: { running_tasks: String(c.runningTasksCount || 0), active_services: String(c.activeServicesCount || 0), instances: String(c.registeredContainerInstancesCount || 0) },
    }));
  },

  async ecsServices(config, region) {
    const client = new ECSClient(config);
    const resources = [];
    const clusters = await client.send(new ListClustersCommand({}));
    for (const clusterArn of clusters.clusterArns || []) {
      try {
        const svcList = await client.send(new ListServicesCommand({ cluster: clusterArn }));
        if (!svcList.serviceArns?.length) continue;
        const desc = await client.send(new DescribeServicesCommand({ cluster: clusterArn, services: svcList.serviceArns }));
        for (const svc of desc.services || []) {
          resources.push({
            service: 'ECS', resource_type: 'Service',
            resource_id: svc.serviceName || '', name: svc.serviceName || '',
            status: svc.status || 'unknown', region,
            arn: svc.serviceArn || '', monthly_cost: 0,
            details: { desired: String(svc.desiredCount || 0), running: String(svc.runningCount || 0), launch_type: svc.launchType || '' },
          });
        }
      } catch { /* skip cluster */ }
    }
    return resources;
  },

  async eksClusters(config, region) {
    const client = new EKSClient(config);
    const resources = [];
    const list = await client.send(new EKSListCommand({}));
    for (const name of list.clusters || []) {
      try {
        const desc = await client.send(new DescribeClusterCommand({ name }));
        const c = desc.cluster;
        resources.push({
          service: 'EKS', resource_type: 'Cluster',
          resource_id: name, name,
          status: c?.status || 'unknown', region,
          arn: c?.arn || '', monthly_cost: 0,
          details: { version: c?.version || '', platform: c?.platformVersion || '' },
        });
      } catch { /* skip */ }
    }
    return resources;
  },

  async ecrRepos(config, region) {
    const client = new ECRClient(config);
    const resp = await client.send(new DescribeRepositoriesCommand({}));
    return (resp.repositories || []).map(r => ({
      service: 'ECR', resource_type: 'Repository',
      resource_id: r.repositoryName || '', name: r.repositoryName || '',
      status: 'active', region,
      arn: r.repositoryArn || '', monthly_cost: 0,
      details: { uri: r.repositoryUri || '' },
    }));
  },
};
