import type {Player,Table} from './engine';
import {randomId} from './random-id';
export function roomCode(){return randomId().replaceAll('-','').slice(0,8).toUpperCase();}
/** Include available friends by default; exclusions are explicit player choices. */
export function selectedFriends(players:readonly Player[],viewer:string,excluded:readonly string[]){
 return players.filter(p=>p.present&&!p.table&&p.id!==viewer&&!excluded.includes(p.id)).slice(0,3).map(p=>p.id);
}
export function launchReceiptKey(room:string,player:string,table:string){return `gameroom:opened:${room}:${player}:${table}`;}
export function gameUrl(base:string,table:Table,player:Player,returnTo?:string){
 if(!table.players.includes(player.id))throw new Error('This invitation is for another player.');
 if(table.provider==='bga')return table.url;
 const url=new URL(base);
 if(!['http:','https:'].includes(url.protocol))throw new Error('Choose a web address for this game.');
 url.searchParams.set('table',table.code);url.searchParams.set('launch',table.host===player.id?'create':'join');url.searchParams.set('name',player.name);
 if(returnTo)url.searchParams.set('returnTo',returnTo);else url.searchParams.delete('returnTo');
 return url.href;
}
