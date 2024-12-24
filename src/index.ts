import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import chalk from 'chalk';

import login from './commands/login/index.js';
import config from './commands/config.js';
import dev from './commands/dev/index.js';
import init from './commands/init/index.js';
import routine from './commands/routine/index.js';
import deploy from './commands/deploy/index.js';
import commit from './commands/commit/index.js';
import deployments from './commands/deployments/index.js';
import domainCommand from './commands/domain/index.js';
import routeCommand from './commands/route/index.js';
import logout from './commands/logout.js';
import lang from './commands/lang.js';

import { getCliConfig } from './utils/fileUtils/index.js';
import { handleCheckVersion } from './utils/checkVersion.js';
import t from './i18n/index.js';
import site from './commands/site/index.js';
import { quickDeployRoutine } from './libs/service.js';

const main = async () => {
  const argv = hideBin(process.argv);
  const cliConfig = getCliConfig();
  const esa = yargs(argv)
    .strict()
    .fail((msg, err) => {
      console.error(msg, err);
    })
    .scriptName('esa')
    .locale(cliConfig?.lang || 'en')
    .version(false)
    .wrap(null)
    .help(false)
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
    });

  esa.command(
    '*',
    false,
    () => {},
    (args) => {
      if (args._.length > 0) {
      } else {
        if (args.v) {
          handleCheckVersion();
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

  esa.command(
    't',
    false,
    () => {},
    async (args) => {
      const res = await quickDeployRoutine({
        name: 'test',
        code: 'test'
      });
      // console.log(res);
    }
  );

  esa.group(['help', 'version'], 'Options:');

  esa.parse();
};

main();
