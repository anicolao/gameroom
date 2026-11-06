<script lang="ts">
 import {T,useThrelte} from '@threlte/core';
 import {interactivity} from '@threlte/extras';
 import {onMount,onDestroy,tick,untrack} from 'svelte';
 import {Color,PMREMGenerator,Vector3,type WebGLRenderTarget} from 'three';
 import {HDRLoader} from 'three/examples/jsm/loaders/HDRLoader.js';
 import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
 import {boxesAt,catalogueBoxes,track,cabinetTrack,cabinetCarriers} from './conveyor';
 import type {CabinetGame} from './catalogue';
 import {beltGeometry} from './geometry';
 import {loadCabinetMaterials} from './materials';
 import CabinetCamera from './CabinetCamera.svelte';
 import GameBox from './GameBox.svelte';
 import MagicTunnel from './MagicTunnel.svelte';
 let {games,mode='lab',position=0,carriers=12,boxScale=1,rows=2,variant='wall',cutaway=false,yaw=10,elevation=12,zoom=1,orbit=false,compact=false,targetHeight=2.75,roomBackdrop=true,moving=false,selected='',warmth=1,onReady=()=>{},onError=()=>{},onStatus=()=>{},onSelect=()=>{}}:{games:readonly CabinetGame[];mode?:'lab'|'catalogue';position?:number;carriers?:number;boxScale?:number;rows?:number;variant?:'wall'|'magic'|'cabinet';cutaway?:boolean;yaw?:number;elevation?:number;zoom?:number;orbit?:boolean;compact?:boolean;targetHeight?:number;roomBackdrop?:boolean;moving?:boolean;selected?:string;warmth?:number;onReady?:()=>void;onError?:(error:unknown)=>void;onStatus?:(ready:boolean,targets:Record<string,{x:number;y:number}>)=>void;onSelect?:(id:string)=>void}=$props();
 const {scene,renderer,invalidate,camera,size}=useThrelte();interactivity();
 let library=$state.raw<Awaited<ReturnType<typeof loadCabinetMaterials>>>();
 let assetRevision=$state(0),motionRevision=$state(0),environmentReady=$state(false);
 const assets=new Map<string,boolean>(),motions=new Set<string>();
 function asset(key:string,ready:boolean|undefined){if(ready===undefined)assets.delete(key);else assets.set(key,ready);untrack(()=>assetRevision++);}
 function motion(key:string,active:boolean){if(motions.has(key)===active)return;if(active)motions.add(key);else motions.delete(key);untrack(()=>motionRevision++);}
 const tunnelHeight=$derived(Math.max(2.82,2.2*1.04*boxScale+.105+.23+.20));
 const rowPitch=$derived(variant==='magic'?Math.max(3.15,tunnelHeight+.32):3.15);
 const levels=$derived(Array.from({length:rows},(_,i)=>.12+(rows-1-i)*rowPitch));
 const laneBoxes=$derived(levels.map((_,row)=>mode==='lab'?boxesAt(games,position,carriers,row,variant==='cabinet'?cabinetTrack:track):catalogueBoxes(games,position,row)));
 // These are the projected centers of the actual meshes, also useful to native-input tests.
 $effect(()=>{
  void assetRevision;void motionRevision;void selected;void position;void yaw;void elevation;void zoom;void compact;void targetHeight;
  const boxes=laneBoxes,viewport=$size,view=$camera,ready=!!library&&environmentReady&&!moving&&motions.size===0&&assets.size===boxes.flat().length&&[...assets.values()].every(Boolean);
  onStatus(false,{});let cancelled=false;
  if(ready)void (async()=>{await tick();await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));if(cancelled)return;
   view.updateMatrixWorld();const targets:Record<string,{x:number;y:number}>={};
   boxes.forEach((lane,row)=>lane.forEach(box=>{if(box.yaw!==0||Math.abs(box.x)>4.9)return;const point=new Vector3(box.x,levels[row]+1.205,box.z).project(view);targets[box.game.id]={x:(point.x+1)*viewport.width/2,y:(1-point.y)*viewport.height/2};}));
   onStatus(true,targets);onReady();
  })();
  return()=>{cancelled=true;};
 });
 const block=(event:{stopPropagation:()=>void})=>event.stopPropagation();
 const deck=new RoundedBoxGeometry(11.45,.26,2.05,4,.085),front=new RoundedBoxGeometry(11.55,.22,.16,4,.055);
 const tracks=[undefined,cabinetTrack].map(layout=>({ribbon:beltGeometry(1.1,0,layout),bed:beltGeometry(1.26,0,layout),rail1:beltGeometry(.027,.59,layout),rail2:beltGeometry(.027,-.59,layout)}));
 const belt=$derived(tracks[variant==='cabinet'?1:0]);
 onMount(()=>{
  let disposed=false,environment:WebGLRenderTarget|undefined;
  scene.background=roomBackdrop?new Color('#182b24'):null;renderer.setClearColor('#182b24',roomBackdrop?1:0);renderer.toneMappingExposure=1.15;
  void Promise.all([loadCabinetMaterials(invalidate),new HDRLoader().loadAsync(`${import.meta.env.BASE_URL}materials/studio.hdr`)]).then(([lib,hdr])=>{
   if(disposed){lib.dispose();hdr.dispose();return;}
   const pmrem=new PMREMGenerator(renderer);environment=pmrem.fromEquirectangular(hdr);hdr.dispose();pmrem.dispose();scene.environment=environment.texture;scene.environmentIntensity=.42;
   library=lib;environmentReady=true;invalidate();
  }).catch(error=>{if(!disposed)onError(error);console.error('Shelf materials:',error);});
  return()=>{disposed=true;library?.dispose();environment?.dispose();};
 });
 $effect(()=>{const p=position,lib=library;if(lib){lib.rubber.offset.x=p*34/(mode==='catalogue'?cabinetCarriers:carriers);invalidate();}});
 onDestroy(()=>{[deck,front,...tracks.flatMap(t=>Object.values(t))].forEach(g=>g.dispose());});
