import {collection,doc,getDoc,onSnapshot,orderBy,query,runTransaction,type Firestore} from 'firebase/firestore';
import {VERSION,apply,parseIntent,replay,type Intent,type RoomEvent} from './engine';
import {randomId} from './random-id';
type Pending={id:string;actor:string;expectedRevision:number;intent:Intent};
export function repository(db:Firestore,room:string,actor:string,accept:(events:RoomEvent[])=>void,fail:(message:string)=>void,storage:Pick<Storage,'getItem'|'setItem'|'removeItem'>=localStorage){
 const root=doc(db,'rooms',room),key=`gameroom:pending:${room}:${actor}`;
 let events:RoomEvent[]=[];
 const unsubscribe=onSnapshot(query(collection(root,'events'),orderBy('sequence')),{includeMetadataChanges:true},snapshot=>{
  if(snapshot.metadata.hasPendingWrites||snapshot.metadata.fromCache)return;
  try{const next=snapshot.docs.map(d=>d.data() as RoomEvent);replay(next);events=next;accept(next);}catch(e){fail((e as Error).message);}
 },()=>fail('The room is reconnecting. Check your connection and try again.'));
 async function send(pending:Pending){
  try{
   await runTransaction(db,async tx=>{
    const ackRef=doc(root,'commands',pending.id),[meta,ack]=await Promise.all([tx.get(root),tx.get(ackRef)]);
    if(ack.exists()){
     const previous=await tx.get(doc(root,'events',String(ack.data().sequence)));
     const canonical=(value:Intent)=>JSON.stringify(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)));
     if(previous.data()?.actor!==actor||canonical(previous.data()?.intent)!==canonical(pending.intent))throw new Error('That action was already used.');
     return;
    }
    const revision=meta.data()?.revision??0;
    if(revision!==pending.expectedRevision)throw new Error('The room changed. Try again.');
    const prefix=events.length<=revision?events:[];
    const tail=await Promise.all(Array.from({length:revision-prefix.length},(_,i)=>tx.get(doc(root,'events',String(prefix.length+i+1)))));
    const before=replay([...prefix,...tail.map(d=>d.data() as RoomEvent)]),next=apply(before,actor,pending.intent);
    const event:RoomEvent={version:VERSION,id:pending.id,sequence:next.revision,actor,intent:pending.intent};
    tx.set(root,{owner:next.host,members:next.players.map(p=>p.id),present:next.players.filter(p=>p.present).map(p=>p.id),revision:next.revision});
    tx.set(doc(root,'events',String(event.sequence)),event);tx.set(ackRef,{sequence:event.sequence});
   });
   storage.removeItem(key);
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
   if(storage.getItem(key))throw new Error('Your last action is waiting. Try it again first.');
   const intent=parseIntent(value);apply(replay(events),actor,intent);
   const pending={id:randomId(),actor,expectedRevision:events.length,intent};storage.setItem(key,JSON.stringify(pending));await send(pending);
  },
  async retry(){const pending=storage.getItem(key);if(pending)await send(JSON.parse(pending));},
  close:unsubscribe
 };
}
