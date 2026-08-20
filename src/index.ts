import chalk from 'chalk';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import commit from './commands/commit/index.js';
import config from './commands/config.js';
import deploy from './commands/deploy/index.js';
import deployments from './commands/deployments/index.js';
import dev from './commands/dev/index.js';
import domainCommand from './commands/domain/index.js';
import init from './commands/init/index.js';
import lang from './commands/lang.js';
import login from './commands/login/index.js';
import logout from './commands/logout.js';
import routeCommand from './commands/route/index.js';
import routine from './commands/routine/index.js';
import site from './commands/site/index.js';
import t from './i18n/index.js';
import logger from './libs/logger.js';
import { handleCheckVersion, checkCLIVersion } from './utils/checkVersion.js';
import { getCliConfig } from './utils/fileUtils/index.js';

const cliName = process.env.ALIBABA_CLOUD_ESA_CLI_COMPAT_MODE || 'esa-cli';

const main = async () => {
  const argv = hideBin(process.argv);
  const outputIndex = argv.findIndex(
    (arg) => arg === '--output' || arg.startsWith('--output=')
  );
  const isJsonOutput =
    outputIndex >= 0 &&
    (argv[outputIndex] === '--output=json' || argv[outputIndex + 1] === 'json');
  if (isJsonOutput) {
    logger.setOutputStream('stderr');
  }
  const cliConfig = getCliConfig();
  const esa = yargs(argv)
    .strict()
    .fail((msg, err) => {
      throw err || new Error(msg || 'Command failed');
    })
    .scriptName(cliName)
    .locale(cliConfig?.lang || 'en')
    .version(false)
    .wrap(null)
    .help()
    .middleware(async (argv) => {
      if (argv.output === 'json') {
        logger.setOutputStream('stderr');
      }
      if (argv.debug) {
        logger.setLogLevel('debug');
      }
      if (argv.skipUpdateCheck) {
        return;
      }
      try {
        // Pass current command (first positional) so version check can decide prompting behavior
        await checkCLIVersion(
          (argv._ && argv._[0] ? String(argv._[0]) : '') as string
        );
      } catch (e) {
        console.error(e);
      }
    })
    .epilogue(
      `${t('main_epilogue').d('For more information, visit ESA')}: ${chalk.underline.blue('https://www.aliyun.com/product/esa')}`
    )
    .options('version', {
      describe: t('main_version_describe').d('Show version'),
      alias: 'v'
    })
    .options('help', {
      describe: t('main_help_describe').d('Show help'),
      alias: 'h'
    })
    .options('debug', {
      describe: t('dev_option_debugger').d('Output debug logs'),
      type: 'boolean',
      default: false
    })
    .options('skip-update-check', {
      describe: t('main_skip_update_check').d('Skip CLI version update check'),
      type: 'boolean',
      default: false
    });

  esa.command(
    '*',
    false,
    () => {},
    async (args) => {
      if (args._.length > 0) {
        // Unknown command
        console.error(
          t('common_sub_command_fail').d(
            `Use ${cliName} <command> -h to see help`
          )
        );
        process.exitCode = 1;
      } else {
        if (args.v) {
          await handleCheckVersion();
        } else if (args.h || args.help) {
          esa.showHelp('log');
        } else {
          esa.showHelp('log');
        }
      }
    }
  );

  esa.command(init);

  esa.command(dev);

  esa.command(commit);

  esa.command(deploy);

  esa.command(deployments);

  esa.command(routine);

  esa.command(site);

  esa.command(domainCommand);

  esa.command(routeCommand);

  esa.command(login);

  esa.command(logout);

  esa.command(config);

  esa.command(lang);

  esa.group(['help', 'version'], 'Options:');

  await esa.parseAsync();
};

main().catch((error: unknown) => {
  logger.stopSpinner();
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
