export const VERSION=3;
export type Intent =
 | {type:'room/created';name:string;playerName:string}
 | {type:'player/joined';name:string}
 | {type:'player/left'}
 | {type:'table/launched';table:string;players:string[]}
 | {type:'table/catalog-launched';table:string;players:string[];game:{id:string;title:string;url:string}}
 | {type:'table/bga-launched';table:string;players:string[];game:{id:string;title:string;url:string};requestId:string}
 | {type:'player/returned'}
 | {type:'table/closed';table:string}
 | {type:'message/sent';text:string};
export type RoomEvent={version:1|2|3;id:string;sequence:number;actor:string;intent:Intent};
export type Player={id:string;name:string;present:boolean;table:string|null};
export type Table={code:string;game:string;title:string;url:string;host:string;players:string[];closed:boolean;provider?:'bga';requestId?:string};
export type State={revision:number;name:string;host:string;players:Player[];tables:Table[];messages:{id:string;actor:string;text:string}[]};
export function initialState():State{return {revision:0,name:'',host:'',players:[],tables:[],messages:[]};}
function requireChoice(ok:unknown,message:string):asserts ok {if(!ok)throw new Error(message);}
function text(value:unknown,max:number){return typeof value==='string'&&value.trim().length>0&&value.length<=max;}
export function parseIntent(value:unknown):Intent{
 requireChoice(value&&typeof value==='object'&&!Array.isArray(value),'Choose something to do.');
 const i=value as Record<string,unknown>;
 const keys:Record<string,string[]>={'room/created':['name','playerName'],'player/joined':['name'],'player/left':[],'table/launched':['table','players'],'table/catalog-launched':['table','players','game'],'table/bga-launched':['table','players','game','requestId'],'player/returned':[],'table/closed':['table'],'message/sent':['text']};
 requireChoice(typeof i.type==='string'&&Object.hasOwn(keys,i.type),'This room needs a newer version.');
 requireChoice(Object.keys(i).sort().join(',')===['type',...keys[i.type]].sort().join(','),'Choose something to do.');
 if(i.type==='room/created')requireChoice(text(i.name,48)&&text(i.playerName,24),'Give the room and yourself a name.');
 if(i.type==='player/joined')requireChoice(text(i.name,24),'Choose a name up to 24 characters.');
 if(i.type==='message/sent')requireChoice(text(i.text,280),'Write a message up to 280 characters.');
 if(i.type==='table/launched'||i.type==='table/catalog-launched'||i.type==='table/bga-launched'||i.type==='table/closed')requireChoice(typeof i.table==='string'&&/^[A-F0-9]{8}$/.test(i.table),'Choose a new table.');
 if(i.type==='table/catalog-launched'||i.type==='table/bga-launched'){
  const game=i.game as Record<string,unknown>;
  requireChoice(game&&typeof game==='object'&&!Array.isArray(game)&&Object.keys(game).sort().join(',')==='id,title,url'&&text(game.id,128)&&text(game.title,120),'Choose a catalog game.');
  let url:URL;try{url=new URL(game.url as string);}catch{throw new Error('Choose a valid game URL.');}
  requireChoice(url.protocol==='https:'&&!url.username&&!url.password,'Choose a valid game URL.');
 }
 if(i.type==='table/bga-launched')requireChoice(typeof i.requestId==='string'&&/^[a-f0-9-]{36}$/.test(i.requestId)&&/^https:\/\/boardgamearena\.com\/table\?table=[1-9][0-9]{0,14}$/.test((i.game as {url:string}).url),'Choose a BGA table.');
 if(i.type==='table/launched'||i.type==='table/catalog-launched'||i.type==='table/bga-launched')requireChoice(Array.isArray(i.players)&&i.players.length>=1&&i.players.length<=4&&i.players.every(p=>typeof p==='string')&&new Set(i.players).size===i.players.length,'Choose up to four friends.');
 return i as Intent;
}
export function apply(state:State,actor:string,value:unknown):State{
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
   if(intent.type==='table/launched'||intent.type==='table/catalog-launched'||intent.type==='table/bga-launched'){
    requireChoice(intent.players.includes(actor),'Take a seat at your table.');
    requireChoice(!next.tables.some(t=>t.code===intent.table),'Choose a fresh table.');
    requireChoice(intent.players.every(id=>next.players.some(p=>p.id===id&&p.present&&!p.table)),'Someone is already at a table.');
    if(intent.type==='table/bga-launched')requireChoice(!next.tables.some(t=>t.requestId===intent.requestId),'This BGA request is already shared.');
    const game=intent.type!=='table/launched'?intent.game:{id:'cribbage',title:'Cribbage',url:'https://anicolao.github.io/cribbage/'};
    next.tables.push({code:intent.table,game:game.id,title:game.title,url:game.url,host:actor,players:[...intent.players],closed:false,...(intent.type==='table/bga-launched'?{provider:'bga' as const,requestId:intent.requestId}:{})});
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
 let version=1;
 return events.reduce((state,e)=>{requireChoice([1,2,3].includes(e.version)&&e.version>=version&&e.sequence===state.revision+1,'This room’s history cannot be replayed.');requireChoice(e.intent.type!=='table/catalog-launched'||e.version>=2,'This launch needs protocol version 2.');requireChoice(e.intent.type!=='table/bga-launched'||e.version===3,'This launch needs protocol version 3.');version=e.version;return apply(state,e.actor,e.intent);},initialState());
}
