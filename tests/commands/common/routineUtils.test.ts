import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateCodeVersion } from '../../../src/commands/common/routineUtils.js';
import { ApiService } from '../../../src/libs/apiService.js';
import { getProjectConfig } from '../../../src/utils/fileUtils/index.js';

// Mock dependencies
vi.mock('../../../src/libs/apiService.js');
vi.mock('../../../src/utils/compress.js');
vi.mock('../../../src/utils/fileUtils/index.js');

describe('routineUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateCodeVersion', () => {
    it('should normalize singlePageApplication to SinglePageApplication', async () => {
      // Mock project config with notFoundStrategy
      const mockProjectConfig = {
        name: 'test-project',
        assets: {
          directory: './dist',
          notFoundStrategy: 'singlePageApplication'
        }
      };

      (getProjectConfig as any).mockReturnValue(mockProjectConfig);

      // Mock ApiService
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

      // Mock compress function
      const mockCompress = vi.fn().mockResolvedValue({
        toBuffer: () => Buffer.from('test')
      });
      vi.doMock('../../../src/utils/compress.js', () => ({
        default: mockCompress
      }));

      // Call the function
      const result = await generateCodeVersion(
        'test-project',
        'test description',
        undefined,
        undefined,
        false,
        undefined
      );

      // Verify that CreateRoutineWithAssetsCodeVersion was called with ConfOptions
      expect(
        mockApiService.CreateRoutineWithAssetsCodeVersion
      ).toHaveBeenCalledWith({
        Name: 'test-project',
        CodeDescription: 'test description',
        ConfOptions: {
          NotFoundStrategy: 'SinglePageApplication'
        }
      });

      expect(result?.isSuccess).toBe(true);
    });

    it('should pass any notFoundStrategy value to API', async () => {
      // Mock project config with different notFoundStrategy value
      const mockProjectConfig = {
        name: 'test-project',
        assets: {
          directory: './dist',
          notFoundStrategy: 'customStrategy'
        }
      };

      (getProjectConfig as any).mockReturnValue(mockProjectConfig);

      // Mock ApiService
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

      // Mock compress function
      const mockCompress = vi.fn().mockResolvedValue({
        toBuffer: () => Buffer.from('test')
      });
      vi.doMock('../../../src/utils/compress.js', () => ({
        default: mockCompress
      }));

      // Call the function
      const result = await generateCodeVersion(
        'test-project',
        'test description',
        undefined,
        undefined,
        false,
        undefined
      );

      // Verify that CreateRoutineWithAssetsCodeVersion was called with ConfOptions
      expect(
        mockApiService.CreateRoutineWithAssetsCodeVersion
      ).toHaveBeenCalledWith({
        Name: 'test-project',
        CodeDescription: 'test description',
        ConfOptions: {
          NotFoundStrategy: 'customStrategy'
        }
      });

      expect(result?.isSuccess).toBe(true);
    });

    it('should not pass ConfOptions when notFoundStrategy is not configured', async () => {
      // Mock project config without notFoundStrategy
      const mockProjectConfig = {
        name: 'test-project',
        assets: {
          directory: './dist'
        }
      };

      (getProjectConfig as any).mockReturnValue(mockProjectConfig);

      // Mock ApiService
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

      // Mock compress function
      const mockCompress = vi.fn().mockResolvedValue({
        toBuffer: () => Buffer.from('test')
      });
      vi.doMock('../../../src/utils/compress.js', () => ({
        default: mockCompress
      }));

      // Call the function
      const result = await generateCodeVersion(
        'test-project',
        'test description',
        undefined,
        undefined,
        false,
        undefined
      );

      // Verify that CreateRoutineWithAssetsCodeVersion was called without ConfOptions
      expect(
        mockApiService.CreateRoutineWithAssetsCodeVersion
      ).toHaveBeenCalledWith({
        Name: 'test-project',
        CodeDescription: 'test description'
      });

      expect(result?.isSuccess).toBe(true);
    });
  });
});
