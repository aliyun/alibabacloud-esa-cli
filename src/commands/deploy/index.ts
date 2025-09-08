import { exit } from 'process';

import { CommandModule, ArgumentsCamelCase, Argv } from 'yargs';

import t from '../../i18n/index.js';
import { getDirName, getRoot } from '../../utils/fileUtils/base.js';
import {
  commitAndDeployVersion,
  displayDeploySuccess
} from '../common/utils.js';
import { groupMultiselect, intro, outro, taskLog } from '@clack/prompts';
import chalk from 'chalk';
import logger from '../../libs/logger.js';
import { getProjectConfig } from '../../utils/fileUtils/index.js';

const deploy: CommandModule = {
  command: 'deploy [entry]',
  builder: (yargs: Argv) => {
    return yargs
      .positional('entry', {
        describe: t('dev_entry_describe').d('Entry file of the Routine'),
        type: 'string',
        demandOption: false
      })
      .option('version', {
        alias: 'v',
        describe: t('deploy_option_version').d(
          'Version to deploy (skip interactive selection)'
        ),
        type: 'string'
      })
      .option('environment', {
        alias: 'e',
        describe: t('deploy_option_environment').d(
          'Environment to deploy to: staging or production (skip interactive selection)'
        ),
        type: 'string',
        choices: ['staging', 'production']
      })
      .option('name', {
        alias: 'n',
        describe: t('deploy_option_name').d('Name of the routine'),
        type: 'string'
      })
      .option('assets', {
        alias: 'a',
        describe: t('deploy_option_assets').d('Deploy assets'),
        type: 'boolean'
      })
      .option('description', {
        alias: 'd',
        describe: t('deploy_option_description').d(
          'Description of the version'
        ),
        type: 'string'
      })
      .option('minify', {
        alias: 'm',
        describe: t('deploy_option_minify').d('Minify the code'),
        type: 'boolean'
      })
      .option('minify', {
        alias: 'm',
        describe: t('deploy_option_minify').d('Minify the code'),
        type: 'boolean'
      });
  },
  describe: `🚀 ${t('deploy_describe').d('Deploy your project')}`,
  handler: async (argv: ArgumentsCamelCase) => {
    await handleDeploy(argv);
    exit();
  }
};

export async function handleDeploy(argv: ArgumentsCamelCase) {
  const entry = argv.entry as string;
  const assets = argv.assets as string;

  intro(`Deploy an application with ESA`);

  const success = await commitAndDeployVersion(
    (argv.name as string) || undefined,
    entry,
    assets,
    (argv.description as string) || '',
    getRoot(),
    (argv.environment as 'staging' | 'production') || 'all',
    argv.minify as boolean,
    argv.version as string
  );
  outro(success ? 'Deploy finished' : 'Deploy failed');

  if (success) {
    const projectConfig = getProjectConfig(getRoot());
    await displayDeploySuccess(
      (argv.name as string) || projectConfig?.name || '',
      true,
      true
    );
  }
}

export default deploy;
