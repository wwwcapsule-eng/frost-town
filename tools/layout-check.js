// 畫面自動檢查（v1.00 加，作者 10/24：標示、建築、文字遮擋這些錯不要一直重犯）
// 每次更新開 PR 前跑一次：本機開 http://localhost:8080/?check （手機尺寸 375×812），網址有 ?check 就會自動載入這個檔
// 也可以在 console 打 layoutCheck.all() 重跑；結果印在 console，也存在 window.layoutResult
// 檢查：①標籤互相疊 ②主角附近的標籤字超出畫面（被切掉）③主角附近的標籤被上下的介面（目標、按鈕、提示）蓋住 ④付款格彼此重疊 ⑤付款格壓到建築
// 只檢查「目前存檔的進度」；layoutCheck.preset(n) 換成預設的幾個進度再重跑（會重新載入、蓋掉這台瀏覽器的存檔）
(function () {
  const PRESETS = [
    { name: '開場' },
    { name: '倉庫＋東邊', wh: true, territory: 1, east: true, buys: 5, cash: 500, res: 12, tents: 4 },
    { name: '村莊＋煤礦', wh: true, territory: 2, east: true, buys: 9, cash: 900, level: 1, res: 40, tents: 4, houses: 6, mine: true, shovel: true },
    { name: '小鎮＋石爐', wh: true, territory: 2, east: true, buys: 15, cash: 2000, level: 2, res: 90, tents: 4, houses: 14, mine: true, shovel: true, stove: 1, quarry: true },
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
      const r = { x0: (pts[0].x + 1) / 2 * W, y0: (1 - pts[0].y) / 2 * H, x1: (pts[1].x + 1) / 2 * W, y1: (1 - pts[1].y) / 2 * H, sp: o };
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
    }).map(e => ({ r: e.getBoundingClientRect(), id: e.id || e.className || e.tagName }));
  }
  const area = (a, b) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
  function where(sp) { const p = sp.getWorldPosition(new THREE.Vector3()); return '(' + p.x.toFixed(1) + ',' + p.z.toFixed(1) + ')'; }
  function checkHere(tag, found) {
    const L = labelRects(), H = hudRects(), W = innerWidth, HH = innerHeight;
    for (let i = 0; i < L.length; i++) {
      const a = L[i], aa = (a.x1 - a.x0) * (a.y1 - a.y0);
      const pw = a.sp.getWorldPosition(new THREE.Vector3()), focus = Math.hypot(pw.x - __game.player.position.x, pw.z - __game.player.position.z) < 6; // 主角附近、玩家正要看的標籤
      if (focus && (a.x0 < 0 || a.x1 > W || a.y0 < 0 || a.y1 > HH)) found.add('字被切掉：標籤 ' + where(a.sp) + ' 超出畫面邊緣');
      for (let j = i + 1; j < L.length; j++) {
        const b = L[j], ov = area(a, b);
        if (ov > 0.15 * Math.min(aa, (b.x1 - b.x0) * (b.y1 - b.y0))) found.add('標籤互疊：' + where(a.sp) + ' 和 ' + where(b.sp));
      }
      if (focus) for (const h of H) if (area(a, { x0: h.r.left, y0: h.r.top, x1: h.r.right, y1: h.r.bottom }) > 0.15 * aa) found.add('標籤被介面 #' + h.id + ' 蓋住：' + where(a.sp));
    }
  }
  function checkPads(found) {
    const g = __game, pads = g.unlocks.filter(u => !u.done && u.pad.parent);
    for (let i = 0; i < pads.length; i++) {
      const a = pads[i], ra = a.up ? 1.3 : 1;
      for (let j = i + 1; j < pads.length; j++) { const b = pads[j]; if (Math.hypot(a.x - b.x, a.z - b.z) < ra + (b.up ? 1.3 : 1) - 0.1) found.add('付款格重疊：' + a.name() + ' 和 ' + b.name()); }
      for (const b of g.buildings) if (!b.dead && Math.hypot(a.x - b.x, a.z - b.z) < b.r + ra * 0.6) found.add('付款格壓到建築：' + a.name() + ' 壓到 ' + b.key);
    }
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
