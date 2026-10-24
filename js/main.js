'use strict';
// ===== 主迴圈 =====
const tmp = new THREE.Vector3();
let chopTimer = 0, dropTimer = 0, fullWarn = 0, saveTimer = 0, walk = 0;
const clock = new THREE.Clock();

// 主角血量：被熊打會扣，在營地裡會慢慢回血；被打倒就掉一半背包、回營地
const hero = { hp: CFG.playerHp, hit: 0 };
let hurtCd = 0;
function huntable(b) {
  return !b.aggro && hurtCd <= 0 && fd(player.position.x, player.position.z) > FENCE_R + 0.3 &&
    Math.hypot(player.position.x - b.x, player.position.z - b.z) < (b.hunting ? CFG.bearChase + 2 : CFG.bearChase);
}
// 離暖氣圈邊緣多遠（≤0 表示在暖氣裡）：火爐的圈和暖氣塔的圈取最近的那個
function coldOver(x, z) {
  let over = Math.hypot(x - FX, z - FZ) - furnace.r;
  if (furnace.r >= FENCE_R) over = Math.min(over, fd(x, z) - FENCE_R); // 火夠旺：整個方形領地都溫暖
  const hr = furnace.fuel > 0 ? CFG.heaterR * (coldWave.on > 0 ? CFG.coldShrink : 1) : 0;
  for (const h of heaters) if (!h.bld.dead) over = Math.min(over, Math.hypot(x - h.x, z - h.z) - hr);
  return over;
}
function updateHero(dt) {
  hurtCd -= dt;
  hero.over = coldOver(player.position.x, player.position.z);
  if (hero.over <= 0) hero.hp = Math.min(CFG.playerHp, hero.hp + CFG.heal * dt);   // 在暖氣裡回血
  else {                                                                            // 野外會冷到掉血，離越遠掉越多
    const dps = Math.min(CFG.coldMax, CFG.coldBase + hero.over * CFG.coldPerUnit) * (coldWave.on > 0 ? 1.5 : 1);
    hero.hp -= dps * dt; if (hero.hp <= 0) hero.cause = 'cold';
  }
  if (hero.hit > 0) hero.hit -= dt;
  player.flash.forEach(mt => mt.emissive?.setHex(hero.hit > 0 ? 0x661111 : 0));
  if (hero.hp <= 0) {
    const lose = carried.splice(Math.ceil(carried.length / 2));  // 掉一半背包
    lose.forEach(m => stackRoot.remove(m)); restack();
    player.position.set(0, 0, 2); camera.position.copy(player.position).add(camOffset);
    hero.hp = CFG.playerHp; hurtCd = 3;                         // 回營地，3 秒內熊不會再追
    bears.forEach(b => b.hunting = false);
    const why = hero.cause === 'cold' ? '凍昏了！' : '被熊打倒了！'; hero.cause = null;
    toast(lose.length ? why + '掉了 ' + lose.length + ' 個東西' : why);
    beep(140, 0.5, 'sawtooth', 0.07, 0.5);
  }
  const v = Math.ceil(hero.hp); $('hp').textContent = v;
  $('hpBar').firstElementChild.style.width = v + '%'; $('hpBar').classList.toggle('danger', v < 35);
  updateAlert();
}

