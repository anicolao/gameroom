import {initializeTestEnvironment} from '@firebase/rules-unit-testing';
import {cribbagePath} from './environment';
export async function loadCribbageRules(projectId='demo-cribbage'){
 const rules=await Bun.file(`${cribbagePath}/firestore.rules`).text();
 const port=Number(process.env.FIRESTORE_EMULATOR_HOST?.split(':').at(-1)??8197);
 const environment=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port,rules}});
 await environment.cleanup();
}
