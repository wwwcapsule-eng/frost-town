'use strict';
// ===== 鋸木廠 =====
function makeMill(x, z, opt = {}) {
  const o = Object.assign({ name: '鋸木廠', accept: 'log', value: CFG.logValue, time: CFG.millTime, roof: mats.roof }, opt);
  const g = new THREE.Group();
  const base = box(3, 1.6, 2.4, mats.wood); base.position.y = 0.8; g.add(base);
  const roof = box(3.4, 0.3, 2.8, o.roof); roof.position.y = 1.75; g.add(roof);
  const saw = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.08, 16), mats.axe);
  saw.rotation.x = Math.PI / 2; saw.position.set(0, 1.0, 1.25); g.add(saw);
  g.position.set(x, 0, z); scene.add(g);
  const inPad = makePad(o.inX ?? x - 2.6, o.inZ ?? z + 2.2, 1.8, 0xffffff, { meat: '🍖', coal: '⚫' }[o.accept] || '🪵');
  const outPad = makePad(o.outX ?? x + 2.6, o.outZ ?? z + 2.2, 1.8, 0x3fbf5a, '💵');
  const label = makeLabel(); label.scale.set(3, 1.5, 1); label.position.set(x, 3, z); label.set([o.name]); scene.add(label);
  Object.assign(o, { g, saw, inPad, outPad, queue: 0, timer: 0, out: [], label });
  o.bld = addBuilding(o.key || o.name, g, 1.8);
  return o;
}
const mills = [makeMill(LOT.mill[0], LOT.mill[1], { inX: LOT.mill[0] - 1.3, inZ: LOT.mill[1] + 2.7, outX: LOT.mill[0] + 1.3, outZ: LOT.mill[1] + 2.7 })];
function addMill2() { const [x, z] = LOT.mill2; mills.push(makeMill(x, z, { key: '第二台鋸木機', inX: x - 1.3, inZ: z + 2.7, outX: x + 1.3, outZ: z + 2.7 })); }
const GRILL = { name: '烤肉攤', accept: 'meat', value: CFG.meatValue, time: 0.8, roof: M(0xe07b22), customers: true };
// v0.68（作者 10/18）：烤肉攤貼著南邊主路，櫃台在攤子左邊（路那側）、揹肉格和收錢格在攤子右邊，整組擠在一起
mills.push(makeMill(LOT.bbq[0], LOT.bbq[1], Object.assign({ inX: LOT.bbq[0] + 2.4, inZ: LOT.bbq[1] - 1, outX: LOT.bbq[0] + 2.4, outZ: LOT.bbq[1] + 1 }, GRILL)));
// 正式關：規劃模式蓋的加工建築，付款格在門口前；第二座烤肉攤烤好的肉一樣送到村民排隊的櫃台
const SMITH = { name: '鐵匠鋪', accept: 'coal', value: CFG.coalValue, time: 1.5, roof: M(0x4a4f5a) }; // 工業區：煤打成工具賣錢
function addProc(k, x, z) {
  const m = makeMill(x, z, Object.assign({ key: { mill: '第二台鋸木機', grill: '第二座烤肉攤', smith: '鐵匠鋪' }[k], inX: x - 1.3, inZ: z + 2.7, outX: x + 1.3, outZ: z + 2.7 }, k === 'grill' ? GRILL : k === 'smith' ? SMITH : {}));
  if (k === 'grill') m.outPad.visible = false; // 錢在櫃台收，這台不用綠框
  mills.push(m);
}

// 鈔票落到站的綠色框
function spawnBill(mill, from) {
  const op = mill.outPad.position, n = mill.out.length;
  const bill = box(0.7, 0.14, 0.45, mats.cash);
  const to = new THREE.Vector3(op.x + ((n % 4) % 2 - 0.5) * 0.75, 0.1 + Math.floor(n / 4) * 0.15, op.z + (Math.floor((n % 4) / 2) - 0.5) * 0.5);
  mill.out.push(bill);
  fly(bill, from, () => to, 0.3, null, 1);
}

