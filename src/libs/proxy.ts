import { Agent as HttpAgent } from 'node:http';
import { Agent as HttpsAgent } from 'node:https';
import { createRequire } from 'node:module';

import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import httpx from 'httpx';
import { getProxyForUrl } from 'proxy-from-env';

const agents = new Map<string, HttpAgent>();

/** Resolve on every request, including redirects, so NO_PROXY is respected. */
export function getProxyAgent(url: string | URL): HttpAgent | undefined {
  const target = new URL(url);
  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    return undefined;
  }

  const proxy = getProxyForUrl(target.href);
  if (!proxy) return undefined;

  const cacheKey = `${target.protocol}:${proxy}`;
  const cached = agents.get(cacheKey);
  if (cached) return cached;

  let proxyUrl: URL;
  try {
    proxyUrl = new URL(proxy);
  } catch {
    // Do not include the URL: it may contain proxy credentials.
    throw new Error(
      'Invalid proxy URL. Use http://host:port or https://host:port.'
    );
  }
  if (proxyUrl.protocol !== 'http:' && proxyUrl.protocol !== 'https:') {
    throw new Error('Unsupported proxy protocol. Use an HTTP or HTTPS proxy.');
  }

  const agent =
    target.protocol === 'https:'
      ? new HttpsProxyAgent(proxyUrl)
      : new HttpProxyAgent(proxyUrl);
  agents.set(cacheKey, agent);
  return agent;
}

const require = createRequire(import.meta.url);
const patchedTransports = new Set<typeof httpx>();

function resolveTransport(...modules: string[]): typeof httpx {
  let resolveFrom = require;
  for (const name of modules) {
    resolveFrom = createRequire(resolveFrom.resolve(name));
  }
  return resolveFrom('httpx') as typeof httpx;
}

/**
 * Both Alibaba Cloud SDK runtimes use httpx, but currently discard their
 * httpProxy/httpsProxy runtime options. Adapt the shared transport rather than
 * patching Node's global agents, which would override the local dev proxy.
 */
export function enableSdkProxy(): void {
  // npm/pnpm may install separate copies of httpx. Resolve each SDK's actual
  // transport so proxy support does not depend on dependency hoisting.
  const transports = [
    httpx,
    resolveTransport('@alicloud/openapi-client', '@alicloud/tea-typescript'),
    resolveTransport(
      '@alicloud/esa20240910',
      '@alicloud/openapi-core',
      '@darabonba/typescript'
    )
  ];
  for (const transport of transports) {
    if (patchedTransports.has(transport)) continue;
    patchTransport(transport);
    patchedTransports.add(transport);
  }
}

function patchTransport(transport: typeof httpx): void {
  const request = transport.request;
  transport.request = (url, options) => {
    // SDK-created keep-alive agents are ordinary HTTP(S) agents. Preserve any
    // custom agent supplied by another caller (for example, a local proxy).
    const agent = options?.agent;
    if (
      agent &&
      Object.getPrototypeOf(agent) !== HttpAgent.prototype &&
      Object.getPrototypeOf(agent) !== HttpsAgent.prototype
    ) {
      return request(url, options);
    }

    const proxyAgent = getProxyAgent(url);
    return request(
      url,
      proxyAgent ? { ...options, agent: proxyAgent } : options
    );
  };
}
