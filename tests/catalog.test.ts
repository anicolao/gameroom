import {test,expect} from 'bun:test';
import {parseApplication,parseCatalog} from '../src/lib/catalog';
test('shared Applications fields retain document identity, title, icon and URL',()=>{
 expect(parseApplication('doc-17',{Title:'  Azul ',Icon:'/ttlauncher/art/azul.png',URL:'https://games.example/azul'})).toEqual({id:'doc-17',title:'Azul',iconSrc:'https://anicolao.github.io/ttlauncher/art/azul.png',launchUrl:'https://games.example/azul',available:false,artKey:''});
});
test('hidden, missing and unsafe launch targets cannot become clickable games',()=>{
 const {games,rejected}=parseCatalog([
  {id:'hidden',data:{Title:'Hidden',URL:'https://games.example/',Hidden:true}},
  {id:'script',data:{Title:'Bad',URL:'javascript:alert(1)'}},
  {id:'credential',data:{Title:'Bad',URL:'https://user:password@games.example/'}},
  {id:'missing',data:{URL:'https://games.example/'}},
  {id:'ok',data:{Title:'Safe',URL:'https://games.example/',Icon:'javascript:alert(1)'}}
 ]);expect(games.map(game=>game.id)).toEqual(['ok']);expect(games[0].iconSrc).toBeNull();expect(rejected).toBe(3);
});
test('group integration is matched to the trusted game URL, never a title or document ID',()=>{
 expect(parseApplication('random-id',{Title:'Cribbage',URL:'https://anicolao.github.io/cribbage/'})).toMatchObject({available:true,artKey:'cribbage'});
 expect(parseApplication('cribbage',{Title:'Cribbage',URL:'https://other.example/cribbage/'})).toMatchObject({available:false});
 expect(parseApplication('cribbage',{Title:'Cribbage',URL:'https://anicolao.github.io.evil.example/cribbage/'})).toMatchObject({available:false});
});
test('catalogue ordering uses titles and stable document IDs and supports an arbitrary collection',()=>{
 const {games}=parseCatalog(Array.from({length:37},(_,i)=>({id:String(i),data:{Title:`Game ${37-i}`,URL:`https://games.example/${i}`}})));
 expect(games).toHaveLength(37);expect(games[0].title).toBe('Game 1');expect(games.at(-1)?.title).toBe('Game 37');
});
