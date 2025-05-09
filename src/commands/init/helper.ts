import fs from 'fs-extra';
import path from 'path';

import Template from '../../libs/templates/index.js';

import { getProjectConfig, TemplateItem } from '../../utils/fileUtils/index.js';
import logger from '../../libs/logger.js';
import { execSync } from 'child_process';
import t from '../../i18n/index.js';
import chalk from 'chalk';
import { SelectItem } from '../../components/mutiLevelSelect.js';
import inquirer from 'inquirer';
import { getDirName } from '../../utils/fileUtils/base.js';

export const getTemplateInstances = (templateHubPath: string) => {
  return fs
    .readdirSync(templateHubPath)
    .filter((item) => {
      const itemPath = path.join(templateHubPath, item);
      return (
        fs.statSync(itemPath).isDirectory() &&
        !['.git', 'node_modules', 'lib'].includes(item)
      );
    })
    .map((item) => {
      const projectPath = path.join(templateHubPath, item);
      const projectConfig = getProjectConfig(projectPath);
      const templateName = projectConfig?.name ?? '';
      return new Template(projectPath, templateName);
    });
};

export const transferTemplatesToSelectItem = (
  configs: TemplateItem[],
  templateInstanceList: Template[],
  lang?: string
): SelectItem[] => {
  if (!configs) return [];
  return configs.map((config) => {
    const title = config.Title_EN;
    const value =
      templateInstanceList.find((template) => {
        return title === template.title;
      })?.path ?? '';
    const children = transferTemplatesToSelectItem(
      config.children,
      templateInstanceList,
      lang
    );
    return {
      label: lang === 'en' ? config.Title_EN : config.Title_ZH,
      value: value,
      children
    };
  });
};

export const preInstallDependencies = async (targetPath: string) => {
  const packageJsonPath = path.join(targetPath, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    logger.log(t('init_install_dependence').d('⌛️ Installing dependencies...'));
    execSync('npm install', { stdio: 'inherit', cwd: targetPath });
    logger.success(
      t('init_install_dependencies_success').d(
        'Dependencies installed successfully.'
      )
    );

    // Read and parse package.json to check for build script
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    if (packageJson.scripts && packageJson.scripts.build) {
      logger.log(t('init_build_project').d('⌛️ Building project...'));
      execSync('npm run build', { stdio: 'inherit', cwd: targetPath });
      logger.success(
        t('init_build_project_success').d('Project built successfully.')
      );
    } else {
      logger.log(
        t('no_build_script').d(
          'No build script found in package.json, skipping build step.'
        )
      );
    }
  }
};

export async function checkAndUpdatePackage(
  packageName: string
): Promise<void> {
  try {
    // 获取当前安装的版本
    const __dirname = getDirName(import.meta.url);
    console.log(__dirname);
    const packageJsonPath = path.join(__dirname, '../../../');
    const versionInfo = execSync(`npm list ${packageName}`, {
      cwd: packageJsonPath
    }).toString();
    const match = versionInfo.match(new RegExp(`(${packageName})@([0-9.]+)`));
    const currentVersion = match ? match[2] : '';
    // 获取最新版本

    const latestVersion: string = execSync(`npm view ${packageName} version`, {
      cwd: packageJsonPath
    })
      .toString()
      .trim();

    if (currentVersion !== latestVersion) {
      logger.log(
        t('display_current_esa_template_version').d(
          `Current esa-template version:`
        ) +
          chalk.green(currentVersion) +
          '    ' +
          t('display_latest_esa_template_version').d(
            `Latest esa-template version:`
          ) +
          chalk.green(latestVersion)
      );

      const { isUpdate } = await inquirer.prompt({
        type: 'confirm',
        name: 'isUpdate',
        message: t('is_update_to_latest_version').d(
          'Do you want to update templates to latest version?'
        )
      });
      if (isUpdate) {
        execSync(
          `rm -rf node_modules/${packageName} &&rm -rf package-lock.json &&npm install ${packageName}@latest`,
          {
            cwd: packageJsonPath
          }
        );
        logger.log(
          t('updated_esa_template_to_latest_version', { packageName }).d(
            `${packageName} updated successfully`
          )
        );
      }
    } else {
      logger.log(
        t('esa_template_is_latest_version', { packageName }).d(
          `${packageName} is latest.`
        )
      );
    }
  } catch (error) {
    console.log(error);
    if (error instanceof Error) {
      logger.error('检测和更新包时发生错误，跳过更新模版');
    }
  }
}
