import {Fragment,type ReactNode} from 'react';
function inline(text:string):ReactNode[]{return text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https:\/\/[^\s)]+\))/g).map((part,i)=>{
 if(part.startsWith('**')&&part.endsWith('**'))return <strong key={i}>{part.slice(2,-2)}</strong>;
 if(part.startsWith('`')&&part.endsWith('`'))return <code key={i}>{part.slice(1,-1)}</code>;
 const link=part.match(/^\[([^\]]+)\]\((https:\/\/[^\s)]+)\)$/);if(link){try{const url=new URL(link[2]);if(!url.username&&!url.password)return <a key={i} href={url.href} target="_blank" rel="noreferrer">{link[1]}</a>}catch{}}
 return <Fragment key={i}>{part}</Fragment>;
})}
/** Render study Markdown as React text nodes; never execute embedded HTML. */
export default function StudyResponse({text}:{text:string}){
 const rows=text.split('\n'),blocks:ReactNode[]=[];let i=0;
 while(i<rows.length){const line=rows[i].trim();if(!line){i++;continue}const key=i;
  if(line.includes('|')&&/^\s*\|?\s*:?-{3,}:?\s*\|/.test(rows[i+1]||'')){const cells=(value:string)=>value.trim().replace(/^\||\|$/g,'').split('|').map(c=>c.trim());const headers=cells(line),body:string[][]=[];i+=2;while(i<rows.length&&rows[i].includes('|')&&rows[i].trim())body.push(cells(rows[i++]));blocks.push(<div className="study-table" key={key}><table><thead><tr>{headers.map((h,n)=><th scope="col" key={n}>{inline(h)}</th>)}</tr></thead><tbody>{body.map((row,n)=><tr key={n}>{headers.map((_,col)=><td key={col}>{inline(row[col]||'')}</td>)}</tr>)}</tbody></table></div>);continue}
  if(line.startsWith('```')){const code=[];i++;while(i<rows.length&&!rows[i].trim().startsWith('```'))code.push(rows[i++]);i++;blocks.push(<pre key={key}><code>{code.join('\n')}</code></pre>);continue}
  if(/^#{1,6}\s/.test(line)){const content=inline(line.replace(/^#+\s*/,''));blocks.push(line.startsWith('###')?<h4 key={key}>{content}</h4>:<h3 key={key}>{content}</h3>);i++;continue}
  if(/^[-*•]\s|^\d+[.)]\s/.test(line)){const ordered=/^\d/.test(line),items=[];while(i<rows.length&&(ordered?/^\d+[.)]\s/:/^[-*•]\s/).test(rows[i].trim()))items.push(<li key={i}>{inline(rows[i++].trim().replace(/^(?:[-*•]|\d+[.)])\s+/,''))}</li>);blocks.push(ordered?<ol key={key}>{items}</ol>:<ul key={key}>{items}</ul>);continue}
  if(line.startsWith('>')){blocks.push(<blockquote key={key}>{inline(line.replace(/^>\s?/,''))}</blockquote>);i++;continue}
  if(/^[-*_]{3,}$/.test(line)){blocks.push(<hr key={key}/>);i++;continue}
  blocks.push(<p key={key}>{inline(line)}</p>);i++;
 }
 return <div className="study-response">{blocks}</div>;
}
