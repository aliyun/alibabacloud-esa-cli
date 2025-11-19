import { exit } from 'process';

import { intro, outro } from '@clack/prompts';
import { CommandModule, ArgumentsCamelCase, Argv } from 'yargs';

import t from '../../i18n/index.js';
import { getRoot } from '../../utils/fileUtils/base.js';
import { getProjectConfig } from '../../utils/fileUtils/index.js';
import {
  commitAndDeployVersion,
  displayDeploySuccess,
  deployWithVersionPercentages
} from '../common/utils.js';

const deploy: CommandModule = {
  command: 'deploy [entry]',
  builder: (yargs: Argv) => {
    return yargs
      .positional('entry', {
        describe: t('dev_entry_describe').d('Entry file of Functions& Pages'),
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
        describe: t('deploy_option_name').d('Name of Functions& Pages'),
        type: 'string'
      })
      .option('assets', {
        alias: 'a',
        describe: t('deploy_option_assets').d('Deploy assets'),
        type: 'string'
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
      .option('bundle', {
        describe: 'Bundle with esbuild (use --no-bundle to skip)',
        type: 'boolean',
        default: true
      })
      .option('versions', {
        describe:
          'Deploy two versions with percentages, format: v1:80,v2:20 or repeat --versions v1:80 --versions v2:20',
        type: 'array'
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
  const assets = (argv.assets as string) ?? undefined;
  const versionsArg = (argv.versions as unknown as string[] | undefined) || [];

  intro(`Deploy an application with ESA`);

  if (versionsArg.length > 0) {
    const env = (argv.environment as 'staging' | 'production' | 'all') || 'all';
    const ok = await deployWithVersionPercentages(
      (argv.name as string) || undefined,
      versionsArg,
      env,
      getRoot()
    );
    outro(ok ? 'Deploy finished' : 'Deploy failed');
    exit(ok ? 0 : 1);
  }

  const success = await commitAndDeployVersion(
    (argv.name as string) || undefined,
    entry,
    assets,
    (argv.description as string) || '',
    getRoot(),
    (argv.environment as 'staging' | 'production') || 'all',
    argv.minify as boolean,
    argv.version as string,
    (argv.bundle === false) as boolean
  );
  outro(success ? 'Deploy finished' : 'Deploy failed');

  if (success) {
    const projectConfig = getProjectConfig(getRoot());
    await displayDeploySuccess(
      (argv.name as string) ||
        projectConfig?.name ||
        (getRoot().split(/[\\/]/).pop() as string) ||
        '',
      true,
      true
    );
  }
  exit(success ? 0 : 1);
}

export default deploy;
