/** Presentation-only motion. A closed racetrack has its seam behind the wall. */
import type {CabinetGame} from './catalogue';
export const track={half:5.2,radius:1.32,front:.35};
export const perimeter=4*track.half+2*Math.PI*track.radius;
export const seam=3*track.half+Math.PI*track.radius;
export const mod=(n:number,d:number)=>((n%d)+d)%d;
export function pathAt(distance:number){
 const s=mod(distance,perimeter),straight=2*track.half,curve=Math.PI*track.radius;
 if(s<straight)return {x:s-track.half,z:track.front,yaw:0};
 if(s<straight+curve){const a=(s-straight)/track.radius;return {x:track.half+Math.sin(a)*track.radius,z:track.front-track.radius+Math.cos(a)*track.radius,yaw:a};}
 if(s<2*straight+curve)return {x:track.half-(s-straight-curve),z:track.front-2*track.radius,yaw:Math.PI};
 const a=(s-2*straight-curve)/track.radius;return {x:-track.half-Math.sin(a)*track.radius,z:track.front-track.radius-Math.cos(a)*track.radius,yaw:Math.PI+a};
}
export function boxesAt(games:readonly CabinetGame[],position:number,carriers=12,row=0){
 const last=Math.floor(position),pitch=perimeter/carriers;
 return Array.from({length:carriers},(_,j)=>{
  const index=last-carriers+1+j;
  return {key:index,game:games[mod(index+row*4+carriers/2,games.length)],...pathAt((index-position)*pitch+seam)};
 });
}
export function positionForGame(games:readonly CabinetGame[],id:string,position:number,carriers:number){
 const index=games.findIndex(game=>game.id===id)-carriers/2,pitch=perimeter/carriers;
 const atFront=mod(track.half-seam,perimeter)/pitch-carriers;
 return index+Math.round((position+atFront-index)/games.length)*games.length-atFront;
}
export function spring(position:number,velocity:number,target:number,dt:number,response:number){
 const e=Math.exp(-response*dt),offset=position-target,t=(velocity+response*offset)*dt;
 return {position:target+(offset+t)*e,velocity:(velocity-response*t)*e};
}

/** Fixed-size virtual window. New faces enter at a seam on the hidden rear run. */
export function catalogueBoxes(games:readonly CabinetGame[],position:number,row:number){
 const middle=Math.ceil(games.length/2),offset=row?middle:0,count=row?games.length-middle:middle,pitch=perimeter/12;
 if(games.length<=8)return Array.from({length:count},(_,index)=>({key:games[offset+index].id,game:games[offset+index],x:(index-(count-1)/2)*pitch,z:track.front,yaw:0,front:true}));
 const first=Math.floor(position)-5,start=track.half-1.5*pitch;
 return Array.from({length:12},(_,i)=>first+i).filter(i=>i>=0&&i<count).map(index=>{
  const pose=pathAt((index-position)*pitch+start);
  return {key:games[offset+index].id,game:games[offset+index],...pose,front:pose.yaw===0&&Math.abs(pose.x)<5};
 });
}
export function accessibleGames(games:readonly CabinetGame[],position:number){
 return [0,1].flatMap(row=>catalogueBoxes(games,position,row).filter(box=>box.front).map(box=>box.game));
}
