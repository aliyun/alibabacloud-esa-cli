import path from 'path';
import fs from 'fs';
import { getRoot } from '../../../utils/fileUtils/base.js';
import t from '../../../i18n/index.js';

class EdgeKV {
  static store: Map<string, any> = new Map();
  constructor() {
    const root = getRoot();
    const kvPath = path.join(root, 'kv.json');
    if (fs.existsSync(kvPath)) {
      try {
        const kvJson = fs.readFileSync(kvPath, 'utf8');
        const kvJsonObj = JSON.parse(kvJson);
        Object.keys(kvJsonObj).forEach((namespace) => {
          const childMap = new Map();
          Object.keys(kvJsonObj[namespace]).forEach((key) => {
            childMap.set(key, JSON.stringify(kvJsonObj[namespace][key]));
          });
          EdgeKV.store.set(namespace, childMap);
        });
      } catch (err) {
        console.log(
          t('kv_parse_failed').d(
            'kv.json parse failed, use empty local kv store.'
          )
        );
      }
    }
  }

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
