import {test,expect} from 'bun:test';
import {apply,initialState,replay,currentGame,recentGames,type Intent,type RoomEvent,type GameChoice} from '../src/lib/engine';
import {roomGameUrl} from '../src/lib/launch';
const choice:GameChoice={id:'cribbage',title:'Cribbage',url:'https://games.example/cribbage/?theme=wood',mode:'integrated'};
function room(){return apply(apply(initialState(),'alex',{type:'room/created',name:'Friends',playerName:'Alex'}),'sam',{type:'player/joined',name:'Sam'});}
function launch(){return apply(room(),'alex',{type:'game/launched',code:'AABB1122',game:choice});}
test('one room has one shared game and later arrivals join that same game',()=>{
 const started=launch(),game=currentGame(started)!;
 expect(game.players).toEqual(['alex','sam']);expect(started.activeGame).toBe(3);expect(started.protocol).toBe(3);
 const joined=apply(started,'lee',{type:'player/joined',name:'Alex'});
 expect(currentGame(joined)?.players).toEqual(['alex','sam','lee']);expect(joined.activeGame).toBe(3);
 const late=new URL(roomGameUrl(game.url,currentGame(joined)!,joined.players[2]));
 expect(late.searchParams.get('table')).toBe('AABB1122');expect(late.searchParams.get('launch')).toBe('join');expect(late.searchParams.get('name')).toBe('Alex');
});
test('a room launch never silently selects only a subgroup',()=>{
 let state=room();for(const id of ['lee','jo','pat'])state=apply(state,id,{type:'player/joined',name:id});
 const started=apply(state,'sam',{type:'game/launched',code:'AABB1122',game:choice});
 expect(currentGame(started)?.players).toEqual(['alex','sam','lee','jo','pat']);
});
test('any room member closes for everyone; reopening preserves the original URLs and host',()=>{
 const started=launch(),original=currentGame(started)!;
 const urls=started.players.map(p=>roomGameUrl(original.url,original,p));
 const closed=apply(started,'sam',{type:'game/closed',game:3});
 expect(currentGame(closed)).toBeUndefined();expect(recentGames(closed)).toHaveLength(1);
 const reopened=apply(closed,'sam',{type:'game/reopened',game:3}),restored=currentGame(reopened)!;
 expect(restored.host).toBe('alex');expect(restored.code).toBe(original.code);expect(restored.lastAction).toBe(5);
 expect(reopened.players.map(p=>roomGameUrl(restored.url,restored,p))).toEqual(urls);expect(recentGames(reopened)).toEqual([]);
});
test('a new choice replaces the room game atomically and old close requests cannot close it',()=>{
 const next=apply(launch(),'sam',{type:'game/launched',code:'CCDD3344',game:{...choice,id:'cantstop',title:"Can't Stop"}});
 expect(currentGame(next)?.code).toBe('CCDD3344');expect(next.activeGame).toBe(4);expect(recentGames(next).map(g=>g.sequence)).toEqual([3]);
 expect(()=>apply(next,'alex',{type:'game/closed',game:3})).toThrow('no longer open');
 expect(()=>apply(next,'stranger',{type:'game/closed',game:4})).toThrow();
 expect(()=>apply(next,'sam',{type:'game/reopened',game:100})).toThrow();
 const old=apply(next,'alex',{type:'game/reopened',game:3});expect(currentGame(old)?.sequence).toBe(3);expect(recentGames(old).map(g=>g.sequence)).toEqual([4]);
});
test('leaving the room does not end the shared game; a later member can reopen it',()=>{
 const left=apply(launch(),'alex',{type:'player/left'});expect(currentGame(left)?.sequence).toBe(3);
 const closed=apply(left,'sam',{type:'game/closed',game:3});
 const joined=apply(closed,'lee',{type:'player/joined',name:'Lee'}),resumed=apply(joined,'lee',{type:'game/reopened',game:3});
 expect(currentGame(resumed)?.host).toBe('alex');expect(currentGame(resumed)?.players).toContain('lee');
 expect(new URL(roomGameUrl(choice.url,currentGame(resumed)!,resumed.players[2])).searchParams.get('launch')).toBe('join');
});
test('URL-only games open the exact saved address for every member, including on reopen',()=>{
 const address='https://games.example/play?keep=original#lobby';
 const started=apply(room(),'alex',{type:'game/launched',code:'AABB1122',game:{...choice,url:address,mode:'new-tab'}});
 const reopened=apply(apply(started,'sam',{type:'game/closed',game:3}),'sam',{type:'game/reopened',game:3});
 for(const player of reopened.players)expect(roomGameUrl(currentGame(reopened)!.url,currentGame(reopened)!,player)).toBe(address);
});
test('versioned decisions rebuild recent links without changing legacy table replay',()=>{
 const log:RoomEvent[]=[
  {version:1,id:'create',sequence:1,actor:'alex',intent:{type:'room/created',name:'Friends',playerName:'Alex'}},
  {version:2,id:'old',sequence:2,actor:'alex',intent:{type:'table/catalog-launched',table:'AABB1122',players:['alex'],game:{id:choice.id,title:choice.title,url:choice.url}}}
 ];
 const legacy=replay(log);expect(legacy.players[0].table).toBe('AABB1122');expect(legacy.tables[0].closed).toBe(false);expect(currentGame(legacy)).toBeUndefined();
 expect(recentGames(legacy)[0]).toMatchObject({sequence:2,code:'AABB1122',url:choice.url});
 log.push({version:3,id:'reopen',sequence:3,actor:'alex',intent:{type:'game/reopened',game:2}});
 const migrated=replay(log);expect(migrated.players[0].table).toBeNull();expect(migrated.tables).toEqual(legacy.tables);expect(currentGame(migrated)?.code).toBe('AABB1122');
 expect(replay(JSON.parse(JSON.stringify(log)))).toEqual(migrated);
 expect(()=>apply(migrated,'alex',{type:'table/closed',table:'AABB1122'},2)).toThrow();
});
test('protocol 3 rejects subgroup commands, unsafe links and computed outcomes',()=>{
 expect(()=>apply(room(),'alex',{type:'table/launched',table:'AABB1122',players:['alex']})).toThrow('one shared game');
 for(const url of ['javascript:alert(1)','http://games.example/','https://user:secret@games.example/'])expect(()=>apply(room(),'alex',{type:'game/launched',code:'AABB1122',game:{...choice,url}})).toThrow('valid game URL');
 expect(()=>apply(room(),'alex',{type:'game/launched',code:'AABB1122',game:{...choice,winner:'alex'}})).toThrow();
 expect(()=>apply(room(),'alex',{type:'game/closed',game:1,result:'finished'})).toThrow();
 const choices:[string,Intent][]=[['alex',{type:'room/created',name:'Friends',playerName:'Alex'}],['sam',{type:'player/joined',name:'Sam'}],['sam',{type:'game/launched',code:'AABB1122',game:choice}],['alex',{type:'game/closed',game:3}],['alex',{type:'game/reopened',game:3}]];
 const log:RoomEvent[]=choices.map(([actor,intent],i)=>({version:3,id:`decision-${i}`,sequence:i+1,actor,intent}));
 expect(replay(log).games).toHaveLength(1);expect(currentGame(replay(log))?.host).toBe('sam');
});
