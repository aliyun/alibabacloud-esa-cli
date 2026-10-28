import {
  isCancel,
  password as clackPassword,
  select as clackSelect,
  text as clackText
} from '@clack/prompts';
import chalk from 'chalk';
import { CommandModule, ArgumentsCamelCase } from 'yargs';

import t from '../../i18n/index.js';
import logger from '../../libs/logger.js';
import { resolveEnvironmentCredentials } from '../../utils/credentials.js';
import {
  getCliConfig,
  updateCliConfigFile,
  generateDefaultConfig,
  getIncompleteCredentialsMessage
} from '../../utils/fileUtils/index.js';
import { validateCredentials } from '../../utils/validateCredentials.js';

type LoginSource =
  | 'cli-arguments'
  | 'environment-alibaba-cloud'
  | 'environment-esa'
  | 'saved-config'
  | 'interactive-input';

interface LoginSummary {
  source: LoginSource;
  authType: 'aksk' | 'sts';
  accessKeyId: string;
  endpoint?: string;
  savedLocally: boolean;
}

function reportLoginError(message: string): void {
  logger.error(message);
  process.exitCode = 1;
}

function hasExplicitArgument(
  argv: ArgumentsCamelCase | undefined,
  names: string[]
): boolean {
  return Boolean(
    argv &&
    names.some((name) => Object.prototype.hasOwnProperty.call(argv, name))
  );
}

function getExplicitStringArgument(
  argv: ArgumentsCamelCase | undefined,
  names: string[]
): string | undefined {
  if (!argv) return undefined;
  const values = argv as Record<string, unknown>;
  for (const name of names) {
    if (!Object.prototype.hasOwnProperty.call(values, name)) continue;
    const value = values[name];
    return typeof value === 'string' ? value : undefined;
  }
  return undefined;
}

export function maskAccessKeyId(accessKeyId: string): string {
  const normalized = accessKeyId.trim();
  if (normalized.length < 12 || !/^[a-zA-Z0-9]+$/.test(normalized)) {
    return '****';
  }
  return `${normalized.slice(0, 4)}****${normalized.slice(-4)}`;
}

function getLoginSourceLabel(source: LoginSource): string {
  switch (source) {
    case 'cli-arguments':
      return t('login_source_cli_arguments').d('CLI arguments');
    case 'environment-alibaba-cloud':
      return t('login_source_environment_alibaba_cloud').d(
        'Environment variables (ALIBABA_CLOUD_*)'
      );
    case 'environment-esa':
      return t('login_source_environment_esa').d(
        'Environment variables (ESA_*)'
      );
    case 'saved-config':
      return t('login_source_saved_config').d('Saved config');
    case 'interactive-input':
      return t('login_source_interactive_input').d('Interactive input');
  }
}

function logLoginSummary(summary: LoginSummary, showSuccess = true): void {
  if (showSuccess) {
    logger.success(t('login_success').d('Login success!'));
  }

  const configured = t('login_summary_configured').d('Configured');
  logger.log(
    `  ${t('login_summary_source').d('Source')}: ${getLoginSourceLabel(summary.source)}`
  );
  logger.log(
    `  ${t('login_summary_authentication').d('Authentication')}: ${
      summary.authType === 'sts' ? 'STS' : 'AK/SK'
    }`
  );
  logger.log(
    `  ${t('login_summary_access_key_id').d('AccessKey ID')}: ${maskAccessKeyId(summary.accessKeyId)}`
  );
  logger.log(
    `  ${t('login_summary_access_key_secret').d('AccessKey Secret')}: ${configured}`
  );
  if (summary.authType === 'sts') {
    logger.log(
      `  ${t('login_summary_security_token').d('Security Token')}: ${configured}`
    );
  }
  logger.log(
    `  ${t('login_summary_validated_endpoint').d('Validated endpoint')}: ${
      summary.endpoint || t('login_summary_unknown').d('Unknown')
    }`
  );
  logger.log(
    `  ${t('login_summary_saved_locally').d('Saved locally')}: ${
      summary.savedLocally
        ? t('login_summary_yes').d('Yes')
        : t('login_summary_no').d('No')
    }`
  );
}

