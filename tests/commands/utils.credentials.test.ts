import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const server = { updateConfig: vi.fn() };
  return {
    apiUpdateConfig: vi.fn(),
    getApiConfig: vi.fn(),
    getCliConfig: vi.fn(),
    getCredentialResolution: vi.fn(),
    getIncompleteCredentialsMessage: vi.fn(),
    getProjectConfig: vi.fn(),
    loggerError: vi.fn(),
    loggerLog: vi.fn(),
    server,
    validateCredentials: vi.fn()
  };
});

vi.unmock('../../src/commands/utils.js');
vi.mock('../../src/utils/fileUtils/index.js', () => ({
  getApiConfig: mocks.getApiConfig,
  getCliConfig: mocks.getCliConfig,
  getCredentialResolution: mocks.getCredentialResolution,
  getIncompleteCredentialsMessage: mocks.getIncompleteCredentialsMessage,
  getProjectConfig: mocks.getProjectConfig,
  projectConfigPath: '/tmp/esa.jsonc'
}));
vi.mock('../../src/utils/validateCredentials.js', () => ({
  validateCredentials: mocks.validateCredentials
}));
vi.mock('../../src/libs/apiService.js', () => ({
  ApiService: {
    getInstance: vi.fn().mockResolvedValue(mocks.server)
  }
}));
vi.mock('../../src/libs/api.js', () => ({
  default: { updateConfig: mocks.apiUpdateConfig }
}));
vi.mock('../../src/libs/logger.js', () => ({
  default: {
    error: mocks.loggerError,
    log: mocks.loggerLog,
    notInProject: vi.fn(),
    success: vi.fn(),
    warn: vi.fn()
  }
}));
vi.mock('../../src/i18n/index.js', () => ({
  default: () => ({ d: (defaultValue: string) => defaultValue })
}));

import { checkIsLoginSuccess } from '../../src/commands/utils.js';

