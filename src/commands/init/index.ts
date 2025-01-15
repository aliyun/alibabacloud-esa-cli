import { CommandModule, ArgumentsCamelCase, Argv } from 'yargs';
import fs from 'fs-extra';
import path from 'path';

import Template from '../../libs/templates/index.js';
import { installGit } from '../../libs/git/index.js';
import { descriptionInput } from '../../components/descriptionInput.js';
import {
  generateConfigFile,
  getCliConfig,
  getProjectConfig,
  getTemplatesConfig,
  templateHubPath,
  TemplateItem,
  updateProjectConfigFile
} from '../../utils/fileUtils/index.js';
import t from '../../i18n/index.js';
import logger from '../../libs/logger.js';
import SelectItems, { SelectItem } from '../../components/selectInput.js';
import { quickDeploy } from '../deploy/index.js';
import { ProjectConfig } from '../../utils/fileUtils/interface.js';
import chalk from 'chalk';
import { ApiService } from '../../libs/apiService.js';
import { exit } from 'process';
import { checkRoutineExist } from '../../utils/checkIsRoutineCreated.js';

import { execSync } from 'child_process';

import MultiLevelSelect from '../../components/mutiLevelSelect.js';
import { getDirName } from '../../utils/fileUtils/base.js';
import { yesNoPromptAndExecute } from '../deploy/helper.js';
import { checkIsLoginSuccess } from '../utils.js';

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

const secondSetOfItems = [
  { label: 'Yes', value: 'yesInstall' },
  { label: 'No', value: 'noInstall' }
];

const init: CommandModule = {
  command: 'init',
  describe: `📥 ${t('init_describe').d('Initialize a routine with a template')}`,
  builder: (yargs: Argv) => {
    return yargs.option('config', {
      alias: 'c',
      describe: t('init_config_file').d(
        'Generate a config file for your project'
      ),
      type: 'boolean'
    });
  },
  handler: async (argv: ArgumentsCamelCase) => {
    await handleInit(argv);
  }
};

export default init;

export const preInstallDependencies = async (targetPath: string) => {
  const packageJsonPath = path.join(targetPath, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    logger.log(t('init_install_dependence').d('⌛️ Installing dependencies...'));
    execSync('npm install esa-template', {
      stdio: 'inherit',
      cwd: targetPath
    });
    logger.success(
      t('init_install_dependencies_success').d(
        'Dependencies installed successfully.'
      )
    );
    logger.log(t('init_build_project').d('⌛️ Building project...'));
    execSync('npm run build', { stdio: 'inherit', cwd: targetPath });
    logger.success(
      t('init_build_project_success').d('Project built successfully.')
    );
  }
};

export const transferTemplatesToSelectItem = (
  configs: TemplateItem[],
  templateInstanceList: Template[],
  lang?: string
): SelectItem[] => {
  if (!configs) return [];
  return configs.map((config) => {
    const name = config.Title_EN;
    const value =
      templateInstanceList.find((template) => {
        return name === template.title;
      })?.path ?? '';
    const children = transferTemplatesToSelectItem(
      config.children,
      templateInstanceList
    );
    return {
      label: lang === 'en' ? config.Title_EN : config.Title_ZH,
      value: value,
      key: name,
      children
    };
  });
};

async function checkAndUpdatePackage(packageName: string): Promise<void> {
  try {
    // 获取当前安装的版本
    const __dirname = getDirName(import.meta.url);
    const packageJsonPath = path.join(__dirname, '../../../');
    const versionInfo = execSync(`npm list ${packageName}`, {
      cwd: packageJsonPath
    }).toString();
    const match = versionInfo.match(new RegExp(`(${packageName})@([0-9.]+)`));
    const currentVersion = match ? match[2] : '';
    // 获取最新版本
    const latestVersion: string = execSync(`npm view ${packageName} version`)
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

      await yesNoPromptAndExecute(
        t('is_update_to_latest_version').d(
          'Do you want to update templates to latest version?'
        ),
        async () => {
          logger.log(
            t('updating_esa_template_to_latest_version', { packageName }).d(
              `Updating ${packageName} to the latest version...`
            )
          );
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
          return true;
        }
      );
    } else {
      logger.log(
        t('esa_template_is_latest_version', { packageName }).d(
          `${packageName} is latest.`
        )
      );
    }
  } catch (error) {
    if (error instanceof Error) {
      logger.error('检测和更新包时发生错误，跳过更新模版');
    }
  }
}

