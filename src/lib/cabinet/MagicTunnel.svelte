<script lang="ts">
 import {T} from '@threlte/core';
 import {track} from './conveyor';
 import type {LabMaterials} from './materials';
 let {base=0,height=2.82,materials}:{base?:number;height?:number;materials:LabMaterials}=$props();
 const rear=track.front-2*track.radius;
 // The catalogue substitution happens at x=0 on this straight rear run.
 // The shell has room for the complete box on both sides of that seam.
</script>
<T.Group position={[0,base,rear]}>
 <T.Mesh position={[0,height/2,.77]} material={materials.wood} castShadow receiveShadow><T.BoxGeometry args={[5.25,height,.17]}/></T.Mesh>
 <T.Mesh position={[0,height/2,-.77]} material={materials.wood} castShadow receiveShadow><T.BoxGeometry args={[5.25,height,.17]}/></T.Mesh>
 <T.Mesh position={[0,height+.045,0]} material={materials.wood} castShadow receiveShadow><T.BoxGeometry args={[5.55,.20,1.88]}/></T.Mesh>
 <T.Mesh position={[0,height+.17,0]} material={materials.trim} castShadow><T.BoxGeometry args={[5.72,.06,1.99]}/></T.Mesh>
 <T.Mesh position={[0,-.035,0]} material={materials.trim} receiveShadow><T.BoxGeometry args={[5.52,.13,1.85]}/></T.Mesh>
 <!-- Thin brass rails frame the solid cheeks, while both ends remain portals. -->
 {#each [-1,1] as side}
  <T.Mesh position={[0,.15,side*.867]} material={materials.brass}><T.BoxGeometry args={[5.1,.025,.02]}/></T.Mesh>
  <T.Mesh position={[0,height-.13,side*.867]} material={materials.brass}><T.BoxGeometry args={[5.1,.025,.02]}/></T.Mesh>
  {#each [-1,1] as end}
   <T.Mesh position={[end*2.52,height/2,side*.867]} material={materials.brass}><T.BoxGeometry args={[.032,height-.25,.025]}/></T.Mesh>
   <T.Mesh position={[end*2.66,height/2,side*.70]} material={materials.trim} castShadow><T.BoxGeometry args={[.18,height,.20]}/></T.Mesh>
   {#each [.25,height-.25] as y}<T.Mesh position={[end*2.37,y,side*.892]} material={materials.brass}><T.SphereGeometry args={[.034,12,8]}/></T.Mesh>{/each}
  {/each}
  <T.Mesh position={[0,height*.55,side*.875]} rotation.z={Math.PI/4} material={materials.brass}><T.TorusGeometry args={[.30,.022,8,4]}/></T.Mesh>
  <T.Mesh position={[0,height*.55,side*.88]} material={materials.brass}><T.SphereGeometry args={[.055,16,10]}/></T.Mesh>
 {/each}
 <!-- A dark liner gives the open ends depth without a screen-space cover. -->
 {#each [-1,1] as side}<T.Mesh position={[0,height/2,side*.668]} material={materials.dark}><T.BoxGeometry args={[5.10,height-.15,.025]}/></T.Mesh>{/each}
</T.Group>
