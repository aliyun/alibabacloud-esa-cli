class MockCache {
  constructor(port) {
    this.port = port;
  }

  async put(reqOrUrl, response) {
    if (arguments.length < 2) {
      throw new Error(
        `TypeError: Failed to execute 'put' on 'cache': 2 arguments required, but only ${arguments.length} present.`
      );
    }
    if (!reqOrUrl) {
      throw new Error(
        "TypeError: Failed to execute 'put' on 'cache': 2 arguments required, but only 0 present."
      );
    }
    if (!(response instanceof Response)) {
      throw new Error(
        "TypeError: Failed to execute 'put' on 'cache': Argument 2 is not of type Response."
      );
    }

    try {
      const body = await response.clone().text();
      const headers = {};
      response.headers.forEach((v, k) => (headers[k] = v));

      const cacheControl = response.headers.get('Cache-Control') || '';
      const ttl = this.parseTTL(cacheControl);

      const key = this.normalizeKey(reqOrUrl);
      const fetchRes = await fetch(
        `http://localhost:${this.port}/mock_cache/put`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key,
            response: {
              status: response.status,
              headers,
              body
            },
            ttl
          })
        }
      );
      if (!fetchRes.ok) {
        const error = await fetchRes.json();
        throw new Error(error.error);
      }
      return undefined;
    } catch (err) {
      throw new Error(`Cache put failed: ${err.message}`);
    }
  }

  async get(reqOrUrl) {
    const key = this.normalizeKey(reqOrUrl);
    const fetchRes = await fetch(
      `http://localhost:${this.port}/mock_cache/get`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key
        })
      }
    );
    if (!fetchRes.ok) {
      const error = await fetchRes.json();
      throw new Error(error.error);
    }
    const res = await fetchRes.json();

    if (res && res.success) {
      return new Response(res.data.response.body, {
        status: res.data.response.status,
        headers: new Headers(res.data.response.headers)
      });
    } else {
      return undefined;
    }
  }

  async delete(reqOrUrl) {
    const key = this.normalizeKey(reqOrUrl);
    const fetchRes = await fetch(
      `http://localhost:${this.port}/mock_cache/delete`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key
        })
      }
    );
    if (!fetchRes.ok) {
      const error = await fetchRes.json();
      throw new Error(error.error);
    }
    const res = await fetchRes.json();
    return res.success;
  }

  normalizeKey(input) {
    const url = input instanceof Request ? input.url : input;
    return url.replace(/^https:/i, 'http:');
  }

  parseTTL(cacheControl) {
    const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
    return maxAgeMatch ? parseInt(maxAgeMatch[1]) : 3600;
  }
}

export default MockCache;
