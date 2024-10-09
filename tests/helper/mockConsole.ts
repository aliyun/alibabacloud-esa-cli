import { vi } from 'vitest';

let debugSpy: any, logSpy: any, infoSpy: any, errorSpy: any, warnSpy: any;

const std = {
  get debug() {
    return debugSpy;
  },
  get out() {
    return logSpy;
  },
  get info() {
    return infoSpy;
  },
  get err() {
    return errorSpy;
  },
  get warn() {
    return warnSpy;
  }
};

export function mockConsoleMethods() {
  beforeEach(() => {
    debugSpy = vi.spyOn(console, 'debug').mockImplementation(vi.fn());
    logSpy = vi.spyOn(console, 'log').mockImplementation(vi.fn());
    infoSpy = vi.spyOn(console, 'info').mockImplementation(vi.fn());
    errorSpy = vi.spyOn(console, 'error').mockImplementation(vi.fn());
  });

  afterEach(() => {
    debugSpy.mockRestore();
    logSpy.mockRestore();
    infoSpy.mockRestore();
    errorSpy.mockRestore();
  });
  return std;
}
