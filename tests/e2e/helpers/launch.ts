import {expect,type Page} from '@playwright/test';
export async function deterministicRoom(page:Page,start=0){
 await page.addInitScript((start)=>{
  Object.defineProperty(crypto,'randomUUID',{configurable:true,value:()=>{const n=Number(sessionStorage.getItem('poc-sequence')??start)+1;sessionStorage.setItem('poc-sequence',String(n));return `${n.toString(16).padStart(8,'0')}-0000-4000-8000-000000000000`;}});
 },start);
}
export const friend=(page:Page,name:string)=>page.getByTestId('friend').filter({hasText:name});
export const profile={baseURL:'http://127.0.0.1:4199',viewport:{width:1180,height:820},deviceScaleFactor:1,locale:'en-CA',timezoneId:'America/Toronto'};
export async function waitForInactive(page:Page){
 // Poll without manufacturing a browser user gesture.
 const session=await page.context().newCDPSession(page);
 try{await expect.poll(async()=>{
  const result=await session.send('Runtime.evaluate',{expression:'navigator.userActivation.isActive',returnByValue:true,userGesture:false});
  return result.result.value;
 }).toBe(false);}finally{await session.detach();}
}
export const gameFrame=(page:Page)=>page.frameLocator('.game-window iframe');
export async function gameURL(page:Page){return new URL((await page.locator('.game-window iframe').getAttribute('src'))!);}
export async function inGame(page:Page,port='4397'){
 await expect(page.getByRole('dialog')).toBeVisible();
 await expect(page.locator('.game-window iframe')).toHaveCount(1);
 const url=await gameURL(page);expect(url.origin).toBe(`http://127.0.0.1:${port}`);expect(url.searchParams.has('table')).toBe(true);expect(url.searchParams.has('returnTo')).toBe(false);
 if(port==='4397')await expect(gameFrame(page).locator('main')).toHaveAttribute('data-connected','true');
 expect(page.context().pages()).toHaveLength(1);
 return gameFrame(page);
}
/** Check the fixed overlay control with native hit testing; no parent RAF dependency. */
async function openOverlayMenu(page:Page){
 await page.bringToFront();
 const control=page.getByRole('button',{name:'Gameroom controls',exact:true});
 await expect(control).toBeVisible();await expect(control).toBeEnabled();
 await expect.poll(()=>control.evaluate(element=>{
  const box=element.getBoundingClientRect(),hit=document.elementFromPoint(box.x+box.width/2,box.y+box.height/2);
  return hit===element||element.contains(hit);
 })).toBe(true);
 const box=(await control.boundingBox())!;
 await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
 await expect(control).toHaveAttribute('aria-expanded','true');
}
export async function showRoom(page:Page){
 await openOverlayMenu(page);
 await page.getByRole('button',{name:'Return to room',exact:true}).click();
 await expect(page.getByRole('dialog')).not.toBeVisible();
}
export async function dismissGame(page:Page){
 await openOverlayMenu(page);
 await page.getByRole('button',{name:'Close game',exact:true}).click();
 await expect(page.locator('.game-window iframe')).toHaveCount(0);
}
export async function openRoom(page:Page,name:string){
 await page.goto('/',{waitUntil:'domcontentloaded'});await page.getByRole('textbox',{name:'Your name'}).fill(name);
 await page.getByRole('button',{name:'Create room'}).click();await expect(page.getByTestId('friend')).toHaveCount(1);return page.url();
}
export async function joinRoom(page:Page,url:string,name:string){
 await page.goto(url,{waitUntil:'domcontentloaded'});await page.getByRole('textbox',{name:'Your name'}).fill(name);await page.getByRole('button',{name:'Join room'}).click();await expect(page.getByTestId('friend')).toHaveCount(2);
}
export async function clickForGame(page:Page,button:string){await page.getByRole('button',{name:button,exact:true}).click();return inGame(page);}
