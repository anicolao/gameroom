import {describe,test,expect} from 'bun:test';
import {apply,initialState,replay,type Intent,type RoomEvent} from '../src/lib/engine';
import {gameUrl,selectedFriends,launchReceiptKey} from '../src/lib/launch';
describe('the gathering intent log',()=>{
 const created=apply(initialState(),'alex',{type:'room/created',name:'Friday friends',playerName:'Alex'});
 const joined=apply(created,'sam',{type:'player/joined',name:'Sam'});
 test('replay alone reconstructs the gathering, table and return',()=>{
  const choices:[string,Intent][]=[['alex',{type:'room/created',name:'Friday friends',playerName:'Alex'}],['sam',{type:'player/joined',name:'Sam'}],['alex',{type:'table/launched',table:'ABCD1234',players:['alex','sam']}],['sam',{type:'player/returned'}],['alex',{type:'message/sent',text:'Another round?'}]];
  const log:RoomEvent[]=choices.map(([actor,intent],i)=>({version:1,id:`choice-${i}`,sequence:i+1,actor,intent}));
  const state=replay(log);expect(state.players.map(p=>p.table)).toEqual(['ABCD1234',null]);expect(state.tables[0].players).toEqual(['alex','sam']);expect(state.messages[0].text).toBe('Another round?');expect(state.revision).toBe(5);
  expect(replay(JSON.parse(JSON.stringify(log)))).toEqual(state);expect(initialState().players).toEqual([]);
 });
 test('launches cannot seat absent, busy, duplicate, or more than four players',()=>{
  expect(()=>apply(joined,'alex',{type:'table/launched',table:'ABCD1234',players:['sam']})).toThrow();
  expect(()=>apply(joined,'alex',{type:'table/launched',table:'ABCD1234',players:['alex','stranger']})).toThrow();
  expect(()=>apply(joined,'alex',{type:'table/launched',table:'ABCD1234',players:['alex','alex']})).toThrow();
  const launched=apply(joined,'alex',{type:'table/launched',table:'ABCD1234',players:['alex','sam']});
  expect(()=>apply(launched,'sam',{type:'table/launched',table:'ABCD5678',players:['sam']})).toThrow();
 });
 test('leaving and rejoining preserves identity, history and name changes',()=>{
  const left=apply(joined,'alex',{type:'player/left'}),returned=apply(left,'alex',{type:'player/joined',name:'Alex N.'});
  expect(returned.players).toHaveLength(2);expect(returned.players[0].name).toBe('Alex N.');expect(returned.host).toBe('alex');
  expect(()=>apply(left,'alex',{type:'message/sent',text:'hello'})).toThrow();
 });
 test('putting away a table is host-only and frees all its players',()=>{
  const launched=apply(joined,'alex',{type:'table/launched',table:'ABCD1234',players:['alex','sam']});
  expect(()=>apply(launched,'sam',{type:'table/closed',table:'ABCD1234'})).toThrow();
  const closed=apply(launched,'alex',{type:'table/closed',table:'ABCD1234'});expect(closed.players.every(p=>p.table===null)).toBe(true);expect(closed.tables[0].closed).toBe(true);
 });
 test('computed results and incompatible or reordered history are rejected',()=>{
  expect(()=>apply(joined,'alex',{type:'message/sent',text:'hello',winner:'alex'})).toThrow();
  expect(()=>replay([{version:2,id:'one',sequence:1,actor:'alex',intent:{type:'player/left'}}] as unknown as RoomEvent[])).toThrow();
  expect(()=>replay([{version:1,id:'one',sequence:2,actor:'alex',intent:{type:'player/left'}}])).toThrow();
 });
 test('launch URLs encode names, preserve the base path, and share one table',()=>{
  const table=apply(joined,'alex',{type:'table/launched',table:'ABCD1234',players:['alex','sam']}).tables[0];
  const host=new URL(gameUrl('https://example.com/cribbage/',table,{...joined.players[0],name:'Alex & friends'},'https://example.com/gameroom/?room=ABCDABCD'));
  const guest=new URL(gameUrl('https://example.com/cribbage/',table,joined.players[1],'https://example.com/room'));
  expect(host.pathname).toBe('/cribbage/');expect(host.searchParams.get('launch')).toBe('create');expect(host.searchParams.get('name')).toBe('Alex & friends');expect(guest.searchParams.get('launch')).toBe('join');expect(guest.searchParams.get('table')).toBe(host.searchParams.get('table'));
  expect(new URL(gameUrl('https://example.com/cribbage/?returnTo=old',table,joined.players[0])).searchParams.has('returnTo')).toBe(false);
  expect(()=>gameUrl('https://example.com',table,{id:'stranger',name:'X',present:true,table:null},'https://example.com')).toThrow();
 });
});
test('available friends are selected by ID, including two profiles using the same name',()=>{
 const player=(id:string,table:string|null=null,present=true)=>({id,name:'Alex',present,table});
 const players=[player('host'),player('guest'),player('busy','ABCD1234'),player('gone',null,false),player('third'),player('fourth'),player('fifth')];
 expect(selectedFriends(players,'host',[])).toEqual(['guest','third','fourth']);
 expect(selectedFriends(players,'host',['guest'])).toEqual(['third','fourth','fifth']);
 expect(selectedFriends(players,'guest',[])).toEqual(['host','third','fourth']);
 expect(launchReceiptKey('ROOM','host','TABLE')).not.toBe(launchReceiptKey('ROOM','guest','TABLE'));
 expect(launchReceiptKey('ROOM','host','TABLE')).not.toBe(launchReceiptKey('ROOM','host','NEXT'));
});
