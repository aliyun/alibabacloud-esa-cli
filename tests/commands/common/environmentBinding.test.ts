import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  commitAndDeployVersion,
  deployCodeVersion,
  deployCodeVersions,
  generateCodeVersion
} from '../../../src/commands/common/utils.js';
import { checkIsLoginSuccess } from '../../../src/commands/utils.js';
import { ApiService } from '../../../src/libs/apiService.js';
import { ensureRoutineExists } from '../../../src/utils/checkIsRoutineCreated.js';
import { getProjectConfig } from '../../../src/utils/fileUtils/index.js';

vi.mock('../../../src/libs/apiService.js');
vi.mock('../../../src/commands/utils.js', () => ({
  checkIsLoginSuccess: vi.fn()
}));
vi.mock('../../../src/utils/compress.js', () => ({
  default: vi.fn().mockResolvedValue({
    zip: { toBuffer: () => Buffer.from('test-archive') },
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
    warn: vi.fn(),
    block: vi.fn(),
    startSubStep: vi.fn(),
    endSubStep: vi.fn(),
    notInProject: vi.fn()
  }
}));

describe('routine code version environment binding', () => {
  const metadataResponse = (
    codeVersions: Array<{
      CodeVersion: string;
      DeployEnv?: 'staging' | 'production';
      HasEnvVars?: boolean;
    }>
  ) => ({
    code: '200',
    data: {
      RequestId: 'metadata-request-id',
      PageNumber: 1,
      PageSize: 100,
      TotalCount: codeVersions.length,
      CodeVersions: codeVersions
    }
  });

  const createServer = () => ({
    CreateRoutineWithAssetsCodeVersion: vi.fn().mockResolvedValue({
      code: '200',
      data: {
        CodeVersion: 'version-1',
        OssPostConfig: {
          Url: 'https://oss.example.test',
          OSSAccessKeyId: 'oss-access-key-id',
          Signature: 'signature',
          Key: 'archive-key',
          Policy: 'policy'
        }
      }
    }),
    uploadToOss: vi.fn().mockResolvedValue(true),
    getRoutineCodeVersionInfo: vi.fn().mockResolvedValue({
      data: { Status: 'available' }
    }),
    listRoutineCodeVersionsMetadata: vi
      .fn()
      .mockResolvedValue(
        metadataResponse([
          { CodeVersion: 'version-1' },
          { CodeVersion: 'v1' },
          { CodeVersion: 'v2' }
        ])
      ),
    createRoutineCodeDeployment: vi.fn().mockResolvedValue({ data: {} })
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkIsLoginSuccess).mockResolvedValue(true);
    vi.mocked(ensureRoutineExists).mockResolvedValue(undefined);
    vi.mocked(getProjectConfig).mockReturnValue({
      name: 'my-routine',
      entry: 'src/index.ts',
      assets: { directory: 'dist' }
    } as any);
  });

  it('forwards a single DeployEnv from generateCodeVersion', async () => {
    const server = createServer();
    (ApiService.getInstance as any).mockResolvedValue(server);

    await generateCodeVersion(
      'my-routine',
      'production release',
      undefined,
      undefined,
      false,
      undefined,
      false,
      'production'
    );

    expect(server.CreateRoutineWithAssetsCodeVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        Name: 'my-routine',
        DeployEnv: 'production'
      })
    );
  });

  it('defaults a new commitAndDeployVersion to production only', async () => {
    const server = createServer();
    server.listRoutineCodeVersionsMetadata.mockResolvedValue(
      metadataResponse([
        {
          CodeVersion: 'version-1',
          DeployEnv: 'production',
          HasEnvVars: true
        }
      ])
    );
    (ApiService.getInstance as any).mockResolvedValue(server);

    await expect(
      commitAndDeployVersion(
        'my-routine',
        undefined,
        undefined,
        'production release'
      )
    ).resolves.toBe(true);

    expect(server.CreateRoutineWithAssetsCodeVersion).toHaveBeenCalledWith(
      expect.objectContaining({ DeployEnv: 'production' })
    );
    expect(server.createRoutineCodeDeployment).toHaveBeenCalledOnce();
    expect(server.createRoutineCodeDeployment).toHaveBeenCalledWith(
      expect.objectContaining({ Env: 'production' })
    );
    expect(server.listRoutineCodeVersionsMetadata).toHaveBeenCalledWith(
      expect.objectContaining({ Name: 'my-routine' })
    );
  });

  it('leaves an all-environment version unbound before deploying it twice', async () => {
    const server = createServer();
    (ApiService.getInstance as any).mockResolvedValue(server);

    await expect(
      commitAndDeployVersion(
        'my-routine',
        undefined,
        undefined,
        'shared release',
        undefined,
        'all'
      )
    ).resolves.toBe(true);

    const versionRequest =
      server.CreateRoutineWithAssetsCodeVersion.mock.calls[0][0];
    expect(versionRequest).not.toHaveProperty('DeployEnv');
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

  it('rejects a code version bound to a different target environment', async () => {
    const server = createServer();
    server.listRoutineCodeVersionsMetadata.mockResolvedValue(
      metadataResponse([
        {
          CodeVersion: 'version-1',
          DeployEnv: 'staging',
          HasEnvVars: true
        }
      ])
    );
    (ApiService.getInstance as any).mockResolvedValue(server);

    await expect(
      deployCodeVersion('my-routine', 'version-1', 'production')
    ).resolves.toBe(false);
    expect(server.listRoutineCodeVersionsMetadata).toHaveBeenCalledWith(
      expect.objectContaining({ Name: 'my-routine' })
    );
    expect(server.createRoutineCodeDeployment).not.toHaveBeenCalled();
  });

  it('retries metadata validation when a new version is temporarily absent', async () => {
    const server = createServer();
    server.listRoutineCodeVersionsMetadata
      .mockReset()
      .mockResolvedValueOnce(
        metadataResponse([{ CodeVersion: 'older-version' }])
      )
      .mockResolvedValueOnce(
        metadataResponse([
          {
            CodeVersion: 'version-1',
            DeployEnv: 'production',
            HasEnvVars: true
          }
        ])
      );
    (ApiService.getInstance as any).mockResolvedValue(server);

    await expect(
      deployCodeVersion('my-routine', 'version-1', 'production')
    ).resolves.toBe(true);

    expect(server.listRoutineCodeVersionsMetadata).toHaveBeenCalledTimes(2);
    expect(server.listRoutineCodeVersionsMetadata).toHaveBeenNthCalledWith(1, {
      Name: 'my-routine',
      PageNumber: 1,
      PageSize: 20
    });
    expect(server.listRoutineCodeVersionsMetadata).toHaveBeenNthCalledWith(2, {
      Name: 'my-routine',
      PageNumber: 1,
      PageSize: 20
    });
    expect(server.createRoutineCodeDeployment).toHaveBeenCalledOnce();
  });

  it('validates every weighted version through list metadata', async () => {
    const server = createServer();
    server.listRoutineCodeVersionsMetadata.mockResolvedValue(
      metadataResponse([
        {
          CodeVersion: 'v1',
          DeployEnv: 'production',
          HasEnvVars: true
        },
        { CodeVersion: 'v2', DeployEnv: 'production' }
      ])
    );
    (ApiService.getInstance as any).mockResolvedValue(server);

    await expect(
      deployCodeVersions(
        'my-routine',
        [
          { codeVersion: 'v1', percentage: 80 },
          { codeVersion: 'v2', percentage: 20 }
        ],
        'production'
      )
    ).resolves.toBe(true);

    expect(server.listRoutineCodeVersionsMetadata).toHaveBeenCalledWith(
      expect.objectContaining({ Name: 'my-routine' })
    );
    expect(server.createRoutineCodeDeployment).toHaveBeenCalledOnce();
  });

  it('rejects weighted deployment when one version targets another environment', async () => {
    const server = createServer();
    server.listRoutineCodeVersionsMetadata.mockResolvedValue(
      metadataResponse([
        { CodeVersion: 'v1', DeployEnv: 'production' },
        { CodeVersion: 'v2', DeployEnv: 'staging', HasEnvVars: true }
      ])
    );
    (ApiService.getInstance as any).mockResolvedValue(server);

    await expect(
      deployCodeVersions(
        'my-routine',
        [
          { codeVersion: 'v1', percentage: 80 },
          { codeVersion: 'v2', percentage: 20 }
        ],
        'production'
      )
    ).resolves.toBe(false);

    expect(server.createRoutineCodeDeployment).not.toHaveBeenCalled();
  });
});
