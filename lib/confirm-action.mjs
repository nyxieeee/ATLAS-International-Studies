'use client';

// Native dialog supplies focus trapping, inert background and Escape handling.
export function confirmAction(message){
 return new Promise(resolve=>{
  const previous=document.activeElement;
  const dialog=document.createElement('dialog');dialog.className='atlas-confirm';
  const title=document.createElement('h2');title.id='atlas-confirm-title';title.textContent='Confirm action';
  const description=document.createElement('p');description.id='atlas-confirm-description';description.textContent=message;
  dialog.setAttribute('aria-labelledby',title.id);dialog.setAttribute('aria-describedby',description.id);
  const actions=document.createElement('div');actions.className='atlas-confirm-actions';
  const cancel=document.createElement('button');cancel.textContent='Cancel';cancel.autofocus=true;
  const proceed=document.createElement('button');proceed.textContent='Continue';proceed.className='primary';
  let settled=false;
  const finish=(accepted)=>{if(settled)return;settled=true;dialog.close();dialog.remove();if(previous?.isConnected)previous.focus();resolve(accepted)};
  cancel.onclick=()=>finish(false);proceed.onclick=()=>finish(true);
  dialog.oncancel=event=>{event.preventDefault();finish(false)};
  dialog.onclick=event=>{if(event.target!==dialog)return;const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)finish(false)};
  actions.append(cancel,proceed);dialog.append(title,description,actions);document.body.append(dialog);dialog.showModal();cancel.focus();
 });
}
