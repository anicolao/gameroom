import {initializeTestEnvironment} from '@firebase/rules-unit-testing';
/** Emulator-only catalogue fixture. Production reads the shared Applications collection. */
export async function seedCatalogue(projectId:string){
 const host=process.env.FIRESTORE_EMULATOR_HOST??'127.0.0.1:8197';
 if(!projectId.startsWith('demo-')||!/^127\.0\.0\.1:\d+$/.test(host))throw new Error('Catalogue seeding requires a local demo emulator.');
 const rules="rules_version = '2'; service cloud.firestore { match /databases/{database}/documents { match /Applications/{id} { allow read: if request.auth != null; allow write: if false; } } }";
 const environment=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:Number(host.split(':')[1]),rules}});
 try{
  const fixture=[['cribbage','Cribbage'],['jaipur','Jaipur'],['istanbul','Istanbul'],['roborally','Robo Rally']];
  for(const [id,title] of fixture){
   const document=`http://${host}/v1/projects/${projectId}/databases/(default)/documents/Applications/${id}`;
   const existing=await fetch(document,{headers:{Authorization:'Bearer owner'}});if(existing.ok)continue;
   if(existing.status!==404)throw new Error(`Cannot read catalogue fixture (${existing.status}).`);
   const response=await fetch(document,{method:'PATCH',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({fields:{Title:{stringValue:title},URL:{stringValue:`https://anicolao.github.io/${id}/`},Icon:{stringValue:''}}})});
   if(!response.ok)throw new Error(`Cannot seed catalogue fixture (${response.status}).`);
  }
 }finally{await environment.cleanup();}
}
