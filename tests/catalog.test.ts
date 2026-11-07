import {test,expect} from 'bun:test';
import {parseApplication,parseCatalog} from '../src/lib/catalog';
test('shared Applications fields retain document identity, title, icon and URL',()=>{
 expect(parseApplication('doc-17',{GameroomEnabled:'new-tab',Title:'  Azul ',Icon:'/ttlauncher/art/azul.png',WebURL:'https://games.example/azul'})).toEqual({id:'doc-17',title:'Azul',iconSrc:'https://anicolao.github.io/ttlauncher/art/azul.png',launchUrl:'https://games.example/azul',mode:'new-tab',available:false,artKey:''});
});
test('hidden, missing and unsafe launch targets cannot become clickable games',()=>{
 const {games,rejected}=parseCatalog([
  {id:'hidden',data:{Title:'Hidden',WebURL:'https://games.example/',GameroomEnabled:'disabled'}},
  {id:'script',data:{GameroomEnabled:'new-tab',Title:'Bad',WebURL:'javascript:alert(1)'}},
  {id:'credential',data:{GameroomEnabled:'new-tab',Title:'Bad',WebURL:'https://user:password@games.example/'}},
  {id:'missing',data:{GameroomEnabled:'new-tab',WebURL:'https://games.example/'}},
  {id:'ok',data:{GameroomEnabled:'new-tab',Title:'Safe',WebURL:'https://games.example/',Icon:'javascript:alert(1)'}}
 ]);expect(games.map(game=>game.id)).toEqual(['ok']);expect(games[0].iconSrc).toBeNull();expect(rejected).toBe(3);
});
test('catalog modes alone select integrated or new-tab behavior',()=>{
 for(const id of ['cribbage','cantstop','unfamiliar'])for(const url of ['https://games.example/any/','https://anicolao.github.io/cribbage/']){
  expect(parseApplication(id,{GameroomEnabled:'integrated',Title:'Any game',WebURL:url})).toMatchObject({mode:'integrated',available:true,launchUrl:url});
  expect(parseApplication(id,{GameroomEnabled:'new-tab',Title:'Any game',WebURL:url})).toMatchObject({mode:'new-tab',available:false});
 }
 for(const mode of ['disabled',true,false,'true','unknown',undefined])expect(parseApplication('cribbage',{GameroomEnabled:mode,Title:'Cribbage',WebURL:'https://anicolao.github.io/cribbage/'})).toBeNull();
});
test('catalogue ordering uses titles and stable document IDs and supports an arbitrary collection',()=>{
 const {games}=parseCatalog(Array.from({length:37},(_,i)=>({id:String(i),data:{GameroomEnabled:'new-tab',Title:`Game ${37-i}`,WebURL:`https://games.example/${i}`}})));
 expect(games).toHaveLength(37);expect(games[0].title).toBe('Game 1');expect(games.at(-1)?.title).toBe('Game 37');
});

test('Gameroom selection is independent of tabletop and never falls back to URL',()=>{
 expect(parseApplication('legacy',{Title:'Legacy',URL:'https://table.example/'})).toBeNull();
 expect(parseApplication('missing-web',{Title:'Missing',URL:'https://table.example/',GameroomEnabled:'new-tab'})).toBeNull();
 expect(parseApplication('cribbage',{Title:'Cribbage',URL:'https://table.example/',WebURL:'https://anicolao.github.io/cribbage/',Hidden:true,GameroomEnabled:'integrated'})).toMatchObject({available:true,launchUrl:'https://anicolao.github.io/cribbage/'});
});

test('local covers are presentation only and never determine group support',()=>{
 for(const [host,path,key] of [['egirard.github.io','jaipur','jaipur'],['anicolao.github.io','drm','drm'],['anicolao.github.io','gotfive','gotfive'],['anicolao.github.io','pantheon','pantheon'],['anicolao.github.io','rebelprincess','rebelprincess']]){
  expect(parseApplication(key!,{Title:'Any title',GameroomEnabled:'new-tab',WebURL:`https://${host}/${path}/`})).toMatchObject({artKey:key,available:false});
 }
 expect(parseApplication('same-title',{Title:'Pantheon',GameroomEnabled:'new-tab',WebURL:'https://unknown.example/pantheon/'})).toMatchObject({artKey:'',available:false});
});
