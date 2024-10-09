import * as path from 'https://deno.land/std/path/mod.ts';
class EdgeKV {
  namespace;
  filePath;
  allData;
  constructor(options) {
    this.namespace = options.namespace;
    this.filePath = path.join(this.getRoot(), '.dev/.kv');
    this.allData = {};
  }
  getRoot(root) {
    if (typeof root === 'undefined') {
      root = Deno.cwd();
    }
    if (root === '/') {
      return Deno.cwd();
    }
    const file = path.join(root, 'cliconfig.toml');
    const prev = path.resolve(root, '../');
    try {
      const hasToml = fs.existsSync(file);
      if (hasToml) {
        return root;
      } else {
        return this.getRoot(prev);
      }
    } catch (err) {
      return this.getRoot(prev);
    }
  }
  async _loadData() {
    try {
      const fileData = await Deno.readTextFile(this.filePath);
      this.allData = JSON.parse(fileData);
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) {
        console.error('Error reading KV file:', error);
      }
    }
  }

  async get(key, options) {
    await this._loadData();
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
    await this._saveData();
  }
  async delete(key) {
    const namespaceData = this.allData[this.namespace] || {};
    delete namespaceData[key];
    this.allData[this.namespace] = namespaceData;
    await this._saveData();
  }
  async _saveData() {
    try {
      await Deno.writeTextFile(this.filePath, JSON.stringify(this.allData));
    } catch (error) {
      console.error('Error writing KV file:', error);
    }
  }
}
export default EdgeKV;