// 目標提示（作者 10/17 回饋第 2 項）：畫面上方告訴玩家下一步做什麼；完成一個給一點獎金
const GOALS = PRO ? [ // 正式關：建築要自己用規劃模式選位置，目標帶玩家認識三種分區
  { t: () => '升級任意 3 個項目（' + Math.min(save.buys, 3) + '/3）', done: () => save.buys >= 3 },
  { t: () => '升級營火，擴大領地', done: () => save.territory >= 1 },
  { t: () => '開拓東邊，打開新場地', done: () => !!save.east },
  { t: () => '用🏗️規劃在綠色民房區蓋民房，人口到 ' + LEVELS[1].need + '（' + population() + '/' + LEVELS[1].need + '）', done: () => save.level >= 1 },
  { t: () => '用🏗️規劃在橘色加工區蓋🪵鋸木機', done: () => planned('mill') },
  { t: () => '開採煤礦，煤很耐燒', done: () => !!save.mine },
  { t: () => '在紫色工業區蓋🔨鐵匠鋪，揹煤去賣', done: () => planned('smith') },
  { t: () => '在加工區蓋第二座🍖烤肉攤', done: () => planned('grill') },
  { t: () => '營火升級 Lv2，領地再擴大', done: () => save.territory >= 2 },
  { t: () => '蓋更多民房，人口到 ' + LEVELS[2].need + '（' + population() + '/' + LEVELS[2].need + '）', done: () => save.level >= 2 },
  { t: () => '把營火進化成石爐（營火 Lv4）', done: () => save.stove >= 1 },
  { t: () => '把🔨鐵匠鋪升級到 Lv2（要🪨石材，煤賣更貴、伐木工更快）', done: () => save.smithLv >= 1 || !mills.some(m => m.upU) },
  { t: () => '把📦倉庫升到 Lv3（每樣能存 450、多雇搬運工）', done: () => (save.whLv || 0) >= 2 },
  { t: () => '再蓋 🪨 石屋，居民到 ' + LEVELS[3].need + ' 升城市（' + population() + '/' + LEVELS[3].need + '）', done: () => save.level >= 3 },
  { t: () => '城市的新玩法（大暴雪、市集）製作中，繼續擴張吧！', done: () => false },
] : [
  { t: () => '升級任意 3 個項目（' + Math.min(save.buys, 3) + '/3）', done: () => save.buys >= 3 },
  { t: () => '揹 ' + CFG.whLogs + ' 根木頭蓋📦倉庫（建築要用倉庫的🪵木頭蓋）', done: () => !!save.wh },
  { t: () => '升級營火，擴大領地', done: () => save.territory >= 1 },
  { t: () => '開拓東邊，打開新場地', done: () => !!save.east },
  { t: () => '蓋民房、給流民烤肉留人，居民到 ' + LEVELS[1].need + '（' + population() + '/' + LEVELS[1].need + '）', done: () => save.level >= 1 },
  { t: () => '開採煤礦，煤很耐燒', done: () => !!save.mine },
  { t: () => '營火升級後，地上會出現 🔨 鐵匠鋪的格子，走過去用木頭蓋，揹煤去賣', done: () => planned('smith') },
  { t: () => '雇用⛏️煤礦工，煤自動送進倉庫', done: () => !!save.coalers },
  { t: () => '營火升級 Lv2，領地再擴大', done: () => save.territory >= 2 },
  { t: () => '蓋民房、留住流民，居民到 ' + LEVELS[2].need + '（' + population() + '/' + LEVELS[2].need + '）', done: () => save.level >= 2 },
  { t: () => '把營火進化成石爐（營火 Lv4）', done: () => save.stove >= 1 },
  { t: () => '開採石場，揹🪨石材回倉庫', done: () => !!save.quarry },
  { t: () => '把🔨鐵匠鋪升級到 Lv2（要🪨石材，煤賣更貴、伐木工更快）', done: () => save.smithLv >= 1 || !mills.some(m => m.upU) },
  { t: () => '把📦倉庫升到 Lv3（每樣能存 450、多雇搬運工）', done: () => (save.whLv || 0) >= 2 },
  { t: () => '再蓋 🪨 石屋，居民到 ' + LEVELS[3].need + ' 升城市（' + population() + '/' + LEVELS[3].need + '）', done: () => save.level >= 3 },
  { t: () => '城市的新玩法（大暴雪、市集）製作中，繼續擴張吧！', done: () => false },
];
save.goal = Math.min(save.goal || 0, GOALS.length - 1); // 匯入的存檔碼可能不對，不要超出範圍
let shownGoal = '', goalFlash = 0;
function updateGoal(dt) {
  while (save.goal < GOALS.length - 1 && GOALS[save.goal].done()) {
    const reward = 10 * (save.goal + 1); save.goal++; save.cash += reward; goalFlash = 1.5;
    toast('🎯 目標完成！獎金 +' + reward + ' 元'); sfx.coin();
  }
  goalFlash -= dt;
  const t = '🎯 ' + GOALS[save.goal].t();
  if (t !== shownGoal) { $('goal').innerHTML = (t); shownGoal = t; }
  $('goal').classList.toggle('done', goalFlash > 0);
}

// 畫面上方的事件提醒：熊群、寒潮快來（15 秒內）或正在發生時才出現，平常不讀秒
let shownAlert = '';
function updateAlert() {
  let t = '', cls = '';
  if (horde.wave > 0) { t = gate.raiding ? '🐾 獸潮第 ' + horde.wave + '/' + CFG.hordeWaves + ' 波，守住北門' : '🐾 下一波 ' + Math.ceil(horde.gap) + ' 秒後來，快修門'; cls = 'warn'; }
  else if (horde.warn > 0) { t = '🐾 獸潮 ' + Math.ceil(horde.warn) + ' 秒後來，先修門'; cls = 'warn'; }
  else if (hordeGate() && population() >= LEVELS[1].need) { t = '🐾 撐過獸潮才能升級村莊'; cls = 'warn'; }
  else if (gate.raiding) { t = '🐻 熊群來襲！守住北門'; }
  else if (blizzard.on > 0) { t = '🌨️ 大暴雪 ' + Math.ceil(blizzard.on) + ' 秒，鏟雪、顧好營火'; cls = 'cold'; }
  else if (save.level >= 1 && coldWave.on > 0) { t = '❄️ 寒潮中 ' + Math.ceil(coldWave.on) + ' 秒，顧好營火'; cls = 'cold'; }
  else if (hero.over > 0 && hero.hp < 60) { t = '🥶 好冷！回營火旁取暖'; cls = 'cold'; }
  else if (gate.raidT <= 15) { t = '🐻 ' + raidCount() + ' 隻熊' + (wolvesCome() ? '＋🐺 狼群' : '') + (kingNext() ? '＋👑 熊王' : '') + ' ' + Math.ceil(gate.raidT) + ' 秒後來襲'; cls = 'warn'; }
  else if (blizzard.warn > 0) { t = '🌨️ 大暴雪 ' + Math.ceil(blizzard.warn) + ' 秒後來，先加柴'; cls = 'cold'; }
  else if (blizGate() && population() >= LEVELS[save.level + 1].need) { t = '🌨️ 撐過大暴雪才能升級'; cls = 'cold'; }
  else if (save.level >= 1 && coldWave.t <= 15) { t = '❄️ 寒潮 ' + Math.ceil(coldWave.t) + ' 秒後來，先加柴'; cls = 'cold'; }
  const key = t + cls; if (key === shownAlert) return; shownAlert = key;
  $('alert').textContent = t; $('alert').className = cls; $('alert').style.display = t ? 'block' : 'none';
}