function warnIfEnvironmentShadowsSavedCredentials(): void {
  const environmentCredentials = resolveEnvironmentCredentials();
  if (environmentCredentials.status === 'none') return;

  const source = getLoginSourceLabel(environmentCredentials.source);
  logger.warn(
    t('login_saved_credentials_shadowed', { source }).d(
      `Credentials were saved, but ${source} will override or block them in subsequent commands. Unset those environment variables to use the saved login.`
    )
  );
}

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
    await handleLogin(argv);
  }
};

export default login;

export async function handleLogin(argv?: ArgumentsCamelCase): Promise<void> {
  const stsArgumentNames = ['sts-token', 'stsToken'];
  const accessKeyIdArgumentNames = ['access-key-id', 'accessKeyId', 'ak'];
  const accessKeySecretArgumentNames = [
    'access-key-secret',
    'accessKeySecret',
    'sk'
  ];
  const hasStsArgument = hasExplicitArgument(argv, stsArgumentNames);
  const hasAccessKeyIdArgument = hasExplicitArgument(
    argv,
    accessKeyIdArgumentNames
  );
  const hasAccessKeySecretArgument = hasExplicitArgument(
    argv,
    accessKeySecretArgumentNames
  );
  const stsTokenRaw = getExplicitStringArgument(argv, stsArgumentNames);
  const accessKeyId = getExplicitStringArgument(argv, accessKeyIdArgumentNames);
  const accessKeySecret = getExplicitStringArgument(
    argv,
    accessKeySecretArgumentNames
  );

  if (hasStsArgument) {
    if (hasAccessKeyIdArgument || hasAccessKeySecretArgument) {
      logger.warn(
        t('login_explicit_credentials_conflict').d(
          'Both --sts-token and --ak/--sk were provided. --sts-token takes precedence; --ak/--sk are ignored.'
        )
      );
    }
    const parsed = parseStsToken(stsTokenRaw ?? '');
    if (!parsed) {
      reportLoginError(
        t('login_sts_token_format_invalid').d(
          'Invalid STS token format. Use: AccessKeyId,AccessKeySecret,SecurityToken'
        )
      );
      return;
    }
    const result = await validateCredentials(
      parsed.accessKeyId,
      parsed.accessKeySecret,
      parsed.securityToken
    );
    if (result.valid) {
      generateDefaultConfig();
      await updateCliConfigFile({
        auth: {
          accessKeyId: parsed.accessKeyId,
          accessKeySecret: parsed.accessKeySecret,
          securityToken: parsed.securityToken
        },
        ...(result.endpoint ? { endpoint: result.endpoint } : {})
      });
      logLoginSummary({
        source: 'cli-arguments',
        authType: 'sts',
        accessKeyId: parsed.accessKeyId,
        endpoint: result.endpoint,
        savedLocally: true
      });
      warnIfEnvironmentShadowsSavedCredentials();
    } else {
      reportLoginError(result.message || 'Login failed');
    }
    return;
  }

  if (hasAccessKeyIdArgument || hasAccessKeySecretArgument) {
    if (!accessKeyId || !accessKeySecret) {
      reportLoginError(
        t('credentials_incomplete', { source: 'CLI arguments' }).d(
          'Incomplete credentials in CLI arguments. AccessKey ID and AccessKey Secret must be provided together.'
        )
      );
      return;
    }

    const result = await validateCredentials(accessKeyId, accessKeySecret);
    if (result.valid) {
      generateDefaultConfig();
      await updateCliConfigFile({
        auth: {
          accessKeyId,
          accessKeySecret
        },
        ...(result.endpoint ? { endpoint: result.endpoint } : {})
      });
      logLoginSummary({
        source: 'cli-arguments',
        authType: 'aksk',
        accessKeyId,
        endpoint: result.endpoint,
        savedLocally: true
      });
      warnIfEnvironmentShadowsSavedCredentials();
    } else {
      reportLoginError(result.message || 'Login failed');
    }
    return;
  }

  const environmentCredentials = resolveEnvironmentCredentials();
  if (environmentCredentials.status === 'incomplete') {
    reportLoginError(
      getIncompleteCredentialsMessage(environmentCredentials.source)
    );
    return;
  }
  if (environmentCredentials.status === 'resolved') {
    const { auth, source } = environmentCredentials;
    const result = await validateCredentials(
      auth.accessKeyId,
      auth.accessKeySecret,
      auth.securityToken
    );
    if (result.valid) {
      logLoginSummary({
        source,
        authType: auth.securityToken ? 'sts' : 'aksk',
        accessKeyId: auth.accessKeyId,
        endpoint: result.endpoint,
        savedLocally: false
      });
    } else {
      reportLoginError(result.message || 'Login failed');
    }
    return;
  }

  generateDefaultConfig();
  const cliConfig = getCliConfig();
  if (!cliConfig) return;
  if (
    cliConfig.auth &&
    (cliConfig.auth.accessKeyId ||
      cliConfig.auth.accessKeySecret ||
      cliConfig.auth.securityToken) &&
    (!cliConfig.auth.accessKeyId || !cliConfig.auth.accessKeySecret)
  ) {
    reportLoginError(getIncompleteCredentialsMessage('saved-config'));
    return;
  }
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
      logLoginSummary(
        {
          source: 'saved-config',
          authType: cliConfig.auth.securityToken ? 'sts' : 'aksk',
          accessKeyId: cliConfig.auth.accessKeyId,
          endpoint: loginStatus.endpoint || cliConfig.endpoint,
          savedLocally: true
        },
        false
      );
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
  const loginMethod = (await clackSelect({
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
  })) as 'aksk' | 'sts';

  if (isCancel(loginMethod)) {
    return;
  }

  if (loginMethod === 'sts') {
    const stsInput = await clackPassword({
      message: t('login_sts_token_prompt').d(
        'Enter STS token (AccessKeyId,AccessKeySecret,SecurityToken):'
      )
    });
    if (isCancel(stsInput)) return;
    const parsed = parseStsToken(stsInput);
    if (!parsed) {
      reportLoginError(
        t('login_sts_token_format_invalid').d(
          'Invalid STS token format. Use: AccessKeyId,AccessKeySecret,SecurityToken'
        )
      );
      return;
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
      logLoginSummary({
        source: 'interactive-input',
        authType: 'sts',
        accessKeyId: parsed.accessKeyId,
        endpoint: loginStatus.endpoint,
        savedLocally: true
      });
    } else {
      reportLoginError(loginStatus.message || 'Login failed');
    }
    return;
  }

  const styledUrl = chalk.underline.blue(
    'https://ram.console.aliyun.com/manage/ak'
  );

  logger.log(
    `🔑 ${chalk.underline(t('login_get_ak_sk').d(`Please go to the following link to get your account's AccessKey ID and AccessKey Secret`))}`
  );
  logger.log(`👉 ${styledUrl}`);
  const accessKeyId = await clackText({ message: 'AccessKey ID:' });
  if (isCancel(accessKeyId)) return;
  const accessKeySecret = await clackPassword({
    message: 'AccessKey Secret:'
  });
  if (isCancel(accessKeySecret)) return;

  const loginStatus = await validateCredentials(accessKeyId, accessKeySecret);

  if (loginStatus.valid) {
    await updateCliConfigFile({
      auth: {
        accessKeyId,
        accessKeySecret
      },
      ...(loginStatus.endpoint ? { endpoint: loginStatus.endpoint } : {})
    });
    logLoginSummary({
      source: 'interactive-input',
      authType: 'aksk',
      accessKeyId,
      endpoint: loginStatus.endpoint,
      savedLocally: true
    });
  } else {
    reportLoginError(loginStatus.message || 'Login failed');
  }
}
