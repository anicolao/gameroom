import {BufferGeometry,Float32BufferAttribute} from 'three';
import {pathAt,track} from './conveyor';
export function beltGeometry(width=1.1,offset=0,layout=track){
 const perimeter=4*layout.half+2*Math.PI*layout.radius;
 const positions:number[]=[],uv:number[]=[],indices:number[]=[];const segments=240;
 for(let i=0;i<=segments;i++){
  const p=pathAt(i/segments*perimeter,layout);
  for(const sign of [-1,1]){positions.push(p.x+Math.sin(p.yaw)*(width/2*sign+offset),0,p.z+Math.cos(p.yaw)*(width/2*sign+offset));uv.push(i/segments,(sign+1)/2);}
  if(i<segments){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
 }
 const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(positions,3));g.setAttribute('uv',new Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
