import {
  blue,
  green,
  yellow,
  red,
  magenta,
  bold
} from 'https://deno.land/std@0.177.0/fmt/colors.ts';
import worker from '$userPath';
import Cache from './mock/cache.js';
import EdgeKV from './mock/kv.js';

const id = Deno.args[0];
const getColorForStatusCode = (statusCode, message) => {
  if (statusCode >= 100 && statusCode < 200) {
    return blue(`${statusCode} ${message}`);
  } else if (statusCode >= 200 && statusCode < 300) {
    return green(`${statusCode} ${message}`);
  } else if (statusCode >= 300 && statusCode < 400) {
    return yellow(`${statusCode} ${message}`);
  } else if (statusCode >= 400 && statusCode < 500) {
    return red(`${statusCode} ${message}`);
  } else if (statusCode >= 500) {
    return magenta(bold(`${statusCode} ${message}`));
  } else {
    return `${statusCode} ${message}`;
  }
};
const dev = async () => {
  try {
    const configs = (await import('./devConfig.js')).default;
    const config = configs[id] ?? {};
    const cacheInstance = await Cache.init('mock');
    globalThis.cache = cacheInstance;
    globalThis.EdgeKV = EdgeKV;
    if (!worker || !worker.fetch) {
      throw new Error('Invalid ER code.');
    }
    Deno.serve({
      port: config.port,
      handler: async (request) => {
        const url = new URL(request.url);
        let nextRequest = request;
        if (config.localUpstream) {
          const nextUrl = `${config.localUpstream}${url.pathname}${url.search}${url.hash}`;
          nextRequest = new Request(nextUrl, request);
        }
        try {
          const res = await worker.fetch(nextRequest);
          const status = res.status;
          console.log(
            `[Esa Dev] ${request.method} ${url.pathname} ${getColorForStatusCode(status, res.statusText)}`
          );
          return res;
        } catch (err) {
          console.error(err);
          console.log(
            `[Esa Dev] ${request.method} ${url.pathname} ${getColorForStatusCode(500, 'Internal Server Error')}`
          );
          return new Response('Internal Server Error', {
            status: 500
          });
        }
      }
    });
  } catch (err) {
    console.log('\n');
    console.error(red(err));
  }
};
dev();
