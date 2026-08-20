import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { handleDeploy } from '../../../src/commands/deploy/index.js';
import { ApiService } from '../../../src/libs/apiService.js';

vi.mock('../../../src/commands/utils.js', () => ({
  checkIsLoginSuccess: vi.fn().mockResolvedValue(true)
}));

describe('deploy json output contract', () => {
  const server = {
    getRoutine: vi.fn().mockResolvedValue({
      data: { DefaultRelatedRecord: 'test-app.example.com' }
    }),
    createRoutine: vi.fn(),
    createRoutineCodeDeployment: vi.fn().mockResolvedValue({
      data: { DeploymentId: 'deployment-staging' }
    })
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ApiService.getInstance).mockResolvedValue(server as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes only one parseable JSON document to stdout', async () => {
    const stdoutSpy = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await handleDeploy({
      _: [],
      $0: '',
      name: 'test-app',
      versions: ['v1:100'],
      environment: 'staging',
      output: 'json'
    });

    expect(result.success).toBe(true);
    expect(stdoutSpy).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(stdoutSpy.mock.calls[0][0]))).toEqual({
      schemaVersion: 1,
      app: 'test-app',
      url: 'https://test-app.example.com',
      deployments: [
        {
          environment: 'staging',
          deploymentId: 'deployment-staging',
          codeVersions: [{ codeVersion: 'v1', percentage: 100 }]
        }
      ]
    });
  });
});
