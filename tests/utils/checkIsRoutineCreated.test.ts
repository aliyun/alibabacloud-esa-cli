import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiService } from '../../src/libs/apiService.js';
import {
  ensureRoutineExists,
  isRoutineExist
} from '../../src/utils/checkIsRoutineCreated.js';

vi.mock('../../src/libs/apiService.js');
vi.mock('../../src/libs/logger.js', () => ({
  default: {
    log: vi.fn(),
    warn: vi.fn(),
    startSubStep: vi.fn(),
    endSubStep: vi.fn()
  }
}));
vi.mock('@clack/prompts', () => ({
  log: { step: vi.fn() }
}));

describe('checkIsRoutineCreated', () => {
  const server = {
    getRoutine: vi.fn(),
    createRoutine: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ApiService.getInstance).mockResolvedValue(server as any);
  });

  it('does not create a routine that already exists', async () => {
    server.getRoutine.mockResolvedValue({ data: {} });

    await expect(ensureRoutineExists('existing-app')).resolves.toBeUndefined();

    expect(server.createRoutine).not.toHaveBeenCalled();
    await expect(isRoutineExist('existing-app')).resolves.toBe(true);
  });

  it('creates a missing routine', async () => {
    server.getRoutine.mockResolvedValue(null);
    server.createRoutine.mockResolvedValue({ data: { Status: 'OK' } });

    await expect(ensureRoutineExists('new-app')).resolves.toBeUndefined();

    expect(server.createRoutine).toHaveBeenCalledWith({
      name: 'new-app',
      description: '',
      hasAssets: true
    });
  });

  it('throws when routine creation fails instead of exiting with code zero', async () => {
    server.getRoutine.mockResolvedValue(null);
    server.createRoutine.mockResolvedValue(null);
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('unexpected process.exit');
    }) as never);

    await expect(ensureRoutineExists('broken-app')).rejects.toThrow(
      'Failed to create routine broken-app'
    );
    expect(exitSpy).not.toHaveBeenCalled();
  });
});
