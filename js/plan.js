'use strict';
// ===== 規劃模式（村莊開始）：鏡頭拉高、地上出現格子，點格子決定民房、暖氣塔蓋哪；規劃時遊戲暫停 =====
save.plan = save.plan || [];
const BIG = { mill: 1, grill: 1, smith: 1 }; // 有門口付款格的加工建築
const planBld = []; // save.plan[i] 蓋出來的建築（長按搬家用）
function buildPlanned(p, i) {
  if (p.k === 'house') buildHouseAt(p.x, p.z, '規劃民房' + i);
  else if (p.k === 'tower') buildTower(p.x, p.z, true);
  else if (BIG[p.k]) addProc(p.k, p.x, p.z);
  else buildHeater(p.x, p.z, i);
  planBld[i] = buildings[buildings.length - 1];
}
save.plan.forEach(buildPlanned);
const plan = { on: false, kind: null, cell: null, cx: 0, cz: 2, down: null };
const grid = new THREE.GridHelper(90, 30, 0x25415e, 0x25415e); // 深藍色，雪地上也看得到
grid.material.transparent = true; grid.material.opacity = 0.3; grid.position.set(0, 0.06, 0); grid.visible = false; scene.add(grid);
const cursor = new THREE.Mesh(new THREE.PlaneGeometry(CFG.cell * 0.94, CFG.cell * 0.94), new THREE.MeshBasicMaterial({ color: 0x5fd068, transparent: true, opacity: 0.5, depthWrite: false }));
cursor.rotation.x = -Math.PI / 2; cursor.position.y = 0.07; cursor.visible = false; scene.add(cursor);
const ghost = box(2.2, 1.4, 2, new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 })); ghost.visible = false; scene.add(ghost);
// 分區（企劃 9.1，正式關）：民房區＝南邊 z > 3；防禦區＝北邊熊來的方向 z < -12；工業區＝西邊煤礦那側 x < -7；其他是加工區（鋸木機、烤肉攤）
const zoneOf = (x, z) => z > 3 * TS ? 'house' : z < -12 * TS ? 'def' : x < -7 * TS ? 'ind' : 'work';
const KIND_ZONE = { house: 'house', mill: 'work', grill: 'work', smith: 'ind', tower: 'def' };  // 暖氣塔哪一區都能蓋
const ZONE_TXT = { house: '綠色的民房區', work: '橘色的加工區', ind: '紫色的工業區', def: '紅色的防禦區' };
const zones = new THREE.Group(); zones.visible = false; scene.add(zones);
[[56, 25, 0, 15.5, 0x5fd068], [35, 15, 10.5, -4.5, 0xffa53d], [21, 15, -17.5, -4.5, 0xa77be0], [56, 16, 0, -20, 0xe05a5a]].forEach(([w, h, x, z, c]) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.16, depthWrite: false }));
  m.scale.set(TS, TS, 1); m.rotation.x = -Math.PI / 2; m.position.set(x * TS, 0.055, z * TS); zones.add(m);
});
// 正式關推薦位置（自己蓋、託管都會先幫你放好）：從火爐往外找第一個能蓋的格子（越近越暖、越好走）
function autoSpot(k) {
  const c = CFG.cell, cells = [];
  for (let i = -12; i < 12; i++) for (let j = -12; j < 12; j++) cells.push([(i + 0.5) * c, (j + 0.5) * c]);
  const [ox, oz] = k === 'tower' ? [0, -FENCE_R - 3] : [FX, FZ];  // 弩砲塔：靠近北門外熊來的路；其他：靠近火爐比較暖
  cells.sort((a, b) => Math.hypot(a[0] - ox, a[1] - oz) - Math.hypot(b[0] - ox, b[1] - oz));
  return cells.find(([x, z]) => canBuild(x, z, k)) || null;
}
function planCost(k) { if (k === 'gate') return P(CFG.gatePrice); return P(k === 'house' ? housePrice() : { mill: CFG.mill2Price, grill: CFG.grill2Price, smith: CFG.smithPrice, tower: towerPrice() }[k] || CFG.heaterPrice); } // 用倉庫的🧱木材付
const towerPrice = () => 40 + 50 * towers.length;  // 正式關弩砲塔：40、90、140…
const planned = k => save.plan.some(p => p.k === k);
function planLimit(k) {
  const lv = LEVELS[save.level];
  if (k === 'mill') return PRO && save.east && !planned('mill');      // 跟教學關一樣：開拓東邊後才有
  if (k === 'grill') return PRO && save.level >= 1 && !planned('grill');
  if (k === 'tower') return towers.length < 2 + save.level; // 營地 2 座，每升一級多 1 座
  if (k === 'smith') return save.mine && !planned('smith');
  if (k === 'gate') return save.gates.length < CFG.gateMax;      // 開採煤礦後才有煤可以打
  return k === 'house' ? houses.length < lv.houses : heaters.length < lv.heaters + (save.stove ? 1 : 0);
}
const wrongZone = (x, z, k) => PRO && KIND_ZONE[k] && zoneOf(x, z) !== KIND_ZONE[k]; // 正式關：同一區蓋同類建築
// 圍欄開口（v0.66）：點在圍欄上的格子 → 回傳開在哪一邊、哪個位置；角落、太靠近別的門、門口有建築都不行
function gateSpot(x, z) {
  for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    const l = gateLocal({ a }, x, z);
    if (Math.abs(l.out - FENCE_R) > 1.6 || Math.abs(l.t) > FENCE_R - 3) continue;
    const [gx, gz] = gatePoint({ a, off: l.t }, FENCE_R);
    if (GATES.some(g => Math.abs(g.a - a) < 0.01 && Math.abs((g.off || 0) - l.t) < g.w / 2 + CFG.gateW / 2 + 0.6)) return null;
    if (buildings.some(b => !b.dead && Math.hypot(b.x - gx, b.z - gz) < b.r + 1.5)) return null;
    return { a, off: l.t };
  }
  return null;
}
function canBuild(x, z, k) {
  if (k === 'gate') return !!gateSpot(x, z);
  if (wrongZone(x, z, k)) return false;
  if (k === 'tower') {                                          // 弩砲塔：圍欄外 1～2 格，樹會自動移走所以不擋，熊也不擋
    const r = fd(x, z), d = (a, b) => Math.hypot(a - x, b - z);
    return r > FENCE_R + 1.6 && r < FENCE_R + 6.5 && Math.abs(x) > 3 && !(x > 0 && Math.abs(z) < 3) // 不擋北門、南門、東門的路
      && !buildings.some(b => d(b.x, b.z) < b.r + 1.6) && !nearMine(x, z, 1);
  }
  const big = !!BIG[k];
  if (big && !canBuild(x, z + 2.7, 'pad')) return false;                         // 門口前的付款格也要有空地
  const r = Math.hypot(x, z), d = (a, b) => Math.hypot(a - x, b - z);
  if (r > 27 * TS || Math.abs(fd(x, z) - FENCE_R) < 1.8 || d(FX, FZ) < 2.6) return false;
  if (Math.abs(x - QX) < 1.8 && z > CZ - 1 && z < CZ + 17 * TS) return false;          // 村民排隊的路
  if (Math.abs(x) < 4.5 && z < -FENCE_R + 4 && z > -FENCE_R - 3) return false;                        // 北門前
  if (buildings.some(b => d(b.x, b.z) < b.r + (big ? 2.2 : 1.6))) return false;
  if (unlocks.some(u => !u.done && d(u.x, u.z) < 2.3)) return false;
  if (mills.some(m => d(m.inPad.position.x, m.inPad.position.z) < 2 || d(m.outPad.position.x, m.outPad.position.z) < 2)) return false;
  if (wh.pad && d(wh.pad.position.x, wh.pad.position.z) < 2) return false;            // 倉庫門口的格子
  if (trees.some(t => !t.gone && d(t.x, t.z) < 1.7)) return false;
  if (nearMine(x, z, big ? 1.6 : 1)) return false;                                // 礦坑的山、坑口、木軌、煤堆
  if (!PRO && HOUSE_LOTS.slice(save.houses).some(l => d(l.x, l.z) < 2.8)) return false; // 教學關：民房區保留給固定位置的民房
  if (Object.values(LOT).some(([a, b]) => d(a, b) < 2.4)) return false;            // 付款格、建築的固定地塊
  if (Math.abs(x) < 1.6 || (x > 0 && Math.abs(z) < 1.6)) return false;            // 南北主路、東路
  if (!PRO && z > 0 && (Math.abs(r - 9.8) < 1.6 || Math.abs(r - 14.3) < 1.6)) return false; // 民房環狀路
  return true;
}
function planUi() {
  const lv = LEVELS[save.level];
  $('pkHouse').textContent = planLimit('house') ? '🧱 ' + planCost('house') : '已滿 ' + lv.houses + ' 間';
  $('pkMill').textContent = planLimit('mill') ? '🧱 ' + planCost('mill') : planned('mill') ? '已蓋' : '開拓東邊後';
  $('pkTower').textContent = planLimit('tower') ? '🧱 ' + planCost('tower') : '已滿 ' + towers.length + ' 座';
  $('pkSmith').textContent = planLimit('smith') ? '🧱 ' + planCost('smith') : planned('smith') ? '已蓋' : '開採煤礦後';
  $('pkGrill').textContent = planLimit('grill') ? '🧱 ' + planCost('grill') : planned('grill') ? '已蓋' : '村莊解鎖';
  $('pkGate').textContent = planLimit('gate') ? '🧱 ' + planCost('gate') : '已滿 ' + CFG.gateMax + ' 個';
  $('pkHeater').textContent = planLimit('heater') ? '🧱 ' + planCost('heater') : lv.heaters ? '已滿 ' + (lv.heaters + (save.stove ? 1 : 0)) + ' 座' : '村莊解鎖';
  document.querySelectorAll('#planBar [data-k]').forEach(b => b.classList.toggle('sel', b.dataset.k === plan.kind));
  let tip = '選一種建築，電腦會先放在推薦位置；新民房會自動接上道路；按住任何建築可以搬家', ok = false;
  if (plan.kind && plan.cell) {
    const [x, z] = plan.cell, cost = planCost(plan.kind);
    if (!planLimit(plan.kind)) tip = '數量已達上限，城市升級後可以蓋更多';
    else if (!canBuild(x, z, plan.kind)) tip = plan.kind === 'gate' ? '開口要點在圍欄上（不能在角落、太靠近別的門或建築）' : wrongZone(x, z, plan.kind) ? '這種建築只能蓋在' + ZONE_TXT[KIND_ZONE[plan.kind]] : '這格不能蓋（太靠近建築、圍欄、樹或路）';
    else if (!save.wh) tip = '先蓋📦倉庫，建築要用倉庫裡的🧱木材蓋';
    else if (save.store.plank < cost) tip = '木材不夠：需要 🧱 ' + cost + '（倉庫有 ' + save.store.plank + '）';
    else { tip = (plan.cell === plan.rec ? '⭐ 推薦位置：' : '') + '按「✅ 蓋這裡」用掉 🧱 ' + cost; ok = true; }
    cursor.material.color.setHex(ok ? 0x5fd068 : 0xff5a4a);
  } else if (plan.kind) tip = true ? '附近沒有空位了，擴大領地或自己點格子試試' : '點地上的格子，選要蓋在哪';
  $('planTip').textContent = tip; $('planGo').disabled = !ok;
  ghost.visible = !!(plan.kind && plan.cell);
  if (ghost.visible) { const [sx, sy, sz] = (plan.kind === 'house' ? [1, 1, 1] : plan.kind === 'gate' ? [1.6, 0.6, 0.15] : BIG[plan.kind] ? [1.4, 1.15, 1.2] : null) || [0.45, 1.6, 0.45]; ghost.position.set(plan.cell[0], sy * 0.7, plan.cell[1]); ghost.scale.set(sx, sy, sz); }
}
function setPlan(on) {
  plan.on = on; plan.kind = null; plan.cell = null;
  if (on) { plan.cx = player.position.x; plan.cz = player.position.z; joy.active = false; joy.x = joy.y = 0; joyEl.style.display = 'none'; }
  grid.visible = cursor.visible = on; ghost.visible = false; zones.visible = on && PRO; $('hint').style.visibility = on ? 'hidden' : ''; // 開場提示不要擋到規劃列
  $('planBar').style.display = on ? 'block' : 'none';
  if (on) planUi(); else clock.getDelta();
}
if (!PRO) document.querySelectorAll('#planBar .pro').forEach(b => b.style.display = 'none'); // 教學關沒有這幾顆
document.getElementById('planBtn').onclick = () => setPlan(true);
document.getElementById('planExit').onclick = () => setPlan(false);
document.querySelectorAll('#planBar [data-k]').forEach(b => b.onclick = () => {
  plan.kind = b.dataset.k;
  { plan.cell = plan.rec = autoSpot(plan.kind); if (plan.cell) { cursor.position.x = plan.cell[0]; cursor.position.z = plan.cell[1]; plan.cx = plan.cell[0]; plan.cz = plan.cell[1]; } }
  planUi();
});
document.getElementById('planGo').onclick = () => {
  if (!plan.kind || !plan.cell) return;
  const [x, z] = plan.cell, k = plan.kind, cost = planCost(k);
  if (!planLimit(k) || !canBuild(x, z, k) || !save.wh || save.store.plank < cost) return;
  save.store.plank -= cost;
  if (k === 'gate') {                                            // 圍欄開口：不是建築，記在 save.gates
    const s = gateSpot(x, z); save.gates.push(s); GATES.push({ a: s.a, w: CFG.gateW, off: s.off, own: true });
    buildFence(); buildDoorsAll(); toast('🚪 開好門了！人和工人會走最近的門');
  } else { save.plan.push({ k, x, z }); buildPlanned(save.plan[save.plan.length - 1], save.plan.length - 1); }
  if (k === 'mill') { save.mill2 = true; toast('加工速度翻倍！'); } else if (k === 'grill') toast('第二座烤肉攤：肉烤得更快！');
  sfx.unlock(); sparkle(x, z); writeSave();
  plan.cell = null; if (MODE === 'auto') plan.kind = null; planUi();
  if (save.plan.length === 1) setTimeout(() => toast('💡 在規劃畫面按住任何建築，可以搬到別的地方'), 1600);
};
const ray = new THREE.Raycaster(), groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
function planPointer(type, e) {
  if (type === 'down') { plan.down = { x: e.clientX, y: e.clientY, cx: plan.cx, cz: plan.cz, moved: false, id: e.pointerId }; longPress(e); return; }
  const d = plan.down; if (!d || e.pointerId !== d.id) return;
  if (plan.move) { if (type === 'up') dropMove(); else dragMove(e); return; }
  const dx = e.clientX - d.x, dy = e.clientY - d.y;
  if (Math.hypot(dx, dy) > 10) { d.moved = true; clearTimeout(lpTimer); }
  if (type === 'up') clearTimeout(lpTimer);
  const k = 0.05 * LEVELS[save.level].cam;                       // 拖曳：移動畫面
  if (d.moved) { plan.cx = Math.max(-28 * TS, Math.min(28 * TS, d.cx - dx * k)); plan.cz = Math.max(-28 * TS, Math.min(28 * TS, d.cz - dy * k)); }
  if (type === 'up') {
    plan.down = null;
    if (d.moved) return;
    ray.setFromCamera(new THREE.Vector2(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), camera);
    const p = ray.ray.intersectPlane(groundPlane, new THREE.Vector3()); if (!p) return;
    const c = CFG.cell, x = (Math.floor(p.x / c) + 0.5) * c, z = (Math.floor(p.z / c) + 0.5) * c;
    plan.cell = [x, z]; cursor.position.x = x; cursor.position.z = z; planUi();
  }
}
// ===== 長按建築搬家（規劃模式裡，作者 10/17：像手機模擬建築遊戲）：按住任何建築 0.5 秒 → 上帝視角（規劃模式）→ 拖到新位置放開 =====
// v0.58：付款格蓋的建築（鋸木廠、烤肉攤、民房、弩砲塔）也能搬，新位置記在 save.moved[建築名]；規劃蓋的照舊記在 save.plan
save.moved = save.moved || {};
const KIND_OF = { 鋸木廠: 'mill', 第二台鋸木機: 'mill', 烤肉攤: 'grill', 第二座烤肉攤: 'grill', 鐵匠鋪: 'smith', 倉庫: 'mill' }; // 倉庫門口也有格子，跟鋸木廠一樣檢查 // 建築名 → 能蓋在哪一區、怎麼檢查空地
function kindOf(b) {
  const i = planBld.indexOf(b); if (i >= 0) return save.plan[i].k;
  return KIND_OF[b.key] || (houses.includes(b) ? 'house' : towers.some(t => t.bld === b) ? 'tower' : 'heater');
}
function remember(b) {                                            // 搬過的建築把新位置存起來
  const i = planBld.indexOf(b);
  if (i >= 0) { save.plan[i].x = b.x; save.plan[i].z = b.z; } else if (b.userMoved) save.moved[b.key] = [b.x, b.z];
}
let lpTimer = 0;
function longPress(e) { clearTimeout(lpTimer); { const { clientX: x, clientY: y, pointerId: id } = e; lpTimer = setTimeout(() => pickAt(x, y, id), 500); } }
function groundAt(cx, cy) { ray.setFromCamera(new THREE.Vector2(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1), camera); return ray.ray.intersectPlane(groundPlane, new THREE.Vector3()); }
function moveAll(b, x, z) {                                       // 建築連同付款格、暖氣圈一起搬
  const dx = x - b.x, dz = z - b.z;
  moveBuilding(b, x, z);
  const m = mills.find(m => m.bld === b), h = heaters.find(h => h.bld === b);
  if (m) [m.inPad, m.outPad, ...m.out, m.label].forEach(o => { o.position.x += dx; o.position.z += dz; });
  if (h) { h.x = x; h.z = z; [h.ring, h.fill].forEach(o => o.position.set(x, o.position.y, z)); }
  if (b === wh.bld) [wh.pad, wh.label].forEach(o => { o.position.x += dx; o.position.z += dz; });
  roadsDirty = true;
}
function pickAt(cx, cy, id) {
  const p = groundAt(cx, cy); if (!p) return;
  const b = buildings.find(b => !b.dead && Math.hypot(b.x - p.x, b.z - p.z) < b.r + 0.6);
  if (!b) return;
  if (!plan.on) setPlan(true);
  plan.kind = null; plan.cell = null; plan.cx = b.x; plan.cz = b.z; ghost.visible = false;
  plan.move = { b, k: kindOf(b), ox: b.x, oz: b.z }; plan.down = { id, moved: true };
  moveAll(b, 1e4, 1e4); b.g.position.set(plan.move.ox, 0.6, plan.move.oz);   // 抓起來浮在空中；暫時移開，才不會擋到自己
  cursor.position.x = plan.move.ox; cursor.position.z = plan.move.oz; cursor.material.color.setHex(0x5fd068);
  $('planTip').textContent = '拖到新位置放開（紅色＝不能放）'; sfx.coin(); if (navigator.vibrate) try { navigator.vibrate(30); } catch (_) {}
}
function dragMove(e) {
  const p = groundAt(e.clientX, e.clientY); if (!p) return;
  const c = CFG.cell, x = (Math.floor(p.x / c) + 0.5) * c, z = (Math.floor(p.z / c) + 0.5) * c, k = plan.move.k;
  plan.move.x = x; plan.move.z = z;
  plan.move.b.g.position.set(x, 0.6, z); cursor.position.x = x; cursor.position.z = z;
  const ok = canBuild(x, z, k);
  cursor.material.color.setHex(ok ? 0x5fd068 : 0xff5a4a);
  $('planTip').textContent = ok ? '放開就搬到這裡' : wrongZone(x, z, k) ? '這種建築只能放在' + ZONE_TXT[KIND_ZONE[k]] : '這格不能放（太靠近建築、圍欄、樹或路）';
}
function dropMove() {
  const mv = plan.move, b = mv.b; plan.move = null; plan.down = null;
  const ok = mv.x != null && (mv.x !== mv.ox || mv.z !== mv.oz) && canBuild(mv.x, mv.z, mv.k);
  moveAll(b, ok ? mv.x : mv.ox, ok ? mv.z : mv.oz);
  if (ok) { b.userMoved = true; remember(b); sparkle(b.x, b.z); sfx.unlock(); writeSave(); toast('搬好了！'); }
  else if (mv.x != null && (mv.x !== mv.ox || mv.z !== mv.oz)) toast('這裡不能放，放回原位');
  planUi();
}
function planCamera(dt) {
  const h = 30 * LEVELS[save.level].cam * (innerWidth < innerHeight ? 1.25 : 1);
  camera.position.lerp(tmp.set(plan.cx, h, plan.cz + h * 0.45), 1 - Math.exp(-dt * 6));
  camera.lookAt(plan.cx, 0, plan.cz);
}

