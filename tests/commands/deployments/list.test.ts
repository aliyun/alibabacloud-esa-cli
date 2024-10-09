import { it, describe, expect, vi } from 'vitest';
import { handleListDeployments } from '../../../src/commands/deployments/list.js';
import { mockConsoleMethods } from '../../helper/mockConsole.js';
import { ApiService } from '../../../src/libs/apiService.js';

describe('handle display deployments', () => {
  let std = mockConsoleMethods();

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should handle display deployments success', async () => {
    await handleListDeployments({
      _: [],
      $0: ''
    });
    expect(std.out).matchSnapshot();
  });

  it('should handle display deployments -- show env ip error', async () => {
    vi.mocked(
      (await ApiService.getInstance()).getRoutineStagingEnvIp
    ).mockResolvedValue({} as any);
    await handleListDeployments({
      _: [],
      $0: ''
    });
    expect(std.out).matchSnapshot();
  });
});
