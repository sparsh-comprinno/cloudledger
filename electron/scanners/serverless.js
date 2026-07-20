import { LambdaClient, ListFunctionsCommand, ListLayersCommand } from '@aws-sdk/client-lambda';
import { SFNClient, ListStateMachinesCommand } from '@aws-sdk/client-sfn';
import { APIGatewayClient, GetRestApisCommand } from '@aws-sdk/client-api-gateway';
import { ApiGatewayV2Client, GetApisCommand } from '@aws-sdk/client-apigatewayv2';
import { AppSyncClient, ListGraphqlApisCommand } from '@aws-sdk/client-appsync';
import { EventBridgeClient, ListEventBusesCommand, ListRulesCommand } from '@aws-sdk/client-eventbridge';

export const scanServerless = {
  async lambdaFunctions(config, region) {
    const client = new LambdaClient(config);
    const resp = await client.send(new ListFunctionsCommand({}));
    return (resp.Functions || []).map(f => ({
      service: 'Lambda', resource_type: 'Function',
      resource_id: f.FunctionName || '', name: f.FunctionName || '',
      status: f.State || 'active', region,
      arn: f.FunctionArn || '', monthly_cost: 0,
      details: { runtime: f.Runtime || '', memory_mb: String(f.MemorySize || 0), timeout_sec: String(f.Timeout || 0), handler: f.Handler || '', code_size: String(f.CodeSize || 0) },
    }));
  },

  async lambdaLayers(config, region) {
    const client = new LambdaClient(config);
    const resp = await client.send(new ListLayersCommand({}));
    return (resp.Layers || []).map(l => ({
      service: 'Lambda', resource_type: 'Layer',
      resource_id: l.LayerName || '', name: l.LayerName || '',
      status: 'active', region,
      arn: l.LayerArn || '', monthly_cost: 0,
      details: { latest_version: String(l.LatestMatchingVersion?.Version || 0) },
    }));
  },

  async stepFunctions(config, region) {
    const client = new SFNClient(config);
    const resp = await client.send(new ListStateMachinesCommand({}));
    return (resp.stateMachines || []).map(sm => ({
      service: 'Step Functions', resource_type: 'State Machine',
      resource_id: sm.name || '', name: sm.name || '',
      status: 'active', region,
      arn: sm.stateMachineArn || '', monthly_cost: 0,
      details: { type: sm.type || '' },
    }));
  },

  async apiGatewayRest(config, region) {
    const client = new APIGatewayClient(config);
    const resp = await client.send(new GetRestApisCommand({}));
    return (resp.items || []).map(api => ({
      service: 'API Gateway', resource_type: 'REST API',
      resource_id: api.id || '', name: api.name || '',
      status: 'active', region,
      arn: `arn:aws:apigateway:${region}::/restapis/${api.id}`, monthly_cost: 0,
      details: { description: api.description || '' },
    }));
  },

  async apiGatewayV2(config, region) {
    const client = new ApiGatewayV2Client(config);
    const resp = await client.send(new GetApisCommand({}));
    return (resp.Items || []).map(api => ({
      service: 'API Gateway', resource_type: `${api.ProtocolType || 'HTTP'} API`,
      resource_id: api.ApiId || '', name: api.Name || '',
      status: 'active', region,
      arn: `arn:aws:apigateway:${region}::/apis/${api.ApiId}`, monthly_cost: 0,
      details: { protocol: api.ProtocolType || '', endpoint: api.ApiEndpoint || '' },
    }));
  },

  async appsync(config, region) {
    const client = new AppSyncClient(config);
    const resp = await client.send(new ListGraphqlApisCommand({}));
    return (resp.graphqlApis || []).map(api => ({
      service: 'AppSync', resource_type: 'GraphQL API',
      resource_id: api.apiId || '', name: api.name || '',
      status: 'active', region,
      arn: api.arn || '', monthly_cost: 0,
      details: { auth_type: api.authenticationType || '' },
    }));
  },

  async eventbridge(config, region) {
    const client = new EventBridgeClient(config);
    const resources = [];
    const buses = await client.send(new ListEventBusesCommand({}));
    for (const bus of buses.EventBuses || []) {
      resources.push({
        service: 'EventBridge', resource_type: 'Event Bus',
        resource_id: bus.Name || '', name: bus.Name || '',
        status: 'active', region, arn: bus.Arn || '', monthly_cost: 0, details: {},
      });
    }
    try {
      const rules = await client.send(new ListRulesCommand({}));
      for (const rule of rules.Rules || []) {
        resources.push({
          service: 'EventBridge', resource_type: 'Rule',
          resource_id: rule.Name || '', name: rule.Name || '',
          status: rule.State || 'unknown', region, arn: rule.Arn || '', monthly_cost: 0, details: {},
        });
      }
    } catch { /* rules may fail */ }
    return resources;
  },
};
