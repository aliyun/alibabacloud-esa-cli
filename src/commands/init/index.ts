import { CommandModule, ArgumentsCamelCase, Argv } from 'yargs';
import fs from 'fs-extra';
import path from 'path';
import inquirer from 'inquirer';
import { exit } from 'process';

import Template from '../../libs/templates/index.js';
import { installGit } from '../../libs/git/index.js';
import multiLevelSelect from '../../components/mutiLevelSelect.js';
import {
  generateConfigFile,
  getCliConfig,
  getProjectConfig,
  getTemplatesConfig,
  templateHubPath,
  updateProjectConfigFile
} from '../../utils/fileUtils/index.js';
import t from '../../i18n/index.js';
import logger from '../../libs/logger.js';
import { quickDeploy } from '../deploy/index.js';
import { ApiService } from '../../libs/apiService.js';
import { checkRoutineExist } from '../../utils/checkIsRoutineCreated.js';
import { checkIsLoginSuccess } from '../utils.js';
import chalk from 'chalk';

import {
  checkAndUpdatePackage,
  getTemplateInstances,
  preInstallDependencies,
  transferTemplatesToSelectItem
} from './helper.js';

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
    exit(0);
  }
};

export default init;

export async function promptProjectName(): Promise<string> {
  const { name } = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: `${t('init_input_name').d('Enter the name of edgeRoutine:')}`,
      validate: (input) => {
        const regex = /^[a-z0-9-]{2,}$/;
        if (!regex.test(input)) {
          return t('init_name_error').d(
            'Error: The project name must be at least 2 characters long and can only contain lowercase letters, numbers, and hyphens.'
          );
        }
        return true;
      }
    }
  ]);
  return name;
}

export function prepareTemplateItems(): {
  label: string;
  value: string;
  children?: any;
}[] {
  const templateInstanceList = getTemplateInstances(templateHubPath);
  const templateConfig = getTemplatesConfig();
  const cliConfig = getCliConfig();
  const lang = cliConfig?.lang ?? 'en';
  return transferTemplatesToSelectItem(
    templateConfig,
    templateInstanceList,
    lang
  );
}

export async function selectTemplate(
  items: { label: string; value: string; children?: any }[]
): Promise<string | null> {
  const selectedTemplatePath = await multiLevelSelect(
    items,
    'Select a template:'
  );
  if (!selectedTemplatePath) {
    logger.log(t('init_cancel').d('User canceled the operation.'));
    return null;
  }
  return selectedTemplatePath;
}

export async function initializeProject(
  selectedTemplatePath: string,
  name: string
): Promise<{ template: Template; targetPath: string } | null> {
  const selectTemplate = new Template(selectedTemplatePath, name);
  const projectConfig = getProjectConfig(selectedTemplatePath);
  if (!projectConfig) {
    logger.notInProject();
    return null;
  }

  const targetPath = path.join(process.cwd(), name);
  if (fs.existsSync(targetPath)) {
    logger.error(
      t('already_exist_file_error').d(
        'Error: The project already exists. It looks like a folder named "<project-name>" is already present in the current directory. Please try the following options: 1. Choose a different project name. 2. Delete the existing folder if it\'s not needed: `rm -rf <project-name>` (use with caution!). 3. Move to a different directory before running the init command.'
      )
    );
    return null;
  }

  await fs.copy(selectedTemplatePath, targetPath);
  projectConfig.name = name;
  await updateProjectConfigFile(projectConfig, targetPath);
  await preInstallDependencies(targetPath);

  return { template: selectTemplate, targetPath };
}

export async function handleGitInitialization(
  targetPath: string
): Promise<void> {
  const { initGit } = await inquirer.prompt([
    {
      type: 'list',
      name: 'initGit',
      message: t('init_git').d('Do you want to init git in your project?'),
      choices: ['Yes', 'No']
    }
  ]);

  if (initGit === 'Yes') {
    installGit(targetPath);
  } else {
    logger.log(t('init_skip_git').d('Git installation was skipped.'));
  }
}

export async function handleDeployment(
  targetPath: string,
  projectConfig: any
): Promise<void> {
  const isLoginSuccess = await checkIsLoginSuccess();
  if (!isLoginSuccess) {
    logger.log(
      chalk.yellow(
        t('not_login_auto_deploy').d(
          'You are not logged in, automatic deployment cannot be performed. Please log in later and manually deploy.'
        )
      )
    );
    return;
  }

  const { deploy } = await inquirer.prompt([
    {
      type: 'list',
      name: 'deploy',
      message: t('auto_deploy').d('Do you want to deploy your project?'),
      choices: ['Yes', 'No']
    }
  ]);
  if (deploy === 'Yes') {
    await checkRoutineExist(projectConfig?.name ?? '', targetPath);
    await quickDeploy(targetPath, projectConfig);
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
}

export async function handleInit(argv: ArgumentsCamelCase) {
  // Update the template package (currently commented out)
  await checkAndUpdatePackage('esa-template');

  // If config option is provided, generate config file and exit
  const config = getCliConfig();
  if (config === undefined) {
    await generateConfigFile(String(config));
  }

  const name = await promptProjectName();

  const templateItems = prepareTemplateItems();

  // Select a template
  const selectedTemplatePath = await selectTemplate(templateItems);
  if (!selectedTemplatePath) {
    return;
  }

  // Initialize project files and configuration
  const project = await initializeProject(selectedTemplatePath, name);
  if (!project) {
    return;
  }
  const { template, targetPath } = project;

  // Handle Git initialization
  await handleGitInitialization(targetPath);

  // Handle deployment
  const projectConfig = getProjectConfig(targetPath);
  await handleDeployment(targetPath, projectConfig);

  template.printSummary();
  return;
}
