import { resolve } from 'path';

import { getCliConfig } from '../utils/fileUtils/index.js';
import logger from '../libs/logger.js';
import { readJson } from '../utils/readJson.js';
import { getDirName } from '../utils/fileUtils/base.js';

const localesJson = readJson(
  resolve(getDirName(import.meta.url), './locales.json')
);

interface Locales {
  [key: string]: {
    [lang: string]: string;
  };
}

const t = (key: string, variables?: { [key: string]: string }) => {
  const locales: Locales = localesJson;
  const lang = getCliConfig()?.lang || 'en';
  let translation = '';
  if (locales[key] && locales[key][lang]) {
    translation = locales[key][lang];
  } else {
    logger.verbose('Not find key: ' + key);
    translation = locales[key].en;
  }
  if (variables) {
    for (const variable in variables) {
      translation = translation.replace(`\${${variable}}`, variables[variable]);
    }
  }
  return {
    d: (defaultText: string) => {
      return translation || defaultText;
    }
  };
};

export default t;
