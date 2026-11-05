import {initializeApp} from 'firebase/app';
import {connectAuthEmulator,getAuth,signInAnonymously} from 'firebase/auth';
import {connectFirestoreEmulator,initializeFirestore} from 'firebase/firestore';
let connection:ReturnType<typeof connect>|undefined;
async function connect(){
 const env=import.meta.env;
 if(!env.VITE_FIREBASE_PROJECT_ID)throw new Error('Start the local room with bun run dev:local, or configure Firebase for this build.');
 const app=initializeApp({apiKey:env.VITE_FIREBASE_API_KEY,authDomain:env.VITE_FIREBASE_AUTH_DOMAIN,projectId:env.VITE_FIREBASE_PROJECT_ID,appId:env.VITE_FIREBASE_APP_ID});
 const auth=getAuth(app),db=initializeFirestore(app,{experimentalAutoDetectLongPolling:true,useFetchStreams:false} as Parameters<typeof initializeFirestore>[1]);
 if(env.VITE_USE_FIREBASE_EMULATORS==='true'){
  const host=env.VITE_EMULATOR_HOST??location.hostname;
  connectAuthEmulator(auth,`http://${host}:${env.VITE_FIREBASE_AUTH_EMULATOR_PORT??9297}`,{disableWarnings:true});connectFirestoreEmulator(db,host,Number(env.VITE_FIRESTORE_EMULATOR_PORT??8197));
 }
 await auth.authStateReady();if(!auth.currentUser)await signInAnonymously(auth);
 return {db,uid:auth.currentUser!.uid};
}
export function services(){return connection??=connect().catch(e=>{connection=undefined;throw e;});}
