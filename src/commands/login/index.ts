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

/** Parse STS token string: "AccessKeyId,AccessKeySecret,SecurityToken" or JSON */
function parseStsToken(raw: string): {
  accessKeyId: string;
  accessKeySecret: string;
  securityToken: string;
} | null {
  const s = raw.trim();
  if (!s) return null;
  if (s.startsWith('{')) {
    try {
      const o = JSON.parse(s) as Record<string, string>;
      const accessKeyId = o.AccessKeyId ?? o.accessKeyId;
      const accessKeySecret = o.AccessKeySecret ?? o.accessKeySecret;
      const securityToken = o.SecurityToken ?? o.securityToken;
      if (accessKeyId && accessKeySecret && securityToken) {
        return { accessKeyId, accessKeySecret, securityToken };
      }
    } catch {
      return null;
    }
    return null;
  }
  const parts = s.split(',').map((p) => p.trim());
  if (parts.length >= 3) {
    return {
      accessKeyId: parts[0],
      accessKeySecret: parts[1],
      securityToken: parts.slice(2).join(',').trim()
    };
  }
  return null;
}

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
      .option('sts-token', {
        describe: t('login_option_sts_token')?.d(
          'STS token: AccessKeyId,AccessKeySecret,SecurityToken (comma-separated, one-shot)'
        ),
        type: 'string'
      });
  },
  handler: async (argv: ArgumentsCamelCase) => {
    const result = await handleLogin(argv);
    if (result === null) {
      process.exitCode = 130;
    } else if (!result) {
      process.exitCode = 1;
    }
  }
};

export default login;

