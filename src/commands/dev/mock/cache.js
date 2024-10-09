class MockCache {
  constructor(instance) {
    this.cache = instance;
  }
  static async init(cacheName) {
    const instance = await MockCache.open(cacheName);
    return new MockCache(instance);
  }
  static open(cacheName) {
    return caches.open(cacheName);
  }
  static has(cacheName) {
    return caches.has(cacheName);
  }
  static delete(cacheName) {
    return caches.delete(cacheName);
  }
  match(reqOrUrl, options) {
    return this.cache.match(reqOrUrl, options);
  }
  delete(reqOrUrl, options) {
    return this.cache.delete(reqOrUrl, options);
  }
  put(reqOrUrl, response) {
    return this.cache.put(reqOrUrl, response);
  }
  get(reqOrUrl, options) {
    return this.match(reqOrUrl, options);
  }
}
export default MockCache;
