import {initializeApp,type FirebaseOptions} from 'firebase/app';
import {connectAuthEmulator,getAuth,signInAnonymously} from 'firebase/auth';
import {collection,connectFirestoreEmulator,initializeFirestore,onSnapshot,orderBy,query} from 'firebase/firestore';
import {parseCatalog,type CatalogSnapshot} from './catalog';
let connection:ReturnType<typeof connect>|undefined;
async function connect(){
 const env=import.meta.env,options:FirebaseOptions={apiKey:env.VITE_CATALOGUE_FIREBASE_API_KEY,authDomain:env.VITE_CATALOGUE_FIREBASE_AUTH_DOMAIN,projectId:env.VITE_CATALOGUE_FIREBASE_PROJECT_ID,appId:env.VITE_CATALOGUE_FIREBASE_APP_ID};
 if(Object.values(options).some(value=>!value))throw new Error('Configure the ttlauncher catalogue Firebase connection.');
 const app=initializeApp(options,'ttlauncher-catalogue'),auth=getAuth(app),db=initializeFirestore(app,{experimentalAutoDetectLongPolling:true,useFetchStreams:false} as Parameters<typeof initializeFirestore>[1]);
 if(env.VITE_CATALOGUE_USE_FIREBASE_EMULATORS==='true'){
  const host=env.VITE_EMULATOR_HOST??location.hostname;
  connectAuthEmulator(auth,`http://${host}:${env.VITE_FIREBASE_AUTH_EMULATOR_PORT??9297}`,{disableWarnings:true});
  connectFirestoreEmulator(db,host,Number(env.VITE_FIRESTORE_EMULATOR_PORT??8197));
 }
 await auth.authStateReady();if(!auth.currentUser)await signInAnonymously(auth);
 return db;
}
export function subscribeCatalog(accept:(snapshot:CatalogSnapshot)=>void){
 let disposed=false,stop=()=>{};
 accept({status:'loading',games:[],rejected:0});
 void (connection??=connect().catch(error=>{connection=undefined;throw error;})).then(db=>{
  if(disposed)return;
  stop=onSnapshot(query(collection(db,'Applications'),orderBy('Title')),{includeMetadataChanges:true},snapshot=>{
   const parsed=parseCatalog(snapshot.docs.map(document=>({id:document.id,data:document.data()})),import.meta.env.VITE_CATALOGUE_ASSET_ORIGIN);
   accept({...parsed,status:snapshot.metadata.fromCache?'offline':parsed.games.length?'current':'empty'});
  },()=>accept({status:'error',games:[],rejected:0}));
 }).catch(()=>{if(!disposed)accept({status:'error',games:[],rejected:0});});
 return ()=>{disposed=true;stop();};
}
