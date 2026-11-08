// 第 3 關程式模擬通關測試：在瀏覽器 console 貼上 `await stage3Test()`（先 layoutCheck.preset(7) 載入第 3 關開場）。
// 用程式「站到格子上付款→蓋→雇→升級→採集→打狼→囤貨→雪崩→被埋→挖開」完整跑一遍，確認每個目標都能達成、不卡關、沒有壞掉的數字。
window.stage3Test = async function () {
  const S = __game.stage3, st = S.state, log = [], bad = [], P = __game.player;
  const ok = (c, m) => { (c ? log : bad).push((c ? '✔ ' : '✘ ') + m); };
  const tick = (sec, dt = 0.1) => { for (let t = 0; t < sec; t += dt) S.step(dt); };
  const pad = id => S.pads.find(p => p.id === id);
  const feed = c => { for (const k in c) { if (k === 'cash') __game.save.cash += c[k]; else S.store[k] += c[k]; } };
  const buy = (id, why) => {
    const p = pad(id); if (!p) return ok(false, id + ' 找不到格子');
    S.hudText(); if (!p.vis) { tick(0.3); }
    if (!p.vis) return ok(false, id + ' 格子沒出現（' + why + '）');
    const c = p.cost(); feed(c); const snap = () => JSON.stringify([st.b, st.up, st.hire, st.tw, st.buried_quarry, st.buried_mine]), before = snap();
    P.position.set(p.x, 0, p.z); tick(Object.values(c).reduce((a, b) => a + b, 0) * 0.2 + 3);
    ok(snap() !== before, id + ' 付款後有變化');
  };
  S.hudText(); tick(2);
  ok(S.on && st.goal === 0, '第 3 關開場、目標第 1 步');
  // 0. 作者 10/29 三點：錢可以補材料蓋建築、生肉有地方放
  S.store.plank = 0; __game.save.cash = 100; const qp = pad('quarry'); P.position.set(qp.x, 0, qp.z); tick(14);
  ok(st.b.quarry === 1 && __game.save.cash < 100, '沒木板、只有錢也能蓋採石場（剩 ' + __game.save.cash + ' 元）');
  S.store.plank = 24; for (let i = 0; i < 3; i++) S.addBag('meat'); const raw0 = st.raw; P.position.set(3.9, 0, 12.2); tick(3); ok(st.raw >= raw0 + 3 && S.bag.filter(b => b.type === 'meat').length === 0, '生肉揹到帳篷旁自動存進營地庫存（' + raw0 + '→' + st.raw + '）');
  // 1. 親手採集
  P.position.set(-13, 0, -9.9); tick(12); ok(S.bag.filter(b => b.type === 'stone').length >= 1, '站在岩壁前敲石頭，揹包有石材');
  S.bag.splice(0).forEach(b => b.m.parent && b.m.parent.remove(b.m));
  P.position.set(8, 0, 31); tick(10); ok(S.bag.filter(b => b.type === 'plank').length >= 1 || S.bag.length >= 1, '山腳砍樹得木板');
  S.bag.splice(0).forEach(b => b.m.parent && b.m.parent.remove(b.m));
  // 2. 蓋建築、雇人、升級（順序照目標列）
  buy('house0', '蓋採石場後'); buy('grill', '有石屋後'); buy('mine', '蓋採石場後'); buy('wh', '有石屋後'); buy('sled', '倉庫後'); buy('hire_sled', '雪橇站後'); buy('hire_hunter', '烤肉攤後'); buy('hire_quarry', '採石場後'); buy('hire_mine', '煤礦後'); buy('smoke', '烤肉攤後');
  for (let n = 1; n < 7; n++) buy('house' + n, '前一間蓋好後');
  buy('tower2', '倉庫後'); buy('tower3', '第 3 座後');
  ok(S.workers.length === 4, '工人 4 人都出現（' + S.workers.length + '）');
  for (const k of ['stove', 'quarry', 'mine', 'wh', 'grill', 'smoke', 'sled', 't0', 't1', 't2', 't3']) { buy('up_' + k, '蓋好後'); if (pad('up_' + k).show()) buy('up_' + k, '第二次'); }
  ok(S.upN() >= 8, '升級 ≥8 次（' + S.upN() + '）');
  // 3. 工人產出、流民、肉
  const s0 = S.store.stone, c0 = S.store.coal, w0 = S.store.plank; tick(40);
  ok(S.store.stone > s0, '採石工讓倉庫石材增加（' + s0 + '→' + S.store.stone + '）'); ok(S.store.coal > c0, '礦工讓倉庫煤增加（' + c0 + '→' + S.store.coal + '）'); ok(S.store.plank > w0, '雪橇夫運木板進倉庫（' + w0 + '→' + S.store.plank + '）');
  st.raw = 6; const pop0 = st.pop; S.addCustomer(); S.addCustomer(); S.addCustomer(); tick(40); ok(st.pop > pop0 || __game.save.cash > 0, '流民吃烤肉後留下或付錢（居民 ' + pop0 + '→' + st.pop + '）'); ok(st.cooked > 0 || S.store.smoked > 0, '烤肉攤烤出肉、燻肉坊出肉乾');
  // 4. 狼群：塔和主角能打倒
  st.waveT = 9999; let g0 = 0; P.position.set(0, 0, 12); while (S.wolves.length && g0++ < 160) tick(0.5);   // 先等自然來的狼打完，再專門測 4 隻
  S.spawnWave(4, false); tick(50); ok(S.wolves.length === 0, '4 隻狼 50 秒內被打倒（剩 ' + S.wolves.length + '）');
  ok(S.ents.every(e => isFinite(e.hp)) && isFinite(st.fuel) && isFinite(__game.player.position.x), '數值沒有 NaN');
  // 5. 囤貨、居民湊滿 → 雪崩 → 被埋 → 挖開
  S.store.stone = 90; S.store.coal = 60; S.store.smoked = 30; S.store.plank = 200; st.pop = 30; st.fuel = 90; st.retryT = 0; st.waveT = 9999; tick(1);
  S.hudText(); tick(1); S.hudText();
  ok(st.goal >= S.GOALS.length - 1, '目標列走到最後一步（第 ' + (st.goal + 1) + '/' + S.GOALS.length + ' 步）');
  ok(S.selfSufficient(), '自給自足條件達成（還缺：' + S.lacks().join('、') + '）');
  P.position.set(0, 0, 20); let guard = 0; while (st.dis !== 2 && guard++ < 400) { st.fuel = 90; tick(0.5); } ok(st.dis === 2 || st.dis === 3 || st.done, '雪崩預告後開始（dis=' + st.dis + '）');
  guard = 0; while (!st.done && guard++ < 1200) { st.fuel = 90; tick(0.5); P.position.set(0, 0, 22); __game.hero.hp = 100; }
  ok(st.done && st.buried_quarry && st.buried_mine, '三波雪崩後採石場和煤礦被埋、關卡完成（done=' + st.done + '）'); ok(document.getElementById('lvup').style.display === 'flex', '劇情卡跳出來');
  document.getElementById('lvOk').click(); tick(1); S.hudText();
  buy('dig_quarry', '被埋後'); buy('dig_mine', '被埋後'); ok(!st.buried_quarry && !st.buried_mine, '礦坑、採石場挖得開');
  // 6. 介面文字沒壞
  const txt = ['cash', 'pop', 'capP', 'beds', 'fuel', 'hp', 'goal', 'alert'].map(id => document.getElementById(id).textContent).join('|'); ok(!/NaN|undefined|null/.test(txt), '介面文字沒有 NaN／undefined：' + txt.slice(0, 80));
  console.log(log.concat(bad).join('\n')); return { pass: log.length, fail: bad.length, bad, log };
};

