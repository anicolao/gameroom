import {test,expect} from 'bun:test';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {assemblePages} from '../scripts/assemble-pages';
const selectPreview=require('../scripts/select-preview.cjs');
function fixture(check:(root:string,site:string,build:string)=>void){
 const root=mkdtempSync(join(tmpdir(),'gameroom-pages-')),site=join(root,'site'),build=join(root,'build');
 mkdirSync(site);mkdirSync(build);writeFileSync(join(site,'index.html'),'production');writeFileSync(join(site,'.git'),'git metadata');writeFileSync(join(build,'index.html'),'new build');
 try{check(root,site,build);}finally{rmSync(root,{recursive:true,force:true});}
}
test('preview publication replaces only its own directory and preserves production and neighbors',()=>fixture((_root,site,build)=>{
 mkdirSync(join(site,'pr2'));writeFileSync(join(site,'pr2','index.html'),'neighbor');mkdirSync(join(site,'pr6'));writeFileSync(join(site,'pr6','stale.js'),'stale');writeFileSync(join(build,'CNAME'),'production domain');
 assemblePages(site,build,'6');expect(readFileSync(join(site,'index.html'),'utf8')).toBe('production');expect(readFileSync(join(site,'pr2','index.html'),'utf8')).toBe('neighbor');expect(readFileSync(join(site,'pr6','index.html'),'utf8')).toBe('new build');expect(existsSync(join(site,'pr6','stale.js'))).toBe(false);expect(existsSync(join(site,'pr6','CNAME'))).toBe(false);expect(readFileSync(join(site,'pr-6','index.html'),'utf8')).toContain('/pr6/');expect(readFileSync(join(site,'.git'),'utf8')).toBe('git metadata');
}));
test('production refresh preserves numbered previews and redirects historical hyphenated paths locally',()=>fixture((_root,site,build)=>{
 mkdirSync(join(site,'pr2'));writeFileSync(join(site,'pr2','index.html'),'preview');mkdirSync(join(site,'pr-2'));writeFileSync(join(site,'pr-2','old.js'),'old');writeFileSync(join(site,'old.js'),'obsolete');
 assemblePages(site,build);expect(readFileSync(join(site,'index.html'),'utf8')).toBe('new build');expect(readFileSync(join(site,'pr2','index.html'),'utf8')).toBe('preview');expect(existsSync(join(site,'old.js'))).toBe(false);expect(existsSync(join(site,'pr-2','old.js'))).toBe(false);expect(readFileSync(join(site,'pr-2','index.html'),'utf8')).toContain('location.replace("/pr2/"+location.search+location.hash)');
}));
test('unsafe publication inputs fail before replacing production',()=>fixture((root,site,build)=>{
 expect(()=>assemblePages(site,build,'../')).toThrow('PR number');expect(()=>assemblePages(site,site)).toThrow('separate');
 symlinkSync(join(root,'site','index.html'),join(build,'escape'));expect(()=>assemblePages(site,build,'6')).toThrow('symbolic');expect(readFileSync(join(site,'index.html'),'utf8')).toBe('production');
}));
test('root builds cannot overwrite preview namespaces',()=>fixture((_root,site,build)=>{
 mkdirSync(join(build,'pr6'));expect(()=>assemblePages(site,build)).toThrow('reserved');expect(readFileSync(join(site,'index.html'),'utf8')).toBe('production');
}));
async function selection(options:{fork?:boolean;stale?:boolean;closed?:boolean;artifactMismatch?:boolean;manual?:boolean}={}){
 const root=mkdtempSync(join(tmpdir(),'gameroom-preview-selection-')),prior={id:process.env.PREVIEW_RUN_ID,temp:process.env.RUNNER_TEMP};process.env.PREVIEW_RUN_ID='123';process.env.RUNNER_TEMP=root;
 const output:Record<string,string>={};const pulls=()=>{},artifacts=()=>{};let downloaded=false;
 const github={rest:{actions:{getWorkflowRun:async()=>({data:{id:123,event:'pull_request',path:'.github/workflows/pr-preview.yml',status:'completed',conclusion:'success',head_sha:'abc',head_repository:{full_name:options.fork?'outsider/fork':'anicolao/gameroom'}}}),listWorkflowRunArtifacts:artifacts,downloadArtifact:async()=>{downloaded=true;return {data:Buffer.from('zip data')};}},repos:{listPullRequestsAssociatedWithCommit:pulls}},paginate:async(method:unknown)=>method===pulls?[{number:6,head:{repo:{full_name:'anicolao/gameroom'},sha:options.stale?'newer':'abc'},base:{ref:'main'},state:options.closed?'closed':'open'}]:[{id:7,name:'preview-site',expired:false,workflow_run:{head_sha:options.artifactMismatch?'wrong':'abc'}}]};
 try{await selectPreview({github,context:{repo:{owner:'anicolao',repo:'gameroom'},eventName:options.manual?'workflow_dispatch':'workflow_run'},core:{setOutput:(k:string,v:string)=>output[k]=v,info:()=>{}}});return {output,downloaded};}
 finally{if(prior.id===undefined)delete process.env.PREVIEW_RUN_ID;else process.env.PREVIEW_RUN_ID=prior.id;if(prior.temp===undefined)delete process.env.RUNNER_TEMP;else process.env.RUNNER_TEMP=prior.temp;rmSync(root,{recursive:true,force:true});}
}
test('only a successful current first-party preview supplies trusted publication metadata',async()=>{
 const result=await selection();expect(result.output).toEqual({publish:'true',pr_number:'6',commit:'abc'});expect(result.downloaded).toBe(true);
 await expect(selection({fork:true})).rejects.toThrow('first-party');await expect(selection({artifactMismatch:true})).rejects.toThrow('source');
});
test('automatic publication skips stale or closed PRs; explicit replay can publish a merged PR build',async()=>{
 expect((await selection({stale:true})).downloaded).toBe(false);expect((await selection({closed:true})).output.publish).toBe('false');expect((await selection({closed:true,manual:true})).output.publish).toBe('true');
});
