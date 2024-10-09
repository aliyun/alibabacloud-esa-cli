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
      getRoutineUserInfo: vi.fn().mockResolvedValue({}),
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
              CreateTime: '2021-01-01',
              CodeDescription: ''
            },
            {
              CodeVersion: 'v1',
              CreateTime: '2021-01-01',
              CodeDescription: ''
            },
            { CodeVersion: 'v2', CreateTime: '2021-01-01', CodeDescription: '' }
          ],
          Envs: [
            { CodeVersion: 'stagingVersion', SpecName: '50ms' },
            {
              CodeVersion: 'productionVersion',
              SpecName: '100ms',
              CanaryAreaList: ['Beijing', 'Shanghai']
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
      deleteRoutineCodeVersion: vi.fn().mockResolvedValue({
        Status: 'OK'
      } as DeleteRoutineCodeVersionRes),
      commitRoutineStagingCode: vi.fn().mockResolvedValue({}),
      getRoutineStagingEnvIp: vi
        .fn()
        .mockResolvedValue({ data: { IPV4: ['0.0.0.0'] } }),
      publishRoutineCodeVersion: vi.fn().mockResolvedValue({}),
      listRoutineSpecs: vi.fn().mockResolvedValue({}),
      getRoutineStagingCodeUploadInfo: vi.fn().mockResolvedValue(true),
      deleteRoutineRelatedRoute: vi.fn().mockResolvedValue({
        data: {
          Status: 'OK'
        }
      } as DeleteRoutineRelatedRouteRes),
      updateProjectConfigFile: vi.fn(),
      deleteRoutineRelatedRecord: vi
        .fn()
        .mockResolvedValue({ data: { Status: 'OK' } }),
      listRoutineCanaryAreas: vi.fn().mockResolvedValue({
        CanaryAreas: ['Beijing', 'Shanghai']
      })
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
  vi.mock('../src/utils/fileUtils/index.js', async (importOriginal) => {
    const actual =
      await importOriginal<typeof import('../src/utils/fileUtils/index.js')>();
    return {
      ...actual,
      getProjectConfig: vi.fn().mockResolvedValue({ name: 'test' }),
      getCliConfig: vi.fn().mockResolvedValue({
        auth: {
          accessKeyId: 'test',
          accessKeySecret: 'test'
        }
      }),
      checkDirectory: vi.fn().mockReturnValue(true),
      updateProjectConfigFile: vi.fn(),
      updateCliConfigFile: vi.fn(),
      readEdgeRoutineFile: vi.fn().mockResolvedValue({})
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
      displayMultiSelectTable: vi.fn().mockResolvedValue(['Beijing'])
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

  // vi.mock('../src/libs/logger.js', async (importOriginal) => {
  //   const actual =
  //     await importOriginal<typeof import('../src/libs/logger.js')>();
  //   const mockMethods = {
  //     error: vi.fn(),
  //     info: vi.fn()
  //   };
  //   return {
  //     ...actual,
  //     Logger: {
  //       getInstance: vi.fn(() => {
  //         return mockMethods;
  //       }),
  //       ...mockMethods
  //     }
  //   };
  // });
};

mockGlobal();
