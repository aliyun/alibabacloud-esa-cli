import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  isCancel as clackIsCancel,
  password as clackPassword,
  select as clackSelect,
  text as clackText
} from '@clack/prompts';

import {
  handleLogin,
  interactiveLogin,
  maskAccessKeyId
} from '../../src/commands/login/index.js';
import logger from '../../src/libs/logger.js';
import * as fileUtils from '../../src/utils/fileUtils/index.js';
import * as validateCredentialsModule from '../../src/utils/validateCredentials.js';

vi.mock('../../src/utils/fileUtils/index.js');
vi.mock('../../src/utils/validateCredentials.js');
vi.mock('../../src/libs/logger.js', () => ({
  default: {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    success: vi.fn()
  }
}));
vi.mock('@clack/prompts', () => ({
  select: vi.fn(),
  text: vi.fn(),
  password: vi.fn(),
  isCancel: vi.fn().mockReturnValue(false),
  confirm: vi.fn()
}));

function getLoggerOutput(): string {
  return JSON.stringify([
    ...vi.mocked(logger.log).mock.calls,
    ...vi.mocked(logger.success).mock.calls,
    ...vi.mocked(logger.warn).mock.calls,
    ...vi.mocked(logger.error).mock.calls
  ]);
}

function expectSuccessfulLoginSummary(options: {
  source: string;
  authentication: 'AK/SK' | 'STS';
  accessKeyId: string;
  accessKeySecret: string;
  securityToken?: string;
  endpoint: string;
  savedLocally: 'Yes' | 'No';
}): void {
  const output = getLoggerOutput();
  const maskedAccessKeyId = maskAccessKeyId(options.accessKeyId);

  expect(output).toContain(`Source: ${options.source}`);
  expect(output).toContain(`Authentication: ${options.authentication}`);
  expect(output).toContain(`AccessKey ID: ${maskedAccessKeyId}`);
  expect(output).toContain('AccessKey Secret: Configured');
  expect(output).toContain(`Validated endpoint: ${options.endpoint}`);
  expect(output).toContain(`Saved locally: ${options.savedLocally}`);
  expect(output).not.toContain(options.accessKeyId);
  expect(output).not.toContain(options.accessKeySecret);

  if (options.securityToken) {
    expect(output).toContain('Security Token: Configured');
    expect(output).not.toContain(options.securityToken);
  }
}

