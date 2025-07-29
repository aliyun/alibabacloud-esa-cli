import { CommandModule, Argv } from 'yargs';
import addDomain from './add.js';
import listDomain from './list.js';
import deleteDomain from './delete.js';
import t from '../../i18n/index.js';

let yargsIns: Argv;
const domainCommand: CommandModule<{}> = {
  command: 'domain [script]',
  describe: `🔗 ${t('domain_describe').d('Manage the domain names bound to your routine')}`,
  builder: (yargs) => {
    yargsIns = yargs;
    return yargs
      .command(addDomain)
      .command(listDomain)
      .command(deleteDomain)
      .option('help', {
        alias: 'h',
        describe: t('common_help').d('Help'),
        type: 'boolean',
        default: false
      })
      .usage(
        `${t('common_usage').d('Usage')}: esa domain <add | list | delete>`
      );
  },
  handler: (argv) => {
    if (yargsIns && (argv.help || argv._.length < 2)) {
      yargsIns.showHelp('log');
    }
  }
};

export default domainCommand;
