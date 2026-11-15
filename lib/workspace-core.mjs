export function strokePath(points){return points.map(([x,y],i)=>(i?'L':'M')+x.toFixed(2)+','+y.toFixed(2)).join(' ')}
export function distanceToSegment(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy;if(!length)return Math.hypot(p[0]-a[0],p[1]-a[1]);const t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/length));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy)}
export function strokeHit(stroke,point,radius=16){if(stroke.points.length===1)return distanceToSegment(point,stroke.points[0],stroke.points[0])<radius;return stroke.points.some((p,i)=>i>0&&distanceToSegment(point,stroke.points[i-1],p)<radius+stroke.width/2)}
export function evidenceState(link,text,sources,projectId){if(link.projectId!==projectId)return 'different-project';if(!sources.some(s=>s.id===link.sourceId))return 'missing-source';if(!text.includes(link.claim))return 'edited-claim';return 'linked'}
export function hasSyncConflict(local,cloudRevision){return !!local?.dirty&&local.revision!==cloudRevision}
export async function pushSnapshot(client,userId,data,revision){
 const next=revision+1;
 const result=revision===0
  ? await client.from('atlas_workspaces').insert({user_id:userId,data,revision:1}).select('revision')
  : await client.from('atlas_workspaces').update({data,revision:next}).eq('user_id',userId).eq('revision',revision).select('revision');
 if(result.error){if(result.error.code==='23505')return {conflict:true,revision};throw result.error;}
 if(!result.data?.length)return {conflict:true,revision};
 return {conflict:false,revision:next};
}

export function strokeOnPage(stroke,page,pageHeight=1414){let min=Infinity,max=-Infinity;for(const point of stroke.points){min=Math.min(min,point[1]);max=Math.max(max,point[1])}return max>=page*pageHeight&&min<=(page+1)*pageHeight}
