// init.test.js
import { it, describe, expect, vi } from 'vitest';
import { handleInit } from '../../src/commands/init/index.js';
import * as selectInput from '../../src/components/selectInput.js';
import * as descriptionInput from '../../src/components/descriptionInput.js';
import { mockConsoleMethods } from '../helper/mockConsole.js';
import fs from 'fs';
import fsExtra from 'fs-extra';
import * as Process from 'process';
import * as Util from '../../src/utils/fileUtils/index.js';
import inquirer from 'inquirer';
import { checkAndUpdatePackage } from '../../src/commands/init/helper.js';
import { mockInquirerPrompt } from './helper.js';

vi.mock('child_process');
vi.mock('fs/promises', () => ({
  rename: vi.fn()
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
            "
      🎉  SUCCESS  Your code has been successfully deployed",
          ],
          [
            "👉 Run this command to add domains: esa domain add <DOMAIN>",
          ],
          [
            "
      🎉  SUCCESS  Project deployment completed. Visit: ",
          ],
          [
            "
       WARNING  The domain may take some time to take effect, please try again later.",
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
            "
      🎉  SUCCESS  Your code has been successfully deployed",
          ],
          [
            "👉 Run this command to add domains: esa domain add <DOMAIN>",
          ],
          [
            "
      🎉  SUCCESS  Project deployment completed. Visit: ",
          ],
          [
            "
       WARNING  The domain may take some time to take effect, please try again later.",
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
});
