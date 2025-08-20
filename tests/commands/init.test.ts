// init.test.js
import fs from 'fs';

import fsExtra from 'fs-extra';
import { it, describe, expect, vi } from 'vitest';

import { handleInit } from '../../src/commands/init/index.js';
import * as Util from '../../src/utils/fileUtils/index.js';
import { mockConsoleMethods } from '../helper/mockConsole.js';

import { mockInquirerPrompt } from './helper.js';

vi.mock('child_process');
vi.mock('fs/promises', () => ({
  rename: vi.fn()
}));

// Mock the compress function to avoid errors in tests
vi.mock('../../src/utils/compress.js', () => ({
  default: vi.fn().mockResolvedValue({
    toBuffer: () => Buffer.from('test')
  })
}));

// Mock ApiService to avoid API calls in tests
vi.mock('../../src/libs/apiService.js', () => ({
  ApiService: {
    getInstance: vi.fn().mockResolvedValue({
      CreateRoutineWithAssetsCodeVersion: vi.fn().mockResolvedValue({
        data: {
          OssPostConfig: {
            OSSAccessKeyId: 'test-key',
            Signature: 'test-signature',
            Url: 'test-url',
            Key: 'test-key',
            Policy: 'test-policy'
          }
        }
      }),
      uploadToOss: vi.fn().mockResolvedValue(true)
    })
  }
}));

// Mock other utility functions
vi.mock('../../src/commands/common/routineUtils.js', () => ({
  checkIsLoginSuccess: vi.fn().mockResolvedValue(true),
  ensureRoutineExists: vi.fn().mockResolvedValue(undefined),
  quickDeployForInit: vi.fn().mockResolvedValue(true)
}));

vi.mock(import('../../src/commands/init/helper.js'), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    checkAndUpdatePackage: vi.fn()
  };
});

