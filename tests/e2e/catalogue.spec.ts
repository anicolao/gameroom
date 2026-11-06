import {test,expect} from '@playwright/test';
import {TestStepHelper} from './helpers/test-step-helper';
import {deterministicRoom,openRoom} from './helpers/launch';
const project='demo-gameroom-catalogue-e2e';
async function change(id:string,data?:Record<string,unknown>){
 const fields=Object.fromEntries(Object.entries(data??{}).map(([key,value])=>[key,typeof value==='boolean'?{booleanValue:value}:{stringValue:value}]));
 const response=await fetch(`http://127.0.0.1:8199/v1/projects/${project}/databases/(default)/documents/Applications/${id}`,{method:data?'PATCH':'DELETE',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},...(data?{body:JSON.stringify({fields})}:{})});
 expect(response.ok).toBe(true);
}
test('shared catalog updates, pages, hides games and opens URL-only games without group claims',async({page},info)=>{
 const story=new TestStepHelper(info,'CATALOGUE');await deterministicRoom(page,400);
 const target='https://games.example.test/standalone?keep=original';
 try{
  const roomUrl=await openRoom(page,'Catalog tester');await expect(page.getByRole('button',{name:/Select /})).toHaveCount(4);
  await change('fresh',{Title:'Aardvark',URL:'https://tabletop.example.test/different',WebURL:target,GameroomEnabled:true,Hidden:true});
  await story.step('live-entry',page,'Reader','A catalog document arrives through the Firestore subscription',[{spec:'Five games produce two shelves without scrolling the desktop room',check:async()=>{await expect(page.getByRole('button',{name:'Select Aardvark',exact:true})).toBeVisible();await expect(page.getByRole('navigation',{name:'Catalog pages'})).toContainText('1–4 of 5');}}]);
  await page.getByRole('button',{name:'Next shelf',exact:true}).click();
  await story.step('next-shelf',page,'Reader','The same cabinet browses a larger collection',[{spec:'The second shelf contains Robo Rally',check:async()=>{await expect(page.getByRole('button',{name:'Select Robo Rally',exact:true})).toBeVisible();await expect(page.getByRole('navigation',{name:'Catalog pages'})).toContainText('5 of 5');}}]);
  await page.getByRole('textbox',{name:'Search games'}).fill('aardvark');
  await page.getByRole('button',{name:'Select Aardvark',exact:true}).click();
  const tab=page.context().waitForEvent('page'),request=page.context().waitForEvent('request',r=>r.url()===target);
  await page.getByRole('button',{name:'Open Aardvark',exact:true}).click();
  const [external,outbound]=await Promise.all([tab,request]);expect(outbound.url()).toBe(target);await external.close();
  await story.step('url-only',page,'Reader','A URL-only entry opens separately without invented group support',[{spec:'The original room stays open and no group table was recorded',check:async()=>{await expect(page).toHaveURL(roomUrl);await expect(page.getByRole('region',{name:'Room tables'})).toHaveCount(0);await expect(page.getByRole('button',{name:'Play Cribbage',exact:true})).toHaveCount(0);await expect(page.getByTestId('external-tab-status')).toContainText('separately');}}]);
  await change('fresh',{Title:'Aardvark',WebURL:target,GameroomEnabled:false,Hidden:true});await change('bad',{Title:'Bad URL',WebURL:'javascript:alert(1)',GameroomEnabled:true});
  await page.getByRole('textbox',{name:'Search games'}).fill('');
  await story.step('hidden-and-invalid',page,'Reader','Gameroom-disabled and invalid entries disappear without rewriting catalog data',[{spec:'Only the four valid visible entries remain',check:async()=>{await expect(page.getByRole('button',{name:/Select /})).toHaveCount(4);await expect(page.getByRole('button',{name:'Select Aardvark',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Select Bad URL',exact:true})).toHaveCount(0);}}]);
  story.finish();
 }finally{await change('fresh');await change('bad');}
});

test('painted covers browse with cabinet arrows, keyboard slider and touch swipes',async({page},info)=>{
 const story=new TestStepHelper(info,'CABINET');await deterministicRoom(page,500);
 const extra=[['drm','DRM'],['gotfive','Got Five'],['pantheon','Pantheon'],['rebelprincess','Rebel Princess']];
 try{
  for(const [id,title] of extra)await change(`cover-${id}`,{Title:title,WebURL:`https://anicolao.github.io/${id}/`,GameroomEnabled:true,Hidden:true});
  await openRoom(page,'Art reviewer');
  const slider=page.getByRole('slider',{name:'Browse game shelves'}),cabinet=page.getByRole('region',{name:'Game cabinet'});
  await story.step('first-four',page,'Reader','Painted covers and printed shelf labels fill the cabinet',[{spec:'The first four of eight games have art and a disabled previous arrow',check:async()=>{
   await expect(page.getByRole('button',{name:/Select /})).toHaveCount(4);
   await expect(page.getByRole('button',{name:'Select DRM',exact:true})).toBeVisible();
   await expect(page.getByRole('button',{name:'Select Got Five',exact:true})).toBeVisible();
   await expect(slider).toHaveValue('0');await expect(page.getByRole('button',{name:'Previous shelf',exact:true})).toBeDisabled();
   expect(await page.locator('.shelf-label').evaluateAll(labels=>labels.every(label=>getComputedStyle(label).backgroundColor==='rgba(0, 0, 0, 0)'))).toBe(true);
  }}]);
  await page.getByRole('button',{name:'Next shelf',exact:true}).click();
  await story.step('last-four',page,'Reader','Brass arrows advance the collection without moving the room',[{spec:'The other four covers are visible and the end boundary disables Next',check:async()=>{
   await expect(page.getByRole('button',{name:'Select Pantheon',exact:true})).toBeVisible();
   await expect(page.getByRole('button',{name:'Select Rebel Princess',exact:true})).toBeVisible();
   await expect(page.getByRole('navigation',{name:'Catalog pages'})).toContainText('5–8 of 8');
   await expect(page.getByRole('button',{name:'Next shelf',exact:true})).toBeDisabled();
  }}]);
  await slider.focus();await slider.press('Home');await expect(slider).toHaveValue('0');
  await slider.press('End');await expect(slider).toHaveValue('1');
  await page.getByRole('button',{name:'Previous shelf',exact:true}).click();await expect(slider).toHaveValue('0');
  await page.setViewportSize({width:390,height:844});
  const session=await page.context().newCDPSession(page);
  try{
   await session.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
   const box=await cabinet.boundingBox();expect(box).not.toBeNull();
   const y=box!.y+box!.height*.4,x=box!.x+box!.width*.75,end=box!.x+box!.width*.25;
   await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
   for(const fraction of [.25,.5,.75,1])await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+(end-x)*fraction,y}]});
   await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }finally{await session.detach();}
  await story.step('touch-browse',page,'Reader','A horizontal swipe browses while vertical room scrolling stays available',[{spec:'Swiping shows the final four covers without accidentally selecting one',check:async()=>{
   await expect(slider).toHaveValue('1');
   await expect(page.getByRole('button',{name:'Select Rebel Princess',exact:true})).toBeVisible();
   await expect(page.getByRole('heading',{name:'Cribbage',exact:true})).toBeVisible();
  }}],false,true);
  await page.getByRole('textbox',{name:'Search games'}).fill('pantheon');
  await story.step('single-cover',page,'Reader','Search narrows a large catalogue to one illustrated box',[{spec:'The matching box remains full size and unnecessary browsing controls disappear',check:async()=>{
   await expect(page.getByRole('button',{name:/Select /})).toHaveCount(1);
   await expect(slider).toHaveCount(0);await expect(page.getByRole('button',{name:'Next shelf',exact:true})).toHaveCount(0);
  }}],false,true);story.finish();
 }finally{for(const [id] of extra)await change(`cover-${id}`);}
});
