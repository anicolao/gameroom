import {test,expect} from '@playwright/test';
import {TestStepHelper} from './helpers/test-step-helper';
import {deterministicRoom,profile,openRoom,joinRoom,clickForGame,waitForInactive} from './helpers/launch';
test('native popup blocking offers a guest fallback and keeps the gathering alive',async({page,browser},info)=>{
 const story=new TestStepHelper(info,'GATHERING'),errors:string[]=[];
 await deterministicRoom(page);const guestContext=await browser.newContext(profile),guest=await guestContext.newPage();
 for(const view of [page,guest])view.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await story.step('welcome',page,'Alex','The cozy den opens with a browsable collection',[{spec:'The collection and room form are ready',check:async()=>{await expect(page.getByRole('button',{name:/Select /})).toHaveCount(4);}}]);
  const roomUrl=await openRoom(page,'Alex');await joinRoom(guest,roomUrl,'Sam');const rooms=[[page,'Alex'],[guest,'Sam']] as const;
  for(const [view,name] of rooms)await story.step('friends-arrive',view,name,'Friends are included in the next game by default',[{spec:'Both friends are present and selected',check:async()=>{await expect(view.getByTestId('friend')).toHaveCount(2);await expect(view.getByRole('checkbox',{name:name==='Alex'?'Sam':'Alex',exact:true})).toBeChecked();}}]);
  await page.evaluate(()=>{(window as unknown as {roomMarker:string}).roomMarker='still here';});
  await waitForInactive(guest);
  const hostGame=await clickForGame(page,'Play Cribbage');
  // Playwright normally disables the popup blocker. This suite explicitly removes
  // that browser flag: a background Firestore event is genuinely blocked here.
  await expect(guest.getByTestId('game-tab-status')).toContainText('Your browser didn’t open the game');
  for(const [view,name] of rooms)await story.step('room-stays',view,name,'Gameroom stays open while Cribbage uses another tab',[{spec:'The room remains on its invitation URL and offers a game button',check:async()=>{await expect(view).toHaveURL(roomUrl);await expect(view.getByRole('button',{name:'Open Cribbage',exact:true})).toBeVisible();}}]);
  expect(page.context().pages()).toHaveLength(2);expect(guestContext.pages()).toHaveLength(1);
  await story.step('host-waits',hostGame,'Alex','The host table opens directly from the Play click',[{spec:'The host name is populated without a game-side Join click',check:async()=>{await expect(hostGame.locator('[data-player] h2')).toHaveText(['Alex']);}}],true);
  await guest.reload({waitUntil:'domcontentloaded'});
  await expect(guest.getByTestId('game-tab-status')).toContainText('Your browser didn’t open the game');expect(guestContext.pages()).toHaveLength(1);
  const guestGame=await clickForGame(guest,'Open Cribbage');const games=[[hostGame,'Alex'],[guestGame,'Sam']] as const;
  const table=new URL(hostGame.url()).searchParams.get('table');
  for(const [view,name] of games)await story.step('seated',view,name,'The fallback click joins the same table with the URL name',[{spec:'Two players are seated with only Alex able to deal',check:async()=>{expect(new URL(view.url()).searchParams.get('table')).toBe(table);await expect(view.locator('[data-player] h2')).toHaveText(['Alex','Sam']);await expect(view.getByRole('button',{name:'Deal',exact:true})).toHaveCount(name==='Alex'?1:0);}}],true);
  // The document-local marker from before launch survives while games are open.
  for(const [view] of rooms)await view.getByRole('button',{name:'Room conversation',exact:true}).click();
  await guest.getByRole('textbox',{name:'Message',exact:true}).fill('Our room stays open while we play.');await guest.getByRole('button',{name:'Send message'}).click();
  for(const [view,name] of rooms)await story.step('chat-during-game',view,name,'Room chat continues with both game tabs open',[{spec:'The shared message arrives in both room profiles',check:async()=>{await expect(view.getByText('Our room stays open while we play.',{exact:true})).toBeVisible();await expect(view).toHaveURL(roomUrl);}}]);
  expect(await page.evaluate(()=>(window as unknown as {roomMarker:string}).roomMarker)).toBe('still here');
  await hostGame.evaluate(()=>{const original=crypto.randomUUID.bind(crypto);let first=true;Object.defineProperty(crypto,'randomUUID',{configurable:true,value:()=>{if(first){first=false;return 'gameroom-first-hand';}return original();}});});
  await hostGame.getByRole('button',{name:'Deal',exact:true}).click();
  for(const [view,name] of games)await story.step('first-hand',view,name,'The host deals a real two-player hand',[{spec:'Both hands have six cards and the other hand remains private',check:async()=>{await expect(view.locator('main')).toHaveAttribute('data-phase','discard');const other=view.getByRole('region',{name:`${name==='Alex'?'Sam':'Alex'}'s area`});await expect(other).toHaveAttribute('data-held','6');await expect(other.getByRole('list',{name:'Held cards'}).getByRole('listitem')).toHaveText(Array(6).fill('Face down'));}}],true);
  for(const [view] of rooms)await view.reload({waitUntil:'domcontentloaded'});
  for(const [view,name] of rooms)await story.step('no-duplicate',view,name,'Reload does not open duplicate game tabs',[{spec:'A manual reopen button remains available and no new tab was spawned',check:async()=>{await expect(view.getByRole('button',{name:'Open Cribbage',exact:true})).toBeVisible();expect(view.context().pages()).toHaveLength(2);await expect(view.getByTestId('game-tab-status')).not.toContainText('Your browser didn’t');}}]);
  // Closing a game needs no backlink or game-to-room message. Reopen remains usable.
  await guestGame.close();const reopened=await clickForGame(guest,'Open Cribbage');await expect(reopened.locator('[data-player]')).toHaveCount(2);await reopened.close();await hostGame.close();
  await Promise.all(rooms.map(([view])=>view.getByRole('button',{name:'Leave table',exact:true}).click()));
  for(const [view,name] of rooms)await story.step('left-table',view,name,'Friends leave the table directly from the persistent room',[{spec:'Both friends are by the shelves',check:async()=>{await expect(view.getByTestId('friend').locator('small')).toHaveText(['In room','In room']);}}]);
  await page.getByRole('button',{name:'Close table'}).click();
  for(const [view] of rooms)await expect(view.getByRole('button',{name:'Play Cribbage',exact:true})).toBeVisible();
  // Concurrent return retries can consume UUIDs in either profile. Give the next
  // visual table its own seed, independent of which return won the revision race.
  await page.evaluate(()=>sessionStorage.setItem('poc-sequence','300'));
  await waitForInactive(guest);
  const nextHost=await clickForGame(page,'Play Cribbage');await expect(guest.getByTestId('game-tab-status')).toContainText('Your browser didn’t open the game');
  const nextGuest=await clickForGame(guest,'Open Cribbage');const next=new URL(nextHost.url()).searchParams.get('table');expect(next).not.toBe(table);
  for(const [view,name] of [[nextHost,'Alex'],[nextGuest,'Sam']] as const)await story.step('next-game',view,name,'A later game opens a fresh shared table',[{spec:'Both profiles reach the same new table while their rooms remain open',check:async()=>{expect(new URL(view.url()).searchParams.get('table')).toBe(next);await expect(view.locator('[data-player]')).toHaveCount(2);}}],true);
  for(const [view] of rooms)await expect(view).toHaveURL(roomUrl);
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


test('two profiles with the same name use independent game tabs',async({page,browser},info)=>{
 const story=new TestStepHelper(info,'SAME-NAME-PROFILES');await deterministicRoom(page,200);
 const guestContext=await browser.newContext(profile),guest=await guestContext.newPage();
 try{
  const roomUrl=await openRoom(page,'Alex');await joinRoom(guest,roomUrl,'Alex');
  await waitForInactive(guest);
  const hostGame=await clickForGame(page,'Play Cribbage');await expect(guest.getByTestId('game-tab-status')).toContainText('Your browser didn’t');const guestGame=await clickForGame(guest,'Open Cribbage');
  const table=new URL(hostGame.url()).searchParams.get('table');
  for(const [view,name] of [[hostGame,'Host'],[guestGame,'Guest']] as const)await story.step('same-name-game',view,name,'Both Alex profiles have distinct seats in the same game',[{spec:'Two Alex seats exist and only the initiating profile can deal',check:async()=>{expect(new URL(view.url()).searchParams.get('table')).toBe(table);await expect(view.locator('[data-player] h2')).toHaveText(['Alex','Alex']);await expect(view.getByRole('button',{name:'Deal',exact:true})).toHaveCount(name==='Host'?1:0);}}],true);
  for(const [view,name] of [[page,'Host'],[guest,'Guest']] as const)await story.step('same-name-room',view,name,'Both original gathering tabs stay open',[{spec:'Two identities remain in the original room with one shared table',check:async()=>{await expect(view).toHaveURL(roomUrl);await expect(view.getByTestId('friend')).toHaveCount(2);await expect(view.getByRole('region',{name:'Room tables'}).locator('.table-row')).toHaveCount(1);}}]);
  story.finish();
 }finally{await guestContext.close();}
});
