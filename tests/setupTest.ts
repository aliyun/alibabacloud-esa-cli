// tests/setupTests.ts
import { vi } from 'vitest';
import '@testing-library/jest-dom';
import {
  DeleteRoutineCodeVersionRes,
  DeleteRoutineRelatedRouteRes
} from '../src/libs/interface.js';

const mockGlobal = () => {
  vi.mock('../src/libs/apiService.js', async (importOriginal) => {
    const mod =
      await importOriginal<typeof import('../src/libs/apiService.js')>();
    const mockMethods = {
      checkLogin: vi.fn().mockResolvedValue({ success: true }),
      updateConfig: vi.fn(),
      deleteRoutine: vi.fn().mockResolvedValue({ Status: 'OK' }),
      createRoutineRoute: vi.fn().mockResolvedValue({
        code: 200,
        data: {
          RequestId: '7BDAD7C3-DFDA-5E81-80FD-DAC8F85BAD4C',
          ConfigId: 429653246613504
        }
      }),
      getRoutineUserInfo: vi.fn().mockResolvedValue({}),
      listRoutineRelatedRecords: vi.fn().mockResolvedValue({
        data: {
          RelatedRecords: [
            {
              RecordName: 'test.com',
              SiteId: 1234567789,
              SiteName: 'test',
              RecordId: 1234567789
            },
            {
              RecordName: 'test2.com',
              SiteId: 2234567789,
              SiteName: 'test2',
              RecordId: 2234567789
            }
          ]
        }
      }),
      getMatchSite: vi.fn().mockResolvedValue({
        data: {
          SiteId: 'test',
          SiteName: 'test'
        }
      }),
      createRoutineRelatedRoute: vi.fn().mockResolvedValue({
        data: {
          Status: 'OK'
        }
      }),
      listSites: vi.fn().mockResolvedValue({
        data: {
          Sites: [
            {
              SiteId: 1,
              SiteName: 'test.com'
            },
            {
              SiteId: 2,
              SiteName: 'test2.com'
            }
          ]
        }
      }),
      getRoutine: vi.fn().mockResolvedValue({
        data: {
          CodeVersions: [
            {
              CodeVersion: 'unstable',
              CreateTime: '2025-06-05T09:46:55Z',
              CodeDescription: ''
            },
            {
              CodeVersion: 'v1',
              CreateTime: '2025-06-05T09:46:55Z',
              CodeDescription: ''
            },
            {
              CodeVersion: 'v2',
              CreateTime: '2025-06-05T09:46:55Z',
              CodeDescription: ''
            }
          ],
          Envs: [
            { CodeVersion: 'stagingVersion' },
            {
              CodeVersion: 'productionVersion'
            }
          ],

          RelatedRecords: [
            {
              RecordName: 'test.com',
              SiteId: 1,
              SiteName: 'test',
              RecordId: 1
            },
            {
              RecordName: 'test2.com',
              SiteId: 2,
              SiteName: 'test2',
              RecordId: 2
            }
          ],
          RelatedRoutes: [
            { Route: 'test.com/1', SiteName: 'test.com', RouteId: 1 },
            { Route: 'test.com/2', SiteName: 'test.com', RouteId: 1 }
          ]
        }
      }),
      createRoutineRelatedRecord: vi.fn().mockResolvedValue({
        data: {
          Status: 'OK'
        }
      }),

      listUserRoutines: vi.fn().mockResolvedValue({
        data: {
          Routines: [
            {
              RoutineName: 'test',
              Description: 'test',
              CreateTime: '2023-07-07T07:07:07Z'
            }
          ],
          TotalCount: 1,
          UsedRoutineNumber: 1,
          QuotaRoutineNumber: 1
        }
      }),
      deleteRoutineCodeVersion: vi.fn().mockResolvedValue({
        Status: 'OK'
      } as DeleteRoutineCodeVersionRes),
      commitRoutineStagingCode: vi.fn().mockResolvedValue({}),
      getRoutineStagingEnvIp: vi
        .fn()
        .mockResolvedValue({ data: { IPV4: ['0.0.0.0'] } }),
      publishRoutineCodeVersion: vi.fn().mockResolvedValue({}),
      quickDeployRoutine: vi.fn().mockResolvedValue({}),
      ListRoutineOptionalSpecs: vi.fn().mockResolvedValue({}),
      getRoutineStagingCodeUploadInfo: vi.fn().mockResolvedValue(true),
      deleteRoutineRelatedRoute: vi.fn().mockResolvedValue({
        data: {
          Status: 'OK'
        }
      } as DeleteRoutineRelatedRouteRes),
      updateProjectConfigFile: vi.fn(),
      deleteRoutineRelatedRecord: vi
        .fn()
        .mockResolvedValue({ data: { Status: 'OK' } })
    };
    return {
      ...mod,
      ApiService: {
        getInstance: vi.fn(() => {
          return mockMethods;
        }),
        ...mockMethods
      }
    };
  });

  // Mock api.ts
  vi.mock('../src/libs/api.ts', async () => {
    // Optionally import the original module if you need to preserve some behavior
    // const actual = await importOriginal<typeof import('../src/libs/api.ts')>();

    // Mocked Client instance
    const mockClient = {
      getErService: vi.fn().mockResolvedValue({}),
      getRoutineStagingCodeUploadInfo: vi.fn().mockResolvedValue(true),
      commitRoutineStagingCode: vi.fn().mockResolvedValue({}),
      publishRoutineCodeVersion: vi.fn().mockResolvedValue({}),
      getMatchSite: vi.fn().mockResolvedValue({
        data: {
          SiteId: 'test',
          SiteName: 'test'
        }
      }),

      getRoutineUserInfo: vi.fn().mockResolvedValue({}),
      deleteRoutine: vi.fn().mockResolvedValue({ Status: 'OK' }),
      deleteRoutineCodeVersion: vi.fn().mockResolvedValue({
        Status: 'OK'
      } as DeleteRoutineCodeVersionRes),
      createRoutineRelatedRoute: vi.fn().mockResolvedValue({
        data: { Status: 'OK' }
      }),
      deleteRoutineRelatedRoute: vi.fn().mockResolvedValue({
        data: { Status: 'OK' }
      } as DeleteRoutineRelatedRouteRes),
      listSites: vi.fn().mockResolvedValue({
        data: {
          Sites: [
            { SiteId: 1, SiteName: 'test.com' },
            { SiteId: 2, SiteName: 'test2.com' }
          ]
        }
      }),
      getRoutineStagingEnvIp: vi.fn().mockResolvedValue({
        data: { IPV4: ['0.0.0.0'] }
      }),
      listRoutineCodeVersions: vi.fn().mockResolvedValue({
        body: {
          codeVersions: [
            {
              codeVersion: 'unstable',
              createTime: '2025-06-05T09:46:55Z',
              codeDescription: ''
            },
            {
              codeVersion: 'v1',
              createTime: '2025-06-05T09:46:55Z',
              codeDescription: 'test'
            },
            {
              codeVersion: 'v2',
              createTime: '2025-06-05T09:46:55Z',
              codeDescription: 'test2'
            }
          ]
        }
      }),
      getRoutine: vi.fn().mockResolvedValue({
        data: {
          CodeVersions: [
            {
              CodeVersion: 'unstable',
              CreateTime: '2025-06-05T09:46:55Z',
              CodeDescription: ''
            },
            {
              CodeVersion: 'v1',
              CreateTime: '2025-06-05T09:46:55Z',
              CodeDescription: ''
            },
            {
              CodeVersion: 'v2',
              CreateTime: '2025-06-05T09:46:55Z',
              CodeDescription: ''
            }
          ],
          Envs: [
            { CodeVersion: 'stagingVersion' },
            {
              CodeVersion: 'productionVersion'
            }
          ],
          RelatedRecords: [
            {
              RecordName: 'test.com',
              SiteId: 1,
              SiteName: 'test',
              RecordId: 1
            },
            {
              RecordName: 'test2.com',
              SiteId: 2,
              SiteName: 'test2',
              RecordId: 2
            }
          ],
          RelatedRoutes: [
            { Route: 'test.com/1', SiteName: 'test.com', RouteId: 1 },
            { Route: 'test.com/2', SiteName: 'test.com', RouteId: 1 }
          ]
        }
      }),
      createRoutine: vi.fn().mockResolvedValue({}),
      createRoutineRelatedRecord: vi.fn().mockResolvedValue({
        data: { Status: 'OK' }
      }),
      deleteRoutineRelatedRecord: vi.fn().mockResolvedValue({
        data: { Status: 'OK' }
      }),
      deleteRoutineRoute: vi.fn().mockResolvedValue({
        headers: {
          date: 'Wed, 07 May 2025 02:53:56 GMT',
          'content-type': 'application/json;charset=utf-8',
          'content-length': '52',
          connection: 'keep-alive',
          'keep-alive': 'timeout=25',
          'access-control-allow-origin': '*',
          'access-control-expose-headers': '*',
          'x-acs-request-id': 'B0606CE1-1DC4-5BF4-A2BE-0E6Fxxxxxx',
          'x-acs-trace-id': 'd2c5daad3c34c2924f4ceb5xxxxxx',
          etag: '5HUpa8F7c2+w0xxxxxxx'
        },
        statusCode: 200,
        body: {
          requestId: 'B0606CE1-1DC4-5BF4-A2BE-0E6Fxxxxxx'
        }
      }),
      getRoutineRoute: vi.fn().mockResolvedValue({}),
      listSiteRoutes: vi.fn().mockResolvedValue({}),
      listRoutineRoutes: vi.fn().mockResolvedValue({
        headers: {
          date: 'Wed, 07 May 2025 02:53:55 GMT',
          'content-type': 'application/json;charset=utf-8',
          'content-length': '2704',
          connection: 'keep-alive',
          'keep-alive': 'timeout=25',
          vary: 'Accept-Encoding',
          'access-control-allow-origin': '*',
          'access-control-expose-headers': '*',
          'x-acs-request-id': 'A0DFAB7A-B512-55E7-8899-A9xxxxxx',
          'x-acs-trace-id': '6727a25a06d1b15c0762c9xxxxx',
          etag: '2BGi7DgKejnfSg8cxxxxx'
        },
        statusCode: 200,
        body: {
          configs: [
            {
              bypass: 'off',
              configId: 429062466252111,
              configType: 'rule',
              mode: 'simple',
              routeEnable: 'on',
              routeName: 'test2',
              routineName: 'test-hello',
              rule: '(http.host eq "abc.msy.asia" and starts_with(http.request.uri.path, "/"))',
              sequence: 1,
              siteId: 683951714584144,
              siteName: 'msy.asia'
            },
            {
              bypass: 'off',
              configId: 4290632589111,
              configType: 'rule',
              mode: 'custom',
              routeEnable: 'on',
              routeName: 'test3',
              routineName: 'test-hello',
              rule: '(http.host eq "test.msy.asia" and http.request.uri.path eq "/")',
              sequence: 2,
              siteId: 683951714584144,
              siteName: 'msy.asia'
            }
          ]
        }
      }),
      updateRoutineRoute: vi.fn().mockResolvedValue({}),
      updateConfig: vi.fn(),
      callApi: vi.fn().mockImplementation(async (action, request) => {
        // Simulate generic API call behavior
        return await action(request);
      }),
      callOpenApi: vi
        .fn()
        .mockImplementation(async (apiName, requestParams) => {
          // Simulate open API call behavior based on apiName
          if (apiName === 'getMatchSite') {
            return { data: { SiteId: 'test', SiteName: 'test' } };
          }
          return {};
        })
    };

    return {
      default: mockClient // Export the mocked client instance as default
    };
  });

  vi.mock('../src/utils/fileUtils/index.js', async (importOriginal) => {
    const actual =
      await importOriginal<typeof import('../src/utils/fileUtils/index.js')>();
    return {
      ...actual,
      getProjectConfig: vi.fn().mockReturnValue({ name: 'test-template-1' }),
      getCliConfig: vi.fn().mockReturnValue({
        auth: {
          accessKeyId: 'test',
          accessKeySecret: 'test'
        }
      }),
      checkDirectory: vi.fn().mockReturnValue(true),
      updateProjectConfigFile: vi.fn(),
      updateCliConfigFile: vi.fn(),
      readEdgeRoutineFile: vi.fn().mockReturnValue({})
    };
  });

  vi.mock('../src/commands/utils.js', async (importOriginal) => {
    const actual =
      await importOriginal<typeof import('../src/commands/utils.js')>();
    return {
      ...actual,
      checkDirectory: vi.fn().mockResolvedValue(true),
      checkIsLoginSuccess: vi.fn().mockResolvedValue(true),
      validDomain: vi.fn(),
      validName: vi.fn()
    };
  });

  vi.mock('../src/components/mutiSelectTable.js', async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import('../src/components/mutiSelectTable.js')
      >();
    return {
      ...actual,
      displayMultiSelectTable: vi.fn().mockResolvedValue(['test'])
    };
  });

  vi.mock('../src/libs/logger.js', async (importOriginal) => {
    const actual =
      await importOriginal<typeof import('../src/libs/logger.js')>();
    return {
      ...actual,
      Logger: {
        getInstance: vi.fn(() => {
          return {
            error: vi.fn(),
            info: vi.fn()
          };
        }),
        error: vi.fn(),
        info: vi.fn()
      }
    };
  });

  vi.mock('../src/commands/commit/prodBuild.ts', async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import('../src/commands/commit/prodBuild.ts')
      >();
    return {
      ...actual,
      default: vi.fn()
    };
  });
};

mockGlobal();
