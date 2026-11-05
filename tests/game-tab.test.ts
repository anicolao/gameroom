import {expect,test} from 'bun:test';
import {prepareGameTab,navigateGameTab} from '../src/lib/game-tab';
test('blocked and throwing opens produce a fallback without navigating',()=>{
 expect(prepareGameTab(()=>null)).toBeNull();
 expect(prepareGameTab(()=>{throw new Error('blocked');})).toBeNull();
 expect(navigateGameTab(null,'https://example.com')).toBe(false);
});
test('the opener is severed before game navigation and a closed tab cannot count as opened',()=>{
 const visited:string[]=[];
 const tab={opener:{},closed:false,close(){this.closed=true;},location:{replace(url:string){expect(tab.opener).toBeNull();visited.push(url);}}};
 const handle=prepareGameTab(()=>tab as unknown as Window);
 expect(navigateGameTab(handle,'https://example.com/cribbage')).toBe(true);
 expect(visited).toEqual(['https://example.com/cribbage']);
 tab.close();expect(navigateGameTab(handle,'https://example.com/again')).toBe(false);
});
test('navigation failure closes the empty tab and offers a fallback',()=>{
 const tab={closed:false,close(){this.closed=true;},location:{replace(){throw new Error('navigation refused');}}};
 expect(navigateGameTab(tab as unknown as Window,'https://example.com')).toBe(false);
 expect(tab.closed).toBe(true);
});
