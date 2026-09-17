import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import http from 'node:http';
import https from 'node:https';
import { createRequire } from 'node:module';
import net from 'node:net';
import path from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

import { build } from 'esbuild';
import { HttpProxyAgent } from 'http-proxy-agent';
import httpx from 'httpx';
import fetch from 'node-fetch';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

import { enableSdkProxy, getProxyAgent } from '../../src/libs/proxy.js';

const require = createRequire(import.meta.url);
const OpenApi = require('@alicloud/openapi-client');
const ESA = require('@alicloud/esa20240910');
const execFileAsync = promisify(execFile);
const fixtures = fileURLToPath(new URL('../fixtures/proxy/', import.meta.url));
const sockets = new Set<net.Socket>();
const connectRequests: http.IncomingMessage[] = [];
const proxyRequests: { url: string; method: string; body: string }[] = [];
const apiRequests: http.IncomingMessage[] = [];
let directRequests = 0;
let proxy: http.Server;
let api: https.Server;
let direct: http.Server;
let proxyUrl: string;
let endpoint: string;
let directUrl: string;
let certificate: string;
let moduleDir: string;
let loginModule: string;

async function listen(server: http.Server | https.Server): Promise<number> {
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.once('close', () => sockets.delete(socket));
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return (server.address() as net.AddressInfo).port;
}

beforeAll(async () => {
  certificate = await readFile(path.join(fixtures, 'cert.pem'), 'utf8');
  api = https.createServer(
    {
      cert: certificate,
      key: await readFile(path.join(fixtures, 'key.pem'))
    },
    (req, res) => {
      apiRequests.push(req);
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ Status: 'Running', RequestId: 'proxy-test' }));
    }
  );
  const apiPort = await listen(api);
  // This name cannot resolve directly. Only the test proxy maps it to loopback.
  endpoint = `esa-proxy-test.invalid:${apiPort}`;

  direct = http.createServer((_req, res) => {
    directRequests++;
    res.end('direct response');
  });
  directUrl = `http://127.0.0.1:${await listen(direct)}`;

  proxy = http.createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk.toString();
    proxyRequests.push({ url: req.url!, method: req.method!, body });
    if (req.url?.endsWith('/redirect')) {
      res.writeHead(302, { location: `${directUrl}/final` });
      res.end();
    } else {
      res.end('proxied response');
    }
  });
  proxy.on('connect', (req, socket, head) => {
    connectRequests.push(req);
    const upstream = net.connect(apiPort, '127.0.0.1', () => {
      socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      if (head.length) upstream.write(head);
      upstream.pipe(socket);
      socket.pipe(upstream);
    });
    sockets.add(upstream);
    upstream.once('close', () => sockets.delete(upstream));
    upstream.on('error', () => socket.destroy());
    socket.on('error', () => upstream.destroy());
    socket.once('close', () => upstream.destroy());
  });
  proxyUrl = `http://127.0.0.1:${await listen(proxy)}`;

  // Compile the actual login code for a child Node process so its extra CA is
  // loaded at startup, without disabling certificate validation or saving AKs.
  moduleDir = await mkdtemp(path.resolve('node_modules/.esa-proxy-test-'));
  loginModule = path.join(moduleDir, 'login.mjs');
  await build({
    entryPoints: [
      fileURLToPath(
        new URL('../../src/utils/validateCredentials.ts', import.meta.url)
      )
    ],
    outfile: loginModule,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node18',
    packages: 'external'
  });
  enableSdkProxy();
});

beforeEach(() => {
  for (const key of Object.keys(process.env)) {
    if (
      /^(?:npm_config_)?(?:https?_proxy|all_proxy|no_proxy|proxy)$/i.test(key)
    ) {
      vi.stubEnv(key, '');
    }
  }
  connectRequests.length = 0;
  proxyRequests.length = 0;
  apiRequests.length = 0;
  directRequests = 0;
});

afterEach(() => vi.unstubAllEnvs());

afterAll(async () => {
  for (const socket of sockets) socket.destroy();
  await Promise.all(
    [proxy, api, direct]
      .filter(Boolean)
      .map(
        (server) =>
          new Promise<void>((resolve) => server.close(() => resolve()))
      )
  );
  if (moduleDir) await rm(moduleDir, { recursive: true, force: true });
});

