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

import {
  checkConfigRoutineType,
  EDGE_ROUTINE_TYPE
} from './checkAssetsExist.js';
import { getProjectConfig, readEdgeRoutineFile } from './fileUtils/index.js';

const compress = async (scriptEntry?: string, assetsDir?: string) => {
  let code;
  const zip = new AdmZip();
  const projectConfig = getProjectConfig();

  // 参数优先：如果有参数则使用参数，否则使用配置文件中的值
  const entry = scriptEntry || projectConfig?.entry;
  const routineType = checkConfigRoutineType();

  // 处理 assets：参数优先，如果没有参数则使用配置文件中的 assets
  const assetsDirectory = assetsDir || projectConfig?.assets?.directory;

  if (routineType === EDGE_ROUTINE_TYPE.NOT_EXIST) {
    throw new Error('Entry file not found in project config');
  }

  console.log(routineType);
  if (
    routineType === EDGE_ROUTINE_TYPE.JS_ONLY ||
    routineType === EDGE_ROUTINE_TYPE.JS_AND_ASSETS
  ) {
    await prodBuild(false, entry);
    code = readEdgeRoutineFile();
    console.log(code);
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
