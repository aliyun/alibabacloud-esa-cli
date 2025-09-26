import open from 'open';

import t from '../i18n/index.js';
import logger from '../libs/logger.js';

/**
 * Open url in browser
 * @param {string} url
 */
const openInBrowser = async (url: string) => {
  const childProcess = await open(url);
  logger.success(t('open_in_browser_success', { url }).d(`Opened: ${url}`));
  childProcess.on('error', () => {
    logger.error(t('open_in_browser_error').d(`Failed to open: ${url}`));
  });
};

export default openInBrowser;
