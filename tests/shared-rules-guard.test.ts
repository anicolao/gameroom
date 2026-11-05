import {expect,test} from 'bun:test';
import {reviewedRulesStatus} from '../scripts/shared-rules-guard.cjs';
test('deployed source filename changes do not look like permission drift',()=>{
 expect(reviewedRulesStatus([{name:'deployment/launcherui.rules',content:'after'}],'before','after')).toBe('current');
 expect(reviewedRulesStatus([{name:'firestore.rules',content:'before'}],'before','after')).toBe('deploy');
});
test('unreviewed permission changes and extra source files stop deployment',()=>{
 expect(()=>reviewedRulesStatus([{name:'firestore.rules',content:'someone else’s edit'}],'before','after')).toThrow('changed since review');
 expect(()=>reviewedRulesStatus([{name:'first',content:'before'},{name:'second',content:'other permissions'}],'before','after')).toThrow('Review all');
});
