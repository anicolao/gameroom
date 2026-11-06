import {CanvasTexture,MeshPhysicalMaterial,MeshStandardMaterial,RepeatWrapping,SRGBColorSpace,TextureLoader,Vector2,type Texture} from 'three';
import {boxColor,materialKey,type CabinetGame} from './catalogue';
const asset=(p:string)=>`${import.meta.env.BASE_URL}${p}`;
function canvas(width:number,height:number,paint:(g:CanvasRenderingContext2D)=>void){
 const c=document.createElement('canvas');c.width=width;c.height=height;paint(c.getContext('2d')!);const t=new CanvasTexture(c);t.colorSpace=SRGBColorSpace;t.anisotropy=8;return t;
}
function spine(game:CabinetGame){return canvas(256,1024,g=>{
 g.fillStyle=boxColor(game);g.fillRect(0,0,256,1024);g.strokeStyle='#dabd80';g.lineWidth=2;g.strokeRect(17,22,222,980);g.strokeStyle='#ffffff28';g.strokeRect(23,28,210,968);
 g.translate(128,512);g.rotate(-Math.PI/2);g.font='600 65px Georgia';g.textAlign='center';g.textBaseline='middle';g.fillStyle='#f5dfad';g.fillText(game.title,0,0,820);g.fillStyle='#d8b879';g.font='25px Georgia';g.fillText('◆',-420,0);g.fillText('◆',420,0);
 });}
function back(game:CabinetGame){return canvas(768,1024,g=>{
 g.fillStyle=boxColor(game);g.fillRect(0,0,768,1024);g.strokeStyle='#d9bc7a';g.lineWidth=3;g.strokeRect(34,34,700,956);g.strokeStyle='#d9bc7a55';g.strokeRect(44,44,680,936);
 g.translate(384,470);g.save();g.strokeStyle='#d9bc7a66';for(let i=0;i<6;i++){g.rotate(Math.PI/6);g.strokeRect(-145,-145,290,290);}g.restore();g.font='600 52px Georgia';g.textAlign='center';g.fillStyle='#efd4a1';g.fillText(game.title,0,310,620);
 });}
export function beltTexture(){return canvas(256,128,g=>{
 g.fillStyle='#211810';g.fillRect(0,0,256,128);for(let x=0;x<256;x++){const c=24+Math.round(6*Math.sin(x*.19));g.fillStyle=`rgb(${c+5},${c},${c-5})`;g.fillRect(x,0,1,128);}g.fillStyle='#090f0d';g.fillRect(0,0,3,128);g.fillStyle='#ad8b4a';g.fillRect(6,7,5,4);g.fillRect(6,117,5,4);g.strokeStyle='#bfa36a40';g.beginPath();g.moveTo(0,4);g.lineTo(256,4);g.moveTo(0,124);g.lineTo(256,124);g.stroke();
 });}
export function plasterTexture(){return canvas(512,512,g=>{
 let seed=461;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const pixels=g.createImageData(512,512);for(let i=0;i<pixels.data.length;i+=4){const v=220+rand()*25;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=v;pixels.data[i+3]=255;}g.putImageData(pixels,0,0);
 });}
