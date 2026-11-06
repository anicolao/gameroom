import {test,expect} from 'bun:test';
import {accessibleGames,catalogueBoxes,perimeter,pathAt,seam,spring} from '../src/lib/cabinet/conveyor';
import {scrollLimit} from '../src/lib/cabinet/catalogue';
const games=(n:number)=>Array.from({length:n},(_,i)=>({id:String(i),title:`Game ${i}`,artKey:'',iconSrc:null}));
test('small collections show each game once without scrolling',()=>{
 for(const count of [0,1,2,4,5,7,8]){const collection=games(count);expect(scrollLimit(collection)).toBe(0);expect(accessibleGames(collection,0).map(g=>g.id)).toEqual(collection.map(g=>g.id));}
});
test('every catalog game reaches the front and finite endpoints retain the first and last games',()=>{
 for(const count of [9,20,37]){
  const collection=games(count),seen=new Set<string>();
  for(let position=0;position<=scrollLimit(collection);position++)for(const game of accessibleGames(collection,position))seen.add(game.id);
  expect(seen.size).toBe(count);expect(accessibleGames(collection,0).some(g=>g.id==='0')).toBe(true);expect(accessibleGames(collection,scrollLimit(collection)).some(g=>g.id===String(count-1))).toBe(true);
 }
});
test('an uneven collection keeps both lanes moving with their belts',()=>{
 const collection=games(9),before=catalogueBoxes(collection,0,1),after=catalogueBoxes(collection,1,1);
 expect(before.find(box=>box.game.id==='6')!.x).not.toBe(after.find(box=>box.game.id==='6')!.x);
});
test('a very large collection keeps at most 24 real box meshes in the window',()=>{
 const collection=games(10000);
 for(const position of [0,123.5,2000,scrollLimit(collection)]){
  const boxes=[0,1].flatMap(row=>catalogueBoxes(collection,position,row));
  expect(boxes.length).toBeLessThanOrEqual(24);expect(new Set(boxes.map(box=>box.game.id)).size).toBe(boxes.length);
 }
});
test('the carrier replacement seam stays on the rear run and motion settles without overshooting',()=>{
 const rear=pathAt(seam);expect(rear.x).toBeCloseTo(0);expect(rear.yaw).toBe(Math.PI);expect(pathAt(seam+perimeter).z).toBeCloseTo(rear.z);
 let position=0,velocity=0;
 for(let i=0;i<300;i++){const next=spring(position,velocity,4,1/60,9);position=next.position;velocity=next.velocity;expect(position).toBeLessThanOrEqual(4);}
 expect(position).toBeCloseTo(4,10);expect(Math.abs(velocity)).toBeLessThan(1e-10);
});

test('the analytic spring keeps wall-clock timing when rendering drops frames',()=>{
 const delayed=spring(0,0,6,2,9);let smooth={position:0,velocity:0};
 for(let i=0;i<120;i++)smooth=spring(smooth.position,smooth.velocity,6,1/60,9);
 expect(delayed.position).toBeCloseTo(smooth.position,12);expect(delayed.velocity).toBeCloseTo(smooth.velocity,12);
});
