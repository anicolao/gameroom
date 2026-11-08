import {chromium,expect,type BrowserContext,type Page,type Frame} from '@playwright/test';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {chromiumArgs} from './browser-options';
export const trustedOrigin='https://gameroom.boardgamescafe.org';
export async function bgaExtension(){
 const folder=await mkdtemp(join(tmpdir(),'gameroom-bga-extension-')),extension=resolve('extension/bga-boss');
 const context=await chromium.launchPersistentContext(folder,{channel:'chromium',headless:true,viewport:{width:1180,height:820},deviceScaleFactor:1,locale:'en-CA',timezoneId:'America/Toronto',args:[...chromiumArgs.filter(arg=>!arg.startsWith('--host-resolver-rules')),"--host-resolver-rules=MAP boardgamearena.com ~NOTFOUND, MAP en.boardgamearena.com ~NOTFOUND, MAP gameroom.test 127.0.0.1",`--disable-extensions-except=${extension}`,`--load-extension=${extension}`],ignoreDefaultArgs:['--disable-popup-blocking']});
 const worker=context.serviceWorkers()[0]??await context.waitForEvent('serviceworker');
 const id=new URL(worker.url()).hostname;
 return {context,id,worker,async close(){await context.close();await rm(folder,{recursive:true,force:true});}};
}
export async function fixtureBga(context:BrowserContext){
 await context.route(/^https:\/\/(?:en\.)?boardgamearena\.com\//,route=>{
  const url=new URL(route.request().url());
  return route.fulfill({contentType:'text/html',body:`<!doctype html><title>BGA fixture (not live BGA)</title><h1>BGA fixture</h1>${url.pathname==='/table'?'<p>Fixture table 12345678</p>':'<a href="/table?table=12345678">Create fixture table</a>'}`});
 });
}
export async function message(page:Page|Frame,id:string,request:unknown){
 return page.evaluate(({id,request})=>new Promise<unknown>((resolve,reject)=>{
  const runtime=(window as unknown as {chrome:{runtime:{lastError?:{message:string};sendMessage:(id:string,request:unknown,reply:(response:unknown)=>void)=>void}}}).chrome.runtime;
  runtime.sendMessage(id,request,response=>runtime.lastError?reject(Error(runtime.lastError.message)):resolve(response));
 }),{id,request});
}
export async function approve(context:BrowserContext,id:string,requestId:string,action='Open BGA to create table'){
 const page=await context.newPage();await page.goto(`chrome-extension://${id}/approve.html?request=${requestId}`);await page.getByRole('button',{name:action,exact:true}).click();await expect(page.getByRole('status')).not.toBeEmpty();return page;
}
