import {test,expect,type BrowserContext} from '@playwright/test';
import {TestStepHelper} from './helpers/test-step-helper';
import {chromiumArgs} from './helpers/browser-options';
import {deterministicRoom,profile,inGame,openRoom,joinRoom,gameFrame,gameURL,closeRoomGame} from './helpers/launch';
// Frame launches must also remain in one tab when popups are explicitly permitted.
test.use({launchOptions:{args:chromiumArgs,ignoreDefaultArgs:[]}});
test('three friends automatically open game frames and racing guests seat once',async({page,browser},info)=>{
 const story=new TestStepHelper(info,'CONCURRENT-ARRIVALS');await deterministicRoom(page,100);
 const contexts=await Promise.all([0,1].map(()=>browser.newContext(profile)));
 try{
  const sam=await contexts[0].newPage(),lee=await contexts[1].newPage();
  const rooms=[[page,'Alex'],[sam,'Sam'],[lee,'Lee']] as const;
  const roomUrl=await openRoom(page,'Alex');await joinRoom(sam,roomUrl,'Sam');
  await joinRoom(lee,roomUrl,'Lee',3);
  for(const [view,name] of rooms)await story.step('room-friends',view,name,'Every room member is included in the shared game',[{spec:'Three profiles share one room without player selection controls',check:async()=>{await expect(view.getByTestId('friend')).toHaveCount(3);await expect(view.getByRole('checkbox')).toHaveCount(0);}}]);
  const referenceOrder=process.env.E2E_REFERENCE_SEAT_ORDER;let offline:BrowserContext|undefined;
  if(referenceOrder){expect(info.config.updateSnapshots).not.toBe('none');expect(['sam-lee','lee-sam']).toContain(referenceOrder);offline=referenceOrder==='sam-lee'?contexts[1]:contexts[0];await offline.setOffline(true);}
  await page.getByRole('button',{name:'Play Cribbage',exact:true}).click();await inGame(page);
  if(offline){const first=referenceOrder==='sam-lee'?sam:lee;await inGame(first);await expect(gameFrame(first).locator('[data-player]')).toHaveCount(2);await offline.setOffline(false);}
  for(const [view] of rooms){await inGame(view);await expect(gameFrame(view).locator('[data-player]')).toHaveCount(3);}
  const table=(await gameURL(page)).searchParams.get('table'),seatOrder=(await gameFrame(page).locator('[data-player] h2').allTextContents()).slice(1).map(name=>name.toLowerCase()).join('-');expect(['sam-lee','lee-sam']).toContain(seatOrder);
  for(const [view,name] of rooms)await story.step(`auto-frames-${seatOrder}`,view,name,'One host click opens three overlays with distinct game seats',[{spec:'Every room member shares the table without opening any tabs',check:async()=>{const url=await gameURL(view);expect(url.searchParams.get('table')).toBe(table);expect(url.searchParams.get('name')).toBe(name);await expect(gameFrame(view).locator('[data-player]')).toHaveCount(3);expect(view.context().pages()).toHaveLength(1);}}],true);
  await closeRoomGame(sam,[page,lee]);
  for(const [view,name] of rooms)await story.step(`shared-close-${seatOrder}`,view,name,'One member closes the shared game for the whole room',[{spec:'Every profile returns to the same recent game link with no extra tabs',check:async()=>{await expect(view.locator('.game-window iframe')).toHaveCount(0);await expect(view.getByRole('button',{name:'Reopen Cribbage',exact:true})).toHaveCount(1);expect(view.context().pages()).toHaveLength(1);}}]);
  story.finish();
 }finally{await Promise.all(contexts.map(c=>c.close()));}
});
