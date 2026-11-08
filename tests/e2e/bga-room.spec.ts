import {test,expect,type BrowserContext} from '@playwright/test';
import {TestStepHelper} from './helpers/test-step-helper';
import {bgaExtension,fixtureBga,approve,trustedOrigin,bgaFixtureArgs} from './helpers/bga-extension';
import {deterministicRoom,profile,waitForInactive} from './helpers/launch';
test.use({launchOptions:{args:bgaFixtureArgs,ignoreDefaultArgs:['--disable-popup-blocking']}});
async function proxyRoom(context:BrowserContext){
 // HTTPS fixture origin accesses only the local Firebase emulators. Grant the
 // browser's explicit loopback-network permission rather than disabling checks.
 await context.grantPermissions(['local-network-access'],{origin:trustedOrigin});
 await context.route(`${trustedOrigin}/**`,async route=>{
  const url=new URL(route.request().url());
  const response=await context.request.get(`http://127.0.0.1:4199${url.pathname}${url.search}`);
  await route.fulfill({response});
 });await fixtureBga(context);
}
test('BGA room shares one captured table with an independent friend and keeps chat and popup recovery',async({browser},info)=>{
 const extension=await bgaExtension(),guestContext=await browser.newContext(profile),story=new TestStepHelper(info,'BGA-LAUNCH');
 try{
  await proxyRoom(extension.context);await proxyRoom(guestContext);
  const host=await extension.context.newPage(),guest=await guestContext.newPage();
  await deterministicRoom(host,10000);await deterministicRoom(guest,20000);
  await host.goto(trustedOrigin+'/?bga=1');await host.getByRole('textbox',{name:'Your name'}).fill('Alex');await host.getByRole('button',{name:'Create room',exact:true}).click();
  await expect(host.getByTestId('friend')).toHaveCount(1);const invitation=host.url();
  await guest.goto(invitation);await guest.getByRole('textbox',{name:'Your name'}).fill('Sam');await guest.getByRole('button',{name:'Join room',exact:true}).click();
  await expect(host.getByTestId('friend')).toHaveCount(2);
  await host.getByRole('textbox',{name:'BGA Boss extension ID'}).fill(extension.id);
  const capture=async(id:string,description:string,mobileGuest=false)=>{
   for(const [page,name] of [[host,'Alex'],[guest,'Sam']] as const)await story.step(id,page,name,description,[{spec:'Both independent profiles remain in the gathering',check:async()=>{await expect(page).toHaveURL(invitation);await expect(page.getByTestId('friend')).toHaveCount(2);}}],false,mobileGuest&&name==='Sam');
  };
  await capture('ready','The host can set up BGA without changing the shared catalog');
  await host.getByRole('button',{name:"Set up Can't Stop on BGA",exact:true}).click();
  await expect(host.getByTestId('bga-status')).toHaveText('Approve this request in the BGA Boss window.');
  await capture('approval','BGA Boss requires approval before opening BGA');
  const pending=await host.evaluate(()=>{const key=Object.keys(sessionStorage).find(key=>key.startsWith('gameroom:bga:'))!;return JSON.parse(sessionStorage.getItem(key)!);});
  await approve(extension.context,extension.id,pending.id);
  await expect(host.getByTestId('bga-status')).toContainText('Create a table in the BGA tab.');
  await expect.poll(()=>extension.context.pages().filter(p=>p.url().includes('boardgamearena.com/gamepanel')).length).toBe(1);
  const bga=extension.context.pages().find(p=>p.url().includes('boardgamearena.com/gamepanel'))!;
  // Extension-created initial navigations precede Playwright target attachment.
  // DNS is disabled for BGA; explicitly load the deterministic fixture once attached.
  await bga.goto('https://boardgamearena.com/gamepanel?game=cantstop');
  await capture('waiting','The host creates the table through BGA controls');
  await waitForInactive(guest);
  await bga.getByRole('link',{name:'Create fixture table'}).click();
  // Poll the attempt receipt without Playwright's evaluate user gesture.
  // A locator assertion before the remote event arrives can renew activation.
  const cdp=await guestContext.newCDPSession(guest);
  try{await expect.poll(async()=>{const result=await cdp.send('Runtime.evaluate',{expression:`Object.entries(sessionStorage).find(([key])=>key.startsWith('gameroom:opened:')&&key.endsWith(':${pending.table}'))?.[1]??null`,returnByValue:true,userGesture:false});return result.result.value;}).toBe('blocked');}finally{await cdp.detach();}
  await expect(host.getByTestId('bga-status')).toHaveText('Table shared with room.');
  await expect(guest.getByTestId('game-tab-status')).toContainText('Your browser didn’t open the game.');
  for(const page of [host,guest])await expect(page.getByRole('button',{name:"Open Can't Stop (BGA)",exact:true})).toBeVisible();
  expect(extension.context.pages().filter(p=>p.url().startsWith('https://boardgamearena.com/table'))).toHaveLength(1);
  await capture('shared','Both selected profiles receive the same BGA table and a reopen control');
  const popup=guestContext.waitForEvent('page');await guest.getByRole('button',{name:"Open Can't Stop (BGA)",exact:true}).click();const guestBga=await popup;
  await guestBga.goto('https://boardgamearena.com/table?table=12345678');
  await expect(guestBga.getByRole('heading',{name:'BGA fixture',exact:true})).toBeVisible();
  await expect(guestBga).toHaveURL('https://boardgamearena.com/table?table=12345678');expect(await guestBga.evaluate(()=>window.opener===null)).toBe(true);
  // Return through a real room control after the cross-site popup; this also
  // ensures the room compositor presents the conversation before capture.
  await guest.getByRole('button',{name:'Room conversation',exact:true}).click();
  await expect(guest.getByRole('region',{name:'Room conversation',exact:true})).toBeVisible();
  await capture('opened','The friend opens the exact BGA URL and continues using the room');
  await host.reload();await expect(host.getByTestId('bga-status')).toHaveText('Table shared with room.');
  expect(extension.context.pages().filter(p=>p.url().startsWith('https://boardgamearena.com/table'))).toHaveLength(1);
  await host.getByRole('button',{name:'Room conversation',exact:true}).click();
  await host.getByRole('textbox',{name:'Message',exact:true}).fill('Meet you at the BGA table.');await host.getByRole('button',{name:'Send message',exact:true}).click();
  await expect(guest.getByText('Meet you at the BGA table.',{exact:true})).toBeVisible();
  await capture('chat','Reload creates no duplicate BGA tab and room chat continues');
  await guest.getByRole('button',{name:'Close conversation',exact:true}).click();await guest.setViewportSize({width:390,height:844});
  await capture('mobile','The mobile friend retains a usable reopen control',true);story.finish();
 }finally{await guestContext.close();await extension.close();}
});
