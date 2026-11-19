const C='mls201-v1',F=['./','index.html','style.css','app.js','questions.js','supabase-config.js','manifest.json'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(F)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener('fetch',e=>{
 const r=e.request;if(r.method!=='GET'||r.url.includes('supabase.co'))return;
 e.respondWith(caches.match(r).then(m=>m||fetch(r).then(n=>{const cp=n.clone();caches.open(C).then(c=>c.put(r,cp));return n}).catch(()=>caches.match('index.html'))));
});
