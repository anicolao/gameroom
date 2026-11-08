import {cpSync,existsSync,lstatSync,mkdirSync,readdirSync,rmSync,writeFileSync} from 'node:fs';
import {resolve,join,relative,sep,isAbsolute} from 'node:path';

function validateTree(directory:string){
 for(const entry of readdirSync(directory,{withFileTypes:true})){
  if(entry.name.toLowerCase()==='.git'||entry.name.toLowerCase()==='.github'||entry.isSymbolicLink())throw Error('Publication contains repository metadata or a symbolic link.');
  const path=join(directory,entry.name);
  if(entry.isDirectory())validateTree(path);else if(!entry.isFile())throw Error('Publication contains a non-file entry.');
 }
}
export function assemblePages(sitePath:string,buildPath:string,prNumber?:string){
 const site=resolve(sitePath),build=resolve(buildPath);
 const within=(parent:string,child:string)=>{const r=relative(parent,child);return !r||(!r.startsWith(`..${sep}`)&&r!=='..'&&!isAbsolute(r));};
 if(within(site,build)||within(build,site))throw Error('Build and publication must be separate directories.');
 if(prNumber!==undefined&&!/^[1-9][0-9]*$/.test(prNumber))throw Error('Invalid PR number.');
 validateTree(build);
 if(!existsSync(join(build,'index.html')))throw Error('Publication has no index.html.');
 if(!prNumber&&readdirSync(build).some(entry=>/^pr-?[0-9]+$/.test(entry)))throw Error('Root build contains a reserved preview path.');
 mkdirSync(site,{recursive:true});
 const redirect=(number:string)=>{
  const alias=join(site,`pr-${number}`);rmSync(alias,{recursive:true,force:true});mkdirSync(alias);
  writeFileSync(join(alias,'index.html'),`<!doctype html><meta charset="utf-8"><script>location.replace("/pr${number}/"+location.search+location.hash)</script><a href="/pr${number}/">Open preview</a>\n`);
 };
 if(prNumber){
  const target=join(site,`pr${prNumber}`);rmSync(target,{recursive:true,force:true});cpSync(build,target,{recursive:true});
  rmSync(join(target,'CNAME'),{force:true});
  if(process.env.PREVIEW_COMMIT)writeFileSync(join(target,'deployment.json'),JSON.stringify({commit:process.env.PREVIEW_COMMIT,run:`https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.PREVIEW_RUN_ID}`})+'\n');
  redirect(prNumber);
 }else{
  for(const entry of readdirSync(site)){
   if(entry==='.git'||entry==='.nojekyll')continue;
   const path=join(site,entry);
   if(/^pr[1-9][0-9]*$/.test(entry)&&lstatSync(path).isDirectory()&&!lstatSync(path).isSymbolicLink())continue;
   const old=/^pr-([1-9][0-9]*)$/.exec(entry);if(old){redirect(old[1]);continue;}
   rmSync(path,{recursive:true,force:true});
  }
  // Root builds cannot replace numbered previews or publication metadata.
  for(const entry of readdirSync(build)){
   if(/^pr-?[0-9]+$/.test(entry)||entry==='.nojekyll')throw Error('Root build contains a reserved preview path.');
   cpSync(join(build,entry),join(site,entry),{recursive:true});
  }
 }
}
if(import.meta.main)assemblePages(process.argv[2],process.argv[3],process.argv[4]);
