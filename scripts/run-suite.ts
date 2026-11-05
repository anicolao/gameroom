import {seedCatalogue} from './catalogue';
import {loadCribbageRules} from './cribbage-rules';
const mode=process.argv[2];
if(mode==='rules'){
 const child=Bun.spawn(['bun','test','tests/rules'],{stdout:'inherit',stderr:'inherit'});const result=await child.exited;if(result)process.exit(result);
 const merged=Bun.spawn(['bun','test','tests/rules/firestore.test.ts'],{env:{...process.env,GAMEROOM_RULES_FILE:'deployment/launcherui.rules'},stdout:'inherit',stderr:'inherit'});process.exit(await merged.exited);
}
await loadCribbageRules('demo-cribbage-e2e');
await seedCatalogue('demo-gameroom-catalogue-e2e');
const child=Bun.spawn(['bun','x','playwright','test',...(mode==='update'?['--update-snapshots']:[]),...(process.env.E2E_GREP?['--grep',process.env.E2E_GREP]:[])],{stdout:'inherit',stderr:'inherit'});process.exit(await child.exited);
