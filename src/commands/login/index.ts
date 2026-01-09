import {
  isCancel,
  select as clackSelect,
  text as clackText
} from '@clack/prompts';
import chalk from 'chalk';
import { CommandModule, ArgumentsCamelCase } from 'yargs';

import t from '../../i18n/index.js';
import logger from '../../libs/logger.js';
import {
  getCliConfig,
  updateCliConfigFile,
  generateDefaultConfig
} from '../../utils/fileUtils/index.js';
import { validateCredentials } from '../../utils/validateCredentials.js';

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
  if (process.env.ESA_ACCESS_KEY_ID && process.env.ESA_ACCESS_KEY_SECRET) {
    const result = await validateCredentials(
      process.env.ESA_ACCESS_KEY_ID,
      process.env.ESA_ACCESS_KEY_SECRET
    );
    if (result.valid) {
      logger.log(
        t('login_get_credentials_from_environment_variables').d(
          'Get credentials from environment variables'
        )
      );
      logger.success(t('login_success').d('Login success!'));
    } else {
      logger.error(result.message || 'Login failed');
    }
    return;
  }

  const accessKeyId = argv?.['access-key-id'] as string;
  const accessKeySecret = argv?.['access-key-secret'] as string;
  if (accessKeyId && accessKeySecret) {
    const result = await validateCredentials(accessKeyId, accessKeySecret);
    if (result.valid) {
      logger.success(t('login_success').d('Login success!'));
      updateCliConfigFile({
        auth: {
          accessKeyId,
          accessKeySecret
        },
        ...(result.endpoint ? { endpoint: result.endpoint } : {})
      });
    } else {
      logger.error(result.message || 'Login failed');
    }
    return;
  }

  // interactive login
  const cliConfig = getCliConfig();
  if (!cliConfig) return;
  if (
    cliConfig &&
    cliConfig.auth &&
    cliConfig.auth.accessKeyId &&
    cliConfig.auth.accessKeySecret
  ) {
    const loginStatus = await validateCredentials(
      cliConfig.auth.accessKeyId,
      cliConfig.auth.accessKeySecret
    );
    if (loginStatus.valid) {
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
    } else {
      logger.error(
        t('pre_login_failed').d(
          'The previously entered Access Key ID (AK) and Secret Access Key (SK) are incorrect. Please enter them again.'
        )
      );
    }
  }
  await interactiveLogin();
}

export async function interactiveLogin(): Promise<void> {
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

  const loginStatus = await validateCredentials(accessKeyId, accessKeySecret);

  if (loginStatus.valid) {
    await updateCliConfigFile({
      auth: {
        accessKeyId,
        accessKeySecret
      },
      ...(loginStatus.endpoint ? { endpoint: loginStatus.endpoint } : {})
    });
    logger.success(t('login_success').d('Login success!'));
  } else {
    logger.error(loginStatus.message || 'Login failed');
  }
}