// ===== 村民排隊買烤肉：烤好的肉放櫃台，排第一個的村民拿走並付錢 =====
const bbq = mills[1];
// 櫃台貼在烤肉攤左邊、靠主路；村民在主路上（QX）往南門排隊，遠離北邊森林的熊
const CX = LOT.bbq[0] - 2.3, CZ = LOT.bbq[1], QX = CX - 1.1;
const counter = box(1, 0.8, 1.4, mats.wood); counter.position.set(CX, 0.4, CZ); scene.add(counter);
bbq.cookedMeshes = [];
function addCooked(mill) {
  const m = new THREE.Mesh(logGeo, mats.meat); m.castShadow = true;
  const i = bbq.cookedMeshes.length; bbq.cookedMeshes.push(m);
  fly(m, mill.g.position.clone().add(tmp.set(0, 1.5, 0)), () => new THREE.Vector3(CX, 0.92 + i * 0.24, CZ), 0.6, null, 1);
}
const QUEUE = i => new THREE.Vector3(QX, 0, CZ + i * 1.0); // 從櫃台前沿主路往南門排
const SHIRTS = [0x2f8fd8, 0x3fa66b, 0xd9a03f, 0x9b5fd0, 0xe06a6a];
const villagers = [], leaving = [];
function makeVillager(i) {
  const g = new THREE.Group();
  const b = box(0.55, 0.7, 0.4, M(SHIRTS[(Math.random() * SHIRTS.length) | 0])); b.position.y = 0.55; g.add(b);
  const h = box(0.42, 0.4, 0.4, mats.skin); h.position.y = 1.1; g.add(h);
  const c = box(0.48, 0.16, 0.45, M(0x24486b)); c.position.y = 1.36; g.add(c);
  const p = QUEUE(i + 4); g.position.set(p.x + rand(-0.3, 0.3), 0, p.z); g.rotation.y = Math.PI;
  scene.add(g);
  return { g, wait: 0 };
}
function updateVillagers(dt) {
  // 排隊的村民跟著人口變多（最多 16 個，手機效能）
  while (villagers.length < Math.min(16, 4 + Math.floor(population() / 3))) villagers.push(makeVillager(villagers.length));
  villagers.forEach((v, i) => {
    const p = QUEUE(i), d = p.sub(v.g.position); d.y = 0;
    const len = d.length();
    if (len > 0.05) { v.g.position.addScaledVector(d, Math.min(1, 3 * slowAt(v.g.position.x, v.g.position.z) * dt / len)); v.g.position.y = Math.abs(Math.sin(guideT * 10 + i)) * 0.08; }
    else v.g.position.y = 0;
  });
  const front = villagers[0];
  const scared = bears.some(b => b.alive && b.aggro && fd(b.x, b.z) < FENCE_R + 0.3); // 熊進營地，村民不敢買
  const blocked = piles.some(p => Math.hypot(p.x - QX, p.z - CZ) < 1.6); // 雪堆擋在櫃台前，村民不買
  blockWarn -= dt; if (blocked && bbq.cookedMeshes.length && blockWarn <= 0) { toast('❄️ 雪堆擋住櫃台了！快去鏟'); blockWarn = 8; }
  if (front && !scared && !blocked && bbq.cookedMeshes.length && front.g.position.distanceTo(QUEUE(0)) < 0.3) {
    front.wait += dt;
    if (front.wait > 0.35) {
      const m = bbq.cookedMeshes.pop();
      const wp = m.position.clone();
      fly(m, wp, () => front.g.position.clone().add(tmp.set(0, 1.4, 0)), 0.25, () => { front.g.add(m); m.position.set(0, 0.9, 0.35); }, 0.6);
      spawnBill(bbq, front.g.position.clone().add(tmp.set(0, 1.4, 0)));
      villagers.shift(); leaving.push({ g: front.g, t: 3.5, dir: rand(-0.12, 0.12) });
    }
  }
  for (let i = leaving.length - 1; i >= 0; i--) {
    const l = leaving[i]; l.t -= dt;
    l.g.position.x += Math.sin(l.dir) * 2.5 * dt; l.g.position.z += Math.cos(l.dir) * 2.5 * dt;
    l.g.rotation.y = l.dir; l.g.position.y = Math.abs(Math.sin(l.t * 10)) * 0.1;
    if (l.t <= 0) { scene.remove(l.g); leaving.splice(i, 1); }
  }
}

// ===== 付款格（解鎖） =====
const unlocks = [];
function makeUnlock(def) {
  const pad = makePad(def.x, def.z, 2, 0xffd34d, def.icon);
  const label = makeLabel(320, 180); label.scale.set(3.2, 1.8, 1); label.position.set(def.x, 1.9, def.z); scene.add(label);
  const u = Object.assign({ pad, label, paid: 0, payAcc: 0 }, def);
  u.refresh = () => {
    const p = u.price();
    if (p == null) { scene.remove(pad); scene.remove(label); u.done = true; return; }
    const cost = u.mat === 'plank' && !save.wh ? '先蓋📦倉庫' : ({ plank: '🧱 ', log: '🪵 ' }[u.mat] || '💵 ') + (p - u.paid); // mat：用倉庫的木材或背上的木頭付，不是錢
    if (u.near) { label.set([u.name(), cost], '#ffe066', [36, 68]); label.scale.set(3.2, 1.8, 1); label.position.y = 1.9; } // 錢放大，像參考影片
    else { label.set([cost], '#ffe066', [60]); label.scale.set(1.9, 1.05, 1); label.position.y = 0.9; } // 遠的只顯示小價錢，不會互相蓋住
    pad.fill.scale.y = Math.max(0.0001, u.paid / p);
  };
  u.refresh(); unlocks.push(u);
  return u;
}
makeUnlock({ x: LOT.bag[0], z: LOT.bag[1], icon: '🎒', name: () => '背包擴充',
  price: () => [12, 35, 90][save.bag], buy: () => { save.bag++; toast('背包容量 ' + CFG.capacity[save.bag] + '！'); } });
