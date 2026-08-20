import { isCancel, select as clackSelect } from '@clack/prompts';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import login, { handleLogin } from '../../src/commands/login/index.js';
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
  isCancel: vi.fn().mockReturnValue(false),
  confirm: vi.fn()
}));

describe('login command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ALIBABA_CLOUD_ACCESS_KEY_ID;
    delete process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET;
    delete process.env.ALIBABA_CLOUD_SECURITY_TOKEN;
    delete process.env.ESA_ACCESS_KEY_ID;
    delete process.env.ESA_ACCESS_KEY_SECRET;
    delete process.env.ESA_SECURITY_TOKEN;
    vi.mocked(fileUtils.generateDefaultConfig).mockReturnValue(undefined);
    process.exitCode = undefined;
  });

  it('should login via env vars when ALIBABA_CLOUD_* is set', async () => {
    process.env.ALIBABA_CLOUD_ACCESS_KEY_ID = 'testAK';
    process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET = 'testSK';

    vi.mocked(validateCredentialsModule.validateCredentials).mockResolvedValue({
      valid: true,
      endpoint: 'https://esa.aliyuncs.com'
    });

    await expect(handleLogin()).resolves.toBe(true);

    expect(validateCredentialsModule.validateCredentials).toHaveBeenCalledWith(
      'testAK',
      'testSK',
      undefined
    );
    expect(logger.success).toHaveBeenCalled();
  });

  it('should login via env vars when ESA_* is set', async () => {
    process.env.ESA_ACCESS_KEY_ID = 'esaAK';
    process.env.ESA_ACCESS_KEY_SECRET = 'esaSK';

    vi.mocked(validateCredentialsModule.validateCredentials).mockResolvedValue({
      valid: true,
      endpoint: 'https://esa.aliyuncs.com'
    });

    await expect(handleLogin()).resolves.toBe(true);

    expect(validateCredentialsModule.validateCredentials).toHaveBeenCalledWith(
      'esaAK',
      'esaSK',
      undefined
    );
    expect(logger.success).toHaveBeenCalled();
  });

  it('should show error when env var credentials are invalid', async () => {
    process.env.ESA_ACCESS_KEY_ID = 'badAK';
    process.env.ESA_ACCESS_KEY_SECRET = 'badSK';

    vi.mocked(validateCredentialsModule.validateCredentials).mockResolvedValue({
      valid: false,
      message: 'Invalid credentials'
    });

    await expect(handleLogin()).resolves.toBe(false);

    expect(logger.error).toHaveBeenCalledWith('Invalid credentials');
  });

  it('should login via --access-key-id and --access-key-secret args', async () => {
    vi.mocked(validateCredentialsModule.validateCredentials).mockResolvedValue({
      valid: true,
      endpoint: 'https://esa.aliyuncs.com'
    });
    vi.mocked(fileUtils.updateCliConfigFile).mockResolvedValue(undefined);

    await expect(
      handleLogin({
        _: [],
        $0: '',
        'access-key-id': 'argAK',
        'access-key-secret': 'argSK'
      } as any)
    ).resolves.toBe(true);

    expect(validateCredentialsModule.validateCredentials).toHaveBeenCalledWith(
      'argAK',
      'argSK'
    );
    expect(logger.success).toHaveBeenCalled();
    expect(fileUtils.updateCliConfigFile).toHaveBeenCalled();
  });

  it('should show error when arg credentials are invalid', async () => {
    vi.mocked(validateCredentialsModule.validateCredentials).mockResolvedValue({
      valid: false,
      message: 'Auth failed'
    });

    await expect(
      handleLogin({
        _: [],
        $0: '',
        'access-key-id': 'badAK',
        'access-key-secret': 'badSK'
      } as any)
    ).resolves.toBe(false);

    expect(logger.error).toHaveBeenCalledWith('Auth failed');
  });

  it('should reject malformed STS credentials and set exit code 1', async () => {
    await expect(
      (login.handler as (argv: any) => Promise<void>)({
        _: [],
        $0: '',
        'sts-token': 'not-a-valid-token'
      })
    ).resolves.toBeUndefined();

    expect(
      validateCredentialsModule.validateCredentials
    ).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });

  it('should reject incomplete non-interactive credentials', async () => {
    await expect(
      handleLogin({
        _: [],
        $0: '',
        'access-key-id': 'only-an-id'
      } as any)
    ).resolves.toBe(false);

    expect(
      validateCredentialsModule.validateCredentials
    ).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      'Both --access-key-id and --access-key-secret are required'
    );
  });

  it('should set exit code 130 when interactive login is cancelled', async () => {
    const cancelled = Symbol('cancelled');
    vi.mocked(fileUtils.getCliConfig).mockReturnValue({} as any);
    vi.mocked(clackSelect).mockResolvedValue(cancelled as never);
    vi.mocked(isCancel).mockImplementation((value) => value === cancelled);

    await expect(
      (login.handler as (argv: any) => Promise<void>)({ _: [], $0: '' })
    ).resolves.toBeUndefined();

    expect(process.exitCode).toBe(130);
  });

  it('should wait for credential persistence before reporting success', async () => {
    const writeError = new Error('Config write failed');
    vi.mocked(validateCredentialsModule.validateCredentials).mockResolvedValue({
      valid: true
    });
    vi.mocked(fileUtils.updateCliConfigFile).mockRejectedValue(writeError);

    await expect(
      handleLogin({
        _: [],
        $0: '',
        'access-key-id': 'argAK',
        'access-key-secret': 'argSK'
      } as any)
    ).rejects.toThrow('Config write failed');

    expect(logger.success).not.toHaveBeenCalled();
  });
});
