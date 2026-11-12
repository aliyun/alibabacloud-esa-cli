// Test-only transport: all CLI HTTP(S) requests terminate at the local fixture.
// Loaded through node --require, never included in the published package.
const http = require('node:http');
const https = require('node:https');
const { urlToHttpOptions } = require('node:url');
const { syncBuiltinESMExports } = require('node:module');
const nativeRequest = http.request;
const port = Number(process.env.ESA_TEST_FIXTURE_PORT);

function request(input, options, callback) {
  let opts =
    typeof input === 'string' || input instanceof URL
      ? urlToHttpOptions(new URL(input))
      : { ...input };
  if (typeof options === 'function') callback = options;
  else opts = { ...opts, ...options };
  if (!Number.isInteger(port) || port <= 0)
    throw new Error('Offline CLI attempted network access without a fixture');
  return nativeRequest(
    {
      ...opts,
      protocol: 'http:',
      hostname: '127.0.0.1',
      host: '127.0.0.1',
      port,
      agent: false,
      socketPath: undefined,
      createConnection: undefined,
      headers: { ...opts.headers, host: 'localhost' }
    },
    callback
  );
}
http.request = https.request = request;
http.get = https.get = (...args) => {
  const req = request(...args);
  req.end();
  return req;
};
syncBuiltinESMExports();
