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
  await change('fresh',{Title:'Aardvark',URL:'https://tabletop.example.test/different',WebURL:target,GameroomEnabled:'new-tab',Hidden:true});
  await story.step('live-entry',page,'Reader','A catalog document arrives through the Firestore subscription',[{spec:'Five games fit together in the enclosed cabinet',check:async()=>{await expect(page.getByRole('button',{name:/Select /})).toHaveCount(5);await expect(page.getByRole('slider',{name:'Browse game shelves'})).toHaveCount(0);}}]);
  await page.getByRole('textbox',{name:'Search games'}).fill('aardvark');
  await clickBox(page,'Aardvark');
  const tab=page.context().waitForEvent('page'),request=page.context().waitForEvent('request',r=>r.url()===target);
  await page.getByRole('button',{name:'Open Aardvark',exact:true}).click();
  const [external,outbound]=await Promise.all([tab,request]);expect(outbound.url()).toBe(target);await external.close();
  await story.step('url-only',page,'Reader','A URL-only entry opens separately without invented group support',[{spec:'The original room stays open and no group table was recorded',check:async()=>{await expect(page).toHaveURL(roomUrl);await expect(page.getByRole('region',{name:'Room tables'})).toHaveCount(0);await expect(page.getByRole('button',{name:'Play Cribbage',exact:true})).toHaveCount(0);await expect(page.getByTestId('external-tab-status')).toContainText('separately');}}]);
  await page.getByRole('textbox',{name:'Search games'}).fill('');
  const keyboardChoice=page.getByRole('button',{name:'Select Cribbage',exact:true});await keyboardChoice.focus();await keyboardChoice.press('Enter');await keyboardChoice.blur();await expect(page.getByRole('heading',{name:'Cribbage',exact:true})).toBeVisible();
  await change('fresh',{Title:'Aardvark',WebURL:target,GameroomEnabled:'disabled',Hidden:true});await change('bad',{Title:'Bad URL',WebURL:'javascript:alert(1)',GameroomEnabled:'new-tab'});
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
  for(const [id,title] of extra)await change(`cover-${id}`,{Title:title,WebURL:`https://anicolao.github.io/${id}/`,GameroomEnabled:'new-tab',Hidden:true});
  await openRoom(page,'Art reviewer');
  const slider=page.getByRole('slider',{name:'Browse game shelves'}),cabinet=page.getByTestId('cabinet');
  const browse=async(keys:string[])=>{await cabinet.focus();for(const key of keys)await cabinet.press(key);await cabinet.blur();};
  await story.step('eight-boxes',page,'Reader','The eight-game catalog can browse in the embedded cabinet',[{spec:'All eight games are visible across three shelves and browsing is enabled for the actual eight-game collection',check:async()=>{await expect(page.getByRole('button',{name:/Select /})).toHaveCount(8);await expect(cabinet.locator('canvas')).toHaveAttribute('data-projection','PerspectiveCamera');await expect(slider).toHaveCount(0);await expect(page.getByRole('navigation',{name:'Browse catalog'})).toHaveCount(0);await expect(page.locator('.shelf-label')).toHaveCount(0);}}]);
  const eightBounds=(await cabinet.locator('canvas').boundingBox())!;
  await page.mouse.move(eightBounds.x+eightBounds.width/2,eightBounds.y+eightBounds.height/2);await page.mouse.wheel(0,125);await page.mouse.move(0,0);
  await story.step('eight-game-scroll',page,'Reader','Wheel input browses the production-sized eight-game collection',[{spec:'The three shelves move through the slim closed ends',check:async()=>{await expect(cabinet).toHaveAttribute('data-position','1',{timeout:30000});await expect(page.getByRole('button',{name:'Select Istanbul',exact:true})).toHaveCount(1);await expect(page.getByRole('button',{name:'Select Robo Rally',exact:true})).toHaveCount(1);}}]);
  await page.mouse.move(eightBounds.x+eightBounds.width/2,eightBounds.y+eightBounds.height/2);await page.mouse.wheel(0,15.625);await page.mouse.move(0,0);
  await story.step('corner-entry',page,'Reader','Rotating boxes enter real openings at the cabinet corners',[{spec:'An intermediate rotation clears the shortened backing and open passages',check:async()=>{await expect(cabinet).toHaveAttribute('data-position','1.125',{timeout:30000});}}]);
  await page.mouse.move(eightBounds.x+eightBounds.width/2,eightBounds.y+eightBounds.height/2);await page.mouse.wheel(0,-15.625);await page.mouse.move(0,0);
  await browse(['PageDown','PageDown','ArrowRight','ArrowRight']);
  await story.step('repeat-forward',page,'Reader','The shelves continue beyond their original sequence',[{spec:'Position nine continues without an end stop or visible controls',check:async()=>{await expect(cabinet).toHaveAttribute('data-position','9',{timeout:30000});await expect(page.getByRole('button',{name:'Select Robo Rally',exact:true})).toHaveCount(1);await expect(slider).toHaveCount(0);}}]);
  await browse([...Array(5).fill('PageUp'),'ArrowLeft']);
  await story.step('repeat-backward',page,'Reader','Keyboard browsing also repeats through negative positions',[{spec:'Position minus seven reaches the same games from the other direction',check:async()=>{await expect(cabinet).toHaveAttribute('data-position','-7',{timeout:30000});await expect(page.getByRole('button',{name:'Select Istanbul',exact:true})).toHaveCount(1);}}]);
  await clickBox(page,'Pantheon');
  await story.step('mesh-selection',page,'Reader','A native click on the 3D Pantheon box selects it',[{spec:'The selected box lifts and the independent URL action follows the selection',check:async()=>{await expect(page.getByRole('button',{name:'Open Pantheon',exact:true})).toBeVisible();}}]);
  for(const [i,id] of filler.entries())await change(id,{Title:`Collection ${String(i+1).padStart(2,'0')}`,WebURL:`https://games.example.test/${id}`,GameroomEnabled:'new-tab',Hidden:true});
  await expect(page.getByRole('button',{name:'All games 20',exact:true})).toBeVisible();
  await expect(cabinet).toHaveAttribute('data-position','0');await expect(cabinet).toHaveAttribute('data-ready','true',{timeout:120000});
  const bounds=await cabinet.locator('canvas').boundingBox();
  await page.mouse.move(bounds!.x+bounds!.width/2,bounds!.y+bounds!.height/2);await page.mouse.wheel(0,125);
  await page.mouse.move(0,0);await expect(cabinet).toHaveAttribute('data-target','1');
  await story.step('wheel-browse',page,'Reader','Wheel input carries new boxes through the concealed return loop',[{spec:'The twenty-game collection moves without adding visible scroll controls',check:async()=>{await expect(cabinet).toHaveAttribute('data-position','1',{timeout:30000});await expect(slider).toHaveCount(0);await expect(page.getByRole('heading',{name:'Pantheon',exact:true})).toBeVisible();}}]);
  await browse([...Array(8).fill('PageDown'),'ArrowRight','ArrowRight']);
  await story.step('large-repeat',page,'Reader','A larger catalog repeats as many times as needed',[{spec:'Position twenty-seven still exposes the final games without a boundary',check:async()=>{await expect(cabinet).toHaveAttribute('data-position','27',{timeout:30000});await expect(page.getByRole('button',{name:'Select Rebel Princess',exact:true})).toHaveCount(1);await expect(page.getByRole('button',{name:'Select Robo Rally',exact:true})).toHaveCount(1);}}]);
  await browse(Array(9).fill('PageUp'));await expect(cabinet).toHaveAttribute('data-position','0',{timeout:30000});
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
  await browse(Array(9).fill('ArrowRight'));
  await story.step('single-cover',page,'Reader','Search narrows a large catalog to one illustrated box',[{spec:'One semantic game choice repeats around its shelf and can keep scrolling',check:async()=>{await expect(page.getByRole('button',{name:/Select /})).toHaveCount(1);await expect(cabinet).toHaveAttribute('data-position','9',{timeout:30000});await expect(slider).toHaveCount(0);}}],false,true);
  await clickBox(page,'Pantheon');
  await page.getByRole('textbox',{name:'Search games'}).fill('no matching title');
  await story.step('empty-shelves',page,'Reader','An empty search keeps the cabinet and room available',[{spec:'Empty shelves show a useful result message',check:async()=>{await expect(page.getByText('No matching games',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:/Select /})).toHaveCount(0);}}],false,true);
  story.finish();
 }finally{for(const [id] of extra)await change(`cover-${id}`);for(const id of filler)await change(id);}
});