makeUnlock({ x: LOT.axe[0], z: LOT.axe[1], icon: '🪓', name: () => '斧頭升級',
  price: () => [20, 60, 140][save.axe], buy: () => { save.axe++; toast('砍得更快了！'); } });
function openEast() { roadsDirty = true; scene.remove(iceWall); trees.forEach(t => { if (!t.coal) t.locked = false; }); }
if (save.east) openEast();
if (save.mill2 && !PRO) addMill2(); // 正式關的第二台鋸木機在 save.plan 裡

// ===== 弩砲塔：自動射北邊的熊，熊倒下的肉掉在地上，走過去撿 =====
if (!PRO) makeUnlock({ x: LOT.tower1[0], z: LOT.tower1[1], icon: '🏹', name: () => '弩砲塔', mat: 'plank',
  price: () => save.tower ? null : P(40), buy: () => { save.tower = true; buildTower(); addTower2Unlock(); toast('弩砲塔會自動射熊！'); } });
const towers = [];
const towerZ = x => -FENCE_R - 1.8; // 弩砲塔站在圍欄外 1.8、北門門板旁邊，不跟圍欄或門板穿模
const nearTower = (x, z) => towers.some(tw => Math.hypot(x - tw.g.position.x, z - tw.g.position.z) < 2.4);
function buildTower(x = 6.4, z = towerZ(x), fixed = false) {
  const g = new THREE.Group();
  const base = box(1.6, 2.2, 1.6, mats.wood); base.position.y = 1.1; g.add(base);
  const deck = box(2, 0.25, 2, mats.trunk); deck.position.y = 2.3; g.add(deck);
  const bow = new THREE.Group(); bow.position.y = 2.8; g.add(bow);
  const stock = box(0.25, 0.25, 1.4, M(0x5a3a22)); bow.add(stock);
  const arms = box(1.6, 0.14, 0.18, M(0x3c4a5a)); arms.position.z = 0.5; bow.add(arms);
  g.position.set(x, 0, z); scene.add(g);
  towers.push({ g, bow, cd: 0, fixed, bld: addBuilding('弩砲塔' + towers.length, g, 1.0) });
  trees.forEach(t => { if (!t.gone && !t.coal && nearTower(t.x, t.z)) { t.gone = true; t.alive = false; t.regrow = Infinity; scene.remove(t.g); } }); // 塔旁邊的樹移走，不穿模
}
if (save.tower) buildTower();
// 第二座弩砲塔：要先有第一座才會出現
function addTower2Unlock() {
  makeUnlock({ x: LOT.tower2[0], z: LOT.tower2[1], icon: '🏹', name: () => '第二座弩砲塔', mat: 'plank',
  price: () => save.tower2 ? null : P(90), buy: () => { save.tower2 = true; buildTower(-6.4); toast('北門兩側都有弩砲塔了！'); } });
}
if (save.tower && !save.tower2) addTower2Unlock();
if (save.tower2) buildTower(-6.4);

// ===== 北門防守：熊群定時來撞北門，用木頭修門 =====
const gate = { hp: save.gateHp ?? CFG.gateHp, hit: 0, raidT: save.raidT ?? CFG.raidFirst, posts: new THREE.Group(), broken: false };
gate.posts = makeDoors(GATES[0], true).group; // 北門也是雙開門，被撞破時整個消失
const gateLabel = makeLabel(); gateLabel.scale.set(3, 1.5, 1); gateLabel.position.set(0, 2.9, -8.9); scene.add(gateLabel);
const repairPad = makePad(0, -6.6, 1.8, 0xb06a35, '🔨');
const repairLabel = makeLabel(); repairLabel.scale.set(2.4, 1.2, 1); repairLabel.position.set(0, 1.2, -6.6); repairLabel.set(['修門', '🪵 1 根 +10']); scene.add(repairLabel);
let repairCd = 0;
function updateGate(dt) {
  // 熊群來襲
  gate.raidT -= dt;
  if (gate.raidT <= 0) {
    gate.raidT = CFG.raidEvery;
    const n = raidCount(), wild = () => bears.filter(b => !b.wolf && b.alive && !b.aggro);
    while (wild().length < n && bears.filter(b => !b.wolf).length < CFG.bearMax) makeMob(false); // 熊不夠就從森林深處多來幾隻
    const pool = wild().sort((a, b) => b.z - a.z).slice(0, n);
    if (wolvesCome()) for (let i = 4 + Math.floor(rand(0, 3)); i > 0; i--) {   // 冰狼 4～6 隻，重用打倒的狼
      const w = bears.find(b => b.wolf && !b.alive && !pool.includes(b)) || makeMob(true);
      [w.x, w.z] = bearSpot(); w.alive = true; w.g.scale.setScalar(1); pool.push(w);
    }
    pool.forEach(b => { b.aggro = true; b.hp = Math.max(b.hp, mobHp(b)); });
    if (pool.length) { toast(wolvesCome() ? '🐺 冰狼群跟熊一起來了！守住北門！' : '🐻 熊群來襲！守住北門！'); beep(220, 0.4, 'sawtooth', 0.06, 0.6); }
  }
  // 北門狀態
  gate.hp = Math.max(0, gate.hp);
  save.gateHp = gate.hp; save.raidT = gate.raidT; // 存檔：關掉再開，北門血量和倒數會接著算
  if (gate.hp <= 0 && !gate.broken) { gate.broken = true; gate.posts.visible = false; toast('北門被撞破了！快用木頭修！'); }
  if (gate.hp > 0 && gate.broken) { gate.broken = false; gate.posts.visible = true; }
  if (gate.hit > 0) { gate.hit -= dt; gate.posts.position.x = Math.sin(gate.hit * 80) * 0.06; } else gate.posts.position.x = 0;
  const pct = Math.round(gate.hp / CFG.gateHp * 100);
  gateLabel.set(['北門 ' + pct + '%'], pct > 60 ? '#9fe870' : pct > 25 ? '#ffd34d' : '#ff6a5a');
  const raiding = bears.some(b => b.alive && b.aggro);
  gate.raiding = raiding;
  $("vignette").style.opacity = raiding ? 1 : 0;
  // 站在修門格上，背上的木頭一根根拿去修
  repairCd -= dt;
  const k = carried.map(m => m.userData.type).lastIndexOf('log');
  if (gate.hp < CFG.gateHp && k >= 0 && repairCd <= 0 && Math.hypot(player.position.x - repairPad.position.x, player.position.z - repairPad.position.z) < 1.3) {
    repairCd = 0.12;
    const m = carried.splice(k, 1)[0]; const wp = m.getWorldPosition(new THREE.Vector3());
    stackRoot.remove(m); restack();
    fly(m, wp, () => new THREE.Vector3(rand(-3, 3), 1, -FENCE_R - 0.2), 0.35, () => { scene.remove(m); gate.hp = Math.min(CFG.gateHp, gate.hp + 10); });
  }
  repairPad.fill.scale.y = Math.max(0.0001, gate.hp / CFG.gateHp);
}

