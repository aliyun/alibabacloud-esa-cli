import fs from 'fs';

import { getProjectConfig } from './fileUtils/index.js';

export const checkEntryFileExist = (): boolean => {
  const projectConfig = getProjectConfig();
  const entry = projectConfig?.entry;
  if (!entry) {
    return true;
  }
  return fs.existsSync(entry);
};
