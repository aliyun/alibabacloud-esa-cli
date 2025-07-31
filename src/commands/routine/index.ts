import { CommandModule, Argv } from 'yargs';

import t from '../../i18n/index.js';

import routineDelete from './delete.js';
import routineList from './list.js';

let yargsIns: Argv;
const routineCommand: CommandModule<{}> = {
  command: 'routine [script]',
  describe: `🚀 ${t('routine_describe').d('Manage your routine')}`,
  builder: (yargs) => {
    yargsIns = yargs;
    return yargs
      .command(routineList)
      .command(routineDelete)
      .option('help', {
        alias: 'h',
        describe: t('common_help').d('Help'),
        type: 'boolean',
        default: false
      })
      .usage(`${t('common_usage').d('Usage')}: esa routine [list | delete]`);
  },
  handler: (argv) => {
    if (yargsIns && (argv.help || argv._.length < 2)) {
      yargsIns.showHelp('log');
    }
  }
};

export default routineCommand;
