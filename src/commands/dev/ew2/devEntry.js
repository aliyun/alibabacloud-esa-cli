import worker from '$userPath';
import Cache from './mock/cache.js';
import mockKV from './mock/kv.js';

var mock_cache = await Cache.init('mock');
globalThis.mockCache = mock_cache;
globalThis.mockKV = mockKV;

export default worker;
