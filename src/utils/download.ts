import fetch from 'node-fetch';
import * as fs from 'fs/promises';
import * as path from 'path';
import os from 'os';
import AdmZip from 'adm-zip';
import { exec } from 'child_process';
import { promisify } from 'util';
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
  // 使用 setx 添加到 PATH
  // setx 对 PATH 的长度有2047字符的限制
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

    try {
      await fs.mkdir(BinDir, { recursive: true });
    } catch (error) {
      const err = error as Error;
      logger.error(`mkdir error ${BinDir}: ${err.message}`);
      process.exit(1);
    }

    try {
      await downloadFile(DownloadUrl, DenoZip);
      logger.success(
        `${t('deno_download_success').d('Download success')}: ${DenoZip}`
      );
    } catch (error) {
      const err = error as Error;
      logger.error(
        `${t('deno_download_failed').d('Download failed')}: ${err.message}`
      );
      process.exit(1);
    }

    logger.info(`Unzip file to: ${BinDir}`);
    try {
      unzipFile(DenoZip, BinDir);
    } catch (error) {
      const err = error as Error;
      logger.error(
        `${t('deno_unzip_failed').d('Unzip failed')}: ${err.message}`
      );
      process.exit(1);
    }

    try {
      await fs.unlink(DenoZip);
      logger.info(`Delete temp file: ${DenoZip}`);
    } catch (error) {
      logger.warn(`Delete temp file ${DenoZip} failed: ${error}`);
    }

    try {
      const inPath = await isBinDirInPath(BinDir);
      if (!inPath) {
        logger.info(`${BinDir} not in PATH, adding...`);
        await addBinDirToPath(BinDir);
      } else {
        logger.info(`${BinDir} in PATH already`);
      }
    } catch (error) {
      const err = error as Error;
      logger.error(
        `${t('deno_add_path_failed').d('Add BinDir to Path failed')}: ${err.message}`
      );
      process.exit(1);
    }

    logger.success(t('deno_install_success').d('Runtime install success!'));
  } catch (error) {
    const err = error as Error;
    logger.error(`Download Error: ${err.message}`);
    process.exit(1);
  }
}
