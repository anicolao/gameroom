import {mkdir,copyFile,readdir} from 'node:fs/promises';
import {join} from 'node:path';
// Source is bundled without a compiler, dependencies or build-time secrets.
export async function packageBga(outDir:string){
const destination=join(outDir,'bga-boss');await mkdir(destination,{recursive:true});
for(const name of await readdir('extension/bga-boss'))await copyFile(join('extension/bga-boss',name),join(destination,name));
await copyFile('LICENSE',join(destination,'LICENSE'));
const zip=Bun.spawn(['zip','-qr','../bga-boss.zip','.'],{cwd:destination,stdout:'inherit',stderr:'inherit'});
if(await zip.exited)throw Error('Could not package BGA Boss.');
await copyFile('docs/bga-boss-install.html',join(outDir,'bga-boss-install.html'));

}
