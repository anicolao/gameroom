/** Shared Applications catalogue: Gameroom is opt-in and uses only WebURL. */
export type Game={id:string;title:string;iconSrc:string|null;launchUrl:string;mode:'integrated'|'new-tab';available:boolean;artKey:string;players?:string;duration?:string};
export type CatalogSnapshot={status:'loading'|'current'|'offline'|'empty'|'error';games:Game[];rejected:number};
export function httpsUrl(value:unknown):string|null{
 if(typeof value!=='string'||!value.trim())return null;
 try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;}catch{return null;}
}
/** Local cover choices are presentation only; launch support always comes from the catalog. */
export function catalogArt(id:string){
 return ({cribbage:'cribbage',cantstop:'cantstop',jaipur:'jaipur',istanbul:'istanbul',roborally:'roborally',rebelprincess:'rebelprincess',gotfive:'gotfive',drm:'drm',pantheon:'pantheon',Istanbul:'istanbul',RRpr:'drm',imN9w9SQV3ovd5cOMS6v:'jaipur',kP3RBulKehZDX3d6Yn8H:'pantheon',uVzIn6qMCJPH1Q3qv7cZ:'roborally'} as Record<string,string>)[id.replace(/^cover-/, '')]??'';
}
export function parseApplication(id:string,value:Record<string,unknown>,assetOrigin='https://anicolao.github.io/ttlauncher/'):Game|null{
 if(value.GameroomEnabled!=='integrated'&&value.GameroomEnabled!=='new-tab')return null;
 const title=typeof value.Title==='string'?value.Title.trim():'',launchUrl=httpsUrl(value.WebURL);
 if(!title||!launchUrl)return null;
 let iconSrc=httpsUrl(value.Icon);
 if(typeof value.Icon==='string'&&value.Icon.startsWith('/')&&!value.Icon.startsWith('//')&&!value.Icon.includes('\\'))iconSrc=httpsUrl(new URL(value.Icon,assetOrigin).href);
 const artKey=catalogArt(id),mode=value.GameroomEnabled,available=mode==='integrated';
 return {id,title,iconSrc,launchUrl,mode,available,artKey};
}
export function parseCatalog(documents:{id:string;data:Record<string,unknown>}[],assetOrigin?:string){
 const games:Game[]=[];let rejected=0;
 for(const document of documents){const game=parseApplication(document.id,document.data,assetOrigin);if(game)games.push(game);else if(['integrated','new-tab'].includes(document.data.GameroomEnabled as string))rejected++;}
 const collator=new Intl.Collator('en-CA',{sensitivity:'base',numeric:true});
 games.sort((a,b)=>collator.compare(a.title,b.title)||a.id.localeCompare(b.id));
 return {games,rejected};
}
