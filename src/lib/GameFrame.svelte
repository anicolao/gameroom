<script module lang="ts">
 export type FrameRequest={id:string;title:string;url:string};
</script>
<script lang="ts">
 import {onMount, tick} from 'svelte';
 import {isFrameDismissal} from './game-frame';
 let {request=null,onClose=()=>{},busy=false,error=''}: {request?:FrameRequest|null;onClose?:(id:string)=>void;busy?:boolean;error?:string}=$props();
 let menuOpen=$state(false);
 let panel=$state<HTMLDialogElement>();
 let frame=$state<HTMLIFrameElement>();
 let menuButton=$state<HTMLButtonElement>();
 function close(){if(request&&!busy)onClose(request.id);}
 $effect(()=>{
  void request?.id;menuOpen=false;
  if(request)void tick().then(()=>menuButton?.focus());
 });
 $effect(()=>{
  if(!panel)return;
  if(request&&!panel.open)panel.showModal();
  else if(!request&&panel.open)panel.close();
 });
 function cancel(event:Event){
  event.preventDefault();
  // Escape reveals the shared close action; it never silently leaves the game.
  menuOpen=!menuOpen;if(!menuOpen)menuButton?.focus();
 }
 onMount(()=>{
  function receive(event:MessageEvent){
   if(request&&isFrameDismissal(event,request.url,frame?.contentWindow??null))close();
  }
  const hideMenu=()=>menuOpen=false;
  window.addEventListener('message',receive);
  window.addEventListener('blur',hideMenu);
  return()=>{window.removeEventListener('message',receive);window.removeEventListener('blur',hideMenu);};
 });
</script>

{#if request}
 <dialog bind:this={panel} class="game-window" aria-label={`${request.title} game window`} oncancel={cancel}>
  {#key request.id}<iframe bind:this={frame} src={request.url} title={`${request.title} game`} sandbox="allow-scripts allow-same-origin allow-forms" referrerpolicy="no-referrer"></iframe>{/key}
  <button class="menu-trigger" bind:this={menuButton} aria-label="Gameroom controls" aria-expanded={menuOpen} aria-controls="game-room-menu" onclick={()=>menuOpen=!menuOpen}><img src={`${import.meta.env.BASE_URL}art/ui/game-menu.png`} width="36" height="36" alt="" draggable="false"/></button>
  {#if menuOpen}
   <nav id="game-room-menu" class="game-menu" aria-label="Gameroom controls">
    <button disabled={busy} aria-busy={busy} onclick={close}>Close game</button>
    {#if error}<p class="menu-error" role="alert">{error}</p>{/if}
   </nav>
  {/if}
 </dialog>
{/if}

<style>
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
 .menu-error{padding:8px 14px;font-size:12px;line-height:1.5;color:#f2c4ae}
</style>