describe('handleInit', () => {
  let std = mockConsoleMethods();
  beforeEach(() => {
    vi.spyOn(Util, 'getTemplatesConfig').mockReturnValue([
      {
        Title_EN: 'test-template-1',
        Title_ZH: 'test-template-1',
        Desc_EN: 'test desc',
        Desc_ZH: 'test desc',
        URL: 'test',
        children: []
      },
      {
        Title_EN: 'test-template-2',
        Title_ZH: 'test-template-2',
        Desc_EN: 'test desc2',
        Desc_ZH: 'test desc2',
        URL: 'test',
        children: []
      }
    ]);

    // Mock getProjectConfig to return a valid project configuration
    vi.spyOn(Util, 'getProjectConfig').mockReturnValue({
      name: 'test-template-1',
      entry: 'src/index.js',
      assets: { directory: 'assets' }
    } as any);
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('clones the repository and updates project config --install git', async () => {
    vi.mock('../../src/components/mutiLevelSelect.js', () => ({
      default: vi.fn().mockResolvedValue('/test/path/test-template-1')
    }));
    mockInquirerPrompt([
      { name: 'test-template-1' },
      { initGit: 'Yes' },
      { deploy: 'Yes' }
    ]);

    vi.spyOn(fsExtra, 'copy').mockImplementation(vi.mocked);
    vi.spyOn(fs, 'readdirSync').mockReturnValue(['test' as any]);

    await handleInit({
      _: [],
      $0: ''
    });
    expect(std.out).toMatchInlineSnapshot(`
      [MockFunction log] {
        "calls": [
          [
            {
              "name": "test-template-1",
            },
          ],
          [
            {
              "initGit": "Yes",
            },
          ],
          [
            "Git has been installed successfully.",
          ],
          [
            {
              "deploy": "Yes",
            },
          ],
          [
            "Enter your routine project folder: 💡 cd test-template-1",
          ],
          [
            "Start a local development server for your project: 💡 esa dev",
          ],
          [
            "Save a new version of code: 💡 esa commit",
          ],
          [
            "Deploy your project to different environments: 💡 esa deploy",
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
          {
            "type": "return",
            "value": undefined,
          },
        ],
      }
    `);
  });

  it('clones the repository and updates project config --install git', async () => {
    vi.mock('../../src/components/mutiLevelSelect.js', () => ({
      default: vi.fn().mockResolvedValue('/test/path/test-template-1')
    }));
    mockInquirerPrompt([
      { name: 'test-template-1' },
      { initGit: 'No' },
      { deploy: 'Yes' }
    ]);

    vi.spyOn(fsExtra, 'copy').mockImplementation(vi.mocked);
    vi.spyOn(fs, 'readdirSync').mockReturnValue(['test' as any]);

    await handleInit({
      _: [],
      $0: ''
    });
    expect(std.out).toMatchInlineSnapshot(`
      [MockFunction log] {
        "calls": [
          [
            {
              "name": "test-template-1",
            },
          ],
          [
            {
              "initGit": "No",
            },
          ],
          [
            "Git installation was skipped.",
          ],
          [
            {
              "deploy": "Yes",
            },
          ],
          [
            "Enter your routine project folder: 💡 cd test-template-1",
          ],
          [
            "Start a local development server for your project: 💡 esa dev",
          ],
          [
            "Save a new version of code: 💡 esa commit",
          ],
          [
            "Deploy your project to different environments: 💡 esa deploy",
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
          {
            "type": "return",
            "value": undefined,
          },
        ],
      }
    `);
  });
  it('clones the repository and updates project config --install git --skip deploy', async () => {
    vi.mock('../../src/components/mutiLevelSelect.js', () => ({
      default: vi.fn().mockResolvedValue('/test/path/test-template-1')
    }));
    mockInquirerPrompt([
      { name: 'test-template-1' },
      { initGit: 'Yes' },
      { deploy: 'No' }
    ]);

    vi.spyOn(fsExtra, 'copy').mockImplementation(vi.mocked);
    vi.spyOn(fs, 'readdirSync').mockReturnValue(['test' as any]);

    await handleInit({
      _: [],
      $0: ''
    });
    expect(std.out).toMatchInlineSnapshot(`
      [MockFunction log] {
        "calls": [
          [
            {
              "name": "test-template-1",
            },
          ],
          [
            {
              "initGit": "Yes",
            },
          ],
          [
            "Git has been installed successfully.",
          ],
          [
            {
              "deploy": "No",
            },
          ],
          [
            "Enter your routine project folder: 💡 cd test-template-1",
          ],
          [
            "Start a local development server for your project: 💡 esa dev",
          ],
          [
            "Save a new version of code: 💡 esa commit",
          ],
          [
            "Deploy your project to different environments: 💡 esa deploy",
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
          {
            "type": "return",
            "value": undefined,
          },
        ],
      }
    `);
  });

  it('should skip the project git and deployment initialization', async () => {
    vi.mock('../../src/components/mutiLevelSelect.js', () => ({
      default: vi.fn().mockResolvedValue('/test/path/test-template-1')
    }));
    mockInquirerPrompt([
      { name: 'test-template-1' },
      { initGit: 'Yes' },
      { deploy: 'No' }
    ]);

    vi.spyOn(fsExtra, 'copy').mockImplementation(vi.mocked);
    vi.spyOn(fs, 'readdirSync').mockReturnValue(['test' as any]);

    await handleInit({
      _: [],
      $0: '',
      skip: true
    });
    expect(std.out).toMatchInlineSnapshot(`
      [MockFunction log] {
        "calls": [
          [
            {
              "name": "test-template-1",
            },
          ],
          [
            "Enter your routine project folder: 💡 cd test-template-1",
          ],
          [
            "Start a local development server for your project: 💡 esa dev",
          ],
          [
            "Save a new version of code: 💡 esa commit",
          ],
          [
            "Deploy your project to different environments: 💡 esa deploy",
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
        ],
      }
    `);
  });

  it('should handle template name parameter', async () => {
    vi.mock('../../src/components/mutiLevelSelect.js', () => ({
      default: vi.fn().mockResolvedValue('/test/path/test-template-1')
    }));
    mockInquirerPrompt([{ name: 'test-template-2' }]);

    await handleInit({
      _: [],
      $0: '',
      template: 'test-template-1',
      skip: true
    });
    expect(std.out).toMatchInlineSnapshot(`
      [MockFunction log] {
        "calls": [
          [
            {
              "name": "test-template-2",
            },
          ],
          [
            "Enter your routine project folder: 💡 cd test-template-2",
          ],
          [
            "Start a local development server for your project: 💡 esa dev",
          ],
          [
            "Save a new version of code: 💡 esa commit",
          ],
          [
            "Deploy your project to different environments: 💡 esa deploy",
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
        ],
      }
    `);
  });

  it('should handle project name parameter', async () => {
    vi.mock('../../src/components/mutiLevelSelect.js', () => ({
      default: vi.fn().mockResolvedValue('/test/path/test-template-1')
    }));
    mockInquirerPrompt([{ name: 'test-template-1' }]);

    await handleInit({
      _: [],
      $0: '',
      name: 'test-project',
      skip: true
    });
    expect(std.out).toMatchInlineSnapshot(`
      [MockFunction log] {
        "calls": [
          [
            "Enter your routine project folder: 💡 cd test-project",
          ],
          [
            "Start a local development server for your project: 💡 esa dev",
          ],
          [
            "Save a new version of code: 💡 esa commit",
          ],
          [
            "Deploy your project to different environments: 💡 esa deploy",
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
        ],
      }
    `);
  });
});
