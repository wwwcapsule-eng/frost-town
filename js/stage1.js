'use strict';
// ===== 第 1 關：冰湖營地（v1.16，企劃 12.4～12.8；作者 10/24：建築換完後做第一階段、做法選「小而完整」）=====
// 新玩家從這裡開始；舊存檔、layout-check 的存檔直接當第 2 關（config.js 的 save.stage）。
// 做法：整個第 2 關的世界照常建好，進第 1 關時把場景裡的東西都藏起來，只留燈光、主角、雪；第 1 關自己的東西放在 root 底下。
// 玩法：站在雪堆上壓成🧊冰磚、撿🪵枯枝加進火堆、在冰洞🐟釣魚；冰磚在「蓋冰屋」格子蓋冰屋（每間 2 床）；人口增加後村民自己幫忙
// （漁夫、拾荒者、壓雪工輪流）；自給自足 → 冰湖崩裂預告 → 守住火堆 45 秒 → 遷徙去第 2 關。
const stage1 = (() => {
  const S = { on: false };
  const CFG1 = { cap: 4, igloo: 5, bedPer: 2, maxIgloo: 4, burn: 0.55, burnDis: 1.6, twigFuel: 10, pressT: 1.0, fishT: 3.0, pileRe: 25, twigRe: 18, twigReDis: 8,
    arrive: 14, need: { igloos: 3, pop: 6, fuel: 50 }, warn: 15, dis: 45, retry: 30 };
  const st = save.s1 = Object.assign({ fuel: 55, fish: 3, bricks: 0, igloos: 0, pop: 0, dis: 0, disT: 0, retryT: 0, arriveT: 6, done: false }, save.s1);
  const root = new THREE.Group();
  const FIRE = [0, 4], PAD = [0, 10.3], LAKE = [0, -11, 7];
  const SLOTS = [[-6.8, 1.2], [6.8, 1.2], [-6.8, 8.6], [6.8, 8.6]];
  const PILES = [[-12, -2], [12, -2], [-13.5, 6.5], [13.5, 6.5], [-8, 15], [8, 15]];
  const TWIGS = [[-10, 11], [10, 11], [-15, -5], [15, -5]];
  const HOLES = [[-3.6, -4.6], [3.6, -4.6]];
  const mat = c => M(c);
  const bag = [], piles = [], twigs = [], holes = [], igloos = [], folks = [];
  let hideT = 0, walk = 0, saveT = 0, inkT = 0, shake = 0, hudTxtT = 0, fishT = 0, fireT = 0;
  const ell = (m, rx, ry, rz, x, y, z, p = root) => { const o = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), m); o.scale.set(rx, ry, rz); o.position.set(x, y, z); p.add(o); return o; };

  // ---- 場景 ----
  const ground = new THREE.Mesh(new THREE.CircleGeometry(34, 48), mat(0x8fb9d6)); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; root.add(ground);
  const lake = new THREE.Mesh(new THREE.CircleGeometry(LAKE[2], 40), mat(0xe6f6fd)); lake.rotation.x = -Math.PI / 2; lake.position.set(LAKE[0], 0.02, LAKE[1]); root.add(lake);
  const rim = new THREE.Mesh(new THREE.RingGeometry(LAKE[2], LAKE[2] + 0.7, 40), mat(0xd9eef8)); rim.rotation.x = -Math.PI / 2; rim.position.set(LAKE[0], 0.025, LAKE[1]); root.add(rim);
  const cracks = new THREE.Group(); cracks.visible = false; root.add(cracks);
  for (let i = 0; i < 9; i++) {                                           // 崩裂時浮現的裂縫：從湖心往外的白色折線
    const a = i / 9 * Math.PI * 2 + 0.3, len = 5 + (i % 3) * 0.9, c = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, len), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    c.position.set(LAKE[0] + Math.sin(a) * len / 2, 0.05, LAKE[1] + Math.cos(a) * len / 2); c.rotation.y = a; c.userData.k = i / 9; cracks.add(c);
  }
  for (let i = 0; i < 14; i++) { const a = i * 0.9 + 0.4, r = 9 + (i * 7 % 8) * 1.7; ell(mat(0xe8f3fa), 0.9 + (i % 3) * 0.3, 0.45, 0.8, Math.sin(a) * r * 1.5, 0.2, 2 + Math.cos(a) * r * 0.9); } // 遠處的雪丘
  // 火堆：一圈石頭＋火焰；暖光圈
  const fireG = new THREE.Group(); fireG.position.set(FIRE[0], 0, FIRE[1]); root.add(fireG);
  for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; ell(mat(0x8a929c), 0.38, 0.28, 0.34, Math.sin(a) * 0.95, 0.2, Math.cos(a) * 0.95, fireG); }
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.3, 7), new THREE.MeshBasicMaterial({ color: 0xff8a1f })); flame.position.y = 0.8; fireG.add(flame);
  const flame2 = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.8, 7), new THREE.MeshBasicMaterial({ color: 0xffd34d })); flame2.position.y = 0.65; fireG.add(flame2);
  [[0.25, 0.1, 0.1, 0.5], [-0.3, 0.1, 0.2, -0.4], [0.05, 0.1, -0.3, 1.6]].forEach(([x, y, z, ry]) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.0, 6), mat(0x6b4a2b)); l.rotation.z = Math.PI / 2; l.rotation.y = ry; l.position.set(x, y + 0.1, z); fireG.add(l); });
  const warm = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshBasicMaterial({ color: 0xffd88a, transparent: true, opacity: 0.28, depthWrite: false })); warm.rotation.x = -Math.PI / 2; warm.position.set(FIRE[0], 0.03, FIRE[1]); root.add(warm);
  const fireLabel = makeLabel(); fireLabel.scale.set(3, 1.5, 1); fireLabel.position.set(FIRE[0], 2.6, FIRE[1]); root.add(fireLabel);
  // 雪堆、枯枝、冰洞
  PILES.forEach(([x, z]) => { const m = ell(mat(0xffffff), 1.05, 0.5, 1.05, x, 0.22, z); piles.push({ x, z, m, prog: 0, t: 0, alive: true }); });
  TWIGS.forEach(([x, z]) => { const g = new THREE.Group(); g.position.set(x, 0, z); root.add(g);
    [0.3, 1.5, 2.6].forEach((ry, i) => { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.1, 6), mat(0x7a5230)); s.rotation.z = Math.PI / 2; s.rotation.y = ry; s.position.set(0, 0.12 + i * 0.1, 0); g.add(s); });
    twigs.push({ x, z, g, t: 0, alive: true }); });
  HOLES.forEach(([x, z]) => { const h = new THREE.Mesh(new THREE.CircleGeometry(0.75, 20), mat(0x24658a)); h.rotation.x = -Math.PI / 2; h.position.set(x, 0.045, z); root.add(h);
    const r = new THREE.Mesh(new THREE.RingGeometry(0.75, 1.05, 20), mat(0xf4fbff)); r.rotation.x = -Math.PI / 2; r.position.set(x, 0.05, z); root.add(r); holes.push({ x, z, prog: 0, h }); });
  // 蓋冰屋格
  const pad = makePad(PAD[0], PAD[1], 2.6, 0xffd34d, '🧊', true); root.add(pad); pad.userData.paid = 0;
  const padLabel = makeLabel(320, 180); padLabel.scale.set(3.2, 1.8, 1); padLabel.position.set(PAD[0], 1.9, PAD[1]); root.add(padLabel);
  const price = () => CFG1.igloo + st.igloos;

  function buildIgloo(i, pop = true) {
    const [x, z] = SLOTS[i], g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = Math.atan2(FIRE[0] - x, FIRE[1] - z); root.add(g);
    const ice = mat(0xf2fafe), line = mat(0xc4dfec);
    ell(ice, 1.7, 1.25, 1.7, 0, 0, 0, g);
    [0.45, 0.85].forEach((y, k) => { const t = new THREE.Mesh(new THREE.TorusGeometry(1.62 * Math.sqrt(1 - (y / 1.25) ** 2), 0.045, 6, 28), line); t.rotation.x = Math.PI / 2; t.position.y = y; g.add(t); }); // 冰磚的橫縫
    const tun = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.7, 1.3, 12, 1, false, 0, Math.PI * 2), ice); tun.rotation.x = Math.PI / 2; tun.position.set(0, 0.42, 1.55); tun.scale.set(1, 1, 0.9); g.add(tun);
    const door = new THREE.Mesh(new THREE.CircleGeometry(0.46, 14), mat(0x2b3f52)); door.position.set(0, 0.38, 2.22); g.add(door);
    igloos.push({ g, x, z });
    if (pop) { sfx.unlock(); sparkleAt(x, z); }
  }
  function sparkleAt(x, z) { for (let i = 0; i < 6; i++) floatText('✨', x + (i - 2.5) * 0.4, z + (i % 2) * 0.6, '#ffe066'); }

  // ---- 背包 ----
  const bagMesh = type => type === 'brick' ? new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.3, 0.42), mat(0xbfe6f6)) : type === 'twig' ? (() => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.7, 6), mat(0x7a5230)); m.rotation.z = Math.PI / 2; return m; })() : ell(mat(0xa9c8d8), 0.4, 0.14, 0.2, 0, 0, 0, new THREE.Group());
  function addBag(type) { if (bag.length >= CFG1.cap) return false; const m = bagMesh(type); stackRoot.add(m); bag.push({ type, m }); restackBag(); return true; }
  function restackBag() { bag.forEach((b, i) => { b.m.position.set(0, i * 0.3, 0); b.m.rotation.y = 0; }); }
  function takeBag(type) { const k = bag.findIndex(b => b.type === type); if (k < 0) return false; stackRoot.remove(bag[k].m); bag.splice(k, 1); restackBag(); return true; }

  // ---- 村民：漁夫（站冰洞釣魚）、拾荒者（枯枝↔火堆）、壓雪工（站雪堆）；依到達順序輪流 ----
  function addFolk(n, quick) {
    const g = new THREE.Group(), role = n % 3;
    const b = box(0.6, 0.75, 0.45, M([0x4a7fb0, 0x8e6b3e, 0xcfd8de][role])); b.position.y = 0.6; g.add(b); const h = box(0.45, 0.42, 0.42, mats.skin); h.position.y = 1.2; g.add(h);
    dress(g, [b, h], [1, 2, 5][role] + (n % 4) * 2); vest(g, [0x4fb3e8, 0xb5703a, 0xdfe6ea][role]);
    g.position.set(quick ? FIRE[0] + 2 : 14, 0, quick ? FIRE[1] + 3 : 15); root.add(g);
    const spot = role === 0 ? HOLES[(n / 3 | 0) % 2] : role === 2 ? PILES[(n / 3 | 0) % 6] : TWIGS[(n / 3 | 0) % 4];
    folks.push({ g, role, n, spot: [spot[0] + (role === 0 ? 0 : 1.4), spot[1] + (role === 0 ? 2.2 : 0.8)], t: Math.random() * 5, leg: 0 });
  }
  const roleCount = r => folks.filter(f => f.role === r).length;
  const selfSufficient = () => roleCount(0) >= 1 && roleCount(1) >= 1 && roleCount(2) >= 1 && st.igloos >= CFG1.need.igloos && st.pop >= CFG1.need.pop && st.fuel >= CFG1.need.fuel;

  // ---- 介面 ----
  const hudEl = document.createElement('div'), goalEl = document.createElement('div');
  hudEl.id = 's1hud'; goalEl.id = 's1goal';
  hudEl.style.cssText = 'position:fixed;left:12px;top:78px;z-index:6;display:flex;flex-wrap:wrap;gap:6px;max-width:calc(100vw - 24px);pointer-events:none;font:800 15px sans-serif;color:#fff';
  goalEl.style.cssText = 'position:fixed;left:12px;right:70px;top:12px;z-index:6;background:rgba(255,255,255,.9);color:#2b3f52;border-radius:14px;padding:8px 12px;font:800 14px/1.35 sans-serif;pointer-events:none';
  const pill = (id, t) => `<span id="${id}" style="background:rgba(20,30,50,.62);padding:4px 10px;border-radius:14px;white-space:nowrap">${t}</span>`;
  function hudText() {
    const beds = st.igloos * CFG1.bedPer, f = Math.round(st.fuel);
    hudEl.innerHTML = pill('s1f', '🔥 ' + f + '%') + pill('s1s', '🐟 ' + st.fish) + pill('s1h', '🏠 ' + st.igloos + '/' + CFG1.maxIgloo) + pill('s1p', '👥 ' + st.pop + '/' + beds) + pill('s1b', '🎒 ' + bag.length + '/' + CFG1.cap);
    let g;
    if (st.dis === 1) g = '🧊 冰湖傳來碎裂聲！' + Math.ceil(st.disT) + ' 秒後崩裂，備好枯枝、守住火堆！';
    else if (st.dis === 2) g = '🧊 冰湖崩裂中！再撐 ' + Math.ceil(st.disT) + ' 秒，別讓火堆熄了（🪵 撿枯枝丟火堆）';
    else if (st.fuel <= 0) g = '🔥 火堆熄了！快撿 🪵 枯枝丟進火堆';
    else if (st.igloos === 0) g = bag.some(b => b.type === 'brick') || st.bricks ? '🧊 把冰磚揹到黃色格「蓋冰屋」' : '🧊 站在白色雪堆上，把雪壓成冰磚（要 ' + price() + ' 塊）';
    else if (st.pop < 3) g = '🔥 火堆旁蓋好冰屋了，流民會慢慢來；先撿 🪵 枯枝、🐟 在冰洞釣魚養活大家';
    else if (st.igloos < CFG1.need.igloos) g = '🏠 再蓋冰屋（' + st.igloos + '/' + CFG1.need.igloos + '），讓更多人住下來';
    else if (!selfSufficient()) g = '📋 自給自足：🐟 漁夫 ' + roleCount(0) + '　🪵 拾荒者 ' + roleCount(1) + '　🧊 壓雪工 ' + roleCount(2) + '　👥 ' + st.pop + '/' + CFG1.need.pop + '　🔥 ' + f + '/' + CFG1.need.fuel;
    else g = '✅ 自給自足了！';
    goalEl.textContent = g;
    padLabel.visible = st.igloos < CFG1.maxIgloo && st.dis === 0;
    if (padLabel.visible) padLabel.set(['🧊 蓋冰屋 +' + CFG1.bedPer + ' 床', '🧊 ' + Math.min(price(), pad.userData.paid + st.bricks + bag.filter(b => b.type === 'brick').length) + '/' + price()], '#ffe066', [36, 68]);
    fireLabel.set([st.fuel <= 0 ? '🔥 火堆熄了' : '🔥 火堆 ' + f + '%', '丟枯枝加火、交魚'], st.fuel > 40 ? '#ffd34d' : '#ff8a5c', [34, 50]);
  }

  // ---- 每一格 ----
  const dist = (a, x, z) => Math.hypot(a.x - x, a.z - z);
  function step(dt) {
    undeclutter();
    const px = player.position.x, pz = player.position.z;
    // 移動（跟第 2 關一樣用搖桿／WASD；邊界是圓形、不穿冰屋和火堆）
    let ix = joy.x, iy = joy.y;
    if (keys.KeyA || keys.ArrowLeft) ix -= 1; if (keys.KeyD || keys.ArrowRight) ix += 1;
    if (keys.KeyW || keys.ArrowUp) iy -= 1; if (keys.KeyS || keys.ArrowDown) iy += 1;
    if (camMode.on) ix = iy = 0;
    const il = Math.hypot(ix, iy); if (il > 1) { ix /= il; iy /= il; }
    const mx = right.x * ix + fwd.x * -iy, mz = right.y * ix + fwd.y * -iy, moving = Math.hypot(mx, mz) > 0.05;
    if (moving) {
      if (hintOn) { hintOn = false; $('hint').style.display = 'none'; }
      let nx = px + mx * CFG.speed * dt, nz = pz + mz * CFG.speed * dt;
      const r = Math.hypot(nx, nz - 4); if (r > 20) { nx = nx / r * 20; nz = 4 + (nz - 4) / r * 20; }
      for (const o of igloos) { const d = Math.hypot(nx - o.x, nz - o.z); if (d < 2.0 && d > 0) { nx = o.x + (nx - o.x) / d * 2.0; nz = o.z + (nz - o.z) / d * 2.0; } }
      const df = Math.hypot(nx - FIRE[0], nz - FIRE[1]); if (df < 0.9 && df > 0) { nx = FIRE[0] + (nx - FIRE[0]) / df * 0.9; nz = FIRE[1] + (nz - FIRE[1]) / df * 0.9; }
      player.position.x = nx; player.position.z = nz; player.rotation.y = Math.atan2(mx, mz); walk += dt * 12;
    }
    player.tick(walk, moving); updateMixers(dt);
    bag.forEach((b, i) => { b.m.position.x = Math.sin(walk * 0.5) * i * 0.012; });
    const X = player.position.x, Z = player.position.z;

    // 火堆：燒柴；崩裂時燒得快
    st.fuel = Math.max(0, st.fuel - (st.dis === 2 ? CFG1.burnDis : CFG1.burn) * dt);
    const fp = st.fuel / 100; flame.visible = flame2.visible = st.fuel > 0; flame.scale.set(0.6 + fp * 0.6, 0.4 + fp * 0.9 + Math.sin(fireT += dt * 18) * 0.06, 0.6 + fp * 0.6); flame2.scale.copy(flame.scale);
    warm.scale.setScalar(st.fuel > 0 ? 3.2 + fp * 4 : 0.001);

    // 雪堆：站著壓 1 秒＝1 塊冰磚
    for (const p of piles) {
      if (!p.alive) { if ((p.t -= dt) <= 0) { p.alive = true; p.m.visible = true; p.m.scale.set(1.05, 0.5, 1.05); } continue; }
      if (dist(p, X, Z) < 1.2 && bag.length < CFG1.cap) {
        p.prog += dt; p.m.scale.y = 0.5 * (1 - p.prog / CFG1.pressT * 0.7);
        if (p.prog >= CFG1.pressT) { p.prog = 0; p.alive = false; p.m.visible = false; p.t = CFG1.pileRe; addBag('brick'); sfx.coin(); floatText('+🧊', p.x, p.z, '#9fdcff'); }
      } else if (p.prog > 0) { p.prog = Math.max(0, p.prog - dt); p.m.scale.y = 0.5 * (1 - p.prog / CFG1.pressT * 0.7); }
    }
    // 枯枝
    for (const t of twigs) {
      if (!t.alive) { if ((t.t -= dt) <= 0) { t.alive = true; t.g.visible = true; } continue; }
      if (dist(t, X, Z) < 1.1 && bag.length < CFG1.cap) { t.alive = false; t.g.visible = false; t.t = st.dis === 2 ? CFG1.twigReDis : CFG1.twigRe; addBag('twig'); sfx.coin(); }
    }
    // 冰洞釣魚
    for (const h of holes) {
      if (dist(h, X, Z) < 1.3 && bag.length < CFG1.cap) { h.prog += dt; if (h.prog >= CFG1.fishT) { h.prog = 0; addBag('fish'); sfx.coin(); floatText('+🐟', h.x, h.z, '#bfe8ff'); } }
      else h.prog = Math.max(0, h.prog - dt);
      h.h.material.color.setHex(h.prog > 0 ? 0x3c9bd0 : 0x24658a);
    }
    // 火堆旁：丟枯枝、交魚
    if (Math.hypot(X - FIRE[0], Z - FIRE[1]) < 2.2 && (bag.some(b => b.type !== 'brick'))) {
      if ((fireT2 -= dt) <= 0) {
        fireT2 = 0.15;
        if (takeBag('twig')) { st.fuel = Math.min(100, st.fuel + CFG1.twigFuel); sfx.coin(); }
        else if (takeBag('fish')) { st.fish++; sfx.coin(); }
      }
    }
    // 蓋冰屋格：背著的冰磚、村民壓好的冰磚都能付
    if (st.igloos < CFG1.maxIgloo && st.dis === 0 && Math.hypot(X - PAD[0], Z - PAD[1]) < 1.5) {
      if ((padT -= dt) <= 0) {
        padT = 0.2;
        if (st.bricks > 0) { st.bricks--; pad.userData.paid++; sfx.coin(); }
        else if (takeBag('brick')) { pad.userData.paid++; sfx.coin(); }
        if (pad.userData.paid >= price()) { pad.userData.paid = 0; buildIgloo(st.igloos); st.igloos++; toast('🏠 冰屋蓋好了！+' + CFG1.bedPer + ' 張床'); }
      }
    }
    pad.fill.scale.y = Math.max(0.0001, pad.userData.paid / price()); pad.visible = st.igloos < CFG1.maxIgloo && st.dis === 0;

    // 流民：有空床、火夠旺、有魚就來一個；吃的魚：每 30 秒每 3 人 1 條
    if (st.pop < st.igloos * CFG1.bedPer && st.fuel > 20 && st.fish > 0 && st.dis === 0) {
      if ((st.arriveT -= dt) <= 0) { st.arriveT = CFG1.arrive; addFolk(st.pop); st.pop++; toast('👥 一位流民被火光吸引過來了'); }
    }
    if ((fishT += dt) >= 30) { fishT = 0; const eat = Math.ceil(st.pop / 3); if (st.fish >= eat) st.fish -= eat; else if (st.pop > 0) { st.fish = 0; toast('🐟 魚不夠吃了！快去釣魚'); } }
    for (const f of folks) {                                                    // 村民的動作和產出
      f.t += dt; const g = f.g;
      if (f.role === 1) {                                                       // 拾荒者：枯枝點 ↔ 火堆
        const a = f.t % 10 < 5 ? f.spot : [FIRE[0] + 1.6, FIRE[1] + 1.2], b = f.t % 10 < 5 ? [FIRE[0] + 1.6, FIRE[1] + 1.2] : f.spot, k = (f.t % 5) / 5;
        g.position.set(a[0] + (b[0] - a[0]) * k, Math.abs(Math.sin(f.t * 10)) * 0.08, a[1] + (b[1] - a[1]) * k); g.rotation.y = Math.atan2(b[0] - a[0], b[1] - a[1]);
        if (f.t >= 10) { f.t -= 10; st.fuel = Math.min(100, st.fuel + 8); }
      } else {
        const dx = f.spot[0] - g.position.x, dz = f.spot[1] - g.position.z, d = Math.hypot(dx, dz);
        if (d > 0.3) { g.position.x += dx / d * 2.2 * dt; g.position.z += dz / d * 2.2 * dt; g.rotation.y = Math.atan2(dx, dz); }
        else { g.rotation.y = Math.atan2(f.role === 0 ? LAKE[1] - g.position.z : 0.3, f.role === 0 ? 0 : 1); g.position.y = f.role === 2 ? Math.abs(Math.sin(f.t * 6)) * 0.1 : 0;
          if (f.t >= (f.role === 0 ? 9 : 14)) { f.t = 0; if (f.role === 0) { st.fish++; floatText('+🐟', g.position.x, g.position.z, '#bfe8ff'); } else { st.bricks++; floatText('+🧊', g.position.x, g.position.z, '#9fdcff'); } } }
      }
    }
    // 自給自足 → 崩裂預告 → 崩裂 → 遷徙
    if (!st.done) {
      if (st.dis === 0) {
        if ((st.retryT -= dt) <= 0 && selfSufficient()) { st.dis = 1; st.disT = CFG1.warn; toast('🧊 冰湖傳來碎裂聲！'); beep(180, 0.5, 'sawtooth', 0.06, 0.6); }
      } else if (st.dis === 1) {
        if ((st.disT -= dt) <= 0) { st.dis = 2; st.disT = CFG1.dis; cracks.visible = true; toast('🧊 冰湖崩裂了！守住火堆！'); }
      } else if (st.dis === 2) {
        st.disT -= dt; shake = 0.12;
        const k = 1 - st.disT / CFG1.dis; cracks.children.forEach(c => { c.visible = k >= c.userData.k * 0.8; }); lake.material.color.setRGB(0.9 - k * 0.55, 0.96 - k * 0.4, 0.99 - k * 0.2);
        if (st.fuel <= 0) { st.dis = 0; st.retryT = CFG1.retry; cracks.visible = false; lake.material.color.setHex(0xe6f6fd); toast('🔥 火堆熄了…冰裂縫又合起來，晚點再來'); }
        else if (st.disT <= 0) { st.done = true; finish(); }
      }
    }
    // 鏡頭
    if (shake > 0) { shake = Math.max(0, shake - dt * 0.1); }
    camera.position.lerp(tmp.copy(player.position).add(camOffset), 1 - Math.exp(-dt * 6));
    if (shake > 0) { camera.position.x += (Math.random() - 0.5) * shake; camera.position.y += (Math.random() - 0.5) * shake * 0.6; }
    camera.lookAt(player.position.x, 0.8, player.position.z);
    sunC.copy(player.position).applyMatrix4(sunInv); sunC.x = Math.round(sunC.x / SUN_TEX) * SUN_TEX; sunC.y = Math.round(sunC.y / SUN_TEX) * SUN_TEX; sunC.applyMatrix4(sunRot);
    sun.target.position.copy(sunC); sun.position.set(sunC.x - 10, sunC.y + 20, sunC.z + 8);
    for (let i = 0; i < snowN; i++) {                                           // 下雪
      snowPos[i * 3 + 1] -= dt * 1.5;
      if (snowPos[i * 3 + 1] < 0) { snowPos[i * 3 + 1] = 18; snowPos[i * 3] = X + rand(-25, 25); snowPos[i * 3 + 2] = Z + rand(-25, 25); }
    }
    snowGeo.attributes.position.needsUpdate = true;
    for (let i = flies.length - 1; i >= 0; i--) {                              // 飄字、飛行動畫
      const f = flies[i]; f.t += dt; const k = Math.min(1, f.t / f.dur), to = f.toFn();
      f.mesh.position.lerpVectors(f.from, to, k); f.mesh.position.y += Math.sin(k * Math.PI) * f.arc; if (f.spin !== false) f.mesh.rotation.y += dt * 8;
      if (k >= 1) { flies.splice(i, 1); f.onDone && f.onDone(); }
    }
    if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').style.opacity = 0; }
    if ((hideT -= dt) <= 0) { hideT = 0.3; scene.children.forEach(o => { if (o !== root && o.visible && !(o.isLight || o === player || o.isPoints || o === sun.target)) o.visible = false; }); } // 第 2 關的東西之後才冒出來的（標籤等）也藏起來
    if ((inkT -= dt) <= 0) { inkT = 0.5; inkAll(scene); }
    if ((hudTxtT -= dt) <= 0) { hudTxtT = 0.25; hudText(); }
    if ((saveT += dt) > 2) { saveT = 0; writeSave(); }
    hudT = 0; declutter();   // 介面範圍每格重量一次（第 1 關的介面文字會變）
  }
  let fireT2 = 0, padT = 0;
  function finish() {                                                            // 撐過崩裂 → 遷徙劇情卡 → 第 2 關
    writeSave();
    story('🧊 冰湖崩裂了！', ['湖冰整片裂開，冰屋沉進了湖裡，魚群也游走了。', '長老捧起火種說：「南邊的森林有木頭，可以蓋木屋。」', '帶著火種和族人，往南遷徙吧！'], '出發！');
    $('lvOk').addEventListener('click', () => { save.stage = 2; save.cash = Math.max(save.cash, 40); writeSave(); resetting = true; try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} location.reload(); }, { once: true });
  }
  // 最小間距檢查（給 layout-check 用）：格子、雪堆、枯枝、冰洞、冰屋、火堆互相隔夠遠
  S.check = () => {
    const pts = [['火堆', FIRE[0], FIRE[1], 2.6], ['蓋冰屋格', PAD[0], PAD[1], 1.6], ...SLOTS.map((s, i) => ['冰屋' + i, s[0], s[1], 2.4]), ...PILES.map((s, i) => ['雪堆' + i, s[0], s[1], 1.2]), ...TWIGS.map((s, i) => ['枯枝' + i, s[0], s[1], 1.0]), ...HOLES.map((s, i) => ['冰洞' + i, s[0], s[1], 1.2])], out = [];
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) { const d = Math.hypot(pts[i][1] - pts[j][1], pts[i][2] - pts[j][2]), min = pts[i][3] + pts[j][3] + 0.4; if (d < min) out.push('第1關太近：' + pts[i][0] + ' 和 ' + pts[j][0] + '（' + d.toFixed(1) + '）'); }
    return out;
  };
  S.spots = [[0, 8], PAD, [0, 6], ...HOLES, ...PILES.slice(0, 3), ...TWIGS.slice(0, 2), SLOTS[0], SLOTS[3]];   // layout-check 讓主角走過去看的位置
  S.state = st; S.addFolk = addFolk; S.buildIgloo = buildIgloo; S.bag = bag; S.folks = folks; S.igloos = igloos;
  S.step = step;
  S.enter = () => {
    S.on = true;
    scene.children.slice().forEach(o => { if (!(o.isLight || o === player || o.isPoints || o === sun.target)) o.visible = false; });
    scene.add(root); root.visible = true;
    document.body.appendChild(hudEl); document.body.appendChild(goalEl);
    ['hud', 'bars', 'bl', 'topc', 'alert', 'camBtn', 'planBtn'].forEach(id => { const e = $(id); if (e) e.style.display = 'none'; });
    for (let i = 0; i < st.igloos; i++) buildIgloo(i, false);
    for (let i = 0; i < st.pop; i++) addFolk(i, true);
    player.position.set(0, 0, 8); player.rotation.y = Math.PI; camera.position.copy(player.position).add(camOffset);
    hintOn = false; $('hint').style.display = 'none';              // 操作提示改放在上方目標列，不另外蓋在畫面中間
    if (scene.fog) { scene.fog.near = 90; scene.fog.far = 240; }    // 第 1 關地圖小，不要讓霧把地面洗成一片白
    hudText();
  };
  return S;
})();
window.__game && (window.__game.stage1 = stage1);
if (save.stage === 1) stage1.enter();
