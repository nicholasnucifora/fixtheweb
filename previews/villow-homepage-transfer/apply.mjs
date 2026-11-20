import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {resolve,dirname,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

// Bounded, reviewed transfer: only these files may be written outside the workspace.
const workspace=process.cwd();
const stage=resolve(workspace,'previews/villow-homepage-transfer/files');
const destination=resolve('C:/Users/Nebula PC/Development/villow-site/previews/homepage');
const files=['34.html','index.html','watch-pattern-demo.css','watch-pattern-section.css',
  'watch-pattern-settings.js','watch-pattern-geometry.js','watch-pattern-spline.js',
  'assets/watch-pattern/inter-latin.woff2','assets/watch-pattern/Inter-OFL.txt','WATCH-PATTERN.md'];
const baseline=JSON.parse(await readFile(resolve(workspace,'previews/villow-homepage-transfer/baseline.json'),'utf8'));
const prepared=[];
for(const name of files){
  const target=resolve(destination,name);
  if(!target.startsWith(destination+sep)) throw new Error('Target is outside the homepage directory.');
  const expected=baseline[name];
  if(expected){
    const actual=createHash('sha256').update(await readFile(target)).digest('hex');
    if(actual!==expected) throw new Error(`${name} changed since preparation; refusing to overwrite it.`);
  }else{
    try{await stat(target);throw new Error(`${name} already exists; refusing to overwrite it.`);}catch(error){if(error.code!=='ENOENT')throw error;}
  }
  prepared.push([target,await readFile(resolve(stage,name))]);
}
for(const [target,content] of prepared){await mkdir(dirname(target),{recursive:true});await writeFile(target,content);}
console.log(`Applied ${files.length} reviewed files to the local Villow homepage.`);
const repository=resolve(destination,'../..');
try{
  const build=execFileSync('cmd.exe',['/d','/s','/c','npm run build:local'],{cwd:repository,encoding:'utf8',maxBuffer:8*1024*1024});
  await writeFile(resolve(workspace,'previews/villow-homepage-transfer/build.log'),build);
  console.log(build.split('\n').slice(-12).join('\n'));
}catch(error){
  await writeFile(resolve(workspace,'previews/villow-homepage-transfer/build.log'),String(error.stdout||'')+String(error.stderr||''));
  throw error;
}
