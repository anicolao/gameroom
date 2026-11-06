import {test,expect} from '@playwright/test';
import {TestStepHelper} from './helpers/test-step-helper';

test('HTTP origin without native randomUUID creates a room and persists launch commands',async({page},info)=>{
 const story=new TestStepHelper(info,'HTTP-ORIGIN'),errors:string[]=[];
 page.on('pageerror',error=>errors.push(error.message));
 // Chromium resolves this host to the local server. Its HTTP origin is genuinely
 // insecure: no UUID stub, crypto polyfill, request interception, or security bypass.
 await page.goto('http://gameroom.test:4199/',{waitUntil:'domcontentloaded'});
 expect(await page.evaluate(()=>({secure:isSecureContext,uuid:typeof crypto.randomUUID,rng:typeof crypto.getRandomValues}))).toEqual({secure:false,uuid:'undefined',rng:'function'});
 await page.getByRole('textbox',{name:'Your name'}).fill('Dev');
 await page.getByRole('button',{name:'Create room'}).click();
 await story.step('http-room',page,'Dev','A real HTTP origin opens a room without randomUUID',[{spec:'The room has a valid code and its create command is committed to Firestore',check:async()=>{
  expect(new URL(page.url()).searchParams.get('room')).toMatch(/^[A-F0-9]{8}$/);
  await expect(page.getByTestId('friend')).toHaveCount(1);
  await expect(page.getByTestId('friend')).toContainText('Dev (you)');
 }}]);
 await page.getByRole('button',{name:'Room conversation',exact:true}).click();
 await page.getByRole('textbox',{name:'Message',exact:true}).fill('Secure random bytes work here.');
 await page.getByRole('button',{name:'Send message'}).click();
 await expect(page.getByText('Secure random bytes work here.',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Close conversation'}).click();
 const roomUrl=page.url(),opened=page.context().waitForEvent('page');
 await page.getByRole('button',{name:'Play Cribbage',exact:true}).click();
 const game=await opened;
 await expect(game).toHaveURL(/127\.0\.0\.1:4397\/\?table=/);
 const url=new URL(game.url());
 expect(url.searchParams.get('table')).toMatch(/^[A-F0-9]{8}$/);
 expect(url.searchParams.get('name')).toBe('Dev');expect(url.searchParams.get('launch')).toBe('create');
 await expect(game.locator('[data-player] h2')).toHaveText(['Dev']);
 expect(await game.evaluate(()=>window.opener===null)).toBe(true);expect(url.searchParams.has('returnTo')).toBe(false);
 await expect(page).toHaveURL(roomUrl);await game.close();
 await page.getByRole('button',{name:'Leave table',exact:true}).click();
 await story.step('http-launch',page,'Dev','The game opens separately while the original HTTP room stays connected',[{spec:'The native UUID API is still absent and the saved game remains resumable',check:async()=>{
  expect(await page.evaluate(()=>typeof crypto.randomUUID)).toBe('undefined');
  await expect(page.getByRole('button',{name:'Open Cribbage',exact:true})).toBeVisible();
  await expect(page.getByTestId('friend')).toContainText('In room');
  expect(errors).toEqual([]);
 }}]);
 await page.reload({waitUntil:'domcontentloaded'});
 await expect(page.getByRole('button',{name:'Open Cribbage',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Room conversation',exact:true}).click();
 await expect(page.getByText('Secure random bytes work here.',{exact:true})).toBeVisible();
 expect(errors).toEqual([]);story.finish();
});
