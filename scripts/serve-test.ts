import {cribbagePath,cantstopPath,cribbageEnv,localEnv} from './environment';
import {waitForLaunchContract} from './launch-contract';
const cribbage=process.argv[2]==='cribbage',cantstop=process.argv[2]==='cantstop',game=cribbage||cantstop,cwd=cribbage?cribbagePath:cantstop?cantstopPath:process.cwd();
const projectId=cribbage?'demo-cribbage-e2e':cantstop?'demo-cantstop-e2e':'demo-gameroom-e2e';
const env={...(game?cribbageEnv:localEnv),VITE_CATALOGUE_FIREBASE_PROJECT_ID:'demo-gameroom-catalogue-e2e',VITE_FIREBASE_PROJECT_ID:projectId,VITE_FIREBASE_AUTH_DOMAIN:`${projectId}.firebaseapp.com`,VITE_FIREBASE_APP_ID:`${projectId}-app`,VITE_FIREBASE_AUTH_EMULATOR_PORT:'9299',VITE_FIRESTORE_EMULATOR_PORT:'8199'};
// Keep test bundles separate from production builds and the running development stack.
const outDir='.firebase/e2e-build';
const build=Bun.spawn(['bun','run','build','--outDir',outDir],{cwd,env,stdout:'inherit',stderr:'inherit'});
const result=await build.exited;if(result)process.exit(result);
const preview=Bun.spawn(['bun','x','vite','preview','--host','127.0.0.1','--port',cribbage?'4397':cantstop?'4499':'4199','--strictPort','--outDir',outDir],{cwd,env,stdout:'inherit',stderr:'inherit'});
process.on('SIGTERM',()=>preview.kill());process.on('SIGINT',()=>preview.kill());
if(game){try{await waitForLaunchContract(cribbage?'http://127.0.0.1:4397/':'http://127.0.0.1:4499/',preview,cribbage?'cribbage':'cantstop');}catch(error){console.error(error);preview.kill();process.exit(1);}}
process.exit(await preview.exited);
