<script lang="ts">
 import {onMount} from 'svelte';
 import {Canvas} from '@threlte/core';
 import {ACESFilmicToneMapping,PCFShadowMap} from 'three';
 import CabinetScene from './CabinetScene.svelte';
 import {accessibleGames,spring} from './conveyor';
 import {scrollLimit,type CabinetGame} from './catalogue';
 let {games,selected='',empty='No matching games',onSelect}:{games:readonly CabinetGame[];selected?:string;empty?:string;onSelect:(id:string)=>void}=$props();
 let stage:HTMLDivElement,position=$state(0),target=$state(0),velocity=0,ready=$state(false),failure=$state(false),compact=$state(false);
 let targets=$state<Record<string,{x:number;y:number}>>({});
 let dragging=false,dragged=false,startX=0,startY=0,startTarget=0;
 const limit=$derived(scrollLimit(games)),moving=$derived(position!==target),front=$derived(accessibleGames(games,position));
 const identity=$derived(games.map(g=>g.id).join('\0'));
 $effect(()=>{void identity;position=target=0;velocity=0;ready=false;});
 function move(value:number){ready=false;target=Math.max(0,Math.min(limit,value));}
 function select(id:string){if(!dragged)onSelect(id);}
 onMount(()=>{
  const query=matchMedia('(max-width:650px)'),resize=()=>compact=query.matches;resize();query.addEventListener('change',resize);
  let raf=0,last=performance.now();
  const animate=(now:number)=>{const dt=Math.min(.05,(now-last)/1000);last=now;if(position!==target||velocity){const next=spring(position,velocity,target,dt,9);velocity=next.velocity;position=next.position;if(Math.abs(position-target)<1e-5&&Math.abs(velocity)<1e-5){position=target;velocity=0;}}raf=requestAnimationFrame(animate);};raf=requestAnimationFrame(animate);
  const wheel=(event:WheelEvent)=>{if(!limit||!(event.target instanceof HTMLCanvasElement))return;event.preventDefault();const delta=(Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY)*(event.deltaMode===1?16:event.deltaMode===2?stage.clientHeight:1);move(target+Math.max(-180,Math.min(180,delta))*.008);};
  const down=(event:PointerEvent)=>{if(event.button!==0||!(event.target instanceof HTMLCanvasElement))return;dragging=true;dragged=false;startX=event.clientX;startY=event.clientY;startTarget=target;event.target.setPointerCapture(event.pointerId);};
  const motion=(event:PointerEvent)=>{if(!dragging)return;const dx=event.clientX-startX,dy=event.clientY-startY;if(Math.abs(dx)>8&&Math.abs(dx)>Math.abs(dy)*1.2){dragged=true;move(startTarget-dx*8/Math.max(1,stage.clientWidth));}};
  const up=()=>{dragging=false;if(dragged)move(Math.round(target));};
  stage.addEventListener('wheel',wheel,{passive:false});stage.addEventListener('pointerdown',down);stage.addEventListener('pointermove',motion);stage.addEventListener('pointerup',up);stage.addEventListener('pointercancel',up);
  return()=>{cancelAnimationFrame(raf);query.removeEventListener('change',resize);stage.removeEventListener('wheel',wheel);stage.removeEventListener('pointerdown',down);stage.removeEventListener('pointermove',motion);stage.removeEventListener('pointerup',up);stage.removeEventListener('pointercancel',up);};
 });
</script>
<div class="cabinet-stage" role="region" aria-label="Game cabinet" bind:this={stage} data-testid="cabinet" data-ready={ready} data-motion-idle={!moving} data-position={position} data-target={target} data-targets={JSON.stringify(targets)}>
 <svelte:boundary onerror={error=>{failure=true;console.error(error);}}>
  <Canvas dpr={Math.min(window.devicePixelRatio,2)} shadows={PCFShadowMap} toneMapping={ACESFilmicToneMapping} renderMode="on-demand">
   <CabinetScene {games} {selected} position={position} {moving} {compact} onError={()=>failure=true} mode="catalogue" variant="cabinet" roomBackdrop={false} yaw={compact?0:10} elevation={compact?8:12} onSelect={select} onStatus={(value,points)=>{ready=value;targets=points;}}/>
  </Canvas>
  {#snippet failed()}<p class="cabinet-message">3D shelves unavailable. Choose a game below.</p>{/snippet}
 </svelte:boundary>
 {#if !games.length}<p class="cabinet-message">{empty}</p>{/if}
 {#if !ready&&!failure&&games.length}<span class="cabinet-loading" aria-hidden="true">Loading shelves…</span>{/if}
 <div class="cabinet-keyboard" class:fallback={failure} aria-label="Games on these shelves">
  {#each failure?games:front as game (game.id)}<button data-game-id={game.id} aria-label={`Select ${game.title}`} aria-pressed={selected===game.id} onclick={()=>onSelect(game.id)}>{game.title}</button>{/each}
 </div>
 {#if limit>0}
  <nav class="cabinet-browse" aria-label="Browse catalog">
   <button aria-label="Previous games" disabled={target===0} onclick={()=>move(Math.ceil(target)-1)}>←</button>
   <input aria-label="Browse game shelves" type="range" min="0" max={limit} step="1" value={target} oninput={event=>move(event.currentTarget.valueAsNumber)}/>
   <button aria-label="Next games" disabled={target===limit} onclick={()=>move(Math.floor(target)+1)}>→</button>
  </nav>
 {/if}
</div>
