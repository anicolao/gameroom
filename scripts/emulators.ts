import {javaEnv} from './environment';
const mode=process.argv[2];
if(!['rules','e2e','update'].includes(mode))throw new Error('Choose rules, e2e, or update.');
const child=Bun.spawn(['bun','x','firebase','emulators:exec','--config','firebase.test.json','--project','demo-gameroom-e2e','--only','auth,firestore',`bun scripts/run-suite.ts ${mode}`],{env:await javaEnv(),stdout:'inherit',stderr:'inherit'});
process.on('SIGINT',()=>child.kill('SIGINT'));
process.exit(await child.exited);
