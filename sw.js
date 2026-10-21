/* Offline shell only. Saves stay in the original game's localStorage. */
'use strict';
const PREFIX='universal-paperclips:'+self.registration.scope+':';
const CACHE=PREFIX+'d8910f93fc3660f5';
const SHELL=new URL('index.html',self.registration.scope).href;
const ASSETS=['index.html','manifest.webmanifest','icon-192.png','icon-512.png','icon-maskable.png','apple-touch-icon.png'].map(name=>new URL(name,self.registration.scope).href);
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS.map(url=>new Request(url,{cache:'reload'})))));
  // A running game is never reloaded or replaced by an update.
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url),scope=new URL(self.registration.scope);
  if(request.method!=='GET'||url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
  if(request.mode==='navigate'){
    event.respondWith((async()=>{
      try{const response=await fetch(request);if(response.ok){const cache=await caches.open(CACHE);await cache.put(SHELL,response.clone());return response;}}
      catch(_){/* Use the complete cached game on network failure. */}
      return await caches.match(SHELL)||new Response('Open the app once while connected to finish offline setup.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
    })());
  }else if(ASSETS.includes(url.href)){
    event.respondWith(caches.match(request).then(cached=>cached||fetch(request)));
  }
});
