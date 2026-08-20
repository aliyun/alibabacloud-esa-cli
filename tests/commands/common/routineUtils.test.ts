import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  commitAndDeployVersion,
  commitRoutineWithAssets,
  deployCodeVersion,
  deployCodeVersions,
  deployWithVersionPercentages,
  generateCodeVersion,
  getDeployPreviewUrl,
  validateAndInitializeProject,
  waitForCodeVersionReady
} from '../../../src/commands/common/utils.js';
import { checkIsLoginSuccess } from '../../../src/commands/utils.js';
import { ApiService } from '../../../src/libs/apiService.js';
import logger from '../../../src/libs/logger.js';
import { ensureRoutineExists } from '../../../src/utils/checkIsRoutineCreated.js';
import { getProjectConfig } from '../../../src/utils/fileUtils/index.js';
import sleep from '../../../src/utils/sleep.js';

vi.mock('../../../src/libs/apiService.js');
vi.mock('../../../src/commands/utils.js', () => ({
  checkIsLoginSuccess: vi.fn()
}));
vi.mock('../../../src/utils/compress.js', () => ({
  default: vi.fn().mockResolvedValue({
    zip: { toBuffer: () => Buffer.from('test') },
    sourceList: [],
    dynamicSources: []
  })
}));
vi.mock('../../../src/utils/fileUtils/index.js');
vi.mock('../../../src/utils/checkIsRoutineCreated.js', () => ({
  ensureRoutineExists: vi.fn()
}));
vi.mock('../../../src/utils/sleep.js', () => ({
  default: vi.fn()
}));
vi.mock('../../../src/libs/logger.js', () => ({
  default: {
    log: vi.fn(),
    error: vi.fn(),
    block: vi.fn(),
    startSubStep: vi.fn(),
    endSubStep: vi.fn(),
    notInProject: vi.fn()
  }
}));

