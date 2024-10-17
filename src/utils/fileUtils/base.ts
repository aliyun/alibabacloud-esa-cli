import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const cliConfigFile = 'cliconfig.toml';

export const getDirName = (metaUrl: string) => {
  const __filename = fileURLToPath(metaUrl);
  const __dirname = path.dirname(__filename);
  return __dirname;
};

export const getRoot = (root?: string): string => {
  if (typeof root === 'undefined') {
    root = process.cwd();
  }
  if (root === '/') {
    return process.cwd();
  }
  const file = path.join(root, cliConfigFile);
  const prev = path.resolve(root, '../');
  try {
    const hasToml = fs.existsSync(file);
    if (hasToml) {
      return root;
    } else {
      return getRoot(prev);
    }
  } catch (err) {
    return getRoot(prev);
  }
};
