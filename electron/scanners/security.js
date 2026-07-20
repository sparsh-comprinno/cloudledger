import { IAMClient, ListUsersCommand, ListRolesCommand, ListPoliciesCommand } from '@aws-sdk/client-iam';
import { KMSClient, ListKeysCommand, DescribeKeyCommand } from '@aws-sdk/client-kms';
import { SecretsManagerClient, ListSecretsCommand } from '@aws-sdk/client-secrets-manager';
import { ACMClient, ListCertificatesCommand } from '@aws-sdk/client-acm';
import { WAFV2Client, ListWebACLsCommand } from '@aws-sdk/client-wafv2';
import { GuardDutyClient, ListDetectorsCommand } from '@aws-sdk/client-guardduty';
import { ShieldClient, ListProtectionsCommand } from '@aws-sdk/client-shield';

export const scanSecurity = {
  async iamUsers(config, region) {
    const client = new IAMClient(config);
    const resp = await client.send(new ListUsersCommand({}));
    return (resp.Users || []).map(u => ({
      service: 'IAM', resource_type: 'User',
      resource_id: u.UserId || '', name: u.UserName || '',
      status: 'active', region: 'global',
      arn: u.Arn || '', monthly_cost: 0, details: {},
    }));
  },

  async iamRoles(config, region) {
    const client = new IAMClient(config);
    const resp = await client.send(new ListRolesCommand({}));
    return (resp.Roles || []).map(r => ({
      service: 'IAM', resource_type: 'Role',
      resource_id: r.RoleId || '', name: r.RoleName || '',
      status: 'active', region: 'global',
      arn: r.Arn || '', monthly_cost: 0,
      details: { path: r.Path || '', description: r.Description || '' },
    }));
  },

  async iamPolicies(config, region) {
    const client = new IAMClient(config);
    const resp = await client.send(new ListPoliciesCommand({ Scope: 'Local' }));
    return (resp.Policies || []).map(p => ({
      service: 'IAM', resource_type: 'Policy',
      resource_id: p.PolicyId || '', name: p.PolicyName || '',
      status: 'active', region: 'global',
      arn: p.Arn || '', monthly_cost: 0,
      details: { attachments: String(p.AttachmentCount || 0) },
    }));
  },

  async kmsKeys(config, region) {
    const client = new KMSClient(config);
    const resources = [];
    const resp = await client.send(new ListKeysCommand({}));
    for (const key of resp.Keys || []) {
      try {
        const desc = await client.send(new DescribeKeyCommand({ KeyId: key.KeyId }));
        const km = desc.KeyMetadata;
        resources.push({
          service: 'KMS', resource_type: 'Key',
          resource_id: key.KeyId || '', name: km?.Description || '',
          status: km?.KeyState || 'unknown', region,
          arn: key.KeyArn || '', monthly_cost: 0,
          details: { usage: km?.KeyUsage || '', manager: km?.KeyManager || '' },
        });
      } catch { /* skip */ }
    }
    return resources;
  },

  async secrets(config, region) {
    const client = new SecretsManagerClient(config);
    const resp = await client.send(new ListSecretsCommand({}));
    return (resp.SecretList || []).map(s => ({
      service: 'Secrets Manager', resource_type: 'Secret',
      resource_id: s.Name || '', name: s.Name || '',
      status: 'active', region,
      arn: s.ARN || '', monthly_cost: 0,
      details: { rotation: String(s.RotationEnabled || false) },
    }));
  },

  async acmCerts(config, region) {
    const client = new ACMClient(config);
    const resp = await client.send(new ListCertificatesCommand({}));
    return (resp.CertificateSummaryList || []).map(c => ({
      service: 'ACM', resource_type: 'Certificate',
      resource_id: c.CertificateArn || '', name: c.DomainName || '',
      status: c.Status || 'unknown', region,
      arn: c.CertificateArn || '', monthly_cost: 0,
      details: { domain: c.DomainName || '', type: c.Type || '' },
    }));
  },

  async wafv2(config, region) {
    const client = new WAFV2Client(config);
    const resp = await client.send(new ListWebACLsCommand({ Scope: 'REGIONAL' }));
    return (resp.WebACLs || []).map(acl => ({
      service: 'WAFv2', resource_type: 'Web ACL',
      resource_id: acl.Id || '', name: acl.Name || '',
      status: 'active', region,
      arn: acl.ARN || '', monthly_cost: 0, details: {},
    }));
  },

  async guardduty(config, region) {
    const client = new GuardDutyClient(config);
    const resp = await client.send(new ListDetectorsCommand({}));
    return (resp.DetectorIds || []).map(id => ({
      service: 'GuardDuty', resource_type: 'Detector',
      resource_id: id, name: `GuardDuty-${id}`,
      status: 'active', region,
      arn: `arn:aws:guardduty:${region}:*:detector/${id}`, monthly_cost: 0, details: {},
    }));
  },

  async shield(config, region) {
    const client = new ShieldClient(config);
    try {
      const resp = await client.send(new ListProtectionsCommand({}));
      return (resp.Protections || []).map(p => ({
        service: 'Shield', resource_type: 'Protection',
        resource_id: p.Id || '', name: p.Name || '',
        status: 'active', region: 'global',
        arn: p.ProtectionArn || '', monthly_cost: 0,
        details: { resource: p.ResourceArn || '' },
      }));
    } catch { return []; }
  },
};
