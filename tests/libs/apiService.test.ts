import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

let ApiServiceClass: typeof import('../../src/libs/apiService.js').ApiService;

beforeAll(async () => {
  const actual = await vi.importActual<
    typeof import('../../src/libs/apiService.js')
  >('../../src/libs/apiService.js');
  ApiServiceClass = actual.ApiService;
});

function createServiceWithCallApi(callApi: ReturnType<typeof vi.fn>) {
  const service = Object.create(ApiServiceClass.prototype) as InstanceType<
    typeof ApiServiceClass
  >;
  Object.defineProperty(service, 'client', {
    value: { callApi },
    configurable: true
  });
  return service;
}

const request = {
  Name: 'test-app',
  Env: 'staging',
  Strategy: 'percentage',
  CodeVersions: [{ CodeVersion: 'v1', Percentage: 100 }]
};

describe('ApiService.createRoutineCodeDeployment', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('maps deployment metadata from a successful API response', async () => {
    const callApi = vi.fn().mockResolvedValue({
      statusCode: 200,
      body: {
        RequestId: 'request-id',
        Strategy: 'percentage',
        DeploymentId: 'deployment-id',
        CodeVersions: [{ CodeVersion: 'v1', Percentage: 100 }]
      }
    });
    const service = createServiceWithCallApi(callApi);

    await expect(service.createRoutineCodeDeployment(request)).resolves.toEqual(
      {
        code: 200,
        data: {
          RequestId: 'request-id',
          Strategy: 'percentage',
          DeploymentId: 'deployment-id',
          CodeVersions: [{ CodeVersion: 'v1', Percentage: 100 }]
        }
      }
    );
  });

  it('keeps a successful response valid when DeploymentId is absent', async () => {
    const service = createServiceWithCallApi(
      vi.fn().mockResolvedValue({
        statusCode: 200,
        body: { RequestId: 'request-id' }
      })
    );

    await expect(service.createRoutineCodeDeployment(request)).resolves.toEqual(
      {
        code: 200,
        data: {
          RequestId: 'request-id',
          Strategy: undefined,
          DeploymentId: undefined,
          CodeVersions: undefined
        }
      }
    );
  });

  it('returns null for a non-successful HTTP response', async () => {
    const service = createServiceWithCallApi(
      vi.fn().mockResolvedValue({ statusCode: 500, body: {} })
    );

    await expect(
      service.createRoutineCodeDeployment(request)
    ).resolves.toBeNull();
  });

  it('returns null when the API request throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const service = createServiceWithCallApi(
      vi.fn().mockRejectedValue(new Error('network error'))
    );

    await expect(
      service.createRoutineCodeDeployment(request)
    ).resolves.toBeNull();
  });
});
