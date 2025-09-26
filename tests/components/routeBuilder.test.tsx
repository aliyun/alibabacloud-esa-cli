import { it, describe, expect } from 'vitest';
import { routeBuilder } from '../../src/components/routeBuilder.js';

// Mock the render function from ink
vi.mock('ink', () => ({
  render: vi.fn(() => ({ unmount: vi.fn() })),
  Box: ({ children }: any) => children,
  Text: ({ children }: any) => children
}));

// Mock TextInput from ink-text-input
vi.mock('ink-text-input', () => ({
  default: vi.fn()
}));

describe('RouteBuilder', () => {
  it('should build route with prefix and suffix correctly', async () => {
    const siteName = 'example.com';

    // Mock the TextInput to simulate user input
    const mockTextInput = vi.fn();
    const mockOnChange = vi.fn();
    const mockOnSubmit = vi.fn();

    // Simulate user entering prefix 'api' and suffix '*'
    mockTextInput.mockImplementation(({ onChange, onSubmit }) => {
      // Simulate entering prefix
      onChange('api');
      onSubmit();

      // Simulate entering suffix
      onChange('*');
      onSubmit();
    });

    const result = await routeBuilder(siteName);

    // The route should be built as: example.com.api.*
    expect(result).toBe('example.com.api.*');
  });

  it('should build route with only prefix', async () => {
    const siteName = 'example.com';

    // Mock user entering only prefix
    const mockTextInput = vi.fn();
    mockTextInput.mockImplementation(({ onChange, onSubmit }) => {
      onChange('api');
      onSubmit(); // prefix
      onChange(''); // empty suffix
      onSubmit(); // suffix
    });

    const result = await routeBuilder(siteName);

    // The route should be built as: example.com.api
    expect(result).toBe('example.com.api');
  });

  it('should build route with only suffix', async () => {
    const siteName = 'example.com';

    // Mock user entering only suffix
    const mockTextInput = vi.fn();
    mockTextInput.mockImplementation(({ onChange, onSubmit }) => {
      onChange(''); // empty prefix
      onSubmit(); // prefix
      onChange('*'); // suffix
      onSubmit(); // suffix
    });

    const result = await routeBuilder(siteName);

    // The route should be built as: example.com.*
    expect(result).toBe('example.com.*');
  });

  it('should build route without prefix and suffix', async () => {
    const siteName = 'example.com';

    // Mock user entering empty values
    const mockTextInput = vi.fn();
    mockTextInput.mockImplementation(({ onChange, onSubmit }) => {
      onChange(''); // empty prefix
      onSubmit(); // prefix
      onChange(''); // empty suffix
      onSubmit(); // suffix
    });

    const result = await routeBuilder(siteName);

    // The route should be built as: example.com
    expect(result).toBe('example.com');
  });
});
