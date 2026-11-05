import {mount} from 'svelte';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/600.css';
import App from './App.svelte';
import './style.css';
mount(App,{target:document.getElementById('app')!});
