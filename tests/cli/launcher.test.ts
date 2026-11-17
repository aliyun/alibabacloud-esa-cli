import { readFileSync } from 'node:fs';
import path from 'node:path';
import { runInNewContext } from 'node:vm';

import { describe, expect, it, vi } from 'vitest';

function launch() {
  const handlers = new Map<string, (...args: unknown[]) => void>();
  const child = {
    on: vi.fn((event, callback) => {
      handlers.set(event, callback);
      return child;
    }),
    kill: vi.fn()
  };
  const module = { exports: {} };
  const require = Object.assign(
    (name: string) => {
      if (name === 'fs') return { existsSync: () => true };
      if (name === 'path') return path;
      if (name === 'cross-spawn') return () => child;
      throw new Error(`Unexpected module: ${name}`);
    },
    { main: module }
  );
  const process = {
    execPath: 'node',
    argv: ['node', 'esa'],
    execArgv: [],
    env: {},
    pid: 123,
    on: vi.fn(),
    exit: vi.fn(),
    kill: vi.fn(),
    exitCode: undefined as number | undefined
  };
  const console = { log: vi.fn(), error: vi.fn() };
  runInNewContext(readFileSync('bin/enter.cjs', 'utf8'), {
    require,
    module,
    __dirname: path.resolve('bin'),
    process,
    console
  });
  return { handlers, process, console };
}

describe('CLI launcher exit contract', () => {
  it('reports child startup failure to stderr and preserves exit 1', () => {
    const { handlers, process, console } = launch();
    handlers.get('error')!(new Error('spawn failed'));
    expect(process.exitCode).toBe(1);
    expect(console.error).toHaveBeenCalled();
    expect(console.log).not.toHaveBeenCalled();
  });
  it.each([0, 1])('forwards child exit %i', (code) => {
    const { handlers, process } = launch();
    handlers.get('exit')!(code, null);
    expect(process.exit).toHaveBeenCalledWith(code);
  });
});
