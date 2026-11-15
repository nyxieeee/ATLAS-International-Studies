import DOMPurify from 'dompurify';
const allowedTags=['p','div','br','span','b','strong','i','em','u','s','strike','sub','sup','h1','h2','h3','blockquote','ul','ol','li'];
const allowedStyles=['font-weight','font-style','text-decoration','text-align','font-size','color','background-color'];
export function sanitizeNote(html){
 const cleaned=DOMPurify.sanitize(html,{ALLOWED_TAGS:allowedTags,ALLOWED_ATTR:['style']});
 const doc=new DOMParser().parseFromString(cleaned,'text/html');
 doc.body.querySelectorAll('[style]').forEach(el=>{const styles=allowedStyles.map(k=>[k,el.style.getPropertyValue(k)]).filter(([,v])=>v&&!/url|expression|var\(|@|\\/i.test(v));el.removeAttribute('style');styles.forEach(([k,v])=>el.style.setProperty(k,v))});
 return doc.body.innerHTML;
}
export function noteText(html){const doc=new DOMParser().parseFromString(sanitizeNote(html),'text/html');doc.querySelectorAll('br').forEach(n=>n.replaceWith('\n'));doc.querySelectorAll('p,div,li,h1,h2,h3,blockquote').forEach(n=>n.append('\n'));return doc.body.textContent||'';}
