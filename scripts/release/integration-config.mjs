export const integrationKeys = [
  'ESA_TEST_ACCESS_KEY_ID',
  'ESA_TEST_ACCESS_KEY_SECRET',
  'ESA_TEST_SITE_ID',
  'ESA_TEST_SITE_NAME',
  'ESA_TEST_DOMAIN_SUFFIX',
  'ESA_TEST_ALLOW_WRITE'
];

export function integrationConfig(env) {
  const missing = integrationKeys.filter(
    (key) => !env[key]?.trim() || env[key].startsWith('<')
  );
  if (missing.length)
    throw new Error(`Missing integration configuration: ${missing.join(', ')}`);
  if (env.ESA_TEST_ALLOW_WRITE !== '1')
    throw new Error('Set ESA_TEST_ALLOW_WRITE=1 for the isolated test account');
  if (!/^\d+$/.test(env.ESA_TEST_SITE_ID))
    throw new Error('ESA_TEST_SITE_ID must be numeric');
  const site = env.ESA_TEST_SITE_NAME;
  const domain = env.ESA_TEST_DOMAIN_SUFFIX;
  const validDomain = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/;
  if (
    !validDomain.test(site) ||
    !validDomain.test(domain) ||
    !domain.endsWith(`.${site}`)
  ) {
    throw new Error(
      'Use a dedicated test subdomain beneath ESA_TEST_SITE_NAME'
    );
  }
  if (/(^|\.)(example\.(com|org|net)|localhost)$/.test(domain))
    throw new Error('Replace the example test domain');
  return {
    accessKeyId: env.ESA_TEST_ACCESS_KEY_ID,
    accessKeySecret: env.ESA_TEST_ACCESS_KEY_SECRET,
    securityToken: env.ESA_TEST_SECURITY_TOKEN || '',
    endpoint: env.ESA_TEST_ENDPOINT || 'esa.cn-hangzhou.aliyuncs.com',
    siteId: env.ESA_TEST_SITE_ID,
    siteName: site,
    domainSuffix: domain
  };
}