// ===== 伐木工：自己找樹砍、揹滿就送鋸木廠，一直循環 =====
makeUnlock({ x: LOT.worker[0], z: LOT.worker[1], icon: '👷', name: () => '雇用伐木工',
  price: () => [60, 120, 200][save.workers], buy: () => { save.workers++; addWorker(); toast('伐木工上工了！'); } });
const workers = [];
function addWorker() {
  const g = new THREE.Group();
  const b = box(0.6, 0.75, 0.45, M(0xf08a24)); b.position.y = 0.6; g.add(b);
  const h = box(0.45, 0.42, 0.42, mats.skin); h.position.y = 1.2; g.add(h);
  const c = box(0.5, 0.18, 0.48, M(0xc0392b)); c.position.y = 1.48; g.add(c);
  const back = new THREE.Group(); back.position.set(0, 1.0, -0.4); g.add(back);
  g.position.set(3.5, 0, 3); scene.add(g);
  workers.push({ g, back, load: 0, tree: null, cd: 0, walk: 0 });
}
for (let i = 0; i < save.workers; i++) addWorker();

// ===== 倉庫（企劃 11.3～11.5，第 2 時代第一棟）：揹 10 根木頭來蓋；工人採的木頭送進來，
// 倉庫自動補營火、用木材修門和建築、多的木頭送去鋸木廠做成🧱木材；烤肉先存進來給工人吃，多的才賣村民 =====
save.store = Object.assign({ log: 0, coal: 0, plank: 0, food: CFG.whFood }, save.store);
if (save.truck === 'store') save.wh = true;                       // 舊存檔：買過「自動運輸：進倉庫」的直接有倉庫
const wh = { bld: null, pad: null, label: null, t: 0, eatT: 0, hungry: false };
function buildWarehouse() {
  const [x, z] = LOT.store, g = new THREE.Group();
  const base = box(2.6, 1.6, 2.2, mats.wood); base.position.y = 0.8; g.add(base);
  const roof = box(3, 0.3, 2.6, M(0x4f6f8f)); roof.position.y = 1.75; g.add(roof);
  const door = box(1.2, 1.1, 0.06, mats.trunk); door.position.set(0, 0.55, 1.12); g.add(door);
  g.position.set(x, 0, z); scene.add(g);
  wh.pad = makePad(x, z + 2.7, 1.8, 0xffffff, '📦');
  wh.label = makeLabel(); wh.label.scale.set(3, 1.5, 1); wh.label.position.set(x, 3, z); scene.add(wh.label);
  wh.bld = addBuilding('倉庫', g, 1.6);
  document.getElementById('pStore').style.display = '';
}
if (save.wh) buildWarehouse();
else makeUnlock({ x: LOT.store[0], z: LOT.store[1] + 2.7, icon: '📦', mat: 'log', name: () => '蓋倉庫',
  price: () => save.wh ? null : CFG.whLogs, buy: () => {
    save.wh = true; buildWarehouse(); unlocks.forEach(u => !u.done && u.refresh()); // 用木材付的付款格改顯示價錢
    toast('📦 倉庫蓋好了！工人的木頭送來這裡，自動補營火、修門；鋸木廠做的🧱木材拿來蓋建築');
  } });

