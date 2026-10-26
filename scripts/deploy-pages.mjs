// GitHub Pages branch deployment for this standalone game.
// Deliberately avoids Actions/workflow permissions. Only verified dist/ files ship.
// main is never rewritten; future updates use `npm run deploy:pages` explicitly.
import {execFileSync} from 'node:child_process';
import {mkdtemp, readdir, rm, cp, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const git=(args,cwd=root)=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const remote=git(['remote','get-url','origin']);
const dist=path.join(root,'dist');
const files=await readdir(dist);
if(!files.includes('index.html')||!files.includes('build-manifest.json'))throw new Error('Run npm run verify before deploying.');
const deploy=await mkdtemp(path.join(tmpdir(),'brick-ball-pages-'));
try {
 git(['init','--initial-branch=gh-pages'],deploy);
 git(['remote','add','origin',remote],deploy);
 // Read remote errors before proceeding; authentication failures must not look like a new branch.
 const exists=git(['ls-remote','--heads','origin','gh-pages'],deploy);
 if(exists){git(['fetch','--depth=1','origin','gh-pages'],deploy);git(['reset','--hard','FETCH_HEAD'],deploy);}
 // Use the source repo's resolved author identity without changing global configuration.
 for(const key of ['user.name','user.email'])git(['config',key,git(['config',key])],deploy);
 for(const name of await readdir(deploy))if(name!=='.git')await rm(path.join(deploy,name),{recursive:true,force:true});
 for(const name of files)await cp(path.join(dist,name),path.join(deploy,name),{recursive:true});
 await writeFile(path.join(deploy,'.nojekyll'),'');
 git(['add','--all'],deploy);
 if(!git(['status','--porcelain'],deploy)){console.log('GitHub Pages is already up to date.');}
 else {
  git(['commit','-m',`Deploy verified game from ${git(['rev-parse','--short','HEAD'])}`],deploy);
  // A normal fast-forward push: concurrent deployments are rejected, never overwritten.
  console.log(git(['push','origin','HEAD:gh-pages'],deploy));
  console.log('gh-pages uploaded. GitHub Pages will publish this branch.');
 }
} finally {await rm(deploy,{recursive:true,force:true});}