// 建築：被打會晃、血量存檔、揹木頭靠近就修、全部被拆光就失敗
let fixCd = 0, gameOver = false;
function updateBuildings(dt) {
  fixCd -= dt;
  for (const b of buildings) {
    b.hp = Math.max(0, b.hp);
    if (b.hit > 0) { b.hit -= dt; b.g.position.x = b.x + Math.sin(b.hit * 80) * 0.08; } else b.g.position.x = b.x;
    const k = carried.map(m => m.userData.type).lastIndexOf('log');
    if (b.hp + (b.pend || 0) * 10 < CFG.buildHp && k >= 0 && fixCd <= 0 && Math.hypot(player.position.x - b.x, player.position.z - b.z) < b.r + 1.1) {
      fixCd = 0.12; b.pend = (b.pend || 0) + 1; // 飛在半空中的木頭也算，修滿就不再拿
      const m = carried.splice(k, 1)[0]; const wp = m.getWorldPosition(new THREE.Vector3());
      stackRoot.remove(m); restack();
      fly(m, wp, () => new THREE.Vector3(b.x, 1.2, b.z), 0.3, () => { scene.remove(m); b.pend--; b.hp = Math.min(CFG.buildHp, b.hp + 10); if (b.hp >= CFG.buildHp) sfx.coin(); });
    }
    const wasDead = b.dead;
    setBuildingState(b);
    if (b.dead && !wasDead) { toast('🐻 熊把建築拆掉了！揹木頭去修！'); beep(160, 0.4, 'sawtooth', 0.06, 0.5); }
    save.bhp[b.key] = Math.round(b.hp * 10) / 10;
  }
  if (!gameOver && buildings.length && buildings.every(b => b.dead)) {
    gameOver = true; writeSave(); $('lose').style.display = 'flex';
  }
}

// v1.00 標籤自動避讓（作者 10/24：標示、文字遮擋不要一直重犯）：每一格把看得到的標籤投影到螢幕上，
// 離主角近的優先；被更近的標籤蓋到（超過 3%）的先藏起來。下一格開頭先放回來，讓遊戲邏輯照常決定要不要顯示
const dcHidden = [], dcV = new THREE.Vector3(), dcR = new THREE.Vector3(), dcU = new THREE.Vector3();
function undeclutter() { for (const l of dcHidden) l.visible = true; dcHidden.length = 0; }
let hudRs = [], hudT = 0;                                         // 介面（上方血條、目標、左下背包、右下按鈕）在螢幕上的範圍，每 0.5 秒量一次
function hudRects() {
  const W = innerWidth, H = innerHeight, out = [];
  for (const id of ['hud', 'bars', 'goal', 'bl', 'alert', 'camBtn', 'planBtn', 'reset']) {
    const e = $(id); if (!e || e.offsetParent === null && getComputedStyle(e).position !== 'fixed') continue;
    for (const c of e.children.length && id !== 'goal' && id !== 'alert' ? [...e.children, ...(id === 'bl' ? [...$('bag').children] : [])] : [e]) {
      const r = c.getBoundingClientRect(); if (r.width && r.height && getComputedStyle(c).display !== 'none') out.push([r.left / W * 2 - 1, 1 - r.bottom / H * 2, r.right / W * 2 - 1, 1 - r.top / H * 2]);
    }
  }
  return out;
}
function declutter() {
  if ((hudT -= 1) <= 0) { hudT = 30; hudRs = hudRects(); }
  camera.updateMatrixWorld(); dcR.setFromMatrixColumn(camera.matrixWorld, 0); dcU.setFromMatrixColumn(camera.matrixWorld, 1);
  const shown = o => { for (let i = 0; o && i < 30; o = o.parent, i++) { if (!o.visible) return false; if (o === scene) return true; } return false; }; // 拿掉的標籤不算
  const px = player.position.x, pz = player.position.z, kept = [];
  const list = allLabels.filter(l => l.inkW && shown(l)).map(l => { l.getWorldPosition(dcV); return [l, Math.hypot(dcV.x - px, dcV.z - pz), dcV.clone()]; }).sort((a, b) => a[1] - b[1]);
  for (const [l, , c] of list) {
    const hw = l.scale.x * labelK.x * l.inkW / 2, hh = l.scale.y * labelK.y * l.inkH / 2;
    const a = c.clone().addScaledVector(dcR, -hw).addScaledVector(dcU, hh).project(camera), b = c.addScaledVector(dcR, hw).addScaledVector(dcU, -hh).project(camera);
    const mx = 8 / innerWidth, my = 6 / innerHeight;                 // 字的四周多留一點空白，貼太近也算擠
    const r = [a.x - mx, b.y - my, b.x + mx, a.y + my], ar = (r[2] - r[0]) * (r[3] - r[1]);
    const cut = r[0] < -1 || r[2] > 1 || r[1] < -1 || r[3] > 1;     // v1.02（作者：煤礦的字沒完全顯示）：字有一部分跑出畫面、或被介面蓋住，就整個先藏起來，走近再出現
    if (cut || [...hudRs, ...kept].some(k => Math.max(0, Math.min(r[2], k[2]) - Math.max(r[0], k[0])) * Math.max(0, Math.min(r[3], k[3]) - Math.max(r[1], k[1])) > 0.03 * Math.min(ar, (k[2] - k[0]) * (k[3] - k[1])))) { l.visible = false; dcHidden.push(l); }
    else kept.push(r);
  }
}

