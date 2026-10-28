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
  // 1. 親手採集
  buy('quarry', '開場可蓋'); P.position.set(-12, 0, 1.6); tick(12); ok(S.bag.filter(b => b.type === 'stone').length >= 1, '站在岩壁前敲石頭，揹包有石材');
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
  P.position.set(0, 0, 12); S.spawnWave(4, false); tick(50); ok(S.wolves.length === 0, '4 隻狼 50 秒內被打倒（剩 ' + S.wolves.length + '）');
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
