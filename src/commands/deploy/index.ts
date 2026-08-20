import { intro, outro } from '@clack/prompts';
import { CommandModule, ArgumentsCamelCase, Argv } from 'yargs';

import t from '../../i18n/index.js';
import logger from '../../libs/logger.js';
import { getRoot } from '../../utils/fileUtils/base.js';
import {
  commitAndDeployVersion,
  displayDeploySuccess,
  deployWithVersionPercentages,
  getDeployPreviewUrl
} from '../common/utils.js';

import type { DeployExecutionResult, DeployJsonOutput } from './types.js';

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
        type: 'array',
        nargs: 1
      })
      .option('output', {
        describe: 'Output format: text or json',
        type: 'string',
        choices: ['text', 'json'],
        default: 'text'
      });
  },
  describe: `🚀 ${t('deploy_describe').d('Deploy your project')}`,
  handler: async (argv: ArgumentsCamelCase) => {
    const result = await handleDeploy(argv);
    if (!result.success) process.exitCode = 1;
  }
};

export async function handleDeploy(
  argv: ArgumentsCamelCase
): Promise<DeployExecutionResult> {
  const entry = argv.entry as string;
  const assets = (argv.assets as string) ?? undefined;
  const hasVersionsOption = argv.versions !== undefined;
  const versionsArg = (argv.versions as unknown as string[] | undefined) || [];
  const output = argv.output === 'json' ? 'json' : 'text';
  const previousOutputStream = logger.getOutputStream();
  logger.setOutputStream(output === 'json' ? 'stderr' : 'stdout');

  try {
    if (output === 'text') intro(`Deploy an application with ESA`);

    let result: DeployExecutionResult;
    if (hasVersionsOption) {
      const env =
        (argv.environment as 'staging' | 'production' | 'all') || 'all';
      result = await deployWithVersionPercentages(
        (argv.name as string) || undefined,
        versionsArg,
        env,
        getRoot()
      );
    } else {
      result = await commitAndDeployVersion(
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
    }

    if (output === 'json') {
      const structuredOutput: DeployJsonOutput = {
        schemaVersion: 1,
        app: result.app,
        url:
          result.success || result.deployments.length > 0
            ? await getDeployPreviewUrl(result.app)
            : null,
        deployments: result.deployments
      };
      process.stdout.write(`${JSON.stringify(structuredOutput)}\n`);
      return result;
    }

    if (!result.success) {
      outro('Deploy failed');
      return result;
    }

    outro('Deploy finished');
    await displayDeploySuccess(result.app, true, true);
    if (hasVersionsOption) {
      const rollout = result.deployments[0]?.codeVersions || [];
      logger.block();
      logger.log('📦 Versions rollout:');
      rollout.forEach(({ codeVersion, percentage }) => {
        logger.log(`- ${codeVersion}: ${percentage}%`);
      });
      logger.block();
    }
    return result;
  } finally {
    logger.setOutputStream(previousOutputStream);
  }
}

export default deploy;
