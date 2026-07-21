import fs from 'fs';
import os from 'os';
import path from 'path';

import AdmZip from 'adm-zip';
import { afterEach, describe, expect, it } from 'vitest';

import { unzipFile } from '../../src/utils/download.js';

const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'esa-cli-adm-zip-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 100
    });
  }
});

describe('unzipFile', () => {
  it('extracts files created by adm-zip 0.6', () => {
    const tempDir = makeTempDir();
    const zipPath = path.join(tempDir, 'runtime.zip');
    const extractPath = path.join(tempDir, 'runtime');
    const zip = new AdmZip();

    zip.addFile('bin/esa-runtime.txt', Buffer.from('runtime-ready'));
    zip.writeZip(zipPath);

    unzipFile(zipPath, extractPath);

    expect(
      fs.readFileSync(path.join(extractPath, 'bin', 'esa-runtime.txt'), 'utf8')
    ).toBe('runtime-ready');
  });
});
