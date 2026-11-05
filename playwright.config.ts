import {defineConfig} from '@playwright/test';
import {chromiumArgs} from './tests/e2e/helpers/browser-options';
export default defineConfig({
 testDir:'./tests/e2e',fullyParallel:false,workers:1,retries:0,forbidOnly:true,timeout:1_800_000,updateSnapshots:'none',
 reporter:[['list'],['html',{open:'never'}]],
 use:{channel:'chromium',baseURL:'http://127.0.0.1:4199',viewport:{width:1180,height:820},deviceScaleFactor:1,locale:'en-CA',timezoneId:'America/Toronto',actionTimeout:30_000,navigationTimeout:30_000,trace:'retain-on-failure',launchOptions:{args:chromiumArgs,ignoreDefaultArgs:['--disable-popup-blocking']}},
 projects:[{name:'chromium',use:{browserName:'chromium'}}],
 snapshotPathTemplate:'{testDir}/{testFileDir}/screenshots/{arg}-{platform}{ext}',
 expect:{timeout:60_000,toHaveScreenshot:{maxDiffPixels:0,threshold:0,animations:'disabled',caret:'hide',scale:'css'}},
 webServer:[{command:'bun scripts/serve-test.ts gameroom',url:'http://127.0.0.1:4199',reuseExistingServer:false,timeout:120_000},{command:'bun scripts/serve-test.ts cribbage',url:'http://127.0.0.1:4197',reuseExistingServer:false,timeout:120_000}]
});
