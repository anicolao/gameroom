<script lang="ts">
 import {T,useThrelte} from '@threlte/core';
 import {onMount,untrack} from 'svelte';
 import {OrthographicCamera,Vector3} from 'three';
 import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
 let {yaw=10,elevation=12,zoom=1,orbit=false,compact=false}:{yaw?:number;elevation?:number;zoom?:number;orbit?:boolean;compact?:boolean}=$props();
 const {size,renderer,invalidate}=useThrelte();
 const camera=new OrthographicCamera(-10,10,6,-6,.1,100);
 let controls:OrbitControls|undefined;
 $effect(()=>{
  const aspect=$size.width/Math.max(1,$size.height),span=Math.max(8.8,(compact?11.5:18.3)/aspect)/zoom;
  const target=new Vector3(0,2.75,-.15),a=yaw*Math.PI/180,b=elevation*Math.PI/180;
  camera.left=-span*aspect/2;camera.right=span*aspect/2;camera.top=span/2;camera.bottom=-span/2;
  camera.position.copy(target).add(new Vector3(Math.sin(a)*Math.cos(b)*30,Math.sin(b)*30,Math.cos(a)*Math.cos(b)*30));
  camera.lookAt(target);camera.updateProjectionMatrix();camera.updateMatrixWorld();
  untrack(()=>{if(controls){controls.target.copy(target);controls.update();}invalidate();});
 });
 onMount(()=>{
  controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,2.75,-.15);controls.update();invalidate();controls.enabled=orbit;controls.enableDamping=false;controls.minPolarAngle=.15;controls.maxPolarAngle=Math.PI*.55;controls.minZoom=.5;controls.maxZoom=3;
  const changed=()=>invalidate();controls.addEventListener('change',changed);
  return()=>{controls?.removeEventListener('change',changed);controls?.dispose();};
 });
 $effect(()=>{const active=orbit;if(controls)controls.enabled=active;});
</script>
<T is={camera} makeDefault manual/>
