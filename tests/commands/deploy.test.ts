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
    vi.spyOn(DeployHelper, 'yesNoPromptAndExecute').mockResolvedValue(false);
    await handleDeploy({
      _: [],
      $0: ''
    });

    expect(std.out).toBeCalledWith(
      expect.stringContaining(
        `No formal version found, you need to create a version first.`
      )
    );
    expect(std.out).not.toBeCalledWith(
      `📃 Do you want to create a formal version to deploy on production environment?`
    );
  });

  it('should handle no versions found, create version and deploy it', async () => {
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
      expect.stringContaining(
        `No formal version found, you need to create a version first.`
      )
    );
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

  it('should handle select a version and deploy it in canary environment', async () => {
    vi.spyOn(Utils, 'checkIsLoginSuccess').mockResolvedValue(true);

    vi.spyOn(DeployHelper, 'yesNoPromptAndExecute').mockResolvedValue(true);
    vi.spyOn(DeployHelper, 'promptSelectVersion').mockResolvedValue('v1');
    vi.spyOn(DeployHelper, 'displaySelectDeployType').mockResolvedValue(
      PublishType.Canary
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
});
