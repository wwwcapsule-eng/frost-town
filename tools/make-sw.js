// 產生離線版 sw.js：把遊戲要用的檔案全部列進「預先快取」清單，第一次上網打開後，之後沒網路也能玩。
// 用法：node tools/make-sw.js [輸出檔=sw.js] [專案根目錄=.]　　（GitHub Actions 發布時會自動重跑一次，清單永遠是最新的）
const fs = require('fs'), path = require('path');
const out = process.argv[2] || 'sw.js', root = process.argv[3] || '.';
const V = /const VERSION = '([0-9.]+)'/.exec(fs.readFileSync(path.join(root, 'js/config.js'), 'utf8'))[1];
const walk = (d, skip = () => false) => fs.existsSync(path.join(root, d)) ? fs.readdirSync(path.join(root, d), { withFileTypes: true }).flatMap(e => skip(e.name) ? [] : e.isDirectory() ? walk(d + '/' + e.name, skip) : [d + '/' + e.name]) : [];
const files = ['./', 'index.html', ...walk('js'), ...walk('assets', n => /^(kaykit_|kenney_)/.test(n) || n === '.DS_Store')];
fs.writeFileSync(path.join(root, out), `// 離線版（自動產生，別手改：node tools/make-sw.js）：v${V}
// 安裝時把下面所有檔案存起來，之後沒網路也能開、能玩；有網路時先拿最新的並更新存檔。
const CACHE = 'frost-town-v${V}';
const FILES = ${JSON.stringify(files)};
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(FILES.map(f => fetch(f, { cache: 'reload' }).then(r => { if (r.ok) return c.put(f, r); }).catch(() => {})))));
});
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    try { const r = await fetch(e.request, { cache: 'no-cache' }); if (r.ok) c.put(e.request, r.clone()); return r; }
    catch (err) { const m = await c.match(e.request, { ignoreSearch: true }); if (m) return m; throw err; }
  }));
});
`);
console.log('sw.js：v' + V + '，預先快取 ' + files.length + ' 個檔案');
