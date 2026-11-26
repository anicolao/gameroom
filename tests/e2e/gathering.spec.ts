import {test,expect} from '@playwright/test';
import {TestStepHelper} from './helpers/test-step-helper';
import {deterministicRoom,profile,openRoom,joinRoom,clickForGame,waitForInactive,gameFrame,gameURL,inGame,showRoom,dismissGame} from './helpers/launch';
test('shared frames launch without guest activation and keep the gathering alive',async({page,browser},info)=>{
 const story=new TestStepHelper(info,'GATHERING'),errors:string[]=[];
 await deterministicRoom(page);const guestContext=await browser.newContext(profile),guest=await guestContext.newPage();
 for(const view of [page,guest])view.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await story.step('welcome',page,'Alex','The cozy den opens with a browsable collection',[{spec:'The collection and room form are ready',check:async()=>{await expect(page.getByRole('button',{name:/Select /})).toHaveCount(4);}}]);
  const roomUrl=await openRoom(page,'Alex');await joinRoom(guest,roomUrl,'Sam');const rooms=[[page,'Alex'],[guest,'Sam']] as const;
  for(const [view,name] of rooms)await story.step('friends-arrive',view,name,'Friends are included in the next game by default',[{spec:'Both friends are present and selected',check:async()=>{await expect(view.getByTestId('friend')).toHaveCount(2);await expect(view.getByRole('checkbox',{name:name==='Alex'?'Sam':'Alex',exact:true})).toBeChecked();}}]);
  await page.evaluate(()=>{(window as unknown as {roomMarker:string}).roomMarker='still here';});
  await waitForInactive(guest);await clickForGame(page,'Play Cribbage');await inGame(guest);
  const table=(await gameURL(page)).searchParams.get('table');
  for(const [view,name] of rooms)await story.step('frame-seated',view,name,'One Play action opens both game overlays without popups',[{spec:'Both URL-named seats share one table and only the host can deal',check:async()=>{expect((await gameURL(view)).searchParams.get('table')).toBe(table);await expect(gameFrame(view).locator('[data-player] h2')).toHaveText(['Alex','Sam']);await expect(gameFrame(view).getByRole('button',{name:'Deal',exact:true})).toHaveCount(name==='Alex'?1:0);expect(view.context().pages()).toHaveLength(1);await expect(view).toHaveURL(roomUrl);}}],true);
  // The game cannot remove its frame with window.close or an untrusted message.
  const element=await guest.locator('.game-window iframe').elementHandle(),child=await element!.contentFrame();await child!.evaluate(()=>window.close());
  await guest.evaluate(()=>window.postMessage({type:'gameroom:close',version:1},location.origin));await expect(guest.getByRole('dialog')).toBeVisible();
  for(const [view] of rooms){await showRoom(view);await view.getByRole('button',{name:'Room conversation',exact:true}).click();}
  await guest.getByRole('textbox',{name:'Message',exact:true}).fill('Our room stays open while we play.');await guest.getByRole('button',{name:'Send message'}).click();
  for(const [view,name] of rooms)await story.step('frame-chat',view,name,'Room chat continues while the game is hidden',[{spec:'Messages arrive without reopening or unloading either frame',check:async()=>{await expect(view.getByText('Our room stays open while we play.',{exact:true})).toBeVisible();await expect(view.locator('.game-window iframe')).toHaveCount(1);await expect(view.getByRole('dialog')).not.toBeVisible();}}]);
  expect(await page.evaluate(()=>(window as unknown as {roomMarker:string}).roomMarker)).toBe('still here');
  for(const [view] of rooms)await clickForGame(view,'Open Cribbage');
  const hostElement=await page.locator('.game-window iframe').elementHandle(),hostChild=await hostElement!.contentFrame();
  await hostChild!.evaluate(()=>{const original=crypto.randomUUID.bind(crypto);let first=true;Object.defineProperty(crypto,'randomUUID',{configurable:true,value:()=>{if(first){first=false;return 'gameroom-first-hand';}return original();}});});
  await gameFrame(page).getByRole('button',{name:'Deal',exact:true}).click();
  for(const [view,name] of rooms)await story.step('frame-hand',view,name,'The host deals a real private two-player hand',[{spec:'The other hand has six face-down cards',check:async()=>{await expect(gameFrame(view).locator('main')).toHaveAttribute('data-phase','discard');const other=gameFrame(view).getByRole('region',{name:`${name==='Alex'?'Sam':'Alex'}'s area`});await expect(other).toHaveAttribute('data-held','6');await expect(other.getByRole('list',{name:'Held cards'}).getByRole('listitem')).toHaveText(Array(6).fill('Face down'));}}],true);
  for(const [view] of rooms)await view.reload({waitUntil:'domcontentloaded'});
  for(const [view,name] of rooms)await story.step('frame-reload',view,name,'Reload restores one overlay and the existing game',[{spec:'The same two seats and dealt hand survive without extra tabs',check:async()=>{await inGame(view);await expect(gameFrame(view).locator('[data-player]')).toHaveCount(2);await expect(gameFrame(view).locator('main')).toHaveAttribute('data-phase','discard');}}],true);
  await dismissGame(guest);await guest.reload({waitUntil:'domcontentloaded'});await expect(guest.locator('.game-window iframe')).toHaveCount(0);await clickForGame(guest,'Open Cribbage');await expect(gameFrame(guest).locator('[data-player]')).toHaveCount(2);
  // A validated game-origin request dismisses locally without leaving the table.
  const reopened=await guest.locator('.game-window iframe').elementHandle(),reopenedChild=await reopened!.contentFrame();await reopenedChild!.evaluate(origin=>window.parent.postMessage({type:'gameroom:close',version:1},origin),new URL(roomUrl).origin);await expect(guest.locator('.game-window iframe')).toHaveCount(0);
  await showRoom(page);for(const [view] of rooms)await expect(view.getByRole('button',{name:'Leave table',exact:true})).toBeVisible();
  await Promise.all(rooms.map(([view])=>view.getByRole('button',{name:'Leave table',exact:true}).click()));
  for(const [view,name] of rooms)await story.step('frame-left',view,name,'Friends leave the table from the persistent room',[{spec:'Both return to the shelves and their game frames are cleared',check:async()=>{await expect(view.getByTestId('friend').locator('small')).toHaveText(['In room','In room']);await expect(view.locator('.game-window iframe')).toHaveCount(0);}}]);
  await page.getByRole('button',{name:'Close table'}).click();await page.evaluate(()=>sessionStorage.setItem('poc-sequence','300'));await waitForInactive(guest);await clickForGame(page,'Play Cribbage');await inGame(guest);
  const next=(await gameURL(page)).searchParams.get('table');expect(next).not.toBe(table);
  for(const [view,name] of rooms)await story.step('frame-next',view,name,'A later launch opens a fresh shared game automatically',[{spec:'Closed receipts from the previous table do not block the new table',check:async()=>{expect((await gameURL(view)).searchParams.get('table')).toBe(next);await expect(gameFrame(view).locator('[data-player]')).toHaveCount(2);expect(view.context().pages()).toHaveLength(1);}}],true);
  expect(errors).toEqual([]);story.finish();
 }finally{await guestContext.close();}
});
test('mobile shelves support filtering and a small collection',async({page},info)=>{
 const story=new TestStepHelper(info,'MOBILE');await page.setViewportSize({width:390,height:844});await page.goto('/',{waitUntil:'domcontentloaded'});
 await story.step('mobile-welcome',page,'Visitor','The den adapts to a phone',[{spec:'The gathering form and four selectable game boxes fit without horizontal scrolling',check:async()=>{await expect(page.getByRole('button',{name:/Select /})).toHaveCount(4);}}],false,true);
 await page.getByRole('textbox',{name:'Search games'}).fill('crib');
 await story.step('mobile-search',page,'Visitor','Search leaves one full-size game on the shelf',[{spec:'Cribbage remains selectable and other boxes are filtered out',check:async()=>{await expect(page.getByRole('button',{name:/Select /})).toHaveCount(1);}}],false,true);
 await page.getByRole('textbox',{name:'Search games'}).fill('no such game');
 await story.step('mobile-empty',page,'Visitor','An empty search has a clear way back',[{spec:'The shelf explains that there are no matching games',check:async()=>{await expect(page.getByText('No matching games')).toBeVisible();}}],false,true);
 await page.getByRole('textbox',{name:'Search games'}).fill('');await page.getByRole('button',{name:'Group launch'}).click();
 await story.step('mobile-ready',page,'Visitor','The playable filter shows only the integrated game',[{spec:'Cribbage is the one game ready to launch',check:async()=>{await expect(page.getByRole('button',{name:/Select /})).toHaveCount(1);}}],false,true);story.finish();
});

