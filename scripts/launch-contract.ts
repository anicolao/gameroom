/** Refuse legacy checkouts (including Vite's HTML fallback) before advertising a game URL. */
export async function verifyLaunchContract(base:string){
 const response=await fetch(new URL('gameroom-launch.json',base),{signal:AbortSignal.timeout(2000)});
 const manifest=await response.json();
 if(!response.ok||manifest.game!=='cribbage'||manifest.protocol!=='gameroom-url'||manifest.version!==1)
  throw new Error(`Cribbage at ${base} does not support the Gameroom URL launch contract.`);
}
export async function waitForLaunchContract(base:string,server:Bun.Subprocess){
 const deadline=Date.now()+20_000;
 while(true){
  try{await verifyLaunchContract(base);return;}catch(error){
   if(server.exitCode!==null||Date.now()>deadline)throw new Error(`Cannot launch the integrated Cribbage server at ${base}. Check for a port collision and use the cribbage-gameroom worktree. ${error}`);
   await Bun.sleep(200);
  }
 }
}
