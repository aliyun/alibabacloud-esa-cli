import { promises as fs } from 'fs';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  checkCLIVersion,
  handleCheckVersion
} from '../../src/utils/checkVersion.js';
import { mockConsoleMethods } from '../helper/mockConsole.js';

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  prompt: vi.fn(),
  execCommand: vi.fn(),
  getProxyAgent: vi.fn(),
  logger: {
    block: vi.fn(),
    log: vi.fn(),
    warn: vi.fn(),
    subLog: vi.fn(),
    divider: vi.fn()
  }
}));

vi.mock('node-fetch', () => ({ default: mocks.fetch }));
vi.mock('inquirer', () => ({ default: { prompt: mocks.prompt } }));
vi.mock('../../src/utils/command.js', () => ({ default: mocks.execCommand }));
vi.mock('../../src/libs/proxy.js', () => ({
  getProxyAgent: mocks.getProxyAgent
}));
vi.mock('../../src/libs/logger.js', () => ({ default: mocks.logger }));

describe('handleCheckVersion', () => {
  let mockReadFile: any;
  let std = mockConsoleMethods();
  beforeEach(() => {
    mockReadFile = vi
      .spyOn(fs, 'readFile')
      .mockResolvedValue('{"version": "1.0.0"}');
  });
  afterEach(() => vi.restoreAllMocks());

  it('should log the current version', async () => {
    await handleCheckVersion();
    expect(mockReadFile).toHaveBeenCalledWith(expect.any(String), 'utf-8');
    expect(std.out).toHaveBeenCalledWith('v1.0.0');
    expect(std.err).not.toHaveBeenCalled();
  });

  it('should log an error if reading the version fails', async () => {
    const error = new Error('Failed to read file');
    mockReadFile.mockRejectedValue(error);
    await handleCheckVersion();
    expect(mockReadFile).toHaveBeenCalledWith(expect.any(String), 'utf-8');
    expect(std.out).not.toHaveBeenCalled();
    expect(std.err).toHaveBeenCalledWith('Error reading version', error);
  });
});

