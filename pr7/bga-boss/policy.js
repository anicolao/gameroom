// Explicit test adapter, independent of Gameroom's Applications catalogue.
export const GAME = Object.freeze({id:'11',slug:'cantstop',title:"Can't Stop (BGA)"});
export function clientKey(sender) {
 const url=new URL(sender.url);
 if(url.origin!=='https://gameroom.boardgamescafe.org'||sender.origin!==url.origin||sender.frameId!==0||!Number.isInteger(sender.tab?.id)||!/^\/(?:pr[1-9][0-9]*\/)?$/.test(url.pathname))throw Error('Unapproved Gameroom page.');
 return url.origin+url.pathname;
}
export function validateRequest(value) {
 if(!value||JSON.stringify(value).length>2048||value.version!==1||!['capabilities.get','tables.prepare','operations.get'].includes(value.method))throw Error('Unsupported BGA Boss request.');
 const fields=value.method==='capabilities.get'?['version','method']:value.method==='operations.get'?['version','method','requestId']:['version','method','requestId','issuedAt','gameId'];
 if(Object.keys(value).sort().join()!==fields.sort().join())throw Error('Unexpected request fields.');
 if(value.method!=='capabilities.get'&&!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value.requestId))throw Error('Invalid request ID.');
 if(value.method==='tables.prepare'&&(value.gameId!==GAME.id||typeof value.issuedAt!=='string'||!Number.isFinite(Date.parse(value.issuedAt))))throw Error('Unsupported game or date.');
 return value;
}
export function capturedTable(raw) {
 try {
  const url=new URL(raw);
  if(url.protocol!=='https:'||!['boardgamearena.com','en.boardgamearena.com'].includes(url.hostname)||url.port||url.username||url.password||url.pathname!=='/table')return null;
  const ids=url.searchParams.getAll('table');
  if(ids.length!==1||!/^[1-9][0-9]{0,14}$/.test(ids[0]))return null;
  // Drop all other fields: no session/access tokens ever leave BGA.
  return {tableId:ids[0],url:`https://boardgamearena.com/table?table=${ids[0]}`};
 }catch{return null;}
}
export function publicOperation(op) {
 return {version:1,requestId:op.requestId,status:op.status,...(op.result?{result:op.result}:{}),...(op.error?{error:op.error}:{})};
}
