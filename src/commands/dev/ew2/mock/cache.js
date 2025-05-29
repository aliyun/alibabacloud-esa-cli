function deepClone(target) {
  if (typeof target !== 'object' || target === null) return target;
  const constructor = target.constructor;
  if (/^(Date|RegExp)$/i.test(constructor.name)) {
    return new constructor(target);
  }
  const cloneTarget = Array.isArray(target)
    ? []
    : target instanceof Map
      ? new Map()
      : target instanceof Set
        ? new Set()
        : {};
  if (target instanceof Map) {
    target.forEach((value, key) => {
      cloneTarget.set(key, deepClone(value));
    });
  } else if (target instanceof Set) {
    target.forEach((value) => {
      cloneTarget.add(deepClone(value));
    });
  } else {
    Object.keys(target).forEach((key) => {
      cloneTarget[key] = deepClone(target[key]);
    });
  }
  return cloneTarget;
}

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
    const result = this.cache.get(reqOrUrl) || null;
    return deepClone(result);
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
