import { it, describe, expect, vi } from 'vitest';
import * as descriptionInput from '../../../src/components/descriptionInput.js';
import { handlerAddRoute } from '../../../src/commands/route/add.js';
import logger from '../../../src/libs/logger.js';
import { Option } from './../../../src/components/filterSelector';

import { validDomain, validName } from '../../../src/commands/utils.js';
import { mockConsoleMethods } from '../../helper/mockConsole.js';
import { ApiService } from '../../../src/libs/apiService.js';
import * as Component from '../../../src/components/filterSelector.js';

describe('handle add routes', () => {
  let std = mockConsoleMethods();
  vi.spyOn(logger, 'error').mockImplementation(() => {});
  vi.spyOn(descriptionInput, 'descriptionInput').mockResolvedValue(
    'test.com/*'
  );
  vi.spyOn(Component, 'promptFilterSelector').mockResolvedValue({
    label: 'test.com/*',
    value: 'test.com/*'
  });
  afterEach(() => {
    vi.clearAllMocks();
  });
  it('should handle adding two routes success', async () => {
    vi.mocked(validDomain).mockReturnValue(true);
    vi.mocked(validName).mockResolvedValue(true);
    vi.spyOn(descriptionInput, 'descriptionInput').mockResolvedValue(
      'test.com/*'
    );
    vi.spyOn(Component, 'promptFilterSelector').mockResolvedValue({
      label: 'test.com/*',
      value: 'test.com/*'
    });
    await handlerAddRoute({
      site: 'test.com',
      route: 'test.com/1',
      _: [],
      $0: ''
    });
    expect(std.out).toBeCalledWith(
      expect.stringContaining('Add route success!')
    );
  });
  it('should handle adding two routes fail', async () => {
    vi.mocked(validDomain).mockReturnValue(true);
    vi.mocked(validName).mockResolvedValue(true);
    vi.mocked(
      (await ApiService.getInstance()).createRoutineRelatedRoute
    ).mockResolvedValue({
      data: {
        Status: 'error'
      }
    } as any);
    await handlerAddRoute({
      site: 'test.com',
      route: 'test.com/1',
      _: [],
      $0: ''
    });
    expect(logger.error).toBeCalledWith(`Add route fail!`);
  });
  it('should handle inputting routes not corresponding to the domain', async () => {
    vi.spyOn(descriptionInput, 'descriptionInput').mockResolvedValue(
      'test2.com/*'
    );
    await handlerAddRoute({
      route: 'test.com/1',
      site: 'test1.com',
      _: [],
      $0: ''
    });
    expect(logger.error).toBeCalledWith('Add route fail!');
  });
});
