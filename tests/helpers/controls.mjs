import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
const require=createRequire(import.meta.url);let cached;
 export function loadControls(){return cached??=Promise.all(['AppSelect','MotionTabs','StudyResponse','LoadingStatus'].map(async name=>{
 let source=await readFile(new URL('../../components/'+name+'.tsx',import.meta.url),'utf8');source=source.replace(/import \{([^}]+)\} from 'lucide-react';/g,(_,names)=>'const '+names.split(',').map(n=>n.trim()+'=()=>null').join(',')+';');
 let js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;js=js.replace(/from ["'](react(?:\/jsx-runtime)?|react-dom)["']/g,(_,p)=>'from '+JSON.stringify(pathToFileURL(require.resolve(p)).href));const url='data:text/javascript;base64,'+Buffer.from(js+'\n//# sourceURL=atlas-'+name+'-test.mjs').toString('base64');return {name,url,component:(await import(url)).default}
})).then(entries=>Object.fromEntries(entries.map(e=>[e.name,e])))}
