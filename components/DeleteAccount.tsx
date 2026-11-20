'use client';
import {useState} from 'react';
import Link from 'next/link';
import {getCloudClient} from '@/lib/cloud';
import {purgeAccountDeviceData} from '@/lib/library-files';
export default function DeleteAccount(){
 const [confirmation,setConfirmation]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[deleted,setDeleted]=useState(false),[localWarning,setLocalWarning]=useState('');
 async function remove(event:React.FormEvent){event.preventDefault();if(busy||confirmation!=='DELETE')return;setBusy(true);setError('');try{
  const client=getCloudClient();if(!client)throw Error('Exit the demo and sign in to the account you want to delete.');
  const current=await client.auth.getUser();if(current.error||!current.data.user)throw Error('Sign in again before deleting your account.');
  const response=await fetch('/api/account/delete',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({confirmation})});const result=await response.json();if(!response.ok)throw Error(result.error||'Account deletion could not be completed.');
  setDeleted(true);
  try{await purgeAccountDeviceData(current.data.user.id)}catch{setLocalWarning('Your server account was deleted, but browser storage cleanup failed. Clear this site’s data in your browser settings on this and any other device.');}
  try{await client.auth.signOut({scope:'local'})}catch{/* The server has already deleted the account. */}
 }catch(e:any){setError(e.message||'Deletion failed. Please retry.')}finally{setBusy(false)}}
 if(deleted)return <div className="auth-state"><p className="auth-overline">ACCOUNT DELETED</p><h1>Your ATLAS account has been deleted.</h1><p>Your active server workspace, private originals and profile photos have been removed. Downloaded exports, other devices’ offline copies and provider backups are separate.</p>{localWarning&&<p className="warning" role="alert">{localWarning}</p>}<Link className="auth-primary" href="/login">Return to sign in</Link></div>;
 return <div className="auth-screen"><p className="auth-overline">YOUR DATA & ACCOUNT</p><h1>Delete your account</h1><p>This permanently removes your ATLAS account, workspace, notes, conversations, study resources, uploaded originals and custom profile photos.</p><p>Export anything you want to keep first. This cannot be undone. Your Google account is unaffected.</p><p className="auth-note">Deletion locks the account while files are removed. If it fails partway through, return to this page and retry. No workspace synchronization runs on this page.</p><form className="auth-form" onSubmit={remove}><label htmlFor="delete-confirmation">Type DELETE to confirm<input id="delete-confirmation" value={confirmation} onChange={e=>setConfirmation(e.target.value)} disabled={busy} autoComplete="off" spellCheck={false}/></label>{error&&<p className="auth-error" role="alert">{error}</p>}<button className="danger-button" type="submit" disabled={busy||confirmation!=='DELETE'}>{busy?'Deleting your account…':'Permanently delete my account'}</button></form><p><Link href="/#settings">Back to Settings</Link> · <Link href="/privacy">Privacy policy</Link></p></div>;
}
