export function materialChunks(text,size=1000){const chunks=[];for(let start=0;start<text.length;){let end=Math.min(text.length,start+size);if(end<text.length){const boundary=text.lastIndexOf('\n',end);if(boundary>start+size/2)end=boundary;}const body=text.slice(start,end).trim();if(body)chunks.push({text:body,start,end});if(end===text.length)break;start=Math.max(start+1,end-100);}return chunks;}
export function buildMaterialContext(materials,query='',budget=20000){
 const terms=[...new Set(query.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu)||[])].filter(t=>!['the','and','with','this','that','from','what','which','about','have','does','explain','please'].includes(t));
 const groups=materials.map((m,i)=>({material:m,label:'D'+(i+1),chunks:materialChunks(m.text).map((c,index)=>({...c,index,score:terms.reduce((sum,t)=>sum+(c.text.toLowerCase().includes(t)?1:0),0)})).sort((a,b)=>b.score-a.score||a.index-b.index)}));
 const selected=[];let length=0;const add=(g,c)=>{const entry=`[${g.label}: ${g.material.name} | excerpt ${c.index+1}]\n${c.text}`;if(length+entry.length+2>budget)return false;selected.push({label:g.label,materialId:g.material.id,name:g.material.name,index:c.index,text:entry});length+=entry.length+2;return true};
 for(const g of groups){if(g.chunks[0])add(g,g.chunks[0]);}
 const remaining=groups.flatMap(g=>g.chunks.slice(1).map(c=>({g,c}))).sort((a,b)=>b.c.score-a.c.score||a.c.index-b.c.index);
 for(const {g,c} of remaining)add(g,c);
 return {text:selected.map(s=>s.text).join('\n\n'),excerpts:selected,partial:groups.some(g=>selected.filter(s=>s.materialId===g.material.id).length<g.chunks.length)};
}
