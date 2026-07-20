import {
  EC2Client,
  DescribeInstancesCommand,
  DescribeVolumesCommand,
  DescribeSnapshotsCommand,
  DescribeImagesCommand,
  DescribeSecurityGroupsCommand,
  DescribeKeyPairsCommand,
  DescribeAddressesCommand,
  DescribeNetworkInterfacesCommand,
  DescribeLaunchTemplatesCommand,
} from '@aws-sdk/client-ec2';
import {
  AutoScalingClient,
  DescribeAutoScalingGroupsCommand,
} from '@aws-sdk/client-auto-scaling';

function getNameTag(tags) {
  return tags?.find(t => t.Key === 'Name')?.Value || '';
}

export const scanCompute = {
  async instances(config, region) {
    const client = new EC2Client(config);
    const resources = [];
    const resp = await client.send(new DescribeInstancesCommand({}));
    for (const reservation of resp.Reservations || []) {
      for (const inst of reservation.Instances || []) {
        resources.push({
          service: 'EC2', resource_type: 'Instance',
          resource_id: inst.InstanceId || '',
          name: getNameTag(inst.Tags),
          status: inst.State?.Name || 'unknown',
          region, arn: `arn:aws:ec2:${region}:*:instance/${inst.InstanceId}`,
          monthly_cost: 0,
          details: {
            instance_type: inst.InstanceType || '',
            public_ip: inst.PublicIpAddress || '',
            private_ip: inst.PrivateIpAddress || '',
            vpc_id: inst.VpcId || '',
            az: inst.Placement?.AvailabilityZone || '',
          },
        });
      }
    }
    return resources;
  },

  async volumes(config, region) {
    const client = new EC2Client(config);
    const resources = [];
    const resp = await client.send(new DescribeVolumesCommand({}));
    for (const vol of resp.Volumes || []) {
      resources.push({
        service: 'EC2', resource_type: 'EBS Volume',
        resource_id: vol.VolumeId || '',
        name: getNameTag(vol.Tags),
        status: vol.State || 'unknown',
        region, arn: `arn:aws:ec2:${region}:*:volume/${vol.VolumeId}`,
        monthly_cost: 0,
        details: {
          volume_type: vol.VolumeType || '',
          size_gb: String(vol.Size || 0),
          iops: String(vol.Iops || 0),
        },
      });
    }
    return resources;
  },

  async snapshots(config, region) {
    const client = new EC2Client(config);
    const resources = [];
    const resp = await client.send(new DescribeSnapshotsCommand({ OwnerIds: ['self'] }));
    for (const snap of resp.Snapshots || []) {
      resources.push({
        service: 'EC2', resource_type: 'Snapshot',
        resource_id: snap.SnapshotId || '',
        name: getNameTag(snap.Tags),
        status: snap.State || 'unknown',
        region, arn: `arn:aws:ec2:${region}:*:snapshot/${snap.SnapshotId}`,
        monthly_cost: 0,
        details: { volume_size_gb: String(snap.VolumeSize || 0), description: snap.Description || '' },
      });
    }
    return resources;
  },

  async amis(config, region) {
    const client = new EC2Client(config);
    const resources = [];
    const resp = await client.send(new DescribeImagesCommand({ Owners: ['self'] }));
    for (const ami of resp.Images || []) {
      resources.push({
        service: 'EC2', resource_type: 'AMI',
        resource_id: ami.ImageId || '',
        name: ami.Name || '',
        status: ami.State || 'available',
        region, arn: `arn:aws:ec2:${region}:*:image/${ami.ImageId}`,
        monthly_cost: 0,
        details: { architecture: ami.Architecture || '', description: ami.Description || '' },
      });
    }
    return resources;
  },

  async securityGroups(config, region) {
    const client = new EC2Client(config);
    const resources = [];
    const resp = await client.send(new DescribeSecurityGroupsCommand({}));
    for (const sg of resp.SecurityGroups || []) {
      resources.push({
        service: 'EC2', resource_type: 'Security Group',
        resource_id: sg.GroupId || '',
        name: sg.GroupName || '',
        status: 'active',
        region, arn: `arn:aws:ec2:${region}:*:security-group/${sg.GroupId}`,
        monthly_cost: 0,
        details: { vpc_id: sg.VpcId || '', description: sg.Description || '' },
      });
    }
    return resources;
  },

  async keyPairs(config, region) {
    const client = new EC2Client(config);
    const resources = [];
    const resp = await client.send(new DescribeKeyPairsCommand({}));
    for (const kp of resp.KeyPairs || []) {
      resources.push({
        service: 'EC2', resource_type: 'Key Pair',
        resource_id: kp.KeyPairId || '',
        name: kp.KeyName || '',
        status: 'active',
        region, arn: `arn:aws:ec2:${region}:*:key-pair/${kp.KeyPairId}`,
        monthly_cost: 0,
        details: { key_type: kp.KeyType || '' },
      });
    }
    return resources;
  },

  async elasticIps(config, region) {
    const client = new EC2Client(config);
    const resources = [];
    const resp = await client.send(new DescribeAddressesCommand({}));
    for (const addr of resp.Addresses || []) {
      resources.push({
        service: 'EC2', resource_type: 'Elastic IP',
        resource_id: addr.AllocationId || '',
        name: getNameTag(addr.Tags),
        status: addr.InstanceId ? 'associated' : 'unassociated',
        region, arn: `arn:aws:ec2:${region}:*:elastic-ip/${addr.AllocationId}`,
        monthly_cost: 0,
        details: { public_ip: addr.PublicIp || '', instance_id: addr.InstanceId || '' },
      });
    }
    return resources;
  },

  async networkInterfaces(config, region) {
    const client = new EC2Client(config);
    const resources = [];
    const resp = await client.send(new DescribeNetworkInterfacesCommand({}));
    for (const eni of resp.NetworkInterfaces || []) {
      resources.push({
        service: 'EC2', resource_type: 'Network Interface',
        resource_id: eni.NetworkInterfaceId || '',
        name: getNameTag(eni.TagSet),
        status: eni.Status || 'unknown',
        region, arn: `arn:aws:ec2:${region}:*:network-interface/${eni.NetworkInterfaceId}`,
        monthly_cost: 0,
        details: { vpc_id: eni.VpcId || '', subnet_id: eni.SubnetId || '', description: eni.Description || '' },
      });
    }
    return resources;
  },

  async launchTemplates(config, region) {
    const client = new EC2Client(config);
    const resources = [];
    const resp = await client.send(new DescribeLaunchTemplatesCommand({}));
    for (const lt of resp.LaunchTemplates || []) {
      resources.push({
        service: 'EC2', resource_type: 'Launch Template',
        resource_id: lt.LaunchTemplateId || '',
        name: lt.LaunchTemplateName || '',
        status: 'active',
        region, arn: `arn:aws:ec2:${region}:*:launch-template/${lt.LaunchTemplateId}`,
        monthly_cost: 0,
        details: { default_version: String(lt.DefaultVersionNumber || 0), latest_version: String(lt.LatestVersionNumber || 0) },
      });
    }
    return resources;
  },

  async autoScalingGroups(config, region) {
    const client = new AutoScalingClient(config);
    const resources = [];
    const resp = await client.send(new DescribeAutoScalingGroupsCommand({}));
    for (const asg of resp.AutoScalingGroups || []) {
      resources.push({
        service: 'Auto Scaling', resource_type: 'Auto Scaling Group',
        resource_id: asg.AutoScalingGroupName || '',
        name: asg.AutoScalingGroupName || '',
        status: asg.Status || 'active',
        region, arn: asg.AutoScalingGroupARN || '',
        monthly_cost: 0,
        details: {
          min_size: String(asg.MinSize || 0),
          max_size: String(asg.MaxSize || 0),
          desired: String(asg.DesiredCapacity || 0),
          instances: String(asg.Instances?.length || 0),
        },
      });
    }
    return resources;
  },
};
