<script lang="ts">
 import {onMount} from 'svelte';
 import type {Intent} from './engine';
 import {randomId} from './random-id';
 import {roomCode} from './launch';
 import {bossMessage,operation,type BgaOperation} from './bga-boss';
 let {room,uid,players,canLaunch,sharedRequests,publish}:{room:string;uid:string;players:string[];canLaunch:boolean;sharedRequests:string[];publish:(intent:Extract<Intent,{type:'table/bga-launched'}>)=>Promise<boolean>}=$props();
 type Pending={id:string;issuedAt:string;table:string;players:string[];extension:string};
 const key=$derived(`gameroom:bga:${location.pathname}:${room}:${uid}`);
 let id=$state(localStorage.getItem('gameroom:bga-extension')??''),pending=$state<Pending|null>(null),op=$state<BgaOperation|null>(null),error=$state(''),checking=$state(false),shared=$state(false);
 const published=$derived(shared||!!pending&&sharedRequests.includes(pending.id));
 let mounted=true,timer:ReturnType<typeof setTimeout>|undefined;
 function remember(){sessionStorage.setItem(key,JSON.stringify(pending));}
 async function check(){
  if(!pending||checking)return;
  clearTimeout(timer);
  checking=true;error='';
  try{op=operation(await bossMessage(pending.extension,{version:1,method:'operations.get',requestId:pending.id}),pending.id);}
  catch(e){error=(e as Error).message;}
  finally{checking=false;}
  if(mounted&&op?.status==='succeeded'&&canLaunch&&!published)await share();
  if(mounted&&!error&&op&&!['succeeded','cancelled','unknown'].includes(op.status))timer=setTimeout(()=>void check(),1500);
 }
 async function start(){
  if(pending||!canLaunch||checking)return;
  checking=true;error='';
  try{
   if(!/^[a-p]{32}$/.test(id))throw Error('Enter the BGA Boss extension ID first.');
   localStorage.setItem('gameroom:bga-extension',id);
   pending={id:randomId(),issuedAt:new Date().toISOString(),table:roomCode(),players:[...players],extension:id};remember();
   op=operation(await bossMessage(id,{version:1,method:'tables.prepare',requestId:pending.id,issuedAt:pending.issuedAt,gameId:'11'}),pending.id);
  }catch(e){error=(e as Error).message;}
  finally{checking=false;}
  if(pending&&!error)void check();
 }
 async function share(){
  if(!pending||!op?.result||published)return;
  const ok=await publish({type:'table/bga-launched',table:pending.table,players:pending.players,requestId:pending.id,game:{id:'bga:11',title:"Can't Stop (BGA)",url:op.result.url}});
  if(ok)shared=true;
 }
 function reset(){clearTimeout(timer);sessionStorage.removeItem(key);pending=null;op=null;shared=false;error='';}
 onMount(()=>{
  mounted=true;
  try{const saved=sessionStorage.getItem(key);if(saved){const p=JSON.parse(saved) as Pending;if(typeof p.id!=='string'||!Array.isArray(p.players)||typeof p.extension!=='string')throw Error('Invalid saved request.');pending=p;void check();}}catch(e){error=(e as Error).message;}
  return()=>{mounted=false;clearTimeout(timer);};
 });
 // Only a locally persisted host request may publish a captured destination.
 // Room replay never dispatches extension requests; polling never prepares a tab.
</script>
<section class="bga-panel" aria-label="BGA test launcher">
 <h2>BGA test · Can't Stop</h2>
 <p class="hint">Host needs BGA Boss. Friends only need their BGA accounts.</p>
 <a href={`${import.meta.env.BASE_URL}bga-boss.zip`} download>Download BGA Boss</a> · <a href={`${import.meta.env.BASE_URL}bga-boss-install.html`} target="_blank" rel="noopener noreferrer">Install instructions</a>
 {#if !pending}
  <label>BGA Boss extension ID<input aria-label="BGA Boss extension ID" bind:value={id} spellcheck="false" autocomplete="off" maxlength="32"/></label>
  <p class="hint">Uses the players selected above. Create the table and choose access on BGA, then share it here.</p>
  <button class="gold-button" onclick={start} disabled={!canLaunch||checking}>Set up Can't Stop on BGA</button>
 {:else}
  <p data-testid="bga-status" aria-live="polite">{published?'Table shared with room.':op?.status==='succeeded'?'BGA table found. Share it with the selected players.':op?.status==='needs_approval'?'Approve this request in the BGA Boss window.':op?.status==='waiting_for_table'?'Create a table in the BGA tab. Its address will appear here automatically.':op?.status==='cancelled'?'Request denied.':op?.status==='unknown'?'BGA tab unavailable. Check BGA before starting another request.':'Checking BGA Boss…'}</p>
  {#if op?.status==='succeeded'&&!published}<button class="gold-button" disabled={!canLaunch} onclick={share}>Share BGA table with room</button>{/if}
  {#if !published}<button class="text-button" disabled={checking} onclick={check}>Check same request</button>{/if}
  <button class="text-button" disabled={checking} onclick={reset}>{published?'Finish this request':'Discard request (check BGA first)'}</button>
 {/if}
 {#if error}<p role="alert">{error}</p>{/if}
</section>
<style>
 .bga-panel{margin-top:20px;padding-top:14px;border-top:1px solid #ad987244;font-size:13px}.bga-panel h2{font-size:17px;margin:0 0 8px}.bga-panel a{color:inherit}.bga-panel label{display:block;margin-top:12px}.bga-panel input{display:block;width:100%;box-sizing:border-box;margin:5px 0 10px;background:#081c16;color:#f4ead2;border:1px solid #c1a16c80;border-radius:3px;min-height:36px;padding:8px;font-size:11px}.bga-panel button{margin-top:8px}.bga-panel p{line-height:1.4}
</style>