// 真實走路測試（v1.45）：不傳送，用搖桿一樣的方式一步步走，確認每個格子、岩壁、坑口主角都「走得到」，站上去採集真的會動。
// 用法：await stage3Walk()（先 layoutCheck.preset(7) 載入第 3 關）
window.stage3Walk = async function () {
  const S = __game.stage3, st = S.state, P = __game.player, log = [], bad = [], ok = (c, m) => (c ? log : bad).push((c ? '✔ ' : '✘ ') + m);
  const steer = (tx, tz) => {
    const dx = tx - P.position.x, dz = tz - P.position.z, d = Math.hypot(dx, dz); if (d < 0.7) { joy.x = joy.y = 0; return true; }   // 一步約 0.5～0.6，容許 0.7 才不會來回晃
    const ux = dx / d, uz = dz / d, det = -right.x * fwd.y + fwd.x * right.y;
    joy.x = (-ux * fwd.y + fwd.x * uz) / det; joy.y = (right.x * uz - right.y * ux) / det; const l = Math.hypot(joy.x, joy.y); if (l > 1) { joy.x /= l; joy.y /= l; } return false;
  };
  const walk = (x, z, max = 900) => {                       // 北邊（牆外）、南邊（牆外）要先走門
    const via = []; const inFence = p => p.z > -6 && p.z < 26; if (inFence(P.position) && z <= -6) via.push([0, -3], [0, -8]); else if (inFence(P.position) && z >= 26) via.push([0, 23], [0, 28]); else if (!inFence(P.position) && inFence({ z })) via.push(P.position.z < -6 ? [0, -8] : [0, 28], P.position.z < -6 ? [0, -3] : [0, 23]);
    if (Math.abs(P.position.x) < 2.6 && P.position.z > 10 && z < 10) via.unshift([3.6, 12], [3.6, 8]);   // 石爐擋在正中間，繞過去
    const pts = [...via, [x, z]];
    for (const [px, pz] of pts) { let n = 0; while (!steer(px, pz) && n++ < max) S.step(0.1); if (n >= max) { joy.x = joy.y = 0; return false; } }
    joy.x = joy.y = 0; return true;
  };
  P.position.set(0, 0, 14); S.step(0.1);
  // 走到每一個格子
  for (const p of S.pads) { P.position.set(0, 0, 14); const r = walk(p.x, p.z); ok(r && Math.hypot(P.position.x - p.x, P.position.z - p.z) < 1.0, '走得到格子 ' + p.id + '（' + p.x.toFixed(1) + ',' + p.z.toFixed(1) + '）' + (r ? '' : ' 卡在 ' + P.position.x.toFixed(1) + ',' + P.position.z.toFixed(1))); }
  // 蓋好採石場、煤礦後，用走的走到坑口前，站著會不會自己敲、挖
  st.b.quarry = 1; st.b.mine = 1; S.applyLooks();
  for (const [k, type] of [['quarry', 'stone'], ['mine', 'coal']]) {
    S.bag.splice(0).forEach(b => b.m.parent && b.m.parent.remove(b.m)); P.position.set(0, 0, 14);
    const st0 = S.STAND[k]; const r = walk(st0[0], st0[1]); S.step(0.1); for (let i = 0; i < 160; i++) S.step(0.1);
    ok(r && S.bag.filter(b => b.type === type).length >= 1, '用走的走到' + (k === 'quarry' ? '岩壁' : '坑口') + '前，站著自己採到 ' + type + '（' + S.bag.length + ' 個）');
  }
  console.log(log.concat(bad).join('\n')); return { pass: log.length, fail: bad.length, bad };
};