describe('login command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = undefined;
    delete process.env.ALIBABA_CLOUD_ACCESS_KEY_ID;
    delete process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET;
    delete process.env.ALIBABA_CLOUD_SECURITY_TOKEN;
    delete process.env.ESA_ACCESS_KEY_ID;
    delete process.env.ESA_ACCESS_KEY_SECRET;
    delete process.env.ESA_SECURITY_TOKEN;
    vi.mocked(fileUtils.generateDefaultConfig).mockReturnValue(undefined);
  });

  afterEach(() => {
    process.exitCode = undefined;
  });

  it('should login via env vars when ALIBABA_CLOUD_* is set', async () => {
    const accessKeyId = 'LTAIAlibabaCloudEnvironment1234';
    const accessKeySecret = 'alibaba-cloud-secret-value';
    const securityToken = 'alibaba-cloud-security-token';
    process.env.ALIBABA_CLOUD_ACCESS_KEY_ID = accessKeyId;
    process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET = accessKeySecret;
    process.env.ALIBABA_CLOUD_SECURITY_TOKEN = securityToken;

    vi.mocked(validateCredentialsModule.validateCredentials).mockResolvedValue({
      valid: true,
      endpoint: 'https://esa.aliyuncs.com'
    });

    await handleLogin();

    expect(validateCredentialsModule.validateCredentials).toHaveBeenCalledWith(
      accessKeyId,
      accessKeySecret,
      securityToken
    );
    expect(logger.success).toHaveBeenCalled();
    expect(fileUtils.updateCliConfigFile).not.toHaveBeenCalled();
    expect(fileUtils.generateDefaultConfig).not.toHaveBeenCalled();
    expectSuccessfulLoginSummary({
      source: 'Environment variables (ALIBABA_CLOUD_*)',
      authentication: 'STS',
      accessKeyId,
      accessKeySecret,
      securityToken,
      endpoint: 'https://esa.aliyuncs.com',
      savedLocally: 'No'
    });
    expect(process.exitCode).toBeUndefined();
  });

  it('should login via env vars when ESA_* is set', async () => {
    const accessKeyId = 'LTAIEsaEnvironmentAccessKey5678';
    const accessKeySecret = 'esa-environment-secret-value';
    process.env.ESA_ACCESS_KEY_ID = accessKeyId;
    process.env.ESA_ACCESS_KEY_SECRET = accessKeySecret;

    vi.mocked(validateCredentialsModule.validateCredentials).mockResolvedValue({
      valid: true,
      endpoint: 'https://esa.aliyuncs.com'
    });

    await handleLogin();

    expect(validateCredentialsModule.validateCredentials).toHaveBeenCalledWith(
      accessKeyId,
      accessKeySecret,
      undefined
    );
    expect(logger.success).toHaveBeenCalled();
    expect(fileUtils.updateCliConfigFile).not.toHaveBeenCalled();
    expectSuccessfulLoginSummary({
      source: 'Environment variables (ESA_*)',
      authentication: 'AK/SK',
      accessKeyId,
      accessKeySecret,
      endpoint: 'https://esa.aliyuncs.com',
      savedLocally: 'No'
    });
  });

  it('should prefer the complete ESA_* group without borrowing the Alibaba Cloud token', async () => {
    const esaAccessKeyId = 'LTAIEsaPriorityAccessKey2468';
    const esaAccessKeySecret = 'esa-priority-secret-value';
    const alibabaAccessKeyId = 'LTAIAlibabaFallbackAccessKey1357';
    const alibabaAccessKeySecret = 'alibaba-fallback-secret-value';
    process.env.ESA_ACCESS_KEY_ID = esaAccessKeyId;
    process.env.ESA_ACCESS_KEY_SECRET = esaAccessKeySecret;
    process.env.ALIBABA_CLOUD_ACCESS_KEY_ID = alibabaAccessKeyId;
    process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET = alibabaAccessKeySecret;
    process.env.ALIBABA_CLOUD_SECURITY_TOKEN = 'alibaba-fallback-token';
    vi.mocked(validateCredentialsModule.validateCredentials).mockResolvedValue({
      valid: true,
      endpoint: 'https://esa-priority.esa.aliyuncs.com'
    });

    await handleLogin();

    expect(validateCredentialsModule.validateCredentials).toHaveBeenCalledWith(
      esaAccessKeyId,
      esaAccessKeySecret,
      undefined
    );
    expectSuccessfulLoginSummary({
      source: 'Environment variables (ESA_*)',
      authentication: 'AK/SK',
      accessKeyId: esaAccessKeyId,
      accessKeySecret: esaAccessKeySecret,
      endpoint: 'https://esa-priority.esa.aliyuncs.com',
      savedLocally: 'No'
    });
  });

  it('should reject an incomplete higher-priority environment group instead of mixing or falling back', async () => {
    process.env.ESA_ACCESS_KEY_ID = 'LTAIIncompleteEsaAccessKey1111';
    process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET =
      'incomplete-alibaba-secret-value';
    vi.mocked(fileUtils.getCliConfig).mockReturnValue({
      auth: {
        accessKeyId: 'LTAISavedFallbackAccessKey2468',
        accessKeySecret: 'saved-fallback-secret-value'
      },
      endpoint: 'https://saved.esa.aliyuncs.com'
    } as any);

    await handleLogin();

    expect(
      validateCredentialsModule.validateCredentials
    ).not.toHaveBeenCalled();
    expect(fileUtils.updateCliConfigFile).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });

  it('should reject explicitly empty AK/SK instead of falling back to environment credentials', async () => {
    process.env.ESA_ACCESS_KEY_ID = 'LTAIEnvironmentFallbackAccessKey1234';
    process.env.ESA_ACCESS_KEY_SECRET = 'environment-fallback-secret';

    await handleLogin({
      _: [],
      $0: '',
      'access-key-id': '',
      'access-key-secret': ''
    } as any);

    expect(
      validateCredentialsModule.validateCredentials
    ).not.toHaveBeenCalled();
    expect(fileUtils.updateCliConfigFile).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Incomplete credentials in CLI arguments')
    );
    expect(process.exitCode).toBe(1);
  });

  it('should reject an explicitly empty STS token instead of falling back to environment credentials', async () => {
    process.env.ESA_ACCESS_KEY_ID = 'LTAIEnvironmentFallbackAccessKey5678';
    process.env.ESA_ACCESS_KEY_SECRET = 'environment-fallback-secret';

    await handleLogin({
      _: [],
      $0: '',
      'sts-token': ''
    } as any);

    expect(
      validateCredentialsModule.validateCredentials
    ).not.toHaveBeenCalled();
    expect(fileUtils.updateCliConfigFile).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Invalid STS token format')
    );
    expect(process.exitCode).toBe(1);
  });

  it('should prefer explicit CLI credentials over both environment groups', async () => {
    const cliAccessKeyId = 'LTAICliHighestPriorityAccessKey2222';
    const cliAccessKeySecret = 'cli-highest-priority-secret';
    process.env.ESA_ACCESS_KEY_ID = 'LTAIEsaLowerPriorityAccessKey3333';
    process.env.ESA_ACCESS_KEY_SECRET = 'esa-lower-priority-secret';
    process.env.ALIBABA_CLOUD_ACCESS_KEY_ID =
      'LTAIAlibabaLowestPriorityAccessKey4444';
    process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET =
      'alibaba-lowest-priority-secret';
    vi.mocked(validateCredentialsModule.validateCredentials).mockResolvedValue({
      valid: true,
      endpoint: 'https://cli-priority.esa.aliyuncs.com'
    });
    vi.mocked(fileUtils.updateCliConfigFile).mockResolvedValue(undefined);

    await handleLogin({
      _: [],
      $0: '',
      'access-key-id': cliAccessKeyId,
      'access-key-secret': cliAccessKeySecret
    } as any);

    expect(
      validateCredentialsModule.validateCredentials
    ).toHaveBeenCalledOnce();
    expect(validateCredentialsModule.validateCredentials).toHaveBeenCalledWith(
      cliAccessKeyId,
      cliAccessKeySecret
    );
    expect(fileUtils.updateCliConfigFile).toHaveBeenCalledWith({
      auth: {
        accessKeyId: cliAccessKeyId,
        accessKeySecret: cliAccessKeySecret
      },
      endpoint: 'https://cli-priority.esa.aliyuncs.com'
    });
    expectSuccessfulLoginSummary({
      source: 'CLI arguments',
      authentication: 'AK/SK',
      accessKeyId: cliAccessKeyId,
      accessKeySecret: cliAccessKeySecret,
      endpoint: 'https://cli-priority.esa.aliyuncs.com',
      savedLocally: 'Yes'
    });
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        'Environment variables (ESA_*) will override or block'
      )
    );
  });

  it('should show error when env var credentials are invalid', async () => {
    process.env.ESA_ACCESS_KEY_ID = 'badAK';
    process.env.ESA_ACCESS_KEY_SECRET = 'badSK';

    vi.mocked(validateCredentialsModule.validateCredentials).mockResolvedValue({
      valid: false,
      message: 'Invalid credentials'
    });

    await handleLogin();

    expect(logger.error).toHaveBeenCalledWith('Invalid credentials');
    expect(process.exitCode).toBe(1);
  });

  it('should login via --access-key-id and --access-key-secret args', async () => {
    const accessKeyId = 'LTAICliArgumentAccessKey9012';
    const accessKeySecret = 'cli-argument-secret-value';
    vi.mocked(validateCredentialsModule.validateCredentials).mockResolvedValue({
      valid: true,
      endpoint: 'https://esa.aliyuncs.com'
    });
    vi.mocked(fileUtils.updateCliConfigFile).mockResolvedValue(undefined);

    await handleLogin({
      _: [],
      $0: '',
      'access-key-id': accessKeyId,
      'access-key-secret': accessKeySecret
    } as any);

    expect(validateCredentialsModule.validateCredentials).toHaveBeenCalledWith(
      accessKeyId,
      accessKeySecret
    );
    expect(logger.success).toHaveBeenCalled();
    expect(fileUtils.updateCliConfigFile).toHaveBeenCalled();
    expect(fileUtils.generateDefaultConfig).toHaveBeenCalledOnce();
    expect(logger.warn).not.toHaveBeenCalled();
    expectSuccessfulLoginSummary({
      source: 'CLI arguments',
      authentication: 'AK/SK',
      accessKeyId,
      accessKeySecret,
      endpoint: 'https://esa.aliyuncs.com',
      savedLocally: 'Yes'
    });
    expect(process.exitCode).toBeUndefined();
  });

  it('should keep STS priority and warn when both CLI credential forms are provided', async () => {
    const stsAccessKeyId = 'STSAConflictingArgumentAccessKey3456';
    const stsAccessKeySecret = 'conflicting-sts-secret-value';
    const securityToken = 'conflicting-sts-security-token';
    vi.mocked(validateCredentialsModule.validateCredentials).mockResolvedValue({
      valid: true,
      endpoint: 'https://sts-conflict.esa.aliyuncs.com'
    });
    vi.mocked(fileUtils.updateCliConfigFile).mockResolvedValue(undefined);

    await handleLogin({
      _: [],
      $0: '',
      'sts-token': `${stsAccessKeyId},${stsAccessKeySecret},${securityToken}`,
      'access-key-id': 'LTAIIgnoredAccessKey1234',
      'access-key-secret': 'ignored-access-key-secret'
    } as any);

    expect(validateCredentialsModule.validateCredentials).toHaveBeenCalledWith(
      stsAccessKeyId,
      stsAccessKeySecret,
      securityToken
    );
    expect(fileUtils.updateCliConfigFile).toHaveBeenCalledWith({
      auth: {
        accessKeyId: stsAccessKeyId,
        accessKeySecret: stsAccessKeySecret,
        securityToken
      },
      endpoint: 'https://sts-conflict.esa.aliyuncs.com'
    });
    expect(getLoggerOutput()).toContain('--sts-token');
    expect(getLoggerOutput()).toContain('--ak');
    expect(getLoggerOutput()).toContain('--sk');
    expect(process.exitCode).toBeUndefined();
  });

  it('should summarize CLI STS login without exposing credentials', async () => {
    const accessKeyId = 'STSACliArgumentAccessKey3456';
    const accessKeySecret = 'cli-sts-secret-value';
    const securityToken = 'cli-sts-security-token';
    vi.mocked(validateCredentialsModule.validateCredentials).mockResolvedValue({
      valid: true,
      endpoint: 'https://sts.esa.aliyuncs.com'
    });
    vi.mocked(fileUtils.updateCliConfigFile).mockResolvedValue(undefined);

    await handleLogin({
      _: [],
      $0: '',
      'sts-token': `${accessKeyId},${accessKeySecret},${securityToken}`
    } as any);

    expect(validateCredentialsModule.validateCredentials).toHaveBeenCalledWith(
      accessKeyId,
      accessKeySecret,
      securityToken
    );
    expect(fileUtils.updateCliConfigFile).toHaveBeenCalled();
    expectSuccessfulLoginSummary({
      source: 'CLI arguments',
      authentication: 'STS',
      accessKeyId,
      accessKeySecret,
      securityToken,
      endpoint: 'https://sts.esa.aliyuncs.com',
      savedLocally: 'Yes'
    });
  });

  it('should summarize credentials loaded from saved config', async () => {
    const accessKeyId = 'LTAISavedConfigAccessKey1357';
    const accessKeySecret = 'saved-config-secret-value';
    const securityToken = 'saved-config-security-token';
    vi.mocked(fileUtils.getCliConfig).mockReturnValue({
      auth: { accessKeyId, accessKeySecret, securityToken },
      endpoint: 'https://configured.esa.aliyuncs.com'
    } as any);
    vi.mocked(validateCredentialsModule.validateCredentials).mockResolvedValue({
      valid: true,
      endpoint: 'https://validated.esa.aliyuncs.com'
    });
    vi.mocked(clackSelect).mockResolvedValue('exit' as any);

    await handleLogin();

    expect(logger.success).not.toHaveBeenCalled();
    expect(fileUtils.updateCliConfigFile).not.toHaveBeenCalled();
    expectSuccessfulLoginSummary({
      source: 'Saved config',
      authentication: 'STS',
      accessKeyId,
      accessKeySecret,
      securityToken,
      endpoint: 'https://validated.esa.aliyuncs.com',
      savedLocally: 'Yes'
    });
  });

  it('should summarize credentials entered interactively', async () => {
    const accessKeyId = 'LTAIInteractiveAccessKey8642';
    const accessKeySecret = 'interactive-secret-value';
    vi.mocked(clackSelect).mockResolvedValue('aksk' as any);
    vi.mocked(clackText).mockResolvedValue(accessKeyId as any);
    vi.mocked(clackPassword).mockResolvedValue(accessKeySecret as any);
    vi.mocked(validateCredentialsModule.validateCredentials).mockResolvedValue({
      valid: true,
      endpoint: 'https://interactive.esa.aliyuncs.com'
    });
    vi.mocked(fileUtils.updateCliConfigFile).mockResolvedValue(undefined);

    await interactiveLogin();

    expect(clackText).toHaveBeenCalledWith({ message: 'AccessKey ID:' });
    expect(clackText).toHaveBeenCalledOnce();
    expect(clackPassword).toHaveBeenCalledWith({
      message: 'AccessKey Secret:'
    });
    expect(clackPassword).toHaveBeenCalledOnce();
    expect(fileUtils.updateCliConfigFile).toHaveBeenCalled();
    expectSuccessfulLoginSummary({
      source: 'Interactive input',
      authentication: 'AK/SK',
      accessKeyId,
      accessKeySecret,
      endpoint: 'https://interactive.esa.aliyuncs.com',
      savedLocally: 'Yes'
    });
    expect(process.exitCode).toBeUndefined();
  });

  it('should use a password prompt for an interactive STS credential group', async () => {
    const accessKeyId = 'STSAInteractiveAccessKey7531';
    const accessKeySecret = 'interactive-sts-secret-value';
    const securityToken = 'interactive-sts-security-token';
    vi.mocked(clackSelect).mockResolvedValue('sts' as any);
    vi.mocked(clackPassword).mockResolvedValue(
      `${accessKeyId},${accessKeySecret},${securityToken}` as any
    );
    vi.mocked(validateCredentialsModule.validateCredentials).mockResolvedValue({
      valid: true,
      endpoint: 'https://interactive-sts.esa.aliyuncs.com'
    });
    vi.mocked(fileUtils.updateCliConfigFile).mockResolvedValue(undefined);

    await interactiveLogin();

    expect(clackText).not.toHaveBeenCalled();
    expect(clackPassword).toHaveBeenCalledOnce();
    expect(validateCredentialsModule.validateCredentials).toHaveBeenCalledWith(
      accessKeyId,
      accessKeySecret,
      securityToken
    );
    expectSuccessfulLoginSummary({
      source: 'Interactive input',
      authentication: 'STS',
      accessKeyId,
      accessKeySecret,
      securityToken,
      endpoint: 'https://interactive-sts.esa.aliyuncs.com',
      savedLocally: 'Yes'
    });
    expect(process.exitCode).toBeUndefined();
  });

  it('should stop cleanly when the interactive AK/SK secret prompt is cancelled', async () => {
    vi.mocked(clackSelect).mockResolvedValue('aksk' as any);
    vi.mocked(clackText).mockResolvedValue('LTAICancelledAccessKey1234' as any);
    vi.mocked(clackPassword).mockResolvedValue(Symbol('cancel') as any);
    vi.mocked(clackIsCancel)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);

    await interactiveLogin();

    expect(
      validateCredentialsModule.validateCredentials
    ).not.toHaveBeenCalled();
    expect(fileUtils.updateCliConfigFile).not.toHaveBeenCalled();
    expect(process.exitCode).toBeUndefined();
  });

  it('should stop cleanly when the interactive STS prompt is cancelled', async () => {
    vi.mocked(clackSelect).mockResolvedValue('sts' as any);
    vi.mocked(clackPassword).mockResolvedValue(Symbol('cancel') as any);
    vi.mocked(clackIsCancel)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);

    await interactiveLogin();

    expect(
      validateCredentialsModule.validateCredentials
    ).not.toHaveBeenCalled();
    expect(fileUtils.updateCliConfigFile).not.toHaveBeenCalled();
    expect(process.exitCode).toBeUndefined();
  });

  it('should show error when arg credentials are invalid', async () => {
    vi.mocked(validateCredentialsModule.validateCredentials).mockResolvedValue({
      valid: false,
      message: 'Auth failed'
    });

    await handleLogin({
      _: [],
      $0: '',
      'access-key-id': 'badAK',
      'access-key-secret': 'badSK'
    } as any);

    expect(logger.error).toHaveBeenCalledWith('Auth failed');
    expect(process.exitCode).toBe(1);
  });
});

describe('maskAccessKeyId', () => {
  it.each(['', 'short', '12345678901'])(
    'fully masks short value %j',
    (value) => {
      expect(maskAccessKeyId(value)).toBe('****');
    }
  );

  it.each(['LTAI1234\n5678', 'LTAI1234\u0000ABCD', 'LTAI-12345678'])(
    'fully masks a value containing control or non-alphanumeric characters',
    (value) => {
      expect(maskAccessKeyId(value)).toBe('****');
    }
  );

  it('shows only the first and last four characters of a safe long value', () => {
    expect(maskAccessKeyId('LTAI12345678ABCD')).toBe('LTAI****ABCD');
  });
});
