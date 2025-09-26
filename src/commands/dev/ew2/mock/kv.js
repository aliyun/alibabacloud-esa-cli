class EdgeKV {
  static port = 0;
  JS_RESPONSE_BUFFER_THRESHOLD = 64 * 1024;
  constructor(options) {
    if (!options || (!options.namespace && !options.namespaceId)) {
      throw new TypeError(
        'The argument to `EdgeKV` must be an object with a `namespace` or `namespaceId` field'
      );
    }
    this.namespace = options.namespace;
  }

  async put(key, value) {
    if (arguments.length < 2) {
      throw new TypeError(
        `Failed to execute 'put' on 'EdgeKV': 2 arguments required, but only ${arguments.length} present.`
      );
    }
    if (!key) {
      throw new TypeError(
        "Failed to execute 'put' on 'EdgeKV': 2 arguments required, but only 0 present."
      );
    }
    if (typeof key !== 'string') {
      throw new TypeError(
        `Failed to execute 'put' on 'EdgeKV': 1th argument must be a string.`
      );
    }

    try {
      let body;
      if (typeof value === 'string') {
        if (value.length > this.JS_RESPONSE_BUFFER_THRESHOLD) {
          const encoder = new TextEncoder();
          const encodedValue = encoder.encode(value);

          body = new ReadableStream({
            start(controller) {
              controller.enqueue(encodedValue);
              controller.close();
            }
          });
        } else {
          body = value;
        }
      } else if (value instanceof Response) {
        const resBody = await value.clone().text();
        const headers = {};
        value.headers.forEach((v, k) => (headers[k] = v));
        body = JSON.stringify({
          body: resBody,
          headers,
          status: value.status
        });
      } else if (
        value instanceof ReadableStream ||
        value instanceof ArrayBuffer ||
        ArrayBuffer.isView(value)
      ) {
        body = value;
      } else {
        throw new TypeError(
          `Failed to execute 'put' on 'EdgeKV': 2nd argument should be one of string/Response/ArrayBuffer/ArrayBufferView/ReadableStream`
        );
      }

      const fetchRes = await fetch(
        `http://localhost:${EdgeKV.port}/mock_kv/put?key=${key}&namespace=${this.namespace}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body
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

  async get(key, options) {
    const isTypeValid = (ty) =>
      typeof ty === 'string' &&
      (ty === 'text' ||
        ty === 'json' ||
        ty === 'stream' ||
        ty === 'arrayBuffer');

    if (options && !isTypeValid(options?.type)) {
      throw new TypeError(
        "EdgeKV.get: 2nd optional argument must be an object with a 'type' field. The 'type' field specifies the format of the return value and must be a string of 'text', 'json', 'stream' or 'arrayBuffer'"
      );
    }
    const type = options?.type || 'text';
    const fetchRes = await fetch(
      `http://localhost:${EdgeKV.port}/mock_kv/get?key=${key}&namespace=${this.namespace}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }
    );
    // Check if key exists
    let isGetFailed = false;
    fetchRes.headers.forEach((v, k) => {
      if (k === 'kv-get-empty') {
        isGetFailed = true;
      }
    });
    if (isGetFailed) {
      return undefined;
    }
    switch (type) {
      case 'text':
        return fetchRes.text();
      case 'json':
        try {
          const value = await fetchRes.text();
          const userObject = JSON.parse(value);
          return userObject;
        } catch (error) {
          throw new TypeError(`Invalid JSON: ${err.message}`);
        }
      case 'arrayBuffer':
        try {
          const buffer = await fetchRes.arrayBuffer();
          return buffer;
        } catch (error) {
          throw new TypeError(
            `Failed to read the response body into an ArrayBuffer: ${error.message}`
          );
        }
      case 'stream':
        const value = await fetchRes.text();
        return new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(value));
            controller.close();
          }
        });
      default:
        throw new Error(`Unsupported type: ${type}`);
    }
  }

  async delete(key) {
    const fetchRes = await fetch(
      `http://localhost:${EdgeKV.port}/mock_kv/delete?key=${key}&namespace=${this.namespace}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }
    );
    if (!fetchRes.ok) {
      const error = await fetchRes.json();
      throw new Error(error.error);
    }
    const res = await fetchRes.json();
    return res.success;
  }
}

export default EdgeKV;