// ===== 城市等級升級：人口到門檻 → 暫停、跳出「新解鎖」卡片、鏡頭拉遠、出現新付款格 =====
let truckPads = null, truckT = 0, truckN = 0, truckObj = null;
// ===== 自動運輸（作者 10/17 回饋第 2 項）：每隔幾秒運一趟木頭或煤；換錢＝直接賣掉；（v0.61 前買的「進倉庫」＝送進倉庫） =====
function buildTruck() {
  const [x, z] = save.truck === 'cash' ? LOT.truckCash : LOT.truckStore, g = new THREE.Group();
  const bed = box(1.8, 0.5, 1.2, mats.wood); bed.position.y = 0.45; g.add(bed);
  const load = box(1.4, 0.5, 0.9, save.truck === 'cash' ? mats.cash : mats.trunk); load.position.y = 0.95; g.add(load);
  g.position.set(x, 0, z); scene.add(g);
  const label = makeLabel(); label.scale.set(3, 1.5, 1); label.position.set(x, 2.4, z); scene.add(label);
  truckObj = { g, label };
}
function updateTransport(dt) {
  if (!save.truck) return;
  if (!truckObj) buildTruck();
  const st = save.store;
  truckT += dt;
  if (truckT >= CFG.truckEvery) {
    truckT = 0; const coal = truckN++ % 2 === 1 && save.bin > 0;    // 木頭、煤輪流運；煤從礦坑的煤堆拿
    if (coal) save.bin--;
    if (save.truck === 'cash') { save.cash += coal ? (planned('smith') ? CFG.coalValue : 3) : 2; sfx.coin(); }
    else if (coal) st.coal = Math.min(CFG.storeMax, st.coal + 1); else st.log = Math.min(CFG.storeMax, st.log + 1);
  }
  truckObj.label.set(save.truck === 'cash' ? ['🚚 自動運輸', '換錢中'] : ['🚚 運輸隊', '送進📦倉庫']);
}
// 倉庫每秒：先顧營火（有煤先用煤）→ 用木材修北門 → 修建築；柴夠了，多的木頭送去鋸木廠做成木材
// 工人（伐木工、鏟雪工）每 eatEvery 秒各吃 1 份烤肉，倉庫沒食物就罷工
let depositCd = 0;
function updateStore(dt) {
  if (!save.wh) return;
  const st = save.store, f = furnace, ip = wh.pad.position;
  depositCd -= dt;                                                 // 揹木頭、煤站到倉庫格子上：放進倉庫
  const k = carried.map(m => m.userData.type).findLastIndex(t => t === 'log' || t === 'coal');
  if (k >= 0 && depositCd <= 0 && st[carried[k].userData.type] < CFG.storeMax && Math.hypot(player.position.x - ip.x, player.position.z - ip.z) < 1.3) {
    depositCd = 0.07;
    const m = carried.splice(k, 1)[0], type = m.userData.type, wp = m.getWorldPosition(new THREE.Vector3());
    stackRoot.remove(m); restack();
    fly(m, wp, () => wh.bld.g.position.clone().add(tmp.set(0, 1.6, 0)), 0.3, () => { scene.remove(m); st[type]++; });
  }
  wh.t += dt;
  if (wh.t >= 1 && !wh.bld.dead) {
    wh.t = 0;
    const hurt = buildings.find(b => !b.dead && b.hp < CFG.buildHp), mill = mills[0];
    if (porters.length) ; // 有搬運工：補火、修門、修建築改成小人走過去才生效（updatePorters）
    else if (f.fuel < CFG.fuelMax * 0.7 && (st.coal || st.log)) { const c = st.coal > 0; if (c) st.coal--; else st.log--; f.fuel = Math.min(CFG.fuelMax, f.fuel + (c ? CFG.fuelPerCoal : CFG.fuelPerLog)); }
    else if (gate.hp < CFG.gateHp && st.plank) { st.plank--; gate.hp = Math.min(CFG.gateHp, gate.hp + 10); }
    else if (hurt && st.plank) { st.plank--; hurt.hp = Math.min(CFG.buildHp, hurt.hp + 10); }
    if (st.log > CFG.fuelKeep && mill.queue < 3 && !mill.bld.dead) { st.log--; mill.queue++; }
  }
  const meal = mealSize();                                        // v0.76：所有居民都要吃，人越多吃越多
  wh.eatT += dt;
  if (wh.eatT >= CFG.eatEvery) {
    wh.eatT = 0;
    if (st.food >= meal) st.food -= meal;
    else {
      st.food = 0; wh.hungry = true;
      if (idle() > 0) { save.res--; toast('😢 沒東西吃，1 位居民離開了！工人罷工，烤肉會先送進倉庫'); }
      else toast('🍖 倉庫沒食物了，工人罷工！烤肉會先送進倉庫');
    }
  }
  if (wh.hungry && st.food > 0) { st.food--; wh.hungry = false; toast('😋 工人吃飽，復工了！'); }
  wh.label.set(wh.hungry ? ['📦 倉庫', '😩 沒食物，工人罷工'] : ['📦 倉庫', '🧱' + st.plank + ' 🔥' + (st.log + st.coal) + ' 🍖' + st.food], wh.hungry ? '#ff6a5a' : '#fff');
}
// 搬運工：營火要柴 → 北門要修 → 建築要修 → 綠框有錢；先回倉庫格子拿東西（一趟最多 3 個），走到目的地才生效
function updatePorters(dt) {
  if (!save.wh || wh.bld.dead) return;
  const st = save.store, home = wh.pad.position, taken = k => porters.some(o => o.job && (o.job.k === k || o.job.b === k || o.job.m === k));
  porters.forEach((p, i) => {
    if (!p.job) {
      const hurt = buildings.find(b => !b.dead && b.hp < CFG.buildHp && !taken(b)), cash = mills.find(m => m.out.length && !taken(m));
      if (furnace.fuel < CFG.fuelMax * 0.7 && st.coal + st.log && !taken('fuel')) p.job = { k: 'fuel' };
      else if (gate.hp < CFG.gateHp && st.plank && !taken('gate')) p.job = { k: 'gate' };
      else if (hurt && st.plank) p.job = { k: 'fix', b: hurt };
      else if (cash) p.job = { k: 'cash', m: cash, got: true };
      else return void routeTo(p, home.x - 1 + i * 2, home.z + 1.2, dt);  // 沒事做：在倉庫門口等
    }
    const j = p.job;
    if (!j.got) {                                                    // 先回倉庫拿
      routeTo(p, home.x, home.z, dt);
      if (Math.hypot(p.g.position.x - home.x, p.g.position.z - home.z) > 0.8) return;
      if (j.k === 'fuel') { j.coal = Math.min(3, st.coal); j.log = Math.min(3 - j.coal, st.log); st.coal -= j.coal; st.log -= j.log; j.n = j.coal + j.log; }
      else { const lack = j.k === 'gate' ? CFG.gateHp - gate.hp : CFG.buildHp - j.b.hp; j.n = Math.min(3, st.plank, Math.ceil(lack / 10)); st.plank -= j.n; }
      if (!j.n) { p.job = null; return; }
      j.got = true; p.cargo.material = j.k === 'fuel' ? (j.coal ? mats.coal : mats.trunk) : mats.wood; p.cargo.visible = true;
    }
    const [tx, tz, r] = j.k === 'fuel' ? [FX + 1.4, FZ + 1.4, 1.2] : j.k === 'gate' ? [repairPad.position.x, repairPad.position.z, 0.8]
      : j.k === 'fix' ? [j.b.x, j.b.z, j.b.r + 0.9] : [j.m.outPad.position.x, j.m.outPad.position.z, 0.8];
    routeTo(p, tx, tz, dt);
    if (Math.hypot(p.g.position.x - tx, p.g.position.z - tz) > r) return;
    if (j.k === 'fuel') furnace.fuel = Math.min(CFG.fuelMax, furnace.fuel + j.coal * CFG.fuelPerCoal + j.log * CFG.fuelPerLog);
    else if (j.k === 'gate') gate.hp = Math.min(CFG.gateHp, gate.hp + j.n * 10);
    else if (j.k === 'fix') { if (j.b.dead) st.plank += j.n; else j.b.hp = Math.min(CFG.buildHp, j.b.hp + j.n * 10); }
    else j.m.out.splice(0).forEach((b, k) => fly(b, b.position.clone(), () => p.g.position.clone().add(tmp.set(0, 1.6, 0)), 0.25 + k * 0.02, () => { scene.remove(b); save.cash += j.m.value; sfx.coin(); }, 1));
    p.cargo.visible = false; p.job = null;
  });
}
// 鋸木廠做的木材、烤肉攤烤的肉飛進倉庫
function toStore(k, mill) {
  const m = k === 'plank' ? box(0.9, 0.12, 0.4, mats.wood) : new THREE.Mesh(logGeo, mats.meat);
  fly(m, mill.g.position.clone().add(tmp.set(0, 1.6, 0)), () => wh.bld.g.position.clone().add(tmp.set(0, 1.6, 0)), 0.6, () => { scene.remove(m); save.store[k]++; }, 2);
}
let paused = false, stoveUnlock = null, terrUnlock = null, eastUnlock = null, mill2Unlock = null;
// 營火升級＝擴大領地：Lv1 升級任意 3 個項目後出現；Lv2 要村莊等級＋已開拓東邊
function terrReady() { return save.territory === 0 ? save.buys >= CFG.terrNeedBuys : save.territory === 1 && save.level >= 1 && save.east; }
function levelUnlocks() {
  if (!truckPads && save.mine && !save.truck) truckPads = makeUnlock({ x: LOT.truckCash[0], z: LOT.truckCash[1], icon: '🚚', name: () => '自動運輸：換錢',
    price: () => save.truck ? null : CFG.truckPrice, buy: () => { save.truck = 'cash'; buildTruck(); toast('🚚 運輸隊會把木頭、煤直接拿去換錢！'); } }); // 倉庫已經自己有了，不用再二選一
  if (terrUnlock && terrUnlock.done) terrUnlock = null;
  if (!terrUnlock && terrReady()) terrUnlock = makeUnlock({ x: LOT.terr[0], z: LOT.terr[1], icon: '🔥', name: () => '營火升級 Lv' + (save.territory + 1), mat: 'plank',
    price: () => terrUnlock && terrUnlock.waiting ? null : P(CFG.terrPrice[save.territory]), buy: () => { expandTerritory(); terrUnlock.waiting = true; } });
  // 石爐：領地升到最大（營火 Lv3）＋有煤礦後，同一格繼續升 Lv4～6
  if (!stoveUnlock && save.stove < 3 && save.territory >= 2 && save.mine && (!terrUnlock || terrUnlock.waiting)) {
    stoveUnlock = makeUnlock({ x: LOT.terr[0], z: LOT.terr[1], icon: '🪨', name: () => (save.stove ? '石爐升級' : '蓋石爐') + ' Lv' + (fireLv() + 1),
      price: () => CFG.stovePrice[save.stove] ?? null, buy: () => { save.stove++; updateStoveLook(); sparkle(FX, FZ);
        toast(save.stove === 1 ? '🪨 營火進化成石爐！更耐燒、暖氣更大、暖氣塔 +1 座' : '🪨 石爐升級！更耐燒、暖氣更大'); } });
    stoveUnlock.cool = CFG.buildCool;
  }
  if (!eastUnlock && !save.east && save.territory >= 1) eastUnlock = makeUnlock({ x: FENCE_R - 2.2, z: 0, icon: '🌲', name: () => '開拓東邊',
    price: () => save.east ? null : 50, buy: () => { save.east = true; openEast(); buildDoorsAll(); toast('東邊開放了！現在可以蓋民房、第二台鋸木機' + (PRO ? '（用規劃模式蓋）' : '')); } });
  if (!PRO && !mill2Unlock && !save.mill2 && save.east) mill2Unlock = makeUnlock({ x: LOT.mill2[0], z: LOT.mill2[1], icon: '🪚', name: () => '第二台鋸木機', mat: 'plank',
    price: () => save.mill2 ? null : P(80), buy: () => { save.mill2 = true; addMill2(); toast('加工速度翻倍！'); } });
  if (!PRO && save.east && houseUnlock.done && houses.length < LEVELS[save.level].houses && houseLotOpen()) houseUnlock = addHouseUnlock();
  if (save.level >= 1 && save.territory >= 1 && !save.mine && !mineUnlock) mineUnlock = makeUnlock({ x: LOT.minePad[0], z: LOT.minePad[1], icon: '⛏️', name: () => '開採煤礦',
    price: () => save.mine ? null : CFG.minePrice, buy: () => { save.mine = 1; openMine(); sparkle(MINE_FX, MINE.z); toast('⛏️ 西邊的礦坑打開了！到坑口挖煤，煤丟進火爐很耐燒'); } });
  if (save.mine && !save.cart && !cartUnlock) cartUnlock = makeUnlock({ x: LOT.cart[0], z: LOT.cart[1], icon: '🛤️', name: () => '雇礦工＋木軌礦車', mat: 'plank',
    price: () => save.cart ? null : P(CFG.cartPrice), buy: () => { save.cart = 1; buildCart(); sparkle(MINE_BIN[0], MINE_BIN[1]); toast('🛤️ 礦工在坑裡挖，礦車會把煤推出來倒在煤堆！'); } });
  if (save.level >= 1 && !save.shovel && !shovelUnlock) shovelUnlock = makeUnlock({ x: LOT.shovel[0], z: LOT.shovel[1], icon: '🧹', name: () => '雇用鏟雪工', need: () => needHand(),
    price: () => save.shovel ? null : CFG.shovelPrice, buy: () => { save.shovel = 1; addShoveler(); toast('鏟雪工會自己去鏟雪！'); } });
}

