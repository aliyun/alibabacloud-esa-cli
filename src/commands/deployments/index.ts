import { CommandModule, Argv } from 'yargs';

import t from '../../i18n/index.js';

import deploymentsDelete from './delete.js';
import deploymentsList from './list.js';

let yargsIns: Argv;
const deploymentsCommand: CommandModule<{}> = {
  command: 'deployments [script]',
  describe: `📜 ${t('deployments_describe').d('Manage your deployments')}`,
  builder: (yargs) => {
    yargsIns = yargs;
    return yargs
      .command(deploymentsList)
      .command(deploymentsDelete)
      .option('help', {
        alias: 'h',
        describe: t('common_help').d('Help'),
        type: 'boolean',
        default: false
      })
      .usage(
        `${t('common_usage').d('Usage')}: esa deployments [list | delete]`
      );
  },
  handler: (argv) => {
    if (yargsIns && (argv.help || argv._.length < 2)) {
      yargsIns.showHelp('log');
    }
  }
};

export default deploymentsCommand;
