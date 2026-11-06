import {test,expect} from 'bun:test';
import {accessibleGames,catalogueBoxes,perimeter,pathAt,seam,spring,cabinetTrack,carouselLength} from '../src/lib/cabinet/conveyor';
const games=(n:number)=>Array.from({length:n},(_,i)=>({id:String(i),title:`Game ${i}`,artKey:'',iconSrc:null}));
test('each shelf doubles its game sequence until a full carousel is available',()=>{
 for(const [count,length] of [[0,0],[1,8],[2,8],[3,12],[4,8],[5,10],[7,14],[8,8],[9,9]])expect(carouselLength(count)).toBe(length);
});
test('empty shelves stay empty and repeated boxes retain unique physical keys',()=>{
 expect(catalogueBoxes([],0,0)).toEqual([]);expect(accessibleGames([],0)).toEqual([]);
 const boxes=catalogueBoxes(games(1),0,0);expect(boxes).toHaveLength(8);expect(new Set(boxes.map(b=>b.key)).size).toBe(8);expect(accessibleGames(games(1),0)).toHaveLength(1);
});
test('all games reach the front while both shelves repeat indefinitely in either direction',()=>{
 for(const count of [1,2,3,4,5,7,8,9,20,37]){
  const collection=games(count),length=carouselLength(Math.ceil(count/2)),seen=new Set<string>();
  for(let position=-length;position<=length;position++)for(const game of accessibleGames(collection,position))seen.add(game.id);
  expect(seen.size).toBe(count);
 }
 const collection=games(8),pose=(position:number)=>catalogueBoxes(collection,position,0).map(({game,x,z,yaw})=>({id:game.id,x,z,yaw}));
 expect(pose(-8)).toEqual(pose(0));expect(pose(8)).toEqual(pose(0));
});
test('large collections keep at most 16 meshes and small collections expose unique semantic choices',()=>{
 for(const count of [1,4,8,10000])for(const position of [-10000,-1.5,0,123.5,10000]){
  const collection=games(count),boxes=[0,1].flatMap(row=>catalogueBoxes(collection,position,row)),choices=accessibleGames(collection,position);
  expect(boxes.length).toBeLessThanOrEqual(16);expect(new Set(choices.map(g=>g.id)).size).toBe(choices.length);
 }
});
test('virtual copies enter and leave only at the hidden rear seam',()=>{
 const collection=games(8),before=catalogueBoxes(collection,1-1e-6,0),after=catalogueBoxes(collection,1+1e-6,0);
 const removed=before.find(box=>!after.some(next=>next.key===box.key))!,added=after.find(box=>!before.some(previous=>previous.key===box.key))!;
 expect(removed.yaw).toBe(Math.PI);expect(added.yaw).toBe(Math.PI);expect(removed.x).toBeCloseTo(added.x,4);expect(removed.z).toBeCloseTo(added.z,4);
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

test('the slim return bend clears the belt rails and the cabinet side walls',()=>{
 expect(cabinetTrack.radius).toBeGreaterThan(.59+.027/2);
 // Half the box width and its printed back define the full swept corner.
 const outside=cabinetTrack.half+Math.hypot(1.65/2,cabinetTrack.radius+.357);
 expect(outside).toBeLessThan(6.55);
 const rear=cabinetTrack.front-2*cabinetTrack.radius-.357;
 expect(rear).toBeGreaterThan(-1.31);
});
