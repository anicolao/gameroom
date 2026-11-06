<script lang="ts">
 import {T,useThrelte} from '@threlte/core';
 import {untrack} from 'svelte';
 import {OrthographicCamera,PerspectiveCamera,Vector3} from 'three';
 import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
 let {yaw=10,elevation=12,zoom=1,orbit=false,compact=false,targetHeight=2.75,fitWidth=18.3,perspective=false}:{yaw?:number;elevation?:number;zoom?:number;orbit?:boolean;compact?:boolean;targetHeight?:number;fitWidth?:number;perspective?:boolean}=$props();
 const {size,renderer,invalidate}=useThrelte();
 const orthographic=new OrthographicCamera(-10,10,6,-6,.1,100),natural=new PerspectiveCamera(28,1,.1,100);
 const camera=$derived(perspective?natural:orthographic);
 let controls:OrbitControls|undefined;
 $effect(()=>{
  const aspect=$size.width/Math.max(1,$size.height),span=Math.max(perspective?9.4:8.8,(compact?Math.min(14.8,fitWidth):fitWidth)/aspect)/zoom;
  const target=new Vector3(0,targetHeight,-.15),a=yaw*Math.PI/180,b=elevation*Math.PI/180;
  const distance=perspective?span/(2*Math.tan(natural.fov*Math.PI/360)):30;
  if(perspective){natural.aspect=aspect;natural.updateProjectionMatrix();}
  else{orthographic.left=-span*aspect/2;orthographic.right=span*aspect/2;orthographic.top=span/2;orthographic.bottom=-span/2;orthographic.updateProjectionMatrix();}
  camera.position.copy(target).add(new Vector3(Math.sin(a)*Math.cos(b)*distance,Math.sin(b)*distance,Math.cos(a)*Math.cos(b)*distance));
  camera.lookAt(target);camera.updateMatrixWorld();
  untrack(()=>{if(controls){controls.target.copy(target);controls.update();}invalidate();});
 });
 $effect(()=>{
  const active=camera,control=new OrbitControls(active,renderer.domElement);controls=control;
  control.target.set(0,untrack(()=>targetHeight),-.15);control.update();control.enabled=untrack(()=>orbit);control.enableDamping=false;control.minPolarAngle=.15;control.maxPolarAngle=Math.PI*.55;control.minZoom=.5;control.maxZoom=3;
  const changed=()=>invalidate();control.addEventListener('change',changed);invalidate();
  return()=>{control.removeEventListener('change',changed);control.dispose();if(controls===control)controls=undefined;};
 });
 $effect(()=>{const active=orbit;if(controls)controls.enabled=active;});
</script>
<T is={camera} makeDefault manual/>
