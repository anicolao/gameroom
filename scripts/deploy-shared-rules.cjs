// Uses the signed-in Firebase CLI account; never stores admin credentials in the app.
const fs=require('node:fs');
const {getGlobalDefaultAccount}=require('firebase-tools/lib/auth');
const {requireAuth}=require('firebase-tools/lib/requireAuth');
const rules=require('firebase-tools/lib/gcp/rules');
const {spawnSync}=require('node:child_process');
(async()=>{
 const account=getGlobalDefaultAccount();if(!account)throw Error('Sign in with the Firebase CLI first.');
 await requireAuth({project:'launcherui',...account});
 const release=(await rules.listAllReleases('launcherui')).find(value=>value.name.endsWith('/cloud.firestore'));
 const source=await rules.getRulesetContent(release.rulesetName);
 const current=source.find(file=>file.name==='firestore.rules')?.content;
 const before=fs.readFileSync('deployment/launcherui-before.rules','utf8'),after=fs.readFileSync('deployment/launcherui.rules','utf8');
 if(current===after){console.log('Shared rules are already current.');return;}
 if(current!==before)throw Error('Production rules changed since review. Read and merge the current rules before deploying.');
 const child=spawnSync('bun',['x','firebase','deploy','--project','launcherui','--config','firebase.production.json','--only','firestore:rules'],{stdio:'inherit'});
 process.exitCode=child.status??1;
})().catch(error=>{console.error(error.message);process.exitCode=1;});
