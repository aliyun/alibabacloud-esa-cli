import { promises as fs } from 'fs';
import path from 'path';

import chalk from 'chalk';
import inquirer from 'inquirer';
import fetch from 'node-fetch';

import t from '../i18n/index.js';
import logger from '../libs/logger.js';
import execCommand from '../utils/command.js';
import { getDirName } from '../utils/fileUtils/base.js';

export async function handleCheckVersion() {
  const __dirname = getDirName(import.meta.url);
  const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');
  try {
    const jsonString = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(jsonString);
    console.log(`v${packageJson.version}`);
  } catch (error) {
    console.error('Error reading version', error);
  }
}

/**
 * 检查CLI是否为最新版本，如果不是则提示用户更新
 * @returns 是否为最新版本
 */
export async function checkCLIVersion(
  currentCommand?: string
): Promise<boolean> {
  if (process.env.ESA_NO_UPDATE_CHECK) {
    return true;
  }
  try {
    const __dirname = getDirName(import.meta.url);
    const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');
    const jsonString = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(jsonString);
    const currentVersion = packageJson.version;
    const controller = new AbortController();
    const fetchTimeout = setTimeout(() => controller.abort(), 5000);
    let response;
    try {
      response = await fetch(
        'https://registry.npmmirror.com/esa-cli/latest',
        {
          signal: controller.signal as any
        }
      );
    } finally {
      clearTimeout(fetchTimeout);
    }
    if (!response.ok) {
      return true;
    }
    const data = (await response.json()) as { version: string };
    const latestVersion = data.version;
    if (currentVersion !== latestVersion) {
      const accent = chalk.hex('#7C3AED').bold;
      const labelColor = chalk.hex('#22c55e');
      const currentLabelRaw = t('version_current').d('Current');
      const latestLabelRaw = t('version_latest').d('Latest');
      const noteLabelRaw = t('version_note').d('Note');
      const updateLabelRaw = t('version_update').d('Update');
      const labelsRaw = [
        currentLabelRaw,
        latestLabelRaw,
        noteLabelRaw,
        updateLabelRaw
      ];
      const labelWidth = Math.max(...labelsRaw.map((l) => l.length));
      const gap = '  ';
      const padLabel = (raw: string, colored: string) =>
        `${colored}${' '.repeat(labelWidth - raw.length)}`;
      const lines = [
        `${accent('🚀  ' + t('version_title_update_available').d('ESA CLI Update Available'))}`,
        '',
        `${padLabel(currentLabelRaw, labelColor(currentLabelRaw))}${gap}${chalk.yellowBright('v' + currentVersion)}`,
        `${padLabel(latestLabelRaw, labelColor(latestLabelRaw))}${gap}${chalk.greenBright('v' + latestVersion)}`,
        '',
        `${padLabel(noteLabelRaw, chalk.yellowBright.bold(noteLabelRaw))}${gap}${chalk.yellowBright(
          t('version_note_incompatible').d(
            'This version may have incompatibilities, please upgrade soon.'
          )
        )}`,
        '',
        `${padLabel(updateLabelRaw, labelColor(updateLabelRaw))}${gap}${chalk.cyanBright('npm i -g esa-cli@latest')}`,
        `${' '.repeat(labelWidth)}${gap}${chalk.cyanBright('yarn global add esa-cli@latest')}`,
        `${' '.repeat(labelWidth)}${gap}${chalk.cyanBright('pnpm add -g esa-cli@latest')}`,
        '',
        `${chalk.gray(
          t('version_continue').d(
            'You can continue using the current version; commands will proceed.'
          )
        )}`
      ];
      // Render with deploy-success-style box (cyan double border)
      const stripAnsi = (s: string) =>
        s.replace(/\x1B\[[0-?]*[ -\/]*[@-~]/g, '');
      const contentWidth = Math.max(...lines.map((l) => stripAnsi(l).length));
      const borderColor = chalk.hex('#00D4FF').bold;
      const top = `${borderColor('╔')}${borderColor('═'.repeat(contentWidth + 2))}${borderColor('╗')}`;
      const bottom = `${borderColor('╚')}${borderColor('═'.repeat(contentWidth + 2))}${borderColor('╝')}`;
      const box = [
        top,
        ...lines.map((l) => {
          const pad = ' '.repeat(contentWidth - stripAnsi(l).length);
          const left = borderColor('║');
          const right = borderColor('║');
          return `${left} ${l}${pad} ${right}`;
        }),
        bottom
      ];
      logger.block();
      box.forEach((l) => logger.log(l));
      logger.block();
      // Only prompt interactively on init command; others just display notice
      if (currentCommand === 'init') {
        const { updateNow } = await inquirer.prompt<{
          updateNow: boolean;
        }>([
          {
            type: 'confirm',
            name: 'updateNow',
            message: chalk.bold(
              t('version_prompt_update_now').d(
                'Update now to the latest version?'
              )
            ),
            default: true
          }
        ]);
        if (updateNow) {
          const startText =
            'Updating ESA CLI to latest (npm i -g esa-cli@latest)';
          const doneText = 'ESA CLI update finished';
          try {
            const res = await execCommand(
              ['npm', 'i', '-g', 'esa-cli@latest'],
              {
                startText,
                doneText,
                useSpinner: true,
                interactive: false
              }
            );
            if (!res.success) {
              logger.warn(
                t('version_update_failed').d(
                  'Global update failed. You may need elevated permissions (sudo) or use yarn/pnpm:'
                )
              );
              logger.subLog('sudo npm i -g esa-cli@latest');
              logger.subLog('yarn global add esa-cli@latest');
              logger.subLog('pnpm add -g esa-cli@latest');
            }
          } catch (e) {
            logger.warn(
              t('version_update_failed').d(
                'Global update failed. You may need elevated permissions (sudo) or use yarn/pnpm:'
              )
            );
            logger.subLog('sudo npm i -g esa-cli@latest');
            logger.subLog('yarn global add esa-cli@latest');
            logger.subLog('pnpm add -g esa-cli@latest');
          }
          logger.divider();
        }
      }
      return false;
    }
    return true;
  } catch (error) {
    return true;
  }
}
