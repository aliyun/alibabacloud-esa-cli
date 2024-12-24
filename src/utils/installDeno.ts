import { exec, execSync } from 'child_process';
import os from 'os';
import { getDirName } from './fileUtils/base.js';
import logger from '../libs/logger.js';
import path from 'path';
import t from '../i18n/index.js';

export async function preCheckDeno(): Promise<string | false> {
  const command = await checkDenoInstalled();
  if (!command) {
    logger.error(
      t('install_runtime_explain').d(
        'Under the beta phase, we are temporarily using Deno as the local development runtime. It needs to be installed first.'
      )
    );
    installDeno();
    return false;
  }
  return command;
}

export function checkDenoInstalled(): Promise<string | false> {
  const homeDeno = path.resolve(os.homedir(), '.deno/bin/deno');
  function checkDeno(command: string) {
    return new Promise((resolve, reject) => {
      exec(`${command} --version`, (err) => {
        if (err) {
          reject();
        } else {
          resolve(command);
        }
      });
    });
  }
  return new Promise((resolve) => {
    // @ts-ignore
    Promise.any([checkDeno('deno'), checkDeno(homeDeno)])
      .then((res: any) => {
        resolve(res);
      })
      .catch((err: any) => {
        console.log(err);
        resolve(false);
      });
  });
}

export async function installDeno(): Promise<boolean> {
  let installCommand: string;
  const __dirname = getDirName(import.meta.url);
  const p = path.join(__dirname, './install');

  switch (os.platform()) {
    case 'win32':
      installCommand = `powershell.exe -Command "Get-Content '${p}/install.ps1' | iex"`;
      break;
    case 'darwin':
    case 'linux':
      installCommand = `sh ${p}/install.sh`;
      break;
    default:
      installCommand = `sh ${p}/install.sh`;
  }
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
