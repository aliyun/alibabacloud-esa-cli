import { CommandModule, ArgumentsCamelCase, Argv } from 'yargs';
import fs from 'fs-extra';
import path from 'path';

import Template from '../../libs/templates/index.js';
import { installGit } from '../../libs/git/index.js';
import { descriptionInput } from '../../components/descriptionInput.js';
import {
  generateConfigFile,
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
    logger.info(
      t('init_install_dependence').d('⌛️ Installing dependencies...')
    );
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
  templateInstanceList: Template[]
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
      label: name,
      value: value,
      key: name,
      children
    };
  });
};

export async function handleInit(argv: ArgumentsCamelCase) {
  const { config } = argv;
  // 更新npm包
  // const __dirname = getDirName(import.meta.url);
  // const projectPath = path.join(__dirname, '../../..');
  // logger.info(t('init_update_info').d('Updating template...'));
  // execSync('npm install esa-template', { stdio: 'ignore', cwd: projectPath });
  // logger.success(t('init_update_success').d('Template update complete.'));

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

  const firstSetOfItems = transferTemplatesToSelectItem(
    templateConfig,
    templateInstanceList
  );
  let selectTemplate: Template;
  let targetPath: string;
  let projectConfig: ProjectConfig | null;

  const handleFirstSelection = async (item: SelectItem) => {
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
    preInstallDependencies(targetPath);

    logger.info(t('init_git').d('Do you want to init git in your project?'));
    SelectItems({
      items: secondSetOfItems,
      handleSelect: handleSecondSelection
    });
  };

  const handleSecondSelection = (item: SelectItem) => {
    if (item.value === 'yesInstall') {
      installGit(targetPath);
    } else {
      logger.info(t('init_skip_git').d('Git installation was skipped.'));
    }
    logger.info(t('auto_deploy').d('Do you want to deploy your project?'));
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
