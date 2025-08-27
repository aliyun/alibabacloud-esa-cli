import { execSync } from 'child_process';
import path from 'path';

import chalk from 'chalk';
import fs from 'fs-extra';
import inquirer from 'inquirer';

import { SelectItem } from '../../components/mutiLevelSelect.js';
import t from '../../i18n/index.js';
import logger from '../../libs/logger.js';
import Template from '../../libs/templates/index.js';
import { getDirName } from '../../utils/fileUtils/base.js';
import {
  getProjectConfig,
  templateHubPath,
  TemplateItem
} from '../../utils/fileUtils/index.js';

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
    // After build, try to infer assets directory if not explicitly known
    try {
      const candidates = ['dist', 'build', 'out'];
      for (const dir of candidates) {
        const abs = path.join(targetPath, dir);
        if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) {
          // Update config file if present and assets not set
          const projectConfig = getProjectConfig(targetPath);
          if (projectConfig) {
            const { updateProjectConfigFile } = await import(
              '../../utils/fileUtils/index.js'
            );
            if (!projectConfig.assets || !projectConfig.assets.directory) {
              await updateProjectConfigFile(
                { assets: { directory: dir } },
                targetPath
              );
              logger.success(
                `Detected build output "${dir}" and updated assets.directory`
              );
            }
          }
          break;
        }
      }
    } catch {}
  }
};

export async function checkAndUpdatePackage(
  packageName: string
): Promise<void> {
  try {
    const spinner = logger.ora;
    spinner.text = t('checking_template_update').d(
      'Checking esa-template updates...'
    );
    spinner.start();
    // 获取当前安装的版本
    const __dirname = getDirName(import.meta.url);
    const packageJsonPath = path.join(__dirname, '../../../');
    let versionInfo;
    try {
      versionInfo = execSync(`npm list ${packageName}`, {
        cwd: packageJsonPath
      }).toString();
    } catch (e) {
      spinner.text = t('template_updating').d(
        'Updating templates to latest...'
      );
      execSync(`rm -rf node_modules/${packageName}`, {
        cwd: packageJsonPath
      });
      execSync(`npm install ${packageName}@latest`, {
        cwd: packageJsonPath,
        stdio: 'inherit'
      });
      spinner.stop();
      logger.log(
        `├ ${t('template_updated_to_latest').d('Templates updated to latest.')}`
      );
      return;
    }

    const match = versionInfo.match(new RegExp(`(${packageName})@([0-9.]+)`));
    const currentVersion = match ? match[2] : '';
    // 获取最新版本

    const latestVersion: string = execSync(`npm view ${packageName} version`, {
      cwd: packageJsonPath
    })
      .toString()
      .trim();

    if (currentVersion !== latestVersion) {
      spinner.stop();
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
        spinner.start(
          t('template_updating').d('Updating templates to latest...')
        );
        execSync(`rm -rf node_modules/${packageName}`, {
          cwd: packageJsonPath
        });
        execSync(`rm -rf package-lock.json`, {
          cwd: packageJsonPath
        });
        execSync(`npm install ${packageName}@latest`, {
          cwd: packageJsonPath,
          stdio: 'inherit'
        });
        spinner.stop();
        logger.log(
          `├ ${t('updated_esa_template_to_latest_version', { packageName }).d(
            `${packageName} updated successfully`
          )}`
        );
      }
    } else {
      spinner.stop();
      logger.log(
        ` ${t('checking_esa_template_finished').d(
          `Checking esa-template finished.`
        )}`
      );

      t('esa_template_is_latest_version', { packageName }).d(
        `${packageName} is latest.`
      );
      logger.divider();
    }
  } catch (error) {
    console.log(error);
    if (error instanceof Error) {
      logger.ora.fail(
        t('check_and_update_package_error').d(
          'Error: An error occurred while checking and updating the package, skipping template update'
        )
      );
    }
  }
}

/**
 * 获取template.jsonc配置
 * @param framework 框架名称
 * @returns 框架配置
 */

export type FrameworkConfig = {
  label: string;
  command: string;
  templates?: {
    typescript?: string;
    javascript?: string;
    [key: string]: string | undefined;
  };
  assets?: {
    directory: string;
    notFoundStrategy: string;
  };
};

export const getFrameworkConfig = (framework: string): FrameworkConfig => {
  // 从init目录读取template.jsonc
  const templatePath = path.join(getDirName(import.meta.url), 'template.jsonc');
  const jsonc = fs.readFileSync(templatePath, 'utf-8');
  const json = JSON.parse(jsonc);
  return json[framework];
};

/**
 * 获取框架全部配置
 * @returns 框架全部配置
 */
export const getAllFrameworkConfig = () => {
  // 从init目录读取template.jsonc
  const templatePath = path.join(getDirName(import.meta.url), 'template.jsonc');
  const jsonc = fs.readFileSync(templatePath, 'utf-8');
  const json = JSON.parse(jsonc);
  return json;
};
