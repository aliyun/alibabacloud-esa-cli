import Cache from './mock/cache.js';
import mockKV from './mock/kv.js';
import worker from '$userPath';

Cache.port = $userPort;
mockKV.port = $userPort;

export default worker;
