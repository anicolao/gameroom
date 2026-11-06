import {test,expect} from '@playwright/test';
import {TestStepHelper} from './helpers/test-step-helper';
import {chromiumArgs} from './helpers/browser-options';
import {deterministicRoom,profile,openRoom,joinRoom} from './helpers/launch';
test.use({launchOptions:{args:chromiumArgs,ignoreDefaultArgs:[]}});
test("Can't Stop launches independent seats and leaves the gathering open",async({page,browser},info)=>{
 const host=process.env.FIRESTORE_EMULATOR_HOST??'127.0.0.1:8199',project='demo-gameroom-catalogue-e2e';
 if(!/^127\.0\.0\.1:\d+$/.test(host)||!project.startsWith('demo-'))throw new Error('Use a local demo catalog.');
 const target=`http://${host}/v1/projects/${project}/databases/(default)/documents/Applications/cantstop-integration`;
 const seeded=await fetch(target,{method:'PATCH',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({fields:{Title:{stringValue:"Can't Stop"},WebURL:{stringValue:'https://anicolao.github.io/cantstop/'},GameroomEnabled:{booleanValue:true}}})});expect(seeded.ok).toBe(true);
 const story=new TestStepHelper(info,'CANTSTOP-LAUNCH'),context=await browser.newContext(profile);
 try{
  await deterministicRoom(page,500);const friend=await context.newPage();await deterministicRoom(friend,600);
  const room=await openRoom(page,'Alex');await joinRoom(friend,room,'Sam');
  for(const actor of [page,friend])await expect(actor.getByRole('heading',{name:"Can't Stop",exact:true})).toBeVisible();
  const hostTab=page.context().waitForEvent('page'),guestTab=context.waitForEvent('page');await page.getByRole('button',{name:"Play Can't Stop",exact:true}).click();
  const games=await Promise.all([hostTab,guestTab]);
  for(const game of games){await expect(game).toHaveURL(/127\.0\.0\.1:4499\/\?table=/);await expect(game.locator('.seat-list li')).toHaveCount(2);expect(await game.evaluate(()=>window.opener===null)).toBe(true);}
  const code=new URL(games[0].url()).searchParams.get('table');expect(new URL(games[1].url()).searchParams.get('table')).toBe(code);
  for(const [actor,name] of [[page,'Alex'],[friend,'Sam']] as const)await story.step('room-stays-open',actor,name,'The room stays open with a Can’t Stop reopen control',[{spec:'The gathering keeps both players and reopens the chosen game',check:async()=>{await expect(actor).toHaveURL(room);await expect(actor.getByRole('button',{name:"Open Can't Stop",exact:true})).toBeVisible();await expect(actor.getByTestId('friend')).toHaveCount(2);expect(actor.context().pages()).toHaveLength(2);}}]);
  await games[0].getByRole('button',{name:'Start game',exact:true}).click();
  for(const game of games){await expect(game.locator('[data-table-view]')).toHaveAttribute('data-motion-idle','true');await expect(game.locator('[data-ready]')).toHaveAttribute('data-ready','true');}
  const revision=await games[1].locator('.game-shell').getAttribute('data-revision');await games[1].reload();await expect(games[1].locator('.game-shell')).toHaveAttribute('data-revision',revision!);
  for(const [i,name] of ['Alex','Sam'].entries())await story.step('same-game',games[i],name,'Both independent identities see the same playable Can’t Stop table',[{spec:'Reopening retains two seats and the same replay revision',check:async()=>{await expect(games[i].locator('.game-shell')).toHaveAttribute('data-revision',revision!);await expect(games[i].locator('[data-table-view]')).toHaveAttribute('data-phone','false');}}],true);
  story.finish();
 }finally{await context.close();await fetch(target,{method:'DELETE',headers:{Authorization:'Bearer owner'}});}
});
