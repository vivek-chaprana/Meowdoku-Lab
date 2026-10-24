import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
const root=resolve('dist');
async function files(dir) {
  const entries=await readdir(dir,{withFileTypes:true});
  return (await Promise.all(entries.map(entry=>entry.isDirectory()?files(join(dir,entry.name)):[join(dir,entry.name)]))).flat();
}
const paths=(await files(root)).filter(path=>!path.endsWith('sw.js')).sort();
const hash=createHash('sha256');
for(const path of paths) hash.update(await readFile(path));
const version=hash.digest('hex').slice(0,16);
const urls=paths.map(path=>'/'+path.slice(root.length+1).replaceAll('\\','/'));
await writeFile(join(root,'sw.js'),`
const CACHE='meowdoku-${version}';
const ASSETS=${JSON.stringify(urls)};
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith('meowdoku-')&&key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin)return;
  const path=url.pathname.replace(/\\/+$/,'')||'/';
  if(request.mode==='navigate' && (path==='/'||path==='/algorithm-comparison'||path==='/index.html')) {
    event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(path==='/algorithm-comparison'?'/algorithm-comparison.html':'/index.html'))||fetch(request)));
    return;
  }
  if(ASSETS.includes(url.pathname)) event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(url.pathname))||fetch(request)));
});
`);
console.log('PWA: precached',urls.length,'files, including all page chunks and workers. Version:',version);
