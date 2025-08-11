import path from 'path';
import { exit } from 'process';

import chalk from 'chalk';
import fs from 'fs-extra';
import inquirer from 'inquirer';
import { CommandModule, ArgumentsCamelCase, Argv } from 'yargs';

import multiLevelSelect from '../../components/mutiLevelSelect.js';
import t from '../../i18n/index.js';
import { ApiService } from '../../libs/apiService.js';
import { installGit } from '../../libs/git/index.js';
import logger from '../../libs/logger.js';
import Template from '../../libs/templates/index.js';
import { ensureRoutineExists } from '../../utils/checkIsRoutineCreated.js';
import {
  generateConfigFile,
  getCliConfig,
  getProjectConfig,
  getTemplatesConfig,
  templateHubPath,
  updateProjectConfigFile
} from '../../utils/fileUtils/index.js';
import { ProjectConfig } from '../../utils/fileUtils/interface.js';
import { quickDeploy } from '../deploy/index.js';
import { checkIsLoginSuccess } from '../utils.js';

import {
  checkAndUpdatePackage,
  getTemplateInstances,
  preInstallDependencies,
  transferTemplatesToSelectItem
} from './helper.js';

const init: CommandModule = {
  command: 'init [name]',
  describe: `📥 ${t('init_describe').d('Initialize a routine with a template')}`,
  builder: (yargs: Argv) => {
    return yargs
      .positional('name', {
        describe: t('init_project_name').d('Project name'),
        type: 'string'
      })
      .option('template', {
        alias: 't',
        describe: t('init_template_name').d('Template name to use'),
        type: 'string'
      })
      .option('config', {
        alias: 'c',
        describe: t('init_config_file').d(
          'Generate a config file for your project'
        ),
        type: 'boolean'
      })
      .option('yes', {
        alias: 'y',
        describe: t('init_yes').d('Answer "Yes" to all prompts.'),
        type: 'boolean',
        default: false
      })
      .option('skip', {
        alias: 's',
        describe: t('init_skip').d(
          'Answer "No" to any prompts for new projects.'
        ),
        type: 'boolean',
        default: false
      });
  },
  handler: async (argv: ArgumentsCamelCase) => {
    await handleInit(argv);
    exit(0);
  }
};

export default init;

export function findTemplatePathByName(templateName: string): string | null {
  const templateInstanceList = getTemplateInstances(templateHubPath);
  const templateConfig = getTemplatesConfig();

  // find template recursively
  function findTemplateRecursive(configs: any[]): string | null {
    for (const config of configs) {
      const title = config.Title_EN;
      if (title === templateName) {
        const template = templateInstanceList.find((template) => {
          return config.Title_EN === template.title;
        });
        return template?.path || null;
      }
    }
    return null;
  }

  return findTemplateRecursive(templateConfig);
}

export function validateProjectName(name: string): boolean {
  const regex = /^[a-z0-9-]{2,}$/;
  return regex.test(name);
}

export async function promptProjectName(yes = false): Promise<string> {
  if (yes) {
    // Generate a default name when --yes is used
    const defaultName = `edge-routine-${Date.now()}`;
    logger.log(
      `${t('init_input_name').d('Enter the name of edgeRoutine:')} ${defaultName}`
    );
    return defaultName;
  }

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
  items: { label: string; value: string; children?: any }[],
  yes = false
): Promise<string | null> {
  if (yes) {
    // Select the first available template when --yes is used
    const firstTemplate = items[0];
    if (firstTemplate) {
      logger.log(`Select a template: ${firstTemplate.label}`);
      return firstTemplate.value;
    } else {
      logger.error(t('init_no_templates').d('No templates available.'));
      return null;
    }
  }

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
  targetPath: string,
  yes = false
): Promise<void> {
  if (yes) {
    logger.log(
      `${t('init_git').d('Do you want to init git in your project?')} Yes`
    );
    installGit(targetPath);
    return;
  }

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
  projectConfig: ProjectConfig,
  yes = false
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

  if (yes) {
    logger.log(
      `${t('auto_deploy').d('Do you want to deploy your project?')} Yes`
    );
    await ensureRoutineExists(projectConfig?.name ?? '');
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
    await ensureRoutineExists(projectConfig?.name ?? '');
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

  // Handle project name parameter
  let name = argv.name as string;
  if (!name) {
    name = await promptProjectName(argv.yes as boolean);
  } else {
    if (!validateProjectName(name)) {
      logger.error(
        t('init_name_error').d(
          'Error: The project name must be at least 2 characters long and can only contain lowercase letters, numbers, and hyphens.'
        )
      );
      return;
    }
  }

  // Handle template name parameter
  let selectedTemplatePath: string | null = null;
  if (argv.template) {
    const templateName = argv.template as string;
    selectedTemplatePath = findTemplatePathByName(templateName);
    if (!selectedTemplatePath) {
      logger.error(
        t('init_template_not_found').d(
          `Template "${templateName}" not found. Please check the template name and try again.`
        )
      );
      return;
    }
  } else {
    const templateItems = prepareTemplateItems();

    selectedTemplatePath = await selectTemplate(
      templateItems,
      argv.yes as boolean
    );
    if (!selectedTemplatePath) {
      return;
    }
  }

  // Initialize project files a
  const project = await initializeProject(selectedTemplatePath, name);
  if (!project) {
    return;
  }
  const { template, targetPath } = project;
  if (!argv.skip) {
    await handleGitInitialization(targetPath, argv.yes as boolean);
  }

  if (!argv.skip) {
    const projectConfig = getProjectConfig(targetPath);
    if (!projectConfig) {
      return;
    }
    await handleDeployment(targetPath, projectConfig, argv.yes as boolean);
  }

  template.printSummary();
  return;
}
