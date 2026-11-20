import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {transform} from 'esbuild';

const workspace=process.cwd();
const destination='C:/Users/Nebula PC/Development/villow-site/previews/homepage';
const stage=resolve(workspace,'previews/villow-homepage-transfer/files');
await mkdir(stage,{recursive:true});
const read=name=>readFile(resolve(workspace,name),'utf8');
const write=async(name,body)=>{await mkdir(dirname(resolve(stage,name)),{recursive:true});await writeFile(resolve(stage,name),body);};
// Render the existing Astro illustration before removing it from Fix the Web.
const html=await (await fetch('http://127.0.0.1:4321/work/villow?preset=c')).text();
const figure=html.match(/<figure\b[^>]*data-reflection-demo[\s\S]*?<\/figure>/)?.[0];
if(!figure) throw new Error('The existing illustration was not found.');
const section=`\n<!-- watch-pattern:start -->
<section class="watch-pattern-section" id="habits-and-controls" aria-labelledby="watch-pattern-heading">
  <header class="watch-pattern-copy">
    <h2 id="watch-pattern-heading">See the pattern.<br>Change it right there.</h2>
    <p>Your activity and controls live side by side. See when you watch, then set aside watch-free time on the very same chart.</p>
  </header>
  <div class="watch-pattern-example">
    <h3>When you watch</h3>
    ${figure.replaceAll('ftw-','villow-home-')}
    <p class="watch-pattern-caption">An example with illustrative activity.</p>
  </div>
</section>
<!-- watch-pattern:end -->\n`;
await writeFile(resolve(workspace,'previews/villow-homepage-transfer/section.html'),section);
const original=await readFile(resolve(destination,'34.html'),'utf8');
const closing='</section></div></section><section class="n-social o-social"';
if(!original.includes(closing)) throw new Error('Homepage section boundary changed.');
const updated=original.replace(closing,`</section>${section}</div></section><section class="n-social o-social"`)
  .replace('</head>','<link rel="stylesheet" href="watch-pattern-demo.css"><link rel="stylesheet" href="watch-pattern-section.css"><script type="module" src="watch-pattern-settings.js"></script></head>');
await write('34.html',updated);
await write('index.html',updated);
await write('watch-pattern-demo.css',await read('src/styles/villow-watch-free-demo.css'));
for(const [source,name] of [['src/lib/villow-monotone-spline.ts','watch-pattern-spline.js'],['src/lib/villow-demo-curve.ts','watch-pattern-geometry.js'],['src/scripts/villow-reflection.ts','watch-pattern-settings.js']]){
  let code=await read(source);
  code=code.replace("'./villow-monotone-spline'","'./watch-pattern-spline.js'")
    .replace("'../lib/villow-demo-curve'","'./watch-pattern-geometry.js'");
  if(name==='watch-pattern-settings.js') {
    code=code.replace('map(day=>names[day])','map(day=>names[day].slice(0,3))');
    code+='\ninitialiseReflectionDemos();\n';
  }
  await write(name,'// Adapted from the Villow app illustration; fictional activity, no account data.\n'+(await transform(code,{loader:'ts',format:'esm',target:'es2022'})).code);
}
await mkdir(resolve(stage,'assets/watch-pattern'),{recursive:true});
await copyFile(resolve(workspace,'src/assets/fonts/inter-v20-latin-opsz-normal.woff2'),resolve(stage,'assets/watch-pattern/inter-latin.woff2'));
await copyFile(resolve(workspace,'src/assets/fonts/Inter-OFL.txt'),resolve(stage,'assets/watch-pattern/Inter-OFL.txt'));
const baseline={};
for(const name of ['34.html','index.html']) baseline[name]=createHash('sha256').update(await readFile(resolve(destination,name))).digest('hex');
await writeFile(resolve(workspace,'previews/villow-homepage-transfer/baseline.json'),JSON.stringify(baseline,null,2));
console.log('Prepared the homepage section, original animation and independent weekday controls.');
