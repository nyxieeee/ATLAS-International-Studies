// Model no-text reports are extraction failures, never source material.
export function isEmptyOcrReport(value){
 if(typeof value!=='string'||!value.trim())return true;
 const report=value.trim().replace(/^[\s\[\]*_`]+|[\s\[\]*_`]+$/g,'').replace(/\s+/g,' ');
 if(report.length>320)return false;
 return /^(?:(?:there(?: is| was|'s)\s+)?no\s+(?:(?:visible|readable|legible|discernible)\s+)?text\b|(?:the\s+)?(?:image|page)\s+(?:is\s+)?(?:blank|empty)\b|blank(?:\s+(?:page|image))?[.!]?$)/i.test(report);
}
