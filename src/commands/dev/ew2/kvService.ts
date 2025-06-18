class EdgeKV {
  static store: Map<string, any> = new Map();
  constructor() {}

  get(key: string, namespace: string) {
    const store = EdgeKV.store.get(namespace);
    if (!store || !store.has(key)) {
      return;
    }
    return store.get(key);
  }

  put(key: string, value: any, namespace: string) {
    let store = EdgeKV.store.get(namespace);
    if (!store) {
      EdgeKV.store.set(namespace, new Map([[key, value]]));
    } else {
      store.set(key, value);
    }
  }

  delete(key: string, namespace: string) {
    const store = EdgeKV.store.get(namespace);
    if (!store) return false;
    return store.delete(key);
  }
}

export default EdgeKV;
