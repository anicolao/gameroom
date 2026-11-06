import {test,expect} from 'bun:test';
import {parseApplication,parseCatalog} from '../src/lib/catalog';
test('shared Applications fields retain document identity, title, icon and URL',()=>{
 expect(parseApplication('doc-17',{GameroomEnabled:true,Title:'  Azul ',Icon:'/ttlauncher/art/azul.png',WebURL:'https://games.example/azul'})).toEqual({id:'doc-17',title:'Azul',iconSrc:'https://anicolao.github.io/ttlauncher/art/azul.png',launchUrl:'https://games.example/azul',available:false,artKey:''});
});
test('hidden, missing and unsafe launch targets cannot become clickable games',()=>{
 const {games,rejected}=parseCatalog([
  {id:'hidden',data:{Title:'Hidden',WebURL:'https://games.example/',GameroomEnabled:false}},
  {id:'script',data:{GameroomEnabled:true,Title:'Bad',WebURL:'javascript:alert(1)'}},
  {id:'credential',data:{GameroomEnabled:true,Title:'Bad',WebURL:'https://user:password@games.example/'}},
  {id:'missing',data:{GameroomEnabled:true,WebURL:'https://games.example/'}},
  {id:'ok',data:{GameroomEnabled:true,Title:'Safe',WebURL:'https://games.example/',Icon:'javascript:alert(1)'}}
 ]);expect(games.map(game=>game.id)).toEqual(['ok']);expect(games[0].iconSrc).toBeNull();expect(rejected).toBe(3);
});
test('group integration is matched to the trusted game URL, never a title or document ID',()=>{
 expect(parseApplication('random-id',{GameroomEnabled:true,Title:'Cribbage',WebURL:'https://anicolao.github.io/cribbage/'})).toMatchObject({available:true,artKey:'cribbage'});
 expect(parseApplication('cribbage',{GameroomEnabled:true,Title:'Cribbage',WebURL:'https://other.example/cribbage/'})).toMatchObject({available:false});
 expect(parseApplication('cribbage',{GameroomEnabled:true,Title:'Cribbage',WebURL:'https://anicolao.github.io.evil.example/cribbage/'})).toMatchObject({available:false});
});
test('catalogue ordering uses titles and stable document IDs and supports an arbitrary collection',()=>{
 const {games}=parseCatalog(Array.from({length:37},(_,i)=>({id:String(i),data:{GameroomEnabled:true,Title:`Game ${37-i}`,WebURL:`https://games.example/${i}`}})));
 expect(games).toHaveLength(37);expect(games[0].title).toBe('Game 1');expect(games.at(-1)?.title).toBe('Game 37');
});

test('Gameroom selection is independent of tabletop and never falls back to URL',()=>{
 expect(parseApplication('legacy',{Title:'Legacy',URL:'https://table.example/'})).toBeNull();
 expect(parseApplication('missing-web',{Title:'Missing',URL:'https://table.example/',GameroomEnabled:true})).toBeNull();
 expect(parseApplication('cribbage',{Title:'Cribbage',URL:'https://table.example/',WebURL:'https://anicolao.github.io/cribbage/',Hidden:true,GameroomEnabled:true})).toMatchObject({available:true,launchUrl:'https://anicolao.github.io/cribbage/'});
});

test('known web versions resolve painted covers without claiming new group protocols',()=>{
 for(const [host,path,key] of [['egirard.github.io','jaipur','jaipur'],['anicolao.github.io','drm','drm'],['anicolao.github.io','gotfive','gotfive'],['anicolao.github.io','pantheon','pantheon'],['anicolao.github.io','rebelprincess','rebelprincess']]){
  expect(parseApplication('any',{Title:'Any title',GameroomEnabled:true,WebURL:`https://${host}/${path}/`})).toMatchObject({artKey:key,available:false});
 }
 expect(parseApplication('same-title',{Title:'Pantheon',GameroomEnabled:true,WebURL:'https://unknown.example/pantheon/'})).toMatchObject({artKey:'',available:false});
});

test('Can’t Stop group launching is recognized only by its exact integrated WebURL',()=>{
 expect(parseApplication('arbitrary',{Title:'Any label',GameroomEnabled:true,WebURL:'https://anicolao.github.io/cantstop/'})).toMatchObject({available:true,groupGame:'cantstop'});
 expect(parseApplication('cantstop',{Title:"Can't Stop",GameroomEnabled:true,WebURL:'https://other.example/cantstop/'})).toMatchObject({available:false});
});
