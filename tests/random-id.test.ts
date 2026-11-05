import {expect,test} from 'bun:test';
import {randomId} from '../src/lib/random-id';

test('uses native UUID generation when it exists',()=>{
 expect(randomId({randomUUID:()=>'native-uuid',getRandomValues:()=>{throw new Error('Unexpected fallback');}})).toBe('native-uuid');
});

test('missing randomUUID uses secure random bytes with UUID v4 and variant bits',()=>{
 let calls=0;
 const source={getRandomValues:(bytes:Uint8Array)=>{calls++;return bytes.fill(255);}};
 expect(randomId(source)).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff');
 expect(calls).toBe(1);
 expect(randomId({getRandomValues:bytes=>bytes.fill(0)})).toBe('00000000-0000-4000-8000-000000000000');
});

test('fallback keeps using the platform CSPRNG and fails explicitly if it is unavailable',()=>{
 const source={getRandomValues:(bytes:Uint8Array)=>crypto.getRandomValues(bytes)};
 const ids=Array.from({length:100},()=>randomId(source));
 expect(new Set(ids).size).toBe(ids.length);
 expect(ids.every(id=>/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id))).toBe(true);
 expect(()=>randomId({} as Parameters<typeof randomId>[0])).toThrow('cannot generate secure IDs');
});
