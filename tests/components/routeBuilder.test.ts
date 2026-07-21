import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  isCancel: vi.fn(),
  logger: {
    log: vi.fn()
  },
  text: vi.fn(),
  t: vi.fn(() => ({
    d: vi.fn((defaultValue: string) => defaultValue)
  }))
}));

vi.mock('@clack/prompts', () => ({
  isCancel: mocks.isCancel,
  text: mocks.text
}));

vi.mock('../../src/i18n/index.js', () => ({
  default: mocks.t
}));

vi.mock('../../src/libs/logger.js', () => ({
  default: mocks.logger
}));

import { routeBuilder } from '../../src/components/routeBuilder.js';

describe('routeBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isCancel.mockReturnValue(false);
  });

  it('builds and returns a route from the two prompt values', async () => {
    mocks.text.mockResolvedValueOnce('api').mockResolvedValueOnce('users/*');

    await expect(routeBuilder('example.com')).resolves.toBe(
      'api.example.com/users/*'
    );

    expect(mocks.text).toHaveBeenNthCalledWith(1, {
      defaultValue: '',
      message: 'Enter route prefix for example.com (e.g., abc, def):'
    });
    expect(mocks.text).toHaveBeenNthCalledWith(2, {
      defaultValue: '',
      message: 'Enter route suffix for example.com (e.g., *, users/*):',
      placeholder: 'Preview: api.example.com'
    });
    expect(mocks.logger.log).toHaveBeenLastCalledWith(
      'Preview: api.example.com/users/*'
    );
  });

  it('returns null when the prefix prompt is cancelled', async () => {
    mocks.text.mockResolvedValue(Symbol('cancel'));
    mocks.isCancel.mockReturnValue(true);

    await expect(routeBuilder('example.com')).resolves.toBeNull();

    expect(mocks.text).toHaveBeenCalledOnce();
    expect(mocks.logger.log).toHaveBeenCalledOnce();
  });

  it('returns null when the suffix prompt is cancelled', async () => {
    mocks.text.mockResolvedValueOnce('api').mockResolvedValueOnce(Symbol());
    mocks.isCancel.mockReturnValueOnce(false).mockReturnValueOnce(true);

    await expect(routeBuilder('example.com')).resolves.toBeNull();

    expect(mocks.text).toHaveBeenCalledTimes(2);
    expect(mocks.logger.log).toHaveBeenCalledOnce();
  });
});
