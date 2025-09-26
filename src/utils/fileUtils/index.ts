import fs, { promises as fsPromises } from 'fs';
import os from 'os';
import path from 'path';

import toml from '@iarna/toml';

import t from '../../i18n/index.js';
import logger from '../../libs/logger.js';

import { getDirName, getRoot } from './base.js';
import { CliConfig, DevToolProps, ProjectConfig } from './interface.js';

const __dirname = getDirName(import.meta.url);

const root = getRoot();

// Function to get the actual project config file path (supports both .jsonc and .toml)
export const getProjectConfigPath = (filePath: string = root): string => {
  const configFormats = ['esa.jsonc', 'esa.toml'];

  for (const format of configFormats) {
    const configPath = path.join(filePath, format);
    if (fs.existsSync(configPath)) {
      return configPath;
    }
  }

  // Default to .jsonc if no config file exists
  return path.join(filePath, 'esa.jsonc');
};

export const projectConfigPath = getProjectConfigPath();
export const cliConfigPath = path.join(
  os.homedir(),
  '.esa/config/default.toml'
);

// Function to get the actual config file path (supports both .toml and .jsonc)
export const getCliConfigPath = (): string => {
  const configDir = path.join(os.homedir(), '.esa/config');
  const jsoncPath = path.join(configDir, 'default.jsonc');
  const tomlPath = path.join(configDir, 'default.toml');

  // Check if JSONC file exists first, then fallback to TOML
  if (fs.existsSync(jsoncPath)) {
    return jsoncPath;
  }
  return tomlPath;
};
export const hiddenConfigDir = path.join(os.homedir(), '.esa/config');

export const generateHiddenConfigDir = () => {
  if (!fs.existsSync(hiddenConfigDir)) {
    fs.mkdirSync(hiddenConfigDir, { recursive: true });
  }
};

export const generateToml = (path: string) => {
  if (!fs.existsSync(path)) {
    fs.writeFileSync(path, '', 'utf-8');
    // Add default endpoint
    const defaultConfig = {
      endpoint: 'esa.cn-hangzhou.aliyuncs.com'
    };
    updateCliConfigFile(defaultConfig);
  }
};

export const generateDefaultConfig = () => {
  generateHiddenConfigDir();
  const configPath = getCliConfigPath();
  generateToml(configPath);
};

export async function updateProjectConfigFile(
  configUpdate: Partial<CliConfig>,
  filePath: string = root
): Promise<void> {
  const configPath = getProjectConfigPath(filePath);
  try {
    let configFileContent = await fsPromises.readFile(configPath, 'utf8');
    let config: any;
    let updatedConfigString: string;

    // Detect file format based on file extension
    if (configPath.endsWith('.jsonc') || configPath.endsWith('.json')) {
      // Handle JSONC format
      const jsonContent = configFileContent.replace(
        /\/\*[\s\S]*?\*\/|\/\/.*$/gm,
        ''
      );
      config = JSON.parse(jsonContent);
      config = { ...config, ...configUpdate };
      updatedConfigString = JSON.stringify(config, null, 2) + '\n';
    } else {
      // Handle TOML format (default)
      config = toml.parse(configFileContent);
      config = { ...config, ...configUpdate };
      updatedConfigString = toml.stringify(config);
    }

    await fsPromises.writeFile(configPath, updatedConfigString);
  } catch (error) {
    logger.error(`Error updating config file: ${error}`);
    logger.pathEacces(__dirname);
  }
}

export async function updateCliConfigFile(configUpdate: Partial<CliConfig>) {
  try {
    const configPath = getCliConfigPath();
    let configFileContent = await fsPromises.readFile(configPath, 'utf8');
    let config: any;
    let updatedConfigString: string;

    // Detect file format based on file extension
    if (configPath.endsWith('.jsonc') || configPath.endsWith('.json')) {
      // Handle JSONC format
      const jsonContent = configFileContent.replace(
        /\/\*[\s\S]*?\*\/|\/\/.*$/gm,
        ''
      );
      config = JSON.parse(jsonContent);
      config = { ...config, ...configUpdate };
      updatedConfigString = JSON.stringify(config, null, 2) + '\n';
    } else {
      // Handle TOML format (default)
      config = toml.parse(configFileContent);
      config = { ...config, ...configUpdate };
      updatedConfigString = toml.stringify(config);
    }

    await fsPromises.writeFile(configPath, updatedConfigString);
  } catch (error) {
    logger.error(`Error updating config file: ${error}`);
    logger.pathEacces(__dirname);
    throw new Error('Config update error');
  }
}

