import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests/e2e',testMatch:'bga-bridge.spec.ts',workers:1,retries:0,forbidOnly:true,timeout:90000,use:{channel:'chromium'},reporter:'list'});
