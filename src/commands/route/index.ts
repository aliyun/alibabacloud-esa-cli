import { CommandModule, Argv } from 'yargs';

import t from '../../i18n/index.js';

import addRoute from './add.js';
import deleteRoute from './delete.js';
import listRoute from './list.js';

let yargsIns: Argv;
const routeCommand: CommandModule<{}> = {
  command: 'route [script]',
  describe: `🚄 ${t('route_describe').d('Manage the routes bound to your project')}`,
  builder: (yargs) => {
    yargsIns = yargs;
    return yargs
      .command(addRoute)
      .command(deleteRoute)
      .command(listRoute)
      .option('help', {
        alias: 'h',
        describe: t('common_help').d('Help'),
        type: 'boolean',
        default: false
      })
      .usage(
        `${t('common_usage').d('Usage')}: esa-cli route <add | list | delete>`
      );
  },
  handler: (argv) => {
    if (yargsIns && (argv.help || argv._.length < 2)) {
      yargsIns.showHelp('log');
    }
  }
};

export default routeCommand;
