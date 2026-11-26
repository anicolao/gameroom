/** Only the current game window at its exact origin may dismiss its own surface. */
export function isFrameDismissal(event:Pick<MessageEvent,'source'|'origin'|'data'>,destination:string,source:MessageEventSource|null){
 const data=event.data;
 return source!==null&&event.source===source&&event.origin===new URL(destination).origin&&data!==null&&typeof data==='object'&&!Array.isArray(data)&&data.type==='gameroom:close'&&data.version===1;
}

/** Games need their own origin; emulator HTTP is an explicit local-only exception. */
export function validateFrameURL(destination:string,roomOrigin:string,localEmulators=false){
 const url=new URL(destination);
 const loopback=(host:string)=>host==='127.0.0.1'||host==='localhost'||host==='[::1]';
 const local=localEmulators&&url.protocol==='http:'&&loopback(url.hostname)&&new URL(roomOrigin).protocol==='http:';
 if(url.username||url.password||url.origin===roomOrigin||url.protocol!=='https:'&&!local)throw new Error('This game needs a separate, secure web address.');
 return url.href;
}