export async function handleLogin(
  argv?: ArgumentsCamelCase
): Promise<boolean | null> {
  generateDefaultConfig();
  const envAccessKeyId =
    process.env.ALIBABA_CLOUD_ACCESS_KEY_ID || process.env.ESA_ACCESS_KEY_ID;
  const envAccessKeySecret =
    process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET ||
    process.env.ESA_ACCESS_KEY_SECRET;
  const envSecurityToken =
    process.env.ALIBABA_CLOUD_SECURITY_TOKEN || process.env.ESA_SECURITY_TOKEN;
  if (
    (envAccessKeyId || envAccessKeySecret || envSecurityToken) &&
    !(envAccessKeyId && envAccessKeySecret)
  ) {
    logger.error(
      'Both AccessKey ID and AccessKey Secret are required in environment variables'
    );
    return false;
  }
  if (envAccessKeyId && envAccessKeySecret) {
    const result = await validateCredentials(
      envAccessKeyId,
      envAccessKeySecret,
      envSecurityToken
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
    return result.valid;
  }

  const stsTokenRaw = argv?.['sts-token'] as string | undefined;
  if (stsTokenRaw !== undefined) {
    const parsed = parseStsToken(stsTokenRaw);
    if (!parsed) {
      logger.error(
        t('login_sts_token_format_invalid').d(
          'Invalid STS token format. Use: AccessKeyId,AccessKeySecret,SecurityToken'
        )
      );
      return false;
    }
    const result = await validateCredentials(
      parsed.accessKeyId,
      parsed.accessKeySecret,
      parsed.securityToken
    );
    if (result.valid) {
      await updateCliConfigFile({
        auth: {
          accessKeyId: parsed.accessKeyId,
          accessKeySecret: parsed.accessKeySecret,
          securityToken: parsed.securityToken
        },
        ...(result.endpoint ? { endpoint: result.endpoint } : {})
      });
      logger.success(t('login_success').d('Login success!'));
    } else {
      logger.error(result.message || 'Login failed');
    }
    return result.valid;
  }

  const accessKeyId = argv?.['access-key-id'] as string;
  const accessKeySecret = argv?.['access-key-secret'] as string;
  if ((accessKeyId || accessKeySecret) && !(accessKeyId && accessKeySecret)) {
    logger.error('Both --access-key-id and --access-key-secret are required');
    return false;
  }
  if (accessKeyId && accessKeySecret) {
    const result = await validateCredentials(accessKeyId, accessKeySecret);
    if (result.valid) {
      await updateCliConfigFile({
        auth: {
          accessKeyId,
          accessKeySecret
        },
        ...(result.endpoint ? { endpoint: result.endpoint } : {})
      });
      logger.success(t('login_success').d('Login success!'));
    } else {
      logger.error(result.message || 'Login failed');
    }
    return result.valid;
  }

  // interactive login
  const cliConfig = getCliConfig();
  if (!cliConfig) return false;
  if (
    cliConfig &&
    cliConfig.auth &&
    cliConfig.auth.accessKeyId &&
    cliConfig.auth.accessKeySecret
  ) {
    const loginStatus = await validateCredentials(
      cliConfig.auth.accessKeyId,
      cliConfig.auth.accessKeySecret,
      cliConfig.auth.securityToken
    );
    if (loginStatus.valid) {
      logger.warn(t('login_already').d('You are already logged in.'));
      const selected = await clackSelect({
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
      });
      if (isCancel(selected)) {
        return null;
      }
      if (selected === 'exit') {
        return true;
      }
    } else {
      logger.error(
        t('pre_login_failed').d(
          'The previously entered Access Key ID (AK) and Secret Access Key (SK) are incorrect. Please enter them again.'
        )
      );
    }
  }
  return await interactiveLogin();
}

export async function interactiveLogin(): Promise<boolean | null> {
  const loginMethod = await clackSelect({
    message: t('login_method_select').d('Choose login method'),
    options: [
      {
        label: t('login_method_aksk').d(
          'AK/SK (AccessKey ID + AccessKey Secret)'
        ),
        value: 'aksk'
      },
      {
        label: t('login_method_sts').d(
          'STS Token (one-shot: AccessKeyId,AccessKeySecret,SecurityToken)'
        ),
        value: 'sts'
      }
    ]
  });

  if (isCancel(loginMethod)) {
    return null;
  }

  if (loginMethod === 'sts') {
    const stsInput = await clackText({
      message: t('login_sts_token_prompt').d(
        'Enter STS token (AccessKeyId,AccessKeySecret,SecurityToken):'
      )
    });
    if (isCancel(stsInput)) return null;
    const parsed = parseStsToken(stsInput);
    if (!parsed) {
      logger.error(
        t('login_sts_token_format_invalid').d(
          'Invalid STS token format. Use: AccessKeyId,AccessKeySecret,SecurityToken'
        )
      );
      return false;
    }
    const loginStatus = await validateCredentials(
      parsed.accessKeyId,
      parsed.accessKeySecret,
      parsed.securityToken
    );
    if (loginStatus.valid) {
      await updateCliConfigFile({
        auth: {
          accessKeyId: parsed.accessKeyId,
          accessKeySecret: parsed.accessKeySecret,
          securityToken: parsed.securityToken
        },
        ...(loginStatus.endpoint ? { endpoint: loginStatus.endpoint } : {})
      });
      logger.success(t('login_success').d('Login success!'));
    } else {
      logger.error(loginStatus.message || 'Login failed');
    }
    return loginStatus.valid;
  }

  const styledUrl = chalk.underline.blue(
    'https://ram.console.aliyun.com/manage/ak'
  );

  logger.log(
    `🔑 ${chalk.underline(t('login_get_ak_sk').d(`Please go to the following link to get your account's AccessKey ID and AccessKey Secret`))}`
  );
  logger.log(`👉 ${styledUrl}`);
  const accessKeyId = await clackText({ message: 'AccessKey ID:' });
  if (isCancel(accessKeyId)) return null;
  const accessKeySecret = await clackText({
    message: 'AccessKey Secret:'
  });
  if (isCancel(accessKeySecret)) return null;

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
  return loginStatus.valid;
}
