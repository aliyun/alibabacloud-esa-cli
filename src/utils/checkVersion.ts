import { promises as fs } from 'fs';
import { getDirName } from '../utils/fileUtils/base.js';
import path from 'path';

export async function handleCheckVersion() {
  const __dirname = getDirName(import.meta.url);
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  try {
    const jsonString = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(jsonString);
    console.log(`v${packageJson.version}`);
  } catch (error) {
    console.error('Error reading version', error);
  }
}
