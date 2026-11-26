import {test,expect,type BrowserContext} from '@playwright/test';
import {TestStepHelper} from './helpers/test-step-helper';
import {chromiumArgs} from './helpers/browser-options';
import {deterministicRoom,profile,inGame,openRoom,joinRoom,gameFrame,gameURL,showRoom} from './helpers/launch';
// Frame launches must also remain in one tab when popups are explicitly permitted.
test.use({launchOptions:{args:chromiumArgs,ignoreDefaultArgs:[]}});
test('three friends automatically open game frames and racing guests seat once',async({page,browser},info)=>{
 const story=new TestStepHelper(info,'CONCURRENT-ARRIVALS');await deterministicRoom(page,100);
 const contexts=await Promise.all([0,1,2].map(()=>browser.newContext(profile)));
 try{
  const sam=await contexts[0].newPage(),lee=await contexts[1].newPage(),observer=await contexts[2].newPage();
  const rooms=[[page,'Alex'],[sam,'Sam'],[lee,'Lee']] as const,all=[...rooms,[observer,'Observer'] as const];
  const roomUrl=await openRoom(page,'Alex');await joinRoom(sam,roomUrl,'Sam');
  for(const [view,name] of [[lee,'Lee'],[observer,'Observer']] as const){await view.goto(roomUrl);await view.getByRole('textbox',{name:'Your name'}).fill(name);await view.getByRole('button',{name:'Join room'}).click();}
  await page.getByRole('checkbox',{name:'Observer',exact:true}).uncheck();
  for(const [view,name] of all)await story.step('frame-friends',view,name,'The room includes friends and an explicitly excluded observer',[{spec:'All four profiles share the gathering',check:async()=>{await expect(view.getByTestId('friend')).toHaveCount(4);}}]);
  const referenceOrder=process.env.E2E_REFERENCE_SEAT_ORDER;let offline:BrowserContext|undefined;
  if(referenceOrder){expect(info.config.updateSnapshots).not.toBe('none');expect(['sam-lee','lee-sam']).toContain(referenceOrder);offline=referenceOrder==='sam-lee'?contexts[1]:contexts[0];await offline.setOffline(true);}
  await page.getByRole('button',{name:'Play Cribbage',exact:true}).click();await inGame(page);
  if(offline){const first=referenceOrder==='sam-lee'?sam:lee;await inGame(first);await expect(gameFrame(first).locator('[data-player]')).toHaveCount(2);await offline.setOffline(false);}
  for(const [view] of rooms){await inGame(view);await expect(gameFrame(view).locator('[data-player]')).toHaveCount(3);}
  const table=(await gameURL(page)).searchParams.get('table'),seatOrder=(await gameFrame(page).locator('[data-player] h2').allTextContents()).slice(1).map(name=>name.toLowerCase()).join('-');expect(['sam-lee','lee-sam']).toContain(seatOrder);
  for(const [view,name] of rooms)await story.step(`auto-frames-${seatOrder}`,view,name,'One host click opens three overlays with distinct game seats',[{spec:'Each selected profile shares the table without opening any tabs',check:async()=>{const url=await gameURL(view);expect(url.searchParams.get('table')).toBe(table);expect(url.searchParams.get('name')).toBe(name);await expect(gameFrame(view).locator('[data-player]')).toHaveCount(3);expect(view.context().pages()).toHaveLength(1);}}],true);
  await story.step(`excluded-frame-${seatOrder}`,observer,'Observer','The excluded profile stays in the room',[{spec:'Intended participation excludes the observer from game launch',check:async()=>{await expect(observer.locator('.game-window iframe')).toHaveCount(0);expect(observer.context().pages()).toHaveLength(1);await expect(observer).toHaveURL(roomUrl);}}]);
  for(const [view] of rooms)await showRoom(view);
  await page.getByRole('button',{name:'Close table',exact:true}).click();
  for(const [view,name] of all)await story.step(`closed-frames-${seatOrder}`,view,name,'Closing the table clears every selected frame',[{spec:'All four friends remain gathered with no game frames or extra tabs',check:async()=>{await expect(view.locator('.game-window iframe')).toHaveCount(0);await expect(view.getByTestId('friend').locator('small')).toHaveText(['In room','In room','In room','In room']);expect(view.context().pages()).toHaveLength(1);}}]);
  story.finish();
 }finally{await Promise.all(contexts.map(c=>c.close()));}
});
