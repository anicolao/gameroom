/** Open blank first: `noopener` in window.open itself hides the success handle. */
export function prepareGameTab(open:()=>Window|null=()=>window.open('about:blank','_blank')):Window|null{
 let tab:Window|null=null;
 try{
  tab=open();
  if(!tab)return null;
  tab.opener=null;
  return tab;
 }catch{tab?.close();return null;}
}
/** An opened tab is not evidence that a remote game loaded or a player joined. */
export function navigateGameTab(tab:Window|null,destination:string):boolean{
 if(!tab)return false;
 try{if(tab.closed)return false;tab.location.replace(destination);return true;}
 catch{tab.close();return false;}
}
