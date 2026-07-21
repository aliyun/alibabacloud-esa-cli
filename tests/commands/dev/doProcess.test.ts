import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  logger: {
    block: vi.fn(),
    log: vi.fn()
  },
  openInBrowser: vi.fn()
}));

vi.mock('../../../src/libs/logger.js', () => ({
  default: mocks.logger
}));

vi.mock('../../../src/utils/checkOS.js', () => ({
  Platforms: {
    AppleArm: 'darwin-arm64',
    AppleIntel: 'darwin-x86_64',
    LinuxX86: 'linux-x86_64'
  },
  checkOS: vi.fn(() => 'darwin-arm64')
}));

vi.mock('../../../src/utils/fileUtils/index.js', () => ({
  getDevOpenBrowserUrl: vi.fn(() => 'http://localhost:18080')
}));

vi.mock('../../../src/utils/openInBrowser.js', () => ({
  default: mocks.openInBrowser
}));

import doProcess, {
  formatShortcutPanel
} from '../../../src/commands/dev/doProcess.js';

describe('dev keyboard shortcuts', () => {
  beforeEach(() => {
    mocks.logger.block.mockClear();
    mocks.logger.log.mockClear();
    mocks.openInBrowser.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('stacks shortcut instructions when the terminal is narrow', () => {
    const lines = formatShortcutPanel(true, 40);

    expect(lines).toHaveLength(5);
    expect(lines[1]).toContain('[b] open a browser');
    expect(lines[2]).toContain('[c] clear console');
    expect(lines[3]).toContain('[x] to exit');
    expect(lines.every((line) => line.length <= 40)).toBe(true);
  });

  it('redraws the shortcut panel after clearing the console', async () => {
    const existingDataListeners = new Set(process.stdin.listeners('data'));
    vi.spyOn(process.stdin, 'setEncoding').mockImplementation(
      () => process.stdin
    );
    vi.spyOn(process.stdin, 'resume').mockImplementation(() => process.stdin);
    vi.spyOn(process.stdin, 'pause').mockImplementation(() => process.stdin);
    const clear = vi.spyOn(console, 'clear').mockImplementation(() => {});
    const processExit = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);

    const { devElement, exit } = doProcess();
    const initialPanel = mocks.logger.log.mock.calls.map(([line]) => line);
    const dataListener = process.stdin
      .listeners('data')
      .find((listener) => !existingDataListeners.has(listener));

    expect(dataListener).toBeDefined();
    await dataListener?.('c');

    expect(clear).toHaveBeenCalledOnce();
    expect(mocks.logger.block).toHaveBeenCalledOnce();
    expect(mocks.logger.log.mock.calls.map(([line]) => line)).toEqual([
      ...initialPanel,
      ...initialPanel
    ]);

    const waitUntilExit = devElement.waitUntilExit();
    exit();
    await waitUntilExit;
    vi.runAllTimers();

    expect(processExit).toHaveBeenCalledWith(0);
    expect(process.stdin.listeners('data')).toEqual(
      expect.not.arrayContaining([dataListener])
    );
  });
});
