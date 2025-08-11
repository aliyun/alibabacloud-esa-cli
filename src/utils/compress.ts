/*
 Toml Example:
name = "DeepSeek model invocation"
description = 'How to invoke DeepSeek series models through API calls on the BaiLian platform.'
entry = "src/index.js"
assets = ["src/assets"]
codeVersions = [ ]

[assets]
directory = './assets/'

[dev]
port = 18080
localUpstream = ''
*/

import fs from 'fs';
import path from 'path';

import AdmZip from 'adm-zip';

import prodBuild from '../commands/commit/prodBuild.js';

import { checkEdgeRoutineType, EDGE_ROUTINE_TYPE } from './checkAssetsExist.js';
import { getProjectConfig, readEdgeRoutineFile } from './fileUtils/index.js';

const compress = async (
  scriptEntry?: string,
  assetsDir?: string,
  minify = false,
  projectPath?: string
) => {
  let code;
  const zip = new AdmZip();
  const projectConfig = getProjectConfig(projectPath);
  const routineType = checkEdgeRoutineType(scriptEntry, assetsDir, projectPath);

  if (!projectConfig) {
    throw new Error('Project config not found');
  }

  // 参数优先：如果有参数则使用参数，否则使用配置文件中的值
  const entry = scriptEntry || projectConfig?.entry;
  const assetsDirectory = assetsDir || projectConfig?.assets?.directory;

  if (routineType === EDGE_ROUTINE_TYPE.NOT_EXIST) {
    throw new Error('Entry file not found in project config');
  }

  if (
    routineType === EDGE_ROUTINE_TYPE.JS_ONLY ||
    routineType === EDGE_ROUTINE_TYPE.JS_AND_ASSETS
  ) {
    const buildEntry = path.resolve(projectPath ?? '', entry ?? '');
    await prodBuild(minify, buildEntry, projectPath);
    code = readEdgeRoutineFile(projectPath);
    zip.addFile(`routine/index.js`, Buffer.from(code || ''));
  }
  // Add all files in the assets directory to the /assets directory
  if (
    (routineType === EDGE_ROUTINE_TYPE.JS_AND_ASSETS ||
      routineType === EDGE_ROUTINE_TYPE.ASSETS_ONLY) &&
    assetsDirectory &&
    fs.existsSync(assetsDirectory)
  ) {
    const addDirectoryToZip = (dirPath: string, zipPath: string) => {
      const files = fs.readdirSync(dirPath);

      for (const file of files) {
        const fullPath = path.join(dirPath, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          addDirectoryToZip(fullPath, path.join(zipPath, file));
        } else {
          const fileContent = fs.readFileSync(fullPath);
          const relativePath = path.relative(assetsDirectory, fullPath);
          zip.addFile(`assets/${relativePath}`, fileContent);
        }
      }
    };
    addDirectoryToZip(assetsDirectory, 'assets');
  }
  return zip;
};

export default compress;
