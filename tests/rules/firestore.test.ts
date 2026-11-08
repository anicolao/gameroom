import {beforeAll,afterAll,beforeEach,test,expect} from 'bun:test';
import {initializeTestEnvironment,assertFails,assertSucceeds,type RulesTestEnvironment} from '@firebase/rules-unit-testing';
import {collection,deleteDoc,doc,getDoc,getDocs,setDoc,writeBatch,type Firestore} from 'firebase/firestore';
import {apply,initialState,type Intent,type State,VERSION} from '../../src/lib/engine';
import {repository} from '../../src/lib/repository';
let env:RulesTestEnvironment;
beforeAll(async()=>{env=await initializeTestEnvironment({projectId:'demo-gameroom-e2e',firestore:{host:'127.0.0.1',port:Number(process.env.FIRESTORE_EMULATOR_HOST?.split(':').at(-1)??8199),rules:await Bun.file(process.env.GAMEROOM_RULES_FILE??'firestore.rules').text()}});});
beforeEach(async()=>{await env.clearFirestore();});
afterAll(async()=>{await env.cleanup();});
type TestDb=ReturnType<ReturnType<RulesTestEnvironment['authenticatedContext']>['firestore']>;
function append(db:TestDb,room:string,actor:string,intent:Intent,before=initialState()){
 const after=apply(before,actor,intent),root=doc(db,'rooms',room),id=`intent-${after.revision}`,batch=writeBatch(db);
 batch.set(root,{owner:after.host,members:after.players.map(p=>p.id),present:after.players.filter(p=>p.present).map(p=>p.id),revision:after.revision});
 batch.set(doc(root,'events',String(after.revision)),{version:intent.type==='table/bga-launched'?VERSION:intent.type==='table/catalog-launched'?2:1,id,sequence:after.revision,actor,intent});batch.set(doc(root,'commands',id),{sequence:after.revision});
 return {commit:()=>batch.commit(),after};
}
async function create(){const db=env.authenticatedContext('alex').firestore(),write=append(db,'ABCD1234','alex',{type:'room/created',name:'Friday friends',playerName:'Alex'});await assertSucceeds(write.commit());return {db,state:write.after};}
test('anonymous sign-in is required, named invitations work, and listing rooms is denied',async()=>{
 const {db}=await create();await assertSucceeds(getDoc(doc(db,'rooms','ABCD1234')));await assertFails(getDocs(collection(db,'rooms')));
 await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(),'rooms','ABCD1234')));
});
test('events, metadata and command acknowledgement must be atomic, attributed and immutable',async()=>{
 const {db}=await create(),event=doc(db,'rooms','ABCD1234','events','1');
 await assertFails(setDoc(event,{version:1,id:'other',sequence:1,actor:'alex',intent:{type:'player/left'}}));await assertFails(deleteDoc(event));
 await assertFails(setDoc(doc(db,'rooms','ABCD1234','events','2'),{version:1,id:'orphan',sequence:2,actor:'alex',intent:{type:'message/sent',text:'hello'}}));
 const forged=append(env.authenticatedContext('stranger').firestore(),'ABCD1234','alex',{type:'message/sent',text:'not mine'},apply(initialState(),'alex',{type:'room/created',name:'Friday friends',playerName:'Alex'}));await assertFails(forged.commit());
});
test('join, launch, return, leave and rejoin retain attributed membership',async()=>{
 let {db,state}=await create();const sam=env.authenticatedContext('sam').firestore();
 const choices:[TestDb,string,Intent][]=[[sam,'sam',{type:'player/joined',name:'Sam'}],[db,'alex',{type:'table/launched',table:'AABB1122',players:['alex','sam']}],[sam,'sam',{type:'player/returned'}],[db,'alex',{type:'player/left'}],[db,'alex',{type:'player/joined',name:'Alex again'}]];
 for(const [database,actor,intent] of choices){const write=append(database,'ABCD1234',actor,intent,state);await assertSucceeds(write.commit());state=write.after;}
 expect(state.players).toHaveLength(2);expect(state.revision).toBe(6);
 await assertFails(setDoc(doc(db,'rooms','ABCD1234'),{owner:'alex',members:['alex'],present:['alex'],revision:7}));
});
test('nonmembers cannot append and computed payloads cannot enter an event',async()=>{
 const {db}=await create();const batch=writeBatch(db),root=doc(db,'rooms','ABCD1234');
 batch.set(root,{owner:'alex',members:['alex'],present:['alex'],revision:2});batch.set(doc(root,'events','2'),{version:1,id:'computed',sequence:2,actor:'alex',intent:{type:'message/sent',text:'hi',winner:'alex'}});batch.set(doc(root,'commands','computed'),{sequence:2});await assertFails(batch.commit());
});
function memoryStorage(){
 const data=new Map<string,string>();let saved='';
 return {get saved(){return saved;},getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{saved=value;data.set(key,value);},removeItem:(key:string)=>{data.delete(key);}};
}
async function until(check:()=>boolean){const end=Date.now()+5000;while(!check()){if(Date.now()>end)throw new Error('Room subscription did not catch up.');await Bun.sleep(10);}}
test('a lost acknowledgement is retried with the same ID without duplicating an event',async()=>{
 const storage=memoryStorage();let revision=-1;
 const repo=repository(env.authenticatedContext('alex').firestore() as unknown as Firestore,'ABCD1234','alex',events=>revision=events.length,error=>{throw new Error(error);},storage);
 try{
  await until(()=>revision===0);await repo.append({type:'room/created',name:'Friday friends',playerName:'Alex'});await until(()=>revision===1);
  storage.setItem('gameroom:pending:ABCD1234:alex',storage.saved);await repo.retry();
  const events=await getDocs(collection(env.authenticatedContext('alex').firestore(),'rooms','ABCD1234','events'));expect(events.size).toBe(1);expect(storage.getItem('gameroom:pending:ABCD1234:alex')).toBeNull();
 }finally{repo.close();}
});
test('concurrent arrivals reject a stale append and can join after replay catches up',async()=>{
 await create();const stores=[memoryStorage(),memoryStorage()],revisions=[-1,-1],ids=['sam','lee'];
 const repos=ids.map((id,i)=>repository(env.authenticatedContext(id).firestore() as unknown as Firestore,'ABCD1234',id,events=>revisions[i]=events.length,error=>{throw new Error(error);},stores[i]));
 try{
  await until(()=>revisions.every(r=>r===1));
  const outcomes=await Promise.allSettled(repos.map((repo,i)=>repo.append({type:'player/joined',name:ids[i]})));
  expect(outcomes.filter(o=>o.status==='fulfilled')).toHaveLength(1);const failed=outcomes.findIndex(o=>o.status==='rejected');expect(failed).toBeGreaterThanOrEqual(0);
  expect(outcomes[failed]).toMatchObject({status:'rejected',reason:{message:'The room changed. Try again.'}});
  await until(()=>revisions.every(r=>r===2));await repos[failed].append({type:'player/joined',name:ids[failed]});await until(()=>revisions.every(r=>r===3));
  expect((await getDoc(doc(env.authenticatedContext('alex').firestore(),'rooms','ABCD1234'))).data()?.members).toHaveLength(3);
 }finally{for(const repo of repos)repo.close();}
});
test('protocol 2 accepts catalog-selected launches and rejects unsafe destinations or v1 claims',async()=>{
 const {db,state}=await create();
 const intent:Intent={type:'table/catalog-launched',table:'AABB1122',players:['alex'],game:{id:'new-game',title:'New game',url:'https://independent.example/play/'}};
 for(const [version,url] of [[1,intent.game.url],[2,'javascript:alert(1)'],[2,'https://user:secret@example.com/']] as const){
  const root=doc(db,'rooms','ABCD1234'),batch=writeBatch(db);
  batch.set(root,{owner:'alex',members:['alex'],present:['alex'],revision:2});
  batch.set(doc(root,'events','2'),{version,id:'unsafe',sequence:2,actor:'alex',intent:{...intent,game:{...intent.game,url}}});
  batch.set(doc(root,'commands','unsafe'),{sequence:2});await assertFails(batch.commit());
 }
 const write=append(db,'ABCD1234','alex',intent,state);await assertSucceeds(write.commit());
 const event=(await getDoc(doc(db,'rooms','ABCD1234','events','2'))).data();expect(event?.version).toBe(2);expect(event?.intent.game).toEqual(intent.game);
});
test('v3 BGA publications require an exact token-free BGA destination, selected present participants and immutable attribution',async()=>{
 const {db,state}=await create(),root=doc(db,'rooms','ABCD1234');
 const intent:Intent={type:'table/bga-launched',table:'AABB1122',players:['alex'],requestId:'12345678-0000-4000-8000-000000000000',game:{id:'bga:11',title:"Can't Stop (BGA)",url:'https://boardgamearena.com/table?table=123456'}};
 for(const [version,url,players] of [[2,intent.game.url,['alex']],[3,'https://evil.example/table?table=123',['alex']],[3,intent.game.url+'&token=secret',['alex']],[3,intent.game.url,['alex','absent']]] as const){
  const batch=writeBatch(db);batch.set(root,{owner:'alex',members:['alex'],present:['alex'],revision:2});
  batch.set(doc(root,'events','2'),{version,id:'bga-publication',sequence:2,actor:'alex',intent:{...intent,players:[...players],game:{...intent.game,url}}});batch.set(doc(root,'commands','bga-publication'),{sequence:2});await assertFails(batch.commit());
 }
 const write=append(db,'ABCD1234','alex',intent,state);await assertSucceeds(write.commit());
 expect((await getDoc(doc(root,'events','2'))).data()?.version).toBe(3);
 await assertFails(setDoc(doc(root,'events','2'),{version:3,id:'overwrite',sequence:2,actor:'alex',intent}));
 const old=writeBatch(db);old.set(root,{owner:'alex',members:['alex'],present:['alex'],revision:3});old.set(doc(root,'events','3'),{version:2,id:'downgrade',sequence:3,actor:'alex',intent:{type:'message/sent',text:'hi'}});old.set(doc(root,'commands','downgrade'),{sequence:3});await assertFails(old.commit());
});