describe('proxy transport integration', () => {
  it.each(['HTTPS_PROXY', 'https_proxy'])(
    'logs in through %s with a verified TLS tunnel',
    async (key) => {
      vi.stubEnv(key, proxyUrl);
      const script = `
      const { validateCredentials } = await import(${JSON.stringify(pathToFileURL(loginModule).href)});
      console.log(JSON.stringify(await validateCredentials('test-ak', 'test-sk')));
    `;
      const { stdout } = await execFileAsync(
        process.execPath,
        ['--input-type=module', '-e', script],
        {
          env: {
            ...process.env,
            CUSTOM_ENDPOINT: endpoint,
            NODE_EXTRA_CA_CERTS: path.join(fixtures, 'cert.pem')
          },
          timeout: 20000
        }
      );
      expect(JSON.parse(stdout)).toEqual({ valid: true, endpoint });
      expect(connectRequests.map((req) => req.url)).toEqual([endpoint]);
      expect(apiRequests[0].headers['x-acs-action']).toBe('GetErService');
    },
    25000
  );

  it('routes the generated ESA SDK through the same proxy', async () => {
    vi.stubEnv('HTTPS_PROXY', proxyUrl);
    const client = new ESA.default(
      new OpenApi.Config({
        endpoint,
        accessKeyId: 'test-ak',
        accessKeySecret: 'test-sk'
      })
    );
    const result = await client.getErServiceWithOptions(
      new ESA.GetErServiceRequest({}),
      {
        ca: certificate,
        connectTimeout: 1000,
        readTimeout: 1000
      }
    );
    expect(result.body.status).toBe('Running');
    expect(connectRequests.map((req) => req.url)).toEqual([endpoint]);
  });

  it('keeps TLS certificate validation enabled', async () => {
    vi.stubEnv('HTTPS_PROXY', proxyUrl);
    await expect(httpx.request(`https://${endpoint}/`, {})).rejects.toThrow();
    expect(connectRequests).toHaveLength(1);
    expect(apiRequests).toHaveLength(0);
  });

  it('supports proxy authentication without forwarding it to the API', async () => {
    const authenticated = new URL(proxyUrl);
    authenticated.username = 'test-user';
    authenticated.password = 'test-password';
    vi.stubEnv('HTTPS_PROXY', authenticated.href);
    const response = await httpx.request(`https://${endpoint}/`, {
      ca: certificate
    });
    await httpx.read(response, 'utf8');
    expect(connectRequests[0].headers['proxy-authorization']).toBe(
      `Basic ${Buffer.from('test-user:test-password').toString('base64')}`
    );
    expect(apiRequests[0].headers['proxy-authorization']).toBeUndefined();
  });

  it('sends streaming HTTP uploads through the proxy', async () => {
    vi.stubEnv('HTTP_PROXY', proxyUrl);
    const response = await fetch('http://upload.invalid/assets', {
      method: 'POST',
      body: Readable.from(['first chunk\n', 'second chunk']),
      agent: getProxyAgent
    });
    expect(await response.text()).toBe('proxied response');
    expect(proxyRequests).toEqual([
      {
        url: 'http://upload.invalid/assets',
        method: 'POST',
        body: 'first chunk\nsecond chunk'
      }
    ]);
  });

  it('uploads an OSS multipart body through the API service', async () => {
    vi.stubEnv('HTTP_PROXY', proxyUrl);
    const { ApiService } = await vi.importActual<
      typeof import('../../src/libs/apiService.js')
    >('../../src/libs/apiService.js');
    // OSS uploads use the signed configuration, independently of the SDK client.
    const result = await ApiService.prototype.uploadToOss(
      {
        OSSAccessKeyId: 'test-oss-ak',
        Signature: 'test-signature',
        Url: 'http://upload.invalid/oss',
        Key: 'test-key',
        Policy: 'test-policy',
        XOssSecurityToken: 'test-token'
      },
      Buffer.from('test archive content')
    );
    expect(result).toBe(true);
    expect(proxyRequests).toHaveLength(1);
    expect(proxyRequests[0]).toMatchObject({
      url: 'http://upload.invalid/oss',
      method: 'POST'
    });
    expect(proxyRequests[0].body).toContain('test archive content');
    expect(proxyRequests[0].body).toContain('name="policy"');
  });

  it('re-evaluates NO_PROXY after a download redirect', async () => {
    vi.stubEnv('HTTP_PROXY', proxyUrl);
    vi.stubEnv('NO_PROXY', '127.0.0.1');
    const response = await fetch('http://download.invalid/redirect', {
      agent: getProxyAgent
    });
    expect(await response.text()).toBe('direct response');
    expect(proxyRequests).toHaveLength(1);
    expect(directRequests).toBe(1);
  });

  it('honors NO_PROXY in both the SDK transport and file requests', async () => {
    vi.stubEnv('HTTP_PROXY', 'http://127.0.0.1:1');
    vi.stubEnv('no_proxy', '127.0.0.1');
    const sdkResponse = await httpx.request(directUrl, {});
    expect(await httpx.read(sdkResponse, 'utf8')).toBe('direct response');
    const response = await fetch(directUrl, { agent: getProxyAgent });
    expect(await response.text()).toBe('direct response');
    expect(directRequests).toBe(2);
    expect(proxyRequests).toHaveLength(0);
  });

  it('uses the normal direct transport when no proxy is configured', async () => {
    const response = await httpx.request(directUrl, {});
    expect(await httpx.read(response, 'utf8')).toBe('direct response');
    expect(directRequests).toBe(1);
  });

  it('preserves an explicit local proxy agent', async () => {
    vi.stubEnv('HTTP_PROXY', 'http://127.0.0.1:1');
    const response = await httpx.request('http://local-worker.invalid/', {
      agent: new HttpProxyAgent(proxyUrl)
    });
    expect(await httpx.read(response, 'utf8')).toBe('proxied response');
    expect(proxyRequests).toHaveLength(1);
  });

  it('reports proxy failures without falling back to a direct connection', async () => {
    vi.stubEnv('HTTP_PROXY', 'http://127.0.0.1:1');
    await expect(httpx.request(directUrl, {})).rejects.toMatchObject({
      code: 'ECONNREFUSED'
    });
    await expect(
      fetch(directUrl, { agent: getProxyAgent })
    ).rejects.toMatchObject({ code: 'ECONNREFUSED' });
    expect(directRequests).toBe(0);
  });
});
