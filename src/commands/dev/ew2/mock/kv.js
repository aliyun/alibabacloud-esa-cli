class EdgeKV {
  constructor(options) {
    this.namespace = options.namespace;
    this.allData = {};
  }

  async get(key, options) {
    const namespaceData = this.allData[this.namespace] || {};
    if (!(key in namespaceData)) {
      return undefined;
    }
    const value = namespaceData[key];
    const type = options?.type || 'text';
    switch (type) {
      case 'text':
        return value;
      case 'json':
        try {
          return JSON.parse(value);
        } catch (error) {
          throw new Error('Failed to parse JSON');
        }
      case 'arrayBuffer':
        const encoder = new TextEncoder();
        const uint8Array = encoder.encode(value);
        return uint8Array.buffer;
      default:
        throw new Error('Invalid type option');
    }
  }

  async put(key, value) {
    const namespaceData = this.allData[this.namespace] || {};
    namespaceData[key] = value;
    this.allData[this.namespace] = namespaceData;
  }

  async delete(key) {
    const namespaceData = this.allData[this.namespace] || {};
    delete namespaceData[key];
    this.allData[this.namespace] = namespaceData;
  }
}

export default EdgeKV;
