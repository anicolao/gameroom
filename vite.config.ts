import {defineConfig} from 'vite';
import {svelte} from '@sveltejs/vite-plugin-svelte';
import {fileURLToPath} from 'node:url';
export default defineConfig({base:process.env.PUBLIC_BASE_PATH??'/',plugins:[svelte()],resolve:{alias:[{find:/^@threlte\/extras$/,replacement:fileURLToPath(new URL('./node_modules/@threlte/extras/dist/interactivity/index.js',import.meta.url))}]},server:{allowedHosts:true}});
