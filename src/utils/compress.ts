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

import path from 'path';
import fs from 'fs';
import { getProjectConfig, readEdgeRoutineFile } from './fileUtils/index.js';
import AdmZip from 'adm-zip';
import prodBuild from '../commands/commit/prodBuild.js';

const compress = async () => {
  const projectConfig = getProjectConfig();
  const entry = projectConfig?.entry;

  if (!entry) {
    throw new Error('Entry file not found in project config');
  }

  await prodBuild(false, entry);
  const code = readEdgeRoutineFile();

  const assets = projectConfig?.assets;

  // The entry file and assets folder are compressed into a zip file, the entry file is in the /routine directory, and the assets folder is in the /assets directory
  const zip = new AdmZip();

  // Add the entry file to the /routine directory
  if (fs.existsSync(entry)) {
    zip.addFile(`routine/index.js`, Buffer.from(code || ''));
  } else {
    throw new Error(`Entry file not found: ${entry}`);
  }

  // Add all files in the assets directory to the /assets directory
  if (assets?.directory && fs.existsSync(assets.directory)) {
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
  // Output the final zip to the current directory
  const currentDir = process.cwd();
  const zipPath = path.join(currentDir, 'routine.zip');
  zip.writeZip(zipPath);

  return zip;
};

export default compress;
