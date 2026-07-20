import {
  EC2Client,
  DescribeVpcsCommand,
  DescribeSubnetsCommand,
  DescribeRouteTablesCommand,
  DescribeInternetGatewaysCommand,
  DescribeNatGatewaysCommand,
  DescribeVpcEndpointsCommand,
  DescribeTransitGatewaysCommand,
} from '@aws-sdk/client-ec2';
import {
  ElasticLoadBalancingClient,
  DescribeLoadBalancersCommand as DescribeClassicLBsCommand,
} from '@aws-sdk/client-elastic-load-balancing';
import {
  ElasticLoadBalancingV2Client,
  DescribeLoadBalancersCommand,
  DescribeTargetGroupsCommand,
} from '@aws-sdk/client-elastic-load-balancing-v2';

function getNameTag(tags) {
  return tags?.find(t => t.Key === 'Name')?.Value || '';
}

export const scanNetworking = {
  async vpcs(config, region) {
    const client = new EC2Client(config);
    const resp = await client.send(new DescribeVpcsCommand({}));
    return (resp.Vpcs || []).map(vpc => ({
      service: 'VPC', resource_type: 'VPC',
      resource_id: vpc.VpcId || '', name: getNameTag(vpc.Tags),
      status: vpc.State || 'available', region,
      arn: `arn:aws:ec2:${region}:*:vpc/${vpc.VpcId}`, monthly_cost: 0,
      details: { cidr_block: vpc.CidrBlock || '', is_default: String(vpc.IsDefault || false) },
    }));
  },

  async subnets(config, region) {
    const client = new EC2Client(config);
    const resp = await client.send(new DescribeSubnetsCommand({}));
    return (resp.Subnets || []).map(s => ({
      service: 'VPC', resource_type: 'Subnet',
      resource_id: s.SubnetId || '', name: getNameTag(s.Tags),
      status: s.State || 'available', region,
      arn: s.SubnetArn || '', monthly_cost: 0,
      details: { cidr: s.CidrBlock || '', az: s.AvailabilityZone || '', vpc_id: s.VpcId || '', available_ips: String(s.AvailableIpAddressCount || 0) },
    }));
  },

  async routeTables(config, region) {
    const client = new EC2Client(config);
    const resp = await client.send(new DescribeRouteTablesCommand({}));
    return (resp.RouteTables || []).map(rt => ({
      service: 'VPC', resource_type: 'Route Table',
      resource_id: rt.RouteTableId || '', name: getNameTag(rt.Tags),
      status: 'active', region,
      arn: `arn:aws:ec2:${region}:*:route-table/${rt.RouteTableId}`, monthly_cost: 0,
      details: { vpc_id: rt.VpcId || '', routes: String(rt.Routes?.length || 0) },
    }));
  },

  async internetGateways(config, region) {
    const client = new EC2Client(config);
    const resp = await client.send(new DescribeInternetGatewaysCommand({}));
    return (resp.InternetGateways || []).map(igw => ({
      service: 'VPC', resource_type: 'Internet Gateway',
      resource_id: igw.InternetGatewayId || '', name: getNameTag(igw.Tags),
      status: igw.Attachments?.length ? 'attached' : 'detached', region,
      arn: `arn:aws:ec2:${region}:*:internet-gateway/${igw.InternetGatewayId}`, monthly_cost: 0,
      details: {},
    }));
  },

  async natGateways(config, region) {
    const client = new EC2Client(config);
    const resp = await client.send(new DescribeNatGatewaysCommand({}));
    return (resp.NatGateways || []).map(nat => ({
      service: 'VPC', resource_type: 'NAT Gateway',
      resource_id: nat.NatGatewayId || '', name: getNameTag(nat.Tags),
      status: nat.State || 'unknown', region,
      arn: `arn:aws:ec2:${region}:*:natgateway/${nat.NatGatewayId}`, monthly_cost: 0,
      details: { subnet_id: nat.SubnetId || '', vpc_id: nat.VpcId || '' },
    }));
  },

  async vpcEndpoints(config, region) {
    const client = new EC2Client(config);
    const resp = await client.send(new DescribeVpcEndpointsCommand({}));
    return (resp.VpcEndpoints || []).map(ep => ({
      service: 'VPC', resource_type: 'VPC Endpoint',
      resource_id: ep.VpcEndpointId || '', name: getNameTag(ep.Tags),
      status: ep.State || 'unknown', region,
      arn: '', monthly_cost: 0,
      details: { service_name: ep.ServiceName || '', type: ep.VpcEndpointType || '' },
    }));
  },

  async transitGateways(config, region) {
    const client = new EC2Client(config);
    const resp = await client.send(new DescribeTransitGatewaysCommand({}));
    return (resp.TransitGateways || []).map(tgw => ({
      service: 'VPC', resource_type: 'Transit Gateway',
      resource_id: tgw.TransitGatewayId || '', name: getNameTag(tgw.Tags),
      status: tgw.State || 'unknown', region,
      arn: tgw.TransitGatewayArn || '', monthly_cost: 0,
      details: {},
    }));
  },

  async classicElbs(config, region) {
    const client = new ElasticLoadBalancingClient(config);
    const resp = await client.send(new DescribeClassicLBsCommand({}));
    return (resp.LoadBalancerDescriptions || []).map(lb => ({
      service: 'ELB', resource_type: 'Classic Load Balancer',
      resource_id: lb.LoadBalancerName || '', name: lb.LoadBalancerName || '',
      status: 'active', region, arn: '', monthly_cost: 0,
      details: { dns: lb.DNSName || '', vpc_id: lb.VPCId || '', instances: String(lb.Instances?.length || 0) },
    }));
  },

  async elbv2(config, region) {
    const client = new ElasticLoadBalancingV2Client(config);
    const resp = await client.send(new DescribeLoadBalancersCommand({}));
    return (resp.LoadBalancers || []).map(lb => {
      const typeLabel = lb.Type === 'application' ? 'Application Load Balancer' :
        lb.Type === 'network' ? 'Network Load Balancer' : 'Gateway Load Balancer';
      return {
        service: 'ELB', resource_type: typeLabel,
        resource_id: lb.LoadBalancerName || '', name: lb.LoadBalancerName || '',
        status: lb.State?.Code || 'unknown', region,
        arn: lb.LoadBalancerArn || '', monthly_cost: 0,
        details: { type: lb.Type || '', dns: lb.DNSName || '', scheme: lb.Scheme || '', vpc_id: lb.VpcId || '' },
      };
    });
  },

  async targetGroups(config, region) {
    const client = new ElasticLoadBalancingV2Client(config);
    const resp = await client.send(new DescribeTargetGroupsCommand({}));
    return (resp.TargetGroups || []).map(tg => ({
      service: 'ELB', resource_type: 'Target Group',
      resource_id: tg.TargetGroupName || '', name: tg.TargetGroupName || '',
      status: 'active', region,
      arn: tg.TargetGroupArn || '', monthly_cost: 0,
      details: { protocol: tg.Protocol || '', port: String(tg.Port || 0), target_type: tg.TargetType || '' },
    }));
  },
};
