import { execSync } from 'child_process';
import https from 'https';
import os from 'os';
import path from 'path';
import util from 'util';

import fs from 'fs-extra';

import t from '../i18n/index.js';
import logger from '../libs/logger.js';

import { checkOS } from './checkOS.js';
import { calculateFileMD5 } from './fileMd5.js';
import { getDirName } from './fileUtils/base.js';

export const EW2DirName = '.ew2';
export const EW2BinName = 'edgeworker2';
export const EW2Path = path.join(os.homedir(), EW2DirName);
export const EW2BinPath = path.join(EW2Path, EW2BinName);
export const EW2ManifestPath = path.join(EW2Path, 'manifest.json');

interface Ew2Manifest {
  name: string;
  version: string;
  darwin_x86_64_checksum: string;
  linux_x86_64_checksum: string;
  darwin_arm64_checksum: string;
}

export async function preCheckEw2(): Promise<boolean> {
  const fsAccess = util.promisify(fs.access);
  const manifestRes = await checkManifest();
  async function installVersion(manifest: Ew2Manifest): Promise<boolean> {
    try {
      await installEw2(manifest);
      return true;
    } catch (error) {
      const err = error as Error;
      logger.error(err.message);
      return false;
    }
  }
  try {
    await fsAccess(EW2BinPath, fs.constants.X_OK);
    if (!manifestRes.isLatest) {
      logger.warn(
        t('install_runtime_update_tip').d(
          `🔔 Runtime must be update to use esa-cli dev. Installing...`
        )
      );
      return await installVersion(manifestRes.remoteManifest);
    }
    return true;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'EACCES') {
      logger.pathEacces(EW2BinPath);
      return false;
    }
    if (err.code === 'ENOENT' || err.code === 'EPERM') {
      logger.warn(
        t('install_runtime_tip').d(
          `🔔 Runtime must be installed to use esa-cli dev. Installing...`
        )
      );
      return await installVersion(manifestRes.remoteManifest);
    }
    logger.error(err.message);
    return false;
  }
}

export function fetchRemoteManifest(): Promise<Ew2Manifest> {
  return new Promise((resolve, reject) => {
    https
      .get(
        'https://edgestar-cn.oss-cn-beijing.aliyuncs.com/ew2/manifest.json',
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              resolve(json);
            } catch (err) {
              reject(null);
            }
          });
        }
      )
      .on('error', () => reject);
  });
}

export async function checkManifest(): Promise<{
  remoteManifest: Ew2Manifest;
  isLatest: boolean;
}> {
  let isLatest = false;
  const remoteManifest = await fetchRemoteManifest();
  const localManifestExists = await fs.pathExists(EW2ManifestPath);
  logger.info(`Remote version: ${remoteManifest.version}`);
  if (localManifestExists) {
    const localManifest = await fs.readJSON(EW2ManifestPath);
    isLatest = localManifest.version === remoteManifest.version;
    logger.info(`Local version: ${localManifest.version}`);
    if (!isLatest) {
      logger.log(
        `Runtime Latest version: ${remoteManifest.version}, Current version: ${localManifest.version}`
      );
    }
  }
  return {
    remoteManifest,
    isLatest
  };
}
export async function installEw2(manifest: Ew2Manifest): Promise<boolean> {
  const __dirname = getDirName(import.meta.url);
  const p = path.join(__dirname, './install');
  const installCommand = `sh ${p}/installEw2.sh ${manifest.version}`;
  try {
    execSync(installCommand, { stdio: 'inherit', env: { ...process.env } });
    const md5 = await calculateFileMD5(EW2BinPath);
    const os = checkOS();
    // @ts-ignore;
    if (md5 === manifest[`${os}_checksum`]) {
      logger.success('Runtime checksum success.');
    }
    await fs.writeJSON(EW2ManifestPath, manifest);
    logger.success(t('install_runtime_success').d(`Runtime installed.`));
    return true;
  } catch (error) {
    logger.error(`Failed to install: ${(error as Error).message}`);
    return false;
  }
}
