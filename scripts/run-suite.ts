import {seedCatalogue} from './catalogue';
import {initializeTestEnvironment} from '@firebase/rules-unit-testing';
import {cantstopPath} from './environment';
import {loadCribbageRules} from './cribbage-rules';
const mode=process.argv[2];
if(mode==='rules'){
 const child=Bun.spawn(['bun','test','tests/rules'],{stdout:'inherit',stderr:'inherit'});const result=await child.exited;if(result)process.exit(result);
 const merged=Bun.spawn(['bun','test','tests/rules/firestore.test.ts'],{env:{...process.env,GAMEROOM_RULES_FILE:'deployment/launcherui.rules'},stdout:'inherit',stderr:'inherit'});process.exit(await merged.exited);
}
await loadCribbageRules('demo-cribbage-e2e');
const cantstop=await initializeTestEnvironment({projectId:'demo-cantstop-e2e',firestore:{host:'127.0.0.1',port:Number(process.env.FIRESTORE_EMULATOR_HOST?.split(':').at(-1)??8199),rules:await Bun.file(`${cantstopPath}/firestore.rules`).text()}});await cantstop.cleanup();
await seedCatalogue('demo-gameroom-catalogue-e2e');
const child=Bun.spawn(['bun','x','playwright','test',...(mode==='update'?['--update-snapshots']:[]),...(process.env.E2E_GREP?['--grep',process.env.E2E_GREP]:[])],{stdout:'inherit',stderr:'inherit'});process.exit(await child.exited);