export async function handleInit(argv: ArgumentsCamelCase) {
  const { config } = argv;
  // 更新template npm包
  await checkAndUpdatePackage('esa-template');

  if (config !== undefined) {
    await generateConfigFile(String(config));
    return;
  }

  const name = await descriptionInput(
    `🖊️ ${t('init_input_name').d('Enter the name of edgeRoutine:')}`,
    true
  );
  const regex = /^[a-z0-9-]{2,}$/;

  if (!regex.test(name)) {
    logger.error(
      t('init_name_error').d(
        'Error: The project name must be at least 2 characters long and can only contain lowercase letters, numbers, and hyphens.'
      )
    );
    return;
  }

  const templateInstanceList = getTemplateInstances(templateHubPath);
  const templateConfig = getTemplatesConfig();
  const cliConfig = getCliConfig();
  const lang = cliConfig?.lang ?? 'en';

  const firstSetOfItems = transferTemplatesToSelectItem(
    templateConfig,
    templateInstanceList,
    lang
  );

  let selectTemplate: Template;
  let targetPath: string;
  let projectConfig: ProjectConfig | null;

  const preInstallDependencies = async () => {
    const packageJsonPath = path.join(targetPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      logger.log('Install dependencies');
      logger.log(
        t('init_install_dependence').d('⌛️ Installing dependencies...')
      );
      execSync('npm install', { stdio: 'inherit', cwd: targetPath });
      logger.success(
        t('init_install_dependencies_success').d(
          'Dependencies installed successfully.'
        )
      );
      logger.log(t('init_build_project').d('⌛️ Building project...'));
      execSync('npm run build', { stdio: 'inherit', cwd: targetPath });
      logger.success(
        t('init_build_project_success').d('Project built successfully.')
      );
    }
  };

  const handleFirstSelection = async (item: SelectItem) => {
    if (item.key === 'exit') {
      process.exit(0);
    }

    const configPath = item.value;
    selectTemplate = new Template(configPath, name);

    projectConfig = getProjectConfig(configPath);
    if (!projectConfig) return logger.notInProject();

    const newPath = process.cwd() + '/' + name;
    targetPath = newPath;
    if (fs.existsSync(newPath)) {
      logger.error(
        t('already_exist_file_error').d(
          'Error: The project already exists. It looks like a folder named "<project-name>" is already present in the current directory. Please try the following options: 1. Choose a different project name. 2. Delete the existing folder if it\'s not needed: `rm -rf <project-name>` (use with caution!). 3. Move to a different directory before running the init command.'
        )
      );
      exit(0);
    }
    await fs.copy(configPath, newPath);

    projectConfig.name = name;
    updateProjectConfigFile(projectConfig, newPath);
    preInstallDependencies();

    logger.log(t('init_git').d('Do you want to init git in your project?'));
    SelectItems({
      items: secondSetOfItems,
      handleSelect: handleSecondSelection
    });
  };

  const handleSecondSelection = async (item: SelectItem) => {
    if (item.value === 'yesInstall') {
      installGit(targetPath);
    } else {
      logger.log(t('init_skip_git').d('Git installation was skipped.'));
    }
    const isLoginSuccess = await checkIsLoginSuccess();
    if (!isLoginSuccess) {
      logger.log(
        chalk.yellow(
          t('not_login_auto_deploy').d(
            'You are not logged in, automatic deployment cannot be performed. Please log in later and manually deploy.'
          )
        )
      );
      process.exit(0);
    }

    logger.log(t('auto_deploy').d('Do you want to deploy your project?'));
    SelectItems({
      items: secondSetOfItems,
      handleSelect: handleThirdSelection
    });
  };

  const handleThirdSelection = async (item: SelectItem) => {
    // 选择自动生成版本并发布
    if (item.value === 'yesInstall') {
      await checkRoutineExist(projectConfig?.name ?? '', targetPath);
      projectConfig && (await quickDeploy(targetPath, projectConfig));
      const service = await ApiService.getInstance();
      const res = await service.getRoutine({ Name: projectConfig?.name ?? '' });
      const defaultUrl = res?.data?.DefaultRelatedRecord;
      const visitUrl = defaultUrl ? 'http://' + defaultUrl : '';
      logger.success(
        `${t('init_deploy_success').d('Project deployment completed. Visit: ')}${chalk.yellowBright(visitUrl)}`
      );
      logger.warn(
        t('deploy_url_warn').d(
          'The domain may take some time to take effect, please try again later.'
        )
      );
    }
    selectTemplate.printSummary();
    exit(0);
  };

  try {
    MultiLevelSelect({
      items: firstSetOfItems,
      handleSelect: handleFirstSelection
    });
  } catch (error) {
    logger.error(t('init_error').d('An error occurred while initializing.'));
    console.log(error);
  }
}
