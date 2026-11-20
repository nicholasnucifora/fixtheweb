import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const destination='C:/Users/Nebula PC/Development/villow-site';
const stage=resolve('previews/villow-homepage-transfer/files');
process.chdir(destination);
const {designMarkup}=await import(pathToFileURL(resolve(destination,'src/lib/site-design.mjs')));
const {collectDesignAssets}=await import(pathToFileURL(resolve(destination,'scripts/site-design-integration.mjs')));
// The integration resolves its source tree from cwd; only read the destination.
const allowed=await collectDesignAssets();
const added=new Set(['watch-pattern-demo.css','watch-pattern-section.css','watch-pattern-settings.js','watch-pattern-geometry.js','watch-pattern-spline.js','assets/watch-pattern/inter-latin.woff2']);
const types={'.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.mp4':'video/mp4'};
createServer(async(req,res)=>{
  try{
    const path=new URL(req.url,'http://127.0.0.1:4382').pathname;
    if(path==='/'){
      const html=designMarkup(await readFile(resolve(stage,'34.html'),'utf8'));
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(html);return;
    }
    const name=decodeURIComponent(path.replace(/^\/_design\//,''));
    if(!path.startsWith('/_design/')||!allowed.has(name)&&!added.has(name)){res.writeHead(404);res.end('Not found');return;}
    let content=await readFile(added.has(name)?resolve(stage,name):resolve(destination,'previews/homepage',name));
    if(extname(name)==='.js') content=content.toString().replace(/(["'`])((?:assets|illustration-studies)\/)/g,'$1/_design/$2');
    res.writeHead(200,{'Content-Type':types[extname(name)]||'application/octet-stream','Cache-Control':'no-store'});res.end(content);
  }catch(error){res.writeHead(500);res.end(String(error));}
}).listen(4382,'127.0.0.1',()=>console.log('Staged Villow homepage: http://127.0.0.1:4382/#habits-and-controls'));
