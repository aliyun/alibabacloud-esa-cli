import toml from '@iarna/toml';
import path from 'path';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import { CliConfig, DevToolProps, ProjectConfig } from './interface.js';
import { fileURLToPath } from 'url';
import logger from '../../libs/logger.js';
import t from '../../i18n/index.js';
import os from 'os';

const projectConfigFile = 'esa.toml';
const cliConfigFile = 'cliconfig.toml';

export const getDirName = (metaUrl: string) => {
  const __filename = fileURLToPath(metaUrl);
  const __dirname = path.dirname(__filename);
  return __dirname;
};

const __dirname = getDirName(import.meta.url);

export const getRoot = (root?: string): string => {
  if (typeof root === 'undefined') {
    root = process.cwd();
  }
  if (root === '/') {
    return process.cwd();
  }
  const file = path.join(root, cliConfigFile);
  const prev = path.resolve(root, '../');
  try {
    const hasToml = fs.existsSync(file);
    if (hasToml) {
      return root;
    } else {
      return getRoot(prev);
    }
  } catch (err) {
    return getRoot(prev);
  }
};

const root = getRoot();

export const projectConfigPath = path.join(root, projectConfigFile);
// export const cliConfigPath = path.join(__dirname, '..', '..', cliConfigFile);
export const cliConfigPath = path.join(
  os.homedir(),
  '.esa/config/default.toml'
);
export const hiddenConfigDir = path.join(os.homedir(), '.esa/config');

export const generateHiddenConfigDir = () => {
  if (!fs.existsSync(hiddenConfigDir)) {
    fs.mkdirSync(hiddenConfigDir, { recursive: true });
  }
};

export const generateToml = (path: string) => {
  if (!fs.existsSync(path)) {
    fs.writeFileSync(path, '', 'utf-8');
    // 添加默认的endpoint
    const defaultConfig = {
      endpoint: 'esa.cn-hangzhou.aliyuncs.com'
    };
    updateCliConfigFile(defaultConfig);
  }
};

export const generateDefaultConfig = () => {
  generateHiddenConfigDir();
  generateToml(cliConfigPath);
};

export async function updateProjectConfigFile(
  configUpdate: Partial<CliConfig>,
  filePath: string = root
): Promise<void> {
  const configPath = path.join(filePath, projectConfigFile);
  try {
    let configFileContent = await fsPromises.readFile(configPath, 'utf8');
    let config = toml.parse(configFileContent);
    config = { ...config, ...configUpdate };
    const updatedConfigString = toml.stringify(config);
    await fsPromises.writeFile(configPath, updatedConfigString);
  } catch (error) {
    logger.error(`Error updating TOML file: ${error}`);
    logger.pathEacces(__dirname);
  }
}

export async function updateCliConfigFile(configUpdate: Partial<CliConfig>) {
  try {
    let configFileContent = await fsPromises.readFile(cliConfigPath, 'utf8');
    let config = toml.parse(configFileContent);
    config = { ...config, ...configUpdate };
    const updatedConfigString = toml.stringify(config);
    await fsPromises.writeFile(cliConfigPath, updatedConfigString);
  } catch (error) {
    logger.error(`Error updating TOML file: ${error}`);
    logger.pathEacces(__dirname);
    throw new Error('Login error');
  }
}

export function readConfigFile(
  configPath: string
): CliConfig | ProjectConfig | null {
  if (fs.existsSync(configPath)) {
    const configFileContent = fs.readFileSync(configPath, 'utf-8');
    try {
      const config = toml.parse(configFileContent);
      return config as CliConfig | ProjectConfig;
    } catch (error) {
      logger.error(`Error parsing TOML file: ${error}`);
      return null;
    }
  }
  return null;
}
export function getCliConfig() {
  const res = readConfigFile(cliConfigPath);
  if (!res) {
    return null;
  }
  return res as CliConfig;
}

export function getProjectConfig(filePath: string = root) {
  const res = readConfigFile(path.join(filePath, projectConfigFile));
  if (!res) {
    return null;
  }
  return res as ProjectConfig;
}

export function readEdgeRoutineFile(projectPath: string = root): string | null {
  const projectConfig = getProjectConfig(projectPath);
  if (!projectConfig) {
    return null;
  }
  const pubFilePath = `.dev/pub.js`;
  const edgeRoutinePath = path.join(projectPath, pubFilePath);
  if (fs.existsSync(edgeRoutinePath)) {
    const edgeRoutineFile = fs.readFileSync(edgeRoutinePath, 'utf-8');
    return edgeRoutineFile;
  }
  return null;
}

export function getConfigurations() {
  try {
    const [cliConfig, projectConfig] = [getCliConfig(), getProjectConfig()];
    return [cliConfig, projectConfig];
  } catch (error) {
    return [null, null];
  }
}

export async function generateConfigFile(
  projectName?: string,
  initConfigs?: Partial<ProjectConfig>
) {
  const newFilePath = path.join(process.cwd(), 'esa.toml');
  const currentDirName = path.basename(process.cwd());
  const entry = initConfigs?.dev?.entry || 'src/index.js';
  const port = initConfigs?.port || 18080;
  const name = projectName || currentDirName;

  if (fs.existsSync(newFilePath)) {
    logger.error(t('generate_config_error').d('esa.toml already exists'));
    return;
  } else {
    const genConfig = `name = "${name}"
entry = "${entry}"
[dev]
port = ${port}
  `;
    await fsPromises.writeFile(newFilePath, genConfig, 'utf-8');
    logger.success(t('generate_config_success').d('Generated esa.toml'));
  }
}

export function getConfigValue<T>(
  globalValue: T | undefined,
  configValue: T | undefined,
  defaultValue: T
): T {
  if (globalValue !== undefined) {
    return globalValue;
  }
  if (configValue !== undefined) {
    return configValue;
  }
  return defaultValue;
}

export function getDevConf<T>(
  name: keyof DevToolProps,
  type: string,
  defaultValue: T
): T {
  const projectConfig = getProjectConfig();
  const configPath = `${type ? type + '.' : ''}${name}`;
  const userConf = configPath.split('.').reduce((current, key) => {
    return current && key in current ? current[key] : undefined;
  }, projectConfig);
  // @ts-ignore
  const globalConf = global[name];
  return getConfigValue(globalConf, userConf, defaultValue);
}

export function getDevOpenBrowserUrl(): string {
  const port = getDevConf('port', 'dev', 18080);
  return `http://localhost:${port}`;
}

export const getApiConfig = () => {
  const [cliConfig, projectConfig] = getConfigurations();
  let defaultConfig = {
    auth: {
      accessKeyId: '',
      accessKeySecret: ''
    },
    endpoint: `esa.cn-hangzhou.aliyuncs.com`
  };

  const combinedConfig = {
    ...defaultConfig,
    ...cliConfig,
    ...projectConfig
  };

  const config = {
    auth: {
      accessKeyId: combinedConfig.auth?.accessKeyId,
      accessKeySecret: combinedConfig.auth?.accessKeySecret
    },
    endpoint: combinedConfig.endpoint
  };
  return config;
};
