import { SNSClient, ListTopicsCommand } from '@aws-sdk/client-sns';
import { SQSClient, ListQueuesCommand } from '@aws-sdk/client-sqs';
import { KinesisClient, ListStreamsCommand } from '@aws-sdk/client-kinesis';
import { FirehoseClient, ListDeliveryStreamsCommand } from '@aws-sdk/client-firehose';
import { MqClient, ListBrokersCommand } from '@aws-sdk/client-mq';
import { KafkaClient, ListClustersV2Command } from '@aws-sdk/client-kafka';

export const scanMessaging = {
  async snsTopics(config, region) {
    const client = new SNSClient(config);
    const resp = await client.send(new ListTopicsCommand({}));
    return (resp.Topics || []).map(t => {
      const arn = t.TopicArn || '';
      const name = arn.split(':').pop() || '';
      return { service: 'SNS', resource_type: 'Topic', resource_id: name, name, status: 'active', region, arn, monthly_cost: 0, details: {} };
    });
  },

  async sqsQueues(config, region) {
    const client = new SQSClient(config);
    const resp = await client.send(new ListQueuesCommand({}));
    return (resp.QueueUrls || []).map(url => {
      const name = url.split('/').pop() || '';
      return { service: 'SQS', resource_type: 'Queue', resource_id: name, name, status: 'active', region, arn: '', monthly_cost: 0, details: { url } };
    });
  },

  async kinesis(config, region) {
    const client = new KinesisClient(config);
    const resp = await client.send(new ListStreamsCommand({}));
    return (resp.StreamNames || []).map(name => ({
      service: 'Kinesis', resource_type: 'Data Stream', resource_id: name, name, status: 'active', region, arn: '', monthly_cost: 0, details: {},
    }));
  },

  async firehose(config, region) {
    const client = new FirehoseClient(config);
    const resp = await client.send(new ListDeliveryStreamsCommand({}));
    return (resp.DeliveryStreamNames || []).map(name => ({
      service: 'Kinesis Firehose', resource_type: 'Delivery Stream', resource_id: name, name, status: 'active', region, arn: '', monthly_cost: 0, details: {},
    }));
  },

  async mq(config, region) {
    const client = new MqClient(config);
    const resp = await client.send(new ListBrokersCommand({}));
    return (resp.BrokerSummaries || []).map(b => ({
      service: 'Amazon MQ', resource_type: 'Broker',
      resource_id: b.BrokerId || '', name: b.BrokerName || '',
      status: b.BrokerState || 'unknown', region,
      arn: b.BrokerArn || '', monthly_cost: 0,
      details: { engine: b.EngineType || '', deployment: b.DeploymentMode || '' },
    }));
  },

  async msk(config, region) {
    const client = new KafkaClient(config);
    const resp = await client.send(new ListClustersV2Command({}));
    return (resp.ClusterInfoList || []).map(c => ({
      service: 'MSK', resource_type: 'Kafka Cluster',
      resource_id: c.ClusterName || '', name: c.ClusterName || '',
      status: c.State || 'unknown', region,
      arn: c.ClusterArn || '', monthly_cost: 0,
      details: { type: c.ClusterType || '' },
    }));
  },
};
