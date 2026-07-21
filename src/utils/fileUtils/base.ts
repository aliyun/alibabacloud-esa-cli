import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const projectConfigFiles = ['esa.jsonc', 'esa.toml'];

export const getDirName = (metaUrl: string) => {
  const __filename = fileURLToPath(metaUrl);
  const __dirname = path.dirname(__filename);
  return __dirname;
};

export const getRoot = (root?: string): string => {
  const start = path.resolve(root ?? process.cwd());
  let current = start;

  while (true) {
    try {
      const hasProjectConfig = projectConfigFiles.some((fileName) =>
        fs.existsSync(path.join(current, fileName))
      );
      if (hasProjectConfig) {
        return current;
      }
    } catch {}

    const parent = path.dirname(current);
    if (parent === current) {
      return process.cwd();
    }
    current = parent;
  }
};
