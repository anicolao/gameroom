<script lang="ts">
 import {onMount} from 'svelte';
 import {Canvas} from '@threlte/core';
 import {ACESFilmicToneMapping,PCFShadowMap} from 'three';
 import ShelfScene from '../lib/cabinet/CabinetScene.svelte';
 import {games,cabinetFixtures,mod,positionForGame,spring} from './conveyor';
 const params=new URLSearchParams(location.search);
 function number(key:string,fallback:number,min:number,max:number){const n=Number(params.get(key)??fallback);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;}
 const initialVariant=params.get('variant')==='magic'?'magic':params.get('variant')==='cabinet'?'cabinet':'wall';
 let variant=$state<'wall'|'magic'|'cabinet'>(initialVariant);
 const initialPosition=number('position',.5,-10000,10000);
 let cursor=$state(initialPosition),target=$state(initialPosition),velocity=0;
 let running=$state(false),speed=$state(number('speed',.65,.1,2)),settle=$state(number('settle',.8,.2,2));
 let carriers=$state(Math.round(number('carriers',12,10,14)/2)*2),rows=$state(Math.round(number('rows',2,1,2))),boxScale=$state(number('size',1,.75,1.25));
 let cutaway=$state(params.get('cutaway')==='1'),orbit=$state(false),yaw=$state(number('yaw',initialVariant==='magic'?25:10,-55,55)),elevation=$state(number('elevation',initialVariant==='magic'?32:12,0,65)),zoom=$state(number('zoom',initialVariant==='magic'?.9:1,.7,1.6)),warmth=$state(number('light',1,.4,1.7));
 let quality=$state('native'),focus=$state(false),ready=$state(false),failure=$state(''),selected=$state('cribbage'),copied=$state(false);
 let stage:HTMLDivElement,dragging=false,dragged=false,startX=0,startTarget=0;
 const phase=$derived(cursor>0&&cursor%16===0?16:mod(cursor,16));
 const selectedGame=$derived(games.find(g=>g.id===selected)??games[0]);
 const dpr=$derived(quality==='native'?Math.min(window.devicePixelRatio,2):Number(quality));
 function step(n:number){running=false;target+=n;}
 function play(){if(running){target=cursor;velocity=0;}running=!running;}
 function scrub(value:number){running=false;cursor=target=value;velocity=0;}
 function choose(id:string){selected=id;running=false;target=positionForGame(id,cursor,carriers);}
 function view(preset:string){orbit=false;if(preset==='front'){yaw=0;elevation=5;zoom=1;cutaway=false;}else if(preset==='cutaway'){yaw=25;elevation=35;zoom=.9;cutaway=true;}else{yaw=10;elevation=12;zoom=1;cutaway=false;}}
 function chooseVariant(value:'wall'|'magic'|'cabinet'){variant=value;orbit=false;cutaway=false;yaw=value==='magic'?25:10;elevation=value==='magic'?32:12;zoom=value==='magic'?.9:1;}
 function reset(){running=false;cursor=target=.5;velocity=0;carriers=12;rows=2;boxScale=1;speed=.65;settle=.8;warmth=1;selected='cribbage';chooseVariant(variant);}
 async function copySetup(){const url=new URL(location.href);url.search='';for(const [k,v] of Object.entries({variant,position:cursor.toFixed(3),speed,settle,carriers,rows,size:boxScale,cutaway:cutaway?1:0,yaw,elevation,zoom,light:warmth}))url.searchParams.set(k,String(v));history.replaceState(null,'',url);try{await navigator.clipboard.writeText(url.href);copied=true;}catch{copied=false;}}
 onMount(()=>{
  let last=performance.now(),raf=0;
  const tick=(now:number)=>{
   const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;
   if(!document.hidden){
    if(running)target+=dt*speed;
    if(Math.abs(cursor-target)>.00001||Math.abs(velocity)>.00001){const state=spring(cursor,velocity,target,dt,6/settle);cursor=state.position;velocity=state.velocity;if(Math.abs(cursor-target)<.00001&&Math.abs(velocity)<.00001){cursor=target;velocity=0;}}
   }
   raf=requestAnimationFrame(tick);
  };raf=requestAnimationFrame(tick);
  const wheel=(event:WheelEvent)=>{
   if(orbit||!(event.target instanceof HTMLCanvasElement))return;
   event.preventDefault();running=false;
   const delta=(Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY)*(event.deltaMode===1?16:event.deltaMode===2?stage.clientHeight:1);
   target+=Math.max(-180,Math.min(180,delta))*.006;
  };
  const down=(event:PointerEvent)=>{
   if(orbit||event.button!==0||!(event.target instanceof HTMLCanvasElement))return;
   dragged=false;dragging=true;startX=event.clientX;startTarget=target;
   event.target.setPointerCapture(event.pointerId);
  };
  const move=(event:PointerEvent)=>{if(!dragging)return;const dx=event.clientX-startX;if(Math.abs(dx)>6){dragged=true;running=false;target=startTarget-dx*8/Math.max(1,stage.clientWidth);}};
  const up=()=>dragging=false;
  const key=(event:KeyboardEvent)=>{if((event.target as HTMLElement).closest('input,select,button,a'))return;if(event.code==='Space'){event.preventDefault();play();}else if(event.key==='ArrowRight'){event.preventDefault();step(1);}else if(event.key==='ArrowLeft'){event.preventDefault();step(-1);}else if(event.key==='Escape'){focus=false;orbit=false;}};
  stage.addEventListener('wheel',wheel,{passive:false});stage.addEventListener('pointerdown',down);stage.addEventListener('pointermove',move);stage.addEventListener('pointerup',up);stage.addEventListener('pointercancel',up);window.addEventListener('keydown',key);
  return()=>{cancelAnimationFrame(raf);stage.removeEventListener('wheel',wheel);stage.removeEventListener('pointerdown',down);stage.removeEventListener('pointermove',move);stage.removeEventListener('pointerup',up);stage.removeEventListener('pointercancel',up);window.removeEventListener('keydown',key);};
 });
