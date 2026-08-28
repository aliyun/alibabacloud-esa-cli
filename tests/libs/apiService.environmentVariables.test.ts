import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.unmock('../../src/libs/apiService.js');

import { ApiService } from '../../src/libs/apiService.js';

describe('ApiService routine environment variables', () => {
  let callApi: ReturnType<typeof vi.fn>;
  let service: ApiService;

  beforeEach(() => {
    callApi = vi.fn().mockResolvedValue({
      statusCode: 200,
      body: {
        RequestId: 'request-id',
        Count: 1,
        TotalCount: 1,
        PageNumber: 1,
        PageSize: 20,
        EnvironmentVariables: {
          LOG_LEVEL: { Type: 'plain_text', Value: 'info' }
        },
        SetKeys: ['LOG_LEVEL'],
        DeletedKeys: ['LOG_LEVEL'],
        FailedKeys: []
      }
    });

    // Bypass the constructor so this unit test only exercises request encoding.
    service = Object.create(ApiService.prototype) as ApiService;
    (service as unknown as { client: { callApi: typeof callApi } }).client = {
      callApi
    };
  });

  it('encodes listRoutineEnvironmentVariables as POST form data', async () => {
    await service.listRoutineEnvironmentVariables({
      Name: 'my-routine',
      Env: 'production',
      KeyWord: 'LOG',
      PageNumber: 2,
      PageSize: 50
    });

    expect(callApi).toHaveBeenCalledOnce();
    const [params, request] = callApi.mock.calls[0];
    expect(params).toMatchObject({
      action: 'ListRoutineEnvironmentVariables',
      method: 'POST',
      reqBodyType: 'formData'
    });
    expect(request.body).toEqual(
      expect.objectContaining({
        Name: 'my-routine',
        Env: 'production',
        KeyWord: 'LOG',
        PageNumber: 2,
        PageSize: 50
      })
    );
  });

  it('JSON-encodes variables for setRoutineEnvironmentVariables', async () => {
    const variables = {
      LOG_LEVEL: { Type: 'plain_text' as const, Value: 'info' },
      API_TOKEN: { Type: 'secret_text' as const, Value: 'secret' }
    };

    await service.setRoutineEnvironmentVariables({
      Name: 'my-routine',
      Env: 'production',
      EnvironmentVariables: variables
    });

    const [params, request] = callApi.mock.calls[0];
    expect(params).toMatchObject({
      action: 'SetRoutineEnvironmentVariables',
      method: 'POST',
      reqBodyType: 'formData'
    });
    expect(request.body).toEqual(
      expect.objectContaining({
        Name: 'my-routine',
        Env: 'production',
        EnvironmentVariables: JSON.stringify(variables)
      })
    );
  });

  it('JSON-encodes keys for deleteRoutineEnvironmentVariables', async () => {
    await service.deleteRoutineEnvironmentVariables({
      Name: 'my-routine',
      Env: 'staging',
      EnvironmentVariableKeys: ['LOG_LEVEL', 'API_TOKEN']
    });

    const [params, request] = callApi.mock.calls[0];
    expect(params).toMatchObject({
      action: 'DeleteRoutineEnvironmentVariables',
      method: 'POST',
      reqBodyType: 'formData'
    });
    expect(request.body).toEqual(
      expect.objectContaining({
        Name: 'my-routine',
        Env: 'staging',
        EnvironmentVariableKeys: JSON.stringify(['LOG_LEVEL', 'API_TOKEN'])
      })
    );
  });

  it('passes DeployEnv when creating an assets code version', async () => {
    await service.CreateRoutineWithAssetsCodeVersion({
      Name: 'my-routine',
      CodeDescription: 'production release',
      DeployEnv: 'production'
    });

    const [params, request] = callApi.mock.calls[0];
    expect(params).toMatchObject({
      action: 'CreateRoutineWithAssetsCodeVersion',
      method: 'POST',
      reqBodyType: 'formData'
    });
    expect(request.body).toEqual(
      expect.objectContaining({
        Name: 'my-routine',
        CodeDescription: 'production release',
        DeployEnv: 'production'
      })
    );
  });

  it('JSON-encodes code version ConfOptions for form data', async () => {
    await service.CreateRoutineWithAssetsCodeVersion({
      Name: 'my-routine',
      ConfOptions: { NotFoundStrategy: 'SinglePageApplication' }
    });

    const [, request] = callApi.mock.calls[0];
    expect(request.body).toEqual(
      expect.objectContaining({
        ConfOptions: JSON.stringify({
          NotFoundStrategy: 'SinglePageApplication'
        })
      })
    );
  });
});