test('two profiles with the same name use independent game frames',async({page,browser},info)=>{
 const story=new TestStepHelper(info,'SAME-NAME-PROFILES');await deterministicRoom(page,200);
 const guestContext=await browser.newContext(profile),guest=await guestContext.newPage();
 try{
  const roomUrl=await openRoom(page,'Alex');await joinRoom(guest,roomUrl,'Alex');await waitForInactive(guest);await clickForGame(page,'Play Cribbage');await inGame(guest);
  const table=(await gameURL(page)).searchParams.get('table');
  for(const [view,name] of [[page,'Host'],[guest,'Guest']] as const)await story.step('same-name-frame',view,name,'Both Alex profiles keep distinct seats in one game',[{spec:'Two Alex seats exist and only the initiating profile can deal',check:async()=>{expect((await gameURL(view)).searchParams.get('table')).toBe(table);await expect(gameFrame(view).locator('[data-player] h2')).toHaveText(['Alex','Alex']);await expect(gameFrame(view).getByRole('button',{name:'Deal',exact:true})).toHaveCount(name==='Host'?1:0);expect(view.context().pages()).toHaveLength(1);}}],true);
  for(const view of [page,guest])await showRoom(view);
  for(const [view,name] of [[page,'Host'],[guest,'Guest']] as const)await story.step('same-name-room-frame',view,name,'The gathering keeps both independent identities',[{spec:'Two identities remain in the room with one shared table',check:async()=>{await expect(view).toHaveURL(roomUrl);await expect(view.getByTestId('friend')).toHaveCount(2);await expect(view.getByRole('region',{name:'Room tables'}).locator('.table-row')).toHaveCount(1);}}]);
  story.finish();
 }finally{await guestContext.close();}
});
