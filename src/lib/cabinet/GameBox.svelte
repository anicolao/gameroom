<script lang="ts">
 import {T,useTask} from '@threlte/core';
 import {onDestroy} from 'svelte';
 import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
 import {materialKey,type CabinetGame} from './catalogue';
 import type {MaterialLibrary} from './materials';
 let {game,x,z,yaw,base=0,scale=1,selected=false,library,onSelect=()=>{},onAsset=()=>{},onMoving=()=>{}}:{game:CabinetGame;x:number;z:number;yaw:number;base?:number;scale?:number;selected?:boolean;library:MaterialLibrary;onSelect?:(id:string)=>void;onAsset?:(ready:boolean|undefined)=>void;onMoving?:(moving:boolean)=>void}=$props();
 let hover=$state(false),lift=$state(0),lease=$state.raw<ReturnType<MaterialLibrary['acquire']>>();
 let lastMoving=false;
 const body=new RoundedBoxGeometry(1.65,2.2,.58,3,.045),lip=new RoundedBoxGeometry(1.61,2.16,.075,2,.018);
 const variation=$derived(game.artKey==='gotfive'?.91:game.artKey==='pantheon'?1.04:1);
 const signature=$derived(materialKey(game));
 $effect(()=>{
  void signature;let live=true;const resource=library.acquire(game);lease=resource;onAsset(false);
  void resource.ready.then(()=>{if(live)onAsset(true);});
  return()=>{live=false;resource.release();onAsset(undefined);};
 });
 useTask(delta=>{
  const goal=selected?.23:hover?.09:0,next=goal+(lift-goal)*Math.exp(-14*delta),moving=Math.abs(next-goal)>=.0002;
  if(moving!==lastMoving){lastMoving=moving;onMoving(moving);}
  if(!moving){if(lift!==goal)lift=goal;}else lift=next;
 },{autoInvalidate:false});
 onDestroy(()=>{onMoving(false);body.dispose();lip.dispose();});
</script>
{#if lease}
<T.Group position={[x,base+.105+lift,z+lift*.8]} rotation.y={yaw+(selected?-.045:0)} scale={scale*variation}>
 <T.Mesh geometry={lip} material={library.materials.cardboard} position={[0,1.1,-.315]} castShadow dispose={false}/>
 <T.Mesh position={[0,1.1,-.357]} rotation.y={Math.PI} material={lease.materials[5]} dispose={false}><T.PlaneGeometry args={[1.55,2.10]}/></T.Mesh>
 <T.Mesh name={`game:${game.id}`} geometry={body} material={lease.materials} position.y={1.1} castShadow receiveShadow dispose={false}
  onpointerenter={()=>hover=true} onpointerleave={()=>hover=false}
  onclick={(event:{stopPropagation:()=>void})=>{event.stopPropagation();onSelect(game.id);}}/>
</T.Group>
{/if}
