import {test,expect} from '@playwright/test';
import {TestStepHelper} from './helpers/test-step-helper';
import {deterministicRoom,profile,openRoom,joinRoom,clickForGame,waitForInactive,gameFrame,gameURL,inGame,closeRoomGame,clickVisibleControl} from './helpers/launch';
test('one shared game closes and reopens for everyone while the gathering persists',async({page,browser},info)=>{
 const story=new TestStepHelper(info,'GATHERING'),errors:string[]=[];
 await deterministicRoom(page);const guestContext=await browser.newContext(profile),guest=await guestContext.newPage();
 for(const view of [page,guest])view.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await story.step('welcome',page,'Alex','The cozy den opens with a browsable collection',[{spec:'The collection and room form are ready',check:async()=>{await expect(page.getByRole('button',{name:/Select /})).toHaveCount(4);}}]);
  const roomUrl=await openRoom(page,'Alex');await joinRoom(guest,roomUrl,'Sam');const rooms=[[page,'Alex'],[guest,'Sam']] as const;
  for(const [view,name] of rooms)await story.step('friends-arrive',view,name,'The whole room plays together',[{spec:'Both members are present with no player-selection controls',check:async()=>{await expect(view.getByTestId('friend')).toHaveCount(2);await expect(view.getByRole('checkbox')).toHaveCount(0);}}]);
  await page.evaluate(()=>{(window as unknown as {roomMarker:string}).roomMarker='still here';});
  await waitForInactive(guest);await clickForGame(page,'Play Cribbage');await inGame(guest);
  const firstUrls=await Promise.all(rooms.map(([view])=>gameURL(view))),code=firstUrls[0].searchParams.get('table');
  for(const [view,name] of rooms)await story.step('frame-seated',view,name,'One Play action opens the same game for both members',[{spec:'URL-named seats share one game and only its original creator can deal',check:async()=>{expect((await gameURL(view)).searchParams.get('table')).toBe(code);await expect(gameFrame(view).locator('[data-player] h2')).toHaveText(['Alex','Sam']);await expect(gameFrame(view).getByRole('button',{name:'Deal',exact:true})).toHaveCount(name==='Alex'?1:0);expect(view.context().pages()).toHaveLength(1);}}],true);
  const element=await guest.locator('.game-window iframe').elementHandle(),child=await element!.contentFrame();await child!.evaluate(()=>window.close());
  await guest.evaluate(()=>window.postMessage({type:'gameroom:close',version:1},location.origin));await expect(guest.getByRole('dialog')).toBeVisible();
  await closeRoomGame(guest,[page]);
  for(const [view,name] of rooms)await story.step('shared-close',view,name,'The guest closes the game for the entire room',[{spec:'Both members return to one recent game link',check:async()=>{await expect(view.locator('.game-window iframe')).toHaveCount(0);await expect(view.getByRole('button',{name:'Reopen Cribbage',exact:true})).toHaveCount(1);}}]);
  expect(await page.evaluate(()=>(window as unknown as {roomMarker:string}).roomMarker)).toBe('still here');
  for(const [view] of rooms)await clickVisibleControl(view,view.getByRole('button',{name:'Room conversation',exact:true}));
  await guest.getByRole('textbox',{name:'Message',exact:true}).fill('Same room, next game.');await clickVisibleControl(guest,guest.getByRole('button',{name:'Send message'}));
  for(const [view,name] of rooms)await story.step('room-chat',view,name,'Chat belongs to the persistent room',[{spec:'The message and recent game are shared without reopening a game',check:async()=>{await expect(view.getByText('Same room, next game.',{exact:true})).toBeVisible();await expect(view.locator('.game-window iframe')).toHaveCount(0);}}]);
  for(const [view] of rooms)await clickVisibleControl(view,view.getByRole('button',{name:'Close conversation'}));
  await clickVisibleControl(guest,guest.getByRole('button',{name:'Reopen Cribbage',exact:true}));
  for(const [i,[view,name]] of rooms.entries())await story.step('game-reopened',view,name,'A recent game reopens its original URL for everyone',[{spec:'The same two seats return to the same game code with no extra tabs',check:async()=>{await inGame(view);expect((await gameURL(view)).href).toBe(firstUrls[i].href);await expect(gameFrame(view).locator('[data-player]')).toHaveCount(2);}}],true);
  const hostElement=await page.locator('.game-window iframe').elementHandle(),hostChild=await hostElement!.contentFrame();
  await hostChild!.evaluate(()=>{const original=crypto.randomUUID.bind(crypto);let first=true;Object.defineProperty(crypto,'randomUUID',{configurable:true,value:()=>{if(first){first=false;return 'gameroom-first-hand';}return original();}});});
  await gameFrame(page).getByRole('button',{name:'Deal',exact:true}).click();
  for(const [view,name] of rooms)await story.step('frame-hand',view,name,'The reopened game can deal a real private hand',[{spec:'The other hand has six face-down cards',check:async()=>{await expect(gameFrame(view).locator('main')).toHaveAttribute('data-phase','discard');const other=gameFrame(view).getByRole('region',{name:`${name==='Alex'?'Sam':'Alex'}'s area`});await expect(other).toHaveAttribute('data-held','6');await expect(other.getByRole('list',{name:'Held cards'}).getByRole('listitem')).toHaveText(Array(6).fill('Face down'));}}],true);
  for(const [view] of rooms)await view.reload({waitUntil:'domcontentloaded'});
  for(const [i,[view,name]] of rooms.entries())await story.step('frame-reload',view,name,'Reload follows the room’s current game',[{spec:'The original URLs, seats and dealt hand survive',check:async()=>{await inGame(view);expect((await gameURL(view)).href).toBe(firstUrls[i].href);await expect(gameFrame(view).locator('[data-player]')).toHaveCount(2);await expect(gameFrame(view).locator('main')).toHaveAttribute('data-phase','discard');}}],true);
  const reopened=await guest.locator('.game-window iframe').elementHandle(),reopenedChild=await reopened!.contentFrame();await reopenedChild!.evaluate(origin=>window.parent.postMessage({type:'gameroom:close',version:1},origin),new URL(roomUrl).origin);
  for(const [view] of rooms)await expect(view.locator('.game-window iframe')).toHaveCount(0);
  await guest.reload({waitUntil:'domcontentloaded'});
  for(const [view,name] of rooms)await story.step('closed-game-reload',view,name,'A shared close stays closed after reload',[{spec:'The game remains a recent link without a finished-versus-resumable status',check:async()=>{await expect(view.locator('.game-window iframe')).toHaveCount(0);await expect(view.getByRole('button',{name:'Reopen Cribbage',exact:true})).toHaveCount(1);await expect(view.getByTestId('friend').locator('small')).toHaveText(['In room','In room']);}}]);
  await page.evaluate(()=>sessionStorage.setItem('poc-sequence','300'));await clickForGame(page,'Play Cribbage');await inGame(guest);
  for(const [view,name] of rooms)await story.step('new-room-game',view,name,'The bookshelf starts a new game for the same room',[{spec:'A fresh game code opens for both profiles and the previous game stays in history',check:async()=>{expect((await gameURL(view)).searchParams.get('table')).not.toBe(code);await expect(gameFrame(view).locator('[data-player]')).toHaveCount(2);expect(view.context().pages()).toHaveLength(1);await expect(view.locator('.recent-game')).toHaveCount(1);}}],true);
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
 await page.getByRole('textbox',{name:'Search games'}).fill('');await page.getByRole('button',{name:'Shared sessions'}).click();
 await story.step('mobile-ready',page,'Visitor','The playable filter shows only the integrated game',[{spec:'Cribbage is the one game ready to launch',check:async()=>{await expect(page.getByRole('button',{name:/Select /})).toHaveCount(1);}}],false,true);story.finish();
});

