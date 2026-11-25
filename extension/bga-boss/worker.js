import {GAME,clientKey,validateRequest,capturedTable,publicOperation} from './policy.js';
// Serialize journal changes across concurrent messages and tab events.
let queue=Promise.resolve();
function locked(task){const result=queue.then(task);queue=result.catch(()=>{});return result;}
async function read(){return (await chrome.storage.local.get('operations')).operations??{};}
async function save(operations){await chrome.storage.local.set({operations});}
// A browser/worker interruption during tab creation must never create another tab.
const boot=locked(async()=>{const ops=await read();for(const op of Object.values(ops))if(op.status==='opening'){op.status='unknown';op.error='Opening was interrupted. Check your BGA tabs; no second tab will be opened.';}await save(ops);});
async function observe(op,ops){
 if(op.status!=='waiting_for_table')return;
 try{
  const tab=await chrome.tabs.get(op.bgaTabId),result=capturedTable(tab.url);
  if(result){op.status='succeeded';op.result=result;await save(ops);}
 }catch{op.status='unknown';op.error='The managed BGA tab was closed. No replacement was opened.';await save(ops);}
}
function approvePage(id){return chrome.runtime.getURL('approve.html')+(id?'?request='+encodeURIComponent(id):'');}
chrome.runtime.onMessageExternal.addListener((raw,sender,respond)=>{
 void boot.then(()=>locked(async()=>{
  const client=clientKey(sender),request=validateRequest(raw);
  if(request.method==='capabilities.get')return {version:1,methods:['tables.prepare','operations.get'],game:GAME,creation:'bga-ui'};
  const ops=await read(),old=ops[request.requestId];
  if(old){
   if(old.client!==client||old.clientTabId!==sender.tab.id)throw Error('This request belongs to another client.');
   if(request.method==='tables.prepare'&&(old.gameId!==request.gameId||old.issuedAt!==request.issuedAt))throw Error('Request ID was reused with different choices.');
   await observe(old,ops);return publicOperation(old);
  }
  if(request.method==='operations.get')throw Error('Unknown request.');
  if(Math.abs(Date.now()-Date.parse(request.issuedAt))>300000)throw Error('Request expired. Start a fresh request.');
  // Retain IDs for a day, beyond the five-minute acceptance window. Never evict live operations.
  for(const [id,op] of Object.entries(ops))if(Date.now()-op.createdAt>86400000&&['succeeded','cancelled','unknown'].includes(op.status))delete ops[id];
  if(Object.keys(ops).length>=100)throw Error('BGA Boss journal is full. Resolve pending requests first.');
  const op={requestId:request.requestId,issuedAt:request.issuedAt,gameId:request.gameId,client,clientTabId:sender.tab.id,createdAt:Date.now(),status:'needs_approval'};
  ops[op.requestId]=op;await save(ops);
  // Failure here leaves a recoverable request in the toolbar's pending list.
  try{await chrome.windows.create({url:approvePage(op.requestId),type:'popup',width:480,height:440});}catch{}
  return publicOperation(op);
 })).then(respond,error=>respond({version:1,error:error instanceof Error?error.message:'BGA Boss rejected the request.'}));
 return true;
});
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
 if(sender.id!==chrome.runtime.id||new URL(sender.url??'about:blank').pathname!=='/approve.html')return;
 void boot.then(()=>locked(async()=>{
  const ops=await read();
  if(message.method==='pending')return Object.values(ops).filter(op=>op.status==='needs_approval').map(op=>({requestId:op.requestId,client:op.client,title:GAME.title}));
  const op=ops[message.requestId];if(!op||op.status!=='needs_approval')throw Error('This request is no longer waiting for approval.');
  if(message.method==='deny'){op.status='cancelled';await save(ops);return {status:op.status};}
  if(message.method!=='approve')throw Error('Unknown action.');
  // No account-dependent automatic action: the user logs in, chooses privacy,
  // creates and starts the table in BGA itself. There is no scripting permission.
  op.status='opening';await save(ops);
  try{
   const tab=await chrome.tabs.create({url:`https://boardgamearena.com/gamepanel?game=${GAME.slug}`,active:true});
   op.bgaTabId=tab.id;op.status='waiting_for_table';await save(ops);return {status:op.status};
  }catch{op.status='unknown';op.error='Could not confirm the BGA tab opened. Check BGA before making a new request.';await save(ops);return {status:op.status};}
 })).then(respond,()=>respond({error:'Request unavailable. Open BGA Boss again.'}));
 return true;
});
chrome.tabs.onUpdated.addListener((tabId)=>{void boot.then(()=>locked(async()=>{const ops=await read();for(const op of Object.values(ops))if(op.bgaTabId===tabId)await observe(op,ops);})).catch(()=>{});});
chrome.action.onClicked.addListener(()=>{void chrome.tabs.create({url:approvePage()});});