describe('checkCLIVersion', () => {
  function currentVersion(version: string) {
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({ version }));
  }

  function availableVersion(version: string) {
    mocks.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ version })
    });
  }

  function output() {
    return mocks.logger.log.mock.calls.flat().join('\n');
  }

  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('ESA_NO_UPDATE_CHECK', '');
    vi.spyOn(fs, 'readFile').mockResolvedValue('{"version":"1.0.13"}');
    availableVersion('1.0.14');
    mocks.prompt.mockResolvedValue({ updateNow: false });
    mocks.execCommand.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('checks latest for stable installations and keeps the proxy transport', async () => {
    await expect(checkCLIVersion('deploy')).resolves.toBe(false);

    expect(mocks.fetch).toHaveBeenCalledWith(
      'https://registry.npmmirror.com/esa-cli/latest',
      expect.objectContaining({
        agent: mocks.getProxyAgent,
        signal: expect.any(AbortSignal)
      })
    );
    expect(output()).toContain('npm i -g esa-cli@latest');
    expect(mocks.prompt).not.toHaveBeenCalled();
    expect(mocks.execCommand).not.toHaveBeenCalled();
  });

  it('checks beta and orders numeric prerelease identifiers correctly', async () => {
    currentVersion('1.0.14-beta.9');
    availableVersion('1.0.14-beta.10');

    await expect(checkCLIVersion('deploy')).resolves.toBe(false);

    expect(mocks.fetch).toHaveBeenCalledWith(
      'https://registry.npmmirror.com/esa-cli/beta',
      expect.any(Object)
    );
    expect(output()).toContain('npm i -g esa-cli@beta');
    expect(output()).toContain('yarn global add esa-cli@beta');
    expect(output()).toContain('pnpm add -g esa-cli@beta');
    expect(output()).not.toContain('esa-cli@latest');
    expect(mocks.execCommand).not.toHaveBeenCalled();
  });

  it.each([
    ['1.0.13', '1.0.14-beta.1', 'latest'],
    ['1.0.14-beta.1', '1.0.14', 'beta']
  ])(
    'does not switch %s to %s when the %s registry tag uses another channel',
    async (current, available, channel) => {
      currentVersion(current);
      availableVersion(available);

      await expect(checkCLIVersion('init')).resolves.toBe(true);

      expect(mocks.fetch).toHaveBeenCalledWith(
        `https://registry.npmmirror.com/esa-cli/${channel}`,
        expect.any(Object)
      );
      expect(mocks.logger.log).not.toHaveBeenCalled();
      expect(mocks.prompt).not.toHaveBeenCalled();
      expect(mocks.execCommand).not.toHaveBeenCalled();
    }
  );

  it.each([
    ['1.0.13', '1.0.13'],
    ['1.0.14', '1.0.13'],
    ['1.0.13', '1.0.13+registry-build'],
    ['1.0.14-beta.10', '1.0.14-beta.10'],
    ['1.0.14-beta.10', '1.0.14-beta.9'],
    ['1.1.0-beta.1', '1.0.14-beta.20']
  ])(
    'does not offer a downgrade or reinstall from %s to %s',
    async (current, available) => {
      currentVersion(current);
      availableVersion(available);

      await expect(checkCLIVersion('init')).resolves.toBe(true);

      expect(mocks.logger.log).not.toHaveBeenCalled();
      expect(mocks.prompt).not.toHaveBeenCalled();
      expect(mocks.execCommand).not.toHaveBeenCalled();
    }
  );

  it.each(['1.0.14-efc.1', '1.0.14-rc.1', 'not-a-version'])(
    'does not switch the unrecognized installed version %s to another channel',
    async (version) => {
      currentVersion(version);

      await expect(checkCLIVersion('init')).resolves.toBe(true);

      expect(mocks.fetch).not.toHaveBeenCalled();
      expect(mocks.prompt).not.toHaveBeenCalled();
      expect(mocks.execCommand).not.toHaveBeenCalled();
    }
  );

  it('ignores malformed registry versions without offering an update', async () => {
    availableVersion('not-a-version');

    await expect(checkCLIVersion('init')).resolves.toBe(true);

    expect(mocks.prompt).not.toHaveBeenCalled();
    expect(mocks.execCommand).not.toHaveBeenCalled();
  });

  it('preserves the explicit update-check opt out', async () => {
    vi.stubEnv('ESA_NO_UPDATE_CHECK', '1');

    await expect(checkCLIVersion('init')).resolves.toBe(true);

    expect(fs.readFile).not.toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.prompt).not.toHaveBeenCalled();
  });

  it('continues when the selected registry channel is unavailable', async () => {
    currentVersion('1.0.14-beta.1');
    mocks.fetch.mockResolvedValue({ ok: false });

    await expect(checkCLIVersion('init')).resolves.toBe(true);

    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.prompt).not.toHaveBeenCalled();
    expect(mocks.execCommand).not.toHaveBeenCalled();
  });

  it('aborts a stalled registry request after five seconds', async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    mocks.fetch.mockImplementation((_url, options) => {
      signal = options.signal;
      return new Promise((_resolve, reject) => {
        signal!.addEventListener('abort', () => reject(new Error('Aborted')));
      });
    });

    const check = checkCLIVersion('init');
    await vi.advanceTimersByTimeAsync(5000);

    await expect(check).resolves.toBe(true);
    expect(signal?.aborted).toBe(true);
    expect(mocks.prompt).not.toHaveBeenCalled();
    expect(mocks.execCommand).not.toHaveBeenCalled();
  });

  it('keeps the beta tag when an init user confirms the update', async () => {
    currentVersion('1.0.14-beta.1');
    availableVersion('1.0.14-beta.2');
    mocks.prompt.mockResolvedValue({ updateNow: true });

    await expect(checkCLIVersion('init')).resolves.toBe(false);

    expect(mocks.execCommand).toHaveBeenCalledWith(
      ['npm', 'i', '-g', 'esa-cli@beta'],
      expect.objectContaining({
        startText: 'Updating ESA CLI to beta (npm i -g esa-cli@beta)',
        interactive: false
      })
    );
  });

  it.each(['reported failure', 'rejected command'])(
    'keeps beta in every fallback command after a %s',
    async (failure) => {
      currentVersion('1.0.14-beta.1');
      availableVersion('1.0.14-beta.2');
      mocks.prompt.mockResolvedValue({ updateNow: true });
      if (failure === 'reported failure') {
        mocks.execCommand.mockResolvedValue({ success: false });
      } else {
        mocks.execCommand.mockRejectedValue(new Error('Update failed'));
      }

      await expect(checkCLIVersion('init')).resolves.toBe(false);

      expect(mocks.logger.subLog.mock.calls).toEqual([
        ['sudo npm i -g esa-cli@beta'],
        ['yarn global add esa-cli@beta'],
        ['pnpm add -g esa-cli@beta']
      ]);
    }
  );
});
