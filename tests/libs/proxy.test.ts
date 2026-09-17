import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getProxyAgent } from '../../src/libs/proxy.js';

export const proxyEnvKeys = [
  'http_proxy',
  'HTTP_PROXY',
  'https_proxy',
  'HTTPS_PROXY',
  'all_proxy',
  'ALL_PROXY',
  'no_proxy',
  'NO_PROXY',
  'npm_config_proxy',
  'NPM_CONFIG_PROXY',
  'npm_config_http_proxy',
  'NPM_CONFIG_HTTP_PROXY',
  'npm_config_https_proxy',
  'NPM_CONFIG_HTTPS_PROXY',
  'npm_config_no_proxy',
  'NPM_CONFIG_NO_PROXY'
];

beforeEach(() => {
  for (const key of proxyEnvKeys) vi.stubEnv(key, '');
});

afterEach(() => vi.unstubAllEnvs());

describe('proxy environment configuration', () => {
  it('uses the normal transport when no proxy is configured', () => {
    expect(
      getProxyAgent('https://esa.cn-hangzhou.aliyuncs.com/')
    ).toBeUndefined();
    expect(getProxyAgent('http://example.com/')).toBeUndefined();
  });

  it.each(['HTTPS_PROXY', 'https_proxy'])(
    'honors %s for HTTPS requests',
    (key) => {
      vi.stubEnv(key, 'http://proxy.example.com:9400');
      const agent = getProxyAgent('https://esa.cn-hangzhou.aliyuncs.com/');
      expect(agent).toBeInstanceOf(HttpsProxyAgent);
      expect((agent as HttpsProxyAgent<string>).proxy.href).toBe(
        'http://proxy.example.com:9400/'
      );
    }
  );

  it.each(['HTTP_PROXY', 'http_proxy'])(
    'honors %s for HTTP requests',
    (key) => {
      vi.stubEnv(key, 'http://proxy.example.com:9400');
      expect(getProxyAgent('http://example.com/')).toBeInstanceOf(
        HttpProxyAgent
      );
    }
  );

  it('prefers the lowercase variable for each protocol', () => {
    vi.stubEnv('HTTPS_PROXY', 'http://uppercase.example.com:9400');
    vi.stubEnv('https_proxy', 'http://lowercase.example.com:9400');
    vi.stubEnv('HTTP_PROXY', 'http://uppercase.example.com:9400');
    vi.stubEnv('http_proxy', 'http://lowercase.example.com:9400');
    for (const url of ['http://example.com', 'https://example.com']) {
      const agent = getProxyAgent(url) as HttpsProxyAgent<string>;
      expect(agent.proxy.hostname).toBe('lowercase.example.com');
    }
  });

  it('selects the proxy for the destination protocol', () => {
    vi.stubEnv('HTTP_PROXY', 'http://http.example.com:9400');
    vi.stubEnv('HTTPS_PROXY', 'https://https.example.com:9443');
    expect(
      (getProxyAgent('http://example.com') as HttpProxyAgent<string>).proxy
        .hostname
    ).toBe('http.example.com');
    expect(
      (getProxyAgent('https://example.com') as HttpsProxyAgent<string>).proxy
        .href
    ).toBe('https://https.example.com:9443/');
  });

  it('uses ALL_PROXY when a protocol-specific proxy is absent', () => {
    vi.stubEnv('ALL_PROXY', 'http://proxy.example.com:9400');
    expect(getProxyAgent('http://example.com')).toBeInstanceOf(HttpProxyAgent);
    expect(getProxyAgent('https://example.com')).toBeInstanceOf(
      HttpsProxyAgent
    );
  });

  it.each([
    ['localhost', 'http://localhost:8080'],
    ['127.0.0.1', 'http://127.0.0.1:8080'],
    ['[::1]', 'http://[::1]:8080'],
    ['.example.com', 'https://api.example.com'],
    ['*.example.com', 'https://api.example.com'],
    ['api.example.com:443', 'https://api.example.com'],
    ['*', 'https://example.com']
  ])('bypasses the proxy for NO_PROXY=%s', (bypass, url) => {
    vi.stubEnv('HTTP_PROXY', 'http://proxy.example.com:9400');
    vi.stubEnv('HTTPS_PROXY', 'http://proxy.example.com:9400');
    vi.stubEnv('NO_PROXY', bypass);
    expect(getProxyAgent(url)).toBeUndefined();
  });

  it('does not bypass unrelated hosts or ports', () => {
    vi.stubEnv('HTTPS_PROXY', 'http://proxy.example.com:9400');
    vi.stubEnv('NO_PROXY', '.example.com,api.example.net:8443');
    expect(getProxyAgent('https://notexample.com')).toBeInstanceOf(
      HttpsProxyAgent
    );
    expect(getProxyAgent('https://api.example.net:443')).toBeInstanceOf(
      HttpsProxyAgent
    );
  });

  it('prefers no_proxy over NO_PROXY', () => {
    vi.stubEnv('HTTPS_PROXY', 'http://proxy.example.com:9400');
    vi.stubEnv('NO_PROXY', '*');
    vi.stubEnv('no_proxy', 'localhost');
    expect(getProxyAgent('https://example.com')).toBeInstanceOf(
      HttpsProxyAgent
    );
    expect(getProxyAgent('https://localhost')).toBeUndefined();
  });

  it('re-evaluates routing when the environment changes', () => {
    vi.stubEnv('HTTPS_PROXY', 'http://proxy.example.com:9400');
    const first = getProxyAgent('https://example.com');
    expect(getProxyAgent('https://example.net')).toBe(first);
    vi.stubEnv('NO_PROXY', 'example.com');
    expect(getProxyAgent('https://example.com')).toBeUndefined();
    vi.stubEnv('HTTPS_PROXY', 'http://other.example.com:9400');
    expect(getProxyAgent('https://example.net')).not.toBe(first);
  });

  it('rejects invalid proxy URLs without exposing credentials', () => {
    vi.stubEnv('HTTPS_PROXY', 'http://user:secret@[invalid');
    expect(() => getProxyAgent('https://example.com')).toThrow(
      'Invalid proxy URL.'
    );
    expect(() => getProxyAgent('https://example.com')).not.toThrow('secret');
  });

  it('rejects unsupported proxy protocols instead of silently connecting directly', () => {
    vi.stubEnv('HTTPS_PROXY', 'socks://user:secret@proxy.example.com:1080');
    expect(() => getProxyAgent('https://example.com')).toThrow(
      'Unsupported proxy protocol.'
    );
  });
});
