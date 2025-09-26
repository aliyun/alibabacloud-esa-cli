import { exec } from 'child_process';
import * as fs from 'fs/promises';
import os from 'os';
import * as path from 'path';
import { promisify } from 'util';

import AdmZip from 'adm-zip';
import chalk from 'chalk';
import fetch from 'node-fetch';

import t from '../i18n/index.js';
import logger from '../libs/logger.js';

const execAsync = promisify(exec);

function getBinDir(): string {
  const home = os.homedir();

  return path.join(home || '', '.deno', 'bin');
}

/**
 * 下载文件
 * @param url 远程文件URL
 * @param dest 本地保存路径
 */
export async function downloadFile(url: string, dest: string): Promise<void> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Error downloading file: ${response.status} ${response.statusText}`
    );
  }

  const fileStream = await fs.open(dest, 'w');
  return new Promise((resolve, reject) => {
    response.body?.pipe(fileStream.createWriteStream());
    response.body?.on('error', (err: Error) => {
      fileStream.close();
      reject(err);
    });
    fileStream.createWriteStream().on('finish', () => {
      fileStream.close();
      resolve();
    });
  });
}

/**
 * 解压Zip文件 adm 是同步的
 * @param zipPath Zip文件路径
 * @param extractPath 解压目标目录
 */
export function unzipFile(zipPath: string, extractPath: string): void {
  const zip = new AdmZip(zipPath);
  zip.extractAllTo(extractPath, true);
  logger.info(`UnzipFile success: from ${zipPath} to ${extractPath}`);
}

/**
 * 获取用户的 PATH 环境变量（win下专用）
 * @returns 用户 PATH
 */
async function getUserPath(): Promise<string> {
  const { stdout } = await execAsync('reg query "HKCU\\Environment" /v Path');
  const match = stdout.match(/Path\s+REG_EXPAND_SZ\s+(.*)/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  return '';
}

/**
 * 检查 BinDir 是否在用户的 PATH 中（win下专用）
 * @param binDir BinDir 路径
 * @returns 是否包含
 */
async function isBinDirInPath(binDir: string): Promise<boolean> {
  const userPath = await getUserPath();
  return userPath
    .split(';')
    .map((p) => p.toLowerCase())
    .includes(binDir.toLowerCase());
}

/**
 * 将 BinDir 添加到用户的 PATH 环境变量（win下专用）
 * @param binDir BinDir 路径
 */
async function addBinDirToPath(binDir: string): Promise<void> {
  // Use setx to add to PATH
  // setx has a 2047 character limit for PATH
  const command = `setx Path "%Path%;${binDir}"`;
  try {
    await execAsync(command);
    logger.info(`Path add success: ${binDir}`);
  } catch (error) {
    throw new Error(`Add BinDir to Path failed: ${error}`);
  }
}

export async function downloadRuntimeAndUnzipForWindows() {
  try {
    const BinDir = getBinDir();
    const DenoZip = path.join(BinDir, 'deno.zip');
    const Target = 'x86_64-pc-windows-msvc';
    const DownloadUrl = `http://esa-runtime.myalicdn.com/runtime/deno-${Target}.zip`;
    logger.ora.start('Downloading...');
    try {
      await fs.mkdir(BinDir, { recursive: true });
    } catch (error) {
      const err = error as Error;
      logger.ora.fail();
      logger.error(`mkdir error ${BinDir}: ${err.message}`);
      process.exit(1);
    }

    try {
      await downloadFile(DownloadUrl, DenoZip);
    } catch (error) {
      const err = error as Error;
      logger.ora.fail();
      logger.error(
        `${t('deno_download_failed').d('Download failed')}: ${err.message}`
      );
      process.exit(1);
    }

    logger.info(`Unzip file to: ${BinDir}`);
    try {
      logger.ora.text = 'Unzip...';
      unzipFile(DenoZip, BinDir);
    } catch (error) {
      const err = error as Error;
      logger.ora.fail();
      logger.error(
        `${t('deno_unzip_failed').d('Unzip failed')}: ${err.message}`
      );
      process.exit(1);
    }

    try {
      logger.ora.text = 'Deleting temp file...';
      await fs.unlink(DenoZip);
      logger.ora.succeed('Download success');
      logger.info(`Delete temp file: ${DenoZip}`);
    } catch (error) {
      logger.warn(`Delete temp file ${DenoZip} failed: ${error}`);
    }

    try {
      logger.ora.text = 'Adding Bin dir to PATH...';
      const inPath = await isBinDirInPath(BinDir);
      if (!inPath) {
        logger.info(`${BinDir} not in PATH`);
        await addBinDirToPath(BinDir);
      } else {
        logger.info(`${BinDir} in PATH already`);
      }
    } catch (error) {
      const err = error as Error;
      logger.ora.fail();
      logger.error(
        `${t('deno_add_path_failed').d('Add BinDir to Path failed')}: ${err.message}`
      );
      process.exit(1);
    }

    logger.success(t('deno_install_success').d('Runtime install success!'));
    logger.block();
    const dev = chalk.green('esa-cli dev');
    logger.log(
      t('deno_install_success_tips', { dev }).d(`Please run ${dev} again`)
    );
  } catch (error) {
    const err = error as Error;
    logger.ora.fail();
    logger.error(`Download Error: ${err.message}`);
    process.exit(1);
  }
}
