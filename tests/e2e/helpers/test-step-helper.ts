import {test,expect,type Page,type TestInfo} from '@playwright/test';
import {mkdirSync,existsSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {identicalPixels} from './exact-pixels';
type Verification={spec:string;check:()=>Promise<unknown>};
/** Every acceptance step records the actor and observers with exact RGBA comparison. */
export class TestStepHelper{
 private steps:string[]=[];
 constructor(private info:TestInfo,private story:string){}
 async step(id:string,page:Page,player:string,description:string,checks:Verification[],game=false,fullPage=false){
  await test.step(`${player}: ${description}`,async()=>{
   await page.bringToFront();
   try{await expect(page.getByRole('status')).toHaveAttribute('data-status','synced');}
   catch(e){await this.info.attach('readiness-dom',{body:await page.content(),contentType:'text/html'});throw e;}
   if(!game)await expect(page.getByTestId('catalogue')).toHaveAttribute('data-status',/current|empty|offline|error/);
   if(game)await expect(page.locator('[data-table-view]')).toHaveAttribute('data-motion-idle','true');
   for(const check of checks)await test.step(check.spec,check.check);
   await page.mouse.move(0,0);
   await page.evaluate(async()=>{
    await document.fonts.ready;
    const backgrounds=new Set([...document.querySelectorAll('*')].map(el=>getComputedStyle(el).backgroundImage).flatMap(bg=>[...bg.matchAll(/url\("?([^"\)]+)"?\)/g)].map(m=>m[1])));
    await Promise.all([...backgrounds].map(src=>{const image=new Image();image.src=src;return image.decode();}));
    await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
   });
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow').toBe(true);
   if(!fullPage){
    const layout=await page.evaluate(()=>({height:innerHeight,scrollHeight:document.documentElement.scrollHeight,sections:[...document.querySelectorAll('.topbar,main,.welcome,.detail-panel,.bookcase,.room-note,.gathering,.quiet-footer')].map(el=>({name:el.className,height:el.getBoundingClientRect().height,top:el.getBoundingClientRect().top}))}));
    if(layout.scrollHeight>layout.height)await this.info.attach('overflow-layout',{body:await page.screenshot(),contentType:'image/png'});
    expect(layout.scrollHeight,`The desktop room fits in its viewport: ${JSON.stringify(layout)}`).toBeLessThanOrEqual(layout.height);
   }
   const name=`${String(this.steps.length).padStart(3,'0')}-${id}-${player.toLowerCase()}.png`,path=this.info.snapshotPath(name);
   const capture=await page.screenshot({animations:'disabled',caret:'hide',scale:'css',fullPage});
   if(this.info.config.updateSnapshots!=='none'){mkdirSync(dirname(path),{recursive:true});writeFileSync(path,capture);}
   else{
    const same=existsSync(path)&&await identicalPixels(capture,readFileSync(path));
    if(!same){await this.info.attach(`${id}-${player}-actual`,{body:capture,contentType:'image/png'});expect(capture).toMatchSnapshot(name,{maxDiffPixels:0,threshold:0});expect(same,'Every decoded RGBA byte must match').toBe(true);}
   }
   this.steps.push(`## ${description}\n\nViewpoint: **${player}**\n\n![${description}](./screenshots/${name.replace('.png',`-${process.platform}.png`)})\n\n${checks.map(c=>`- [x] ${c.spec}`).join('\n')}`);
  });
 }
 finish(){writeFileSync(join(dirname(this.info.file),`${this.story}-${process.platform}.md`),`# ${this.story}\n\nReal Firestore and Auth emulators; independent browser identities. Desktop captures are 1180×820 at 1×; mobile captures are 390×844 with full-page capture. Every decoded RGBA byte must match. No masks, pixel tolerance, screenshot resizing or retries. Baselines are generated explicitly and verified in a separate run.\n\n${this.steps.join('\n\n')}\n`);}
}