describe('routineUtils', () => {
  const mockApiService = () => ({
    CreateRoutineWithAssetsCodeVersion: vi.fn().mockResolvedValue({
      code: '200',
      data: {
        CodeVersion: 'test-version',
        OssPostConfig: {
          Url: 'test-url',
          OSSAccessKeyId: 'test-key',
          Signature: 'test-signature',
          Key: 'test-key',
          Policy: 'test-policy'
        }
      }
    }),
    uploadToOss: vi.fn().mockResolvedValue(true),
    getRoutineCodeVersionInfo: vi.fn().mockResolvedValue({
      data: { Status: 'available' }
    }),
    createRoutineCodeDeployment: vi
      .fn()
      .mockImplementation(({ Env, CodeVersions }) => ({
        data: {
          RequestId: `request-${Env}`,
          Strategy: 'percentage',
          DeploymentId: `deployment-${Env}`,
          CodeVersions
        }
      })),
    getRoutine: vi.fn().mockResolvedValue({
      data: { DefaultRelatedRecord: 'routine.example.com' }
    }),
    getRoutineAccessToken: vi.fn().mockResolvedValue({
      data: { Token: 'token' }
    })
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkIsLoginSuccess).mockResolvedValue(true);
    vi.mocked(ensureRoutineExists).mockResolvedValue(undefined);
    vi.mocked(sleep).mockResolvedValue(undefined);
    vi.mocked(getProjectConfig).mockReturnValue({
      name: 'test-project',
      entry: 'src/index.ts',
      assets: {
        directory: 'dist'
      }
    } as any);
  });

  describe('commitRoutineWithAssets', () => {
    it('should upload to oss when create response contains complete oss config', async () => {
      const server = mockApiService();
      (ApiService.getInstance as any).mockResolvedValue(server);

      const result = await commitRoutineWithAssets(
        { Name: 'test-project' },
        Buffer.from('zip')
      );

      expect(server.CreateRoutineWithAssetsCodeVersion).toHaveBeenCalledWith({
        Name: 'test-project'
      });
      expect(server.uploadToOss).toHaveBeenCalledWith(
        {
          OSSAccessKeyId: 'test-key',
          Signature: 'test-signature',
          Url: 'test-url',
          Key: 'test-key',
          Policy: 'test-policy',
          XOssSecurityToken: ''
        },
        Buffer.from('zip')
      );
      expect(result?.isSuccess).toBe(true);
    });

    it('should return failed result when oss config is missing', async () => {
      const server = mockApiService();
      server.CreateRoutineWithAssetsCodeVersion.mockResolvedValue({
        data: {}
      });
      (ApiService.getInstance as any).mockResolvedValue(server);

      const result = await commitRoutineWithAssets(
        { Name: 'test-project' },
        Buffer.from('zip')
      );

      expect(server.uploadToOss).not.toHaveBeenCalled();
      expect(result).toEqual({ isSuccess: false, res: null });
    });

    it('should return failed result when required oss fields are incomplete', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const server = mockApiService();
      server.CreateRoutineWithAssetsCodeVersion.mockResolvedValue({
        data: {
          OssPostConfig: {
            Url: 'test-url',
            OSSAccessKeyId: '',
            Signature: 'test-signature',
            Key: 'test-key',
            Policy: 'test-policy'
          }
        }
      });
      (ApiService.getInstance as any).mockResolvedValue(server);

      const result = await commitRoutineWithAssets(
        { Name: 'test-project' },
        Buffer.from('zip')
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        'Missing required OSS configuration fields'
      );
      expect(server.uploadToOss).not.toHaveBeenCalled();
      expect(result).toEqual({ isSuccess: false, res: null });
      consoleSpy.mockRestore();
    });

    it('should catch api errors and return failed result', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      (ApiService.getInstance as any).mockRejectedValue(new Error('boom'));

      const result = await commitRoutineWithAssets(
        { Name: 'test-project' },
        Buffer.from('zip')
      );

      expect(result).toEqual({ isSuccess: false, res: null });
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error in createRoutineWithAssetsCodeVersion:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe('validateAndInitializeProject', () => {
    it('should derive project info, check login, and ensure the routine exists', async () => {
      vi.mocked(getProjectConfig).mockReturnValue({
        name: 'config-project'
      } as any);

      const result = await validateAndInitializeProject(undefined, '/project');

      expect(result).toEqual({
        projectConfig: { name: 'config-project' },
        projectName: 'config-project'
      });
      expect(checkIsLoginSuccess).toHaveBeenCalled();
      expect(ensureRoutineExists).toHaveBeenCalledWith('config-project');
      expect(logger.endSubStep).toHaveBeenCalledWith('Logged in');
    });

    it('should return null when login check fails', async () => {
      vi.mocked(checkIsLoginSuccess).mockResolvedValue(false);

      const result = await validateAndInitializeProject('test-project');

      expect(result).toBeNull();
      expect(ensureRoutineExists).not.toHaveBeenCalled();
      expect(logger.endSubStep).toHaveBeenCalledWith('You are not logged in');
    });
  });

  describe('generateCodeVersion', () => {
    it('should normalize singlePageApplication to SinglePageApplication', async () => {
      const mockProjectConfig = {
        name: 'test-project',
        assets: {
          directory: './dist',
          notFoundStrategy: 'singlePageApplication'
        }
      };

      (getProjectConfig as any).mockReturnValue(mockProjectConfig);

      const mockApiService = {
        CreateRoutineWithAssetsCodeVersion: vi.fn().mockResolvedValue({
          code: '200',
          data: {
            CodeVersion: 'test-version',
            OssPostConfig: {
              Url: 'test-url',
              OSSAccessKeyId: 'test-key',
              Signature: 'test-signature',
              Key: 'test-key',
              Policy: 'test-policy'
            }
          }
        }),
        uploadToOss: vi.fn().mockResolvedValue(true)
      };

      (ApiService.getInstance as any).mockResolvedValue(mockApiService);

      const result = await generateCodeVersion(
        'test-project',
        'test description',
        undefined,
        undefined,
        false,
        undefined
      );

      expect(
        mockApiService.CreateRoutineWithAssetsCodeVersion
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          Name: 'test-project',
          CodeDescription: 'test description',
          ConfOptions: {
            NotFoundStrategy: 'SinglePageApplication'
          }
        })
      );

      expect(result?.isSuccess).toBe(true);
    });

    it('should pass any notFoundStrategy value to API', async () => {
      const mockProjectConfig = {
        name: 'test-project',
        assets: {
          directory: './dist',
          notFoundStrategy: 'customStrategy'
        }
      };

      (getProjectConfig as any).mockReturnValue(mockProjectConfig);

      const mockApiService = {
        CreateRoutineWithAssetsCodeVersion: vi.fn().mockResolvedValue({
          code: '200',
          data: {
            CodeVersion: 'test-version',
            OssPostConfig: {
              Url: 'test-url',
              OSSAccessKeyId: 'test-key',
              Signature: 'test-signature',
              Key: 'test-key',
              Policy: 'test-policy'
            }
          }
        }),
        uploadToOss: vi.fn().mockResolvedValue(true)
      };

      (ApiService.getInstance as any).mockResolvedValue(mockApiService);

      const result = await generateCodeVersion(
        'test-project',
        'test description',
        undefined,
        undefined,
        false,
        undefined
      );

      expect(
        mockApiService.CreateRoutineWithAssetsCodeVersion
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          Name: 'test-project',
          CodeDescription: 'test description',
          ConfOptions: {
            NotFoundStrategy: 'customStrategy'
          }
        })
      );

      expect(result?.isSuccess).toBe(true);
    });

    it('should not pass ConfOptions when notFoundStrategy is not configured', async () => {
      const mockProjectConfig = {
        name: 'test-project',
        assets: {
          directory: './dist'
        }
      };

      (getProjectConfig as any).mockReturnValue(mockProjectConfig);

      const mockApiService = {
        CreateRoutineWithAssetsCodeVersion: vi.fn().mockResolvedValue({
          code: '200',
          data: {
            CodeVersion: 'test-version',
            OssPostConfig: {
              Url: 'test-url',
              OSSAccessKeyId: 'test-key',
              Signature: 'test-signature',
              Key: 'test-key',
              Policy: 'test-policy'
            }
          }
        }),
        uploadToOss: vi.fn().mockResolvedValue(true)
      };

      (ApiService.getInstance as any).mockResolvedValue(mockApiService);

      const result = await generateCodeVersion(
        'test-project',
        'test description',
        undefined,
        undefined,
        false,
        undefined
      );

      const callArgs =
        mockApiService.CreateRoutineWithAssetsCodeVersion.mock.calls[0][0];
      expect(callArgs.Name).toBe('test-project');
      expect(callArgs.CodeDescription).toBe('test description');
      expect(callArgs.ConfOptions).toBeUndefined();

      expect(result?.isSuccess).toBe(true);
    });
  });

  describe('waitForCodeVersionReady', () => {
    it('should return false when name or code version is missing', async () => {
      await expect(
        waitForCodeVersionReady('', 'v1', 'production')
      ).resolves.toBe(false);
      await expect(
        waitForCodeVersionReady('test-project', '', 'production')
      ).resolves.toBe(false);
    });

    it('should poll while status is init and return true when available', async () => {
      const server = mockApiService();
      server.getRoutineCodeVersionInfo
        .mockResolvedValueOnce({ data: { Status: 'init' } })
        .mockResolvedValueOnce({ data: { Status: 'available' } });
      (ApiService.getInstance as any).mockResolvedValue(server);

      const result = await waitForCodeVersionReady(
        'test-project',
        'v1',
        'staging',
        100,
        5
      );

      expect(result).toBe(true);
      expect(sleep).toHaveBeenCalledWith(5);
      expect(server.getRoutineCodeVersionInfo).toHaveBeenCalledTimes(2);
    });

    it('should return false when status is not available', async () => {
      const server = mockApiService();
      server.getRoutineCodeVersionInfo.mockResolvedValue({
        data: { Status: 'failed' }
      });
      (ApiService.getInstance as any).mockResolvedValue(server);

      await expect(
        waitForCodeVersionReady('test-project', 'v1', 'production')
      ).resolves.toBe(false);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('build failed')
      );
    });
  });

  describe('getDeployPreviewUrl', () => {
    it('normalizes hostnames and preserves absolute URLs', async () => {
      const server = mockApiService();
      (ApiService.getInstance as any).mockResolvedValue(server);

      await expect(getDeployPreviewUrl('test-project')).resolves.toBe(
        'https://routine.example.com'
      );

      server.getRoutine.mockResolvedValue({
        data: { DefaultRelatedRecord: 'http://routine.example.com/path' }
      });
      await expect(getDeployPreviewUrl('test-project')).resolves.toBe(
        'http://routine.example.com/path'
      );
    });

    it('returns null when preview metadata lookup fails', async () => {
      (ApiService.getInstance as any).mockRejectedValue(new Error('offline'));

      await expect(getDeployPreviewUrl('test-project')).resolves.toBeNull();
    });
  });

  describe('deploy helpers', () => {
    it('should deploy a ready code version', async () => {
      const server = mockApiService();
      (ApiService.getInstance as any).mockResolvedValue(server);

      const result = await deployCodeVersion('test-project', 'v1', 'staging');

      expect(result).toEqual({
        environment: 'staging',
        deploymentId: 'deployment-staging',
        codeVersions: [{ codeVersion: 'v1', percentage: 100 }]
      });
      expect(server.createRoutineCodeDeployment).toHaveBeenCalledWith({
        Name: 'test-project',
        CodeVersions: [{ Percentage: 100, CodeVersion: 'v1' }],
        Strategy: 'percentage',
        Env: 'staging'
      });
    });

    it('should not deploy when code version is not ready', async () => {
      const server = mockApiService();
      server.getRoutineCodeVersionInfo.mockResolvedValue({
        data: { Status: 'failed' }
      });
      (ApiService.getInstance as any).mockResolvedValue(server);

      const result = await deployCodeVersion('test-project', 'v1', 'staging');

      expect(result).toBeNull();
      expect(server.createRoutineCodeDeployment).not.toHaveBeenCalled();
    });

    it('should deploy weighted versions to all environments', async () => {
      const server = mockApiService();
      (ApiService.getInstance as any).mockResolvedValue(server);

      const result = await deployCodeVersions(
        'test-project',
        [
          { codeVersion: 'v1', percentage: 80 },
          { codeVersion: 'v2', percentage: 20 }
        ],
        'all'
      );

      expect(result).toEqual({
        success: true,
        deployments: [
          {
            environment: 'staging',
            deploymentId: 'deployment-staging',
            codeVersions: [
              { codeVersion: 'v1', percentage: 80 },
              { codeVersion: 'v2', percentage: 20 }
            ]
          },
          {
            environment: 'production',
            deploymentId: 'deployment-production',
            codeVersions: [
              { codeVersion: 'v1', percentage: 80 },
              { codeVersion: 'v2', percentage: 20 }
            ]
          }
        ]
      });
      expect(server.createRoutineCodeDeployment).toHaveBeenCalledTimes(2);
      expect(server.createRoutineCodeDeployment).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ Env: 'staging' })
      );
      expect(server.createRoutineCodeDeployment).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ Env: 'production' })
      );
    });

    it('should preserve a successful environment when another environment fails', async () => {
      const server = mockApiService();
      server.createRoutineCodeDeployment
        .mockResolvedValueOnce({
          data: { DeploymentId: 'deployment-staging' }
        })
        .mockResolvedValueOnce(null);
      (ApiService.getInstance as any).mockResolvedValue(server);

      const result = await deployCodeVersions(
        'test-project',
        [{ codeVersion: 'v1', percentage: 100 }],
        'all'
      );

      expect(result).toEqual({
        success: false,
        deployments: [
          {
            environment: 'staging',
            deploymentId: 'deployment-staging',
            codeVersions: [{ codeVersion: 'v1', percentage: 100 }]
          }
        ]
      });
    });

    it('should accept an HTTP-success response even when deployment id is absent', async () => {
      const server = mockApiService();
      server.createRoutineCodeDeployment.mockResolvedValue({ data: {} });
      (ApiService.getInstance as any).mockResolvedValue(server);

      await expect(
        deployCodeVersion('test-project', 'v1', 'production')
      ).resolves.toEqual({
        environment: 'production',
        deploymentId: null,
        codeVersions: [{ codeVersion: 'v1', percentage: 100 }]
      });
    });

    it('should prefer the code versions confirmed by the deployment response', async () => {
      const server = mockApiService();
      server.createRoutineCodeDeployment.mockResolvedValue({
        data: {
          DeploymentId: 'deployment-production',
          CodeVersions: [{ CodeVersion: 'confirmed-v1', Percentage: 100 }]
        }
      });
      (ApiService.getInstance as any).mockResolvedValue(server);

      await expect(
        deployCodeVersion('test-project', 'requested-v1', 'production')
      ).resolves.toEqual({
        environment: 'production',
        deploymentId: 'deployment-production',
        codeVersions: [{ codeVersion: 'confirmed-v1', percentage: 100 }]
      });
    });

    it('should fall back to requested versions when any response version is invalid', async () => {
      const server = mockApiService();
      server.createRoutineCodeDeployment.mockResolvedValue({
        data: {
          DeploymentId: 'deployment-production',
          CodeVersions: [
            { CodeVersion: 'v1', Percentage: 80 },
            { CodeVersion: '', Percentage: 20 }
          ]
        }
      });
      (ApiService.getInstance as any).mockResolvedValue(server);

      await expect(
        deployCodeVersions(
          'test-project',
          [
            { codeVersion: 'v1', percentage: 80 },
            { codeVersion: 'v2', percentage: 20 }
          ],
          'production'
        )
      ).resolves.toMatchObject({
        deployments: [
          {
            codeVersions: [
              { codeVersion: 'v1', percentage: 80 },
              { codeVersion: 'v2', percentage: 20 }
            ]
          }
        ]
      });
    });

    it('should fall back when response percentages do not describe a complete rollout', async () => {
      const server = mockApiService();
      server.createRoutineCodeDeployment.mockResolvedValue({
        data: {
          DeploymentId: 'deployment-production',
          CodeVersions: [{ CodeVersion: 'v1', Percentage: 80 }]
        }
      });
      (ApiService.getInstance as any).mockResolvedValue(server);

      await expect(
        deployCodeVersions(
          'test-project',
          [
            { codeVersion: 'v1', percentage: 80 },
            { codeVersion: 'v2', percentage: 20 }
          ],
          'production'
        )
      ).resolves.toMatchObject({
        deployments: [
          {
            codeVersions: [
              { codeVersion: 'v1', percentage: 80 },
              { codeVersion: 'v2', percentage: 20 }
            ]
          }
        ]
      });
    });

    it('should deploy an existing version through commitAndDeployVersion', async () => {
      const server = mockApiService();
      (ApiService.getInstance as any).mockResolvedValue(server);

      const result = await commitAndDeployVersion(
        'test-project',
        undefined,
        undefined,
        '',
        undefined,
        'production',
        false,
        'v1'
      );

      expect(result).toMatchObject({
        success: true,
        app: 'test-project',
        deployments: [
          {
            environment: 'production',
            deploymentId: 'deployment-production',
            codeVersions: [{ codeVersion: 'v1', percentage: 100 }]
          }
        ]
      });
      expect(server.createRoutineCodeDeployment).toHaveBeenCalledWith(
        expect.objectContaining({
          Name: 'test-project',
          Env: 'production'
        })
      );
    });

    it('should return the generated version deployment details', async () => {
      const server = mockApiService();
      (ApiService.getInstance as any).mockResolvedValue(server);

      const result = await commitAndDeployVersion(
        'test-project',
        undefined,
        undefined,
        '',
        undefined,
        'staging'
      );

      expect(result).toMatchObject({
        success: true,
        app: 'test-project',
        deployments: [
          {
            environment: 'staging',
            deploymentId: 'deployment-staging',
            codeVersions: [{ codeVersion: 'test-version', percentage: 100 }]
          }
        ]
      });
    });
  });

  describe('deployWithVersionPercentages', () => {
    it('should reject an empty versions option', async () => {
      await expect(
        deployWithVersionPercentages('test-project', [], 'production')
      ).resolves.toMatchObject({ success: false, deployments: [] });

      expect(logger.error).toHaveBeenCalledWith(
        'Deploy failed: --versions requires at least one version'
      );
    });

    it('should reject more than two versions', async () => {
      await expect(
        deployWithVersionPercentages(
          'test-project',
          ['v1:50,v2:30,v3:20'],
          'production'
        )
      ).resolves.toMatchObject({ success: false, deployments: [] });

      expect(logger.error).toHaveBeenCalledWith(
        'Deploy failed: at most two versions are supported'
      );
    });

    it('should reject invalid version percentage format', async () => {
      await expect(
        deployWithVersionPercentages('test-project', ['v1:not-a-number'], 'all')
      ).resolves.toMatchObject({ success: false, deployments: [] });

      expect(logger.error).toHaveBeenCalledWith(
        'Deploy failed: invalid --versions format. Use v1:80,v2:20'
      );
    });

    it('should reject single version that is not 100 percent', async () => {
      await expect(
        deployWithVersionPercentages('test-project', ['v1:80'], 'production')
      ).resolves.toMatchObject({ success: false, deployments: [] });

      expect(logger.error).toHaveBeenCalledWith(
        'Deploy failed: single version must be 100%'
      );
    });

    it('should reject two versions whose percentages do not sum to 100', async () => {
      await expect(
        deployWithVersionPercentages('test-project', ['v1:80,v2:10'], 'all')
      ).resolves.toMatchObject({ success: false, deployments: [] });

      expect(logger.error).toHaveBeenCalledWith(
        'Deploy failed: percentages must sum to 100'
      );
    });

    it('should deploy valid version percentages and return the rollout', async () => {
      const server = mockApiService();
      (ApiService.getInstance as any).mockResolvedValue(server);

      await expect(
        deployWithVersionPercentages('test-project', ['v1:70,v2:30'], 'staging')
      ).resolves.toEqual({
        success: true,
        app: 'test-project',
        deployments: [
          {
            environment: 'staging',
            deploymentId: 'deployment-staging',
            codeVersions: [
              { codeVersion: 'v1', percentage: 70 },
              { codeVersion: 'v2', percentage: 30 }
            ]
          }
        ]
      });

      expect(server.createRoutineCodeDeployment).toHaveBeenCalledWith(
        expect.objectContaining({
          Env: 'staging',
          CodeVersions: [
            { Percentage: 70, CodeVersion: 'v1' },
            { Percentage: 30, CodeVersion: 'v2' }
          ]
        })
      );
      expect(logger.log).not.toHaveBeenCalledWith('📦 Versions rollout:');
    });
  });
});
