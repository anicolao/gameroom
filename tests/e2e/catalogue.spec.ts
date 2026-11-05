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
  await change('fresh',{Title:'Aardvark',URL:target});
  await story.step('live-entry',page,'Reader','A catalog document arrives through the Firestore subscription',[{spec:'Five games produce two shelves without scrolling the desktop room',check:async()=>{await expect(page.getByRole('button',{name:'Select Aardvark',exact:true})).toBeVisible();await expect(page.getByRole('navigation',{name:'Catalog pages'})).toContainText('1 / 2');}}]);
  await page.getByRole('button',{name:'Next shelf',exact:true}).click();
  await story.step('next-shelf',page,'Reader','The same cabinet browses a larger collection',[{spec:'The second shelf contains Robo Rally',check:async()=>{await expect(page.getByRole('button',{name:'Select Robo Rally',exact:true})).toBeVisible();await expect(page.getByRole('navigation',{name:'Catalog pages'})).toContainText('2 / 2');}}]);
  await page.getByRole('textbox',{name:'Search games'}).fill('aardvark');
  await page.getByRole('button',{name:'Select Aardvark',exact:true}).click();
  const tab=page.context().waitForEvent('page'),request=page.context().waitForEvent('request',r=>r.url()===target);
  await page.getByRole('button',{name:'Open Aardvark',exact:true}).click();
  const [external,outbound]=await Promise.all([tab,request]);expect(outbound.url()).toBe(target);await external.close();
  await story.step('url-only',page,'Reader','A URL-only entry opens separately without invented group support',[{spec:'The original room stays open and no group table was recorded',check:async()=>{await expect(page).toHaveURL(roomUrl);await expect(page.getByRole('region',{name:'Room tables'})).toHaveCount(0);await expect(page.getByRole('button',{name:'Play Cribbage',exact:true})).toHaveCount(0);await expect(page.getByTestId('external-tab-status')).toContainText('separately');}}]);
  await change('fresh',{Title:'Aardvark',URL:target,Hidden:true});await change('bad',{Title:'Bad URL',URL:'javascript:alert(1)'});
  await page.getByRole('textbox',{name:'Search games'}).fill('');
  await story.step('hidden-and-invalid',page,'Reader','Hidden and invalid entries disappear without rewriting catalog data',[{spec:'Only the four valid visible entries remain',check:async()=>{await expect(page.getByRole('button',{name:/Select /})).toHaveCount(4);await expect(page.getByRole('button',{name:'Select Aardvark',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Select Bad URL',exact:true})).toHaveCount(0);}}]);
  story.finish();
 }finally{await change('fresh');await change('bad');}
});
