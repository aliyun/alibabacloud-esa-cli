import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const packageJson = require('../../package.json');

/**
 * CLI User-Agent string for API requests
 * Format: esa-cli/{version}
 * This helps identify requests originating from the CLI
 */
export const CLI_USER_AGENT = `esa-cli/${packageJson.version}`;

/**
 * CLI version from package.json
 */
export const CLI_VERSION = packageJson.version;
