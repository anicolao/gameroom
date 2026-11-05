import {cribbagePath,cribbageEnv,localEnv} from './environment';
import {waitForLaunchContract} from './launch-contract';
const cribbage=process.argv[2]==='cribbage',cwd=cribbage?cribbagePath:process.cwd();
const projectId=cribbage?'demo-cribbage-e2e':'demo-gameroom-e2e';
const env={...(cribbage?cribbageEnv:localEnv),VITE_CATALOGUE_FIREBASE_PROJECT_ID:'demo-gameroom-catalogue-e2e',VITE_FIREBASE_PROJECT_ID:projectId,VITE_FIREBASE_AUTH_DOMAIN:`${projectId}.firebaseapp.com`,VITE_FIREBASE_APP_ID:`${projectId}-app`,VITE_FIREBASE_AUTH_EMULATOR_PORT:'9299',VITE_FIRESTORE_EMULATOR_PORT:'8199'};
const build=Bun.spawn(['bun','run','build'],{cwd,env,stdout:'inherit',stderr:'inherit'});
const result=await build.exited;if(result)process.exit(result);
const preview=Bun.spawn(['bun','x','vite','preview','--host','127.0.0.1','--port',cribbage?'4197':'4199','--strictPort'],{cwd,env,stdout:'inherit',stderr:'inherit'});
process.on('SIGTERM',()=>preview.kill());process.on('SIGINT',()=>preview.kill());
if(cribbage){try{await waitForLaunchContract('http://127.0.0.1:4197/',preview);}catch(error){console.error(error);preview.kill();process.exit(1);}}
process.exit(await preview.exited);
