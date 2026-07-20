# AWS Resource Inventory

A macOS desktop app that connects to your AWS account and generates a complete inventory of every deployed resource — no guesswork, no assumptions. Just real API calls to every service you're paying for.

## What it does

1. You provide AWS credentials (access keys, a profile name, or environment variables)
2. Pick a region
3. Hit scan
4. The app queries 85+ AWS services individually, then uses the Resource Groups Tagging API as a catch-all to grab anything it might have missed
5. You get a searchable, sortable table of everything in your account — with cost data from Cost Explorer attached
6. Export to Excel, CSV, JSON, or PDF

**⚠️ This application is strictly read-only. It will NEVER create, modify, delete, or alter any AWS resource.** All API calls are `Describe*`, `List*`, or `Get*` operations only. Your infrastructure stays exactly as it is.

## Installation

Download the latest `.dmg` from [Releases](../../releases), mount it, drag to Applications.

The app will check for updates automatically and prompt you when a new version is available.

## Development

```bash
# Install deps
npm install

# Run in dev mode (Vite + Electron together)
npm run electron:dev

# Build the production .dmg
npm run electron:build
```

## Releasing a new version

1. Bump the version in `package.json`
2. Commit and push
3. Tag the commit: `git tag v1.1.0 && git push --tags`
4. GitHub Actions will build the macOS app and create a release
5. Users get prompted to update automatically

## Services covered

The scanner hits these services directly:

**Compute:** EC2 instances, EBS volumes, snapshots, AMIs, security groups, key pairs, Elastic IPs, ENIs, launch templates, ASGs

**Networking:** VPCs, subnets, route tables, IGWs, NAT gateways, VPC endpoints, transit gateways, ALB/NLB/GLB, classic ELBs, target groups

**Storage:** S3, EFS, FSx, Storage Gateway

**Databases:** RDS, Aurora, DynamoDB, ElastiCache, Redshift, OpenSearch, DocumentDB, Neptune, QLDB, Timestream

**Containers:** ECS clusters & services, EKS, ECR

**Serverless:** Lambda functions & layers, Step Functions, API Gateway (REST + HTTP + WebSocket), AppSync, EventBridge, App Runner

**Messaging:** SNS, SQS, Kinesis, Firehose, Amazon MQ, MSK

**Monitoring:** CloudWatch alarms & log groups, CloudTrail, Config rules

**Security:** IAM users/roles/policies, KMS, Secrets Manager, ACM, WAFv2, GuardDuty, Shield

**Analytics:** Glue (databases/crawlers/jobs), Athena, EMR

**Developer Tools:** CodeBuild, CodePipeline, CodeCommit, CodeDeploy, CloudFormation

**Management:** SSM parameters, Backup vaults, Elastic Beanstalk, Lightsail, Batch, RAM

**ML & IoT:** SageMaker endpoints & notebooks, IoT things, Cognito user/identity pools

**Global:** CloudFront, Route 53, Transfer Family, DataSync, WorkSpaces, Directory Service

**Catch-all:** The Resource Groups Tagging API picks up anything tagged that wasn't covered above — Amplify, AppFlow, Connect, DMS, Forecast, Global Accelerator, Kendra, MWAA, Network Firewall, Pinpoint, QuickSight, X-Ray, and hundreds more.

## Permissions needed

The scanning account needs read-only access. Recommended IAM policy:

```
arn:aws:iam::aws:policy/ViewOnlyAccess
```

Or for broader coverage:

```
arn:aws:iam::aws:policy/ReadOnlyAccess
```

Plus these for cost data:
- `ce:GetCostAndUsage`
- `ce:GetCostForecast`

**Do NOT grant any write permissions.** The app only calls `Describe*`, `List*`, and `Get*` APIs. It never modifies your infrastructure.

## How auto-update works

The app uses `electron-updater` configured to pull from GitHub Releases. When you push a new tag (`v*`), the CI workflow builds a fresh `.dmg` and `.zip`, uploads them as release assets, and generates a `latest-mac.yml` manifest. Running instances of the app check this periodically and prompt users to restart when an update is ready.

## Tech stack

- **Frontend:** React + TypeScript + Tailwind CSS
- **Backend:** Node.js (Electron main process) + AWS SDK v3
- **Desktop:** Electron (macOS only)
- **Build:** Vite + electron-builder
- **CI/CD:** GitHub Actions
- **Updates:** electron-updater → GitHub Releases
