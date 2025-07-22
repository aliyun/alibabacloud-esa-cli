import { CodeVersionProps } from '../../libs/interface.js';

export interface AuthConfig {
  accessKeyId: string;
  accessKeySecret: string;
}

export interface ProjectConfig {
  name: string;
  description?: string;
  endpoint?: string;
  routes?: string[];
  domains?: string[];
  codeVersions?: CodeVersionProps[];
  assets?: {
    directory: string;
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
