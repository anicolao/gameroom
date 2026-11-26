<script lang="ts">
 import {onMount,untrack} from 'svelte';
 import GameCabinet from './lib/cabinet/GameCabinet.svelte';
 import GameFrame,{type FrameRequest,type FrameState} from './lib/GameFrame.svelte';
 import type {Game,CatalogSnapshot} from './lib/catalog';
 import {subscribeCatalog} from './lib/catalog-source';
 import {initialState,replay,type Intent,type State,type Table} from './lib/engine';
 import {services} from './lib/firebase';
 import {repository} from './lib/repository';
 import {gameUrl,roomCode,selectedFriends,launchReceiptKey} from './lib/launch';
 import {validateFrameURL} from './lib/game-frame';
 let roomState=$state<State>(initialState()),uid=$state(''),room=$state(new URLSearchParams(location.search).get('room')??'');
 let playerName=$state(localStorage.getItem('gameroom:name')??''),roomName=$state('Game room'),error=$state(''),busy=$state(false),synced=$state(false),copied=$state(false);
 let catalogState=$state<CatalogSnapshot>({status:'loading',games:[],rejected:0}),selectedId=$state('');
 const catalog=$derived(catalogState.games);
 const selected=$derived(catalog.find(game=>game.id===selectedId)??catalog[0]);
 let search=$state(''),readyOnly=$state(false),excluded=$state<string[]>([]),message=$state(''),showChat=$state(false);
 let stopCatalog=()=>{};
 function loadCatalog(){stopCatalog();stopCatalog=subscribeCatalog(snapshot=>catalogState=snapshot);}
 let repo:ReturnType<typeof repository>|undefined,stop=()=>{};
 const own=$derived(roomState.players.find(p=>p.id===uid));
 const present=$derived(roomState.players.filter(p=>p.present));
 const joined=$derived(Boolean(own?.present));
 const visible=$derived(catalog.filter(g=>(!readyOnly||g.available)&&g.title.toLowerCase().includes(search.toLowerCase())));
 const invitation=$derived(`${location.origin}${location.pathname}?room=${room}`);
 const activeTables=$derived(roomState.tables.filter(t=>!t.closed));
 const currentTable=$derived(activeTables.find(t=>t.code===own?.table));
 const ownTable=$derived(currentTable??[...activeTables].reverse().find(t=>t.players.includes(uid)));
 const selectedTable=$derived(ownTable?.game===selected?.id?ownTable:undefined);
 const releasingTable=$derived(currentTable?.host===uid?currentTable.code:undefined);
 const eligible=$derived(present.filter(p=>!p.table||p.table===releasingTable));
 const chosen=$derived(selectedFriends(roomState.players,uid,excluded,releasingTable));
 // Test-only deployment routing never determines a game's capabilities.
 function gameBase(table:Table){
  const local=import.meta.env.VITE_CATALOGUE_USE_FIREBASE_EMULATORS==='true'?({cribbage:import.meta.env.VITE_CRIBBAGE_URL,cantstop:import.meta.env.VITE_CANTSTOP_URL,'cantstop-integration':import.meta.env.VITE_CANTSTOP_URL} as Record<string,string|undefined>)[table.game]:undefined;
  return local??table.url;
 }
 const returnRequest=new URLSearchParams(location.search).get('returned');
 let returnTarget=$state(returnRequest);
 let returnAttempt=$state(-1);
 let frameRequest=$state<FrameRequest|null>(null),frameAttempt='',frameSequence=0;
 function frameStatus(key:string,state:FrameState){sessionStorage.setItem(key,state);}
 function openFrame(table:Table,destination:string,key:string,hidden=false){
  const url=validateFrameURL(destination,location.origin,import.meta.env.VITE_USE_FIREBASE_EMULATORS==='true');
  frameRequest={id:++frameSequence,scope:'table',key,title:table.title,url,hidden};
  frameStatus(key,hidden?'hidden':'opened');
 }
 function openExternal(game:Game){
  try{const url=validateFrameURL(game.launchUrl,location.origin);frameRequest={id:++frameSequence,scope:'catalog',key:`gameroom:catalog-frame:${room}:${uid}:${game.id}`,title:game.title,url};}
  catch(e){error=(e as Error).message;}
 }
 const paths:Record<string,string>={home:'m3 10 9-7 9 7v10H3Zm6 10v-7h6v7',search:'m21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',people:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.9M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8m8-7a4 4 0 0 1 0 8',clock:'M12 8v4l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',link:'m10 13 4-4m-6 7-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 1 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0',chat:'M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z',arrow:'M5 12h14m-6-6 6 6-6 6',leaf:'M20 3C8 2 2 8 5 15c7 5 15-1 15-12ZM4 21 15 9',exit:'M9 4H3v16h6m5-13 5 5-5 5m-5-5h10'};
 function connect(){
  stop();synced=false;
  void services().then(s=>{uid=s.uid;if(!room){synced=true;return;}if(!/^[A-F0-9]{8}$/.test(room))throw new Error('This invitation doesn’t look right. Open a room invitation with an eight-character code.');
   repo=repository(s.db,room,uid,events=>{roomState=replay(events);synced=true;error='';},e=>{error=e;synced=false;});stop=repo.close;
  }).catch(e=>error=e.message);
 }
 onMount(()=>{connect();loadCatalog();return()=>{stop();stopCatalog();};});
 async function act(intent:Intent){
  if(!repo||busy)return false;busy=true;error='';
  try{await repo.append(intent);return true;}catch(e){error=(e as Error).message;return false;}finally{busy=false;}
 }
 async function enter(){
  if(!playerName.trim()||busy||!uid)return;
  try{
   localStorage.setItem('gameroom:name',playerName.trim());
   if(!room){
    room=roomCode();history.replaceState(null,'',`?room=${room}`);synced=false;
    const s=await services();repo=repository(s.db,room,uid,events=>{roomState=replay(events);synced=true;},e=>{error=e;synced=false;});stop=repo.close;
    await act({type:'room/created',name:roomName.trim(),playerName:playerName.trim()});
   }else if(roomState.revision)await act({type:'player/joined',name:playerName.trim()});
  }catch(e){error=(e as Error).message;}
 }
 async function copyInvite(){try{await navigator.clipboard.writeText(invitation);copied=true;}catch{error=`Share this room: ${invitation}`;}}
 async function launch(){
  if(busy||!repo||!selected?.available)return;
  try{
   const players=[uid,...chosen.filter(id=>id!==uid&&eligible.some(p=>p.id===id))];
   const table=roomCode(),game={id:selected.id,title:selected.title,url:selected.launchUrl};
   // Preserve the existing close/return and launch decisions, in canonical order.
   if(currentTable){
    const release:Intent=currentTable.host===uid?{type:'table/closed',table:currentTable.code}:{type:'player/returned'};
    if(!await act(release))return;
   }
   if(await act({type:'table/catalog-launched',table,players,game}))excluded=[];
  }catch(e){error=(e as Error).message;}
 }
 function openGame(table:Table|undefined=ownTable){
  if(!own||!table)return;
  const destination=gameUrl(gameBase(table),table,own),key=launchReceiptKey(room,uid,table.code);
  try{openFrame(table,destination,`${key}:frame`);}catch(e){error=(e as Error).message;}
 }
 function choose(id:string){excluded=excluded.includes(id)?excluded.filter(p=>p!==id):[...excluded,id];}
 async function sendMessage(){if(await act({type:'message/sent',text:message.trim()}))message='';}
 function leaveTable(){returnAttempt=-1;returnTarget=own?.table??null;}
 $effect(()=>{
  if(!returnTarget||!joined||!synced||busy)return;
  // Another returning player may win the revision race. Replay the new revision
  // before retrying our own return, rather than permanently consuming the request.
  if(!own?.table){if(returnRequest)history.replaceState(null,'',`?room=${room}`);returnTarget=null;return;}
  if(own.table!==returnTarget||returnAttempt===roomState.revision)return;
  returnAttempt=roomState.revision;
  void act({type:'player/returned'}).then(ok=>{if(ok&&returnRequest)history.replaceState(null,'',`?room=${room}`);});
 });
 $effect(()=>{
  if(joined&&own?.table&&activeTables.some(t=>t.code===own.table))return;
  untrack(()=>{if(joined&&frameRequest?.scope==='catalog')return;frameRequest=null;frameAttempt='';});
 });
 $effect(()=>{
  if(!joined||!synced||busy||!own?.table)return;
  const table=activeTables.find(t=>t.code===own.table),player=own;
  if(!table||returnTarget===table.code)return;
  const destination=gameUrl(gameBase(table),table,player),key=launchReceiptKey(room,uid,table.code);
  untrack(()=>{
   try{
    const frameKey=`${key}:frame`;
    if(frameAttempt===frameKey)return;
    frameAttempt=frameKey;
    const receipt=sessionStorage.getItem(frameKey);
    if(receipt!=='closed')openFrame(table,destination,frameKey,receipt==='hidden');
   }catch(e){error=(e as Error).message;}
  });
 });
</script>

{#snippet icon(name:string,size=20)}<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d={paths[name]??paths.home}/></svg>{/snippet}

<div class="den">
 <header class="topbar">
  <a class="brand" href={import.meta.env.BASE_URL} aria-label="Gameroom home">{@render icon('home',24)}<span>gameroom</span></a>
  {#if joined}<span class="room-title">{roomState.name}</span><button class="invite-button" onclick={copyInvite}>{@render icon('link',17)}{copied?'Copied':'Invite friends'}</button>{/if}
 </header>
 <main>
  {#if error}<div class="error" role="alert">{error}<button onclick={async()=>{try{await repo?.retry();connect();}catch(e){error=(e as Error).message;}}}>Try again</button></div>{/if}
  <div class="room-layout">
   <section class="library" aria-label="Game shelves">
    <div class="library-toolbar" data-testid="catalogue" data-status={catalogState.status}>
     <div class="shelf-tabs"><button class:active={!readyOnly} onclick={()=>readyOnly=false}>All games <span>{catalog.length}</span></button><button class:active={readyOnly} onclick={()=>readyOnly=true}>Group launch <span>{catalog.filter(g=>g.available).length}</span></button></div>
     <label class="search">{@render icon('search',17)}<input aria-label="Search games" placeholder="Search games" bind:value={search}/></label>
    </div>
    <GameCabinet games={visible} selected={selected?.id} onSelect={id=>selectedId=id} empty={catalogState.status==='loading'?'Loading games…':catalogState.status==='error'?'Couldn’t load games':!catalog.length?'No games in the catalog':'No matching games'}/>
    {#if catalogState.status==='offline'&&catalog.length}<p class="hint">Offline catalog</p>{/if}
    {#if catalogState.status==='error'}<button class="text-button" onclick={loadCatalog}>Retry games</button>{/if}
   </section>
   <aside class="room-controls" aria-label={joined?'Selected game':'Room setup'}>
    {#if !joined}
     <form class="room-form" onsubmit={e=>{e.preventDefault();void enter();}}>
      <h1>{room?'Join room':'Create room'}</h1>
      <label>Your name<input name="name" maxlength="24" autocomplete="nickname" bind:value={playerName} required/></label>
      {#if !room}<label>Room name<input name="roomName" maxlength="48" bind:value={roomName} required/></label>{/if}
      <button class="gold-button" disabled={busy||!uid||!synced||!playerName.trim()||!room&&!roomName.trim()||!!room&&!roomState.revision}>{room?'Join room':'Create room'}</button>
      {#if room&&!roomState.revision&&synced}<p class="hint">Room not found. Check the invitation.</p>{/if}
     </form>
    {:else if selected}
     <div class="game-controls">
      <h1>{selectedTable?selectedTable.title:selected.title}</h1>{#if selected.players&&!selectedTable}<p class="game-meta">{selected.players} · {selected.duration}</p>{/if}
      {#if selected.available||selectedTable}
       {#if selectedTable}
        <p class="table-players">{selectedTable.players.map(id=>roomState.players.find(p=>p.id===id)?.name).join(' · ')}</p>
        <button class="gold-button" onclick={()=>openGame(selectedTable)}>Open {selectedTable.title} {@render icon('arrow',17)}</button>
        <p class="hint">Use the corner menu to return to the room.</p>
        {#if own?.table}<button class="text-button" disabled={busy} onclick={leaveTable}>Leave table</button>{/if}
       {:else}
        <fieldset class="seat-picker"><legend>Players</legend><label class="seat-option"><input type="checkbox" checked disabled/><span>{own?.name} (you)</span></label>{#each eligible.filter(p=>p.id!==uid) as player}<label class="seat-option"><input type="checkbox" checked={chosen.includes(player.id)} onchange={()=>choose(player.id)} disabled={!chosen.includes(player.id)&&chosen.length>=3}/><span>{player.name}</span></label>{/each}</fieldset>
        <button class="gold-button" disabled={busy||!synced} onclick={launch}>Play {selected.title} {@render icon('arrow',17)}</button>
       {/if}
      {:else}<button class="gold-button" data-launch-url={selected.launchUrl} onclick={()=>openExternal(selected)}>Open {selected.title} {@render icon('arrow',17)}</button>{/if}
     </div>
    {/if}
    {#if joined&&activeTables.length}<section class="tables" aria-label="Room tables"><h2>Tables</h2>{#each activeTables as table}<div class="table-row"><strong>{table.title}</strong>{#if ownTable?.code===table.code&&selectedTable?.code!==table.code}<button class="text-button" style="margin-left:12px" onclick={()=>openGame(table)}>Open {table.title}</button>{/if}<p>{table.players.map(id=>roomState.players.find(p=>p.id===id)?.name).join(' · ')}</p>{#if table.host===uid}<button class="text-button" disabled={busy} onclick={()=>act({type:'table/closed',table:table.code})}>Close table</button>{/if}</div>{/each}</section>{/if}
   </aside>
  </div>
 </main>
 {#if joined}
  <footer class="gathering"><div class="friends">{#each present as player,i}<div class="friend" data-testid="friend"><div class="avatar avatar-{i%4}">{player.name.slice(0,1).toUpperCase()}</div><span><strong>{player.name}{player.id===uid?' (you)':''}</strong><small>{player.table?`${roomState.tables.find(t=>t.code===player.table)?.title??'Game'} table`:'In room'}</small></span></div>{/each}</div><div class="room-actions"><button class:pressed={showChat} aria-label="Room conversation" aria-expanded={showChat} onclick={()=>showChat=!showChat}>{@render icon('chat',20)}</button><button aria-label="Leave room" disabled={busy} onclick={()=>act({type:'player/left'})}>{@render icon('exit',20)}</button></div></footer>
  {#if showChat}<section class="chat-panel" aria-label="Room conversation"><div class="chat-heading"><h2>Chat</h2><button aria-label="Close conversation" onclick={()=>showChat=false}>×</button></div><div class="messages" aria-live="polite">{#each roomState.messages as m}<p><strong>{roomState.players.find(p=>p.id===m.actor)?.name}</strong><span>{m.text}</span></p>{/each}</div><form onsubmit={e=>{e.preventDefault();void sendMessage();}}><input aria-label="Message" placeholder="Message" maxlength="280" bind:value={message}/><button aria-label="Send message" disabled={busy||!message.trim()}>{@render icon('arrow',20)}</button></form></section>{/if}
 {/if}
 <GameFrame request={frameRequest} onStateChange={frameStatus}/>
 <div class="sr-only" role="status" data-status={synced&&!busy?'synced':'waiting'}>{synced?'Room connected':'Connecting to the room'}</div>
</div>