// ===== 擴大領地：圍欄往外推，北門、弩砲塔、修門格、民房跟著搬，圈進來的樹移走、北邊森林往外補 =====
function moveBuilding(b, x, z) {
  b.x = x; b.z = z; b.g.position.set(x, 0, z); b.rubble.position.set(x, 0, z); b.label.position.x = x; b.label.position.z = z;
}
function buildDoorsAll() {
  for (const d of doors) scene.remove(d.group);
  doors.length = 0;
  const vis = gate.posts.visible;
  gate.posts = makeDoors(GATES[0], true).group; gate.posts.visible = vis;
  southDoors = makeDoors(GATES[1], false); eastDoors = makeDoors(GATES[2], false);
  GATES.filter(g => g.own).forEach(g => makeDoors(g, false));
}
function applyTerritory(init) {
  FENCE_R = TERR[save.territory].r;
  NG_PX = GATES[0].w / 2; NG_PZ = -FENCE_R; NG_LEN = NG_PX;
  buildFence(); buildDoorsAll();
  camp.scale.setScalar((FENCE_R - 0.2) / 8.5);
  fireLight.distance = FENCE_R + 7;                                // 營火光跟著領地變大，蓋住整個營地
  gateLabel.position.z = -FENCE_R - 0.2;
  repairPad.position.z = -FENCE_R + 2.1; repairLabel.position.z = -FENCE_R + 2.1;
  towers.forEach(t => {
    if (!t.fixed && !t.bld.userMoved) return moveBuilding(t.bld, t.g.position.x, towerZ(t.g.position.x));
    const r = fd(t.bld.x, t.bld.z);                       // 自己蓋或搬過的塔被新圍欄圈到：往外推到圍欄外
    if (r < FENCE_R + 1.8) { const k = (FENCE_R + 2.4) / r; moveBuilding(t.bld, t.bld.x * k, t.bld.z * k); remember(t.bld); }
  });
  houses.forEach(h => {                                            // 南門外的民房整排往外搬；自己規劃的碰到圍欄就往外推
    const m = /^民房(\d+)$/.exec(h.key);
    if (m && !h.userMoved) { const [x, z] = houseSpot(+m[1]); moveBuilding(h, x, z); }
    else { const r = fd(h.x, h.z); if (Math.abs(r - FENCE_R) < 2) { moveBuilding(h, h.x / r * (FENCE_R + 2.2), h.z / r * (FENCE_R + 2.2)); remember(h); } }
  });
  if (!houseUnlock.done) { [houseUnlock.x, houseUnlock.z] = houseSpot(save.houses); houseUnlock.pad.position.set(houseUnlock.x, 0.03, houseUnlock.z); houseUnlock.label.position.set(houseUnlock.x, 1.9, houseUnlock.z); }
  for (const u of unlocks) {                                       // 卡在圍欄上的付款格往內挪
    if (u.done || u === houseUnlock) continue;
    if (u.north) { u.z = towerPadZ(); u.pad.position.z = u.label.position.z = u.z; continue; }
    const r = fd(u.x, u.z);
    if (Math.abs(r - FENCE_R) < 1.6) { const k = (FENCE_R - 1.8) / r; u.x *= k; u.z *= k; u.pad.position.set(u.x, 0.03, u.z); u.label.position.set(u.x, u.label.position.y, u.z); }
  }
  let moved = 0;
  for (const t of trees) {                                         // 圈進領地的樹移走（煤礦往外推）
    if (t.gone) continue;
    const r = fd(t.x, t.z);
    if (t.coal) continue;                                          // 煤礦石在固定地塊上，不移動
    if (r < FENCE_R + 2.2 || nearTower(t.x, t.z)) { t.gone = true; t.alive = false; t.regrow = Infinity; scene.remove(t.g); if (!t.locked) moved++; }
  }
  for (let i = 0, tries = 0; i < moved && tries < 400; tries++) {  // 北邊森林往外補一樣多棵
    const x = rand(-13, 9) * TS, z = rand(-FENCE_R - 14 * TS, -FENCE_R - 2.6);
    if (!nearNorthDoors(x, z, 1.2) && !nearTower(x, z) && trees.every(t => t.gone || (t.x - x) ** 2 + (t.z - z) ** 2 > 2.6)) { addTree(x, z, false); i++; }
  }
  for (const b of bears) if (!b.aggro && b.z > -FENCE_R - 2) { [b.x, b.z] = bearSpot(); }
  for (let i = piles.length - 1; i >= 0; i--) if (Math.abs(fd(piles[i].x, piles[i].z) - FENCE_R) < 1.3) { scene.remove(piles[i].m); piles.splice(i, 1); }
  roadsDirty = true; if (!init) resize();
}
function expandTerritory() {
  save.territory++; applyTerritory(); writeSave();
  toast('🔥 營火升級！領地擴大了'); sparkle(FX, FZ);
}
for (const b of buildings) { const p = save.moved[b.key]; if (p) { moveAll(b, p[0], p[1]); b.userMoved = true; } } // 讀檔：搬過的建築放回新位置
applyTerritory(true);
levelUnlocks();
if (save.shovel) addShoveler();
function checkLevel() {
  const next = LEVELS[save.level + 1];
  if (!next || population() < next.need) return;
  save.level++; writeSave(); levelUnlocks(); resize();
  $('lvTitle').textContent = '🎉 升級為' + next.name + '！';
  $('lvList').innerHTML = '新解鎖：<br>' + next.unlock.join('<br>');
  $('lvup').style.display = 'flex'; paused = true;
  sfx.unlock(); sparkle(player.position.x, player.position.z);
}
document.getElementById('lvOk').onclick = () => { $('lvup').style.display = 'none'; paused = false; clock.getDelta(); };
// 圍欄裡外要走門：先走到最近的門口，穿過門再走向目標
function routeTo(w, x, z, dt) {
  const px = w.g.position.x, pz = w.g.position.z, rIn = fd(px, pz) < FENCE_R, tIn = fd(x, z) < FENCE_R;
  if (rIn === tIn) return walkTo(w, x, z, dt);
  const cost = g => { const [gx, gz] = gatePoint(g, FENCE_R); return Math.hypot(gx - px, gz - pz) + Math.hypot(gx - x, gz - z); }; // 走哪個門最近（包括自己開的門）
  const g = GATES.filter(g => g !== GATES[2] || save.east).reduce((a, b) => cost(a) < cost(b) ? a : b);
  const l = gateLocal(g, px, pz), inBand = l.along < g.w / 2 - 0.5 && Math.abs(l.out - FENCE_R) < 1.2;
  // 還沒到門口 → 先走到門的這一側；已經在門口 → 穿過去到另一側
  const goInside = rIn ? !inBand : inBand;
  const [gx, gz] = gatePoint(g, goInside ? FENCE_R - 0.9 : FENCE_R + 1.0);
  walkTo(w, gx, gz, dt);
  return false;
}
function walkTo(w, x, z, dt) {
  const dx = x - w.g.position.x, dz = z - w.g.position.z, d = Math.hypot(dx, dz);
  if (d < 0.1) return true;
  const s = Math.min(d, CFG.workerSpeed * slowAt(w.g.position.x, w.g.position.z) * dt);
  [w.g.position.x, w.g.position.z] = pushOut(w.g.position.x + dx / d * s, w.g.position.z + dz / d * s, 0.35, s, x, z); // 繞過建築
  w.g.rotation.y = Math.atan2(dx, dz); w.walk += dt * 12; w.g.position.y = Math.abs(Math.sin(w.walk)) * 0.1;
  return false;
}
function updateWorkers(dt) {
  if (wh.hungry) return;                            // 倉庫沒食物：罷工
  const toWh = save.wh && !wh.bld.dead;
  for (const w of workers) {
    if (w.load >= CFG.workerLoad) {                 // 揹滿了：有倉庫送倉庫，沒有就送鋸木廠
      const ip = (toWh ? wh.pad : mills[0].inPad).position;
      if (routeTo(w, ip.x, ip.z, dt)) {
        if (toWh) save.store.log = Math.min(CFG.storeMax, save.store.log + w.load); else mills[0].queue += w.load;
        w.load = 0;
        while (w.back.children.length) w.back.remove(w.back.children[0]);
      }
      continue;
    }
    if (!w.tree || !w.tree.alive) {                  // 找最近、沒人在砍的樹
      let best = 1e9; w.tree = null;
      for (const t of trees) {
        if (!t.alive || t.locked || t.coal || workers.some(o => o !== w && o.tree === t)) continue;
        const d = (t.x - w.g.position.x) ** 2 + (t.z - w.g.position.z) ** 2;
        if (d < best) { best = d; w.tree = t; }
      }
      if (!w.tree) continue;
    }
    const t = w.tree;
    const ang = Math.atan2(w.g.position.x - t.x, w.g.position.z - t.z);
    if (routeTo(w, t.x + Math.sin(ang) * 1.1, t.z + Math.cos(ang) * 1.1, dt)) {
      w.g.rotation.y = ang + Math.PI; w.g.position.y = 0;
      w.cd -= dt;
      if (w.cd <= 0) {
        w.cd = CFG.workerChop;
        t.hp--; t.shake = 0.25; t.pop = 0.15; burstChips(t.x, t.z);
        if (t.hp <= 0) {
          t.alive = false; t.regrow = CFG.treeRegrow; w.tree = null;
          const n = Math.min(WOODS[t.kind].logs, CFG.workerLoad - w.load);
          for (let i = 0; i < n; i++) { const m = new THREE.Mesh(logGeo, mats.log); m.scale.setScalar(0.7); m.position.y = (w.load + i) * 0.17; w.back.add(m); }
          w.load += n;
        }
      }
    }
  }
}
const pickups = [];
function dropMeat(x, z) {
  for (let i = 0; i < CFG.meatPerBear; i++) {
    const m = new THREE.Mesh(logGeo, mats.meat); m.castShadow = true;
    const px = x + rand(-0.6, 0.6), pz = z + rand(-0.6, 0.6);
    fly(m, new THREE.Vector3(x, 1, z), () => new THREE.Vector3(px, 0.12, pz), 0.4, () => pickups.push({ m, x: px, z: pz }), 1.2);
  }
}
function updateTower(dt) {
  for (const tower of towers) {
    if (tower.bld.dead || tower.bld.cold) continue;
    tower.cd -= dt;
    let tgt = null, best = CFG.towerRange;
    for (const b of bears) {
      if (!b.alive) continue;
      const d = Math.hypot(b.x - tower.g.position.x, b.z - tower.g.position.z);
      if (d < best) { best = d; tgt = b; }
    }
    if (tgt) {
      tower.bow.rotation.y = Math.atan2(tgt.x - tower.g.position.x, tgt.z - tower.g.position.z);
      if (tower.cd <= 0) {
        tower.cd = CFG.towerInterval;
        const arrow = box(0.08, 0.08, 0.9, M(0x333333)); arrow.lookAt(tgt.x - tower.g.position.x, 0, tgt.z - tower.g.position.z);
        fly(arrow, tower.g.position.clone().add(tmp.set(0, 2.8, 0)), () => new THREE.Vector3(tgt.x, 0.9, tgt.z), 0.3, () => {
          scene.remove(arrow);
          if (!tgt.alive) return;
          tgt.hp--; tgt.shake = 0.25; tgt.pop = 0.15; burstChips(tgt.x, tgt.z, true);
          if (tgt.hp <= 0) { tgt.alive = false; tgt.respawn = CFG.bearRespawn; dropMeat(tgt.x, tgt.z); }
        }, 0.8);
        flies[flies.length - 1].spin = false;
      }
    }
  }
  // 撿地上的肉
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i];
    if (Math.hypot(p.x - player.position.x, p.z - player.position.z) > 1.6) continue;
    if (countOf('meat') >= capacity()) break;
    const idx = stackHeight();
    pickups.splice(i, 1);
    const m = p.m; m.userData.type = 'meat';
    fly(m, m.position.clone(), () => stackRoot.localToWorld(new THREE.Vector3(0, idx * 0.24, 0)), 0.3, () => { stackRoot.add(m); carried.push(m); restack(); });
    flies[flies.length - 1].toBack = 'meat';
  }
}