</script>
<svelte:head><title>Shelf conveyor · Gameroom animation lab</title><meta name="robots" content="noindex"/></svelte:head>
<div class="shelf-lab" class:focused={focus}>
 <header class="lab-header">
  <div><small>GAMEROOM / LOCAL STUDY</small><h1>Shelf conveyor</h1></div>
  <div class="lab-header-actions"><span class="lab-status"><i class:ready></i>{failure?'Renderer unavailable':ready?'Live 3D':'Loading materials'}</span><button onclick={copySetup}>{copied?'Link copied':'Copy setup link'}</button><button onclick={()=>focus=true}>Hide controls ↗</button></div>
 </header>
 <div class="lab-workspace">
  <div class="lab-stage" class:orbit bind:this={stage}>
   <svelte:boundary onerror={(error)=>{failure=String(error);console.error(error);}}>
    <Canvas {dpr} shadows={PCFShadowMap} toneMapping={ACESFilmicToneMapping} renderMode="on-demand">
     <ShelfScene games={cabinetFixtures} {variant} position={cursor} {carriers} {boxScale} {rows} {cutaway} {yaw} {elevation} {zoom} {orbit} {warmth} {selected} onSelect={id=>{if(!dragged)selected=id;}} onReady={()=>ready=true}/>
    </Canvas>
    {#snippet failed()}<div class="lab-loading">WebGL couldn’t start. Try enabling hardware acceleration.</div>{/snippet}
   </svelte:boundary>
   <div class="lab-vignette"></div>
   {#if !ready&&!failure}<div class="lab-loading">Preparing walnut, paper and brass…</div>{/if}
   <div class="lab-stage-label"><span>{variant==='magic'?(cutaway?'MAGIC TUNNEL / COVER REMOVED':'MAGIC TUNNEL / SWAP CONCEALED'):cutaway?'CUTAWAY / RETURN LOOP EXPOSED':variant==='cabinet'?'CABINET / RETURN LOOP ENCLOSED':'WALL VIEW / RETURN LOOP CONCEALED'}</span><span>{orbit?'Drag to orbit · Wheel to zoom':'Wheel or drag to browse · Click a box to lift it'}</span></div>
   <div class="lab-selected" aria-live="polite"><span>SELECTED</span><strong>{selectedGame.title}</strong></div>
   {#if focus}<button class="lab-return" onclick={()=>focus=false}>← Lab controls</button>{/if}
  </div>
  <aside class="lab-controls" aria-label="Animation lab controls">
   <section><h2>Mechanism</h2>
    <label>Study version<select aria-label="Study version" value={variant} onchange={event=>chooseVariant(event.currentTarget.value as typeof variant)}><option value="wall">Original wall</option><option value="magic">Exposed track · magic tunnel</option><option value="cabinet">Enclosed cabinet</option></select></label>
    <label class="lab-check"><input type="checkbox" bind:checked={cutaway}/> {variant==='magic'?'Remove tunnel cover':'Reveal behind the wall'}</label>
    <label class="lab-check"><input type="checkbox" bind:checked={orbit}/> Orbit camera</label>
    <label>Visible shelves<select aria-label="Visible shelves" bind:value={rows}><option value={1}>One</option><option value={2}>Two</option></select></label>
    <label>Spacing<select aria-label="Carrier spacing" bind:value={carriers}><option value={10}>Airy · 10 carriers</option><option value={12}>Balanced · 12 carriers</option><option value={14}>Close · 14 carriers</option></select></label>
    <label>Box size <output>{Math.round(boxScale*100)}%</output><input aria-label="Box size" type="range" min=".75" max="1.25" step=".01" bind:value={boxScale}/></label>
   </section>
   <section><h2>Motion</h2>
    <label>Belt speed <output>{speed.toFixed(2)} boxes/s</output><input aria-label="Belt speed" type="range" min=".1" max="2" step=".05" bind:value={speed}/></label>
    <label>Coast <output>{settle.toFixed(2)} s</output><input aria-label="Coast duration" type="range" min=".2" max="2" step=".05" bind:value={settle}/></label>
    <div class="lab-step-buttons"><button onclick={()=>step(-4)}>← 4 games</button><button onclick={()=>step(4)}>4 games →</button></div>
   </section>
   <section><h2>View</h2>
    <div class="lab-presets"><button onclick={()=>view('front')}>Front</button><button onclick={()=>view('room')}>Room</button><button onclick={()=>view('cutaway')}>Cutaway</button></div>
    <label>Turn <output>{yaw.toFixed(0)}°</output><input aria-label="Camera turn" type="range" min="-55" max="55" step="1" bind:value={yaw}/></label>
    <label>Elevation <output>{elevation.toFixed(0)}°</output><input aria-label="Camera elevation" type="range" min="0" max="65" step="1" bind:value={elevation}/></label>
    <label>Zoom <output>{zoom.toFixed(2)}×</output><input aria-label="Camera zoom" type="range" min=".7" max="1.6" step=".02" bind:value={zoom}/></label>
    <label>Light <output>{warmth.toFixed(2)}×</output><input aria-label="Light level" type="range" min=".4" max="1.7" step=".05" bind:value={warmth}/></label>
    <label>Render density<select aria-label="Render density" bind:value={quality}><option value="native">Device · up to 2×</option><option value="1">1×</option><option value="2">2×</option></select></label>
   </section>
   <section><h2>Bring a box forward</h2><div class="lab-game-list">{#each games as game}<button aria-pressed={selected===game.id} class:chosen={selected===game.id} onclick={()=>choose(game.id)}><i style:background={game.color}></i>{game.title}</button>{/each}</div></section>
   <footer><button onclick={reset}>Reset study</button><p>Local fixture. No room or catalog connection.</p></footer>
  </aside>
 </div>
 <div class="lab-transport">
  <button class="lab-play" onclick={play} aria-label={running?'Pause conveyor':'Run conveyor'}>{running?'Ⅱ Pause':'▶ Run'}</button>
  <button onclick={()=>step(-1)} aria-label="Previous game">←</button><button onclick={()=>step(1)} aria-label="Next game">→</button>
  <label class="lab-scrub"><span>Position <output>{phase.toFixed(2)}</output></span><input aria-label="Scrub conveyor" type="range" min="0" max="16" step=".005" value={phase} oninput={event=>scrub(event.currentTarget.valueAsNumber)}/></label>
  <span class="lab-shortcuts">Space: run / pause<br>← →: one box</span>
 </div>
</div>
