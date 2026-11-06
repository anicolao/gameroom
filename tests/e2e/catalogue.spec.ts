import {test,expect,type Page} from '@playwright/test';
import {TestStepHelper} from './helpers/test-step-helper';
import {deterministicRoom,openRoom} from './helpers/launch';
const project='demo-gameroom-catalogue-e2e';
async function change(id:string,data?:Record<string,unknown>){
 const fields=Object.fromEntries(Object.entries(data??{}).map(([key,value])=>[key,typeof value==='boolean'?{booleanValue:value}:{stringValue:value}]));
 const response=await fetch(`http://127.0.0.1:8199/v1/projects/${project}/databases/(default)/documents/Applications/${id}`,{method:data?'PATCH':'DELETE',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},...(data?{body:JSON.stringify({fields})}:{})});
 expect(response.ok).toBe(true);
}
async function clickBox(page:Page,title:string){
 const cabinet=page.getByTestId('cabinet');await expect(cabinet).toHaveAttribute('data-ready','true',{timeout:120000});
 const id=await page.getByRole('button',{name:`Select ${title}`,exact:true}).getAttribute('data-game-id');
 const points=JSON.parse((await cabinet.getAttribute('data-targets'))!);expect(points[id!]).toBeDefined();
 const canvas=await cabinet.locator('canvas').boundingBox();expect(canvas).not.toBeNull();
 await page.mouse.click(canvas!.x+points[id!].x,canvas!.y+points[id!].y);
 await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
}
test('shared catalog updates, hides games and opens URL-only games without group claims',async({page},info)=>{
 const story=new TestStepHelper(info,'CATALOGUE');await deterministicRoom(page,400);
 const target='https://games.example.test/standalone?keep=original';
 try{
  const roomUrl=await openRoom(page,'Catalog tester');await expect(page.getByRole('button',{name:/Select /})).toHaveCount(4);
  await change('fresh',{Title:'Aardvark',URL:'https://tabletop.example.test/different',WebURL:target,GameroomEnabled:true,Hidden:true});
  await story.step('live-entry',page,'Reader','A catalog document arrives through the Firestore subscription',[{spec:'Five games fit together in the enclosed cabinet',check:async()=>{await expect(page.getByRole('button',{name:/Select /})).toHaveCount(5);await expect(page.getByRole('slider',{name:'Browse game shelves'})).toHaveCount(0);}}]);
  await page.getByRole('textbox',{name:'Search games'}).fill('aardvark');
  await clickBox(page,'Aardvark');
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

test('enclosed 3D cabinet selects real boxes and browses by wheel, keyboard and touch',async({page},info)=>{
 const story=new TestStepHelper(info,'CABINET');await deterministicRoom(page,500);
 const extra=[['drm','DRM'],['gotfive','Got Five'],['pantheon','Pantheon'],['rebelprincess','Rebel Princess']];
 const filler=Array.from({length:12},(_,i)=>`collection-${i}`);
 try{
  for(const [id,title] of extra)await change(`cover-${id}`,{Title:title,WebURL:`https://anicolao.github.io/${id}/`,GameroomEnabled:true,Hidden:true});
  await openRoom(page,'Art reviewer');
  const slider=page.getByRole('slider',{name:'Browse game shelves'}),cabinet=page.getByTestId('cabinet');
  await story.step('eight-boxes',page,'Reader','Eight illustrated boxes fit on the two enclosed shelves',[{spec:'All eight games are available without duplicate title overlays or pagination',check:async()=>{await expect(page.getByRole('button',{name:/Select /})).toHaveCount(8);await expect(slider).toHaveCount(0);await expect(page.locator('.shelf-label')).toHaveCount(0);}}]);
  await clickBox(page,'Pantheon');
  await story.step('mesh-selection',page,'Reader','A native click on the 3D Pantheon box selects it',[{spec:'The selected box lifts and the independent URL action follows the selection',check:async()=>{await expect(page.getByRole('button',{name:'Open Pantheon',exact:true})).toBeVisible();}}]);
  for(const [i,id] of filler.entries())await change(id,{Title:`Collection ${String(i+1).padStart(2,'0')}`,WebURL:`https://games.example.test/${id}`,GameroomEnabled:true,Hidden:true});
  await expect(slider).toHaveValue('0');await expect(cabinet).toHaveAttribute('data-ready','true',{timeout:120000});
  const bounds=await cabinet.locator('canvas').boundingBox();
  await page.mouse.move(bounds!.x+bounds!.width/2,bounds!.y+bounds!.height/2);await page.mouse.wheel(0,125);
  await page.mouse.move(0,0);await expect(cabinet).toHaveAttribute('data-target','1');
  await story.step('wheel-browse',page,'Reader','Wheel input carries new boxes through the concealed return loop',[{spec:'The finite twenty-game collection moves one position and remains bounded',check:async()=>{await expect(cabinet).toHaveAttribute('data-position','1',{timeout:30000});await expect(slider).toHaveAttribute('max','6');await expect(page.getByRole('heading',{name:'Pantheon',exact:true})).toBeVisible();}}]);
  await slider.focus();await slider.press('End');await slider.blur();
  await story.step('last-games',page,'Reader','The keyboard slider reaches the end of the catalog',[{spec:'The final covers are accessible and the next control is disabled',check:async()=>{await expect(cabinet).toHaveAttribute('data-position','6',{timeout:30000});await expect(page.getByRole('button',{name:'Next games',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'Select Rebel Princess',exact:true})).toHaveCount(1);}}]);
  await slider.focus();await slider.press('Home');await slider.blur();await expect(cabinet).toHaveAttribute('data-position','0',{timeout:30000});
  await page.setViewportSize({width:390,height:844});await expect(cabinet).toHaveAttribute('data-ready','true',{timeout:120000});
  const session=await page.context().newCDPSession(page);
  try{
   await session.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
   const box=(await cabinet.boundingBox())!,y=box.y+box.height*.4,x=box.x+box.width*.75,end=box.x+box.width*.25;
   await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
   for(const fraction of [.25,.5,.75,1])await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+(end-x)*fraction,y}]});
   await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }finally{await session.detach();}
  await story.step('touch-browse',page,'Reader','A horizontal swipe moves the belts without selecting a box',[{spec:'Touch reaches position four while the previous selection stays intact',check:async()=>{await expect(cabinet).toHaveAttribute('data-position','4',{timeout:30000});await expect(page.getByRole('heading',{name:'Pantheon',exact:true})).toBeVisible();}}],false,true);
  await page.getByRole('textbox',{name:'Search games'}).fill('pantheon');
  await story.step('single-cover',page,'Reader','Search narrows a large catalog to one illustrated box',[{spec:'One matching box remains and unnecessary browsing controls disappear',check:async()=>{await expect(page.getByRole('button',{name:/Select /})).toHaveCount(1);await expect(slider).toHaveCount(0);}}],false,true);
  await clickBox(page,'Pantheon');
  await page.getByRole('textbox',{name:'Search games'}).fill('no matching title');
  await story.step('empty-shelves',page,'Reader','An empty search keeps the cabinet and room available',[{spec:'Empty shelves show a useful result message',check:async()=>{await expect(page.getByText('No matching games',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:/Select /})).toHaveCount(0);}}],false,true);
  story.finish();
 }finally{for(const [id] of extra)await change(`cover-${id}`);for(const id of filler)await change(id);}
});
