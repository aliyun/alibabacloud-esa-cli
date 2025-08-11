import fs from 'fs';
import path from 'path';

import { getProjectConfig } from './fileUtils/index.js';

/**
 * Check if the assets directory exists in the project config
 * @returns {boolean} true if the assets directory exists, false otherwise
 */
const checkConfigAssetsExist = () => {
  const projectConfig = getProjectConfig();
  if (!projectConfig) {
    return false;
  }
  const directory = projectConfig.assets?.directory;
  if (!directory) {
    return false;
  }
  return true;
};

export enum EDGE_ROUTINE_TYPE {
  ASSETS_ONLY = 'assets_only',
  JS_ONLY = 'js_only',
  JS_AND_ASSETS = 'js_and_assets',
  NOT_EXIST = 'not_exist'
}

/**
 * Check if a path exists and is valid
 * @param filePath - The path to check
 * @param isDirectory - Whether the path should be a directory
 * @returns boolean
 */
const isValidPath = (
  filePath: string | undefined,
  isDirectory = false
): boolean => {
  if (!filePath || typeof filePath !== 'string' || filePath.trim() === '') {
    return false;
  }
  try {
    const resolvedPath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(filePath);

    const exists = fs.existsSync(resolvedPath);

    if (!exists) {
      return false;
    }

    if (isDirectory) {
      return fs.statSync(resolvedPath).isDirectory();
    } else {
      return fs.statSync(resolvedPath).isFile();
    }
  } catch (error) {
    return false;
  }
};

export const checkEdgeRoutineType = (
  scriptEntry?: string,
  assetsDirectory?: string,
  projectPath?: string
): EDGE_ROUTINE_TYPE => {
  const projectConfig = getProjectConfig(projectPath);
  const entry = scriptEntry || projectConfig?.entry;
  const assets = assetsDirectory || projectConfig?.assets?.directory;

  const entryPath = path.resolve(projectPath ?? '', entry ?? '');
  const assetsPath = path.resolve(projectPath ?? '', assets ?? '');

  const hasAssets = isValidPath(assetsPath, true) && assets;
  const hasEntry = isValidPath(entryPath, false) && entry;

  // Both assets and entry exist
  if (hasAssets && hasEntry) {
    return EDGE_ROUTINE_TYPE.JS_AND_ASSETS;
  }

  // Only assets exist
  if (hasAssets && !hasEntry) {
    return EDGE_ROUTINE_TYPE.ASSETS_ONLY;
  }

  // Only entry exists
  if (!hasAssets && hasEntry) {
    return EDGE_ROUTINE_TYPE.JS_ONLY;
  }

  // Neither exists
  return EDGE_ROUTINE_TYPE.NOT_EXIST;
};

export default checkConfigAssetsExist;
