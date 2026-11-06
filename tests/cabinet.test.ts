import {test,expect} from 'bun:test';
import {cabinetLift,cornerOpenings,partition,partitionSolids,type CabinetSolid} from '../src/lib/cabinet/structure';
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

test('selected boxes settle onto the belt before the corner and stay down on the return',()=>{
 expect(cabinetLift(0,0,.23)).toBe(.23);expect(cabinetLift(4.4,0,.23)).toBeCloseTo(.115);
 expect(cabinetLift(4.8,0,.23)).toBe(0);expect(cabinetLift(5.2,Math.PI/2,.23)).toBe(0);expect(cabinetLift(0,Math.PI,.23)).toBe(0);
});

test('corner openings enclose the full selected box height and the backing clears its rear face',()=>{
 const levels=[3.27,.12],openings=cornerOpenings(levels);
 for(const [i,base] of [...levels].sort((a,b)=>a-b).entries()){
  expect(openings[i].bottom).toBeLessThan(base+.105);
  expect(openings[i].top).toBeGreaterThan(base+.105+.23+2.2*1.04);
 }
 const frontBack=cabinetTrack.front-1.04*(.357*Math.cos(.045)+.825*Math.sin(.045));
 expect(partition.front).toBeLessThan(frontBack-.01);
});

/** Separating-axis test for a yawed game box against an axis-aligned wood solid. */
function intersectsWood(pose:{x:number;z:number;yaw:number},base:number,scale:number,lift:number,selected:boolean,solid:CabinetSolid){
 const rise=cabinetLift(pose.x,pose.yaw,lift),yaw=pose.yaw-(selected?.045:0),u=[Math.cos(yaw),-Math.sin(yaw)],v=[Math.sin(yaw),Math.cos(yaw)];
 const center=[pose.x+Math.sin(pose.yaw)*rise*.8,base+.105+rise+1.1*scale,pose.z+Math.cos(pose.yaw)*rise*.8];
 if(Math.abs(center[1]-solid.center[1])>=1.1*scale+solid.size[1]/2)return false;
 const delta=[center[0]-solid.center[0],center[2]-solid.center[2]];
 return [[1,0],[0,1],u,v].every(axis=>{
  const box=.825*scale*Math.abs(axis[0]*u[0]+axis[1]*u[1])+.357*scale*Math.abs(axis[0]*v[0]+axis[1]*v[1]);
  const wood=solid.size[0]/2*Math.abs(axis[0])+solid.size[2]/2*Math.abs(axis[1]);
  return Math.abs(delta[0]*axis[0]+delta[1]*axis[1])<box+wood-1e-9;
 });
}
test('the complete rotating box sweep never intersects the backing or its corner borders',()=>{
 const levels=[3.27,.12],solids=partitionSolids(levels),length=4*cabinetTrack.half+2*Math.PI*cabinetTrack.radius;
 for(let step=0;step<1440;step++)for(const base of levels)for(const scale of [.91,1,1.04])for(const lift of [0,.09,.23])for(const selected of [false,true]){
  const pose=pathAt(step/1440*length,cabinetTrack);
  const collision=solids.find(solid=>intersectsWood(pose,base,scale,lift,selected,solid));
  if(collision)throw new Error(`Box intersects ${collision.name}: ${JSON.stringify({step,pose,base,scale,lift,selected})}`);
 }
 expect(solids).toHaveLength(9);
});

test('the belt and rails pass through open slots below the backing',()=>{
 const levels=[3.27,.12],solids=partitionSolids(levels),length=4*cabinetTrack.half+2*Math.PI*cabinetTrack.radius;
 for(let step=0;step<720;step++)for(const base of levels)for(const height of [.015,.045,.063])for(const offset of [-.63,-.59,0,.59,.63]){
  const pose=pathAt(step/720*length,cabinetTrack),point=[pose.x+Math.sin(pose.yaw)*offset,base+height,pose.z+Math.cos(pose.yaw)*offset];
  const collision=solids.find(solid=>point.every((value,axis)=>Math.abs(value-solid.center[axis])<solid.size[axis]/2-1e-9));
  if(collision)throw new Error(`Belt intersects ${collision.name}: ${JSON.stringify(point)}`);
 }
 expect(solids.length).toBeGreaterThan(0);
});
