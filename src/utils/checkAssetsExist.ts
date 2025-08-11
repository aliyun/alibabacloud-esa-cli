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
  console.log(filePath, isDirectory);
  try {
    const resolvedPath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(filePath);

    console.log(resolvedPath);
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

export const checkConfigRoutineType = (): EDGE_ROUTINE_TYPE => {
  const projectConfig = getProjectConfig();

  // No project config exists
  if (!projectConfig) {
    return EDGE_ROUTINE_TYPE.NOT_EXIST;
  }

  const hasAssets = isValidPath(projectConfig.assets?.directory, true);
  const hasEntry = isValidPath(projectConfig.entry, false);

  console.log(hasAssets, hasEntry);

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