// 標籤不打架（v0.59，作者第三次回饋第 3 點）：建築名稱、付款格價錢、修門、倉庫這些標籤，只顯示主角附近最近的 6 個；
// 血量、北門、營火這些警告不在這裡管，永遠會顯示；地上的付款格圖示一直都在
function quietLabels() {
  const px = player.position.x, pz = player.position.z;
  const list = [...mills.map(m => m.label), ...unlocks.filter(u => !u.done && !(u.cool > 0)).map(u => u.label), repairLabel, wh.label, mine.label, quarry.label].filter(Boolean);
  list.map(l => [l, Math.hypot(l.position.x - px, l.position.z - pz)]).sort((a, b) => a[1] - b[1])
    .forEach(([l, d], i) => l.visible = d < CFG.labelNear && i < CFG.labelMax);
}
// v1.24 第 1→2 關過場的後半段（作者 10/24）：遷徙到南邊森林後，先生起營火，再把帳篷、工坊一間間慢慢蓋起來（像戰略遊戲蓋房子），蓋好才開始玩
let intro = null;
function startIntro() {
  delete save.arrive; writeSave();
  const fp = new THREE.Vector3(FX, 0, FZ), seen = new Set(), list = [];
  [...tentGs, ...buildings.map(b => b.g), ...mills.map(b => b.g), ...houses.map(b => b.g), ...towers.map(b => b.g)].forEach(g => { if (g && !seen.has(g)) { seen.add(g); list.push(g); } });
  list.sort((a, b) => a.position.distanceTo(fp) - b.position.distanceTo(fp));
  const items = [fg, ...list].map((g, i) => ({ g, s: g.scale.x, at: 1.6 + i * 1.5, done: false }));
  items.forEach(o => { o.g.scale.setScalar(0.001); });
  const el = document.createElement('div'); el.style.cssText = 'position:fixed;inset:0;z-index:99;pointer-events:none';
  el.innerHTML = '<div style="position:absolute;left:0;right:0;top:0;height:14%;background:#000"></div><div style="position:absolute;left:0;right:0;bottom:0;height:14%;background:#000"></div><div style="position:absolute;left:0;right:0;bottom:4%;text-align:center;color:#fff;font:700 19px sans-serif;text-shadow:0 2px 6px #000;padding:0 16px"></div><div style="position:absolute;inset:0;background:#fff;opacity:1"></div>';
  document.body.appendChild(el);
  intro = { t: 0, items, el, txt: el.children[2], fade: el.children[3], end: 1.6 + items.length * 1.5 + 1.2, look: new THREE.Vector3(2, 0.8, 0), labels: [furnaceLabel, ...mills.map(b => b.label)].filter(Boolean) };
}
function introStep(dt) {
  const k = intro; k.t += dt; const t = k.t;
  k.fade.style.opacity = Math.max(0, 1 - t / 1.2);
  k.labels.forEach(l => { l.visible = false; });
  k.items.forEach((o, i) => {
    const q = (t - o.at) / 0.9; if (q <= 0) return;
    const e = Math.min(1, q), c1 = 1.70158, back = 1 + (c1 + 1) * Math.pow(e - 1, 3) + c1 * Math.pow(e - 1, 2);   // 彈出來再回穩
    o.g.scale.setScalar(Math.max(0.001, o.s * back));
    if (!o.done && e >= 1) { o.done = true; o.g.scale.setScalar(o.s); }
    if (!o.done && !o.hit) { o.hit = true; sfx && sfx.coin && sfx.coin(); }
  });
  const n = k.items.filter(o => t >= o.at).length;
  k.txt.textContent = t < 1.6 ? '南邊的森林，新的營地。' : n <= 1 ? '先生起營火……' : n < k.items.length ? '一間一間，把營地蓋起來……' : t < k.end - 0.3 ? '蓋好了！' : '';
  camera.position.lerp(tmp.copy(k.look).add(camOffset).multiplyScalar(1.15), 1 - Math.exp(-dt * 2)); camera.lookAt(k.look);
  if (t > k.end) { k.items.forEach(o => o.g.scale.setScalar(o.s)); k.el.remove(); intro = null; }
}
const HIDE_PLAN_BTN = true;
let inkT = 0;
function step(dt) {
  if (gameOver || paused) return;
  if (typeof stage1 !== 'undefined' && stage1.on) { stage1.step(dt); return; }   // v1.16 第 1 關冰湖營地
  if (save.arrive && !intro) startIntro();
  if (intro) { introStep(dt); return; }
  undeclutter();
  if ((spreadT -= dt) <= 0) { spreadT = 1; spreadPads(); lotUnlocks(); }                       // v1.14 格子保持間距
  if ((inkT -= dt) <= 0) { inkT = 0.5; inkAll(scene); }          // 新出現的建築、人物、模型補上描邊
  // 移動
  let ix = joy.x, iy = joy.y;
  if (keys.KeyA || keys.ArrowLeft) ix -= 1; if (keys.KeyD || keys.ArrowRight) ix += 1;
  if (keys.KeyW || keys.ArrowUp) iy -= 1; if (keys.KeyS || keys.ArrowDown) iy += 1;
  if (camMode.on) ix = iy = 0;                                  // 視角模式不能走
  const il = Math.hypot(ix, iy); if (il > 1) { ix /= il; iy /= il; }
  const mx = right.x * ix + fwd.x * -iy, mz = right.y * ix + fwd.y * -iy;
  const moving = Math.hypot(mx, mz) > 0.05;
  if (moving) {
    if (hintOn) { hintOn = false; $('hint').style.display = 'none'; }
    const sp = CFG.speed * slowAt(player.position.x, player.position.z) * (blizzard.on > 0 ? CFG.blizSlow : 1) * dt; // 踩到雪堆走很慢；大暴雪頂風也慢
    let nx = player.position.x + mx * sp, nz = player.position.z + mz * sp;
    if (!save.east && nx > 16 * TS - 0.8) nx = 16 * TS - 0.8;           // 冰牆擋住
    nx = Math.max(-40 * TS, Math.min(40 * TS, nx)); nz = Math.max(-40 * TS, Math.min(40 * TS, nz));
    for (const t of trees) {                          // 不要穿過樹幹
      if (!t.alive || (t.ore && t.locked)) continue;
      const dx = nx - t.x, dz = nz - t.z, d = Math.hypot(dx, dz);
      if (d < 0.7 && d > 0) { nx = t.x + dx / d * 0.7; nz = t.z + dz / d * 0.7; }
    }
    [nx, nz] = pushOut(nx, nz, 0.4);                  // 不要穿過建築
    [nx, nz] = pushMine(nx, nz, 0.4);                 // 不要走進礦坑的山
    const r1 = fd(nx, nz);                              // 圍欄擋住，只有門口過得去
    if (Math.abs(r1 - FENCE_R) < 0.4 && !inGate(nx, nz, 0.3, true)) { // 東門要開拓東邊才開，之前關著走不過去
      const k = (fd(player.position.x, player.position.z) < FENCE_R ? FENCE_R - 0.4 : FENCE_R + 0.4) / r1;
      nx *= k; nz *= k;
    }
    player.position.x = nx; player.position.z = nz;
    player.rotation.y = Math.atan2(mx, mz);
    walk += dt * 12;
  }
  player.tick(walk, moving);
  // 背上的木頭會跟著晃
  carried.forEach((m, i) => { m.position.x = Math.sin(walk * 0.5) * i * 0.012; });

  // 自動砍樹
  chopTimer -= dt;
  let target = null, best = CFG.chopRange;
  for (const t of trees) {
    if (!t.alive || t.locked) continue;
    const d = Math.hypot(t.x - player.position.x, t.z - player.position.z);
    if (d < best) { best = d; target = t; }
  }
  for (const b of bears) { // 熊優先：範圍內有熊就先打熊
    if (!b.alive) continue;
    if (Math.hypot(b.x - player.position.x, b.z - player.position.z) < CFG.chopRange + 0.4) { target = b; break; }
  }
  if (target) {
    const kind = target.isBear ? 'meat' : target.ore || 'log';
    if (countOf(kind) >= capacity() && !target.isBear) {         // v0.90（作者）：肉滿了還是能打熊（自保），揹不下的肉掉地上
      fullWarn -= dt; if (fullWarn <= 0) { toast(kind === 'meat' ? '肉滿了！拿去烤肉攤' : kind === 'coal' ? '煤滿了！拿去火爐' : kind === 'stone' ? '石材滿了！拿去📦倉庫' : '木頭滿了！拿去鋸木廠'); fullWarn = 3; }
    } else {
      axeShow = 0.3;
      if (chopTimer <= 0) {
        chopTimer = CFG.chopInterval[save.axe];
        target.hp--; target.shake = 0.25; target.pop = 0.15;
        burstChips(target.x, target.z, target.isBear); sfx.chop();
        if (target.hp <= 0) {
          target.alive = false;
          if (target.isBear) target.respawn = CFG.bearRespawn; else target.regrow = target.ore ? target.regrowT : CFG.treeRegrow;
          const n = target.isBear ? mobMeat(target) : target.ore ? target.per : WOODS[target.kind].logs;
          const room = Math.max(0, Math.min(n, capacity() - countOf(kind)));
          for (let i = 0; i < room; i++) toBack(kind, target.x, 1 + i * 0.3, target.z, i * 0.08);
          if (n > room && !target.ore) dropItems(kind, n - room, target.x, target.z); // v0.81：揹不下的掉在地上，之後再撿（獵人、伐木工也會來撿）
        }
      }
    }
  }
  // 斧頭旋轉特效
  axeShow -= dt;
  axe.visible = axeShow > 0;
  if (axe.visible) {
    axeSpin += dt * (12 + save.axe * 3);
    axe.position.set(player.position.x, 1.2, player.position.z);
    axeArms.forEach((a, i) => { a.visible = i <= save.axe; a.rotation.y = axeSpin + i * Math.PI * 2 / (save.axe + 1); });
    swooshG.rotation.y = axeSpin - Math.PI / 2 - 2.4; // 刀光拖在斧頭後面
    swooshMat.opacity = Math.min(0.55, axeShow * 3);
    axeHeadMat.color.setHex((axeKK ? AXE_TINT : AXE_COLORS)[save.axe]);
  }
  for (let i = chips.length - 1; i >= 0; i--) {
    const c = chips[i]; c.life -= dt; c.vy -= 18 * dt;
    c.m.position.x += c.vx * dt; c.m.position.y = Math.max(0.08, c.m.position.y + c.vy * dt); c.m.position.z += c.vz * dt;
    c.m.rotation.x += dt * 10; c.m.scale.setScalar(Math.max(0.01, c.life / 0.6));
    if (c.life <= 0) { scene.remove(c.m); chips.splice(i, 1); }
  }
  // 樹的搖晃與重生
  for (const t of trees) {
    if (t.shake > 0) { t.shake -= dt; t.g.rotation.z = Math.sin(t.shake * 60) * 0.15; } else t.g.rotation.z = 0;
    if (t.pop > 0) { t.pop -= dt; if (t.alive) t.g.scale.setScalar(t.sc * (1 + Math.max(0, t.pop))); }
    if (!t.alive) {
      t.g.scale.setScalar(Math.max(0.001, t.g.scale.x - dt * 4));
      t.regrow -= dt;
      if (t.regrow <= 0) { t.alive = true; t.hp = t.ore ? t.maxHp : WOODS[t.kind].hp; }
    } else if (t.g.scale.x < t.sc) t.g.scale.setScalar(Math.min(t.sc, t.g.scale.x + dt * 1.5));
  }

  // 鋸木廠：卸貨、加工、收錢
  dropTimer -= dt;
  for (const mill of mills) {
    const ip = mill.inPad.position, op = mill.outPad.position;
    if (mill.bld.dead) { mill.label.set([mill.name]); continue; }
    const k = carried.map(m => m.userData.type).lastIndexOf(mill.accept); // 只收這個站要的東西
    if (k >= 0 && dropTimer <= 0 && mill.inPad.visible && Math.hypot(player.position.x - ip.x, player.position.z - ip.z) < 1.3) { // 投放格收起來（有倉庫）就不收
      dropTimer = 0.07;
      const m = carried.splice(k, 1)[0]; const wp = m.getWorldPosition(new THREE.Vector3());
      stackRoot.remove(m); restack();
      fly(m, wp, () => mill.g.position.clone().add(tmp.set(0, 1.6, 0)), 0.3, () => { scene.remove(m); mill.queue++; });
    }
    const cold = mill.bld.cold; // 暖氣圈外：停工，但綠框裡的錢還是能收
    const st = save.store, foodLow = save.wh && st.food + save.pile.food < Math.max(6, mealSize() * CFG.meals);
    if (!cold) mill.saw.rotation.y += dt * (mill.queue ? 20 : 2);
    if (mill.saw2) mill.saw2.rotation.y = mill.saw.rotation.y;
    if (mill.queue > 0 && !cold) {
      mill.timer += dt;
      if (mill.timer >= mill.time) {
        mill.timer = 0; mill.queue--;
        // 有倉庫：木頭做成🪵木頭、烤肉先存給居民吃，存夠了才放櫃台；櫃台也擺滿就燻成🥓肉乾
        if (mill.customers) { if (foodLow) toStore('food', mill); else if (bbq.cookedMeshes.length < CFG.counterMax) addCooked(mill); else if (save.smoke && save.store.jerky < CFG.jerkyMax) toStore('jerky', mill); else { save.cash += CFG.meatSell; sfx.coin(); floatText('+' + CFG.meatSell + ' 💵 商隊', mill.g.position.x, mill.g.position.z); } } // v0.88（作者：肉越堆越高）：櫃台、燻肉架都滿了，多的肉賣給商隊
        else if (save.wh && mill.accept === 'log' && st.plank + save.pile.plank < plankNeed()) toStore('plank', mill); // v0.79：木頭留夠就好，多的換錢（不然有倉庫後錢沒來源）
        else if (!mill.outPad.visible) { save.cash += mill.value; sfx.coin(); } // v0.80：收錢格收起來了，錢直接入帳
        else spawnBill(mill, mill.g.position.clone().add(tmp.set(1.2, 1, 1)));
      }
    } else if (!cold) mill.timer = 0;
    mill.label.set(mill.queue ? [mill.name, (cold ? '凍住了 ' : '加工中 ') + mill.queue] : [mill.name]);
    if (mill.out.length && Math.hypot(player.position.x - op.x, player.position.z - op.z) < 1.4) {
      const bills = mill.out.splice(0);
      bills.forEach((b, i) => {
        const wp = b.position.clone();
        fly(b, wp, () => player.position.clone().add(tmp.set(0, 2.2, 0)), 0.25 + i * 0.02, () => {
          scene.remove(b); save.cash += mill.value; sfx.coin();
        }, 1);
      });
    }
  }

  quietLabels();
  // 付款格：只有最近的那一格顯示大標籤，並排的格子才不會互相蓋住
  let nearest = null, nd = 6;
  for (const u of unlocks) { const d = Math.hypot(player.position.x - u.x, player.position.z - u.z); if (!u.done && d < nd) { nd = d; nearest = u; } }
  if (nearest) for (const u of unlocks) if (u !== nearest && !u.done && Math.hypot(u.x - nearest.x, u.z - nearest.z) < 3.6) u.label.visible = false; // v1.00（畫面檢查抓到）：大標籤比格子寬，旁邊格子的小價錢先藏起來
  for (const u of unlocks) {
    if (u.done) continue;
    if (u.cool > 0) { u.cool -= dt; u.pad.visible = u.label.visible = u.cool <= 0; continue; } // 剛升級完：閃亮後要等一下才能再升級
    const p = u.price();
    const dist = Math.hypot(player.position.x - u.x, player.position.z - u.z), on = dist < 1.2;
    const near = u === nearest, blk = u.need ? u.need() : null;
    if (near !== u.near || blk !== u.blk) { u.near = near; u.blk = blk; u.refresh(); }
    if (blk) { u.payAcc = 0; continue; }
    u.stand = on ? (u.stand || 0) + dt : 0;                     // 站穩 0.6 秒才開始付錢，路過不會誤買
    // 付什麼：錢、倉庫的🪵木頭（mat: 'plank'）、背上的木頭（mat: 'log'）
    const have = u.mat === 'plank' || u.mat === 'stone' ? (save.wh ? save.store[u.mat] : 0) : u.mat === 'log' ? carried.filter(m => m.userData.type === 'log').length : save.cash;
    if (on && u.stand > CFG.padDelay && have > 0 && u.paid < p) {
      u.payAcc += dt * p / CFG.payRate;
      const pay = Math.min(Math.floor(u.payAcc), have, p - u.paid);
      if (pay > 0) {
        u.payAcc -= pay; u.paid += pay;
        if (u.mat === 'log') for (let i = 0; i < pay; i++) {
          const m = carried.splice(carried.map(m => m.userData.type).lastIndexOf('log'), 1)[0], wp = m.getWorldPosition(new THREE.Vector3());
          stackRoot.remove(m); restack(); fly(m, wp, () => new THREE.Vector3(u.x, 0.1, u.z), 0.25, () => scene.remove(m), 1);
        } else {
          if (u.mat) save.store[u.mat] -= pay; else save.cash -= pay;    // 倉庫的🪵木頭、🪨石材
          const b = box(0.5, 0.1, 0.3, u.mat === 'stone' ? mats.stone : u.mat ? mats.wood : mats.cash);
          fly(b, player.position.clone().add(tmp.set(0, 2, 0)), () => new THREE.Vector3(u.x, 0.1, u.z), 0.25, () => scene.remove(b), 1);
        }
      }
      if (u.paid >= p) { u.paid = 0; u.payAcc = 0; sparkle(u.x, u.z); u.buy(); save.buys++; sfx.unlock(); u.cool = CFG.buildCool; levelUnlocks(); writeSave(); }
      u.refresh();
    } else u.payAcc = 0;
  }

  coinCd -= dt;
  updateGuide(dt);
  updateBears(dt);
  updateVillagers(dt);
  updateTower(dt); updateMine(dt); updateStore(dt); updatePorters(dt); updateThieves(dt);
  updateWorkers(dt); updateHunters(dt); updateCoalers(dt); updateMixers(dt);
  updateGate(dt);
  updateColdWave(dt);
  updateBlizzard(dt);
  updateHorde(dt);
  updateFog(dt);
  updateSnow(dt);
  if (roadsDirty) rebuildRoads();
  updateFurnace(dt);
  updateBuildings(dt);
  checkLevel();
  updateHero(dt);
  updateGoal(dt);
  updateDoors(dt);
  // 飛行動畫
  for (let i = flies.length - 1; i >= 0; i--) {
    const f = flies[i]; f.t += dt;
    const k = Math.min(1, f.t / f.dur), to = f.toFn();
    f.mesh.position.lerpVectors(f.from, to, k);
    f.mesh.position.y += Math.sin(k * Math.PI) * f.arc;
    if (f.spin !== false) f.mesh.rotation.y += dt * 8;
    if (k >= 1) { flies.splice(i, 1); f.onDone && f.onDone(); }
  }

  // 下雪
  for (let i = 0; i < snowN; i++) {
    snowPos[i * 3 + 1] -= dt * (blizzard.on > 0 ? 8 : coldWave.on > 0 ? 5 : 1.5); // 寒潮時雪下得又快又急，大暴雪更急
    if (snowPos[i * 3 + 1] < 0) {
      snowPos[i * 3 + 1] = 18;
      snowPos[i * 3] = player.position.x + rand(-25, 25); snowPos[i * 3 + 2] = player.position.z + rand(-25, 25);
    }
  }
  snowGeo.attributes.position.needsUpdate = true;

  // 鏡頭跟隨
  camera.position.lerp(tmp.copy(player.position).add(camOffset), 1 - Math.exp(-dt * 6));
  camera.lookAt(player.position.x, 0.8, player.position.z);
  // 陰影跟著主角，但對齊陰影貼圖的格子，走路時影子邊緣才不會一閃一閃
  sunC.copy(player.position).applyMatrix4(sunInv); sunC.x = Math.round(sunC.x / SUN_TEX) * SUN_TEX; sunC.y = Math.round(sunC.y / SUN_TEX) * SUN_TEX; sunC.applyMatrix4(sunRot);
  sun.target.position.copy(sunC); sun.position.set(sunC.x - 10, sunC.y + 20, sunC.z + 8);

  if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').style.opacity = 0; }
  saveTimer += dt; if (saveTimer > 2) { saveTimer = 0; writeSave(); }
  declutter();
  hud();
}

