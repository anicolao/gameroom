import {test,expect} from '@playwright/test';
import {TestStepHelper} from './helpers/test-step-helper';
import {chromiumArgs} from './helpers/browser-options';
import {deterministicRoom,profile,openRoom,joinRoom,gameFrame,gameURL,inGame,showRoom} from './helpers/launch';
test.use({launchOptions:{args:chromiumArgs,ignoreDefaultArgs:[]}});
test("Can't Stop launches independent seats in shared game frames",async({page,browser},info)=>{
 const host=process.env.FIRESTORE_EMULATOR_HOST??'127.0.0.1:8199',project='demo-gameroom-catalogue-e2e';
 if(!/^127\.0\.0\.1:\d+$/.test(host)||!project.startsWith('demo-'))throw new Error('Use a local demo catalog.');
 const target=`http://${host}/v1/projects/${project}/databases/(default)/documents/Applications/cantstop`;
 const seeded=await fetch(target,{method:'PATCH',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({fields:{Title:{stringValue:"Can't Stop"},WebURL:{stringValue:'https://anicolao.github.io/cantstop/'},GameroomEnabled:{stringValue:'integrated'}}})});expect(seeded.ok).toBe(true);
 const story=new TestStepHelper(info,'CANTSTOP-LAUNCH'),context=await browser.newContext(profile);let fixtureRoom='',previousJaipur='';
 const jaipur=`http://${host}/v1/projects/${project}/databases/(default)/documents/Applications/jaipur`;
 async function setJaipur(url:string){const response=await fetch(`${jaipur}?updateMask.fieldPaths=WebURL`,{method:'PATCH',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({fields:{WebURL:{stringValue:url}}})});expect(response.ok).toBe(true);}
 async function select(title:string){const button=page.getByRole('button',{name:`Select ${title}`,exact:true});await button.focus();await button.press('Enter');await button.blur();}
 try{
  await deterministicRoom(page,500);const friend=await context.newPage();await deterministicRoom(friend,600);
  const room=await openRoom(page,'Alex');fixtureRoom=new URL(room).searchParams.get('room')!;await joinRoom(friend,room,'Sam');
  for(const actor of [page,friend])await expect(actor.getByRole('heading',{name:"Can't Stop",exact:true})).toBeVisible();
  await page.getByRole('button',{name:"Play Can't Stop",exact:true}).click();
  const rooms=[[page,'Alex'],[friend,'Sam']] as const;
  for(const [view] of rooms){await inGame(view,'4499');await expect(gameFrame(view).locator('.seat-list li')).toHaveCount(2);}
  const code=(await gameURL(page)).searchParams.get('table');expect((await gameURL(friend)).searchParams.get('table')).toBe(code);
  for(const [view,name] of rooms)await story.step('cantstop-frame-lobby',view,name,'Both profiles automatically enter the same Can’t Stop table',[{spec:'There are two independently authenticated seats and no extra tabs',check:async()=>{await expect(gameFrame(view).locator('.seat-list li')).toHaveCount(2);expect(view.context().pages()).toHaveLength(1);}}],'lobby');
  await gameFrame(page).getByRole('button',{name:'Start game',exact:true}).click();
  for(const [view] of rooms){await expect(gameFrame(view).locator('[data-table-view]')).toHaveAttribute('data-motion-idle','true');await expect(gameFrame(view).locator('[data-ready]')).toHaveAttribute('data-ready','true');}
  const revision=await gameFrame(friend).locator('.game-shell').getAttribute('data-revision');await friend.reload();
  for(const [view,name] of rooms)await story.step('cantstop-frame-game',view,name,'Both game frames show the same playable Can’t Stop table',[{spec:'Reload retains the same seats and replay revision',check:async()=>{await expect(gameFrame(view).locator('.game-shell')).toHaveAttribute('data-revision',revision!);await expect(gameFrame(view).locator('[data-table-view]')).toHaveAttribute('data-phone','false');expect((await gameURL(view)).searchParams.get('table')).toBe(code);}}],true);
  for(const [view] of rooms)await showRoom(view);
  for(const [view,name] of rooms)await story.step('cantstop-frame-room',view,name,'The gathering stays mounted underneath the game',[{spec:'The original invitation, friends and reopen control remain available',check:async()=>{await expect(view).toHaveURL(room);await expect(view.getByRole('button',{name:"Open Can't Stop",exact:true})).toBeVisible();await expect(view.getByTestId('friend')).toHaveCount(2);expect(view.context().pages()).toHaveLength(1);}}]);
  // A previous integrated table must not replace the newly selected box's action.
  const before=await (await fetch(jaipur,{headers:{Authorization:'Bearer owner'}})).json() as {fields:{WebURL:{stringValue:string}}};previousJaipur=before.fields.WebURL.stringValue;
  const external='https://games.example.test/second?keep=original';await setJaipur(external);await select('Jaipur');
  await expect(page.getByRole('heading',{name:'Jaipur',exact:true})).toBeVisible();
  const outbound=page.context().waitForEvent('request',r=>r.url()===external);
  await page.getByRole('button',{name:'Open Jaipur',exact:true}).click();expect((await outbound).url()).toBe(external);
  await expect(page.locator('.game-window iframe')).toHaveAttribute('src',external);await showRoom(page);
  await story.step('other-url-game',page,'Alex','Another catalog game can open while the previous table remains available',[{spec:'The requested URL is exact and the other profile keeps its original table',check:async()=>{expect((await gameURL(friend)).searchParams.get('table')).toBe(code);await expect(page.getByRole('heading',{name:'Jaipur',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:"Open Can't Stop",exact:true})).toBeVisible();expect(page.context().pages()).toHaveLength(1);}}]);
  await select('Cribbage');
  await story.step('next-group-selection',page,'Alex','The host can choose the next integrated game with the same friends',[{spec:'Cribbage has its own Play action and the current friend is included',check:async()=>{await expect(page.getByRole('heading',{name:'Cribbage',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Play Cribbage',exact:true})).toBeEnabled();await expect(page.getByRole('checkbox',{name:'Sam',exact:true})).toBeChecked();}}]);
  await page.getByRole('button',{name:'Play Cribbage',exact:true}).click();
  for(const [view,name] of rooms)await story.step('next-different-game',view,name,'One Play action moves the group into a different integrated game',[{spec:'Both profiles reach one new Cribbage table without leftover room tables',check:async()=>{await inGame(view);await expect(gameFrame(view).locator('[data-player] h2')).toHaveText(['Alex','Sam']);expect((await gameURL(view)).searchParams.get('table')).not.toBe(code);expect(view.context().pages()).toHaveLength(1);await expect(view.locator('.table-row')).toHaveCount(1);}}],true);
  expect((await gameURL(page)).searchParams.get('table')).toBe((await gameURL(friend)).searchParams.get('table'));
  story.finish();
 }finally{
  await context.close();if(previousJaipur)await setJaipur(previousJaipur);await fetch(target,{method:'DELETE',headers:{Authorization:'Bearer owner'}});
  // Remove only this test's guarded demo room, including immutable child records.
  // Its deterministic code is reused by an older independent cabinet story.
  if(fixtureRoom){
   const base=`http://${host}/v1/projects/demo-gameroom-e2e/databases/(default)/documents/rooms/${fixtureRoom}`;
   for(const collection of ['events','commands']){
    const response=await fetch(`${base}/${collection}?pageSize=1000`,{headers:{Authorization:'Bearer owner'}});
    const records=await response.json() as {documents?:{name:string}[]};
    for(const record of records.documents??[])await fetch(`http://${host}/v1/${record.name}`,{method:'DELETE',headers:{Authorization:'Bearer owner'}});
   }
   await fetch(base,{method:'DELETE',headers:{Authorization:'Bearer owner'}});
  }
 }
});
