import { CommandModule, ArgumentsCamelCase, Argv } from 'yargs';

import t from '../../i18n/index.js';
import logger from '../../libs/logger.js';
import { validRoutine } from '../../utils/checkIsRoutineCreated.js';
import { getProjectConfig } from '../../utils/fileUtils/index.js';
import {
  bindRoutineWithDomain,
  checkDirectory,
  checkIsLoginSuccess,
  validDomain,
  validName
} from '../utils.js';

const addDomain: CommandModule = {
  command: 'add <domain>',
  describe: `🔗 ${t('domain_add_describe').d('Bind a domain to a routine')}`,
  builder: (yargs: Argv) => {
    return yargs
      .positional('domain', {
        describe: t('domain_add_positional_describe').d(
          'The name of domain to add'
        ),
        type: 'string',
        demandOption: true
      })
      .usage(`${t('common_usage').d('Usage')}: esa domain add <domain>`)
      .option('help', {
        alias: 'h',
        describe: t('common_help').d('Help'),
        type: 'boolean',
        default: false
      })
      .help()
      .fail((msg, err, yargsIns) => {
        console.log(msg, err);
        if (err) throw err;
        if (msg) {
          yargsIns.showHelp('log');
        }
        process.exit(1);
      });
  },
  handler: async (argv: ArgumentsCamelCase) => {
    handleAddDomain(argv);
  }
};

export default addDomain;

export async function handleAddDomain(argv: ArgumentsCamelCase) {
  if (!checkDirectory()) {
    return;
  }

  const isSuccess = await checkIsLoginSuccess();
  if (!isSuccess) return;

  const projectConfig = getProjectConfig();
  if (!projectConfig) return logger.notInProject();

  await validRoutine(projectConfig.name);

  const name = projectConfig.name;
  const domain = argv.domain as string;

  if (!validName(name)) {
    logger.error(t('domain_add_invalid_name').d('Invalid name'));
    return;
  }
  if (!domain || !validDomain(domain)) {
    logger.error(t('domain_add_invalid_name').d('Invalid name'));
    return;
  }
  await bindRoutineWithDomain(name, domain);
}
