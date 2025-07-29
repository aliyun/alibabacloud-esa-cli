export interface SerializedResponse {
  ttl: number;
  response: {
    headers: Record<string, any>;
    status: number;
    body: string;
  };
  key: string;
}
interface CacheEntry {
  serializedResponse: SerializedResponse;
  expires: number;
  lastUsed: number;
}
class CacheService {
  store: Map<string, CacheEntry> = new Map();
  maxQuota: number = 100 * 1024 * 1024;
  constructor() {}
  put(key: string, serializedResponse: SerializedResponse) {
    const expires =
      serializedResponse.ttl === 0
        ? Infinity
        : Date.now() + serializedResponse.ttl * 1000;
    this.store.set(key, {
      serializedResponse,
      expires: expires,
      lastUsed: Date.now()
    });
  }
  get(key: string) {
    const entry = this.store.get(key);
    if (!entry || Date.now() > entry.expires) {
      return null;
    }
    entry.lastUsed = Date.now();
    return entry;
  }
  delete(key: string) {
    return this.deleteEntry(key);
  }

  deleteEntry(key: string) {
    if (!this.store.has(key)) return false;
    return this.store.delete(key);
  }
}
export default CacheService;
