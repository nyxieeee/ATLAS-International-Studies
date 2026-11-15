import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isSameOriginRequest} from '../lib/request-origin.mjs';
const request=(origin,host='localhost:3016',extra={})=>new Request('http://0.0.0.0:3016/api/ai',{headers:{...(origin?{origin}:{}),host,...extra}});
test('browser requests match the public Host even when Next uses an internal bind address',()=>{
 assert.equal(isSameOriginRequest(request('http://localhost:3016')),true);
 assert.equal(isSameOriginRequest(request('http://127.0.0.1:3016','127.0.0.1:3016')),true);
 assert.equal(isSameOriginRequest(request('https://atlas.example','atlas.example',{'x-forwarded-proto':'https'})),true);
 assert.equal(isSameOriginRequest(request(null)),true);
});
test('foreign, null and mismatched browser origins remain rejected',()=>{
 for(const origin of ['https://evil.example','http://localhost:9000','null','https://user:password@localhost:3016'])assert.equal(isSameOriginRequest(request(origin)),false);
 assert.equal(isSameOriginRequest(request('http://localhost:3016','localhost:3016',{'x-forwarded-host':'evil.example'})),true);
});
