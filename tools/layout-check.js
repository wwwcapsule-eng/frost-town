// 畫面自動檢查（v1.00 加，作者 10/24：標示、建築、文字遮擋這些錯不要一直重犯）
// 每次更新開 PR 前跑一次：本機開 http://localhost:8080/?check （手機尺寸 375×812），網址有 ?check 就會自動載入這個檔
// 也可以在 console 打 layoutCheck.all() 重跑；結果印在 console，也存在 window.layoutResult
// ⑧介面的字被擠成兩行或超出框
// ⑦升級格、雇人格離自己的建築太遠（makeUnlock 有 owner 的）
// ⑥上方說明列（用最長的句子）跟按鈕、目標等介面互蓋
// 檢查：①標籤互相疊 ②標籤字超出畫面（被切掉）③標籤被上下的介面（目標、按鈕、提示）蓋住 ④付款格彼此重疊 ⑤付款格壓到建築
// 只檢查「目前存檔的進度」；layoutCheck.preset(n) 換成預設的幾個進度再重跑（會重新載入、蓋掉這台瀏覽器的存檔）
(function () {
  const PRESETS = [
    { name: '開場' },
    { name: '倉庫＋東邊', wh: true, tower: true, tower2: true, territory: 1, east: true, buys: 5, cash: 500, res: 12, tents: 4 },
    { name: '村莊＋煤礦', wh: true, tower: true, tower2: true, territory: 2, east: true, buys: 9, cash: 900, level: 1, res: 40, tents: 4, houses: 6, mine: true, shovel: true },
    { name: '小鎮＋石爐', wh: true, tower: true, tower2: true, territory: 2, east: true, buys: 15, cash: 2000, level: 2, res: 90, tents: 4, houses: 14, mine: true, shovel: true, stove: 1, quarry: true },
    { name: '小鎮＋圍欄外鐵匠鋪＋石屋', wh: true, territory: 2, east: true, buys: 18, cash: 2000, level: 2, res: 90, tents: 4, houses: 14, mine: true, shovel: true, stove: 1, quarry: true, porters: 3, coalers: 1, plan: [{ k: 'smith', x: -24, z: -5 }], stoneHouses: ['民房0', '民房1', '民房2'] }, // v1.02 作者回報的情況
  ];
  const inkCache = new Map();
  function ink(sp) {                                   // 標籤圖上真的有字的範圍（0～1）
    const cv = sp.material.map && sp.material.map.image;
    if (!cv || !cv.getContext) return null;
    const g = cv.getContext('2d'), w = cv.width, h = cv.height, d = g.getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) if (d[(y * w + x) * 4 + 3] > 60) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return x1 < 0 ? null : [x0 / w, y0 / h, (x1 + 2) / w, (y1 + 2) / h];
  }
  const shown = o => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
  function labelRects() {
    const cam = __game.camera, W = innerWidth, H = innerHeight, out = [];
    const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
    scene.traverse(o => {
      if (!o.isSprite || !shown(o)) return;
      const b = ink(o); if (!b) return;
      const c = o.getWorldPosition(new THREE.Vector3()), sx = o.scale.x * labelK.x, sy = o.scale.y * labelK.y;
      const pts = [[b[0], b[1]], [b[2], b[3]]].map(([u, v]) => c.clone().addScaledVector(right, (u - 0.5) * sx).addScaledVector(up, (0.5 - v) * sy).project(cam));
      if (pts.some(p => p.z > 1)) return;                // 在鏡頭後面
      const r = { x0: (pts[0].x + 1) / 2 * W - 2, y0: (1 - pts[0].y) / 2 * H - 2, x1: (pts[1].x + 1) / 2 * W + 2, y1: (1 - pts[1].y) / 2 * H + 2, sp: o }; // 四周各 2px：貼著也算擠
      if (r.x1 < 0 || r.x0 > W || r.y1 < 0 || r.y0 > H) return; // 整個在畫面外：看不到，不算
      out.push(r);
    });
    return out;
  }
  function hudRects() {
    return [...document.querySelectorAll('body *')].filter(e => {
      if (e.tagName === 'CANVAS' || e.id === 'frost' || e.id === 'toast') return false;
      const s = getComputedStyle(e); if (s.position !== 'fixed' || s.display === 'none' || s.visibility === 'hidden' || +s.opacity < 0.1) return false;
      const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.width < innerWidth * 0.98 && e.textContent.trim();
    }).flatMap(e => ['hud', 'bl', 'bars', 'topc'].includes(e.id) ? [...e.querySelectorAll(':scope > *, #bag > *')].filter(c => c.getBoundingClientRect().width && getComputedStyle(c).display !== 'none' && c.id !== 'bag') : [e]) // 容器（左上、左下、上方）拆成一顆顆小框量，跟遊戲裡的避讓一樣
      .map(e => ({ r: e.getBoundingClientRect(), id: e.id || e.className || e.tagName, e }));
  }
  const area = (a, b) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
  function where(sp) { const p = sp.getWorldPosition(new THREE.Vector3()); return '(' + p.x.toFixed(1) + ',' + p.z.toFixed(1) + ')'; }
  function checkHere(tag, found) {
    const L = labelRects(), H = hudRects(), W = innerWidth, HH = innerHeight;
    for (let i = 0; i < L.length; i++) {
      const a = L[i], aa = (a.x1 - a.x0) * (a.y1 - a.y0);
      const pw = a.sp.getWorldPosition(new THREE.Vector3()), focus = true; // v1.02（作者：遠處的字被切一半也很明顯）：所有看得到的標籤都要完整
      if (focus && (a.x0 < 0 || a.x1 > W || a.y0 < 0 || a.y1 > HH)) found.add('字被切掉：標籤 ' + where(a.sp) + ' 超出畫面邊緣');
      for (let j = i + 1; j < L.length; j++) {
        const b = L[j], ov = area(a, b);
        if (ov > 0.03 * Math.min(aa, (b.x1 - b.x0) * (b.y1 - b.y0))) found.add('標籤互疊：' + where(a.sp) + ' 和 ' + where(b.sp));
      }
      if (focus) for (const h of H) if (area(a, { x0: h.r.left, y0: h.r.top, x1: h.r.right, y1: h.r.bottom }) > 0.03 * aa) found.add('標籤被介面 #' + h.id + ' 蓋住：' + where(a.sp));
    }
  }
  function checkPads(found) {
    const g = __game, pads = g.unlocks.filter(u => !u.done && u.pad.parent);
    for (let i = 0; i < pads.length; i++) {
      const a = pads[i], ra = a.up ? 1.3 : 1;
      for (let j = i + 1; j < pads.length; j++) { const b = pads[j]; if (Math.hypot(a.x - b.x, a.z - b.z) < ra + (b.up ? 1.3 : 1) - 0.1) found.add('付款格重疊：' + a.name() + ' 和 ' + b.name()); }
      for (const b of g.buildings) if (!b.dead && Math.hypot(a.x - b.x, a.z - b.z) < b.r + ra * 0.6) found.add('付款格壓到建築：' + a.name() + ' 壓到 ' + b.key);
      if (a.owner && Math.hypot(a.x - a.owner.x, a.z - a.owner.z) > a.owner.r + 3.4) found.add('格子離自己的建築太遠：' + a.name() + ' 離 ' + a.owner.key + ' ' + Math.hypot(a.x - a.owner.x, a.z - a.owner.z).toFixed(1) + ' 格');
    }
  }
  function checkTowers(found) {                      // ⑨自己蓋的弩砲塔要能排在原本那一排（v1.03：被分區、格線擋住只能蓋別處）
    const g = __game; if (!g.towers.length) return;
    let ok = 0; for (let x = -FENCE_R - 6; x <= FENCE_R + 6; x += CFG.cell) if (g.canBuild(x, towerZ(), 'tower')) ok++;
    if (!ok) found.add('弩砲塔：原本那一排（z=' + towerZ().toFixed(1) + '）沒有任何位置能再蓋塔');
  }
  function checkHud(found) {                         // ⑥介面互蓋：上方說明列用最長的句子強制顯示一次，跟按鈕、目標、背包列比
    const al = document.getElementById('alert'), keep = [al.textContent, al.style.display];
    al.textContent = '🐻 3 隻熊＋🐺 狼群＋👑 熊王 15 秒後來襲'; al.style.display = 'block';
    const H = hudRects();
    for (let i = 0; i < H.length; i++) for (let j = i + 1; j < H.length; j++) {
      const a = H[i].r, b = H[j].r, ov = area({ x0: a.left, y0: a.top, x1: a.right, y1: a.bottom }, { x0: b.left, y0: b.top, x1: b.right, y1: b.bottom });
      if (ov > 0.1 * Math.min(a.width * a.height, b.width * b.height) && !H[i].e.contains(H[j].e) && !H[j].e.contains(H[i].e)) found.add('介面互蓋：#' + H[i].id + ' 和 #' + H[j].id);
    }
    for (const e of document.querySelectorAll('.pill')) {         // ⑧介面的字被擠成兩行、或超出框（v1.02：倉庫列被擠成兩行）
      const r = e.getBoundingClientRect(); if (!r.width) continue;
      if (r.height > 44 || e.scrollWidth > e.clientWidth + 1) found.add('介面的字被擠到：#' + (e.id || e.className) + '（高 ' + (r.height | 0) + 'px）');
    }
    al.textContent = keep[0]; al.style.display = keep[1];
  }
  function all() {
    const g = __game, found = new Set(), p0 = g.player.position.clone();
    const spots = [[0, 2], ...g.unlocks.filter(u => !u.done && u.pad.parent).map(u => [u.x, u.z]), ...g.buildings.filter(b => !b.dead).map(b => [b.x, b.z + b.r + 1.2])];
    for (const [x, z] of spots) {                      // 主角站到每個付款格、每棟建築門口看一次
      g.player.position.set(x, 0, z);
      g.camera.position.copy(g.player.position).add(camOffset); g.camera.lookAt(x, 0.8, z); g.camera.updateMatrixWorld(); // 鏡頭先就位，遊戲裡的避讓才算得準
      for (let i = 0; i < 3; i++) g.step(1 / 30);
      g.render(); checkHere('(' + x.toFixed(1) + ',' + z.toFixed(1) + ')', found);
    }
    checkPads(found);
    checkTowers(found);
    checkHud(found);
    g.player.position.copy(p0);
    const list = [...found];
    window.layoutResult = list;
    console.log('🔎 畫面檢查（' + spots.length + ' 個位置）：' + (list.length ? list.length + ' 個問題\n' + list.join('\n') : '沒有問題'));
    return list;
  }
  function preset(n) {
    const p = PRESETS[n]; if (!p) return PRESETS.map((p, i) => i + ' ' + p.name);
    window.writeSave = () => {};                       // 不要把現在的進度寫回去
    localStorage.setItem(SAVE_KEY, JSON.stringify(Object.assign({ cash: 0, bag: 0, axe: 0, level: 0, houses: 0, stove: 0 }, p, { name: undefined })));
    location.search = '?check';
  }
  window.layoutCheck = { all, preset, PRESETS };
  setTimeout(all, 2500);                               // 等模型載好
})();
