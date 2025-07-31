import fs from 'fs';

import spawn from 'cross-spawn';
import { CommandModule, ArgumentsCamelCase, Argv } from 'yargs';

import t from '../i18n/index.js';
import logger from '../libs/logger.js';
import { projectConfigPath, cliConfigPath } from '../utils/fileUtils/index.js';

const editConfigFile = (configPath: string) => {
  const editor = process.env.EDITOR || 'vi';
  spawn(editor, [configPath], {
    stdio: 'inherit'
  });
};

const check: CommandModule = {
  command: 'config',
  describe: `📝 ${t('config_describe').d('Modify your local or global configuration using -l, -g')}`,
  builder: (yargs: Argv) => {
    return yargs
      .option('local', {
        alias: 'l',
        describe: t('config_local_describe').d('Edit local config file'),
        type: 'boolean',
        default: false
      })
      .option('global', {
        alias: 'g',
        describe: t('config_global_describe').d('Edit global config file'),
        type: 'boolean',
        default: false
      })
      .usage(`${t('common_usage').d('Usage')}: esa config [-l | -g]`)
      .check((argv: ArgumentsCamelCase) => {
        if (!argv.local && !argv.global) {
          yargs.showHelp();
        }
        return true;
      });
  },
  handler: (argv: ArgumentsCamelCase) => {
    if (argv.local) {
      if (fs.existsSync(projectConfigPath)) {
        editConfigFile(projectConfigPath);
      } else {
        logger.error(
          t('config_local_not_exist').d('Local config file does not exist')
        );
      }
    } else if (argv.global) {
      editConfigFile(cliConfigPath);
    }
  }
};

export default check;
