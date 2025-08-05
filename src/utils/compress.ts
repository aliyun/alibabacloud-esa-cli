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

const compress = async () => {
  const projectConfig = getProjectConfig();
  const entry = projectConfig?.entry;
  const routineType = checkConfigRoutineType();

  if (routineType === EDGE_ROUTINE_TYPE.NOT_EXIST) {
    throw new Error('Entry file not found in project config');
  }

  let code;
  const zip = new AdmZip();

  if (routineType === EDGE_ROUTINE_TYPE.JS_ONLY) {
    await prodBuild(false, entry);
    code = readEdgeRoutineFile();
    zip.addFile(`routine/index.js`, Buffer.from(code || ''));
  } else {
    code = '';
  }

  const assets = projectConfig?.assets;

  // Add the entry file to the /routine directory
  if (routineType === EDGE_ROUTINE_TYPE.JS_AND_ASSETS) {
    zip.addFile(`routine/index.js`, Buffer.from(code || ''));
  }

  // Add all files in the assets directory to the /assets directory
  if (
    (routineType === EDGE_ROUTINE_TYPE.JS_AND_ASSETS ||
      routineType === EDGE_ROUTINE_TYPE.ASSETS_ONLY) &&
    assets?.directory &&
    fs.existsSync(assets.directory)
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
          const relativePath = path.relative(assets.directory, fullPath);
          zip.addFile(`assets/${relativePath}`, fileContent);
        }
      }
    };

    addDirectoryToZip(assets.directory, 'assets');
  }

  return zip;
};

export default compress;
