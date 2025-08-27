import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

// Mock the logger to avoid console output during tests
vi.mock('../../../../src/libs/logger.js', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
    cfStepItem: vi.fn(),
    cfStepSpacer: vi.fn()
  }
}));

describe('Next.js Static Export Configuration', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create a temporary directory for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nextjs-test-'));
  });

  afterEach(async () => {
    // Clean up temporary directory
    if (tempDir && await fs.pathExists(tempDir)) {
      await fs.remove(tempDir);
    }
  });

  it('should create next.config.ts with static export config when no config exists', async () => {
    // Import the function dynamically to avoid module loading issues
    const { configureNextJsForStaticExport } = await import('../../../src/commands/init/index.js');
    
    await configureNextJsForStaticExport(tempDir);

    const configPath = path.join(tempDir, 'next.config.ts');
    expect(await fs.pathExists(configPath)).toBe(true);

    const configContent = await fs.readFile(configPath, 'utf-8');
    expect(configContent).toContain("output: 'export'");
    expect(configContent).toContain('trailingSlash: true');
    expect(configContent).toContain('unoptimized: true');
  });

  it('should modify existing next.config.ts to add static export config', async () => {
    // Create an existing next.config.ts file
    const existingConfig = `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true
}

module.exports = nextConfig`;

    const configPath = path.join(tempDir, 'next.config.ts');
    await fs.writeFile(configPath, existingConfig, 'utf-8');

    // Import the function dynamically
    const { configureNextJsForStaticExport } = await import('../../../src/commands/init/index.js');
    
    await configureNextJsForStaticExport(tempDir);

    const modifiedContent = await fs.readFile(configPath, 'utf-8');
    expect(modifiedContent).toContain("output: 'export'");
    expect(modifiedContent).toContain('trailingSlash: true');
    expect(modifiedContent).toContain('unoptimized: true');
    expect(modifiedContent).toContain('reactStrictMode: true');
    expect(modifiedContent).toContain('swcMinify: true');
  });

  it('should handle export default syntax in next.config.ts', async () => {
    // Create an existing next.config.ts file with export default syntax
    const existingConfig = `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true
}

export default nextConfig`;

    const configPath = path.join(tempDir, 'next.config.ts');
    await fs.writeFile(configPath, existingConfig, 'utf-8');

    // Import the function dynamically
    const { configureNextJsForStaticExport } = await import('../../../src/commands/init/index.js');
    
    await configureNextJsForStaticExport(tempDir);

    const modifiedContent = await fs.readFile(configPath, 'utf-8');
    expect(modifiedContent).toContain("output: 'export'");
    expect(modifiedContent).toContain('reactStrictMode: true');
  });

  it('should handle JavaScript config files', async () => {
    // Create an existing next.config.js file
    const existingConfig = `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true
}

module.exports = nextConfig`;

    const configPath = path.join(tempDir, 'next.config.js');
    await fs.writeFile(configPath, existingConfig, 'utf-8');

    // Import the function dynamically
    const { configureNextJsForStaticExport } = await import('../../../src/commands/init/index.js');
    
    await configureNextJsForStaticExport(tempDir);

    const modifiedContent = await fs.readFile(configPath, 'utf-8');
    expect(modifiedContent).toContain("output: 'export'");
    expect(modifiedContent).toContain('reactStrictMode: true');
  });

  it('should not modify config if output export is already configured', async () => {
    // Create an existing next.config.ts file with output: 'export' already set
    const existingConfig = `/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  reactStrictMode: true
}

module.exports = nextConfig`;

    const configPath = path.join(tempDir, 'next.config.ts');
    await fs.writeFile(configPath, existingConfig, 'utf-8');

    // Import the function dynamically
    const { configureNextJsForStaticExport } = await import('../../../src/commands/init/index.js');
    
    await configureNextJsForStaticExport(tempDir);

    const modifiedContent = await fs.readFile(configPath, 'utf-8');
    // Should remain unchanged
    expect(modifiedContent).toBe(existingConfig);
  });

  it('should handle MJS config files', async () => {
    // Create an existing next.config.mjs file
    const existingConfig = `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true
}

export default nextConfig`;

    const configPath = path.join(tempDir, 'next.config.mjs');
    await fs.writeFile(configPath, existingConfig, 'utf-8');

    // Import the function dynamically
    const { configureNextJsForStaticExport } = await import('../../../src/commands/init/index.js');
    
    await configureNextJsForStaticExport(tempDir);

    const modifiedContent = await fs.readFile(configPath, 'utf-8');
    expect(modifiedContent).toContain("output: 'export'");
    expect(modifiedContent).toContain('reactStrictMode: true');
  });
});
