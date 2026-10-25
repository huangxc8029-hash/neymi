const CACHE='neymi-shell-v1';
const SHELL=['/','/cards','/receive','/prepare','/offline.html','/manifest.webmanifest'];
function cachePolicy(pathname){
  if(/^\/p(?:\/|$)/.test(pathname)||/^\/v1\/publications(?:\/|$)/.test(pathname))return'network-only';
  if(['/','/cards','/receive','/prepare','/offline.html','/manifest.webmanifest'].includes(pathname)||pathname.startsWith('/_next/static/'))return'cache-first';
  return'network-only';
}
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin)return;
  const policy=cachePolicy(url.pathname);
  if(policy==='network-only'){
    if(request.mode==='navigate')event.respondWith(fetch(request).catch(()=>caches.match('/offline.html')));
    return;
  }
  if(url.searchParams.has('_rsc')){event.respondWith(fetch(request));return;}
  event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{
    if(response.ok){const copy=response.clone();void caches.open(CACHE).then(cache=>cache.put(request,copy));}
    return response;
  })));
});
