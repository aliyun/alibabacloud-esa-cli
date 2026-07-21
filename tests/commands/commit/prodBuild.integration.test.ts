import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterEach, describe, expect, it, vi } from 'vitest';

const tempDirs: string[] = [];

async function loadRealProdBuild() {
  vi.resetModules();
  vi.doUnmock('../../../src/commands/commit/prodBuild.ts');
  vi.doUnmock('../../../src/commands/commit/prodBuild.js');
  vi.doUnmock('esbuild');
  vi.doUnmock('esbuild-plugin-less');

  return (await import('../../../src/commands/commit/prodBuild.js')).default;
}

afterEach(() => {
  vi.resetModules();

  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 100
    });
  }
});

describe('prodBuild esbuild integration', () => {
  it('bundles a JavaScript entry that imports Less', async () => {
    const projectRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), 'esa-cli-prod-build-')
    );
    tempDirs.push(projectRoot);

    const sourceDir = path.join(projectRoot, 'src');
    const entryPath = path.join(sourceDir, 'index.js');
    fs.mkdirSync(sourceDir, { recursive: true });
    fs.writeFileSync(
      path.join(sourceDir, 'styles.less'),
      '@brand-color: #123456;\n.regression { color: @brand-color; }\n'
    );
    fs.writeFileSync(
      entryPath,
      "import './styles.less';\nexport const marker = 'less-entry-built';\n"
    );

    const prodBuild = await loadRealProdBuild();
    const result = await prodBuild(false, entryPath, projectRoot);
    const outputPath = path.join(projectRoot, '.dev', 'pub.js');

    expect(result.errors).toEqual([]);
    expect(fs.existsSync(outputPath)).toBe(true);
    expect(fs.readFileSync(outputPath, 'utf8')).toContain('less-entry-built');
  });
});
