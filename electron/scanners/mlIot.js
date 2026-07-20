import { SageMakerClient, ListEndpointsCommand, ListNotebookInstancesCommand } from '@aws-sdk/client-sagemaker';
import { IoTClient, ListThingsCommand } from '@aws-sdk/client-iot';
import { CognitoIdentityProviderClient, ListUserPoolsCommand } from '@aws-sdk/client-cognito-identity-provider';
import { CognitoIdentityClient, ListIdentityPoolsCommand } from '@aws-sdk/client-cognito-identity';

export const scanMlIot = {
  async sagemakerEndpoints(config, region) {
    const client = new SageMakerClient(config);
    const resp = await client.send(new ListEndpointsCommand({}));
    return (resp.Endpoints || []).map(ep => ({
      service: 'SageMaker', resource_type: 'Endpoint',
      resource_id: ep.EndpointName || '', name: ep.EndpointName || '',
      status: ep.EndpointStatus || 'unknown', region,
      arn: ep.EndpointArn || '', monthly_cost: 0, details: {},
    }));
  },

  async sagemakerNotebooks(config, region) {
    const client = new SageMakerClient(config);
    const resp = await client.send(new ListNotebookInstancesCommand({}));
    return (resp.NotebookInstances || []).map(nb => ({
      service: 'SageMaker', resource_type: 'Notebook Instance',
      resource_id: nb.NotebookInstanceName || '', name: nb.NotebookInstanceName || '',
      status: nb.NotebookInstanceStatus || 'unknown', region,
      arn: nb.NotebookInstanceArn || '', monthly_cost: 0,
      details: { instance_type: nb.InstanceType || '' },
    }));
  },

  async iotThings(config, region) {
    const client = new IoTClient(config);
    const resp = await client.send(new ListThingsCommand({}));
    return (resp.things || []).map(t => ({
      service: 'IoT Core', resource_type: 'Thing',
      resource_id: t.thingName || '', name: t.thingName || '',
      status: 'active', region,
      arn: t.thingArn || '', monthly_cost: 0,
      details: { type: t.thingTypeName || '' },
    }));
  },

  async cognitoUserPools(config, region) {
    const client = new CognitoIdentityProviderClient(config);
    const resp = await client.send(new ListUserPoolsCommand({ MaxResults: 60 }));
    return (resp.UserPools || []).map(p => ({
      service: 'Cognito', resource_type: 'User Pool',
      resource_id: p.Id || '', name: p.Name || '',
      status: p.Status || 'active', region,
      arn: `arn:aws:cognito-idp:${region}:*:userpool/${p.Id}`, monthly_cost: 0, details: {},
    }));
  },

  async cognitoIdentityPools(config, region) {
    const client = new CognitoIdentityClient(config);
    const resp = await client.send(new ListIdentityPoolsCommand({ MaxResults: 60 }));
    return (resp.IdentityPools || []).map(p => ({
      service: 'Cognito', resource_type: 'Identity Pool',
      resource_id: p.IdentityPoolId || '', name: p.IdentityPoolName || '',
      status: 'active', region,
      arn: `arn:aws:cognito-identity:${region}:*:identitypool/${p.IdentityPoolId}`, monthly_cost: 0, details: {},
    }));
  },
};
