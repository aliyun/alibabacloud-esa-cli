export interface AuthConfig {
  accessKeyId: string;
  accessKeySecret: string;
  /** STS 临时凭证中的 SecurityToken，使用 STS 登录时必填 */
  securityToken?: string;
}

export interface ProjectConfig {
  name: string;
  description?: string;
  endpoint?: string;
  entry?: string;
  assets?: {
    directory: string;
    notFoundStrategy?: string;
  };
  dev?: DevToolProps;
  [key: string]: any;
}

export interface DevToolProps {
  port?: number;
  inspectPort?: number;
  entry?: string;
  minify?: boolean;
  localUpstream?: string;
}
export interface CliConfig {
  [key: string]: any;
  auth?: AuthConfig;
  endpoint?: string;
  lang?: string;
}
