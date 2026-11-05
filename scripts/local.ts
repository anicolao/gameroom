import {cribbageEnv,cribbagePath,javaEnv,localEnv} from './environment';
import {seedCatalogue} from './catalogue';
import {loadCribbageRules} from './cribbage-rules';
import {waitForLaunchContract} from './launch-contract';
const cribbagePort=process.env.GAMEROOM_CRIBBAGE_PORT??'5397';
if(!/^\d+$/.test(cribbagePort)||Number(cribbagePort)<1024||Number(cribbagePort)>65535)throw new Error('GAMEROOM_CRIBBAGE_PORT must be a port from 1024 to 65535.');
const cribbageUrl=`http://127.0.0.1:${cribbagePort}/`;
const children:Bun.Subprocess[]=[];
function shutdown(){for(const child of children)child.kill('SIGTERM');}
process.on('SIGINT',()=>{shutdown();process.exit(0);});process.on('SIGTERM',()=>{shutdown();process.exit(0);});
try{
 children.push(Bun.spawn(['bun','x','firebase','emulators:start','--project','demo-gameroom','--only','auth,firestore','--import=.firebase/local','--export-on-exit=.firebase/local'],{env:await javaEnv(),stdout:'inherit',stderr:'inherit'}));
 const deadline=Date.now()+90_000;
 while(true){
  try{const response=await fetch('http://127.0.0.1:8197/');const auth=await fetch('http://127.0.0.1:9297/');if(response.ok&&auth.ok)break;}catch{}
  if(Date.now()>deadline)throw new Error('Firebase emulators did not start. Check that Java 21 is installed and ports 8197/9297 are available.');
  if(children[0].exitCode!==null)throw new Error('Firebase emulators exited.');
  await Bun.sleep(300);
 }
 await loadCribbageRules();
 await seedCatalogue('demo-gameroom-catalogue');
 // Bind the same address that invitations use; wildcard binds can coexist with
 // an older server on loopback and silently send players to the wrong checkout.
 const game=Bun.spawn(['bun','x','vite','--host','127.0.0.1','--port',cribbagePort,'--strictPort'],{cwd:cribbagePath,env:cribbageEnv,stdout:'inherit',stderr:'inherit'});
 children.push(game);
 await waitForLaunchContract(cribbageUrl,game);
 console.log(`Integrated Cribbage: ${cribbageUrl} (${cribbagePath})`);
 children.push(Bun.spawn(['bun','run','dev'],{env:{...localEnv,VITE_CRIBBAGE_URL:cribbageUrl},stdout:'inherit',stderr:'inherit'}));
 console.log('\nGameroom: http://127.0.0.1:5199 — open this address in two browser profiles to try it with a friend.\n');
 const code=await Promise.race(children.map(c=>c.exited));shutdown();process.exit(code);
}catch(e){console.error((e as Error).message);shutdown();process.exit(1);}
