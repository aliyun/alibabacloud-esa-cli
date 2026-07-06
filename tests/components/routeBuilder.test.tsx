import React from 'react';
import { it, describe, expect, vi } from 'vitest';

import { routeBuilder } from '../../src/components/routeBuilder.js';

vi.mock('ink-text-input', () => ({
  default: vi.fn(() => null)
}));

vi.mock('ink', async () => {
  return {
    render: vi.fn((element: React.ReactElement) => {
      const unmountFn = vi.fn();
      const props = element.props;
      if (props && typeof props.onSubmit === 'function') {
        queueMicrotask(() => props.onSubmit(props.siteName));
      }
      return { unmount: unmountFn };
    }),
    Box: ({ children }: any) => children,
    Text: ({ children }: any) => children,
    useInput: vi.fn()
  };
});

describe('routeBuilder', () => {
  it('should resolve with a route when onSubmit is called', async () => {
    const result = await routeBuilder('example.com');
    expect(result).toBe('example.com');
  });
});