test('two profiles with the same name use independent game frames',async({page,browser},info)=>{
 const story=new TestStepHelper(info,'SAME-NAME-PROFILES');await deterministicRoom(page,200);
 const guestContext=await browser.newContext(profile),guest=await guestContext.newPage();
 try{
  const roomUrl=await openRoom(page,'Alex');await joinRoom(guest,roomUrl,'Alex');
  for(const view of [page,guest])await expect(view.getByTestId('friend')).toHaveCount(2);
  await waitForInactive(guest);await clickForGame(page,'Play Cribbage');await inGame(guest);
  const table=(await gameURL(page)).searchParams.get('table');
  for(const [view,name] of [[page,'Host'],[guest,'Guest']] as const)await story.step('same-name-frame',view,name,'Both Alex profiles keep distinct seats in one game',[{spec:'Two Alex seats exist and only the initiating profile can deal',check:async()=>{expect((await gameURL(view)).searchParams.get('table')).toBe(table);await expect(gameFrame(view).locator('[data-player] h2')).toHaveText(['Alex','Alex']);await expect(gameFrame(view).getByRole('button',{name:'Deal',exact:true})).toHaveCount(name==='Host'?1:0);expect(view.context().pages()).toHaveLength(1);}}],true);
  await closeRoomGame(guest,[page]);
  for(const [view,name] of [[page,'Host'],[guest,'Guest']] as const)await story.step('same-name-room-frame',view,name,'The gathering keeps both independent identities',[{spec:'Two identities remain in the room with one shared table',check:async()=>{await expect(view).toHaveURL(roomUrl);await expect(view.getByTestId('friend')).toHaveCount(2);await expect(view.getByRole('button',{name:'Reopen Cribbage',exact:true})).toHaveCount(1);}}]);
  story.finish();
 }finally{await guestContext.close();}
});
