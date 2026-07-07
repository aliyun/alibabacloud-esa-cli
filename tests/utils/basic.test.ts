import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { checkEntryFileExist } from '../../src/utils/checkEntryFileExist.js';
import { checkOS, Platforms } from '../../src/utils/checkOS.js';
import debounce from '../../src/utils/debounce.js';
import { calculateFileMD5 } from '../../src/utils/fileMd5.js';
import { getProjectConfig } from '../../src/utils/fileUtils/index.js';
import { readJson } from '../../src/utils/readJson.js';
import sleep from '../../src/utils/sleep.js';
import stepsRunner from '../../src/utils/stepsRunner.js';

const oraMocks = vi.hoisted(() => {
  const spinner = {
    start: vi.fn(),
    succeed: vi.fn(),
    fail: vi.fn()
  };
  spinner.start.mockReturnValue(spinner);
  return {
    spinner,
    ora: vi.fn(() => spinner)
  };
});

vi.mock('ora', () => ({
  default: oraMocks.ora
}));

const tempDirs: string[] = [];

function makeTempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'esa-cli-basic-utils-'));
  tempDirs.push(dir);
  return dir;
}

beforeEach(() => {
  oraMocks.spinner.start.mockReturnValue(oraMocks.spinner);
  oraMocks.ora.mockReturnValue(oraMocks.spinner);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.clearAllMocks();

  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('readJson', () => {
  it('should read valid json files', () => {
    const dir = makeTempDir();
    const jsonPath = path.join(dir, 'config.json');
    fs.writeFileSync(jsonPath, '{"name":"esa","port":18080}');

    expect(readJson(jsonPath)).toEqual({ name: 'esa', port: 18080 });
  });

  it('should throw TypeError for invalid json files', () => {
    const dir = makeTempDir();
    const jsonPath = path.join(dir, 'broken.json');
    fs.writeFileSync(jsonPath, '{');

    expect(() => readJson(jsonPath)).toThrow(
      `${jsonPath} is not a valid JSON file.`
    );
  });
});

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should call the wrapped function after the wait period', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 50);

    debounced('first');
    debounced('second');

    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(50);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('second');
  });

  it('should call immediately once when immediate mode is enabled', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 50, true);

    debounced('first');
    debounced('second');
    vi.advanceTimersByTime(50);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('first');
  });
});

describe('sleep', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should resolve after the provided timeout', async () => {
    const promise = sleep(25);

    vi.advanceTimersByTime(24);
    await Promise.resolve();
    vi.advanceTimersByTime(1);

    await expect(promise).resolves.toBeUndefined();
  });
});

describe('calculateFileMD5', () => {
  it('should calculate md5 for a file', async () => {
    const dir = makeTempDir();
    const filePath = path.join(dir, 'payload.txt');
    fs.writeFileSync(filePath, 'hello');

    await expect(calculateFileMD5(filePath)).resolves.toBe(
      '5d41402abc4b2a76b9719d911017c592'
    );
  });

  it('should reject when the file cannot be read', async () => {
    await expect(
      calculateFileMD5(path.join(makeTempDir(), 'missing.txt'))
    ).rejects.toThrow();
  });
});

describe('checkEntryFileExist', () => {
  it('should pass when project config has no entry', () => {
    vi.mocked(getProjectConfig).mockReturnValue({ name: 'project' } as any);

    expect(checkEntryFileExist()).toBe(true);
  });

  it('should check whether configured entry file exists', () => {
    const dir = makeTempDir();
    const entryPath = path.join(dir, 'index.ts');
    fs.writeFileSync(entryPath, 'export default {};');
    vi.mocked(getProjectConfig).mockReturnValue({ entry: entryPath } as any);

    expect(checkEntryFileExist()).toBe(true);

    vi.mocked(getProjectConfig).mockReturnValue({
      entry: path.join(dir, 'missing.ts')
    } as any);
    expect(checkEntryFileExist()).toBe(false);
  });
});

describe('checkOS', () => {
  it('should detect windows', () => {
    vi.spyOn(os, 'platform').mockReturnValue('win32');
    vi.spyOn(os, 'cpus').mockReturnValue([{ model: 'Intel' }] as any);

    expect(checkOS()).toBe(Platforms.Win);
  });

  it('should detect apple silicon and intel macs', () => {
    vi.spyOn(os, 'platform').mockReturnValue('darwin');
    vi.spyOn(os, 'cpus').mockReturnValue([{ model: 'Apple M3' }] as any);
    expect(checkOS()).toBe(Platforms.AppleArm);

    vi.mocked(os.cpus).mockReturnValue([{ model: 'Intel' }] as any);
    expect(checkOS()).toBe(Platforms.AppleIntel);
  });

  it('should detect x64 and non-x64 linux', () => {
    vi.spyOn(os, 'platform').mockReturnValue('linux');
    vi.spyOn(os, 'cpus').mockReturnValue([{ model: 'Intel' }] as any);
    vi.spyOn(os, 'arch').mockReturnValue('x64');
    expect(checkOS()).toBe(Platforms.LinuxX86);

    vi.mocked(os.arch).mockReturnValue('arm64');
    expect(checkOS()).toBe(Platforms.Linux);
  });
});

describe('stepsRunner', () => {
  it('should run promise functions in order and record successes', async () => {
    const first = vi.fn().mockResolvedValue('one');
    const second = vi.fn().mockResolvedValue('two');

    await expect(stepsRunner([first, second])).resolves.toEqual([
      { status: 'success', message: 'one' },
      { status: 'success', message: 'two' }
    ]);

    expect(first.mock.invocationCallOrder[0]).toBeLessThan(
      second.mock.invocationCallOrder[0]
    );
    expect(oraMocks.spinner.succeed).toHaveBeenCalledTimes(2);
  });

  it('should stop after the first failed promise function', async () => {
    const first = vi.fn().mockResolvedValue('one');
    const second = vi.fn().mockRejectedValue(new Error('failed'));
    const third = vi.fn().mockResolvedValue('three');

    await expect(stepsRunner([first, second, third])).resolves.toEqual([
      { status: 'success', message: 'one' },
      { status: 'error', message: 'failed' }
    ]);

    expect(third).not.toHaveBeenCalled();
    expect(oraMocks.spinner.fail).toHaveBeenCalledWith('Error: failed');
  });
});
