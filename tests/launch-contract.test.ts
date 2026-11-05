import {expect,test} from 'bun:test';
import {verifyLaunchContract} from '../scripts/launch-contract';
for(const [label,body,accept] of [
 ['integrated checkout',JSON.stringify({game:'cribbage',protocol:'gameroom-url',version:1}),true],
 ['legacy HTML fallback','<!doctype html><html>Cribbage</html>',false],
 ['unsupported protocol',JSON.stringify({game:'cribbage',protocol:'gameroom-url',version:2}),false],
 ['different game',JSON.stringify({game:'other',protocol:'gameroom-url',version:1}),false],
] as const)test(`launch server capability: ${label}`,async()=>{
 const server=Bun.serve({port:0,fetch:()=>new Response(body)});
 try{
  if(accept)await expect(verifyLaunchContract(server.url.href)).resolves.toBeUndefined();
  else await expect(verifyLaunchContract(server.url.href)).rejects.toThrow();
 }finally{server.stop(true);}
});
