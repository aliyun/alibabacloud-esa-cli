// deploy.test.js
import { it, describe, expect, vi } from 'vitest';
import { handleDeploy } from '../../src/commands/deploy/index.js';
import * as HandleCommit from '../../src/commands/commit/index.js';
import { ApiService } from '../../src/libs/apiService.js';
import * as fileUtils from '../../src/utils/fileUtils/index.js';
import * as Utils from '../../src/commands/utils.js';
import * as DeployHelper from '../../src/commands/deploy/helper.js';
import { PublishType } from '../../src/libs/interface.js';
import * as descriptionInput from '../../src/components/descriptionInput.js';
import { mockConsoleMethods } from '../helper/mockConsole.js';
import api from '../../src/libs/api.js';

describe('handleDeploy', () => {
  let std = mockConsoleMethods();

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return early if directory check fails', async () => {
    vi.spyOn(Utils, 'checkDirectory').mockReturnValue(false);

    await handleDeploy({
      _: [],
      $0: ''
    });

    expect(std.out).not.toBeCalled();
  });

  it('should return early if project config is not found', async () => {
    vi.spyOn(Utils, 'checkDirectory').mockReturnValue(true);
    vi.spyOn(fileUtils, 'getProjectConfig').mockReturnValue(null);

    await handleDeploy({
      _: [],
      $0: ''
    });

    expect(std.out).toMatchInlineSnapshot(`
      [MockFunction log] {
        "calls": [
          [
            "
      ❌  ERROR  You are not in an esa project, Please run esa init to initialize a project, or enter an esa project.",
          ],
        ],
        "results": [
          {
            "type": "return",
            "value": undefined,
          },
        ],
      }
    `);
  });

  it('should return early if login check fails', async () => {
    vi.spyOn(fileUtils, 'getProjectConfig').mockReturnValue({ name: 'test' });
    vi.spyOn(Utils, 'checkIsLoginSuccess').mockResolvedValue(false);

    await handleDeploy({
      _: [],
      $0: ''
    });

    expect(std.out).not.toBeCalled();
  });

  it('should handle no versions found, create version and deploy it', async () => {
    vi.spyOn(Utils, 'checkIsLoginSuccess').mockResolvedValue(true);

    vi.mocked((await ApiService.getInstance()).getRoutine).mockResolvedValue({
      data: {
        CodeVersions: [],
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
    } as any);

    vi.spyOn(DeployHelper, 'yesNoPromptAndExecute').mockResolvedValue(true);
    vi.spyOn(DeployHelper, 'promptSelectVersion').mockResolvedValue('v1');
    vi.spyOn(DeployHelper, 'displaySelectDeployType').mockResolvedValue(
      PublishType.Staging
    );

    await handleDeploy({
      _: [],
      $0: ''
    });

    expect(std.out).toMatchInlineSnapshot(`
      [MockFunction log] {
        "calls": [
          [
            "Active Staging",
          ],
          [
            "Active Production",
          ],
          [
            "[90m┌──────────────────────────────[39m[90m┬─────────────────────────[39m[90m┬───────────────┐[39m
      [90m│[39m[31m Version                      [39m[90m│[39m[31m Created                 [39m[90m│[39m[31m Description   [39m[90m│[39m
      [90m├──────────────────────────────[39m[90m┼─────────────────────────[39m[90m┼───────────────┤[39m
      [90m│[39m unstable                     [90m│[39m 2025/06/05 17:46:55     [90m│[39m               [90m│[39m
      [90m├──────────────────────────────[39m[90m┼─────────────────────────[39m[90m┼───────────────┤[39m
      [90m│[39m v1                           [90m│[39m 2025/06/05 17:46:55     [90m│[39m test          [90m│[39m
      [90m├──────────────────────────────[39m[90m┼─────────────────────────[39m[90m┼───────────────┤[39m
      [90m│[39m v2                           [90m│[39m 2025/06/05 17:46:55     [90m│[39m test2         [90m│[39m
      [90m└──────────────────────────────[39m[90m┴─────────────────────────[39m[90m┴───────────────┘[39m",
          ],
          [
            "
      ",
          ],
          [
            "Select the version you want to publish:",
          ],
          [
            "
      🎉  SUCCESS  Your code has been successfully deployed",
          ],
          [
            "👉 Run this command to add domains: esa domain add <DOMAIN>",
          ],
        ],
        "results": [
          {
            "type": "return",
            "value": undefined,
          },
          {
            "type": "return",
            "value": undefined,
          },
          {
            "type": "return",
            "value": undefined,
          },
          {
            "type": "return",
            "value": undefined,
          },
          {
            "type": "return",
            "value": undefined,
          },
          {
            "type": "return",
            "value": undefined,
          },
          {
            "type": "return",
            "value": undefined,
          },
        ],
      }
    `);
  });

  it('should handle select a version and deploy it in staging environment', async () => {
    vi.spyOn(Utils, 'checkIsLoginSuccess').mockResolvedValue(true);

    vi.spyOn(DeployHelper, 'yesNoPromptAndExecute').mockResolvedValue(true);
    vi.spyOn(DeployHelper, 'promptSelectVersion').mockResolvedValue('v1');
    vi.spyOn(DeployHelper, 'displaySelectDeployType').mockResolvedValue(
      PublishType.Staging
    );

    await handleDeploy({
      _: [],
      $0: ''
    });

    expect(std.out).toBeCalledWith(
      expect.stringContaining(`Your code has been successfully deployed`)
    );
  });

  it('should handle select a version and deploy it in production environment', async () => {
    vi.spyOn(Utils, 'checkIsLoginSuccess').mockResolvedValue(true);

    vi.spyOn(DeployHelper, 'yesNoPromptAndExecute').mockResolvedValue(true);
    vi.spyOn(DeployHelper, 'promptSelectVersion').mockResolvedValue('v1');
    vi.spyOn(DeployHelper, 'displaySelectDeployType').mockResolvedValue(
      PublishType.Production
    );

    await handleDeploy({
      _: [],
      $0: ''
    });

    expect(std.out).toBeCalledWith(
      expect.stringContaining(`Your code has been successfully deployed`)
    );
  });

  it('create and deploy version', async () => {
    DeployHelper.createAndDeployVersion({ name: 'test' });
    vi.spyOn(descriptionInput, 'descriptionInput').mockResolvedValue(
      'des test'
    );
    vi.spyOn(fileUtils, 'readEdgeRoutineFile').mockResolvedValue('test code');
    vi.spyOn(HandleCommit, 'releaseOfficialVersion').mockResolvedValue(true);
  });

  it('should handle no versions found, do not create unstable version', async () => {
    vi.spyOn(Utils, 'checkIsLoginSuccess').mockResolvedValue(true);

    vi.mocked((await ApiService.getInstance()).getRoutine).mockResolvedValue({
      data: {
        CodeVersions: [],
        Envs: [
          {
            CodeVersion: 'staging',
            Env: ''
          },
          {
            CodeVersion: 'production',
            Env: ''
          }
        ]
      }
    } as any);

    vi.mocked(api.listRoutineCodeVersions).mockResolvedValue({
      data: {
        RelatedRecords: []
      }
    } as any);

    vi.spyOn(DeployHelper, 'yesNoPromptAndExecute').mockResolvedValue(false);
    await handleDeploy({
      _: [],
      $0: ''
    });
    expect(std.out).toMatchInlineSnapshot(`
      [MockFunction log] {
        "calls": [
          [
            "No formal version found, you need to create a version first.",
          ],
        ],
        "results": [
          {
            "type": "return",
            "value": undefined,
          },
        ],
      }
    `);
  });

  it('should handle no versions found, do not create unstable version', async () => {
    vi.spyOn(Utils, 'checkIsLoginSuccess').mockResolvedValue(true);

    vi.mocked((await ApiService.getInstance()).getRoutine).mockResolvedValue({
      data: {
        CodeVersions: [],
        Envs: [
          {
            CodeVersion: 'staging',
            Env: ''
          },
          {
            CodeVersion: 'production',
            Env: ''
          }
        ]
      }
    } as any);

    vi.mocked(api.listRoutineCodeVersions).mockResolvedValue({
      data: {
        RelatedRecords: []
      }
    } as any);
    vi.spyOn(DeployHelper, 'yesNoPromptAndExecute').mockResolvedValue(false);
    await handleDeploy({
      _: [],
      $0: ''
    });
    expect(std.out).toMatchInlineSnapshot(`
      [MockFunction log] {
        "calls": [
          [
            "No formal version found, you need to create a version first.",
          ],
        ],
        "results": [
          {
            "type": "return",
            "value": undefined,
          },
        ],
      }
    `);
  });
});
