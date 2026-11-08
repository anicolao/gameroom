export type BgaOperation={version:1;requestId:string;status:'needs_approval'|'opening'|'waiting_for_table'|'succeeded'|'cancelled'|'unknown';result?:{tableId:string;url:string};error?:string};
type Runtime={lastError?:{message?:string};sendMessage:(id:string,message:unknown,reply:(value:unknown)=>void)=>void};
export function extensionId(value:string){if(!/^[a-p]{32}$/.test(value))throw Error('Enter the extension ID shown at chrome://extensions.');return value;}
export function bgaDestination(value:unknown):string {
 if(typeof value!=='string'||!/^https:\/\/boardgamearena\.com\/table\?table=[1-9][0-9]{0,14}$/.test(value))throw Error('BGA Boss returned an unsupported table address.');return value;
}
export async function bossMessage(id:string,message:unknown):Promise<unknown>{
 extensionId(id);
 const runtime=(globalThis as unknown as {chrome?:{runtime?:Runtime}}).chrome?.runtime;
 if(!runtime?.sendMessage)throw Error('Use Chrome with BGA Boss installed on the Gameroom domain.');
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('BGA Boss did not respond. Check its toolbar window, then check the same request again.')),15000);
  try{runtime.sendMessage(id,message,value=>{clearTimeout(timer);const error=runtime.lastError;if(error){reject(Error('Could not connect to BGA Boss. Check the extension ID and that it is enabled.'));return;}if(!value||typeof value!=='object'||'error' in value){reject(Error(typeof (value as {error?:unknown})?.error==='string'?(value as {error:string}).error:'Invalid BGA Boss reply.'));return;}resolve(value);});}catch(e){clearTimeout(timer);reject(e);}
 });
}
export function operation(value:unknown,requestId:string):BgaOperation{
 const op=value as BgaOperation;
 if(!op||op.version!==1||op.requestId!==requestId||!['needs_approval','opening','waiting_for_table','succeeded','cancelled','unknown'].includes(op.status))throw Error('Invalid BGA Boss operation.');
 if(op.status==='succeeded'&&(!op.result||bgaDestination(op.result.url)!==`https://boardgamearena.com/table?table=${op.result.tableId}`))throw Error('Invalid BGA Boss table.');
 return op;
}
