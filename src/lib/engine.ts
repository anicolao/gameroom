export const VERSION=3;
export type Protocol=1|2|3;
export type GameChoice={id:string;title:string;url:string;mode:'integrated'|'new-tab'};
export type Intent =
 | {type:'room/created';name:string;playerName:string}
 | {type:'player/joined';name:string}
 | {type:'player/left'}
 | {type:'table/launched';table:string;players:string[]}
 | {type:'table/catalog-launched';table:string;players:string[];game:{id:string;title:string;url:string}}
 | {type:'player/returned'}
 | {type:'table/closed';table:string}
 | {type:'message/sent';text:string}
 | {type:'game/launched';code:string;game:GameChoice}
 | {type:'game/closed';game:number}
 | {type:'game/reopened';game:number};
export type RoomEvent={version:Protocol;id:string;sequence:number;actor:string;intent:Intent};
export type Player={id:string;name:string;present:boolean;table:string|null};
export type Table={code:string;game:string;title:string;url:string;host:string;players:string[];closed:boolean};
/** Sequence identifies the launch decision; code belongs to the independently hosted game. */
export type RoomGame={sequence:number;code:string;game:string;title:string;url:string;mode:GameChoice['mode'];host:string;players:string[];lastAction:number};
export type State={revision:number;protocol:0|Protocol;name:string;host:string;players:Player[];tables:Table[];games:RoomGame[];activeGame:number|null;messages:{id:string;actor:string;text:string}[]};
export function initialState():State{return {revision:0,protocol:0,name:'',host:'',players:[],tables:[],games:[],activeGame:null,messages:[]};}
function requireChoice(ok:unknown,message:string):asserts ok {if(!ok)throw new Error(message);}
function text(value:unknown,max:number){return typeof value==='string'&&value.trim().length>0&&value.length<=max;}
export function parseIntent(value:unknown):Intent{
 requireChoice(value&&typeof value==='object'&&!Array.isArray(value),'Choose something to do.');
 const i=value as Record<string,unknown>;
 const keys:Record<string,string[]>={'room/created':['name','playerName'],'player/joined':['name'],'player/left':[],'table/launched':['table','players'],'table/catalog-launched':['table','players','game'],'player/returned':[],'table/closed':['table'],'message/sent':['text'],'game/launched':['code','game'],'game/closed':['game'],'game/reopened':['game']};
 requireChoice(typeof i.type==='string'&&Object.hasOwn(keys,i.type),'This room needs a newer version.');
 requireChoice(Object.keys(i).sort().join(',')===['type',...keys[i.type]].sort().join(','),'Choose something to do.');
 if(i.type==='room/created')requireChoice(text(i.name,48)&&text(i.playerName,24),'Give the room and yourself a name.');
 if(i.type==='player/joined')requireChoice(text(i.name,24),'Choose a name up to 24 characters.');
 if(i.type==='message/sent')requireChoice(text(i.text,280),'Write a message up to 280 characters.');
 if(i.type==='table/launched'||i.type==='table/catalog-launched'||i.type==='table/closed')requireChoice(typeof i.table==='string'&&/^[A-F0-9]{8}$/.test(i.table),'Choose a new table.');
 if(i.type==='game/launched')requireChoice(typeof i.code==='string'&&/^[A-F0-9]{8}$/.test(i.code),'Choose a game code.');
 if(i.type==='game/closed'||i.type==='game/reopened')requireChoice(Number.isSafeInteger(i.game)&&(i.game as number)>0,'Choose a recent game.');
 if(i.type==='table/catalog-launched'||i.type==='game/launched'){
  const game=i.game as Record<string,unknown>;
  requireChoice(game&&typeof game==='object'&&!Array.isArray(game)&&Object.keys(game).sort().join(',')===(i.type==='game/launched'?'id,mode,title,url':'id,title,url')&&text(game.id,128)&&text(game.title,120),'Choose a catalog game.');
  if(i.type==='game/launched')requireChoice(game.mode==='integrated'||game.mode==='new-tab','Choose a supported game link.');
  let url:URL;try{url=new URL(game.url as string);}catch{throw new Error('Choose a valid game URL.');}
  requireChoice(url.protocol==='https:'&&!url.username&&!url.password,'Choose a valid game URL.');
 }
 if(i.type==='table/launched'||i.type==='table/catalog-launched')requireChoice(Array.isArray(i.players)&&i.players.length>=1&&i.players.length<=4&&i.players.every(p=>typeof p==='string')&&new Set(i.players).size===i.players.length,'Choose up to four friends.');
 return i as Intent;
}
function applyLegacy(state:State,actor:string,value:unknown):State{
 const intent=parseIntent(value);requireChoice(/^[A-Za-z0-9_-]{1,128}$/.test(actor),'Come into the room first.');
 const next=structuredClone(state),own=next.players.find(p=>p.id===actor);
 if(intent.type==='room/created'){
  requireChoice(!state.revision,'That room is already here.');
  next.name=intent.name.trim();next.host=actor;next.players.push({id:actor,name:intent.playerName.trim(),present:true,table:null});
 }else{
  requireChoice(state.revision,'Waiting for the room to open.');
  if(intent.type==='player/joined'){
   requireChoice(!own||!own.present,'You’re already in the room.');
   requireChoice(own||next.players.length<64,'This room is full.');
   if(own){own.name=intent.name.trim();own.present=true;own.table=null;}else next.players.push({id:actor,name:intent.name.trim(),present:true,table:null});
  }else{
   requireChoice(own?.present,'Come into the room first.');
   if(intent.type==='player/left'){own.present=false;own.table=null;}
   if(intent.type==='table/launched'||intent.type==='table/catalog-launched'){
    requireChoice(intent.players.includes(actor),'Take a seat at your table.');
    requireChoice(!next.tables.some(t=>t.code===intent.table),'Choose a fresh table.');
    requireChoice(intent.players.every(id=>next.players.some(p=>p.id===id&&p.present&&!p.table)),'Someone is already at a table.');
    const game=intent.type==='table/catalog-launched'?intent.game:{id:'cribbage',title:'Cribbage',url:'https://anicolao.github.io/cribbage/'};
    next.tables.push({code:intent.table,game:game.id,title:game.title,url:game.url,host:actor,players:[...intent.players],closed:false});
    for(const p of next.players)if(intent.players.includes(p.id))p.table=intent.table;
   }
   if(intent.type==='player/returned'){requireChoice(own.table,'You’re already by the shelves.');own.table=null;}
   if(intent.type==='table/closed'){
    const table=next.tables.find(t=>t.code===intent.table);requireChoice(table&&!table.closed&&table.host===actor,'Only the table host can put this game away.');table.closed=true;
    for(const p of next.players)if(p.table===table.code)p.table=null;
   }
   if(intent.type==='message/sent')next.messages.push({id:String(next.revision+1),actor,text:intent.text.trim()});
  }
 }
 next.revision++;return next;
}
export function replay(events:readonly RoomEvent[]):State{
 return events.reduce((state,e)=>{requireChoice([1,2,3].includes(e.version)&&e.version>=state.protocol&&e.sequence===state.revision+1,'This room’s history cannot be replayed.');return apply(state,e.actor,e.intent,e.version);},initialState());
}
export function apply(state:State,actor:string,value:unknown,version:Protocol=VERSION):State{
 const intent=parseIntent(value);
 requireChoice([1,2,3].includes(version)&&version>=state.protocol,'This room’s history cannot be replayed.');
 requireChoice(/^[A-Za-z0-9_-]{1,128}$/.test(actor),'Come into the room first.');
 const legacy=intent.type.startsWith('table/')||intent.type==='player/returned';
 requireChoice(!legacy||version<3,'This room uses one shared game.');
 requireChoice(intent.type!=='table/catalog-launched'||version===2,'This launch needs protocol version 2.');
 requireChoice(!intent.type.startsWith('game/')||version===3,'This game needs protocol version 3.');
 if(!intent.type.startsWith('game/')){
  const next=applyLegacy(state,actor,intent);next.protocol=version;
  // Keep v1/v2 table and membership semantics unchanged. Their launch decisions
  // also supply the reopenable links shown by the v3 room UI.
  if(intent.type==='table/launched'||intent.type==='table/catalog-launched'){
   const table=next.tables.at(-1)!;
   next.games.push({sequence:next.revision,code:table.code,game:table.game,title:table.title,url:table.url,mode:'integrated',host:table.host,players:[...table.players],lastAction:next.revision});
  }
  if(intent.type==='table/closed'){const game=next.games.find(g=>g.code===intent.table);if(game)game.lastAction=next.revision;}
  if(version===3){
   for(const player of next.players)player.table=null;
   if(intent.type==='player/joined'&&next.activeGame!==null){const game=next.games.find(g=>g.sequence===next.activeGame)!;if(!game.players.includes(actor))game.players.push(actor);}
  }
  return next;
 }
 requireChoice(state.revision&&state.players.some(p=>p.id===actor&&p.present),'Come into the room first.');
 const next=structuredClone(state),sequence=state.revision+1;
 next.protocol=3;next.revision=sequence;for(const player of next.players)player.table=null;
 if(intent.type==='game/launched'){
  if(next.activeGame!==null)next.games.find(g=>g.sequence===next.activeGame)!.lastAction=sequence;
  next.games.push({sequence,code:intent.code,game:intent.game.id,title:intent.game.title,url:intent.game.url,mode:intent.game.mode,host:actor,players:next.players.filter(p=>p.present).map(p=>p.id),lastAction:sequence});
  next.activeGame=sequence;
 }else if(intent.type==='game/closed'){
  requireChoice(next.activeGame===intent.game,'That game is no longer open.');
  next.games.find(g=>g.sequence===intent.game)!.lastAction=sequence;next.activeGame=null;
 }else if(intent.type==='game/reopened'){
  const game=next.games.find(g=>g.sequence===intent.game);
  requireChoice(game&&next.activeGame!==intent.game,'Choose a recent game.');
  if(next.activeGame!==null)next.games.find(g=>g.sequence===next.activeGame)!.lastAction=sequence;
  game.lastAction=sequence;game.players=[...new Set([...game.players,...next.players.filter(p=>p.present).map(p=>p.id)])];next.activeGame=game.sequence;
 }
 return next;
}
export function currentGame(state:State){return state.games.find(game=>game.sequence===state.activeGame);}
export function recentGames(state:State){return state.games.filter(game=>game.sequence!==state.activeGame).sort((a,b)=>b.lastAction-a.lastAction||b.sequence-a.sequence);}