camera.position.copy(player.position).add(camOffset);
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (plan.on) planCamera(dt); else step(dt);
  const s1 = typeof stage1 !== 'undefined' && stage1.on;
  document.getElementById('planBtn').style.display = HIDE_PLAN_BTN && !plan.on ? 'none' : (save.level >= 1 || PRO) && !plan.on && !camMode.on && !gameOver && !s1 ? 'block' : 'none';   // v1.33（作者：規劃先隱藏）
  document.getElementById('camBtn').style.display = !plan.on && !gameOver && !(s1 && stage1.state.dis === 3) ? 'block' : 'none';
  renderer.render(scene, camera);
}
loop();
addEventListener('visibilitychange', () => { if (document.hidden) writeSave(); });
// 選單：換關卡會先存好目前這一關，再切到另一關的存檔
function showMenu(on) {
  $('menu').style.display = on ? 'flex' : 'none'; paused = on;
  $('menuClose').style.display = $('menuReset').style.display = firstRun && !menuSeen ? 'none' : ''; // 第一次玩只能選關卡
  document.querySelectorAll('#menu [data-mode]').forEach(b => b.classList.toggle('cur', b.dataset.mode === MODE));
}
let menuSeen = false;
document.getElementById('reset').onclick = () => { menuSeen = true; showMenu(true); };
document.getElementById('menuClose').onclick = () => showMenu(false);
const RES_FIRST = [['🎒 揹包（左下的小圓框）', '你身上帶著的東西，每種最多帶一定數量（上面的 /數字）。沒帶的不顯示，什麼都沒帶會寫「空手」。丟進營火、放進倉庫、站到格子上才會用掉。'], ['📦 倉庫（最上面那條）', '存起來的木頭、肉、煤、石材。伐木工、搬運工會送進來；蓋東西、修門會自動從這裡拿。🪵 後面的 /數字＝下一棟建築大約要用多少木頭。'], ['🪵 木頭', '砍樹得到。蓋建築、修北門、升級都要。'], ['🍖 烤肉', '獵人打熊、烤肉攤烤出來。流民吃了才肯留下，工人也要吃。'], ['🥓 肉乾', '燻肉架做的，路過的流民會買。'], ['⚫ 煤', '比木頭耐燒 4 倍，補營火，也能賣給鐵匠鋪。'], ['🪨 石材', '採石場挖的，升級鐵匠鋪、蓋石屋用。'], ['💵 錢', '賣肉、賣煤、流民付費得到；雇人、買商隊、升級要用。'], ['👥 居民', '/後面的數字＝下次升級城市要的居民；🛏️＝還剩幾張空床，沒床流民留不住。'], ['🔥 營火', '燒完整個營地就停擺（建築凍住），丟木頭或煤補。']];
const RES_S1 = [['🎒 揹包（左下的小圓框）', '你身上帶的東西，每種最多 4 個。沒帶的不顯示，什麼都沒帶寫「空手」。滿了就去冰窖門口，會自動存進去。'], ['📦 冰窖（蓋好才有）', '冰屋、冰磚、木頭、魚的倉庫：🧊 冰磚、🪵 木頭、🐟 魚各有上限（/數字，升級會變多）。蓋東西自動從這裡拿，火堆低於 60% 自動拿木頭補。'], ['🧊 冰磚', '站在大雪堆旁用手挖。蓋冰屋、烤魚攤、冰窖、升級都要。'], ['🪵 木頭／枯枝', '枯枝撿森林邊的，耐燒度差；木頭要先做斧頭再砍樹，耐燒、暴風雪一定要用。冰窖只存木頭，枯枝直接丟火堆。'], ['🐟 魚', '站在北邊冰洞旁自動釣；揹到藍色送魚格烤熟，流民吃了才肯留下。'], ['💵 錢', '沒床的流民吃完付的錢，完成目標的獎金。帶進第 2 關。'], ['👥 居民', '/後面是床數（每間冰屋 2 張）；🛏️＝剩幾張空床。'], ['🔥 火堆', '燒完營地會冷，丟枯枝、木頭補。暴風雪時燒得特別快。']];
document.getElementById('menuRes').onclick = () => { $('resBody').innerHTML = (typeof stage1 !== 'undefined' && stage1.on ? RES_S1 : RES_FIRST).map(([t, d]) => '<p style="margin:6px 0"><b>' + t + '</b><br>' + d + '</p>').join(''); $('resInfo').style.display = 'flex'; };
document.getElementById('resClose').onclick = () => { $('resInfo').style.display = 'none'; };
document.getElementById('menuCredits').onclick = () => { $('credVer').textContent = 'v' + VERSION; $('credits').style.display = 'flex'; };
document.getElementById('credClose').onclick = () => { $('credits').style.display = 'none'; };
document.querySelectorAll('#menu [data-mode]').forEach(b => b.onclick = () => {
  try { localStorage.setItem(MODE_KEY, b.dataset.mode); } catch (e) {}
  if (b.dataset.mode === MODE && !resetting) { showMenu(false); return; }
  if (b.dataset.mode === MODE) { resetting = false; menuSeen = true; showMenu(false); writeSave(); return; }
  writeSave(); resetting = true; location.reload();
});
// 第一次玩：先選關卡，選好之前不存檔；之前玩過（有教學關存檔）的人直接記成教學關
if (firstRun) {
  let old = null; try { old = localStorage.getItem('frost-town-save-v1'); } catch (e) {}
  if (old) { try { localStorage.setItem(MODE_KEY, 'tutorial'); } catch (e) {} }
  else { resetting = true; showMenu(true); }
}
window.__game = { horde, blizzard, hunters, tentGs, camera, coldOver, fireStage: () => fireStage, raidCount, plan, setPlan, planPointer, canBuild, heaters, piles, shovelers, spawnPile, seam, mine, coldWave, hero, save, furnace, houses, player, carried, mills, unlocks, trees, bears, gate, buildings, towers, step, render: () => renderer.render(scene, camera) }; // 測試用
if (/check/.test(location.search)) document.body.appendChild(Object.assign(document.createElement('script'), { src: 'tools/layout-check.js' })); // 本機畫面自動檢查（tools/layout-check.js）
