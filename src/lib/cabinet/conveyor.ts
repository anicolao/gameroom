/** Presentation-only motion. A closed racetrack has its seam behind the wall. */
import type {CabinetGame} from './catalogue';
export const track={half:5.2,radius:1.32,front:.35};
export const cabinetTrack={...track,radius:.62};
export const cabinetPerimeter=4*cabinetTrack.half+2*Math.PI*cabinetTrack.radius;
export const cabinetCarriers=8;
export const perimeter=4*track.half+2*Math.PI*track.radius;
export const seam=3*track.half+Math.PI*track.radius;
export const mod=(n:number,d:number)=>((n%d)+d)%d;
export function pathAt(distance:number,layout=track){
 const track=layout,length=4*track.half+2*Math.PI*track.radius;
 const s=mod(distance,length),straight=2*track.half,curve=Math.PI*track.radius;
 if(s<straight)return {x:s-track.half,z:track.front,yaw:0};
 if(s<straight+curve){const a=(s-straight)/track.radius;return {x:track.half+Math.sin(a)*track.radius,z:track.front-track.radius+Math.cos(a)*track.radius,yaw:a};}
 if(s<2*straight+curve)return {x:track.half-(s-straight-curve),z:track.front-2*track.radius,yaw:Math.PI};
 const a=(s-2*straight-curve)/track.radius;return {x:-track.half-Math.sin(a)*track.radius,z:track.front-track.radius-Math.cos(a)*track.radius,yaw:Math.PI+a};
}
export function boxesAt(games:readonly CabinetGame[],position:number,carriers=12,row=0,layout=track){
 const length=4*layout.half+2*Math.PI*layout.radius,seam=3*layout.half+Math.PI*layout.radius;
 const last=Math.floor(position),pitch=length/carriers;
 return Array.from({length:carriers},(_,j)=>{
  const index=last-carriers+1+j;
  return {key:index,game:games[mod(index+row*4+carriers/2,games.length)],...pathAt((index-position)*pitch+seam,layout)};
 });
}
export function positionForGame(games:readonly CabinetGame[],id:string,position:number,carriers:number,layout=track){
 const perimeter=4*layout.half+2*Math.PI*layout.radius,seam=3*layout.half+Math.PI*layout.radius;
 const index=games.findIndex(game=>game.id===id)-carriers/2,pitch=perimeter/carriers;
 const atFront=mod(layout.half-seam,perimeter)/pitch-carriers;
 return index+Math.round((position+atFront-index)/games.length)*games.length-atFront;
}
export function spring(position:number,velocity:number,target:number,dt:number,response:number){
 const e=Math.exp(-response*dt),offset=position-target,t=(velocity+response*offset)*dt;
 return {position:target+(offset+t)*e,velocity:(velocity-response*t)*e};
}

/** Double a shelf's sequence until it fills the loop; virtualize the repeated copies. */
export function carouselLength(count:number){
 if(count===0)return 0;
 let length=count;while(length<cabinetCarriers)length*=2;return length;
}
export function catalogueBoxes(games:readonly CabinetGame[],position:number,row:number,rows=2){
 const size=Math.floor(games.length/rows),extra=games.length%rows;
 const offset=row*size+Math.min(row,extra),count=size+(row<extra?1:0);
 const length=carouselLength(count);if(!length)return [];
 const pitch=cabinetPerimeter/cabinetCarriers,first=Math.floor(position)-3,start=track.half-pitch;
 return Array.from({length:cabinetCarriers},(_,i)=>first+i).map(index=>{
  const pose=pathAt((index-position)*pitch+start,cabinetTrack);
  return {key:index,game:games[offset+mod(index,length)%count],...pose,front:pose.yaw===0&&Math.abs(pose.x)<5};
 });
}
/** Repeated physical boxes retain one semantic choice per catalog document. */
export function accessibleGames(games:readonly CabinetGame[],position:number,rows=2){
 return [...new Map(Array.from({length:rows},(_,row)=>row).flatMap(row=>catalogueBoxes(games,position,row,rows).filter(box=>box.front).map(box=>[box.game.id,box.game] as const))).values()];
}
