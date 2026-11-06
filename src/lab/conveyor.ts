/** Presentation-only motion. A closed racetrack has its seam behind the wall. */
export const games=[
 {id:'cribbage',title:'Cribbage',color:'#173b30',atlas:0},
 {id:'drm',title:'DRM',color:'#172d57',art:'drm'},
 {id:'gotfive',title:'Got Five',color:'#547c71',art:'gotfive'},
 {id:'istanbul',title:'Istanbul',color:'#173c58',atlas:2},
 {id:'jaipur',title:'Jaipur',color:'#9b4e30',atlas:1},
 {id:'pantheon',title:'Pantheon',color:'#63443c',art:'pantheon'},
 {id:'rebelprincess',title:'Rebel Princess',color:'#67273f',art:'rebelprincess'},
 {id:'roborally',title:'Robo Rally',color:'#314548',atlas:3}
] as const;
export type LabGame=typeof games[number];
export {track,perimeter,seam,mod,pathAt,spring} from '../lib/cabinet/conveyor';
import {boxesAt as sample,positionForGame as findPosition,cabinetTrack,track} from '../lib/cabinet/conveyor';
export const cabinetFixtures=games.map(game=>({id:game.id,title:game.title,artKey:game.id,iconSrc:null}));
export const boxesAt=(position:number,carriers=12,row=0)=>sample(cabinetFixtures,position,carriers,row);
export const positionForGame=(id:string,position:number,carriers:number,compact=false)=>findPosition(cabinetFixtures,id,position,carriers,compact?cabinetTrack:track);
