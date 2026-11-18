import {copyFile,cp,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url);
await mkdir(new URL('../public/',import.meta.url),{recursive:true});
await copyFile(require.resolve('pdfjs-dist/build/pdf.worker.min.mjs'),new URL('../public/pdf.worker.min.mjs',import.meta.url));
// JBIG2/JPEG2000 images need matching decoder assets, fallbacks and licenses.
const root=new URL('./',pathToFileURL(require.resolve('pdfjs-dist/package.json')));
for(const folder of ['wasm','cmaps','standard_fonts']){
 await cp(new URL(folder,root),new URL('../public/pdfjs/'+folder,import.meta.url),{recursive:true});
}
