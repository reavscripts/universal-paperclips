/* Versioned offline shell. Saves remain exclusively in localStorage. */
'use strict';
const PREFIX='universal-paperclips:'+self.registration.scope+':';
const CACHE=PREFIX+'strategy-20261025-v6';
const SHELL=new URL('index.html',self.registration.scope).href;
const ASSETS=['index.html','interface.css','interface.js','settings.js','manifest.webmanifest','icon-192.png','icon-512.png','icon-maskable.png','apple-touch-icon.png'].map(name=>new URL(name,self.registration.scope).href);
async function fetchFile(url){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),8000);
  try{
    const response=await fetch(url,{cache:'reload',signal:controller.signal});
    if(!response.ok)throw Error('App file unavailable');
    // Read the body within the timeout, not just the response headers.
    const body=await response.arrayBuffer();
    if(!body.byteLength)throw Error('Empty app file');
    const path=new URL(url).pathname;
    if(url===SHELL){
      const html=new TextDecoder().decode(body);
      if(!html.includes('id="game-grid"')||!html.includes('id="clips"')||!html.includes('</html>'))throw Error('Incomplete game page');
    }else if(/\.(css|js)$/.test(path)&&new TextDecoder().decode(body).trimStart().startsWith('<'))throw Error('Unexpected HTML instead of app code');
    const headers=new Headers(response.headers);
    headers.delete('Content-Encoding');headers.delete('Content-Length');
    return new Response(body,{status:response.status,statusText:response.statusText,headers});
  }finally{clearTimeout(timeout);}
}
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    // Fetch a complete release before writing anything. A failed update keeps the old worker.
    const responses=await Promise.all(ASSETS.map(fetchFile));
    const cache=await caches.open(CACHE);
    await Promise.all(ASSETS.map((url,i)=>cache.put(url,responses[i])));
  })());
  // Never force activation or reload an ongoing game.
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
function recoveryPage(){
  return new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Connecting · Paperclips</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#18201d;color:#edf3eb;font:16px system-ui}main{max-width:420px;padding:28px}p{line-height:1.7;color:#becbbf}button{padding:12px 20px;border:0;border-radius:8px;background:#d2f86b;color:#18201d;font:inherit;cursor:pointer}</style><main><h1>Universal Paperclips</h1><p id="status" role="status">The server is taking longer to respond. Reconnecting automatically. Your saved progress stays on this device.</p><button id="retry">Try again now</button></main><script>
let pending=false,attempt=0,timer;
async function retry(){
 if(pending)return;clearTimeout(timer);pending=true;document.getElementById('retry').disabled=true;
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);
 try{const response=await fetch('index.html',{cache:'no-store',signal:controller.signal});const html=await response.text();if(response.ok&&html.includes('id="game-grid"')&&html.includes('id="clips"')&&html.includes('</html>')){location.reload();return;}}
 catch(_){}finally{clearTimeout(timeout);pending=false;document.getElementById('retry').disabled=false;}
 document.getElementById('status').textContent='Still waiting for the server. We will try again automatically. Your saved progress is safe.';
 timer=setTimeout(retry,Math.min(30000,3000*++attempt));
}
document.getElementById('retry').onclick=retry;window.addEventListener('online',retry);timer=setTimeout(retry,3000);
</script></html>`,{status:503,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
}
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url),scope=new URL(self.registration.scope);
  if(request.method!=='GET'||url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
  if(request.mode==='navigate'){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE),cached=await cache.match(SHELL);
      if(cached)return cached;
      try{return await fetchFile(SHELL);}catch(_){return recoveryPage();}
    })());
  }else if(ASSETS.includes(url.href)){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE),cached=await cache.match(url.href);
      return cached||fetch(request);
    })());
  }
});
