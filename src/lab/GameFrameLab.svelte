<script lang="ts">
 import {onMount, tick} from 'svelte';
 import type {Game} from '../lib/catalog';
 let {game}: {game:Game|undefined}=$props();
 let framed=$state<{title:string,url:string}|null>(null);
 let minimized=$state(false),expanded=$state(false),loading=$state(false);
 let frame=$state<HTMLIFrameElement>();
 let launchButton=$state<HTMLButtonElement>(),roomButton=$state<HTMLButtonElement>();
 const visible=$derived(Boolean(framed&&!minimized));
 function open(){
  if(!game)return;
  // A manual local study, not a capability declaration or group launch.
  framed={title:game.title,url:game.launchUrl};minimized=false;loading=true;
  void tick().then(()=>roomButton?.focus());
 }
 function close(){framed=null;minimized=false;expanded=false;void tick().then(()=>launchButton?.focus());}
 function minimize(){minimized=true;void tick().then(()=>launchButton?.focus());}
 function restore(){minimized=false;void tick().then(()=>roomButton?.focus());}
 onMount(()=>{
  function receive(event:MessageEvent){
   if(!framed||event.source!==frame?.contentWindow||event.origin!==new URL(framed.url).origin)return;
   const data=event.data;
   if(data&&typeof data==='object'&&data.type==='gameroom:close'&&data.version===1)close();
  }
  window.addEventListener('message',receive);
  return()=>window.removeEventListener('message',receive);
 });
</script>

<div class="frame-lab-controls">
 <p class="study-label">Frame study</p>
 <button class="gold-button" bind:this={launchButton} disabled={!game} onclick={open}>Try {game?.title??'selected game'} in room</button>
 {#if framed}<button class="text-button" onclick={restore}>Return to {framed.title}</button>{/if}
</div>

{#if framed}
 <section class="game-window" class:expanded hidden={!visible} aria-label={`${framed.title} game window`}>
  <header class="game-window-bar">
   <div class="window-title"><span class="window-mark" aria-hidden="true">♧</span><strong>{framed.title}</strong>{#if loading}<span class="frame-loading" role="status">Loading…</span>{/if}</div>
   <nav aria-label="Game window controls">
    <button bind:this={roomButton} onclick={minimize}>Room</button>
    <button aria-label={expanded?'Restore game window size':'Expand game window'} aria-pressed={expanded} onclick={()=>expanded=!expanded}>{expanded?'↙':'↗'}</button>
    <button aria-label="Close game window" onclick={close}>×</button>
   </nav>
  </header>
  <iframe bind:this={frame} src={framed.url} title={`${framed.title} game`} sandbox="allow-scripts allow-same-origin allow-forms" referrerpolicy="no-referrer" onload={()=>loading=false}></iframe>
 </section>
 {#if minimized}
  <div class="game-return"><button onclick={restore}>Return to {framed.title} <span aria-hidden="true">↗</span></button><button aria-label="Close game window" onclick={close}>×</button></div>
 {/if}
{/if}

<style>
 .frame-lab-controls{margin-top:26px;padding-top:18px;border-top:1px solid var(--line)}
 .study-label{font-size:11px;color:var(--muted);margin-bottom:10px}
 .game-window{position:fixed;z-index:8;top:86px;bottom:112px;left:50%;transform:translateX(-50%);width:min(1120px,calc(100% - 80px));display:flex;flex-direction:column;overflow:hidden;border:1px solid #a88250;border-radius:9px;background:#20180f;box-shadow:0 22px 70px #000a,0 0 0 5px #34261999;}
 .game-window[hidden]{display:none}
 .game-window.expanded{top:12px;bottom:94px;width:calc(100% - 24px)}
 .game-window-bar{flex:none;display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:52px;padding:3px 8px 3px 18px;background:linear-gradient(100deg,#37271b,#251c15);border-bottom:1px solid #9f7e4d66;color:#f2e3c6;}
 .window-title{display:flex;align-items:center;gap:10px;min-width:0}
 .window-title strong{font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:500}
 .window-mark{color:#d2ad6b;font-size:26px}
 .frame-loading{font-size:11px;color:#d2c4aa}
 nav{display:flex;align-items:center;gap:4px}
 nav button{min-height:44px;min-width:44px;padding:8px 12px;border-radius:5px;font-size:14px}
 nav button:hover,nav button:focus-visible{background:#dec08a24}
 nav button:last-child{font-size:26px;padding:0}
 iframe{display:block;flex:1;width:100%;min-height:0;border:0;background:#fff}
 .game-return{position:fixed;z-index:8;bottom:108px;left:50%;transform:translateX(-50%);display:flex;max-width:calc(100% - 32px);border:1px solid #a88250;border-radius:7px;background:#322419;box-shadow:0 8px 28px #0008}
 .game-return button{min-height:48px;padding:10px 18px;font-size:13px}
 .game-return button:first-child{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
 .game-return button span{margin-left:12px;color:#eac17b}
 .game-return button:last-child{border-left:1px solid #a8825055;font-size:24px}
 @media(max-width:1000px){.game-window{width:calc(100% - 32px);top:82px}.game-window-bar{padding-left:12px}}
 @media(max-width:650px){.game-window{width:calc(100% - 16px);top:72px;bottom:92px}.frame-loading,.window-mark{display:none}.game-window-bar{gap:4px}.game-window.expanded{width:100%;top:0;bottom:82px;border-radius:0}.game-return{bottom:100px}}
</style>
