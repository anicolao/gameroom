/** Presentation data only. These fields do not imply a game launch protocol. */
export type CabinetGame={id:string;title:string;artKey:string;iconSrc:string|null};
const palette:Record<string,string>={cribbage:'#173b30',drm:'#172d57',gotfive:'#547c71',istanbul:'#173c58',jaipur:'#9b4e30',pantheon:'#63443c',rebelprincess:'#67273f',roborally:'#314548'};
export function boxColor(game:CabinetGame){
 if(palette[game.artKey])return palette[game.artKey];
 let hash=0;for(const c of game.id)hash=(Math.imul(hash,31)+c.charCodeAt(0))>>>0;
 return ['#24483f','#3c3b5b','#6b3e32','#4a542f','#684553'][hash%5];
}
export function materialKey(game:CabinetGame){return JSON.stringify([game.id,game.title,game.artKey,game.iconSrc]);}
