import chalk from 'chalk';
import inquirer from 'inquirer';
import { CommandModule, ArgumentsCamelCase } from 'yargs';

import t from '../../i18n/index.js';
import { ApiService } from '../../libs/apiService.js';
import logger from '../../libs/logger.js';
import {
  getApiConfig,
  getCliConfig,
  updateCliConfigFile,
  generateDefaultConfig
} from '../../utils/fileUtils/index.js';

const login: CommandModule = {
  command: 'login',
  describe: `🔑 ${t('login_describe').d('Login to the server')}`,
  builder: (yargs) => {
    return yargs
      .option('access-key-id', {
        alias: 'ak',
        describe: t('login_option_access_key_id')?.d('AccessKey ID'),
        type: 'string'
      })
      .option('access-key-secret', {
        alias: 'sk',
        describe: t('login_option_access_key_secret')?.d('AccessKey Secret'),
        type: 'string'
      });
  },
  handler: async (argv: ArgumentsCamelCase) => {
    handleLogin(argv);
  }
};

export default login;

export async function handleLogin(argv?: ArgumentsCamelCase): Promise<void> {
  generateDefaultConfig();

  const accessKeyId = argv?.['access-key-id'];
  const accessKeySecret = argv?.['access-key-secret'];
  if (accessKeyId && accessKeySecret) {
    await handleLoginWithAKSK(accessKeyId as string, accessKeySecret as string);
    return;
  }

  if (process.env.ESA_ACCESS_KEY_ID && process.env.ESA_ACCESS_KEY_SECRET) {
    logger.log(
      `🔑 ${t('login_get_from_env').d(`Get AccessKey ID and AccessKey Secret from environment variables.`)}`
    );

    await handleLoginWithAKSK(
      process.env.ESA_ACCESS_KEY_ID,
      process.env.ESA_ACCESS_KEY_SECRET
    );
    return;
  }

  const cliConfig = getCliConfig();
  if (!cliConfig) return;
  if (
    cliConfig &&
    cliConfig.auth &&
    cliConfig.auth.accessKeyId &&
    cliConfig.auth.accessKeySecret
  ) {
    const service = await ApiService.getInstance();
    const loginStatus = await service.checkLogin();
    if (loginStatus.success) {
      logger.warn(t('login_already').d('You are already logged in.'));
      const action = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: t('login_existing_credentials_message').d(
            'Existing credentials found. What do you want to do?'
          ),
          choices: [
            t('login_existing_credentials_action_overwrite').d(
              'Overwrite existing credentials'
            ),
            t('common_exit').d('Exit')
          ]
        }
      ]);
      if (action.action === t('common_exit').d('Exit')) {
        return;
      }
      await getUserInputAuthInfo();
    } else {
      logger.error(
        t('pre_login_failed').d(
          'The previously entered Access Key ID (AK) and Secret Access Key (SK) are incorrect. Please enter them again.'
        )
      );
      logger.log(`${t('login_logging').d('Logging in')}...`);
      await getUserInputAuthInfo();
    }
  } else {
    logger.log(`${t('login_logging').d('Logging in')}...`);
    await getUserInputAuthInfo();
  }
}

async function handleLoginWithAKSK(
  accessKeyId: string,
  accessKeySecret: string
): Promise<void> {
  let apiConfig = getApiConfig();
  apiConfig.auth = {
    accessKeyId,
    accessKeySecret
  };
  try {
    await updateCliConfigFile({
      auth: apiConfig.auth
    });
    const service = await ApiService.getInstance();
    service.updateConfig(apiConfig);
    const loginStatus = await service.checkLogin();
    if (loginStatus.success) {
      logger.success(t('login_success').d('Login success!'));
    } else {
      logger.error(loginStatus.message || 'Login failed');
    }
  } catch (error) {
    logger.error(
      t('login_failed').d('An error occurred while trying to log in.')
    );
  }
}

export async function getUserInputAuthInfo(): Promise<void> {
  const styledUrl = chalk.underline.blue(
    'https://ram.console.aliyun.com/manage/ak'
  );

  logger.log(
    `🔑 ${chalk.underline(t('login_get_ak_sk').d(`Please go to the following link to get your account's AccessKey ID and AccessKey Secret`))}`
  );
  logger.log(`👉 ${styledUrl}`);
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'accessKeyId',
      message: 'AccessKey ID:'
    },
    {
      type: 'password',
      name: 'accessKeySecret',
      message: 'AccessKey Secret:',
      mask: '*'
    }
  ]);

  let apiConfig = getApiConfig();

  apiConfig.auth = {
    accessKeyId: answers.accessKeyId,
    accessKeySecret: answers.accessKeySecret
  };

  try {
    await updateCliConfigFile({
      auth: apiConfig.auth
    });
    const service = await ApiService.getInstance();
    service.updateConfig(apiConfig);
    const loginStatus = await service.checkLogin();

    if (loginStatus.success) {
      logger.success(t('login_success').d('Login success!'));
    } else {
      logger.error(loginStatus.message || 'Login failed');
    }
  } catch (error) {
    logger.error(
      t('login_failed').d('An error occurred while trying to log in.')
    );
  }
}