// ===== 民房：在南門外一間間往外蓋，每間 +5 人口；付款格蓋好後會移到下一塊空地 =====
const houses = [], FX0 = 0, FZ0 = -3; // 營火位置（跟下面的 FX, FZ 一樣）
function houseSpot(i) { const l = HOUSE_LOTS[Math.min(i, HOUSE_LOTS.length - 1)]; return [l.x, l.z]; }
function houseLotOpen() { const l = HOUSE_LOTS[save.houses]; return !!l && l.ring <= save.territory; } // 下一塊民房地塊在領地裡了嗎
function buildHouse(i) { const [x, z] = houseSpot(i); buildHouseAt(x, z, '民房' + i); }
function buildHouseAt(x, z, key) {
  const g = new THREE.Group();
  const wall = box(2.2, 1.4, 2, M(0xd8c3a0)); wall.position.y = 0.7; g.add(wall);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.75, 1.1, 4), mats.roof); roof.position.y = 1.95; roof.rotation.y = Math.PI / 4; roof.castShadow = true; g.add(roof);
  const door = box(0.5, 0.8, 0.06, mats.trunk); door.position.set(0, 0.4, -1.02); g.add(door); // 門朝營地
  const win = box(0.45, 0.4, 0.06, M(0xffd36b)); win.position.set(0.65, 0.85, -1.02); g.add(win);
  const chimney = box(0.3, 0.7, 0.3, M(0x777777)); chimney.position.set(0.5, 2.2, 0.3); g.add(chimney);
  g.position.set(x, 0, z); g.rotation.y = Math.atan2(x - FX0, z - FZ0); scene.add(g); // 門朝營火
  houses.push(addBuilding(key, g, 1.3));
}
for (let i = 0; i < save.houses; i++) buildHouse(i);
function housePrice() { return CFG.housePrice[0] + houses.length * CFG.housePrice[1]; } // 南門外的和規劃模式蓋的一起算
function addHouseUnlock() {
  const [x, z] = houseSpot(save.houses);
  const u = makeUnlock({ x, z, icon: '🏠', name: () => '蓋民房', mat: 'plank',
    price: () => houses.length < LEVELS[save.level].houses && houseLotOpen() ? P(housePrice()) : null,
    buy: () => {
      buildHouse(save.houses++); toast('蓋好民房，人口 +' + CFG.housePop + '！');
      [u.x, u.z] = houseSpot(save.houses); u.pad.position.set(u.x, 0.03, u.z); u.label.position.set(u.x, 1.9, u.z);
    } });
  return u;
}
let houseUnlock = save.east && !PRO ? addHouseUnlock() : { done: true }; // 民房要先開拓東邊（作者 10/17 回饋第 2 項）

