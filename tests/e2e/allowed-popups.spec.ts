import {test,expect,type BrowserContext} from '@playwright/test';
import {TestStepHelper} from './helpers/test-step-helper';
import {chromiumArgs} from './helpers/browser-options';
import {deterministicRoom,profile,inGame,openRoom,joinRoom} from './helpers/launch';
 // Restore Chromium's explicit popup allowance for this case. No window.open stub,
 // request interception, fake game, or fake Firebase implementation is involved.
 test.use({launchOptions:{args:chromiumArgs,ignoreDefaultArgs:[]}});
 test('three friends automatically open game tabs and racing guests seat once',async({page,browser},info)=>{
  const story=new TestStepHelper(info,'CONCURRENT-ARRIVALS');await deterministicRoom(page,100);
  const contexts=await Promise.all([0,1].map(()=>browser.newContext(profile)));
  try{
   const sam=await contexts[0].newPage(),lee=await contexts[1].newPage(),rooms=[[page,'Alex'],[sam,'Sam'],[lee,'Lee']] as const;
   const roomUrl=await openRoom(page,'Alex');await joinRoom(sam,roomUrl,'Sam');
   await lee.goto(roomUrl);await lee.getByRole('textbox',{name:'Your name'}).fill('Lee');await lee.getByRole('button',{name:'Join room'}).click();
   for(const [view,name] of rooms)await story.step('three-friends',view,name,'Three friends are included in the game by default',[{spec:'All three friends share one room',check:async()=>{await expect(view.getByTestId('friend')).toHaveCount(3);}}]);
   const referenceOrder=process.env.E2E_REFERENCE_SEAT_ORDER;let offline:BrowserContext|undefined;
   if(referenceOrder){expect(info.config.updateSnapshots).not.toBe('none');expect(['sam-lee','lee-sam']).toContain(referenceOrder);offline=referenceOrder==='sam-lee'?contexts[1]:contexts[0];await offline.setOffline(true);}
   const pending=rooms.map(([view])=>view.context()===offline?null:view.context().waitForEvent('page'));
   await page.getByRole('button',{name:'Play Cribbage',exact:true}).click();const host=await pending[0]!;await inGame(host);
   if(offline){const first=await pending[referenceOrder==='sam-lee'?1:2]!;await inGame(first);await expect(first.locator('[data-player]')).toHaveCount(2);pending[referenceOrder==='sam-lee'?2:1]=offline.waitForEvent('page');await offline.setOffline(false);}
   const gamePages=await Promise.all(pending.map(opened=>opened!));for(const view of gamePages){await inGame(view);await view.bringToFront();await expect(view.locator('[data-player]')).toHaveCount(3);}
   const table=new URL(host.url()).searchParams.get('table'),seatOrder=(await host.locator('[data-player] h2').allTextContents()).slice(1).map(name=>name.toLowerCase()).join('-');expect(['sam-lee','lee-sam']).toContain(seatOrder);
   for(let i=0;i<rooms.length;i++){
    const [room,name]=rooms[i],game=gamePages[i];
    await story.step(`room-open-${seatOrder}`,room,name,'Every gathering tab stays open with a reopen control',[{spec:'No guest click was needed and only one game tab opened per profile',check:async()=>{await expect(room).toHaveURL(roomUrl);await expect(room.getByRole('button',{name:'Open Cribbage',exact:true})).toBeVisible();await expect(room.getByTestId('game-tab-status')).not.toContainText('Your browser didn’t');expect(room.context().pages()).toHaveLength(2);}}]);
    await story.step(`auto-seats-${seatOrder}`,game,name,'One host click opens all three game tabs when popups are permitted',[{spec:'Each URL names the right player and shares the table',check:async()=>{expect(new URL(game.url()).searchParams.get('table')).toBe(table);expect(new URL(game.url()).searchParams.get('name')).toBe(name);await expect(game.locator('[data-player]')).toHaveCount(3);}}],true);
   }
   story.finish();
  }finally{await Promise.all(contexts.map(c=>c.close()));}
 });
