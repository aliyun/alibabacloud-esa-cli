export interface AuthConfig {
  accessKeyId: string;
  accessKeySecret: string;
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