// ===== 中央火爐＋暖氣圈：圈內的建築才會運作；柴剩不到一半圈子開始縮小，燒光就全部凍住 =====
const FX = 0, FZ = -3 * TS;
const furnace = { fuel: save.fuel ?? CFG.fuelMax, pend: 0, r: 0, out: false };
const fg = new THREE.Group();
const stone = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 0.7, 8), M(0x8a8f99)); stone.position.y = 0.35; stone.castShadow = stone.receiveShadow = true; fg.add(stone);
const flame = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.2, 6), new THREE.MeshBasicMaterial({ color: 0xff8a1f })); flame.position.y = 1.2; fg.add(flame);
// 石爐（營火 Lv4～6）：石砌方爐＋煙囪，換掉原本的石圈
const stoveG = new THREE.Group(); fg.add(stoveG);
const sBase = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1, 2.2), M(0x6f747d)); sBase.position.y = 0.5; sBase.castShadow = sBase.receiveShadow = true; stoveG.add(sBase);
const sChim = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.6, 0.5), M(0x5a5f68)); sChim.position.set(0.65, 1.6, -0.65); sChim.castShadow = true; stoveG.add(sChim);
fg.position.set(FX, 0, FZ); scene.add(fg);
loadModel('campfire', 'assets/models/survival/campfire-pit.glb', 0.7, () => { const m = MODELS.campfire.clone(); m.position.y = -0.35; stone.material = new THREE.MeshBasicMaterial({ visible: false }); stone.add(m); }); // 石圈隱形、模型掛在它底下，石爐時一起藏起來
const fireLv = () => 1 + save.territory + save.stove;              // 營火等級：Lv1～3 營火（＝領地）、Lv4～6 石爐（企劃 9.3）
const fireName = () => save.stove ? '石爐' : '營火';
function updateStoveLook() { stoveG.visible = save.stove > 0; stone.visible = !save.stove; flame.position.y = save.stove ? 1.4 + 0.15 * save.stove : 1.2; }
updateStoveLook();
const heatRing = new THREE.Mesh(new THREE.RingGeometry(0.985, 1, 96), new THREE.MeshBasicMaterial({ color: 0xff9a3c, transparent: true, opacity: 0.8, depthWrite: false }));
const heatFill = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshBasicMaterial({ color: 0xffb060, transparent: true, opacity: 0.1, depthWrite: false }));
[heatRing, heatFill].forEach(m => { m.rotation.x = -Math.PI / 2; m.position.set(FX, 0.025, FZ); scene.add(m); });
const furnaceLabel = makeLabel(); furnaceLabel.scale.set(2.6, 1.3, 1); furnaceLabel.position.set(FX + 1.2, 2.4, FZ + 1.2); scene.add(furnaceLabel); // 放在火爐靠鏡頭那側，不蓋住後面背包付款格的標籤
// 營火分段（作者 10/17 回饋第 5 項）：不同 % 有不同畫面；火越小，熊群來得越多
const FIRE_STAGES = [ // min：營火 % 以上就是這一段；light：整體亮度；frost：畫面四周結霜；glow：火光；bears：熊群多來幾隻
  { min: 70, name: '旺', light: 1, frost: 0, glow: 1.6, sky: 0xcfe3f2, bears: 0 },
  { min: 40, name: '普通', light: 0.88, frost: 0.15, glow: 1.1, sky: 0xc4d9ea, bears: 0 },
  { min: 20, name: '變弱', light: 0.72, frost: 0.45, glow: 0.7, sky: 0xaec6dc, bears: 1, msg: '🔥 營火變弱了，天氣變冷，熊會多來一隻' },
  { min: 1, name: '快熄', light: 0.58, frost: 0.75, glow: 0.35, sky: 0x93aac2, bears: 2, msg: '🥶 營火快熄了！快加柴，熊群會更多' },
  { min: -1, name: '熄滅', light: 0.48, frost: 1, glow: 0, sky: 0x7f93a8, bears: 2 },
];
const fireLight = new THREE.PointLight(0xff9a3c, 1.2, 14, 1.5); fireLight.position.set(FX, 2.5, FZ); scene.add(fireLight);
const skyCol = new THREE.Color(0xcfe3f2), tmpCol = new THREE.Color();
let fireStage = 0;
function fireStageOf(pct) { return FIRE_STAGES.findIndex(st => pct >= st.min); }
function raidCount() { return CFG.raidBears + Math.floor(mobLv() / 2) + FIRE_STAGES[fireStage].bears; } // 營火每升 2 級多來一隻熊
const wolvesCome = () => fireLv() >= CFG.wolfLv;
function updateFireLook(dt, pct) {
  const i = fireStageOf(pct), st = FIRE_STAGES[i];
  if (i > fireStage && st.msg) { toast(st.msg); beep(260, 0.3, 'triangle', 0.05, 0.6); }
  fireStage = i;
  const k = 1 - Math.exp(-dt * 2);                                // 慢慢轉過去，不會一下跳
  hemi.intensity += (0.75 * st.light - hemi.intensity) * k;
  sun.intensity += (0.75 * st.light - sun.intensity) * k;
  fireLight.intensity += (st.glow - fireLight.intensity) * k;
  skyCol.lerp(tmpCol.setHex(st.sky), k); scene.background.copy(skyCol); scene.fog.color.copy(skyCol);
  $('frost').style.opacity = Math.max(st.frost, save.level >= 1 && coldWave.on > 0 ? 1 : 0);
}

