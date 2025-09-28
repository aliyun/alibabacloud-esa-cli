import {
  isCancel,
  select as clackSelect,
  text as clackText
} from '@clack/prompts';
import chalk from 'chalk';
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
      })
      .option('endpoint', {
        alias: 'e',
        describe: t('login_option_endpoint')?.d('Endpoint'),
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
  const endpoint =
    (argv?.['endpoint'] as string | undefined) || process.env.ESA_ENDPOINT;
  if (accessKeyId && accessKeySecret) {
    await handleLoginWithAKSK(
      accessKeyId as string,
      accessKeySecret as string,
      endpoint
    );
    return;
  }

  if (process.env.ESA_ACCESS_KEY_ID && process.env.ESA_ACCESS_KEY_SECRET) {
    logger.log(
      `🔑 ${t('login_get_from_env').d(`Get AccessKey ID and AccessKey Secret from environment variables.`)}`
    );

    await handleLoginWithAKSK(
      process.env.ESA_ACCESS_KEY_ID,
      process.env.ESA_ACCESS_KEY_SECRET,
      endpoint
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
      const selected = (await clackSelect({
        message: t('login_existing_credentials_message').d(
          'Existing credentials found. What do you want to do?'
        ),
        options: [
          {
            label: t('login_existing_credentials_action_overwrite').d(
              'Overwrite existing credentials'
            ),
            value: 'overwrite'
          },
          { label: t('common_exit').d('Exit'), value: 'exit' }
        ]
      })) as 'overwrite' | 'exit';
      if (isCancel(selected) || selected === 'exit') {
        return;
      }
      await getUserInputAuthInfo(endpoint);
    } else {
      logger.error(
        t('pre_login_failed').d(
          'The previously entered Access Key ID (AK) and Secret Access Key (SK) are incorrect. Please enter them again.'
        )
      );
      logger.log(`${t('login_logging').d('Logging in')}...`);
      await getUserInputAuthInfo(endpoint);
    }
  } else {
    logger.log(`${t('login_logging').d('Logging in')}...`);
    await getUserInputAuthInfo(endpoint);
  }
}

async function handleLoginWithAKSK(
  accessKeyId: string,
  accessKeySecret: string,
  endpoint?: string
): Promise<void> {
  let apiConfig = getApiConfig();
  apiConfig.auth = {
    accessKeyId,
    accessKeySecret
  };
  if (endpoint) {
    apiConfig.endpoint = endpoint;
  }
  try {
    await updateCliConfigFile({
      auth: apiConfig.auth,
      ...(endpoint ? { endpoint } : {})
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

export async function getUserInputAuthInfo(endpoint?: string): Promise<void> {
  const styledUrl = chalk.underline.blue(
    'https://ram.console.aliyun.com/manage/ak'
  );

  logger.log(
    `🔑 ${chalk.underline(t('login_get_ak_sk').d(`Please go to the following link to get your account's AccessKey ID and AccessKey Secret`))}`
  );
  logger.log(`👉 ${styledUrl}`);
  const accessKeyId = (await clackText({ message: 'AccessKey ID:' })) as string;
  const accessKeySecret = (await clackText({
    message: 'AccessKey Secret:'
  })) as string;

  let apiConfig = getApiConfig();

  apiConfig.auth = {
    accessKeyId,
    accessKeySecret
  };
  if (endpoint) {
    apiConfig.endpoint = endpoint;
  }

  try {
    await updateCliConfigFile({
      auth: apiConfig.auth,
      ...(endpoint ? { endpoint } : {})
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
