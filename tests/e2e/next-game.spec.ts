import {test,expect} from '@playwright/test';
import {TestStepHelper} from './helpers/test-step-helper';
import {chromiumArgs} from './helpers/browser-options';
import {deterministicRoom,profile,openRoom,joinRoom,gameFrame,gameURL,inGame,closeRoomGame,clickVisibleControl} from './helpers/launch';
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
 const story=new TestStepHelper(info,'NEXT-GAME'),context=await browser.newContext(profile),lateContext=await browser.newContext(profile);
 try{
  await deterministicRoom(page,1200);const friend=await context.newPage();await deterministicRoom(friend,1300);
  const room=await openRoom(page,'Alex');await joinRoom(friend,room,'Sam');await select('Cribbage');
  for(const view of [page,friend])await expect(view.getByTestId('friend')).toHaveCount(2);
  await page.getByRole('button',{name:'Play Cribbage',exact:true}).click();
  const rooms=[[page,'Alex'],[friend,'Sam']] as const;
  for(const [view] of rooms){await inGame(view);await expect(gameFrame(view).locator('[data-player] h2')).toHaveText(['Alex','Sam']);}
  const first=(await gameURL(page)).searchParams.get('table');expect((await gameURL(friend)).searchParams.get('table')).toBe(first);
  await closeRoomGame(friend,[page]);
  for(const [view,name] of rooms)await story.step('first-game-closed',view,name,'The room keeps one recent link after a shared close',[{spec:'Both profiles are back in the same room with no game frame',check:async()=>{await expect(view.locator('.game-window iframe')).toHaveCount(0);await expect(view.getByRole('button',{name:'Reopen Cribbage',exact:true})).toHaveCount(1);}}]);
  const external='https://games.example.test/second?keep=original';await setJaipur(external);await select('Jaipur');
  await expect(page.getByRole('button',{name:'Play Jaipur',exact:true})).toHaveAttribute('data-launch-url',external);
  const outbound=rooms.map(([view])=>view.context().waitForEvent('request',r=>r.url()===external));
  await page.getByRole('button',{name:'Play Jaipur',exact:true}).click();for(const request of await Promise.all(outbound))expect(request.url()).toBe(external);
  for(const [view] of rooms){await expect(view.locator('.game-window iframe')).toHaveAttribute('src',external);expect(view.context().pages()).toHaveLength(1);}
  await closeRoomGame(friend,[page]);
  for(const [view,name] of rooms)await story.step('other-url-game',view,name,'URL-only games open their exact address for everyone',[{spec:'Both room members keep the same saved link without invented joining parameters',check:async()=>{await expect(view.getByRole('button',{name:'Reopen Jaipur',exact:true})).toHaveCount(1);await expect(view.getByRole('button',{name:'Reopen Cribbage',exact:true})).toHaveCount(1);expect(view.context().pages()).toHaveLength(1);}}]);
  await select("Can't Stop");
  await story.step('next-group-selection',page,'Alex','The next game uses the whole room',[{spec:'The game has its own Play action with no player selection or table controls',check:async()=>{await expect(page.getByRole('heading',{name:"Can't Stop",exact:true})).toBeVisible();await expect(page.getByRole('button',{name:"Play Can't Stop",exact:true})).toBeEnabled();await expect(page.getByRole('checkbox')).toHaveCount(0);await expect(page.getByRole('heading',{name:'Tables',exact:true})).toHaveCount(0);}}]);
  await page.getByRole('button',{name:"Play Can't Stop",exact:true}).click();
  for(const [view] of rooms){await expect(view.locator('.game-window iframe')).toHaveAttribute('src',/4499/);await inGame(view,'4499');await expect(gameFrame(view).locator('.seat-list li')).toHaveCount(2);}
  const second=(await gameURL(friend)).href;
  await friend.reload({waitUntil:'domcontentloaded'});await inGame(friend,'4499');expect((await gameURL(friend)).href).toBe(second);await expect(gameFrame(friend).locator('.seat-list li')).toHaveCount(2);
  for(const [view,name] of rooms)await story.step('next-different-game',view,name,'One Play action opens the next game for both profiles',[{spec:'The guest reload restores the same two seats and a new game code',check:async()=>{expect((await gameURL(view)).searchParams.get('table')).not.toBe(first);await expect(gameFrame(view).locator('.seat-list li')).toHaveCount(2);expect(view.context().pages()).toHaveLength(1);}}],'lobby');
  const hostElement=await page.locator('.game-window iframe').elementHandle(),hostFrame=await hostElement!.contentFrame();await hostFrame!.evaluate(()=>{(window as unknown as {lateJoinMarker:string}).lateJoinMarker='same game window';});
  const lee=await lateContext.newPage();await deterministicRoom(lee,1400);await joinRoom(lee,room,'Lee',3);
  const all=[...rooms,[lee,'Lee'] as const];
  for(const [view,name] of all)await story.step('late-member',view,name,'A new room member joins the current game automatically',[{spec:'All three profiles share one game without restarting its existing windows',check:async()=>{await inGame(view,'4499');expect((await gameURL(view)).searchParams.get('table')).toBe((await gameURL(page)).searchParams.get('table'));await expect(gameFrame(view).locator('.seat-list li')).toHaveCount(3);if(view===page)expect(await hostFrame!.evaluate(()=>(window as unknown as {lateJoinMarker:string}).lateJoinMarker)).toBe('same game window');}}],'lobby');
  const urls=await Promise.all(all.map(([view])=>gameURL(view)));await closeRoomGame(lee,[page,friend]);
  for(const [view,name] of all)await story.step('late-member-close',view,name,'A late arrival can close the game for the entire room',[{spec:'The three recent links remain available with no ended-versus-resumable classification',check:async()=>{await expect(view.locator('.game-window iframe')).toHaveCount(0);await expect(view.locator('.recent-game strong')).toHaveText(["Can't Stop",'Jaipur','Cribbage']);}}]);
  await clickVisibleControl(lee,lee.getByRole('button',{name:"Reopen Can't Stop",exact:true}));
  for(const [i,[view,name]] of all.entries())await story.step('late-member-reopen',view,name,'Reopening a recent game restores its original URLs for everyone',[{spec:'The original creator stays the creator and every member returns to their existing seat',check:async()=>{await inGame(view,'4499');expect((await gameURL(view)).href).toBe(urls[i].href);await expect(gameFrame(view).locator('.seat-list li')).toHaveCount(3);await expect(view.locator('.recent-game')).toHaveCount(2);}}],'lobby');
  story.finish();
 }finally{await context.close();await lateContext.close();await setJaipur(before.fields.WebURL.stringValue);await fetch(`${documents}/cantstop`,{method:'DELETE',headers});}
});
