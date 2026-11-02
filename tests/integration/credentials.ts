import { integrationConfig } from '../../scripts/release/integration-config.mjs';

let credentials: ReturnType<typeof integrationConfig> | null = null;
try {
  credentials = integrationConfig(process.env);
} catch (error) {
  if (process.env.ESA_TEST_REQUIRE_INTEGRATION === '1') throw error;
}
export const CREDENTIALS = credentials;
export function hasCredentials() {
  return CREDENTIALS !== null;
}
