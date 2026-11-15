import pptxgen from 'pptxgenjs';
export function presentationSlides(title,text){
 const slides=[];let heading=title,lines=[],notes=[];const flush=()=>{if(lines.length||notes.length){slides.push({title:heading,lines,notes});lines=[];notes=[]}};
 for(const raw of text.split('\n')){const line=raw.trim();if(!line)continue;if(/^Speaker notes?:/i.test(line)){notes.push(line.replace(/^Speaker notes?:\s*/i,''));continue}if(/^#{1,3}\s/.test(line)){flush();heading=line.replace(/^#+\s*/,'');continue}const clean=line.replace(/^[-*•]\s*/,'').replace(/\*\*/g,'');for(let i=0;i<clean.length;i+=180){if(lines.length===4)flush();lines.push(clean.slice(i,i+180))}}
 flush();return slides.length?slides:[{title,lines:['No presentation content supplied.']}];
}
export async function buildPresentation(title,text,sourceNames=[]){
 const deck=new pptxgen();deck.layout='LAYOUT_WIDE';deck.author='ATLAS';deck.subject='AI-assisted study presentation';deck.title=title;deck.lang='en-US';deck.theme={headFontFace:'Georgia',bodyFontFace:'Arial',lang:'en-US'};
 const slides=[{title,lines:['Study presentation','Review against your original materials']},...presentationSlides(title,text)];
 if(sourceNames.length)slides.push(...presentationSlides('Study materials',sourceNames.map((name,i)=>'[D'+(i+1)+'] '+name).join('\n')));
 for(const [i,data] of slides.entries()){
  const slide=deck.addSlide();slide.background={color:'F8F7F3'};
  slide.addShape(deck.ShapeType.rect,{x:.7,y:.5,w:.5,h:.05,line:{color:'1F5BFF'},fill:{color:'1F5BFF'}});
  slide.addText(data.title,{x:.7,y:.8,w:11.8,h:1.1,fontFace:'Georgia',fontSize:30,color:'202B35',bold:true,margin:0,breakLine:false,fit:'shrink'});
  slide.addText(data.lines.map(line=>({text:line,options:{breakLine:true,paraSpaceAfterPt:16}})),{x:.7,y:2.2,w:11.8,h:4.2,fontFace:'Arial',fontSize:21,color:'202B35',margin:0,valign:'top',fit:'shrink'});
  slide.addText('ATLAS - '+(i+1)+' / '+slides.length,{x:.7,y:7,w:11.8,h:.2,fontSize:10,color:'5F6872',margin:0});
  slide.addNotes([data.title,...(data.notes?.length?data.notes:data.lines),'AI-generated study content. Check claims against the original readings.',...sourceNames.map((name,n)=>'[D'+(n+1)+'] '+name)]);
 }
 const result=await deck.write({outputType:'uint8array'});return new Uint8Array(result);
}
export async function downloadPresentation(title,text,sources=[]){const bytes=await buildPresentation(title,text,sources);const url=URL.createObjectURL(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.presentationml.presentation'}));const a=document.createElement('a');a.href=url;a.download=(title.replace(/[^\p{L}\p{N} _-]/gu,'').slice(0,80)||'ATLAS presentation')+'.pptx';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
