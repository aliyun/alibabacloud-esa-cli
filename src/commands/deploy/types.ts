export type DeployEnvironment = 'staging' | 'production';

export interface DeployCodeVersion {
  codeVersion: string;
  percentage: number;
}

export interface EnvironmentDeploymentResult {
  environment: DeployEnvironment;
  deploymentId: string | null;
  codeVersions: DeployCodeVersion[];
}

export interface DeployBatchResult {
  success: boolean;
  deployments: EnvironmentDeploymentResult[];
}

export interface DeployExecutionResult extends DeployBatchResult {
  app: string;
}

export interface DeployJsonOutput {
  schemaVersion: 1;
  app: string;
  url: string | null;
  deployments: EnvironmentDeploymentResult[];
}
