// Production build for a dependency-free static ES-module game.
// Copies only the files the browser actually needs into dist/, verifies that every
// referenced asset exists, and reports real byte sizes. No bundler is required
// because the game ships as native modules with no third-party dependencies.
import {mkdir,rm,copyFile,readFile,writeFile,readdir,stat} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const dist=path.join(root,'dist');
const SHIP=['index.html','src','assets'];
async function copyTree(from,to){
 const entries=await readdir(from,{withFileTypes:true});
 await mkdir(to,{recursive:true});
 for(const entry of entries){
  const src=path.join(from,entry.name),dest=path.join(to,entry.name);
  if(entry.isDirectory())await copyTree(src,dest);else await copyFile(src,dest);}}
async function walk(dir,base=dir){
 const out=[];
 for(const entry of await readdir(dir,{withFileTypes:true})){
  const full=path.join(dir,entry.name);
  if(entry.isDirectory())out.push(...await walk(full,base));
  else out.push({file:path.relative(base,full),bytes:(await stat(full)).size});}
 return out.sort((a,b)=>b.bytes-a.bytes);}
await rm(dist,{recursive:true,force:true});
await mkdir(dist,{recursive:true});
for(const item of SHIP){
 const from=path.join(root,item);
 if(!existsSync(from))throw new Error(`Missing required source: ${item}`);
 const to=path.join(dist,item);
 if((await stat(from)).isDirectory())await copyTree(from,to);else await copyFile(from,to);}
// Verify the shipped entry references resolve inside dist.
const html=await readFile(path.join(dist,'index.html'),'utf8');
const refs=[...html.matchAll(/(?:src|href)="([^"#][^"]*)"/g)].map(m=>m[1]).filter(r=>!/^https?:/.test(r));
const missing=refs.filter(r=>!existsSync(path.join(dist,r)));
if(missing.length)throw new Error(`index.html references missing files: ${missing.join(', ')}`);
// Verify every module import resolves inside dist.
const unresolved=[];
for(const {file} of await walk(path.join(dist,'src'))){
 if(!file.endsWith('.js'))continue;
 const source=await readFile(path.join(dist,'src',file),'utf8');
 for(const m of source.matchAll(/from\s*'(\.\/[^']+)'/g)){
  const target=path.join(dist,'src',m[1].replace('./',''));
  if(!existsSync(target))unresolved.push(`${file} -> ${m[1]}`);}}
if(unresolved.length)throw new Error(`Unresolved imports: ${unresolved.join(', ')}`);
// Guard against shipping the local test harness ungated or debug statements.
const mainSource=await readFile(path.join(dist,'src','main.js'),'utf8');
if(!/testMode=LOCAL_TEST_HOST/.test(mainSource))throw new Error('Test harness is not host-gated');
const files=await walk(dist);
const debug=[];
for(const {file} of files){
 if(!file.endsWith('.js'))continue;
 const source=await readFile(path.join(dist,file),'utf8');
 if(/\bconsole\.(log|debug|info)\(|\bdebugger\b/.test(source))debug.push(file);}
if(debug.length)throw new Error(`Debug statements in build: ${debug.join(', ')}`);
const total=files.reduce((sum,f)=>sum+f.bytes,0);
const manifest={builtAt:new Date().toISOString(),files:files.length,totalBytes:total,
 totalKB:+(total/1024).toFixed(1),largest:files.slice(0,8)};
await writeFile(path.join(dist,'build-manifest.json'),JSON.stringify(manifest,null,2));
console.log(`dist/ built: ${files.length} files, ${manifest.totalKB} KB total`);
for(const f of manifest.largest)console.log(`  ${(f.bytes/1024).toFixed(1).padStart(7)} KB  ${f.file}`);
