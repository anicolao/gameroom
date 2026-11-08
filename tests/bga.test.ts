import {test,expect} from 'bun:test';
import {clientKey,validateRequest,capturedTable} from '../extension/bga-boss/policy.js';
import {apply,initialState,replay,type RoomEvent} from '../src/lib/engine';
import {gameUrl} from '../src/lib/launch';
import {bgaDestination,operation} from '../src/lib/bga-boss';
const requestId='12345678-0000-4000-8000-000000000000';
const sender={url:'https://gameroom.boardgamescafe.org/pr7/?room=AABB1122',origin:'https://gameroom.boardgamescafe.org',frameId:0,tab:{id:4}};
test('bridge trusts only the exact HTTPS origin, top frame and explicit preview entry paths',()=>{
 expect(clientKey(sender)).toBe('https://gameroom.boardgamescafe.org/pr7/');
 expect(clientKey({...sender,url:sender.origin+'/'})).toBe(sender.origin+'/');
 for(const change of [{url:'https://evil.example/pr7/'},{url:sender.origin+'/pr-7/'},{url:sender.origin+'/pr7/untrusted.html'},{url:'http://gameroom.boardgamescafe.org/'},{frameId:1},{origin:'https://evil.example'},{tab:{id:undefined}}])expect(()=>clientKey({...sender,...change})).toThrow();
});
test('bridge exposes a bounded fixed game preparation API, never URLs, code or creation endpoints',()=>{
 const message={version:1,method:'tables.prepare',requestId,gameId:'11',issuedAt:new Date().toISOString()};expect(validateRequest(message)).toEqual(message);
 for(const change of [{url:'https://evil.example/'},{code:'alert(1)'},{method:'tables.create'},{gameId:'other'},{requestId:'bad'},{issuedAt:'bad'},{gameId:'1'.repeat(3000)}])expect(()=>validateRequest({...message,...change})).toThrow();
 expect(validateRequest({version:1,method:'operations.get',requestId}).requestId).toBe(requestId);
});
test('only BGA table routes produce a token-free canonical destination',()=>{
 expect(capturedTable('https://en.boardgamearena.com/table?table=123456&token=secret')).toEqual({tableId:'123456',url:'https://boardgamearena.com/table?table=123456'});
 for(const value of ['http://boardgamearena.com/table?table=123','https://boardgamearena.com.evil.example/table?table=123','https://user:pass@boardgamearena.com/table?table=123','https://boardgamearena.com/gamepanel?table=123','https://boardgamearena.com/table?table=0','https://boardgamearena.com/table?table=1&table=2','https://boardgamearena.com/table?table=1e10'])expect(capturedTable(value)).toBeNull();
 expect(()=>bgaDestination('https://boardgamearena.com/table?table=123&token=secret')).toThrow();
 expect(()=>operation({version:1,requestId,status:'succeeded',result:{tableId:'5',url:'https://boardgamearena.com/table?table=6'}},requestId)).toThrow();
});
test('BGA publication is a v3 host decision, preserves the exact external table and never reinterprets older launches',()=>{
 const first:RoomEvent={version:1,id:'created',sequence:1,actor:'host',intent:{type:'room/created',name:'Friends',playerName:'Host'}};
 const launch:RoomEvent={version:3,id:'publish',sequence:2,actor:'host',intent:{type:'table/bga-launched',table:'ABCD1234',players:['host'],requestId,game:{id:'bga:11',title:"Can't Stop (BGA)",url:'https://boardgamearena.com/table?table=123456'}}};
 const state=replay([first,launch]);expect(state.tables[0].provider).toBe('bga');expect(gameUrl(state.tables[0].url,state.tables[0],state.players[0])).toBe('https://boardgamearena.com/table?table=123456');
 expect(()=>replay([first,{...launch,version:2}])).toThrow('version 3');
 expect(()=>replay([first,launch,{version:2,id:'old',sequence:3,actor:'host',intent:{type:'message/sent',text:'hi'}}])).toThrow();
 const closed=apply(state,'host',{type:'table/closed',table:'ABCD1234'});
 expect(()=>apply(closed,'host',{...launch.intent,table:'AABB1234'})).toThrow('already shared');
 for(const url of ['https://evil.example/table?table=123','https://boardgamearena.com/table?table=123&token=secret'])expect(()=>apply(replay([first]),'host',{...launch.intent,game:{id:'bga:11',title:'BGA',url}})).toThrow();
 const legacy=apply(apply(initialState(),'host',first.intent),'host',{type:'table/catalog-launched',table:'ABCD1234',players:['host'],game:{id:'no-provider',title:'Any game',url:'https://boardgamearena.com/'}});
 expect(legacy.tables[0].provider).toBeUndefined();expect(new URL(gameUrl(legacy.tables[0].url,legacy.tables[0],legacy.players[0])).searchParams.get('launch')).toBe('create');
});
