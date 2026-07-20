import { CodeBuildClient, ListProjectsCommand } from '@aws-sdk/client-codebuild';
import { CodePipelineClient, ListPipelinesCommand } from '@aws-sdk/client-codepipeline';
import { CodeCommitClient, ListRepositoriesCommand } from '@aws-sdk/client-codecommit';
import { CodeDeployClient, ListApplicationsCommand } from '@aws-sdk/client-codedeploy';
import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';

export const scanDevtools = {
  async codebuild(config, region) {
    const client = new CodeBuildClient(config);
    const resp = await client.send(new ListProjectsCommand({}));
    return (resp.projects || []).map(name => ({
      service: 'CodeBuild', resource_type: 'Project',
      resource_id: name, name, status: 'active', region,
      arn: `arn:aws:codebuild:${region}:*:project/${name}`, monthly_cost: 0, details: {},
    }));
  },

  async codepipeline(config, region) {
    const client = new CodePipelineClient(config);
    const resp = await client.send(new ListPipelinesCommand({}));
    return (resp.pipelines || []).map(p => ({
      service: 'CodePipeline', resource_type: 'Pipeline',
      resource_id: p.name || '', name: p.name || '',
      status: 'active', region,
      arn: `arn:aws:codepipeline:${region}:*:${p.name}`, monthly_cost: 0,
      details: { version: String(p.version || 0) },
    }));
  },

  async codecommit(config, region) {
    const client = new CodeCommitClient(config);
    const resp = await client.send(new ListRepositoriesCommand({}));
    return (resp.repositories || []).map(r => ({
      service: 'CodeCommit', resource_type: 'Repository',
      resource_id: r.repositoryId || '', name: r.repositoryName || '',
      status: 'active', region,
      arn: `arn:aws:codecommit:${region}:*:${r.repositoryName}`, monthly_cost: 0, details: {},
    }));
  },

  async codedeploy(config, region) {
    const client = new CodeDeployClient(config);
    const resp = await client.send(new ListApplicationsCommand({}));
    return (resp.applications || []).map(name => ({
      service: 'CodeDeploy', resource_type: 'Application',
      resource_id: name, name, status: 'active', region,
      arn: `arn:aws:codedeploy:${region}:*:application:${name}`, monthly_cost: 0, details: {},
    }));
  },

  async cloudformation(config, region) {
    const client = new CloudFormationClient(config);
    const resp = await client.send(new DescribeStacksCommand({}));
    return (resp.Stacks || []).map(s => ({
      service: 'CloudFormation', resource_type: 'Stack',
      resource_id: s.StackId || '', name: s.StackName || '',
      status: s.StackStatus || 'unknown', region,
      arn: s.StackId || '', monthly_cost: 0,
      details: { description: s.Description || '' },
    }));
  },
};
