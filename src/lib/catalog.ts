/** Shared Applications catalogue: Gameroom is opt-in and uses only WebURL. */
export type Game={id:string;title:string;iconSrc:string|null;launchUrl:string;available:boolean;artKey:string;players?:string;duration?:string};
export type CatalogSnapshot={status:'loading'|'current'|'offline'|'empty'|'error';games:Game[];rejected:number};
export function httpsUrl(value:unknown):string|null{
 if(typeof value!=='string'||!value.trim())return null;
 try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;}catch{return null;}
}
export function catalogArt(url:string){
 const target=new URL(url);
 const path=target.pathname.replace(/\/+$/,'');
 if(target.hostname==='egirard.github.io'&&path==='/jaipur')return 'jaipur';
 if(target.hostname!=='anicolao.github.io')return '';
 return ({'/cribbage':'cribbage','/jaipur':'jaipur','/istanbul':'istanbul','/roborally':'roborally','/rebelprincess':'rebelprincess','/gotfive':'gotfive','/drm':'drm','/pantheon':'pantheon'} as Record<string,string>)[path]??'';
}
export function parseApplication(id:string,value:Record<string,unknown>,assetOrigin='https://anicolao.github.io/ttlauncher/'):Game|null{
 if(value.GameroomEnabled!==true)return null;
 const title=typeof value.Title==='string'?value.Title.trim():'',launchUrl=httpsUrl(value.WebURL);
 if(!title||!launchUrl)return null;
 let iconSrc=httpsUrl(value.Icon);
 if(typeof value.Icon==='string'&&value.Icon.startsWith('/')&&!value.Icon.startsWith('//')&&!value.Icon.includes('\\'))iconSrc=httpsUrl(new URL(value.Icon,assetOrigin).href);
 const artKey=catalogArt(launchUrl),available=artKey==='cribbage';
 return {id,title,iconSrc,launchUrl,available,artKey,...(available?{players:'2–4 players',duration:'30–45 min'}:{})};
}
export function parseCatalog(documents:{id:string;data:Record<string,unknown>}[],assetOrigin?:string){
 const games:Game[]=[];let rejected=0;
 for(const document of documents){const game=parseApplication(document.id,document.data,assetOrigin);if(game)games.push(game);else if(document.data.GameroomEnabled===true)rejected++;}
 const collator=new Intl.Collator('en-CA',{sensitivity:'base',numeric:true});
 games.sort((a,b)=>collator.compare(a.title,b.title)||a.id.localeCompare(b.id));
 return {games,rejected};
}
