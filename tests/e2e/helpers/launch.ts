import {expect,type Page} from '@playwright/test';
export async function deterministicRoom(page:Page,start=0){
 await page.addInitScript((start)=>{
  Object.defineProperty(crypto,'randomUUID',{configurable:true,value:()=>{const n=Number(sessionStorage.getItem('poc-sequence')??start)+1;sessionStorage.setItem('poc-sequence',String(n));return `${n.toString(16).padStart(8,'0')}-0000-4000-8000-000000000000`;}});
 },start);
}
export const friend=(page:Page,name:string)=>page.getByTestId('friend').filter({hasText:name});
export const profile={baseURL:'http://127.0.0.1:4199',viewport:{width:1180,height:820},deviceScaleFactor:1,locale:'en-CA',timezoneId:'America/Toronto'};
export async function waitForInactive(page:Page){
 // Playwright's page.evaluate passes userGesture:true, so polling with it would
 // continually refresh the very browser activation we need to let expire.
 const session=await page.context().newCDPSession(page);
 try{await expect.poll(async()=>{
  const result=await session.send('Runtime.evaluate',{expression:'navigator.userActivation.isActive',returnByValue:true,userGesture:false});
  return result.result.value;
 }).toBe(false);}finally{await session.detach();}
}
export async function inGame(page:Page){
 await expect(page).toHaveURL(/127\.0\.0\.1:4197\/\?table=/);
 await expect(page.locator('main')).toHaveAttribute('data-connected','true');
 expect(await page.evaluate(()=>window.opener===null)).toBe(true);
 expect(new URL(page.url()).searchParams.has('returnTo')).toBe(false);
 await expect(page.getByRole('link',{name:'Back to gameroom'})).toHaveCount(0);
}
export async function openRoom(page:Page,name:string){
 await page.goto('/',{waitUntil:'domcontentloaded'});await page.getByRole('textbox',{name:'Your name'}).fill(name);
 await page.getByRole('button',{name:'Create room'}).click();await expect(page.getByTestId('friend')).toHaveCount(1);return page.url();
}
export async function joinRoom(page:Page,url:string,name:string){
 await page.goto(url,{waitUntil:'domcontentloaded'});await page.getByRole('textbox',{name:'Your name'}).fill(name);await page.getByRole('button',{name:'Join room'}).click();await expect(page.getByTestId('friend')).toHaveCount(2);
}
export async function clickForGame(page:Page,button:string){
 const opened=page.context().waitForEvent('page');await page.getByRole('button',{name:button,exact:true}).click();
 const game=await opened;await inGame(game);return game;
}

