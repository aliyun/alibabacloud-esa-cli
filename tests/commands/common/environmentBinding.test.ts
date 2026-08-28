import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  commitAndDeployVersion,
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
    block: vi.fn(),
    startSubStep: vi.fn(),
    endSubStep: vi.fn(),
    notInProject: vi.fn()
  }
}));

describe('routine code version environment binding', () => {
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

  it('binds commitAndDeployVersion to its single target environment', async () => {
    const server = createServer();
    (ApiService.getInstance as any).mockResolvedValue(server);

    await expect(
      commitAndDeployVersion(
        'my-routine',
        undefined,
        undefined,
        'production release',
        undefined,
        'production'
      )
    ).resolves.toBe(true);

    expect(server.CreateRoutineWithAssetsCodeVersion).toHaveBeenCalledWith(
      expect.objectContaining({ DeployEnv: 'production' })
    );
    expect(server.createRoutineCodeDeployment).toHaveBeenCalledOnce();
    expect(server.createRoutineCodeDeployment).toHaveBeenCalledWith(
      expect.objectContaining({ Env: 'production' })
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
});