export function readConfigFile(
  configPath: string
): CliConfig | ProjectConfig | null {
  if (fs.existsSync(configPath)) {
    const configFileContent = fs.readFileSync(configPath, 'utf-8');
    try {
      if (configPath.endsWith('.jsonc') || configPath.endsWith('.json')) {
        // Remove comments for JSON parsing
        const jsonContent = configFileContent.replace(
          /\/\*[\s\S]*?\*\/|\/\/.*$/gm,
          ''
        );
        const config = JSON.parse(jsonContent);
        return config as CliConfig | ProjectConfig;
      } else {
        // TOML format
        const config = toml.parse(configFileContent);
        return config as CliConfig | ProjectConfig;
      }
    } catch (error) {
      logger.error(`Error parsing config file: ${error}`);
      return null;
    }
  }
  return null;
}
export function getCliConfig() {
  const configPath = getCliConfigPath();
  const res = readConfigFile(configPath);
  if (!res) {
    return null;
  }
  return res as CliConfig;
}

export function getProjectConfig(filePath: string = root) {
  // Try to find config file in order of preference: .jsonc, .toml
  const configFormats = ['esa.jsonc', 'esa.toml'];

  for (const format of configFormats) {
    const configPath = path.join(filePath, format);
    const config = readConfigFile(configPath);
    if (config) {
      return config as ProjectConfig;
    }
  }

  return null;
}

export function readEdgeRoutineFile(projectPath: string = root): string | null {
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
  initConfigs?: Partial<ProjectConfig>,
  targetDir?: string,
  configFormat: 'toml' | 'jsonc' = 'jsonc',
  notFoundStrategy?: string
) {
  const outputDir = targetDir ?? process.cwd();
  const currentDirName = path.basename(outputDir);
  const entry = initConfigs?.dev?.entry;
  const port = initConfigs?.port || 18080;
  const name = projectName || currentDirName;
  const assetsDirectory = initConfigs?.assets?.directory;

  let newFilePath: string;
  let genConfig: string;

  if (configFormat === 'jsonc') {
    newFilePath = path.join(outputDir, 'esa.jsonc');
    const configObj: Record<string, any> = { name };
    if (entry) configObj.entry = entry;
    if (assetsDirectory) {
      configObj.assets = { directory: assetsDirectory };
      if (notFoundStrategy) {
        (configObj.assets as Record<string, any>).notFoundStrategy =
          notFoundStrategy;
      }
    }
    configObj.dev = { port };
    genConfig = JSON.stringify(configObj, null, 2) + '\n';
  } else {
    // Default to TOML format
    newFilePath = path.join(outputDir, 'esa.toml');
    const configObj: Record<string, any> = {
      name,
      dev: { port }
    };
    if (entry) configObj.entry = entry;
    if (assetsDirectory) {
      configObj.assets = { directory: assetsDirectory };
      if (notFoundStrategy) {
        (configObj.assets as Record<string, any>).notFoundStrategy =
          notFoundStrategy;
      }
    }
    genConfig = toml.stringify(configObj);
  }

  if (fs.existsSync(newFilePath)) {
    logger.error(
      `${path.basename(newFilePath)}` +
        t('generate_config_error').d('already exists')
    );
    return;
  } else {
    await fsPromises.writeFile(newFilePath, genConfig, 'utf-8');
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

export const templateHubPath = path.join(
  getDirName(import.meta.url),
  '../../../node_modules/esa-template/src'
);

export interface TemplateItem {
  Title_EN: string;
  Title_ZH: string;
  Desc_EN: string;
  Desc_ZH: string;
  URL: string;
  children: TemplateItem[];
}

export const getTemplatesConfig = (): TemplateItem[] => {
  const manifestPath = path.join(templateHubPath, 'manifest.json');
  const config = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  return config;
};
