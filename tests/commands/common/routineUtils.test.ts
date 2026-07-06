import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateCodeVersion } from '../../../src/commands/common/utils.js';
import { ApiService } from '../../../src/libs/apiService.js';
import { getProjectConfig } from '../../../src/utils/fileUtils/index.js';

vi.mock('../../../src/libs/apiService.js');
vi.mock('../../../src/utils/compress.js', () => ({
  default: vi.fn().mockResolvedValue({
    zip: { toBuffer: () => Buffer.from('test') },
    sourceList: [],
    dynamicSources: []
  })
}));
vi.mock('../../../src/utils/fileUtils/index.js');
vi.mock('../../../src/libs/logger.js', () => ({
  default: {
    log: vi.fn(),
    error: vi.fn(),
    block: vi.fn(),
    startSubStep: vi.fn(),
    endSubStep: vi.fn()
  }
}));

describe('routineUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
