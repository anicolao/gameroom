const status=document.querySelector('#status');
document.querySelector('#extension-id').textContent='Extension ID: '+chrome.runtime.id;
const wanted=new URLSearchParams(location.search).get('request');
const requests=await chrome.runtime.sendMessage({method:'pending'});
if(!Array.isArray(requests)){status.textContent='Could not read pending requests.';}
else {
 const items=requests.filter(op=>!wanted||op.requestId===wanted);
 if(!items.length)status.textContent='No pending requests. Use this extension ID in Gameroom’s BGA test launcher.';
 for(const op of items){
  const section=document.createElement('section'),title=document.createElement('h2'),client=document.createElement('p');
  title.textContent=op.title;client.textContent='Request from '+op.client;section.append(title,client);
  for(const [method,label] of [['approve','Open BGA to create table'],['deny','Deny']]){
   const button=document.createElement('button');button.textContent=label;
   button.addEventListener('click',async()=>{
    for(const control of section.querySelectorAll('button'))control.disabled=true;
    try{const reply=await chrome.runtime.sendMessage({method,requestId:op.requestId});status.textContent=reply.error??(reply.status==='cancelled'?'Request denied.':'BGA opened. Create your table there; Gameroom will receive its URL automatically.');}catch{status.textContent='Could not confirm. Reopen BGA Boss before trying again.';}
   });section.append(button);
  }document.querySelector('#requests').append(section);
 }
}
