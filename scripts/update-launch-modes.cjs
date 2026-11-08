// One-time, explicitly requested catalog edit. Dry-run unless --apply is supplied.
// Only named existing documents receive a GameroomEnabled field update; all other
// fields and all unrelated records are preserved using update-time preconditions.
const fs=require('node:fs');
const auth=require('firebase-tools/lib/auth');
const {requireAuth}=require('firebase-tools/lib/requireAuth');
const modes={cribbage:'integrated',Istanbul:'new-tab',RRpr:'new-tab',gotfive:'new-tab',imN9w9SQV3ovd5cOMS6v:'new-tab',kP3RBulKehZDX3d6Yn8H:'new-tab',rebelprincess:'new-tab',uVzIn6qMCJPH1Q3qv7cZ:'new-tab'};
(async()=>{
 const account=auth.getGlobalDefaultAccount();await requireAuth({project:'launcherui',...account});
 const {access_token}=await auth.getAccessToken(account.tokens.refresh_token,[]);
 const headers={Authorization:`Bearer ${access_token}`,'Content-Type':'application/json'},base='https://firestore.googleapis.com/v1/projects/launcherui/databases/(default)/documents';
 const response=await fetch(`${base}/Applications?pageSize=1000`,{headers});if(!response.ok)throw Error(`Catalog read failed: ${response.status}`);
 const snapshot=await response.json(),documents=snapshot.documents??[];
 const writes=[];
 for(const [id,mode] of Object.entries(modes)){
  const document=documents.find(d=>d.name.split('/').at(-1)===id);if(!document)throw Error(`Expected catalog entry is missing: ${id}`);
  if(!document.fields.WebURL?.stringValue?.startsWith('https://'))throw Error(`Review WebURL for ${id}`);
  if(document.fields.GameroomEnabled?.stringValue===mode)continue;
  if(document.fields.GameroomEnabled?.booleanValue!==true)throw Error(`Unexpected existing mode for ${id}; review before editing.`);
  writes.push({update:{name:document.name,fields:{GameroomEnabled:{stringValue:mode}}},updateMask:{fieldPaths:['GameroomEnabled']},currentDocument:{updateTime:document.updateTime}});
  console.log(`${id}: enabled boolean -> ${mode}`);
 }
 const existing=documents.find(d=>d.fields.WebURL?.stringValue==='https://anicolao.github.io/cantstop/'||d.fields.Title?.stringValue?.replace(/[’']/g,'').toLowerCase()==='cant stop');
 if(existing){
  if(existing.fields.GameroomEnabled?.stringValue!=='integrated')throw Error('Can’t Stop already exists; review its document before changing it.');
 }else{
  if(documents.some(d=>d.name.endsWith('/cantstop')))throw Error('The cantstop ID is already in use.');
  writes.push({update:{name:'projects/launcherui/databases/(default)/documents/Applications/cantstop',fields:{Title:{stringValue:"Can't Stop"},Hidden:{booleanValue:true},WebURL:{stringValue:'https://anicolao.github.io/cantstop/'},GameroomEnabled:{stringValue:'integrated'},Icon:{stringValue:'https://gameroom.boardgamescafe.org/art/covers/cantstop.png'}}},currentDocument:{exists:false}});
  console.log('cantstop: add integrated, Gameroom-only entry');
 }
 if(!process.argv.includes('--apply')){console.log(`Dry run: ${writes.length} targeted edits. Use --apply to commit.`);return;}
 if(!writes.length){console.log('Catalog is already current.');return;}
 const backup=`/tmp/gameroom-catalog-before-${Date.now()}.json`;fs.writeFileSync(backup,JSON.stringify(snapshot,null,2));
 const result=await fetch(`${base}:commit`,{method:'POST',headers,body:JSON.stringify({writes})});if(!result.ok)throw Error(`Catalog commit failed (${result.status}): ${await result.text()}`);
 console.log(`Committed ${writes.length} targeted catalog edits. Backup: ${backup}`);
})().catch(error=>{console.error(error.message);process.exitCode=1;});