let feedCd = 0;
function updateFurnace(dt) {
  const f = furnace;
  f.fuel = Math.max(0, f.fuel - CFG.fuelBurn * CFG.stoveBurn ** save.stove * (coldWave.on > 0 ? CFG.coldBurn : 1) * dt); save.fuel = Math.round(f.fuel * 10) / 10;
  // 揹木頭站到火爐旁，一根根丟進去
  feedCd -= dt;
  const types = carried.map(m => m.userData.type), kc = types.lastIndexOf('coal'), k = kc >= 0 ? kc : types.lastIndexOf('log'); // 有煤先丟煤
  const per = kc >= 0 ? CFG.fuelPerCoal : CFG.fuelPerLog;
  if (k >= 0 && feedCd <= 0 && f.fuel + f.pend < CFG.fuelMax && Math.hypot(player.position.x - FX, player.position.z - FZ) < 1.5) {
    feedCd = 0.12; f.pend += per; // pend：還在半空中、等一下會加進去的柴量
    const m = carried.splice(k, 1)[0]; const wp = m.getWorldPosition(new THREE.Vector3());
    stackRoot.remove(m); restack();
    fly(m, wp, () => new THREE.Vector3(FX, 1.2, FZ), 0.3, () => { scene.remove(m); f.pend -= per; f.fuel = Math.min(CFG.fuelMax, f.fuel + per); });
  }
  const pct = Math.round(f.fuel / CFG.fuelMax * 100);
  const rMax = CFG.heat[1] + TERR[save.territory].heat + CFG.stoveHeat * save.stove;
  f.r = f.fuel > 0 ? CFG.heat[0] + (rMax - CFG.heat[0]) * Math.min(1, pct / 50) : 0;
  if (coldWave.on > 0) f.r *= CFG.coldShrink; // 寒潮：暖氣圈縮小
  heatRing.scale.setScalar(Math.max(0.001, f.r)); heatFill.scale.setScalar(Math.max(0.001, f.r));
  heatRing.visible = heatFill.visible = f.r < FENCE_R;       // 作者 10/18：暖氣蓋得住整個領地就不畫，免得跟領地邊界看起來像兩個範圍；火變小縮進領地才出現

  flame.visible = f.fuel > 0; flame.scale.setScalar(0.4 + 0.6 * pct / 100); flame.scale.y *= 1 + Math.sin(guideT * 20) * 0.12;
  const hr = f.fuel > 0 ? CFG.heaterR * (coldWave.on > 0 ? CFG.coldShrink : 1) : 0; // 暖氣塔靠火爐供熱，火熄了也沒用
  for (const h of heaters) { const v = h.bld.dead ? 0.001 : Math.max(0.001, hr); h.ring.scale.setScalar(v); h.fill.scale.setScalar(v); }
  const warmCamp = f.r >= FENCE_R;                                     // 火夠旺：整個方形領地都算溫暖（跟地面看到的範圍一致）
  for (const b of buildings) b.cold = !(warmCamp && fd(b.x, b.z) < FENCE_R) && Math.hypot(b.x - FX, b.z - FZ) > f.r && !heaters.some(h => !h.bld.dead && Math.hypot(b.x - h.x, b.z - h.z) <= hr);
  if (f.fuel <= 0 && !f.out) { toast('🔥 火爐熄了！建築都凍住了，快加柴！'); beep(180, 0.4, 'sawtooth', 0.06, 0.6); }
  f.out = f.fuel <= 0;
  furnaceLabel.visible = pct < 50 || Math.hypot(player.position.x - FX, player.position.z - FZ) < 5;
  furnaceLabel.set([fireName() + ' Lv' + fireLv() + ' ' + pct + '%', pct < 50 ? (save.mine ? '🪵⚫ 揹木頭或煤來加' : '🪵 揹木頭來加柴') : '🔥 暖氣範圍'], pct > 50 ? '#ffd34d' : pct > 20 ? '#ffa040' : '#ff6a5a');
  updateFireLook(dt, pct);
  $('fuel').textContent = pct; $('fireName').textContent = fireName(); $('fuelBar').firstElementChild.style.width = pct + '%'; $('fuelBar').classList.toggle('danger', pct < 20);
}

// ===== 煤礦：營地西南邊的黑色礦石，買下後主角敲得到；煤丟進火爐很耐燒（伐木工不挖煤） =====
const rocks = [];
function addRock(x, z) {
  const g = new THREE.Group();
  const base = box(1.3, 0.8, 1.1, mats.rock); base.position.y = 0.4; base.rotation.y = rand(0, 3); g.add(base);
  for (let i = 0; i < 3; i++) { const c = box(rand(0.35, 0.55), rand(0.3, 0.5), rand(0.35, 0.55), mats.coal); c.position.set(rand(-0.4, 0.4), 0.8 + rand(0, 0.15), rand(-0.3, 0.3)); c.rotation.set(rand(0, 1), rand(0, 3), 0); g.add(c); }
  g.position.set(x, 0, z); g.visible = !!save.mine; scene.add(g);
  const t = { g, x, z, hp: CFG.coalHp, alive: true, regrow: 0, sc: 1, shake: 0, locked: !save.mine, coal: true };
  trees.push(t); rocks.push(t);
}
ROCK_LOTS.forEach(([x, z]) => addRock(x, z));
let mineUnlock = null;
function openMine() { rocks.forEach(t => { t.locked = false; t.g.visible = true; }); document.getElementById('pCoal').style.display = ''; }
if (save.mine) openMine();

