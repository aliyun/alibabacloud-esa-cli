import { exit } from 'process';

import { CommandModule, ArgumentsCamelCase, Argv } from 'yargs';

import t from '../../i18n/index.js';
import { getDirName, getRoot } from '../../utils/fileUtils/base.js';
import {
  validateAndInitializeProject,
  commitAndDeployVersion,
  displayDeploySuccess
} from '../common/utils.js';

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
  const projectInfo = await validateAndInitializeProject(argv?.name as string);
  if (!projectInfo) return;
  const { projectConfig, projectName } = projectInfo;
  const entry = (argv.entry as string) || projectConfig.entry;
  const assets = (argv.assets as string) || projectConfig.assets?.directory;

  const success = await commitAndDeployVersion(
    projectConfig,
    entry,
    assets,
    (argv.description as string) || '',
    getRoot(),
    argv.environment as 'staging' | 'production',
    argv.minify as boolean,
    argv.version as string
  );
  if (success) {
    await displayDeploySuccess(projectName, true, false);
  }
}

export default deploy;
