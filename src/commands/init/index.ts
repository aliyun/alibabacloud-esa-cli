import { exit } from 'process';

import { intro, outro } from '@clack/prompts';
import chalk from 'chalk';
import { CommandModule, ArgumentsCamelCase, Argv } from 'yargs';

import t from '../../i18n/index.js';
import { promptParameter } from '../../utils/prompt.js';
import { displayDeploySuccess } from '../common/utils.js';

import {
  applyFileEdits,
  buildProject,
  checkAndUpdatePackage,
  configCategory,
  configLanguage,
  configProjectName,
  configTemplate,
  createProject,
  deployProject,
  getInitParamsFromArgv,
  initGit,
  installDependencies,
  installESACli,
  updateConfigFile
} from './helper.js';
import { initParams } from './types.js';

const init: CommandModule = {
  command: 'init [name]',
  describe: `📥 ${t('init_describe').d('Initialize a project with a template')}`,
  builder: (yargs: Argv) => {
    return yargs
      .positional('name', {
        describe: t('init_project_name').d('Project name'),
        type: 'string'
      })
      .option('framework', {
        alias: 'f',
        describe: 'Choose a frontend framework (react/vue/nextjs...)',
        type: 'string'
      })
      .option('language', {
        alias: 'l',
        describe: 'Choose programming language (typescript/javascript)',
        type: 'string',
        choices: ['typescript', 'javascript'] as const
      })
      .option('template', {
        alias: 't',
        describe: t('init_template_name').d('Template name to use'),
        type: 'string'
      })
      .option('yes', {
        alias: 'y',
        describe: t('init_yes').d('Answer "Yes" to all prompts.'),
        type: 'boolean',
        default: false
      })
      .option('git', {
        alias: 'g',
        describe: 'Initialize git repository',
        type: 'boolean'
      })
      .option('deploy', {
        alias: 'd',
        describe: 'Deploy after initialization',
        type: 'boolean'
      });
  },
  handler: async (argv: ArgumentsCamelCase) => {
    await handleInit(argv);
    exit(0);
  }
};

export default init;

const handleInit = async (argv: ArgumentsCamelCase) => {
  await checkAndUpdatePackage('esa-template');
  const initParams = getInitParamsFromArgv(argv);
  await create(initParams);
  await config(initParams);
  await deploy(initParams);
};

const create = async (initParams: initParams) => {
  intro(`Create an application with ESA ${chalk.gray('Step 1 of 3')}`);
  await configProjectName(initParams);
  await configCategory(initParams);
  await configTemplate(initParams);
  if (initParams.category === 'framework') {
    await configLanguage(initParams);
  }
  await createProject(initParams);
  await installDependencies(initParams);
  outro(`Application created`);
};

const config = async (initParams: initParams) => {
  intro(`Configure an application with ESA ${chalk.gray('Step 2 of 3')}`);

  await applyFileEdits(initParams);
  await installESACli(initParams);
  await updateConfigFile(initParams);
  await initGit(initParams);
  outro(`Project configured`);
};

const deploy = async (initParams: initParams) => {
  intro(`Deploy an application with ESA ${chalk.gray('Step 3 of 3')}`);
  if (!initParams.deploy) {
    const deploy = (await promptParameter<boolean>({
      type: 'confirm',
      question: t('auto_deploy').d('Do you want to deploy your project?'),
      label: 'Auto deploy',
      defaultValue: false
    })) as boolean;
    initParams.deploy = deploy;
  }

  if (!initParams.deploy) {
    outro(`Deploy project skipped`);
    return;
  }

  await buildProject(initParams);
  await deployProject(initParams);
  outro(`Deploy project finished`);
  await displayDeploySuccess(initParams.name, true, true);
};
