import { CommandModule, ArgumentsCamelCase, Argv } from 'yargs';
import { getCliConfig, updateCliConfigFile } from '../utils/fileUtils/index.js';
import { checkIsLoginSuccess } from './utils.js';
import logger from '../libs/logger.js';
import t from '../i18n/index.js';

const logout: CommandModule = {
  command: 'logout',
  describe: `🚪 ${t('logout_describe').d('Logout')}`,
  builder: (yargs: Argv) => {
    return yargs;
  },
  handler: (argv: ArgumentsCamelCase) => {
    handleLogout(argv);
  }
};

export default logout;

export async function handleLogout(argv: ArgumentsCamelCase) {
  let cliConfig = getCliConfig();
  if (!cliConfig) {
    return;
  }

  if (!cliConfig.auth) {
    cliConfig.auth = { accessKeyId: '', accessKeySecret: '' };
  } else {
    cliConfig.auth.accessKeyId = '';
    cliConfig.auth.accessKeySecret = '';
  }

  await updateCliConfigFile(cliConfig);

  logger.success(t('logout_success').d('Logout successfully'));
}
