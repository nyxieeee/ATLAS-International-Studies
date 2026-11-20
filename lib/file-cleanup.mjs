/** Drain only durable deletion requests owned by this account. */
export async function cleanupRemovedOriginals(client,userId,removeLocal=async(scope,id)=>{}){
 const queued=await client.from('atlas_file_deletions').select('original_id').eq('user_id',userId).limit(100);
 if(queued.error)throw Error('File deletion is pending. Check the database migration and retry sync.');
 for(const row of queued.data||[]){
  const current=await client.from('atlas_workspaces').select('data').eq('user_id',userId).maybeSingle();
  if(current.error)throw current.error;
  const retained=(current.data?.data?.materials||[]).some(m=>m.originalId===row.original_id);
  if(!retained){
   const removed=await client.storage.from('atlas-library-files').remove([userId+'/'+row.original_id]);
   if(removed.error)throw Error('File deletion is pending. Retry sync when connected.');
   await removeLocal('atlas-account-'+userId,row.original_id);
  }
  const ack=await client.from('atlas_file_deletions').delete().eq('user_id',userId).eq('original_id',row.original_id);
  if(ack.error)throw ack.error;
 }
}