// ===== 雪堆：村莊開始，路上會積雪；踩到走很慢，堆在櫃台前村民就不買；主角站旁邊自動鏟，也能雇鏟雪工 =====
const piles = [], pileMat = new THREE.MeshLambertMaterial({ color: 0xcfe3f7, flatShading: true });
let snowT = 3, blockWarn = 0;
function spawnPile() {
  let x, z;
  for (let tries = 0; tries < 20; tries++) {
    if (Math.random() < 0.5) { x = QX + rand(-0.5, 0.5); z = rand(CZ + 0.5, CZ + 11 * TS); } // 村民排隊的路上
    else { const a = rand(0, 6.28), r = rand(2, FENCE_R - 1.1); x = Math.cos(a) * r; z = Math.sin(a) * r; } // 營地裡
    if (Math.hypot(x - FX, z - FZ) > 1.8 && piles.every(p => Math.hypot(p.x - x, p.z - z) > 1.6)) break;
  }
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 6), pileMat); // 淡藍白色，雪地上也看得出來
  m.scale.set(1, 0.001, 1); m.position.set(x, 0, z); m.castShadow = m.receiveShadow = true; scene.add(m);
  piles.push({ m, x, z, hp: CFG.snowHp, grow: 0, shake: 0 });
}
function slowAt(x, z) { return piles.some(p => Math.hypot(p.x - x, p.z - z) < 0.95) ? CFG.snowSlow : 1; }
function hitPile(p) {
  p.hp--; p.shake = 0.2; burstChips(p.x, p.z, false);
  if (p.hp <= 0) { scene.remove(p.m); piles.splice(piles.indexOf(p), 1); }
}
let shovelCd = 0;
function updateSnow(dt) {
  if (save.level < 1) return;
  snowT -= dt * (coldWave.on > 0 ? 3 : 1);                      // 寒潮時積雪快 3 倍
  if (snowT <= 0) { snowT = CFG.snowEvery; if (piles.length < CFG.snowMax) spawnPile(); }
  shovelCd -= dt;
  for (const p of piles) {
    p.grow = Math.min(1, p.grow + dt * 1.5);
    const k = p.hp / CFG.snowHp; p.m.scale.set(0.5 + 0.5 * k, (0.35 + 0.25 * k) * p.grow, 0.5 + 0.5 * k);
    if (p.shake > 0) { p.shake -= dt; p.m.position.x = p.x + Math.sin(p.shake * 70) * 0.06; } else p.m.position.x = p.x;
  }
  const near = piles.find(p => Math.hypot(p.x - player.position.x, p.z - player.position.z) < 1.7);
  if (near && shovelCd <= 0) { shovelCd = 0.3; hitPile(near); sfx.chop(); }
  if (!wh.hungry) for (const s of shovelers) {                   // 鏟雪工：找最近的雪堆去鏟（沒食物會罷工）
    let t = null, best = 1e9;
    for (const p of piles) { const d = Math.hypot(p.x - s.g.position.x, p.z - s.g.position.z); if (d < best) { best = d; t = p; } }
    s.cd -= dt;
    if (!t) { routeTo(s, LOT.shovel[0] - 1.4, LOT.shovel[1] - 1.2, dt); continue; }
    if (best > 1.2) routeTo(s, t.x, t.z, dt); else if (s.cd <= 0) { s.cd = 0.5; hitPile(t); s.g.rotation.y += 0.6; }
  }
}
const shovelers = [];
function addShoveler() {
  const g = new THREE.Group();
  const b = box(0.6, 0.75, 0.45, M(0x4fb3e8)); b.position.y = 0.6; g.add(b);
  const h = box(0.45, 0.42, 0.42, mats.skin); h.position.y = 1.2; g.add(h);
  const hat = box(0.5, 0.18, 0.5, M(0xffffff)); hat.position.y = 1.5; g.add(hat);
  const sh = box(0.12, 0.12, 0.9, mats.axe); sh.position.set(0.35, 0.6, 0.35); g.add(sh);   // 鏟子
  g.position.set(LOT.shovel[0] - 1.4, 0, LOT.shovel[1] - 1.2); scene.add(g);
  shovelers.push({ g, cd: 0, walk: 0 });
}
let shovelUnlock = null;

// ===== 寒潮：村莊開始，每隔一段時間氣溫驟降 30 秒，火爐燒得快、暖氣圈縮小；撐過去（火沒熄）有獎金 =====
const coldWave = { t: save.coldT ?? CFG.coldFirst, on: 0, failed: false };
function updateColdWave(dt) {
  const active = save.level >= 1;
  if (!active) return;
  const c = coldWave;
  if (c.on > 0) {
    c.on -= dt; if (furnace.out) c.failed = true;
    if (c.on <= 0) {
      c.t = CFG.coldEvery;
      if (!c.failed) { save.cash += CFG.coldReward; sfx.unlock(); toast('撐過寒潮了！獎金 +' + CFG.coldReward + ' 元'); }
      else toast('寒潮過去了…下次記得先把火爐加滿柴');
    }
  } else {
    c.t -= dt;
    if (c.t <= 0) { c.on = CFG.coldLen; c.failed = false; toast('❄️ 寒潮來了！火爐燒得更快，撐住 ' + CFG.coldLen + ' 秒！'); beep(300, 0.6, 'triangle', 0.06, 0.4); }
    else if (Math.ceil(c.t) === 15 && Math.ceil(c.t + dt) > 15) toast('❄️ 15 秒後寒潮來襲，先把火爐加滿柴！');
  }
  save.coldT = Math.max(0, Math.round(c.t));
}

// ===== 暖氣塔：把火爐的熱送到遠一點的地方（規劃模式蓋） =====
const heaters = [];
function buildHeater(x, z, i) {
  const g = new THREE.Group();
  const p = box(0.9, 2.2, 0.9, M(0x8a8f99)); p.position.y = 1.1; g.add(p);
  const top = box(1.2, 0.3, 1.2, mats.trunk); top.position.y = 2.3; g.add(top);
  const fl = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.8, 6), new THREE.MeshBasicMaterial({ color: 0xff8a1f })); fl.position.y = 2.85; g.add(fl);
  g.position.set(x, 0, z); scene.add(g);
  const ring = new THREE.Mesh(heatRing.geometry, heatRing.material), fill = new THREE.Mesh(heatFill.geometry, heatFill.material);
  [ring, fill].forEach(m => { m.rotation.x = -Math.PI / 2; m.position.set(x, 0.026, z); scene.add(m); });
  heaters.push({ x, z, ring, fill, bld: addBuilding('暖氣塔' + i, g, 0.8) });
}

