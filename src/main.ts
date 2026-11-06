import {mount} from 'svelte';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/600.css';
import App from './App.svelte';
import './style.css';
const target=document.getElementById('app')!;
if(/\/dev\/(shelves|animations)\/?$/.test(location.pathname)){
 void Promise.all([import('./lab/ConveyorLab.svelte'),import('./lab/lab.css')]).then(([{default:Lab}])=>mount(Lab,{target}));
}else mount(App,{target});
