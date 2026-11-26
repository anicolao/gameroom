import {test,expect} from 'bun:test';
import {isFrameDismissal} from '../src/lib/game-frame';
const game={} as Window,other={} as Window,url='https://game.example/play?table=ABC';
const event={source:game,origin:'https://game.example',data:{type:'gameroom:close',version:1}};
test('current game can request dismissal from its exact origin',()=>{
 expect(isFrameDismissal(event,url,game)).toBe(true);
 for(const origin of ['https://game.example.evil','http://game.example','https://game.example:8443','null'])expect(isFrameDismissal({...event,origin},url,game)).toBe(false);
});
test('parent, stale frames, other windows and missing sources cannot dismiss the game',()=>{
 expect(isFrameDismissal({...event,source:other},url,game)).toBe(false);
 expect(isFrameDismissal(event,url,other)).toBe(false);
 expect(isFrameDismissal({...event,source:null},url,null)).toBe(false);
});
test('unknown messages and protocol versions do not dismiss the game',()=>{
 for(const data of [null,[], 'gameroom:close',{}, {type:'gameroom:close',version:2},{type:'gameroom:close',version:'1'},{type:'navigate',version:1}])expect(isFrameDismissal({...event,data},url,game)).toBe(false);
});
test('frames reject same-origin content, credentials and non-web addresses',async()=>{
 const {validateFrameURL}=await import('../src/lib/game-frame');
 expect(validateFrameURL(url,'https://room.example')).toBe(url);
 for(const target of ['https://room.example/game','javascript:alert(1)','data:text/html,test','https://user:pass@game.example/','http://game.example/'])expect(()=>validateFrameURL(target,'https://room.example')).toThrow();
 expect(validateFrameURL('http://127.0.0.1:4397/','http://127.0.0.1:4199',true)).toBe('http://127.0.0.1:4397/');
 expect(validateFrameURL('http://127.0.0.1:4397/','http://gameroom.test:4199',true)).toBe('http://127.0.0.1:4397/');
 expect(()=>validateFrameURL('http://127.0.0.1:4397/','https://room.example',true)).toThrow();
 expect(()=>validateFrameURL('http://127.0.0.1:4397/','http://127.0.0.1:4199')).toThrow();
});
