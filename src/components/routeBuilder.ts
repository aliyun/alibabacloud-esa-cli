import { text, isCancel } from '@clack/prompts';
import chalk from 'chalk';

import t from '../i18n/index.js';
import logger from '../libs/logger.js';

/**
 * Interactively build a route for the given site (prefix + suffix),
 * based on @clack/prompts. Returns the built route, or null if cancelled.
 */
export const routeBuilder = async (
  siteName: string
): Promise<string | null> => {
  logger.log(`Building route for site: ${chalk.cyan(siteName)}`);

  const prefix = await text({
    message: t('route_builder_prefix_prompt')
      .d(`Enter route prefix for ${siteName} (e.g., abc, def):`)
      .replace('${siteName}', siteName),
    defaultValue: ''
  });
  if (isCancel(prefix)) {
    return null;
  }

  const prefixWithDot = prefix ? `${prefix}.` : '';
  const suffix = await text({
    message: t('route_builder_suffix_prompt')
      .d(`Enter route suffix for ${siteName} (e.g., *, users/*):`)
      .replace('${siteName}', siteName),
    placeholder: `Preview: ${prefixWithDot}${siteName}`,
    defaultValue: ''
  });
  if (isCancel(suffix)) {
    return null;
  }

  const suffixWithSlash = suffix ? `/${suffix}` : '';
  const route = `${prefixWithDot}${siteName}${suffixWithSlash}`;
  logger.log(chalk.green(`Preview: ${route}`));
  return route;
};