export async function loadCabinetMaterials(onChange:()=>void=()=>{}){
 await document.fonts.ready;
 const loader=new TextureLoader(),textures:Texture[]=[];
 let disposed=false;
 const load=async(p:string,color=false)=>{const t=await loader.loadAsync(asset(p));if(color)t.colorSpace=SRGBColorSpace;t.anisotropy=8;if(disposed)t.dispose();else textures.push(t);return t;};
 const [wood,normal,rough]=await Promise.all([load('materials/walnut-color.jpg',true),load('materials/walnut-normal.jpg'),load('materials/walnut-roughness.jpg')]);
 for(const t of [wood,normal,rough]){t.wrapS=t.wrapT=RepeatWrapping;t.repeat.set(2,.65);}
 const rubber=beltTexture(),plaster=plasterTexture();rubber.wrapS=rubber.wrapT=RepeatWrapping;rubber.repeat.set(34,1);plaster.wrapS=plaster.wrapT=RepeatWrapping;plaster.repeat.set(5,3);textures.push(rubber,plaster);
 const materials={
  wood:new MeshPhysicalMaterial({map:wood,normalMap:normal,normalScale:new Vector2(.2,.2),roughnessMap:rough,color:'#866044',roughness:.6,clearcoat:.18,clearcoatRoughness:.5}),
  trim:new MeshPhysicalMaterial({map:wood,color:'#4d3220',roughness:.5,clearcoat:.25}),
  brass:new MeshPhysicalMaterial({color:'#c4a061',metalness:.78,roughness:.3}),
  belt:new MeshStandardMaterial({map:rubber,roughness:.94,metalness:.03}),
  wall:new MeshStandardMaterial({map:plaster,color:'#425a4c',roughness:1,bumpMap:plaster,bumpScale:.025}),
  dark:new MeshStandardMaterial({color:'#100b08',roughness:1}),
  cardboard:new MeshStandardMaterial({color:'#b7a486',roughness:.95}),
  bulb:new MeshStandardMaterial({color:'#ffd998',emissive:'#ffc67d',emissiveIntensity:2.2})
 };
 type Entry={refs:number;materials:MeshStandardMaterial[];textures:Texture[];ready:Promise<void>;disposed:boolean;used:number};
 const cache=new Map<string,Entry>();let clock=0,atlas:Promise<Texture>|undefined;
 const disposeEntry=(entry:Entry)=>{entry.disposed=true;new Set(entry.materials).forEach(m=>m.dispose());entry.textures.forEach(t=>t.dispose());};
 const trim=()=>{while(cache.size>32){const unused=[...cache].filter(([,e])=>e.refs===0).sort((a,b)=>a[1].used-b[1].used)[0];if(!unused)break;cache.delete(unused[0]);disposeEntry(unused[1]);}};
 function acquire(game:CabinetGame){
  const key=materialKey(game);let entry=cache.get(key);
  if(!entry){
   const side=spine(game),rear=back(game),placeholder=canvas(768,1024,g=>{
    g.fillStyle=boxColor(game);g.fillRect(0,0,768,1024);g.strokeStyle='#d9bc7a88';g.lineWidth=3;g.strokeRect(30,30,708,964);g.textAlign='center';g.textBaseline='middle';g.fillStyle='#e9d8ad';g.font='48px Georgia';g.fillText(game.title,384,512,650);
   });
   const edge=new MeshStandardMaterial({color:boxColor(game),roughness:.68}),sides=new MeshPhysicalMaterial({map:side,roughness:.48,clearcoat:.2,clearcoatRoughness:.5}),front=new MeshPhysicalMaterial({map:placeholder,roughness:.43,clearcoat:.3,clearcoatRoughness:.42}),rearMaterial=new MeshStandardMaterial({map:rear,roughness:.7});
   entry={refs:0,materials:[sides,sides,edge,edge,front,rearMaterial],textures:[side,rear,placeholder],ready:Promise.resolve(),disposed:false,used:++clock};
   const current=entry;
   current.ready=(async()=>{
    let art:Texture|undefined;
    const tile=({cribbage:0,jaipur:1,istanbul:2,roborally:3} as Record<string,number>)[game.artKey];
    try{
     if(tile!==undefined){const original=await(atlas??=load('art/game-covers.png',true));if(current.disposed)return;art=original.clone();art.repeat.set(.5,.5);art.offset.set(tile%2*.5,tile<2?.5:0);art.needsUpdate=true;}
     else if(['drm','gotfive','pantheon','rebelprincess'].includes(game.artKey))art=await loader.loadAsync(asset(`art/covers/${game.artKey}.png`));
     else if(game.iconSrc)art=await loader.loadAsync(game.iconSrc);
     if(art){if(current.disposed){art.dispose();return;}art.colorSpace=SRGBColorSpace;art.anisotropy=8;current.textures.push(art);front.map=art;front.needsUpdate=true;}
    }catch{/* Missing or CORS-restricted icons keep their readable, locally painted box. */}
    if(!current.disposed)onChange();
   })();
   cache.set(key,current);
  }
  entry.refs++;entry.used=++clock;trim();let released=false;
  return {materials:entry.materials,ready:entry.ready,release(){if(released)return;released=true;entry!.refs--;trim();}};
 }
 return {materials,rubber,acquire,dispose(){disposed=true;Object.values(materials).forEach(m=>m.dispose());cache.forEach(disposeEntry);cache.clear();textures.forEach(t=>t.dispose());}};
}
export type MaterialLibrary=Awaited<ReturnType<typeof loadCabinetMaterials>>;
export type LabMaterials=MaterialLibrary['materials'];
