import { CommandModule, Argv } from 'yargs';

import t from '../i18n/index.js';
import logger from '../libs/logger.js';
import { resolveEnvironmentCredentials } from '../utils/credentials.js';
import { getCliConfig, updateCliConfigFile } from '../utils/fileUtils/index.js';

const logout: CommandModule = {
  command: 'logout',
  describe: `🚪 ${t('logout_describe').d('Logout')}`,
  builder: (yargs: Argv) => {
    return yargs;
  },
  handler: async () => {
    await handleLogout();
  }
};

export default logout;

function warnIfEnvironmentCredentialsRemain(): void {
  if (resolveEnvironmentCredentials().status === 'none') return;

  logger.warn(
    t('logout_environment_credentials_active').d(
      'Environment credentials are still configured. Subsequent commands may remain authenticated; unset ESA_* and ALIBABA_CLOUD_* to fully log out.'
    )
  );
}

export async function handleLogout() {
  let cliConfig = getCliConfig();
  if (!cliConfig) {
    warnIfEnvironmentCredentialsRemain();
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
  warnIfEnvironmentCredentialsRemain();
}
