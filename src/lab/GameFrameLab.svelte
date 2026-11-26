<script lang="ts">
 import {onMount, tick} from 'svelte';
 import type {Game} from '../lib/catalog';
 let {game}: {game:Game|undefined}=$props();
 let framed=$state<{title:string,url:string}|null>(null);
 let minimized=$state(false),menuOpen=$state(false);
 let panel=$state<HTMLDialogElement>();
 let frame=$state<HTMLIFrameElement>();
 let launchButton=$state<HTMLButtonElement>(),menuButton=$state<HTMLButtonElement>();
 const visible=$derived(Boolean(framed&&!minimized));
 function open(){
  if(!game)return;
  // A manual local study, not a capability declaration or group launch.
  framed={title:game.title,url:game.launchUrl};minimized=false;menuOpen=false;
  void tick().then(()=>menuButton?.focus());
 }
 function close(){framed=null;minimized=false;menuOpen=false;void tick().then(()=>launchButton?.focus());}
 function minimize(){menuOpen=false;minimized=true;void tick().then(()=>launchButton?.focus());}
 function restore(){minimized=false;void tick().then(()=>menuButton?.focus());}
 $effect(()=>{
  if(!panel)return;
  if(visible&&!panel.open)panel.showModal();
  else if(!visible&&panel.open)panel.close();
 });
 function cancel(event:Event){
  event.preventDefault();
  if(menuOpen){menuOpen=false;menuButton?.focus();}else minimize();
 }
 onMount(()=>{
  function receive(event:MessageEvent){
   if(!framed||event.source!==frame?.contentWindow||event.origin!==new URL(framed.url).origin)return;
   const data=event.data;
   if(data&&typeof data==='object'&&data.type==='gameroom:close'&&data.version===1)close();
  }
  const hideMenu=()=>menuOpen=false;
  window.addEventListener('message',receive);
  window.addEventListener('blur',hideMenu);
  return()=>{window.removeEventListener('message',receive);window.removeEventListener('blur',hideMenu);};
 });
</script>

<div class="frame-lab-controls">
 <p class="study-label">Frame study</p>
 <button class="gold-button" bind:this={launchButton} disabled={!game} onclick={open}>Try {game?.title??'selected game'} in room</button>
 {#if framed}<button class="text-button" onclick={restore}>Return to {framed.title}</button>{/if}
</div>

{#if framed}
 <dialog bind:this={panel} class="game-window" aria-label={`${framed.title} game window`} oncancel={cancel}>
  <iframe bind:this={frame} src={framed.url} title={`${framed.title} game`} sandbox="allow-scripts allow-same-origin allow-forms" referrerpolicy="no-referrer"></iframe>
  <button class="menu-trigger" bind:this={menuButton} aria-label="Gameroom controls" aria-expanded={menuOpen} aria-controls="game-room-menu" onclick={()=>menuOpen=!menuOpen}><img src={`${import.meta.env.BASE_URL}art/ui/game-menu.png`} width="36" height="36" alt="" draggable="false"/></button>
  {#if menuOpen}
   <nav id="game-room-menu" class="game-menu" aria-label="Gameroom controls">
    <button onclick={minimize}>Return to room</button>
    <button onclick={close}>Close game</button>
   </nav>
  {/if}
 </dialog>
 {#if minimized}
  <div class="game-return"><button onclick={restore}>Return to {framed.title} <span aria-hidden="true">↗</span></button><button aria-label="Close game window" onclick={close}>×</button></div>
 {/if}
{/if}

<style>
 .frame-lab-controls{margin-top:26px;padding-top:18px;border-top:1px solid var(--line)}
 .study-label{font-size:11px;color:var(--muted);margin-bottom:10px}
 .game-window{position:fixed;inset:0;width:100%;height:100dvh;max-width:none;max-height:none;margin:0;padding:0;border:0;border-radius:0;overflow:hidden;background:#15251c;color:#f1e7d1;}
 .game-window::backdrop{background:#15251c}
 iframe{display:block;width:100%;height:100%;border:0;background:#fff}
 .menu-trigger{position:absolute;right:env(safe-area-inset-right,0px);bottom:env(safe-area-inset-bottom,0px);width:44px;height:44px;display:flex;align-items:flex-end;justify-content:flex-end;padding:0;border-radius:6px;}
 .menu-trigger img{display:block;width:36px;height:36px;pointer-events:none}
 .menu-trigger:hover img,.menu-trigger[aria-expanded=true] img{filter:brightness(1.18)}
 .menu-trigger:focus-visible{outline:2px solid #eac17b;outline-offset:-3px}
 .game-menu{position:absolute;right:max(4px,env(safe-area-inset-right));bottom:calc(env(safe-area-inset-bottom,0px) + 48px);display:grid;min-width:180px;padding:5px;background:#1e2923f5;border:1px solid #a58a5b88;border-radius:8px;box-shadow:0 5px 24px #0006;}
 .game-menu button{min-height:44px;padding:10px 14px;text-align:left;font-size:13px;border-radius:4px}
 .game-menu button:hover,.game-menu button:focus-visible{background:#dbc18a20}
 .game-return{position:fixed;z-index:8;bottom:108px;left:50%;transform:translateX(-50%);display:flex;max-width:calc(100% - 32px);border:1px solid #a88250;border-radius:7px;background:#322419;box-shadow:0 8px 28px #0008}
 .game-return button{min-height:48px;padding:10px 18px;font-size:13px}
 .game-return button:first-child{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
 .game-return button span{margin-left:12px;color:#eac17b}
 .game-return button:last-child{border-left:1px solid #a8825055;font-size:24px}
 @media(max-width:650px){.game-return{bottom:100px}}
</style>