describe('checkIsLoginSuccess credential resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = undefined;
    mocks.getIncompleteCredentialsMessage.mockReturnValue(
      'Incomplete credentials in ESA_*.'
    );
    mocks.getProjectConfig.mockReturnValue(null);
    mocks.getCliConfig.mockReturnValue({
      auth: {
        accessKeyId: 'stale-saved-id',
        accessKeySecret: 'stale-saved-secret',
        securityToken: 'stale-saved-token'
      }
    });
  });

  afterEach(() => {
    process.exitCode = undefined;
    delete process.env.ALIBABA_CLOUD_ESA_CLI_COMPAT_MODE;
  });

  it('validates and installs the complete credentials selected by getApiConfig', async () => {
    const config = {
      auth: {
        accessKeyId: 'resolved-esa-id',
        accessKeySecret: 'resolved-esa-secret',
        securityToken: 'resolved-esa-token'
      },
      endpoint: 'resolved.example.com'
    };
    mocks.getCredentialResolution.mockReturnValue({
      status: 'resolved',
      source: 'environment-esa',
      auth: config.auth
    });
    mocks.getApiConfig.mockReturnValue(config);
    mocks.validateCredentials.mockResolvedValue({ valid: true });

    await expect(checkIsLoginSuccess()).resolves.toBe(true);

    expect(mocks.validateCredentials).toHaveBeenCalledWith(
      'resolved-esa-id',
      'resolved-esa-secret',
      'resolved-esa-token'
    );
    expect(mocks.server.updateConfig).toHaveBeenCalledWith(config);
    expect(mocks.apiUpdateConfig).toHaveBeenCalledWith(config);
    expect(process.exitCode).toBeUndefined();
  });

  it('does not validate an incomplete resolved credential group', async () => {
    mocks.getCredentialResolution.mockReturnValue({
      status: 'incomplete',
      source: 'environment-esa'
    });
    mocks.getApiConfig.mockReturnValue({
      auth: {
        accessKeyId: 'incomplete-id',
        accessKeySecret: '',
        securityToken: undefined
      },
      endpoint: 'resolved.example.com'
    });

    await expect(checkIsLoginSuccess()).resolves.toBe(false);

    expect(mocks.validateCredentials).not.toHaveBeenCalled();
    expect(mocks.server.updateConfig).not.toHaveBeenCalled();
    expect(mocks.apiUpdateConfig).not.toHaveBeenCalled();
    expect(mocks.loggerError).toHaveBeenCalledWith(
      'Incomplete credentials in ESA_*.'
    );
    expect(process.exitCode).toBe(1);
  });

  it('uses the endpoint that successfully validated environment credentials', async () => {
    const config = {
      auth: {
        accessKeyId: 'international-id',
        accessKeySecret: 'international-secret'
      },
      endpoint: 'esa.cn-hangzhou.aliyuncs.com'
    };
    mocks.getCredentialResolution.mockReturnValue({
      status: 'resolved',
      source: 'environment-alibaba-cloud',
      auth: config.auth
    });
    mocks.getApiConfig.mockReturnValue(config);
    mocks.validateCredentials.mockResolvedValue({
      valid: true,
      endpoint: 'esa.ap-southeast-1.aliyuncs.com'
    });

    await expect(checkIsLoginSuccess()).resolves.toBe(true);

    const expectedConfig = {
      ...config,
      endpoint: 'esa.ap-southeast-1.aliyuncs.com'
    };
    expect(mocks.server.updateConfig).toHaveBeenCalledWith(expectedConfig);
    expect(mocks.apiUpdateConfig).toHaveBeenCalledWith(expectedConfig);
    expect(process.exitCode).toBeUndefined();
  });

  it('keeps an endpoint explicitly configured by the project', async () => {
    const config = {
      auth: {
        accessKeyId: 'project-endpoint-id',
        accessKeySecret: 'project-endpoint-secret'
      },
      endpoint: 'project-proxy.example.com'
    };
    mocks.getCredentialResolution.mockReturnValue({
      status: 'resolved',
      source: 'environment-esa',
      auth: config.auth
    });
    mocks.getApiConfig.mockReturnValue(config);
    mocks.getProjectConfig.mockReturnValue({
      endpoint: 'project-proxy.example.com'
    });
    mocks.validateCredentials.mockResolvedValue({
      valid: true,
      endpoint: 'esa.ap-southeast-1.aliyuncs.com'
    });

    await expect(checkIsLoginSuccess()).resolves.toBe(true);

    expect(mocks.server.updateConfig).toHaveBeenCalledWith(config);
    expect(mocks.apiUpdateConfig).toHaveBeenCalledWith(config);
    expect(process.exitCode).toBeUndefined();
  });

  it('sets a failure exit code when the selected credential group is invalid', async () => {
    const config = {
      auth: {
        accessKeyId: 'invalid-id',
        accessKeySecret: 'invalid-secret'
      },
      endpoint: 'esa.cn-hangzhou.aliyuncs.com'
    };
    mocks.getCredentialResolution.mockReturnValue({
      status: 'resolved',
      source: 'environment-esa',
      auth: config.auth
    });
    mocks.getApiConfig.mockReturnValue(config);
    mocks.validateCredentials.mockResolvedValue({
      valid: false,
      message: 'Invalid credentials'
    });

    await expect(checkIsLoginSuccess()).resolves.toBe(false);

    expect(mocks.server.updateConfig).not.toHaveBeenCalled();
    expect(mocks.apiUpdateConfig).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });

  it('uses the compatibility command name in the login instruction', async () => {
    process.env.ALIBABA_CLOUD_ESA_CLI_COMPAT_MODE = 'aliyun esa-cli';
    mocks.getCredentialResolution.mockReturnValue({ status: 'none' });
    mocks.getApiConfig.mockReturnValue({
      auth: {
        accessKeyId: '',
        accessKeySecret: ''
      },
      endpoint: 'esa.cn-hangzhou.aliyuncs.com'
    });

    await expect(checkIsLoginSuccess()).resolves.toBe(false);

    expect(mocks.loggerLog).toHaveBeenCalledWith(
      expect.stringContaining('aliyun esa-cli login')
    );
    expect(process.exitCode).toBe(1);
  });
});
