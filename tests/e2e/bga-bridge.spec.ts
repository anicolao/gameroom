import {test,expect} from '@playwright/test';
import {bgaExtension,fixtureBga,message,approve,trustedOrigin} from './helpers/bga-extension';
test('BGA Boss bridge uses real external messaging, explicit approval and one managed tab across retries and worker restart',async()=>{
 const extension=await bgaExtension(),{context,id}=extension;
 try{
  await context.route(`${trustedOrigin}/**`,route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Bridge fixture</title><h1>Bridge fixture</h1>'+(new URL(route.request().url()).pathname==='/pr7/'?'<iframe src="/pr8/"></iframe>':'')}));
  await fixtureBga(context);
  const page=await context.newPage();await page.goto(trustedOrigin+'/pr7/');
  expect(await message(page,id,{version:1,method:'capabilities.get'})).toMatchObject({version:1,creation:'bga-ui'});
  await expect.poll(()=>page.frames().filter(f=>f.url().endsWith('/pr8/')).length).toBe(1);
  expect(await message(page.frames().find(f=>f.url().endsWith('/pr8/'))!,id,{version:1,method:'capabilities.get'})).toHaveProperty('error');
  const request={version:1,method:'tables.prepare',requestId:'12345678-0000-4000-8000-000000000000',gameId:'11',issuedAt:new Date().toISOString()};
  expect(await message(page,id,request)).toMatchObject({status:'needs_approval'});
  expect(context.pages().filter(p=>/^https:\/\/(?:en\.)?boardgamearena\.com\//.test(p.url()))).toHaveLength(0);
  expect(await message(page,id,{...request,gameId:'12'})).toHaveProperty('error');
  await approve(context,id,request.requestId);
  await expect.poll(()=>context.pages().filter(p=>/^https:\/\/(?:en\.)?boardgamearena\.com\//.test(p.url())).length).toBe(1);
  const bga=context.pages().find(p=>/^https:\/\/(?:en\.)?boardgamearena\.com\//.test(p.url()))!;
  await bga.goto('https://boardgamearena.com/gamepanel?game=cantstop');
  expect(await message(page,id,request)).toMatchObject({status:'waiting_for_table'});
  await bga.getByRole('link',{name:'Create fixture table'}).click();
  await expect.poll(()=>message(page,id,{version:1,method:'operations.get',requestId:request.requestId})).toMatchObject({status:'succeeded',result:{tableId:'12345678',url:'https://boardgamearena.com/table?table=12345678'}});
  await page.reload();expect(await message(page,id,request)).toMatchObject({status:'succeeded'});
  expect(context.pages().filter(p=>/^https:\/\/(?:en\.)?boardgamearena\.com\//.test(p.url()))).toHaveLength(1);
  // Terminate the actual service worker using CDP; Chrome wakes it for the next message.
  const cdp=await context.newCDPSession(page);await cdp.send('ServiceWorker.enable');
  await cdp.send('ServiceWorker.stopAllWorkers');await cdp.detach();
  expect(await message(page,id,{version:1,method:'operations.get',requestId:request.requestId})).toMatchObject({status:'succeeded'});
  const other=await context.newPage();await other.goto(trustedOrigin+'/pr7/');
  expect(await message(other,id,request)).toHaveProperty('error');
  const denied={...request,requestId:'23456789-0000-4000-8000-000000000000',issuedAt:new Date().toISOString()};
  await message(page,id,denied);await approve(context,id,denied.requestId,'Deny');expect(await message(page,id,denied)).toMatchObject({status:'cancelled'});
  const closed={...request,requestId:'34567890-0000-4000-8000-000000000000',issuedAt:new Date().toISOString()};
  await message(page,id,closed);await approve(context,id,closed.requestId);
  await expect.poll(()=>context.pages().filter(p=>p.url().includes('/gamepanel')).length).toBe(1);
  await context.pages().find(p=>p.url().includes('/gamepanel'))!.close();
  expect(await message(page,id,closed)).toMatchObject({status:'unknown'});
  expect(context.pages().filter(p=>/^https:\/\/(?:en\.)?boardgamearena\.com\//.test(p.url()))).toHaveLength(1);
  await page.goto(trustedOrigin+'/pr7/unapproved.html');expect(await message(page,id,{version:1,method:'capabilities.get'})).toHaveProperty('error');
 }finally{await extension.close();}
});
