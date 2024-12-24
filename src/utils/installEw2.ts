import os from 'os';
import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import { checkOS, Platforms } from './checkOS.js';
import logger from '../libs/logger.js';
import { getDirName } from './fileUtils/base.js';
import t from '../i18n/index.js';

export const EW2DirName = '.ew2';
export const EW2BinName = 'edgeworker2';
export const EW2Path = path.join(os.homedir(), EW2DirName);
export const EW2BinPath = path.join(EW2Path, EW2BinName);

export function preCheckEw2(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    fs.access(EW2BinPath, fs.constants.X_OK, (err) => {
      if (err) {
        if (err.code === 'EACCES') {
          logger.pathEacces(EW2BinPath);
          reject(false);
          return;
        }
        if (err.code === 'ENOENT' || err.code === 'EPERM') {
          installEw2()
            .then(() => {
              resolve(true);
            })
            .catch((err) => {
              console.log('err', err);
              reject(false);
            });
        }
      } else {
        resolve(true);
      }
    });
  });
}
export async function installEw2(): Promise<boolean> {
  const __dirname = getDirName(import.meta.url);
  const p = path.join(__dirname, './install');
  const installCommand = `sh ${p}/installEw2.sh`;
  logger.warn(
    t('install_runtime_tip').d(
      `🔔 Runtime must be installed to use esa dev. Installing...`
    )
  );
  try {
    execSync(installCommand, { stdio: 'inherit' });
    logger.success(t('install_runtime_success').d(`Runtime installed.`));
    return true;
  } catch (error) {
    logger.error(`Failed to install: ${(error as Error).message}`);
    return false;
  }
}
