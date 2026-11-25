<script lang="ts">
 import {onMount} from 'svelte';
 import type {Intent} from './engine';
 import {randomId} from './random-id';
 import {roomCode} from './launch';
 import {BGA_BOSS_ID,detectBoss,bossMessage,operation,type BgaOperation} from './bga-boss';
 let {room,uid,players,canLaunch,sharedRequests,publish}:{room:string;uid:string;players:string[];canLaunch:boolean;sharedRequests:string[];publish:(intent:Extract<Intent,{type:'table/bga-launched'}>)=>Promise<boolean>}=$props();
 type Pending={id:string;issuedAt:string;table:string;players:string[];extension:string};
 const key=$derived(`gameroom:bga:${location.pathname}:${room}:${uid}`);
 let connection=$state<'checking'|'ready'|'unavailable'>('checking'),pending=$state<Pending|null>(null),op=$state<BgaOperation|null>(null),error=$state(''),checking=$state(false),shared=$state(false);
 const published=$derived(shared||!!pending&&sharedRequests.includes(pending.id));
 let detecting=false;
 async function detect(){if(detecting)return;detecting=true;try{const available=await detectBoss();if(mounted)connection=available?'ready':'unavailable';}finally{detecting=false;}}
 let mounted=true,timer:ReturnType<typeof setTimeout>|undefined;
 function remember(){sessionStorage.setItem(key,JSON.stringify(pending));}
 async function check(){
  const current=pending;
  if(!current||checking)return;
  clearTimeout(timer);checking=true;error='';
  try{
   const next=operation(await bossMessage(current.extension,{version:1,method:'operations.get',requestId:current.id}),current.id);
   if(!mounted||pending?.id!==current.id)return;
   op=next;
  }catch(e){if(mounted&&pending?.id===current.id)error=(e as Error).message;}
  finally{checking=false;}
  if(!mounted||pending?.id!==current.id)return;
  if(op?.status==='succeeded'&&canLaunch&&!published)await share();
  if(!error&&op&&!['succeeded','cancelled','unknown'].includes(op.status))timer=setTimeout(()=>void check(),1500);
 }
 async function start(){
  if(pending||!canLaunch||checking||connection!=='ready')return;
  checking=true;error='';
  try{
   pending={id:randomId(),issuedAt:new Date().toISOString(),table:roomCode(),players:[...players],extension:BGA_BOSS_ID};remember();
   op=operation(await bossMessage(BGA_BOSS_ID,{version:1,method:'tables.prepare',requestId:pending.id,issuedAt:pending.issuedAt,gameId:'11'}),pending.id);
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
  mounted=true;void detect();
  const reconnect=()=>{if(document.visibilityState==='visible')void detect();};
  window.addEventListener('focus',reconnect);document.addEventListener('visibilitychange',reconnect);
  try{const saved=sessionStorage.getItem(key);if(saved){const p=JSON.parse(saved) as Pending;if(typeof p.id!=='string'||!Array.isArray(p.players)||p.extension!==BGA_BOSS_ID)throw Error('Invalid saved request.');pending=p;void check();}}catch(e){error=(e as Error).message;}
  return()=>{mounted=false;clearTimeout(timer);window.removeEventListener('focus',reconnect);document.removeEventListener('visibilitychange',reconnect);};
 });
 // Only a locally persisted host request may publish a captured destination.
 // Room replay never dispatches extension requests; polling never prepares a tab.
</script>
<section class="bga-panel" aria-label="BGA test launcher">
 <h2>BGA test · Can't Stop</h2>
 <p class="hint">Host needs BGA Boss. Friends only need their BGA accounts.</p>
 {#if !pending}
  <p class="hint" data-testid="bga-connection" aria-live="polite">{connection==='checking'?'Checking for BGA Boss…':connection==='ready'?'BGA Boss connected.':'Install BGA Boss to host a BGA table.'}</p>
  {#if connection==='unavailable'}<div class="bga-install"><a href={`${import.meta.env.BASE_URL}bga-boss.zip`} download>Download BGA Boss</a><a href={`${import.meta.env.BASE_URL}bga-boss-install.html`} target="_blank" rel="noopener noreferrer">Install instructions</a><button class="text-button" onclick={detect}>Check connection</button></div>{/if}
  <p class="hint">Uses the players selected above. Create the table and choose access on BGA, then share it here.</p>
  <button class="gold-button" onclick={start} disabled={!canLaunch||checking||connection!=='ready'}>Set up Can't Stop on BGA</button>
 {:else}
  <p data-testid="bga-status" aria-live="polite">{published?'Table shared with room.':op?.status==='succeeded'?'BGA table found. Share it with the selected players.':op?.status==='needs_approval'?'Approve this request in the BGA Boss window.':op?.status==='waiting_for_table'?'Create a table in the BGA tab. Its address will appear here automatically.':op?.status==='cancelled'?'Request denied.':op?.status==='unknown'?'BGA tab unavailable. Check BGA before starting another request.':'Checking BGA Boss…'}</p>
  {#if op?.status==='succeeded'&&!published}<button class="gold-button" disabled={!canLaunch} onclick={share}>Share BGA table with room</button>{/if}
  {#if !published}<button class="text-button" onclick={check}>Check same request</button>{/if}
  <button class="text-button" onclick={reset}>{published?'Finish this request':'Discard request (check BGA first)'}</button>
 {/if}
 {#if error}<p role="alert">{error}</p>{/if}
</section>
<style>
 .bga-panel{margin-top:20px;padding-top:14px;border-top:1px solid #ad987244;font-size:13px}.bga-panel h2{font-size:17px;margin:0 0 8px}.bga-panel a{color:inherit}.bga-install a{display:block;margin:8px 0}.bga-panel button{margin-top:8px}.bga-panel p{line-height:1.4}
</style>
