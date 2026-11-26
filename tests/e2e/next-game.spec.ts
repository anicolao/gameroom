import {test,expect} from '@playwright/test';
import {TestStepHelper} from './helpers/test-step-helper';
import {chromiumArgs} from './helpers/browser-options';
import {deterministicRoom,profile,openRoom,joinRoom,gameFrame,gameURL,inGame,showRoom} from './helpers/launch';
test.use({launchOptions:{args:chromiumArgs,ignoreDefaultArgs:[]}});
test('Different catalog games remain launchable after the first table',async({page,browser},info)=>{
 const host=process.env.FIRESTORE_EMULATOR_HOST??'127.0.0.1:8199',project='demo-gameroom-catalogue-e2e';
 if(!/^127\.0\.0\.1:\d+$/.test(host)||!project.startsWith('demo-'))throw new Error('Use a local demo catalog.');
 const documents=`http://${host}/v1/projects/${project}/databases/(default)/documents/Applications`;
 const headers={Authorization:'Bearer owner','Content-Type':'application/json'};
 const cantstop=await fetch(`${documents}/cantstop`,{method:'PATCH',headers,body:JSON.stringify({fields:{Title:{stringValue:"Can't Stop"},WebURL:{stringValue:'https://anicolao.github.io/cantstop/'},GameroomEnabled:{stringValue:'integrated'}}})});expect(cantstop.ok).toBe(true);
 const before=await (await fetch(`${documents}/jaipur`,{headers})).json() as {fields:{WebURL:{stringValue:string}}};
 async function setJaipur(url:string){const response=await fetch(`${documents}/jaipur?updateMask.fieldPaths=WebURL`,{method:'PATCH',headers,body:JSON.stringify({fields:{WebURL:{stringValue:url}}})});expect(response.ok).toBe(true);}
 async function select(title:string){const button=page.getByRole('button',{name:`Select ${title}`,exact:true});await button.focus();await button.press('Enter');await button.blur();await expect(page.getByTestId('cabinet')).toHaveAttribute('data-ready','true');}
 const story=new TestStepHelper(info,'NEXT-GAME'),context=await browser.newContext(profile);
 try{
  await deterministicRoom(page,1200);const friend=await context.newPage();await deterministicRoom(friend,1300);
  const room=await openRoom(page,'Alex');await joinRoom(friend,room,'Sam');await select('Cribbage');
  await expect(friend.getByTestId('cabinet')).toHaveAttribute('data-ready','true');
  await page.getByRole('button',{name:'Play Cribbage',exact:true}).click();
  const rooms=[[page,'Alex'],[friend,'Sam']] as const;
  for(const [view] of rooms){await inGame(view);await expect(gameFrame(view).locator('[data-player] h2')).toHaveText(['Alex','Sam']);}
  const first=(await gameURL(page)).searchParams.get('table');expect((await gameURL(friend)).searchParams.get('table')).toBe(first);
  for(const [view] of rooms)await showRoom(view);
  const external='https://games.example.test/second?keep=original';await setJaipur(external);await select('Jaipur');
  await expect(page.getByRole('button',{name:'Open Jaipur',exact:true})).toHaveAttribute('data-launch-url',external);
  const outbound=page.context().waitForEvent('request',r=>r.url()===external);
  await page.getByRole('button',{name:'Open Jaipur',exact:true}).click();expect((await outbound).url()).toBe(external);
  await expect(page.locator('.game-window iframe')).toHaveAttribute('src',external);await showRoom(page);
  for(const [view,name] of rooms)await story.step('other-url-game',view,name,'A URL-only selection opens without replacing the other player’s game',[{spec:'The old table remains available and no new tab was created',check:async()=>{await expect(view.getByRole('button',{name:'Open Cribbage',exact:true})).toBeVisible();expect(view.context().pages()).toHaveLength(1);if(view===page)await expect(view.getByRole('heading',{name:'Jaipur',exact:true})).toBeVisible();else expect((await gameURL(view)).searchParams.get('table')).toBe(first);}}]);
  await select("Can't Stop");
  await story.step('next-group-selection',page,'Alex','The next integrated game has its own Play action',[{spec:'The host’s current friend is included by default',check:async()=>{await expect(page.getByRole('heading',{name:"Can't Stop",exact:true})).toBeVisible();await expect(page.getByRole('button',{name:"Play Can't Stop",exact:true})).toBeEnabled();await expect(page.getByRole('checkbox',{name:'Sam',exact:true})).toBeChecked();}}]);
  await page.getByRole('button',{name:"Play Can't Stop",exact:true}).click();
  for(const [view] of rooms){await expect(view.locator('.game-window iframe')).toHaveAttribute('src',/4499/);await inGame(view,'4499');await expect(gameFrame(view).locator('.seat-list li')).toHaveCount(2);}
  // Reopen the committed two-seat state rather than capturing the guest's
  // transient one-seat paint. This also verifies the second launch's receipt.
  const second=(await gameURL(friend)).href;
  await friend.reload({waitUntil:'domcontentloaded'});await inGame(friend,'4499');
  expect((await gameURL(friend)).href).toBe(second);
  await expect(gameFrame(friend).locator('.seat-list li')).toHaveCount(2);
  for(const [view,name] of rooms)await story.step('next-different-game',view,name,'One Play action moves both profiles into the next game',[{spec:'Both profiles share a new Can’t Stop table and the old room table is closed',check:async()=>{expect((await gameURL(view)).searchParams.get('table')).not.toBe(first);await expect(gameFrame(view).locator('.seat-list li')).toHaveCount(2);expect(view.context().pages()).toHaveLength(1);await expect(view.locator('.table-row')).toHaveCount(1);}}],'lobby');
  expect((await gameURL(page)).searchParams.get('table')).toBe((await gameURL(friend)).searchParams.get('table'));
  story.finish();
 }finally{await context.close();await setJaipur(before.fields.WebURL.stringValue);await fetch(`${documents}/cantstop`,{method:'DELETE',headers});}
});
