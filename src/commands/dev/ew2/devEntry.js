import worker from '$userPath';
import Cache from './mock/cache.js';
import mockKV from './mock/kv.js';

var mock_cache = new Cache($userPort);
globalThis.mockCache = mock_cache;
globalThis.mockKV = mockKV;

export default worker;
