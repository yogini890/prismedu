import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./tests/browser',workers:1,timeout:240000,expect:{timeout:30000},
 use:{baseURL:'http://127.0.0.1:3101',browserName:'chromium',channel:'chrome',headless:true,trace:'off',reducedMotion:'reduce',actionTimeout:30000,screenshot:'only-on-failure'},
 reporter:'list',
});

