class MockCache {
  constructor() {
    this.cache = new Map();
  }

  static async init(cacheName) {
    const instance = await MockCache.open(cacheName);
    return new MockCache(instance);
  }

  static async open(cacheName) {
    return new Map();
  }

  async match(reqOrUrl) {
    return this.cache.get(reqOrUrl) || null;
  }

  async delete(reqOrUrl) {
    return this.cache.delete(reqOrUrl);
  }

  async put(reqOrUrl, response) {
    this.cache.set(reqOrUrl, response);
  }

  async get(reqOrUrl) {
    return this.match(reqOrUrl);
  }
}

export default MockCache;
