export interface AwsCredentials {
  access_key_id: string;
  secret_access_key: string;
  session_token: string;
  region: string;
  profile: string;
  use_env_vars: boolean;
  use_profile: boolean;
}

export interface AwsResource {
  service: string;
  resource_type: string;
  resource_id: string;
  name: string;
  status: string;
  region: string;
  arn: string;
  monthly_cost: number;
  details: Record<string, string>;
}

export interface ScanProgress {
  current_service: string;
  services_scanned: number;
  total_services: number;
  resources_found: number;
  percentage: number;
  log_message: string;
}

export interface CostData {
  total_monthly_cost: number;
  cost_by_service: Record<string, number>;
  monthly_trend: MonthlyCost[];
  forecast: number;
}

export interface MonthlyCost {
  month: string;
  cost: number;
}

export interface ScanResult {
  resources: AwsResource[];
  cost_data: CostData;
  scan_duration_seconds: number;
  total_resources: number;
  services_scanned: number;
  errors: string[];
}

export type ExportFormat = "csv" | "json" | "pdf";

export type AppState = "idle" | "scanning" | "completed" | "error";

export const AWS_REGIONS = [
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "us-west-2",
  "af-south-1",
  "ap-east-1",
  "ap-south-1",
  "ap-south-2",
  "ap-southeast-1",
  "ap-southeast-2",
  "ap-southeast-3",
  "ap-southeast-4",
  "ap-northeast-1",
  "ap-northeast-2",
  "ap-northeast-3",
  "ca-central-1",
  "ca-west-1",
  "eu-central-1",
  "eu-central-2",
  "eu-west-1",
  "eu-west-2",
  "eu-west-3",
  "eu-south-1",
  "eu-south-2",
  "eu-north-1",
  "il-central-1",
  "me-south-1",
  "me-central-1",
  "sa-east-1",
] as const;
