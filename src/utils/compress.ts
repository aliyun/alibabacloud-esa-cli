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
import { exit } from 'process';

import AdmZip from 'adm-zip';
import chalk from 'chalk';

import prodBuild from '../commands/commit/prodBuild.js';
import t from '../i18n/index.js';
import logger from '../libs/logger.js';

import { checkEdgeRoutineType, EDGE_ROUTINE_TYPE } from './checkAssetsExist.js';
import { getProjectConfig, readEdgeRoutineFile } from './fileUtils/index.js';

const compress = async (
  scriptEntry?: string,
  assetsDir?: string,
  minify = false,
  projectPath?: string
): Promise<{
  zip: AdmZip;
  fileList: string[];
  sourceList: string[];
  dynamicSources: string[];
}> => {
  let code;
  const zip = new AdmZip();
  const fileList: string[] = [];
  const sourceList: string[] = [];
  const dynamicSources: string[] = [];

  const projectConfig = getProjectConfig(projectPath);
  let assetsDirectory = assetsDir || projectConfig?.assets?.directory;

  const routineType = checkEdgeRoutineType(scriptEntry, assetsDir, projectPath);

  if (!projectConfig && !scriptEntry && !assetsDir) {
    logger.error(
      [
        'esa.jsonc (recommended) or esa.toml is not found and script entry or assets directory is not provided by command line',
        '',
        'See configuration guide:',
        `- English: ${chalk.underline('https://github.com/aliyun/alibabacloud-esa-cli/blob/main/docs/Config_en.md')}`,
        `- 中文: ${chalk.underline('https://github.com/aliyun/alibabacloud-esa-cli/blob/main/docs/Config_zh_CN.md')}`
      ].join('\n')
    );
    exit(1);
  }

  // Parameter priority: use parameters if available, otherwise use values from config file
  const entry = scriptEntry || projectConfig?.entry;

  if (routineType === EDGE_ROUTINE_TYPE.NOT_EXIST) {
    const errorMessage = [
      chalk.red.bold('❌ File upload failed'),
      '',
      chalk.cyan('📋 Current configuration information:'),
      `${chalk.white(`  📄 Entry file ${chalk.yellow('(dynamic)')} :`)} ${chalk.yellow(
        scriptEntry ||
          projectConfig?.entry ||
          chalk.gray(t('compress_not_configured').d('Not configured'))
      )}`,
      `${chalk.white(`  🗂️  Assets directory ${chalk.yellow('(static)')} :`)} ${chalk.yellow(assetsDirectory || chalk.gray(t('compress_not_configured').d('Not configured')))}`,
      '',
      chalk.cyan('🔍 Possible issue causes:'),
      chalk.white('  1. Entry file path is incorrect or file does not exist'),
      chalk.white(
        '  2. Assets directory path is incorrect or directory does not exist'
      ),
      chalk.white(
        `  3. Project configuration file ${chalk.yellow('esa.jsonc')} (recommended) or ${chalk.yellow('esa.toml')} format error`
      ),
      chalk.white(
        `  4. Relative path format error, please use ${chalk.yellow('./xxx')} format`
      ),
      '',
      chalk.yellow.bold(
        `📍 Please check if the following ${chalk.red('absolute paths')} are correct:`
      ),
      ...(scriptEntry || projectConfig?.entry
        ? [
            `${chalk.white('  📄 Entry file:')} ${chalk.cyan.bold(
              path.resolve(
                projectPath ?? '',
                scriptEntry || projectConfig?.entry || ''
              )
            )} ${chalk.gray(t('compress_check_file_exists').d('(Check if file exists)'))}`
          ]
        : []),
      ...(assetsDirectory
        ? [
            `${chalk.white('  🗂️  Assets directory:')} ${chalk.cyan.bold(
              path.resolve(projectPath ?? '', assetsDirectory)
            )} ${chalk.gray(t('compress_check_directory_exists').d('(Check if directory exists)'))}`
          ]
        : []),
      ...(!scriptEntry && !projectConfig?.entry && !assetsDirectory
        ? [
            chalk.yellow.bold(
              '  ⚠️  You need to configure at least one of entry file or assets directory'
            )
          ]
        : []),
      ''
    ].join('\n');

    logger.error(errorMessage);
    exit(1);
  }

  if (
    routineType === EDGE_ROUTINE_TYPE.JS_ONLY ||
    routineType === EDGE_ROUTINE_TYPE.JS_AND_ASSETS
  ) {
    const buildEntry = path.resolve(projectPath ?? '', entry ?? '');
    await prodBuild(minify, buildEntry, projectPath);
    code = readEdgeRoutineFile(projectPath);
    zip.addFile(`routine/index.js`, Buffer.from(code || ''));
    fileList.push('routine/index.js');
    const relativeEntry = path
      .relative(projectPath ?? '', buildEntry)
      .split(path.sep)
      .join('/');
    sourceList.push(relativeEntry);
    dynamicSources.push(relativeEntry);
  }
  assetsDirectory = path.resolve(projectPath ?? '', assetsDirectory ?? '');

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
          const relativePath = path
            .relative(assetsDirectory, fullPath)
            .split(path.sep)
            .join('/');
          zip.addFile(`assets/${relativePath}`, fileContent);
          fileList.push(`assets/${relativePath}`);
          const relativeSrcPath = path
            .relative(projectPath ?? '', fullPath)
            .split(path.sep)
            .join('/');
          sourceList.push(relativeSrcPath);
        }
      }
    };
    addDirectoryToZip(assetsDirectory, 'assets');
  }
  return { zip, fileList, sourceList, dynamicSources };
};

export default compress;
