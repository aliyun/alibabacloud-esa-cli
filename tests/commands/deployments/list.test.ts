import { it, describe, expect, vi, beforeEach } from 'vitest';

import { displayVersionList } from '../../../src/commands/deploy/helper.js';
import { handleListDeployments } from '../../../src/commands/deployments/list.js';
import {
  checkDirectory,
  checkIsLoginSuccess,
  getRoutineCodeVersions
} from '../../../src/commands/utils.js';
import { ApiService } from '../../../src/libs/apiService.js';
import { validRoutine } from '../../../src/utils/checkIsRoutineCreated.js';
import { getProjectConfig } from '../../../src/utils/fileUtils/index.js';

// Mock all dependencies
vi.mock('../../../src/utils/fileUtils/index.js');
vi.mock('../../../src/commands/utils.js');
vi.mock('../../../src/utils/checkIsRoutineCreated.js');
vi.mock('../../../src/commands/deploy/helper.js');
vi.mock('../../../src/libs/logger.js');

describe('handle display deployments', () => {
  let mockApiService: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock ApiService
    mockApiService = {
      getRoutine: vi.fn(),
      getRoutineStagingEnvIp: vi.fn()
    };

    vi.mocked(ApiService.getInstance).mockResolvedValue(mockApiService);

    // Mock utility functions
    vi.mocked(checkDirectory).mockReturnValue(true);
    vi.mocked(getProjectConfig).mockReturnValue({ name: 'test-project' });
    vi.mocked(checkIsLoginSuccess).mockResolvedValue(true);
    vi.mocked(validRoutine).mockResolvedValue(undefined);
    vi.mocked(getRoutineCodeVersions).mockResolvedValue({
      allVersions: [
        {
          CodeVersion: 'unstable',
          CreateTime: '2025-06-05T09:46:55Z',
          CodeDescription: ''
        } as any,
        {
          CodeVersion: 'v1',
          CreateTime: '2025-06-05T09:46:55Z',
          CodeDescription: 'test'
        } as any,
        {
          CodeVersion: 'v2',
          CreateTime: '2025-06-05T09:46:55Z',
          CodeDescription: 'test2'
        } as any
      ],
      stagingVersions: ['stagingVersion'],
      productionVersions: ['productionVersion']
    });
    vi.mocked(displayVersionList).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should handle display deployments success with full data', async () => {
    mockApiService.getRoutine.mockResolvedValue({
      data: {
        DefaultRelatedRecord: 'https://test.com',
        Envs: [
          {
            Env: 'staging',
            CodeDeploy: { CodeVersions: [{ CodeVersion: 'stagingVersion' }] }
          },
          {
            Env: 'production',
            CodeDeploy: { CodeVersions: [{ CodeVersion: 'productionVersion' }] }
          }
        ]
      }
    });

    mockApiService.getRoutineStagingEnvIp.mockResolvedValue({
      data: { IPV4: ['192.168.1.1', '192.168.1.2'] }
    });

    await handleListDeployments();

    expect(checkDirectory).toHaveBeenCalled();
    expect(getProjectConfig).toHaveBeenCalled();
    expect(checkIsLoginSuccess).toHaveBeenCalled();
    expect(validRoutine).toHaveBeenCalledWith('test-project');
    expect(mockApiService.getRoutine).toHaveBeenCalledWith({
      Name: 'test-project'
    });
    expect(getRoutineCodeVersions).toHaveBeenCalledWith('test-project');
    expect(displayVersionList).toHaveBeenCalled();
  });

  it('should handle display deployments with empty staging IPs', async () => {
    mockApiService.getRoutine.mockResolvedValue({
      data: {
        DefaultRelatedRecord: 'https://test.com',
        Envs: [
          {
            Env: 'staging',
            CodeDeploy: { CodeVersions: [{ CodeVersion: 'stagingVersion' }] }
          },
          {
            Env: 'production',
            CodeDeploy: { CodeVersions: [{ CodeVersion: 'productionVersion' }] }
          }
        ]
      }
    });

    mockApiService.getRoutineStagingEnvIp.mockResolvedValue({
      data: { IPV4: [] }
    });

    await handleListDeployments();

    expect(mockApiService.getRoutineStagingEnvIp).toHaveBeenCalled();
  });

  it('should handle display deployments with null staging IP response', async () => {
    mockApiService.getRoutine.mockResolvedValue({
      data: {
        DefaultRelatedRecord: 'https://test.com',
        Envs: [
          {
            Env: 'staging',
            CodeDeploy: { CodeVersions: [{ CodeVersion: 'stagingVersion' }] }
          },
          {
            Env: 'production',
            CodeDeploy: { CodeVersions: [{ CodeVersion: 'productionVersion' }] }
          }
        ]
      }
    });

    mockApiService.getRoutineStagingEnvIp.mockResolvedValue(null);

    await handleListDeployments();

    expect(mockApiService.getRoutineStagingEnvIp).toHaveBeenCalled();
  });

  it('should handle display deployments with undefined staging IP response', async () => {
    mockApiService.getRoutine.mockResolvedValue({
      data: {
        DefaultRelatedRecord: 'https://test.com',
        Envs: [
          {
            Env: 'staging',
            CodeDeploy: { CodeVersions: [{ CodeVersion: 'stagingVersion' }] }
          },
          {
            Env: 'production',
            CodeDeploy: { CodeVersions: [{ CodeVersion: 'productionVersion' }] }
          }
        ]
      }
    });

    mockApiService.getRoutineStagingEnvIp.mockResolvedValue(undefined);

    await handleListDeployments();

    expect(mockApiService.getRoutineStagingEnvIp).toHaveBeenCalled();
  });

  it('should handle display deployments with empty staging versions', async () => {
    vi.mocked(getRoutineCodeVersions).mockResolvedValue({
      allVersions: [
        {
          CodeVersion: 'unstable',
          CreateTime: '2025-06-05T09:46:55Z',
          CodeDescription: ''
        } as any
      ],
      stagingVersions: [],
      productionVersions: ['productionVersion']
    });

    mockApiService.getRoutine.mockResolvedValue({
      data: {
        DefaultRelatedRecord: 'https://test.com',
        Envs: [
          {
            Env: 'production',
            CodeDeploy: { CodeVersions: [{ CodeVersion: 'productionVersion' }] }
          }
        ]
      }
    });

    mockApiService.getRoutineStagingEnvIp.mockResolvedValue({
      data: { IPV4: ['192.168.1.1'] }
    });

    await handleListDeployments();

    expect(getRoutineCodeVersions).toHaveBeenCalledWith('test-project');
  });

  it('should handle display deployments with empty production versions', async () => {
    vi.mocked(getRoutineCodeVersions).mockResolvedValue({
      allVersions: [
        {
          CodeVersion: 'unstable',
          CreateTime: '2025-06-05T09:46:55Z',
          CodeDescription: ''
        } as any
      ],
      stagingVersions: ['stagingVersion'],
      productionVersions: []
    });

    mockApiService.getRoutine.mockResolvedValue({
      data: {
        DefaultRelatedRecord: 'https://test.com',
        Envs: [
          {
            Env: 'staging',
            CodeDeploy: { CodeVersions: [{ CodeVersion: 'stagingVersion' }] }
          }
        ]
      }
    });

    mockApiService.getRoutineStagingEnvIp.mockResolvedValue({
      data: { IPV4: ['192.168.1.1'] }
    });

    await handleListDeployments();

    expect(getRoutineCodeVersions).toHaveBeenCalledWith('test-project');
  });

  it('should handle display deployments with empty all versions', async () => {
    vi.mocked(getRoutineCodeVersions).mockResolvedValue({
      allVersions: [],
      stagingVersions: [],
      productionVersions: []
    });

    mockApiService.getRoutine.mockResolvedValue({
      data: {
        DefaultRelatedRecord: 'https://test.com',
        Envs: []
      }
    });

    mockApiService.getRoutineStagingEnvIp.mockResolvedValue({
      data: { IPV4: [] }
    });

    await handleListDeployments();

    expect(getRoutineCodeVersions).toHaveBeenCalledWith('test-project');
  });

  it('should handle display deployments with undefined DefaultRelatedRecord', async () => {
    mockApiService.getRoutine.mockResolvedValue({
      data: {
        DefaultRelatedRecord: undefined,
        Envs: [
          {
            Env: 'staging',
            CodeDeploy: { CodeVersions: [{ CodeVersion: 'stagingVersion' }] }
          },
          {
            Env: 'production',
            CodeDeploy: { CodeVersions: [{ CodeVersion: 'productionVersion' }] }
          }
        ]
      }
    });

    mockApiService.getRoutineStagingEnvIp.mockResolvedValue({
      data: { IPV4: ['192.168.1.1'] }
    });

    await handleListDeployments();

    expect(mockApiService.getRoutine).toHaveBeenCalledWith({
      Name: 'test-project'
    });
  });

  it('should handle display deployments with null DefaultRelatedRecord', async () => {
    mockApiService.getRoutine.mockResolvedValue({
      data: {
        DefaultRelatedRecord: null,
        Envs: [
          {
            Env: 'staging',
            CodeDeploy: { CodeVersions: [{ CodeVersion: 'stagingVersion' }] }
          },
          {
            Env: 'production',
            CodeDeploy: { CodeVersions: [{ CodeVersion: 'productionVersion' }] }
          }
        ]
      }
    });

    mockApiService.getRoutineStagingEnvIp.mockResolvedValue({
      data: { IPV4: ['192.168.1.1'] }
    });

    await handleListDeployments();

    expect(mockApiService.getRoutine).toHaveBeenCalledWith({
      Name: 'test-project'
    });
  });

  it('should handle display deployments with complex env structure', async () => {
    mockApiService.getRoutine.mockResolvedValue({
      data: {
        DefaultRelatedRecord: 'https://test.com',
        Envs: [
          {
            Env: 'staging',
            CodeDeploy: {
              CodeVersions: [
                { CodeVersion: 'stagingVersion1' },
                { CodeVersion: 'stagingVersion2' }
              ]
            }
          },
          {
            Env: 'production',
            CodeDeploy: {
              CodeVersions: [
                { CodeVersion: 'productionVersion1' },
                { CodeVersion: 'productionVersion2' }
              ]
            }
          }
        ]
      }
    });

    vi.mocked(getRoutineCodeVersions).mockResolvedValue({
      allVersions: [
        {
          CodeVersion: 'unstable',
          CreateTime: '2025-06-05T09:46:55Z',
          CodeDescription: ''
        } as any
      ],
      stagingVersions: ['stagingVersion1', 'stagingVersion2'],
      productionVersions: ['productionVersion1', 'productionVersion2']
    });

    mockApiService.getRoutineStagingEnvIp.mockResolvedValue({
      data: { IPV4: ['192.168.1.1', '192.168.1.2'] }
    });

    await handleListDeployments();

    expect(getRoutineCodeVersions).toHaveBeenCalledWith('test-project');
  });

  it('should handle display deployments with missing env data', async () => {
    mockApiService.getRoutine.mockResolvedValue({
      data: {
        DefaultRelatedRecord: 'https://test.com',
        Envs: [
          { Env: 'staging' }, // Missing CodeDeploy
          { Env: 'production' } // Missing CodeDeploy
        ]
      }
    });

    vi.mocked(getRoutineCodeVersions).mockResolvedValue({
      allVersions: [
        {
          CodeVersion: 'unstable',
          CreateTime: '2025-06-05T09:46:55Z',
          CodeDescription: ''
        } as any
      ],
      stagingVersions: [],
      productionVersions: []
    });

    mockApiService.getRoutineStagingEnvIp.mockResolvedValue({
      data: { IPV4: [] }
    });

    await handleListDeployments();

    expect(getRoutineCodeVersions).toHaveBeenCalledWith('test-project');
  });

  it('should handle display deployments with missing CodeVersions in env', async () => {
    mockApiService.getRoutine.mockResolvedValue({
      data: {
        DefaultRelatedRecord: 'https://test.com',
        Envs: [
          { Env: 'staging', CodeDeploy: {} }, // Missing CodeVersions
          { Env: 'production', CodeDeploy: {} } // Missing CodeVersions
        ]
      }
    });

    vi.mocked(getRoutineCodeVersions).mockResolvedValue({
      allVersions: [
        {
          CodeVersion: 'unstable',
          CreateTime: '2025-06-05T09:46:55Z',
          CodeDescription: ''
        } as any
      ],
      stagingVersions: [],
      productionVersions: []
    });

    mockApiService.getRoutineStagingEnvIp.mockResolvedValue({
      data: { IPV4: [] }
    });

    await handleListDeployments();

    expect(getRoutineCodeVersions).toHaveBeenCalledWith('test-project');
  });

  it('should handle display deployments with single IP address', async () => {
    mockApiService.getRoutine.mockResolvedValue({
      data: {
        DefaultRelatedRecord: 'https://test.com',
        Envs: [
          {
            Env: 'staging',
            CodeDeploy: { CodeVersions: [{ CodeVersion: 'stagingVersion' }] }
          },
          {
            Env: 'production',
            CodeDeploy: { CodeVersions: [{ CodeVersion: 'productionVersion' }] }
          }
        ]
      }
    });

    mockApiService.getRoutineStagingEnvIp.mockResolvedValue({
      data: { IPV4: ['192.168.1.1'] }
    });

    await handleListDeployments();

    expect(mockApiService.getRoutineStagingEnvIp).toHaveBeenCalled();
  });

  it('should handle display deployments with multiple IP addresses', async () => {
    mockApiService.getRoutine.mockResolvedValue({
      data: {
        DefaultRelatedRecord: 'https://test.com',
        Envs: [
          {
            Env: 'staging',
            CodeDeploy: { CodeVersions: [{ CodeVersion: 'stagingVersion' }] }
          },
          {
            Env: 'production',
            CodeDeploy: { CodeVersions: [{ CodeVersion: 'productionVersion' }] }
          }
        ]
      }
    });

    mockApiService.getRoutineStagingEnvIp.mockResolvedValue({
      data: { IPV4: ['192.168.1.1', '192.168.1.2', '192.168.1.3'] }
    });

    await handleListDeployments();

    expect(mockApiService.getRoutineStagingEnvIp).toHaveBeenCalled();
  });

  it('should handle display deployments with empty envs array', async () => {
    mockApiService.getRoutine.mockResolvedValue({
      data: {
        DefaultRelatedRecord: 'https://test.com',
        Envs: []
      }
    });

    vi.mocked(getRoutineCodeVersions).mockResolvedValue({
      allVersions: [
        {
          CodeVersion: 'unstable',
          CreateTime: '2025-06-05T09:46:55Z',
          CodeDescription: ''
        } as any
      ],
      stagingVersions: [],
      productionVersions: []
    });

    mockApiService.getRoutineStagingEnvIp.mockResolvedValue({
      data: { IPV4: [] }
    });

    await handleListDeployments();

    expect(getRoutineCodeVersions).toHaveBeenCalledWith('test-project');
  });

  it('should handle display deployments with null envs', async () => {
    mockApiService.getRoutine.mockResolvedValue({
      data: {
        DefaultRelatedRecord: 'https://test.com',
        Envs: null
      }
    });

    vi.mocked(getRoutineCodeVersions).mockResolvedValue({
      allVersions: [
        {
          CodeVersion: 'unstable',
          CreateTime: '2025-06-05T09:46:55Z',
          CodeDescription: ''
        } as any
      ],
      stagingVersions: [],
      productionVersions: []
    });

    mockApiService.getRoutineStagingEnvIp.mockResolvedValue({
      data: { IPV4: [] }
    });

    await handleListDeployments();

    expect(getRoutineCodeVersions).toHaveBeenCalledWith('test-project');
  });

  it('should handle display deployments with null routine detail', async () => {
    mockApiService.getRoutine.mockResolvedValue(null);

    await handleListDeployments();

    expect(mockApiService.getRoutine).toHaveBeenCalledWith({
      Name: 'test-project'
    });
  });

  it('should handle display deployments with undefined routine detail', async () => {
    mockApiService.getRoutine.mockResolvedValue(undefined);

    await handleListDeployments();

    expect(mockApiService.getRoutine).toHaveBeenCalledWith({
      Name: 'test-project'
    });
  });

  it('should handle display deployments with empty string project name', async () => {
    vi.mocked(getProjectConfig).mockReturnValue({ name: '' });

    mockApiService.getRoutine.mockResolvedValue({
      data: {
        DefaultRelatedRecord: 'https://test.com',
        Envs: []
      }
    });

    mockApiService.getRoutineStagingEnvIp.mockResolvedValue({
      data: { IPV4: [] }
    });

    await handleListDeployments();

    expect(getProjectConfig).toHaveBeenCalled();
    expect(mockApiService.getRoutine).toHaveBeenCalledWith({ Name: '' });
  });

  it('should handle display deployments with special characters in project name', async () => {
    vi.mocked(getProjectConfig).mockReturnValue({
      name: 'test-project-123_456'
    });

    mockApiService.getRoutine.mockResolvedValue({
      data: {
        DefaultRelatedRecord: 'https://test.com',
        Envs: []
      }
    });

    mockApiService.getRoutineStagingEnvIp.mockResolvedValue({
      data: { IPV4: [] }
    });

    await handleListDeployments();

    expect(getProjectConfig).toHaveBeenCalled();
    expect(mockApiService.getRoutine).toHaveBeenCalledWith({
      Name: 'test-project-123_456'
    });
  });

  it('should handle display deployments with very long project name', async () => {
    const longName = 'a'.repeat(100);
    vi.mocked(getProjectConfig).mockReturnValue({ name: longName });

    mockApiService.getRoutine.mockResolvedValue({
      data: {
        DefaultRelatedRecord: 'https://test.com',
        Envs: []
      }
    });

    mockApiService.getRoutineStagingEnvIp.mockResolvedValue({
      data: { IPV4: [] }
    });

    await handleListDeployments();

    expect(getProjectConfig).toHaveBeenCalled();
    expect(mockApiService.getRoutine).toHaveBeenCalledWith({ Name: longName });
  });

  it('should handle display deployments with very long URL', async () => {
    const longUrl = 'https://' + 'a'.repeat(1000) + '.com';
    mockApiService.getRoutine.mockResolvedValue({
      data: {
        DefaultRelatedRecord: longUrl,
        Envs: []
      }
    });

    mockApiService.getRoutineStagingEnvIp.mockResolvedValue({
      data: { IPV4: [] }
    });

    await handleListDeployments();

    expect(mockApiService.getRoutine).toHaveBeenCalledWith({
      Name: 'test-project'
    });
  });

  it('should handle display deployments with very long IP addresses', async () => {
    const longIp = '192.168.' + '1'.repeat(100) + '.1';
    mockApiService.getRoutine.mockResolvedValue({
      data: {
        DefaultRelatedRecord: 'https://test.com',
        Envs: []
      }
    });

    mockApiService.getRoutineStagingEnvIp.mockResolvedValue({
      data: { IPV4: [longIp] }
    });

    await handleListDeployments();

    expect(mockApiService.getRoutineStagingEnvIp).toHaveBeenCalled();
  });

  it('should handle display deployments with mixed data types in versions', async () => {
    vi.mocked(getRoutineCodeVersions).mockResolvedValue({
      allVersions: [
        {
          CodeVersion: 'unstable',
          CreateTime: '2025-06-05T09:46:55Z',
          CodeDescription: ''
        } as any,
        {
          CodeVersion: 123, // Number instead of string
          CreateTime: '2025-06-05T09:46:55Z',
          CodeDescription: null
        } as any,
        {
          CodeVersion: undefined, // Undefined
          CreateTime: null,
          CodeDescription: undefined
        } as any
      ],
      stagingVersions: ['stagingVersion'],
      productionVersions: ['productionVersion']
    });

    mockApiService.getRoutine.mockResolvedValue({
      data: {
        DefaultRelatedRecord: 'https://test.com',
        Envs: [
          {
            Env: 'staging',
            CodeDeploy: { CodeVersions: [{ CodeVersion: 'stagingVersion' }] }
          },
          {
            Env: 'production',
            CodeDeploy: { CodeVersions: [{ CodeVersion: 'productionVersion' }] }
          }
        ]
      }
    });

    mockApiService.getRoutineStagingEnvIp.mockResolvedValue({
      data: { IPV4: ['192.168.1.1'] }
    });

    await handleListDeployments();

    expect(getRoutineCodeVersions).toHaveBeenCalledWith('test-project');
  });

  it('should handle display deployments with API service errors', async () => {
    mockApiService.getRoutine.mockRejectedValue(new Error('API Error'));

    await expect(handleListDeployments()).rejects.toThrow('API Error');

    expect(mockApiService.getRoutine).toHaveBeenCalledWith({
      Name: 'test-project'
    });
  });

  it('should handle display deployments with staging IP API errors', async () => {
    mockApiService.getRoutine.mockResolvedValue({
      data: {
        DefaultRelatedRecord: 'https://test.com',
        Envs: []
      }
    });

    mockApiService.getRoutineStagingEnvIp.mockRejectedValue(
      new Error('Staging IP API Error')
    );

    await expect(handleListDeployments()).rejects.toThrow(
      'Staging IP API Error'
    );

    expect(mockApiService.getRoutineStagingEnvIp).toHaveBeenCalled();
  });

  it('should handle display deployments with getRoutineCodeVersions errors', async () => {
    vi.mocked(getRoutineCodeVersions).mockRejectedValue(
      new Error('Code Versions API Error')
    );

    mockApiService.getRoutine.mockResolvedValue({
      data: {
        DefaultRelatedRecord: 'https://test.com',
        Envs: []
      }
    });

    await expect(handleListDeployments()).rejects.toThrow(
      'Code Versions API Error'
    );

    expect(getRoutineCodeVersions).toHaveBeenCalledWith('test-project');
  });

  it('should handle display deployments with displayVersionList errors', async () => {
    vi.mocked(displayVersionList).mockRejectedValue(
      new Error('Display Version List Error')
    );

    mockApiService.getRoutine.mockResolvedValue({
      data: {
        DefaultRelatedRecord: 'https://test.com',
        Envs: []
      }
    });

    mockApiService.getRoutineStagingEnvIp.mockResolvedValue({
      data: { IPV4: [] }
    });

    await expect(handleListDeployments()).rejects.toThrow(
      'Display Version List Error'
    );

    expect(displayVersionList).toHaveBeenCalled();
  });

  it('should handle display deployments with validRoutine errors', async () => {
    vi.mocked(validRoutine).mockRejectedValue(new Error('Valid Routine Error'));

    mockApiService.getRoutine.mockResolvedValue({
      data: {
        DefaultRelatedRecord: 'https://test.com',
        Envs: []
      }
    });

    await expect(handleListDeployments()).rejects.toThrow(
      'Valid Routine Error'
    );

    expect(validRoutine).toHaveBeenCalledWith('test-project');
  });

  it('should handle display deployments with checkIsLoginSuccess returning false', async () => {
    vi.mocked(checkIsLoginSuccess).mockResolvedValue(false);

    await handleListDeployments();

    expect(checkIsLoginSuccess).toHaveBeenCalled();
    expect(mockApiService.getRoutine).not.toHaveBeenCalled();
  });

  it('should handle display deployments with checkDirectory returning false', async () => {
    vi.mocked(checkDirectory).mockReturnValue(false);

    await handleListDeployments();

    expect(checkDirectory).toHaveBeenCalled();
    expect(getProjectConfig).not.toHaveBeenCalled();
  });

  it('should handle display deployments with getProjectConfig returning null', async () => {
    vi.mocked(getProjectConfig).mockReturnValue(null);

    await handleListDeployments();

    expect(getProjectConfig).toHaveBeenCalled();
    expect(checkIsLoginSuccess).not.toHaveBeenCalled();
  });

  it('should handle display deployments with getProjectConfig returning undefined', async () => {
    vi.mocked(getProjectConfig).mockReturnValue(undefined as any);

    await handleListDeployments();

    expect(getProjectConfig).toHaveBeenCalled();
    expect(checkIsLoginSuccess).not.toHaveBeenCalled();
  });
});
