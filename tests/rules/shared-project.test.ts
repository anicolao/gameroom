import {test,expect} from 'bun:test';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,getDoc,setDoc,updateDoc,deleteDoc} from 'firebase/firestore';
test('shared-project rules preserve authenticated reads, editor flags and protected user records',async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-gameroom-shared-rules',firestore:{host:'127.0.0.1',port:Number(process.env.FIRESTORE_EMULATOR_HOST?.split(':').at(-1)??8199),rules:await Bun.file('deployment/launcherui.rules').text()}});
 try{
  await env.withSecurityRulesDisabled(async context=>{await setDoc(doc(context.firestore(),'Applications','known'),{Title:'Known',URL:'https://games.example/'});await setDoc(doc(context.firestore(),'users','editor'),{catalogueEditor:true});});
  const reader=env.authenticatedContext('reader').firestore(),editor=env.authenticatedContext('editor').firestore(),anonymous=env.unauthenticatedContext().firestore();
  await assertSucceeds(getDoc(doc(reader,'Applications','known')));await assertFails(getDoc(doc(anonymous,'Applications','known')));
  await assertFails(updateDoc(doc(reader,'Applications','known'),{Title:'Changed'}));
  await assertSucceeds(updateDoc(doc(editor,'Applications','known'),{Title:'Changed'}));
  await assertSucceeds(setDoc(doc(editor,'Applications','cribbage'),{Title:'Cribbage',Hidden:true,GameroomEnabled:'new-tab',WebURL:'https://anicolao.github.io/cribbage/'}));
  await assertFails(updateDoc(doc(editor,'Applications','cribbage'),{Hidden:false}));
  await assertFails(updateDoc(doc(editor,'Applications','cribbage'),{WebURL:'javascript:alert(1)'}));
  await assertFails(deleteDoc(doc(editor,'Applications','known')));
  await assertFails(setDoc(doc(reader,'users','reader'),{catalogueEditor:true}));
  await assertSucceeds(setDoc(doc(reader,'users','reader'),{name:'Reader'}));
  await assertFails(updateDoc(doc(reader,'users','reader'),{catalogueEditor:true}));
  await assertFails(setDoc(doc(reader,'unrelated','new'),{value:1}));
  expect((await getDoc(doc(editor,'Applications','known'))).data()?.Title).toBe('Changed');
 }finally{await env.cleanup();}
});
