import { CommandModule, Argv } from 'yargs';

import t from '../i18n/index.js';
import logger from '../libs/logger.js';
import { getCliConfig, updateCliConfigFile } from '../utils/fileUtils/index.js';

const logout: CommandModule = {
  command: 'logout',
  describe: `🚪 ${t('logout_describe').d('Logout')}`,
  builder: (yargs: Argv) => {
    return yargs;
  },
  handler: () => {
    handleLogout();
  }
};

export default logout;

export async function handleLogout() {
  let cliConfig = getCliConfig();
  if (!cliConfig) {
    return;
  }

  if (!cliConfig.auth) {
    cliConfig.auth = {
      accessKeyId: '',
      accessKeySecret: '',
      securityToken: ''
    };
  } else {
    cliConfig.auth.accessKeyId = '';
    cliConfig.auth.accessKeySecret = '';
    if ('securityToken' in cliConfig.auth) {
      cliConfig.auth.securityToken = '';
    }
  }

  await updateCliConfigFile(cliConfig);

  logger.success(t('logout_success').d('Logout successfully'));
}
