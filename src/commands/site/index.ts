import { CommandModule, Argv } from 'yargs';

import t from '../../i18n/index.js';

import siteList from './list.js';

let yargsIns: Argv;
const siteCommand: CommandModule<{}> = {
  command: 'site [script]',
  describe: `📈 ${t('site_describe').d('Manage your sites')}`,
  builder: (yargs) => {
    yargsIns = yargs;
    return yargs
      .command(siteList)
      .option('help', {
        alias: 'h',
        describe: t('common_help').d('Help'),
        type: 'boolean',
        default: false
      })
      .usage(`${t('common_usage').d('Usage')}: esa-cli site [list]`);
  },
  handler: (argv) => {
    if (yargsIns && (argv.help || argv._.length < 2)) {
      yargsIns.showHelp('log');
    }
  }
};

export default siteCommand;