</script>
<CabinetCamera {yaw} {elevation} {zoom} {orbit} {compact} {targetHeight} fitWidth={variant==='cabinet'?13.9:18.3}/>
<T.HemisphereLight args={['#eee9d6',variant==='cabinet'?'#392619':'#172b24',variant==='cabinet'?1.1:.65]}/>
{#if variant==='cabinet'}<T.DirectionalLight position={[0,4.5,10]} color="#ffe2bf" intensity={.8}/>{/if}
<T.DirectionalLight position={[-5,10,12]} color="#ffdfad" intensity={2.8*warmth} castShadow shadow.mapSize.width={4096} shadow.mapSize.height={4096} shadow.camera.left={-14} shadow.camera.right={14} shadow.camera.top={12} shadow.camera.bottom={-6} shadow.camera.near={1} shadow.camera.far={45} shadow.bias={-.00015} shadow.normalBias={.025} shadow.radius={3}/>
<T.DirectionalLight position={[8,6,5]} color="#bfd5df" intensity={.65}/>
{#if variant!=='cabinet'}
<T.PointLight position={[-4.8,6.15,1.8]} color="#ffc680" intensity={32*warmth} distance={12} decay={2}/>
<T.PointLight position={[4.8,6.15,1.8]} color="#ffc680" intensity={32*warmth} distance={12} decay={2}/>
{/if}
{#if library}
 {@const lib=library.materials}
 <!-- A real wall hides the return run; no clipping planes, fades or flat cabinet art. -->
 {#if roomBackdrop}
 <T.Mesh onclick={block} onpointerover={block} position={[0,3.2,-4.5]} material={lib.wall} receiveShadow><T.BoxGeometry args={[38,15,.25]}/></T.Mesh>
 <T.Mesh onclick={block} onpointerover={block} position={[0,-.82,0]} material={lib.trim} receiveShadow><T.BoxGeometry args={[38,.2,22]}/></T.Mesh>
 {/if}
 {#if !cutaway&&variant!=='magic'}
  <!-- The cabinet backing overlaps its side panels; the roof closes high-angle views. -->
  <T.Mesh onclick={block} onpointerover={block} position={[0,variant==='cabinet'?3.15:3.4,variant==='cabinet'?-.055:-1.0]} material={variant==='cabinet'?lib.wood:lib.wall} receiveShadow><T.BoxGeometry args={[variant==='cabinet'?13.5:10.9,variant==='cabinet'?7.5:9,variant==='cabinet'?.11:.34]}/></T.Mesh>
  {#if variant==='cabinet'}
   <T.Mesh onclick={block} onpointerover={block} position={[0,7.12,.2]} material={lib.wood} castShadow receiveShadow><T.BoxGeometry args={[13.6,.25,3.4]}/></T.Mesh>
   <T.Mesh onclick={block} onpointerover={block} position={[0,3.15,-1.4]} material={lib.trim} receiveShadow><T.BoxGeometry args={[13.5,7.7,.18]}/></T.Mesh>
   {#each [-1,1] as side}<T.Mesh onclick={block} onpointerover={block} position={[side*6.65,3.15,.2]} material={lib.wood} castShadow receiveShadow><T.BoxGeometry args={[.20,7.7,3.2]}/></T.Mesh>{/each}
  {/if}
  {#each [-1,1] as side}
   <T.Mesh onclick={block} onpointerover={block} position={[side*(variant==='cabinet'?5.9:6.95),variant==='cabinet'?3.15:3.3,1.24]} material={variant==='cabinet'?lib.wood:lib.wall} receiveShadow castShadow><T.BoxGeometry args={[variant==='cabinet'?1.7:3,variant==='cabinet'?7.5:8.5,.42]}/></T.Mesh>
   {#if roomBackdrop&&variant!=='cabinet'}<T.Mesh onclick={block} onpointerover={block} position={[side*10.5,3.3,-.65]} material={lib.wall} receiveShadow><T.BoxGeometry args={[4.15,8.5,.45]}/></T.Mesh>{/if}
   <T.Mesh onclick={block} onpointerover={block} position={[side*(variant==='cabinet'?5.09:5.49),3.3,1.48]} material={variant==='cabinet'?lib.trim:lib.brass}><T.BoxGeometry args={[.032,8.3,.024]}/></T.Mesh>
   <!-- Interior returns around the two horizontal mouths, leaving real clearance. -->
   {#each [{y:-.48,h:.75},{y:2.89,h:.48},variant==='cabinet'?{y:6.35,h:1.5}:{y:6.5,h:1.55}] as jamb}
    <T.Mesh onclick={block} onpointerover={block} position={[side*(variant==='cabinet'?5.08:5.48),jamb.y,.14]} material={lib.trim} castShadow receiveShadow><T.BoxGeometry args={[.15,jamb.h,2.35]}/></T.Mesh>
   {/each}
   {#if variant!=='cabinet'}{#each levels as level}
    <T.Mesh onclick={block} onpointerover={block} position={[side*6.4,level+1.13,-.8]} material={lib.dark}><T.BoxGeometry args={[1.8,2.5,.08]}/></T.Mesh>
   {/each}{/if}
  {/each}
  <T.Mesh onclick={block} onpointerover={block} position={[0,6.8,1.22]} material={lib.wood} castShadow><T.BoxGeometry args={[variant==='cabinet'?13.5:17.2,.32,.6]}/></T.Mesh>
  <T.Mesh onclick={block} onpointerover={block} position={[0,6.99,1.22]} material={lib.trim}><T.BoxGeometry args={[variant==='cabinet'?13.7:17.65,.10,.73]}/></T.Mesh>
  <T.Mesh onclick={block} onpointerover={block} position={[0,6.6,1.46]} material={variant==='cabinet'?lib.trim:lib.brass}><T.BoxGeometry args={[variant==='cabinet'?13.3:16.8,.025,.05]}/></T.Mesh>
  <T.Mesh onclick={block} onpointerover={block} position={[0,-.51,1.32]} material={lib.wood} receiveShadow><T.BoxGeometry args={[variant==='cabinet'?13.5:17.2,.25,.35]}/></T.Mesh>
 {:else}
  <!-- Structural feet keep the cutaway readable while the hidden loop is exposed. -->
  {#each [-1,1] as side}<T.Mesh onclick={block} onpointerover={block} position={[side*5.25,2.6,-1.05]} material={lib.trim}><T.BoxGeometry args={[.14,6.6,.14]}/></T.Mesh>{/each}
 {/if}
 {#each levels as base,row}
  <T.Mesh onclick={block} onpointerover={block} geometry={deck} material={lib.wood} position={[0,base-.105,.08]} castShadow receiveShadow/>
  <T.Mesh onclick={block} onpointerover={block} geometry={front} material={lib.wood} position={[0,base-.07,1.04]} castShadow receiveShadow/>
  <T.Mesh onclick={block} onpointerover={block} position={[0,base-.105,1.132]} material={lib.brass}><T.BoxGeometry args={[11.2,.023,.02]}/></T.Mesh>
  <T.Mesh onclick={block} onpointerover={block} geometry={belt.bed} material={lib.trim} position.y={base+.015} receiveShadow/>
  <T.Mesh onclick={block} onpointerover={block} geometry={belt.ribbon} material={lib.belt} position.y={base+.045} receiveShadow/>
  <T.Mesh onclick={block} onpointerover={block} geometry={belt.rail1} material={lib.brass} position.y={base+.063}/>
  <T.Mesh onclick={block} onpointerover={block} geometry={belt.rail2} material={lib.brass} position.y={base+.063}/>
  {#each laneBoxes[row] as box (box.key)}
   <GameBox game={box.game} x={box.x} z={box.z} yaw={box.yaw} {base} scale={boxScale} selected={selected===box.game.id} {library} {onSelect} onAsset={ready=>asset(`${row}:${box.key}`,ready)} onMoving={active=>motion(`${row}:${box.key}`,active)}/>
  {/each}
  {#if variant==='magic'&&!cutaway}<MagicTunnel {base} height={tunnelHeight} materials={lib}/>{/if}
  {#if cutaway||variant==='magic'}
   {#each [-1,1] as side}
    <T.Mesh onclick={block} onpointerover={block} position={[side*5.2,base-.09,-.97]} rotation.z={Math.PI/2} material={lib.brass}><T.CylinderGeometry args={[.42,.42,.1,40]}/></T.Mesh>
   {/each}
  {/if}
 {/each}
 {#if variant!=='cabinet'}
 {#each [-1,1] as side}
  <T.Group position={[side*8.0,5.2,1.85]}>
   <T.Mesh onclick={block} onpointerover={block} rotation.x={Math.PI/2} material={lib.brass}><T.CylinderGeometry args={[.21,.21,.18,32]}/></T.Mesh>
   <T.Mesh onclick={block} onpointerover={block} position={[0,.36,.14]} material={lib.bulb}><T.SphereGeometry args={[.115,24,16]}/></T.Mesh>
   <T.Mesh onclick={block} onpointerover={block} position={[0,.55,.14]} material={lib.brass}><T.ConeGeometry args={[.48,.30,40,1,true]}/></T.Mesh>
   <T.PointLight position={[0,.35,.4]} color="#ffd391" intensity={12*warmth} distance={7}/>
  </T.Group>
 {/each}
 {/if}
{/if}
