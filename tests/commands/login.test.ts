import { describe, expect, it, vi, beforeEach } from 'vitest';

import { handleLogin } from '../../src/commands/login/index.js';
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
  });

  it('should login via env vars when ALIBABA_CLOUD_* is set', async () => {
    process.env.ALIBABA_CLOUD_ACCESS_KEY_ID = 'testAK';
    process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET = 'testSK';

    vi.mocked(validateCredentialsModule.validateCredentials).mockResolvedValue({
      valid: true,
      endpoint: 'https://esa.aliyuncs.com'
    });

    await handleLogin();

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

    await handleLogin();

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

    await handleLogin();

    expect(logger.error).toHaveBeenCalledWith('Invalid credentials');
  });

  it('should login via --access-key-id and --access-key-secret args', async () => {
    vi.mocked(validateCredentialsModule.validateCredentials).mockResolvedValue({
      valid: true,
      endpoint: 'https://esa.aliyuncs.com'
    });
    vi.mocked(fileUtils.updateCliConfigFile).mockResolvedValue(undefined);

    await handleLogin({
      _: [],
      $0: '',
      'access-key-id': 'argAK',
      'access-key-secret': 'argSK'
    } as any);

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

    await handleLogin({
      _: [],
      $0: '',
      'access-key-id': 'badAK',
      'access-key-secret': 'badSK'
    } as any);

    expect(logger.error).toHaveBeenCalledWith('Auth failed');
  });
});
