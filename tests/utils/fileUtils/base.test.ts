import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterEach, describe, expect, it } from 'vitest';

import { getRoot } from '../../../src/utils/fileUtils/base.js';

const tempDirs: string[] = [];

function makeTempProject(configFileName: 'esa.jsonc' | 'esa.toml') {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'esa-cli-root-'));
  tempDirs.push(projectRoot);
  fs.writeFileSync(path.join(projectRoot, configFileName), '', 'utf-8');
  const nestedDir = path.join(projectRoot, 'src', 'nested');
  fs.mkdirSync(nestedDir, { recursive: true });
  return { projectRoot, nestedDir };
}

describe('getRoot', () => {
  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('should find esa.jsonc from a nested directory', () => {
    const { projectRoot, nestedDir } = makeTempProject('esa.jsonc');

    expect(getRoot(nestedDir)).toBe(projectRoot);
  });

  it('should find esa.toml from a nested directory', () => {
    const { projectRoot, nestedDir } = makeTempProject('esa.toml');

    expect(getRoot(nestedDir)).toBe(projectRoot);
  });
});
