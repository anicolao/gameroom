/** Solid walnut around real corner openings, shared by rendering and clearance tests. */
export type CabinetSolid={name:string;center:[number,number,number];size:[number,number,number]};
export const partition={halfWidth:4.2,outer:6.55,front:-.08,depth:.3,bottom:-.6,top:6.9};
export function cornerOpenings(levels:readonly number[]){
 return [...levels].sort((a,b)=>a-b).map(base=>({bottom:base+.005,top:base+2.7}));
}
function gapsBetween(openings:readonly {bottom:number;top:number}[]){
 const gaps:{y:number;h:number}[]=[];let bottom=partition.bottom;
 for(const opening of openings){
  if(opening.bottom>bottom)gaps.push({y:(bottom+opening.bottom)/2,h:opening.bottom-bottom});
  bottom=opening.top;
 }
 if(bottom<partition.top)gaps.push({y:(bottom+partition.top)/2,h:partition.top-bottom});
 return gaps;
}
export function partitionGaps(levels:readonly number[]){return gapsBetween(cornerOpenings(levels));}
export function partitionSolids(levels:readonly number[]):CabinetSolid[]{
 const z=partition.front-partition.depth/2,width=partition.outer-partition.halfWidth;
 // Both straight belt runs pass through the narrow slots below the central panel.
 const belts=[...levels].sort((a,b)=>a-b).map(base=>({bottom:base+.005,top:base+.085}));
 return [...gapsBetween(belts).map((gap,index)=>({name:`central backing ${index}`,center:[0,gap.y,z] as [number,number,number],size:[partition.halfWidth*2,gap.h,partition.depth] as [number,number,number]})),
  ...[-1,1].flatMap(side=>partitionGaps(levels).map((gap,index)=>({name:`corner border ${side}:${index}`,center:[side*(partition.halfWidth+width/2),gap.y,z] as [number,number,number],size:[width,gap.h,partition.depth] as [number,number,number]})))];
}
/** Return copies sit on the belt; selection lift eases away before either bend. */
export function cabinetLift(x:number,yaw:number,lift:number){
 return yaw===0?lift*Math.max(0,Math.min(1,(4.8-Math.abs(x))/.8)):0;
}
