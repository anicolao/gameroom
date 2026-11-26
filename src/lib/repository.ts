import {collection,doc,getDoc,onSnapshot,orderBy,query,runTransaction,type Firestore} from 'firebase/firestore';
import {VERSION,apply,parseIntent,replay,type Intent,type RoomEvent,type Protocol} from './engine';
import {randomId} from './random-id';
type Pending={id:string;actor:string;expectedRevision:number;intent:Intent;version?:Protocol};
function canonical(value:unknown):string{
 if(Array.isArray(value))return `[${value.map(canonical).join(',')}]`;
 if(value!==null&&typeof value==='object')return `{${Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>`${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
 return JSON.stringify(value);
}
export function repository(db:Firestore,room:string,actor:string,accept:(events:RoomEvent[])=>void,fail:(message:string)=>void,storage:Pick<Storage,'getItem'|'setItem'|'removeItem'>=localStorage){
 const root=doc(db,'rooms',room),key=`gameroom:pending:${room}:${actor}`;
 let events:RoomEvent[]=[];
 const unsubscribe=onSnapshot(query(collection(root,'events'),orderBy('sequence')),{includeMetadataChanges:true},snapshot=>{
  if(snapshot.metadata.hasPendingWrites||snapshot.metadata.fromCache)return;
  try{const next=snapshot.docs.map(d=>d.data() as RoomEvent);replay(next);if(next.length>=events.length){events=next;accept(next);}}catch(e){fail((e as Error).message);}
 },()=>fail('The room is reconnecting. Check your connection and try again.'));
 async function send(pending:Pending){
  try{
   const committed=await runTransaction(db,async tx=>{
    const ackRef=doc(root,'commands',pending.id),[meta,ack]=await Promise.all([tx.get(root),tx.get(ackRef)]);
    const revision=meta.data()?.revision??0;
    const prefix=events.length<=revision?events:[];
    const tail=await Promise.all(Array.from({length:revision-prefix.length},(_,i)=>tx.get(doc(root,'events',String(prefix.length+i+1)))));
    const canonicalEvents=[...prefix,...tail.map(d=>d.data() as RoomEvent)];
    if(ack.exists()){
     const previous=await tx.get(doc(root,'events',String(ack.data().sequence)));
     if(previous.data()?.actor!==actor||canonical(previous.data()?.intent)!==canonical(pending.intent))throw new Error('That action was already used.');
     return canonicalEvents;
    }
    if(revision!==pending.expectedRevision)throw new Error('The room changed. Try again.');
    const version=pending.version??2,before=replay(canonicalEvents),next=apply(before,actor,pending.intent,version);
    const event:RoomEvent={version,id:pending.id,sequence:next.revision,actor,intent:pending.intent};
    tx.set(root,{owner:next.host,members:next.players.map(p=>p.id),present:next.players.filter(p=>p.present).map(p=>p.id),revision:next.revision,...(version===4?{game:next.activeGame}:{})});
    tx.set(doc(root,'events',String(event.sequence)),event);tx.set(ackRef,{sequence:event.sequence});
    return [...canonicalEvents,event];
   });
   // Only publish log records after the transaction has committed. The next
   // append must not depend on the watch stream winning the acknowledgement race.
   storage.removeItem(key);
   if(committed.length>=events.length){events=committed;accept(events);}
  }catch(e){
   if(e instanceof Error&&['The room changed. Try again.','That action was already used.'].includes(e.message))storage.removeItem(key);
   if(typeof e==='object'&&e!==null&&'code' in e&&e.code==='permission-denied'){
    // Rules can reject a racing revision before Firestore reports ABORTED.
    // This write definitively did not commit, so it must not block a new choice.
    storage.removeItem(key);
    const current=await getDoc(root);
    if(current.data()?.revision!==pending.expectedRevision)throw new Error('The room changed. Try again.');
    throw new Error('Couldn’t change this room. Reopen the invitation and try again.');
   }
   throw e;
  }
 }
 return {
  async append(value:Intent){
   const intent=parseIntent(value),saved=storage.getItem(key);
   if(saved){const pending=JSON.parse(saved) as Pending;if(canonical(pending.intent)===canonical(intent)){await send(pending);return;}throw new Error('Your last action is waiting. Try it again first.');}
   apply(replay(events),actor,intent);
   const pending:Pending={id:randomId(),actor,expectedRevision:events.length,intent,version:VERSION};storage.setItem(key,JSON.stringify(pending));await send(pending);
  },
  async retry(){const pending=storage.getItem(key);if(pending)await send(JSON.parse(pending));},
  close:unsubscribe
 };
}
