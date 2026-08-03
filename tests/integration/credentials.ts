/**
 * API Integration Test Credentials
 *
 * Replace the placeholder values with your real ESA test account credentials.
 * In CI, these are injected via GitHub Secrets → environment variables.
 *
 * DO NOT commit real credentials to the repository.
 * DO NOT use production credentials for testing.
 *
 * To set up locally:
 *   export ESA_TEST_ACCESS_KEY_ID=LTAI5tXXXXXXXXXXXXXXX
 *   export ESA_TEST_ACCESS_KEY_SECRET=XXXXXXXXXXXXXXXXXXXXXXXXXXXXX
 *   export ESA_TEST_SITE_ID=XXXXXXXX                    # Site to run tests against
 *   export ESA_TEST_PROJECT_NAME=test-e2e-project       # Project name for write tests
 *
 * Or set them in a .env file at the repo root (do NOT commit .env).
 */

export const CREDENTIALS = {
  accessKeyId:
    process.env.ESA_TEST_ACCESS_KEY_ID || '<YOUR_TEST_ACCESS_KEY_ID>',
  accessKeySecret:
    process.env.ESA_TEST_ACCESS_KEY_SECRET || '<YOUR_TEST_ACCESS_KEY_SECRET>',
  endpoint: process.env.ESA_TEST_ENDPOINT || 'esa.cn-hangzhou.aliyuncs.com',
  region: process.env.ESA_TEST_REGION || 'cn-hangzhou',
  siteId: process.env.ESA_TEST_SITE_ID || '<YOUR_TEST_SITE_ID>',
  projectName: process.env.ESA_TEST_PROJECT_NAME || 'integration-test-project'
};

/** Check if credentials are configured (not placeholders) */
export function hasCredentials(): boolean {
  return (
    !CREDENTIALS.accessKeyId.startsWith('<') &&
    !CREDENTIALS.accessKeySecret.startsWith('<') &&
    !CREDENTIALS.siteId.startsWith('<')
  );
}

/**
 * Skip helper — call at the top of each test to skip if credentials are missing.
 * Usage:
 *   import { skipIfNoCredentials } from '../credentials';
 *   it('should ...', async ({ skip }) => {
 *     skipIfNoCredentials(skip);
 *     ...
 *   });
 */
export function skipIfNoCredentials(skip: (reason?: string) => void) {
  if (!hasCredentials()) {
    skip(
      'Skipped: ESA test credentials not set. Set ESA_TEST_ACCESS_KEY_ID, ' +
        'ESA_TEST_ACCESS_KEY_SECRET, and ESA_TEST_SITE_ID env vars to run integration tests.'
    );
  }
}
