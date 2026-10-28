'use strict';
// ===== 第 3 關：石器村莊・岩山（v1.35；完整設計見 docs/第3關設計.md）=====
// 介面、目標列、格子規則、開場／結尾動畫都跟第 1、2 關一樣（左上錢＋居民、左下揹包＋倉庫、上方火條＋血條＋目標＋警示、右下轉視角）。
// 做法跟第 1 關一樣：第 2 關的世界照常建好，進第 3 關時全部藏起來，只留燈光、主角、雪；第 3 關自己的東西放在 root 底下。
// 流程：蓋採石場／煤礦／倉庫／烤肉攤… → 石屋住人 → 升級 → 自給自足 → 🏔️ 大雪崩（3 波）→ 礦坑和採石場被埋 → 劇情卡，留在原地（第 4 關還沒做）。
const stage3 = (() => {
  const S = { on: false };
  const CF = {
    cap: 6, burn: 0.26, coalFuel: 30, plankFuel: 12, arrive: 14, pay: 6, queueMax: 3, baseBeds: 6, houseBeds: 6, rockT: 0.6, mineT: 0.6, treeHp: 3, treeLogs: 3, treeRe: 40, hareRe: 25,
    storeCap: [80, 160, 240], grillMax: [6, 10, 14], grillT: [0.9, 0.6, 0.4], smokeT: [4, 2.8, 1.8], sledLoad: [3, 5, 8], mul: [1, 1.5, 2], towerGap: [1.4, 1.0, 0.7], towerRange: [11, 12.5, 14.5],
    wolfHp: 12, wolfDmg: 5, kingHp: 160, kingDmg: 16, waveGap: 80, warn: 20, avaWaves: 3, avaT: 12, retry: 30, bldHp: 100,
    need: { houses: 5, pop: 30, towers: 4, ups: 8, fuel: 50, smoked: 20, stone: 60, coal: 30 },
  };
  const st0 = { fuel: 90, pop: 5, store: { plank: 12, stone: 0, coal: 10, smoked: 0 }, raw: 0, cooked: 0, goal: 0, dis: 0, disT: 0, retryT: 0, arriveT: 6, wave: 0, waveT: 70, done: false, buried: false, tw: 2,
    b: { quarry: 0, mine: 0, wh: 0, grill: 0, smoke: 0, sled: 0, houses: 0 },
    up: { stove: 0, quarry: 0, mine: 0, wh: 0, grill: 0, smoke: 0, sled: 0, t0: 0, t1: 0, t2: 0, t3: 0 }, hire: { quarry: 0, mine: 0, hunter: 0, sled: 0 } };
  const s0 = save.s3 || {};
  const st = save.s3 = Object.assign({}, st0, s0, { store: Object.assign({}, st0.store, s0.store), b: Object.assign({}, st0.b, s0.b), up: Object.assign({}, st0.up, s0.up), hire: Object.assign({}, st0.hire, s0.hire) });

  // ---- 版面（固定地點；以格為單位）：營區 36×32，圍欄 x∈[-18,18]、z∈[-6,26]；北門、南門。
  // 格子以建築為基準：兩個格子左右對稱放兩側，一個格子放正前方；蓋新建築的黃格放在建築自己的位置（驗算見 S.check）
  const RC = { x0: -18, x1: 18, z0: -6, z1: 26 }, GATE_W = 1.8;
  const FIRE = [0, 10];
  const BLD = { quarry: [-12, -1.5, 2.6], mine: [12, -1.5, 2.6], wh: [-8, 7.5, 1.9], smoke: [8, 7.5, 1.5], sled: [-8, 19, 1.6], grill: [0, 17, 1.8], tent: [6, 13.4, 1.3] };
  const HOUSES = [[11, 13.5], [11, 20], [16, 16.7], [-15, 14], [-15, 20], [16, 6], [-16, 6]];
  const TOWERS = [[-4.2, -4.8], [4.2, -4.8], [-16.5, 11], [16.5, 11]];
  const PADP = { quarryL: [-16.3, -1.5], quarryR: [-7.7, -1.5], mineL: [7.7, -1.5], mineR: [16.3, -1.5], whF: [-4.4, 7.5], smokeF: [4.7, 7.5], stoveF: [0, 13.2],
    sledN: [-8, 15.6], sledS: [-8, 22.4], grillL: [-3.5, 17], grillR: [3.5, 17], t0: [-4.2, -1.6], t1: [4.2, -1.6], t2: [-13.8, 11], t3: [13.8, 11] };
  const QUEUE = [[0, 20.2], [0, 21.6], [0, 23]];
  const STAND = { quarry: [-12, 1.6], mine: [12, 1.6] };           // 親手敲石、挖煤站的位置（建築正前方）
  const mat = c => M(c);
  const root = new THREE.Group();
  const bag = [], pads = [], ents = [], workers = [], wolves = [], hares = [], forest = [], queue = [], folks = [], shots = [], circles = [];
  let walk = 0, saveT = 0, inkT = 0, shake = 0, hudTxtT = 0, smokeT = 0, tFlame = 0, axeSpin = 0, hitT = 0, mineHit = 0, rockHit = 0, chopT = 0, grillT = 0, smokeProgT = 0, feedT = 0, depT = 0, whDepT = 0, fireT2 = 0, shownGoal = '', goalFlash = 0, shownAlert = '', hpT = 0, repairT = 0, towerFxT = 0;
  const ell = (m, rx, ry, rz, x, y, z, p = root) => { const o = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), m); o.scale.set(rx, ry, rz); o.position.set(x, y, z); p.add(o); return o; };
  const bx = (w, h, d, m, x, y, z, p = root) => { const o = box(w, h, d, m); o.position.set(x, y, z); p.add(o); return o; };
  let seed = 7; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
  const grp = (x, z, ry = 0) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; root.add(g); return g; };
  const faceFire = (x, z) => Math.atan2(FIRE[0] - x, FIRE[1] - z);
  const C = { rock: 0x8e969f, rockD: 0x6f7882, rockL: 0xb4bcc5, snow: 0xf2f8fc, stone: 0xa7afb8, slate: 0x4b5661, wood: 0x9a6a3c };

  // ---- 地面、北邊的山、圍欄（石牆）、森林 ----
  const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 48), mat(0x86a9c4)); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; root.add(ground);
  { const m = [[-26, 8, -26, 12, 8], [-8, 11, -30, 14, 10], [12, 9, -28, 13, 9], [28, 8, -24, 11, 8], [-40, 6, -12, 10, 7], [42, 7, -14, 10, 7]];   // 北邊岩山（採石場、煤礦靠在山腳）
    m.forEach(([x, h, z, rx, rz], i) => { ell(mat(i % 2 ? C.rock : C.rockD), rx, h, rz, x, 0, z); ell(mat(C.snow), rx * 0.62, h * 0.4, rz * 0.62, x, h * 0.72, z); }); }
  const fenceG = new THREE.Group(); root.add(fenceG);
  { const wm = mat(C.stone), cap = mat(C.snow), seg = (x0, z0, x1, z1) => { const len = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(len / 1.4);
      for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t; const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
        bx(alongX ? 1.4 : 0.55, 1.0, alongX ? 0.55 : 1.4, wm, x, 0.5, z, fenceG); bx(alongX ? 1.4 : 0.6, 0.12, alongX ? 0.6 : 1.4, cap, x, 1.06, z, fenceG); } };
    seg(RC.x0, RC.z0, -GATE_W, RC.z0); seg(GATE_W, RC.z0, RC.x1, RC.z0); seg(RC.x0, RC.z1, -GATE_W, RC.z1); seg(GATE_W, RC.z1, RC.x1, RC.z1); seg(RC.x0, RC.z0, RC.x0, RC.z1); seg(RC.x1, RC.z0, RC.x1, RC.z1);
    [[-GATE_W, RC.z0], [GATE_W, RC.z0], [-GATE_W, RC.z1], [GATE_W, RC.z1]].forEach(([x, z]) => { bx(0.8, 2.0, 0.8, wm, x, 1.0, z, fenceG); bx(1.0, 0.18, 1.0, mat(C.snow), x, 2.05, z, fenceG); }); }   // 門柱
  const inGap = x => Math.abs(x) < GATE_W;
  const onFence = (x, z) => {
    const nearX = Math.min(Math.abs(x - RC.x0), Math.abs(x - RC.x1)) < 0.5 && z > RC.z0 - 0.5 && z < RC.z1 + 0.5;
    const nearZ = Math.min(Math.abs(z - RC.z0), Math.abs(z - RC.z1)) < 0.5 && x > RC.x0 - 0.5 && x < RC.x1 + 0.5;
    if (nearZ && inGap(x)) return false; return nearX || nearZ;
  };
  const inside = (x, z) => x > RC.x0 + 0.4 && x < RC.x1 - 0.4 && z > RC.z0 + 0.4 && z < RC.z1 - 0.4;
  // 森林：南門外兩側（雪橇夫、主角去砍木頭的地方）
  for (let n = 0; n < 160 && forest.length < 30; n++) {
    const side = n % 2 ? 1 : -1, x = side * (7 + rnd() * 14), z = 31 + rnd() * 14;
    if (forest.some(t => Math.hypot(t.x - x, t.z - z) < 2.6)) continue;
    const kind = rnd() < 0.35 ? 'pine' : rnd() < 0.15 ? 'birch' : 'fir', g = new THREE.Group(); g.userData.noInk = true; treeLook(g, kind);
    const sc = 0.85 + rnd() * 0.35; g.position.set(x, 0, z); g.rotation.y = rnd() * 6; g.scale.setScalar(sc); root.add(g);
    forest.push({ g, x, z, hp: CF.treeHp, alive: true, t: 0, shake: 0 });
  }
  // 北邊山腳草地的雪兔（親手或獵人打獵得肉）
  const hareMesh = () => { const g = new THREE.Group(); ell(mat(0xf4f7fa), 0.32, 0.26, 0.45, 0, 0.28, 0, g); ell(mat(0xf4f7fa), 0.2, 0.2, 0.2, 0, 0.5, 0.38, g); [-0.08, 0.08].forEach(x => ell(mat(0xe3e9ef), 0.05, 0.22, 0.05, x, 0.78, 0.36, g)); ell(mat(0x23303d), 0.04, 0.04, 0.04, 0.12, 0.55, 0.52, g); return g; };
  for (let i = 0; i < 6; i++) { const g = hareMesh(); g.userData.noInk = true; root.add(g); const h = { g, x: -14 + i * 5.6, z: -10 - (i % 3) * 3, tx: 0, tz: 0, alive: true, t: Math.random() * 3 }; g.position.set(h.x, 0, h.z); h.tx = h.x; h.tz = h.z; hares.push(h); }

  // ---- 石爐（中央火源，Lv1～3）----
  const stoveG = grp(FIRE[0], FIRE[1]);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; ell(mat(C.stone), 0.42, 0.3, 0.38, Math.sin(a) * 1.25, 0.22, Math.cos(a) * 1.25, stoveG); }
  bx(1.5, 0.9, 1.5, mat(C.rock), 0, 0.5, 0, stoveG); bx(1.1, 0.3, 1.1, mat(C.rockD), 0, 1.05, 0, stoveG);
  const stoveX = new THREE.Group(); stoveG.add(stoveX); bx(0.5, 1.2, 0.5, mat(C.rockD), 0.5, 1.6, -0.5, stoveX);   // Lv2：加高的煙囪
  const stoveFlag = new THREE.Group(); stoveG.add(stoveFlag); bx(0.07, 1.6, 0.07, mats.trunk, -0.6, 1.9, 0.6, stoveFlag); bx(0.7, 0.4, 0.05, mat(0xffd34d), -0.25, 2.5, 0.6, stoveFlag);   // Lv3：金旗
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.2, 7), new THREE.MeshBasicMaterial({ color: 0xff8a1f })); flame.position.y = 1.65; stoveG.add(flame);
  const flame2 = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.75, 7), new THREE.MeshBasicMaterial({ color: 0xffd34d })); flame2.position.y = 1.5; stoveG.add(flame2);
  const warm = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshBasicMaterial({ color: 0xffb060, transparent: true, opacity: 0.12, depthWrite: false })); warm.rotation.x = -Math.PI / 2; warm.position.set(FIRE[0], 0.06, FIRE[1]); root.add(warm);
  const fireLabel = makeLabel(320, 140); fireLabel.scale.set(3.2, 1.4, 1); fireLabel.position.set(FIRE[0], 3.0, FIRE[1]); root.add(fireLabel);

  // ---- 建築（全部先建好、藏起來，蓋了才現身；升級有看得出來的外觀變化，見 applyLooks）----
  const ent = (key, x, z, r, g) => { const e = { key, x, z, r, g, hp: CF.bldHp, max: CF.bldHp, broken: false }; ents.push(e); return e; };
  const wood = mats.wood, trunk = mats.trunk;
  // 🪨 採石場：北邊山壁切開一面岩壁；升級加木階梯、起重架
  const quarryG = grp(BLD.quarry[0], BLD.quarry[1]); quarryG.visible = false;
  ell(mat(C.rockD), 5.8, 4.4, 2.9, 0, 1.6, -2.7, quarryG); ell(mat(C.rock), 3.4, 3.4, 2.2, -3.2, 1.2, -1.9, quarryG); ell(mat(C.rock), 3.0, 3.0, 2.2, 3.4, 1.0, -2.0, quarryG); ell(mat(C.snow), 3.8, 1.1, 2.0, 0, 5.2, -2.8, quarryG);
  bx(6.2, 3.4, 0.6, mat(0xa4aeb9), 0, 1.8, -0.5, quarryG); [0.7, 1.5, 2.3].forEach(y => bx(6.25, 0.08, 0.62, mat(C.rockD), 0, y, -0.5, quarryG));
  [-3.2, 3.2].forEach(x => bx(0.32, 3.4, 0.32, trunk, x, 1.7, -0.2, quarryG)); bx(6.9, 0.3, 0.4, trunk, 0, 3.5, -0.2, quarryG);
  [[2.6, 0.2], [3.2, 0.2], [2.9, 0.55], [-2.8, 0.2], [-3.4, 0.25]].forEach(([x, z], i) => bx(0.55, 0.42, 0.5, mat(i % 2 ? C.rockL : C.stone), x, 0.22, 1.2 + z, quarryG));
  const quarryStairs = new THREE.Group(); quarryG.add(quarryStairs); [0, 1, 2].forEach(i => bx(1.8, 0.35, 0.7, wood, -1.2 + i * 0.1, 0.2 + i * 0.4, 0.3 - i * 0.55, quarryStairs));
  const quarryCrane = new THREE.Group(); quarryG.add(quarryCrane); bx(0.3, 4.4, 0.3, trunk, 2.4, 2.2, 0.4, quarryCrane); bx(3.4, 0.3, 0.3, trunk, 1.0, 4.4, 0.4, quarryCrane); bx(0.1, 1.6, 0.1, mat(0x444b55), -0.5, 3.6, 0.4, quarryCrane); bx(0.6, 0.5, 0.6, mat(C.stone), -0.5, 2.6, 0.4, quarryCrane);
  const quarryEnt = ent('採石場', BLD.quarry[0], BLD.quarry[1], BLD.quarry[2], quarryG);
  // ⛏️ 煤礦＋木軌礦車
  const mineG = grp(BLD.mine[0], BLD.mine[1]); mineG.visible = false;
  ell(mat(0x59626d), 5.8, 4.4, 2.9, 0, 1.6, -2.7, mineG); ell(mat(0x646e79), 3.4, 3.4, 2.2, 3.2, 1.2, -1.9, mineG); ell(mat(0x646e79), 3.0, 3.0, 2.2, -3.4, 1.0, -2.0, mineG); ell(mat(C.snow), 3.8, 1.1, 2.0, 0, 5.2, -2.8, mineG);
  bx(2.4, 2.5, 0.5, mat(0x1b242e), 0, 1.25, -0.55, mineG); [-1.35, 1.35].forEach(x => bx(0.3, 2.7, 0.35, trunk, x, 1.35, -0.2, mineG)); bx(3.2, 0.3, 0.38, trunk, 0, 2.7, -0.2, mineG);
  [-0.55, 0.55].forEach(x => bx(0.14, 0.08, 5.0, mat(0x39414b), x, 0.06, 1.9, mineG)); for (let i = 0; i < 8; i++) bx(1.5, 0.06, 0.2, trunk, 0, 0.04, -0.2 + i * 0.68, mineG);
  const cart1 = new THREE.Group(); mineG.add(cart1); cart1.position.set(0, 0, 1.4); bx(1.3, 0.65, 0.95, wood, 0, 0.55, 0, cart1); ell(mat(0x23272d), 0.55, 0.3, 0.38, 0, 0.95, 0, cart1);
  const cart2 = new THREE.Group(); mineG.add(cart2); cart2.position.set(0, 0, 3.0); bx(1.3, 0.65, 0.95, wood, 0, 0.55, 0, cart2); ell(mat(0x23272d), 0.55, 0.3, 0.38, 0, 0.95, 0, cart2);
  ell(mat(0x23272d), 1.0, 0.55, 0.8, 3.3, 0.3, 1.8, mineG); ell(mat(0x2e343c), 0.7, 0.4, 0.6, 3.9, 0.22, 1.3, mineG);       // 煤堆
  const mineLamp = new THREE.Group(); mineG.add(mineLamp); [-1.35, 1.35].forEach(x => { ell(new THREE.MeshBasicMaterial({ color: 0xffd98a }), 0.18, 0.22, 0.18, x * 1.15, 2.25, 0.1, mineLamp); bx(0.3, 3.4, 0.3, trunk, x * 1.5, 1.7, 0.3, mineLamp); });
  const mineEnt = ent('煤礦', BLD.mine[0], BLD.mine[1], BLD.mine[2], mineG);
  // 雪崩後蓋在採石場、煤礦上的雪堆
  const snowQ = new THREE.Group(); snowQ.position.set(BLD.quarry[0], 0, BLD.quarry[1]); root.add(snowQ); ell(mat(C.snow), 5.2, 3.4, 3.4, 0, 1.2, 0.2, snowQ); ell(mat(0xe3eef7), 3.4, 2.4, 2.6, 1.4, 1.0, 1.6, snowQ); snowQ.visible = false;
  const snowM = new THREE.Group(); snowM.position.set(BLD.mine[0], 0, BLD.mine[1]); root.add(snowM); ell(mat(C.snow), 5.2, 3.4, 3.4, 0, 1.2, 0.2, snowM); ell(mat(0xe3eef7), 3.4, 2.4, 2.6, -1.4, 1.0, 1.6, snowM); snowM.visible = false;
  // 📦 倉庫（石砌，門朝石爐）
  const whG = grp(BLD.wh[0], BLD.wh[1], faceFire(BLD.wh[0], BLD.wh[1])); whG.visible = false;
  bx(3.2, 1.7, 2.4, mat(C.stone), 0, 0.85, 0, whG); [0.45, 0.9, 1.35].forEach(y => bx(3.24, 0.05, 2.44, mat(C.rockD), 0, y, 0, whG));
  { const r = bx(3.6, 0.22, 2.9, mat(C.slate), 0, 1.85, 0, whG); r.rotation.x = -0.12; ell(mat(C.snow), 1.8, 0.28, 1.4, 0, 2.0, -0.05, whG);
    const f = trunk, d = new THREE.Group(); d.position.set(0, 0, 1.2); whG.add(d); [-0.62, 0.62].forEach(x => bx(0.16, 1.45, 0.14, f, x, 0.72, 0.05, d)); bx(1.5, 0.18, 0.16, f, 0, 1.5, 0.05, d); [-0.28, 0.28].forEach(x => bx(0.52, 1.3, 0.08, mat(0x4a3a2a), x, 0.68, 0.03, d)); }
  const whX = new THREE.Group(), whFlag = new THREE.Group(); whG.add(whX, whFlag);
  [[1.95, 0.2, 0.6], [1.95, 0.2, -0.2], [1.95, 0.6, 0.2], [-1.95, 0.2, 0.5], [-1.95, 0.2, -0.3]].forEach(([x, y, z]) => bx(0.55, 0.4, 0.5, wood, x, y, z, whX));
  bx(0.06, 1.2, 0.06, trunk, 0.9, 2.5, -0.5, whFlag); bx(0.6, 0.4, 0.04, mat(0xffd34d), 1.22, 2.9, -0.5, whFlag);
  const whEnt = ent('倉庫', BLD.wh[0], BLD.wh[1], BLD.wh[2], whG);
  // 🍖 烤肉攤（朝南、沒有屋頂，肉才看得到）
  const grillG = grp(BLD.grill[0], BLD.grill[1], 0); grillG.visible = false;
  bx(2.8, 0.95, 1.6, mat(C.stone), 0, 0.48, 0, grillG); [0.3, 0.62].forEach(y => bx(2.84, 0.05, 1.64, mat(C.rockD), 0, y, 0, grillG)); bx(3.0, 0.14, 1.8, wood, 0, 1.0, 0, grillG);
  [-1.3, 1.3].forEach(x => bx(0.16, 1.8, 0.16, trunk, x, 1.9, -0.7, grillG)); bx(2.9, 0.12, 0.14, trunk, 0, 2.75, -0.7, grillG);
  for (let i = 0; i < 4; i++) ell(mat(0xc97a5a), 0.1, 0.34, 0.06, -1.0 + i * 0.66, 2.35, -0.7, grillG);
  const counterMeat = []; for (let i = 0; i < 14; i++) { const j = i % 6; counterMeat.push(ell(mat(0xb5453f), 0.3, 0.1, 0.16, -0.85 + (j % 3) * 0.55 + (j > 2 ? 0.2 : 0), 1.14 + (i / 6 | 0) * 0.17, 0.1 + (j > 2 ? 0.4 : -0.3), grillG)); }
  const grillX = new THREE.Group(), grillFlag = new THREE.Group(); grillG.add(grillX, grillFlag);
  [-1.3, 1.3].forEach(x => ell(new THREE.MeshBasicMaterial({ color: 0xffd98a }), 0.16, 0.2, 0.16, x, 2.15, -0.7, grillX)); bx(2.9, 0.1, 0.12, trunk, 0, 2.1, -0.7, grillX); for (let i = 0; i < 5; i++) ell(mat(0xc97a5a), 0.1, 0.3, 0.06, -1.2 + i * 0.6, 1.8, -0.7, grillX);
  bx(0.06, 1.0, 0.06, trunk, 1.3, 3.2, -0.7, grillFlag); bx(0.55, 0.36, 0.04, mat(0xffd34d), 1.6, 3.55, -0.7, grillFlag);
  const grillEnt = ent('烤肉攤', BLD.grill[0], BLD.grill[1], BLD.grill[2], grillG);
  // 🥓 燻肉坊（朝西，屋頂冒煙，架子上掛肉乾）
  const smokeG = grp(BLD.smoke[0], BLD.smoke[1], faceFire(BLD.smoke[0], BLD.smoke[1])); smokeG.visible = false;
  bx(2.4, 1.6, 2.0, mat(0x6b4a2b), 0, 0.8, 0, smokeG); { const r = bx(2.8, 0.2, 2.5, mat(C.slate), 0, 1.75, 0, smokeG); r.rotation.z = 0.05; } bx(0.5, 1.2, 0.5, mat(C.rockD), 0.7, 2.3, -0.5, smokeG); bx(1.0, 1.1, 0.06, mat(0x2b2118), 0, 0.6, 1.02, smokeG);
  const smokeRack = []; for (let i = 0; i < 6; i++) smokeRack.push(bx(0.16, 0.7, 0.07, mats.jerky || mat(0x6b3a2a), -0.75 + i * 0.3, 1.2, 1.2, smokeG));
  const smokePuffs = []; for (let i = 0; i < 4; i++) smokePuffs.push(ell(new THREE.MeshBasicMaterial({ color: 0xdfe8ee, transparent: true, opacity: 0.5, depthWrite: false }), 0.3, 0.3, 0.3, 0.7, 3, -0.5, smokeG));
  const smokeX = new THREE.Group(); smokeG.add(smokeX); bx(2.4, 0.1, 0.1, trunk, 0, 1.55, 1.3, smokeX); for (let i = 0; i < 6; i++) bx(0.16, 0.6, 0.07, mats.jerky || mat(0x6b3a2a), -0.75 + i * 0.3, 1.2, 1.35, smokeX); bx(0.06, 1.0, 0.06, trunk, -1.1, 2.5, 0.6, smokeX); bx(0.5, 0.34, 0.04, mat(0xffd34d), -0.85, 2.85, 0.6, smokeX);
  const smokeEnt = ent('燻肉坊', BLD.smoke[0], BLD.smoke[1], BLD.smoke[2], smokeG);
  // 🛷 雪橇站（朝東的木棚，棚前停雪橇；升級多雪橇、拉車的狗）
  const sledG = grp(BLD.sled[0], BLD.sled[1], faceFire(BLD.sled[0], BLD.sled[1])); sledG.visible = false;
  [[-1.1, -0.9], [1.1, -0.9], [-1.1, 0.9], [1.1, 0.9]].forEach(([x, z]) => bx(0.2, 1.6, 0.2, trunk, x, 0.8, z, sledG)); { const r = bx(2.9, 0.16, 2.4, wood, 0, 1.7, 0, sledG); r.rotation.x = 0.12; ell(mat(C.snow), 1.4, 0.18, 1.1, 0, 1.9, 0, sledG); }
  const sledMesh = (p, x, z) => { [-0.35, 0.35].forEach(s => bx(0.1, 0.1, 1.9, trunk, x + s, 0.1, z, p)); bx(1.0, 0.1, 1.5, wood, x, 0.22, z, p); bx(0.9, 0.5, 0.8, wood, x, 0.5, z - 0.1, p); };
  bx(2.6, 1.5, 0.14, wood, 0, 0.8, -1.0, sledG); [-1.1, 1.1].forEach(x => bx(0.12, 1.3, 2.0, wood, x, 0.7, 0, sledG)); bx(2.6, 0.12, 0.12, trunk, 0, 1.55, 1.0, sledG);   // 後牆、兩側木板：棚子才不會像桌子
  sledMesh(sledG, 0, 1.9); const sled2 = new THREE.Group(); sledG.add(sled2); sledMesh(sled2, 1.9, 1.9);
  const dogG = new THREE.Group(); sledG.add(dogG); ell(mat(0xb8b0a5), 0.3, 0.25, 0.5, -1.3, 0.45, 3.0, dogG); ell(mat(0xb8b0a5), 0.22, 0.2, 0.22, -1.3, 0.7, 3.45, dogG); ell(mat(0x4a3a2a), 0.06, 0.1, 0.06, -1.4, 0.88, 3.5, dogG); ell(mat(0x4a3a2a), 0.06, 0.1, 0.06, -1.2, 0.88, 3.5, dogG);
  const sledEnt = ent('雪橇站', BLD.sled[0], BLD.sled[1], BLD.sled[2], sledG);
  // 🏕️ 營地帳篷（開場就有，6 張床）
  const tentG = grp(BLD.tent[0], BLD.tent[1], faceFire(BLD.tent[0], BLD.tent[1])); { const c = new THREE.Mesh(new THREE.ConeGeometry(1.9, 2.1, 6), mat(0xb08a5a)); c.position.y = 1.05; tentG.add(c); bx(0.8, 1.2, 0.06, mat(0x2b2118), 0, 0.6, 1.5, tentG); ell(mat(C.snow), 0.9, 0.3, 0.9, 0, 2.0, 0, tentG); }
  // 🏹 弩砲塔 ×4（前 2 座開場就有）
  const towerG = TOWERS.map(([x, z], i) => { const g = grp(x, z, i < 2 ? 0 : faceFire(x, z) + Math.PI); g.visible = false;
    bx(1.6, 2.2, 1.6, wood, 0, 1.1, 0, g); bx(2.0, 0.25, 2.0, trunk, 0, 2.3, 0, g); const bow = new THREE.Group(); bow.position.y = 2.8; g.add(bow); bx(0.15, 0.15, 1.6, trunk, 0, 0, 0.3, bow); bx(1.5, 0.1, 0.1, mat(0x4a3a2a), 0, 0, 0.9, bow);
    const q = new THREE.Group(); g.add(q); bx(0.3, 0.7, 0.3, mat(0x7a5230), 0.8, 2.75, -0.7, q); [-0.07, 0.07].forEach(s => bx(0.04, 0.35, 0.04, mat(0xe8e0d0), 0.8 + s, 3.2, -0.7, q));
    const sg = new THREE.Group(); g.add(sg); bx(1.7, 2.3, 1.7, mat(C.stone), 0, 1.15, 0, sg);
    g.userData.q = q; g.userData.sg = sg; g.userData.bow = bow; g.userData.base = g.children[0];
    ent('弩砲塔' + (i + 1), x, z, 1, g).tower = i; return g; });
  // 🏠 石屋 ×7（KayKit 小屋，門朝石爐）
  const houseG = HOUSES.map(([x, z], i) => { const g = grp(x, z, Math.atan2(x - FIRE[0], z - FIRE[1])); g.visible = false;
    const fb = bx(2.4, 1.5, 2.1, mat(C.stone), 0, 0.75, 0, g), fr = bx(2.8, 0.2, 2.5, mat(C.slate), 0, 1.7, 0, g); fr.rotation.z = 0.0;
    kit('bHomeB', g, 0, 0, 0, Math.PI, 1, m => { kkSoft(m); fb.visible = fr.visible = false; });
    ent('石屋' + (i + 1), x, z, 1.3, g).house = i; return g; });
  const entOf = key => ents.find(e => e.key === key);

  // ---- 背包（揹得動的：木板、石材、煤、生肉；上限 6）與倉庫存量 ----
  const store = st.store, TYPES = { plank: '🪵', stone: '🪨', coal: '⚫', meat: '🍖', cash: '💵' };
  const bagMesh = type => type === 'plank' ? new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.2, 0.36), mats.wood)
    : type === 'stone' ? new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.34, 0.4), mat(C.stone))
    : type === 'coal' ? new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 6), mat(0x23272d))
    : (() => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), mat(0xb5453f)); m.scale.set(1.2, 0.8, 0.9); return m; })();
  const restackBag = () => bag.forEach((b, i) => { b.m.position.set(0, i * 0.3, 0); b.m.rotation.y = 0; });
  const addBag = type => { if (bag.length >= CF.cap) return false; const m = bagMesh(type); stackRoot.add(m); bag.push({ type, m }); restackBag(); return true; };
  const takeBag = type => { const k = bag.findIndex(b => b.type === type); if (k < 0) return false; stackRoot.remove(bag[k].m); bag.splice(k, 1); restackBag(); return true; };
  const bagN = type => bag.filter(b => b.type === type).length;
  const storeCap = () => st.b.wh ? CF.storeCap[st.up.wh] : 40;
  const have = k => k === 'cash' ? save.cash : bagN(k) + store[k];
  const takeRes = k => { if (k === 'cash') { if (save.cash > 0) { save.cash--; return true; } return false; } if (takeBag(k)) return true; if (store[k] > 0) { store[k]--; return true; } return false; };   // 先用揹著的，再用倉庫的
  const beds = () => CF.baseBeds + st.b.houses * CF.houseBeds;
  const upN = () => Object.values(st.up).reduce((a, b) => a + b, 0);
  const towersBuilt = () => st.tw;

  // ---- 付款格：黃＝買（蓋新建築、雇人）、綠大格＝升級；站穩付款，先用揹著的再用倉庫的 ----
  const sparkleAt = (x, z) => { for (let i = 0; i < 6; i++) floatText('✨', x + (i - 2.5) * 0.4, z + (i % 2) * 0.6, '#ffe066'); };
  const mkPad = def => {
    const g = makePad(def.x, def.z, def.up ? 2.6 : 2.2, def.up ? 0x9fe870 : def.hire ? 0x7fc8ff : 0xffd34d, def.icon, true); root.add(g);
    const l = makeLabel(320, 180); l.scale.set(3.2, 1.8, 1); l.position.set(def.x, 1.9, def.z); root.add(l);
    const p = Object.assign({ g, l, paid: {}, t: 0, vis: false }, def); pads.push(p); return p;
  };
  const costSum = c => Object.values(c).reduce((a, b) => a + b, 0);
  const done = (k, n) => st.b[k] = n;
  // 蓋新建築（黃格放在建築自己的位置）
  const BUYS = [
    { id: 'quarry', k: 'quarry', pos: BLD.quarry, icon: '🪨', name: '蓋採石場', cost: { plank: 30 }, show: () => !st.b.quarry, fx: '站在岩壁前自動敲石頭' },
    { id: 'mine', k: 'mine', pos: BLD.mine, icon: '⛏️', name: '開採煤礦', cost: { plank: 40 }, show: () => !st.b.mine && st.b.quarry, fx: '站在坑口自動挖煤，礦車會運出來' },
    { id: 'wh', k: 'wh', pos: BLD.wh, icon: '📦', name: '蓋石砌倉庫', cost: { plank: 20 }, show: () => !st.b.wh && st.b.houses >= 1, fx: '存量加倍、自動補石爐' },
    { id: 'grill', k: 'grill', pos: BLD.grill, icon: '🍖', name: '蓋烤肉攤', cost: { plank: 25 }, show: () => !st.b.grill && st.b.houses >= 1, fx: '肉烤熟引流民，有床就留下' },
    { id: 'smoke', k: 'smoke', pos: BLD.smoke, icon: '🥓', name: '蓋燻肉坊', cost: { plank: 30, stone: 10 }, show: () => !st.b.smoke && st.b.grill, fx: '多的肉燻成肉乾，能久放' },
    { id: 'sled', k: 'sled', pos: BLD.sled, icon: '🛷', name: '蓋雪橇站', cost: { plank: 30, stone: 15 }, show: () => !st.b.sled && st.b.wh, fx: '雪橇夫去山腳運木頭' },
  ];
  BUYS.forEach(d => mkPad({ id: d.id, x: d.pos[0], z: d.pos[1], icon: d.icon, name: () => d.name, cost: () => d.cost, show: () => d.show() && st.dis === 0, fx: () => d.fx, owner: d.k,
    buy: () => { st.b[d.k] = 1; applyLooks(); sparkleAt(d.pos[0], d.pos[1]); sfx.unlock(); toast(d.icon + ' ' + d.name.replace('蓋', '').replace('開採', '') + '蓋好了！'); } }));
  HOUSES.forEach(([x, z], n) => mkPad({ id: 'house' + n, x, z, icon: '🏠', name: () => '蓋石屋 +' + CF.houseBeds + ' 床', cost: () => ({ stone: 10 + 5 * n }), show: () => st.b.quarry && n === st.b.houses && st.dis === 0, fx: () => '每間 6 張床，居民才留得住', owner: 'house' + n,
    buy: () => { st.b.houses = n + 1; applyLooks(); sparkleAt(x, z); sfx.unlock(); toast('🏠 石屋蓋好了！+' + CF.houseBeds + ' 張床'); } }));
  TOWERS.forEach(([x, z], k) => { if (k < 2) return; mkPad({ id: 'tower' + k, x, z, icon: '🏹', name: () => '蓋弩砲塔', cost: () => ({ plank: 20 + 10 * (k - 2), stone: 10 + 10 * (k - 2) }), show: () => st.b.wh && k === st.tw && st.dis === 0, fx: () => '自動射狼和熊', owner: 'tower' + k,
    buy: () => { st.tw = k + 1; applyLooks(); sparkleAt(x, z); sfx.unlock(); toast('🏹 弩砲塔蓋好了！'); } }); });
  // 升級（每項最多 Lv3，要兩次）；錢不用在升級上，用建築材料（企劃 11.3）
  const UPS = [
    { k: 'stove', icon: '🔥', name: '石爐', pos: PADP.stoveF, ok: () => true, cost: [{ stone: 30, coal: 10 }, { stone: 60, coal: 30 }], fx: ['燒得更慢、暖光變大、煙囪加高', '燒得更慢、暖光再大、插金旗'] },
    { k: 'quarry', icon: '🪨', name: '採石場', pos: PADP.quarryR, ok: () => st.b.quarry, cost: [{ plank: 20, stone: 10 }, { plank: 40, stone: 30 }], fx: ['敲石 ×1.5、加木階梯', '敲石 ×2、起重木架'] },
    { k: 'mine', icon: '⛏️', name: '礦車', pos: PADP.mineR, ok: () => st.b.mine, cost: [{ plank: 20, stone: 10 }, { plank: 40, stone: 30 }], fx: ['挖煤 ×1.5、多一台礦車', '挖煤 ×2、坑口加支柱和燈'] },
    { k: 'wh', icon: '📦', name: '倉庫', pos: PADP.whF, ok: () => st.b.wh, cost: [{ stone: 20, plank: 20 }, { stone: 40, plank: 40 }], fx: ['每樣存 160、建築變大加箱子', '每樣存 240、屋頂插金旗'] },
    { k: 'grill', icon: '🍖', name: '烤肉攤', pos: PADP.grillR, ok: () => st.b.grill, cost: [{ plank: 15, stone: 5 }, { plank: 30, stone: 15 }], fx: ['烤更快、櫃台 10 份、掛燈籠', '更快、14 份、流民更勤、插金旗'] },
    { k: 'smoke', icon: '🥓', name: '燻肉坊', pos: PADP.smokeF, ok: () => st.b.smoke, cost: [{ plank: 15, stone: 10 }, { plank: 30, stone: 20 }], fx: ['燻更快、掛兩排肉乾', '更快、掛旗'] },
    { k: 'sled', icon: '🛷', name: '雪橇', pos: PADP.sledN, ok: () => st.b.sled, cost: [{ plank: 20, stone: 5 }, { plank: 35, stone: 15 }], fx: ['每趟載 5、多一台雪橇', '每趟載 8、狗來拉雪橇'] },
    ...[0, 1, 2, 3].map(i => ({ k: 't' + i, icon: '🏹', name: '弩砲塔' + (i + 1), pos: PADP['t' + i], ok: () => st.tw > i, cost: [{ plank: 15, stone: 10 }, { plank: 30, stone: 20 }], fx: ['射速變快、加箭簍', '射程更遠、換石砌塔身'] })),
  ];
  UPS.forEach(u => mkPad({ id: 'up_' + u.k, x: u.pos[0], z: u.pos[1], icon: u.icon, up: true, name: () => u.name + '升級 Lv' + (st.up[u.k] + 2), cost: () => u.cost[st.up[u.k]], show: () => u.ok() && st.up[u.k] < 2 && st.dis === 0 && !isBuried(u.k), fx: () => u.fx[st.up[u.k]], owner: /^t[0-9]$/.test(u.k) ? 'tower' + u.k[1] : u.k,
    buy: () => { st.up[u.k]++; applyLooks(); sparkleAt(u.pos[0], u.pos[1]); sfx.unlock(); toast(u.icon + ' ' + u.name + '升到 Lv' + (st.up[u.k] + 1) + '：' + u.fx[st.up[u.k] - 1]); } }));
  // 雇人（花錢；人數有上限）
  const HIRES = [
    { k: 'quarry', icon: '⛏️', name: '雇採石工', pos: PADP.quarryL, ok: () => st.b.quarry, price: [60, 120], fx: '自動敲石頭送進倉庫' },
    { k: 'mine', icon: '⛏️', name: '雇礦工', pos: PADP.mineL, ok: () => st.b.mine, price: [60, 120], fx: '自動挖煤送進倉庫' },
    { k: 'hunter', icon: '🏹', name: '雇獵人', pos: PADP.grillL, ok: () => st.b.grill, price: [80, 160], fx: '去北邊山腳打雪兔，肉送去烤' },
    { k: 'sled', icon: '🛷', name: '雇雪橇夫', pos: PADP.sledS, ok: () => st.b.sled, price: [50, 100, 150], fx: '去山腳砍樹，木頭運進倉庫' },
  ];
  HIRES.forEach(h => mkPad({ id: 'hire_' + h.k, x: h.pos[0], z: h.pos[1], icon: h.icon, hire: true, name: () => h.name, cost: () => ({ cash: h.price[st.hire[h.k]] }), show: () => h.ok() && st.hire[h.k] < h.price.length && st.dis === 0 && !isBuried(h.k), fx: () => h.fx, owner: h.k === 'hunter' ? 'grill' : h.k,
    buy: () => { st.hire[h.k]++; addWorkers(); sparkleAt(h.pos[0], h.pos[1]); sfx.unlock(); toast('👷 ' + h.name.replace('雇', '') + '來了：' + h.fx); } }));
  // 雪崩後挖開被雪埋的採石場、礦坑
  [['quarry', BLD.quarry, '🪨', '挖開採石場'], ['mine', BLD.mine, '⛏️', '挖開煤礦坑']].forEach(([k, pos, icon, name]) => mkPad({ id: 'dig_' + k, x: pos[0], z: pos[1] + 3.6, icon, name: () => name, cost: () => ({ plank: 20 }), show: () => isBuried(k), fx: () => '把雪鏟開，繼續採', owner: k,
    buy: () => { st['buried_' + k] = false; applyLooks(); sparkleAt(pos[0], pos[1]); sfx.unlock(); toast(icon + ' 挖開了！'); } }));
  const isBuried = k => (k === 'quarry' || k === 'mine') && !!st['buried_' + k];

  // ---- 升級／蓋好之後的外觀 ----
  function applyLooks() {
    quarryG.visible = !!st.b.quarry && !st.buried_quarry; mineG.visible = !!st.b.mine && !st.buried_mine; snowQ.visible = !!st.buried_quarry; snowM.visible = !!st.buried_mine;
    quarryStairs.visible = st.up.quarry >= 1; quarryCrane.visible = st.up.quarry >= 2; cart2.visible = st.up.mine >= 1; mineLamp.visible = st.up.mine >= 2;
    whG.visible = !!st.b.wh; whG.scale.setScalar(1 + 0.12 * st.up.wh); whX.visible = st.up.wh >= 1; whFlag.visible = st.up.wh >= 2;
    grillG.visible = !!st.b.grill; grillG.scale.set(1 + 0.14 * st.up.grill, 1 + 0.05 * st.up.grill, 1 + 0.08 * st.up.grill); grillX.visible = st.up.grill >= 1; grillFlag.visible = st.up.grill >= 2;
    smokeG.visible = !!st.b.smoke; smokeX.visible = st.up.smoke >= 1; smokeRack.forEach((r, i) => r.visible = true);
    sledG.visible = !!st.b.sled; sled2.visible = st.up.sled >= 1; dogG.visible = st.up.sled >= 2;
    tentG.visible = true; towerG.forEach((g, i) => { g.visible = i < st.tw; const lv = st.up['t' + i]; g.scale.setScalar(1 + 0.08 * lv); g.userData.q.visible = lv >= 1; g.userData.sg.visible = lv >= 2; g.userData.base.visible = lv < 2; });
    houseG.forEach((g, i) => { g.visible = i < st.b.houses; });
    stoveX.visible = st.up.stove >= 1; stoveFlag.visible = st.up.stove >= 2; warm.scale.setScalar(5 + 1.6 * st.up.stove);
    axe.scale.setScalar(1.6);
  }

  // ---- 人：居民、流民（南門外排隊吃烤肉）、工人（採石工、礦工、獵人、雪橇夫）；圍欄裡外要走門 ----
  const gatePt = (x, z) => z < RC.z0 ? [0, RC.z0, 0, -1] : [0, RC.z1, 0, 1];
  function walkTo(g, x, z, dt, sp = 2.2) { const dx = x - g.position.x, dz = z - g.position.z, d = Math.hypot(dx, dz); if (d < 0.3) return true; g.position.x += dx / d * sp * dt; g.position.z += dz / d * sp * dt; g.rotation.y = Math.atan2(dx, dz); g.position.y = Math.abs(Math.sin(performance.now() / 90)) * 0.06; return false; }
  function routeTo(g, x, z, dt, sp = 2.2) {
    const p = g.position, pin = inside(p.x, p.z), tin = inside(x, z);
    if (pin === tin) return walkTo(g, x, z, dt, sp);
    const [gx, gz, ox, oz] = pin ? gatePt(x, z) : gatePt(p.x, p.z), inner = [gx - ox * 1.4, gz - oz * 1.4], outer = [gx + ox * 1.4, gz + oz * 1.4], nearGate = Math.hypot(p.x - gx, p.z - gz) < 1.8;
    if (pin) { if (!nearGate && Math.hypot(p.x - inner[0], p.z - inner[1]) > 0.5) walkTo(g, inner[0], inner[1], dt, sp); else walkTo(g, outer[0], outer[1], dt, sp); }
    else { if (!nearGate && Math.hypot(p.x - outer[0], p.z - outer[1]) > 0.5) walkTo(g, outer[0], outer[1], dt, sp); else walkTo(g, inner[0], inner[1], dt, sp); }
    return false;
  }
  function makePerson(n, tint) {
    const g = new THREE.Group(), pal = [0x4a7fb0, 0x8e6b3e, 0xb5453f, 0x5b8a5f];
    const b = box(0.6, 0.75, 0.45, M(tint || pal[n % 4])); b.position.y = 0.6; g.add(b); const h = box(0.45, 0.42, 0.42, mats.skin); h.position.y = 1.2; g.add(h);
    dress(g, [b, h], 1 + (n * 5) % 11); root.add(g); return g;
  }
  const standOff = (k, i) => [STAND[k][0] + (i % 2 ? 1.5 : -1.5) * (1 + (i >> 1) * 0.6), STAND[k][1] + 0.4];
  function addWorkers() {
    for (const k of ['quarry', 'mine', 'hunter', 'sled']) while (workers.filter(w => w.k === k).length < st.hire[k]) {
      const i = workers.filter(w => w.k === k).length, tint = { quarry: 0xc9ced4, mine: 0x2e343c, hunter: 0x5b8a5f, sled: 0x8e6b3e }[k], g = makePerson(workers.length + 3, tint);
      const home = k === 'quarry' || k === 'mine' ? standOff(k, i) : k === 'hunter' ? [BLD.grill[0] + 2.4, BLD.grill[1] + 2.0] : [BLD.sled[0] + 2.6, BLD.sled[1] + 0.5];
      g.position.set(home[0], 0, home[1]);
      const tool = box(0.12, 0.9, 0.12, mats.trunk); tool.position.set(0.42, 1.0, 0.2); tool.rotation.z = -0.4; g.add(tool);
      workers.push({ k, i, g, home, state: 'idle', t: Math.random() * 3, tool });
    }
  }
  const brokenOf = key => { const e = entOf(key); return !!e && e.broken; };
  const alive = () => st.fuel > 0;
  function updateWorkers(dt) {
    for (const w of workers) {
      w.t -= dt; const g = w.g, mul = CF.mul;
      if (w.k === 'quarry' || w.k === 'mine') {
        const on = alive() && st.b[w.k] && !isBuried(w.k) && !brokenOf(w.k === 'quarry' ? '採石場' : '煤礦');
        if (routeTo(g, w.home[0], w.home[1], dt)) { g.rotation.y = 0; g.position.y = on ? Math.abs(Math.sin(performance.now() / 160)) * 0.12 : 0; w.tool.rotation.z = -0.4 + (on ? Math.sin(performance.now() / 120) * 0.7 : 0); }
        if (on) { w.prog = (w.prog || 0) + dt * mul[st.up[w.k]] / 4; if (w.prog >= 1) { w.prog = 0; const key = w.k === 'quarry' ? 'stone' : 'coal'; if (store[key] < storeCap()) { store[key]++; if (Math.random() < 0.3) floatText('+' + TYPES[key], w.home[0], w.home[1], '#cfe6ff'); } } }
      } else if (w.k === 'hunter') {
        if (w.state === 'idle') { if (alive() && st.b.grill && w.t <= 0) { w.state = 'out'; w.target = [6 + w.i * 3, -9.5]; } else routeTo(g, w.home[0], w.home[1], dt); }
        else if (w.state === 'out') { if (routeTo(g, w.target[0], w.target[1], dt, 2.8)) { w.state = 'aim'; w.t = 3; } }
        else if (w.state === 'aim') { g.rotation.y = 3.14; if (w.t <= 0) { const h = hares.find(hh => hh.alive); if (h) { killHare(h); w.got = true; } else w.got = false; w.state = 'back'; } }
        else if (w.state === 'back') { if (routeTo(g, BLD.grill[0] + 0.5, BLD.grill[1] + 2.4, dt, 2.8)) { if (w.got) { st.raw++; floatText('+🍖', BLD.grill[0], BLD.grill[1], '#ffb09c'); } w.state = 'idle'; w.t = 3 + Math.random() * 3; } }
      } else if (w.k === 'sled') {
        if (w.state === 'idle') { if (alive() && st.b.sled && w.t <= 0) { w.state = 'out'; w.target = [-9 + w.i * 8, 30.5]; } else routeTo(g, w.home[0], w.home[1], dt); }
        else if (w.state === 'out') { if (routeTo(g, w.target[0], w.target[1], dt, 2.8)) { w.state = 'chop'; w.t = 4; } }
        else if (w.state === 'chop') { g.position.y = Math.abs(Math.sin(performance.now() / 130)) * 0.1; if (w.t <= 0) w.state = 'back'; }
        else if (w.state === 'back') { if (routeTo(g, BLD.wh[0] + 2.4, BLD.wh[1] + 1.2, dt, 2.8)) { const n = CF.sledLoad[st.up.sled]; store.plank = Math.min(storeCap(), store.plank + n); floatText('+' + n + '🪵', BLD.wh[0], BLD.wh[1], '#ffd9a0'); w.state = 'idle'; w.t = 2 + Math.random() * 2; } }
      }
    }
  }
  function killHare(h) { h.alive = false; h.g.visible = false; h.t = CF.hareRe; }
  function updateHares(dt) {
    for (const h of hares) {
      if (!h.alive) { if ((h.t -= dt) <= 0) { h.alive = true; h.g.visible = true; h.x = -14 + Math.random() * 28; h.z = -9 - Math.random() * 6; h.g.position.set(h.x, 0, h.z); h.tx = h.x; h.tz = h.z; } continue; }
      h.t -= dt; if (h.t <= 0) { h.t = 1.5 + Math.random() * 2.5; h.tx = Math.max(-15, Math.min(15, h.x + (Math.random() - 0.5) * 6)); h.tz = Math.max(-16, Math.min(-8, h.z + (Math.random() - 0.5) * 5)); }
      const dx = h.tx - h.x, dz = h.tz - h.z, d = Math.hypot(dx, dz); if (d > 0.1) { h.x += dx / d * 2.2 * dt; h.z += dz / d * 2.2 * dt; h.g.rotation.y = Math.atan2(dx, dz); } h.g.position.set(h.x, d > 0.1 ? Math.abs(Math.sin(performance.now() / 110)) * 0.25 : 0, h.z);
    }
  }
  function syncFolks() {
    const want = Math.min(st.pop, 12);
    while (folks.length < want) { const g = makePerson(folks.length), a = Math.random() * 6.28, r = 3 + Math.random() * 2; g.position.set(FIRE[0] + Math.sin(a) * r, 0, FIRE[1] + Math.cos(a) * r); folks.push({ g, t: Math.random() * 4, goal: null }); }
  }
  function addCustomer() { const g = makePerson(st.pop + queue.length + 5); g.position.set(0, 0, RC.z1 + 4); queue.push({ g, state: 'walk' }); }
  function updatePeople(dt) {
    for (const f of folks) { f.t -= dt; if (!f.goal || f.t <= 0) { const a = Math.random() * 6.28, r = 2.8 + Math.random() * 2.4; f.goal = [FIRE[0] + Math.sin(a) * r, FIRE[1] + Math.cos(a) * r]; f.t = 4 + Math.random() * 5; } walkTo(f.g, f.goal[0], f.goal[1], dt, 1.2); }
    // 流民：有烤肉（或肉乾）、石爐沒熄，每 14 秒（烤肉攤升到 Lv3 變 9 秒）從南門走來排隊
    if (st.b.grill && (st.cooked > 0 || store.smoked > 0) && st.fuel > 0 && st.dis !== 2 && queue.length < CF.queueMax && (st.arriveT -= dt) <= 0) { st.arriveT = st.up.grill >= 2 ? 9 : CF.arrive; addCustomer(); toast('👣 流民聞到肉香，從南門走過來了'); }
    queue.forEach((c, k) => {
      const g = c.g, q = QUEUE[Math.min(k, QUEUE.length - 1)];
      if (c.state === 'walk') { if (routeTo(g, q[0], q[1], dt)) c.state = 'wait'; }
      else if (c.state === 'wait') { walkTo(g, q[0], q[1], dt); g.rotation.y = Math.PI; if (k === 0 && (st.cooked > 0 || store.smoked > 0) && Math.hypot(g.position.x - QUEUE[0][0], g.position.z - QUEUE[0][1]) < 0.5) { if (st.cooked > 0) st.cooked--; else store.smoked--; c.state = 'eat'; c.t = 1.0; } }
      else if (c.state === 'eat') { g.position.y = 0; if ((c.t -= dt) <= 0) { if (st.pop < beds()) { st.pop++; c.state = 'stay'; toast('🏠 吃飽了，留下來當居民！居民 ' + st.pop + '/' + beds()); } else { save.cash += CF.pay; floatText('+💵' + CF.pay, g.position.x, g.position.z, '#ffd34d'); sfx.coin(); c.state = 'leave'; toast('💵 沒有空床，付了 ' + CF.pay + ' 元走了——蓋石屋才留得住人'); } } }
      else if (c.state === 'leave') { if (routeTo(g, 0, RC.z1 + 6, dt) || g.position.z > RC.z1 + 5) c.state = 'gone'; }
    });
    for (let i = queue.length - 1; i >= 0; i--) { const c = queue[i]; if (c.state === 'stay') { queue.splice(i, 1); folks.push({ g: c.g, t: 0, goal: null }); } else if (c.state === 'gone') { root.remove(c.g); queue.splice(i, 1); } }
  }

  // ---- 狼群、熊王、弩砲塔 ----
  function wolfMesh(king) {
    const g = new THREE.Group(), c = king ? 0xe9edf0 : 0x9aa3ad, d = king ? 0xcfd6dc : 0x6f7882;
    ell(mat(c), 0.5, 0.4, 0.9, 0, 0.7, 0, g); ell(mat(c), 0.32, 0.3, 0.34, 0, 0.95, 0.85, g); ell(mat(d), 0.16, 0.14, 0.2, 0, 0.88, 1.15, g);
    [-0.14, 0.14].forEach(x => { const e = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.28, 4), mat(d)); e.position.set(x, 1.28, 0.8); g.add(e); ell(mat(0xfff0a0), 0.05, 0.05, 0.05, x, 1.0, 1.12, g); });
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.7, 5), mat(c)); t.rotation.x = -1.2; t.position.set(0, 0.85, -0.95); g.add(t);
    [[-0.25, 0.5], [0.25, 0.5], [-0.25, -0.5], [0.25, -0.5]].forEach(([x, z]) => bx(0.14, 0.5, 0.14, mat(d), x, 0.25, z, g));
    if (king) { g.scale.setScalar(2.1); const cr = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.3, 5), mat(0xffd34d)); cr.position.set(0, 1.4, 0.85); g.add(cr); }
    g.userData.noInk = true; root.add(g); return g;
  }
  function spawnWave(n, king) {
    for (let i = 0; i < n + (king ? 1 : 0); i++) {
      const isKing = king && i === 0, side = i % 2 ? 1 : -1, x = side * (22 + Math.random() * 3), z = 2 + Math.random() * 16;
      const g = wolfMesh(isKing); g.position.set(x, 0, z); wolves.push({ g, x, z, hp: isKing ? CF.kingHp : CF.wolfHp, max: isKing ? CF.kingHp : CF.wolfHp, king: isKing, sp: isKing ? 2.6 : 3.4, cd: 0, tgt: null, tt: 0 });
    }
    beep(180, 0.5, 'sawtooth', 0.06, 0.6);
  }
  function hurtHero(d) { hero.hp -= d; hero.hit = 0.4; hitT = 0.3; }
  function updateWolves(dt) {
    for (let i = wolves.length - 1; i >= 0; i--) {
      const w = wolves[i];
      if (w.hp <= 0) { root.remove(w.g); wolves.splice(i, 1); st.raw += w.king ? 3 : 1; floatText('+🍖', w.x, w.z, '#ffb09c'); sfx.coin(); continue; }
      w.tt -= dt; w.cd -= dt;
      if (w.tt <= 0) {
        w.tt = 0.6; let best = null, bd = 1e9;
        const heroD = Math.hypot(player.position.x - w.x, player.position.z - w.z);
        if (heroD < 6) { best = 'hero'; bd = heroD; }
        else for (const e of ents) if (e.g.visible && !e.broken) { const d = Math.hypot(e.x - w.x, e.z - w.z); if (d < bd) { bd = d; best = e; } }
        w.tgt = best;
      }
      const t = w.tgt; if (!t) continue;
      const tx = t === 'hero' ? player.position.x : t.x, tz = t === 'hero' ? player.position.z : t.z, reach = t === 'hero' ? 1.5 : t.r + 1.3 * (w.king ? 2 : 1);
      const dx = tx - w.x, dz = tz - w.z, d = Math.hypot(dx, dz);
      if (d > reach) { w.x += dx / d * w.sp * dt; w.z += dz / d * w.sp * dt; w.g.rotation.y = Math.atan2(dx, dz); w.g.position.set(w.x, Math.abs(Math.sin(performance.now() / 90 + i)) * 0.12, w.z); }
      else if (w.cd <= 0) { w.cd = 1.0; const dmg = w.king ? CF.kingDmg : CF.wolfDmg; if (t === 'hero') hurtHero(dmg); else { t.hp -= dmg * (w.king ? 1.5 : 1); if (t.hp <= 0) { t.hp = 0; t.broken = true; t.g.position.y = -0.5; toast('🔧 ' + t.key + ' 被咬壞了，先停工！'); } } }
    }
  }
  function updateEnts(dt) {
    const anyWolf = wolves.length > 0;
    for (const e of ents) {
      if (anyWolf || e.hp >= e.max) { if (e.broken && false) {} continue; }
      e.hp = Math.min(e.max, e.hp + 3 * dt);
      if (e.broken && e.hp >= 50) { e.broken = false; e.g.position.y = 0; floatText('🔧', e.x, e.z, '#9fe870'); }
    }
  }
  function updateTowers(dt) {
    towerG.forEach((g, i) => {
      if (i >= st.tw) return; const e = ents.find(x => x.tower === i); if (!e || e.broken) return;
      g.userData.cd = (g.userData.cd || 0) - dt; if (g.userData.cd > 0) return;
      const lv = st.up['t' + i], rng = CF.towerRange[lv]; let best = null, bd = rng;
      for (const w of wolves) { const d = Math.hypot(w.x - g.position.x, w.z - g.position.z); if (d < bd) { bd = d; best = w; } }
      if (!best) return; g.userData.cd = CF.towerGap[lv]; best.hp -= 5; g.userData.bow.rotation.y = Math.atan2(best.x - g.position.x, best.z - g.position.z) - g.rotation.y;
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 5), mat(0xe8e0d0)); m.rotation.x = Math.PI / 2; root.add(m); shots.push({ m, x0: g.position.x, y0: 3, z0: g.position.z, x1: best.x, z1: best.z, t: 0 });
    });
    for (let i = shots.length - 1; i >= 0; i--) { const s = shots[i]; s.t += dt / 0.2; const k = Math.min(1, s.t); s.m.position.set(s.x0 + (s.x1 - s.x0) * k, s.y0 - 2 * k, s.z0 + (s.z1 - s.z0) * k); s.m.rotation.y = Math.atan2(s.x1 - s.x0, s.z1 - s.z0); if (k >= 1) { root.remove(s.m); shots.splice(i, 1); } }
  }

  // ---- 目標列（11 步，完成給 10×步數 的獎金）、自給自足條件 ----
  const N = CF.need;
  const GOALS = [
    [() => '🪨 去北邊岩壁前敲石頭、揹木板，用 🪵30 蓋採石場', () => st.b.quarry],
    [() => '🏠 揹石材蓋第 1 間石屋（🪨 10），居民才住得下', () => st.b.houses >= 1],
    [() => '🍖 蓋烤肉攤（🪵 25）；去北邊山腳打雪兔，肉揹到攤子前，居民到 8（' + st.pop + '/8）', () => st.b.grill && st.pop >= 8],
    [() => '⛏️ 蓋煤礦（🪵 40），挖煤丟進石爐，比木頭耐燒', () => st.b.mine],
    [() => '📦 蓋石砌倉庫（🪵 20）：揹包滿了站門口自動存進去', () => st.b.wh],
    [() => '🛷 蓋雪橇站（🪵 30＋🪨 15）、雇第 1 個雪橇夫去山腳運木頭', () => st.b.sled && st.hire.sled >= 1],
    [() => '🏹 雇獵人，居民到 12（' + st.pop + '/12）', () => st.hire.hunter >= 1 && st.pop >= 12],
    [() => '⬆️ 升級任意 3 項（綠色大格）（' + Math.min(3, upN()) + '/3）', () => upN() >= 3],
    [() => '🥓 蓋燻肉坊（🪵 30＋🪨 10），倉庫囤肉乾 ' + N.smoked + '（' + store.smoked + '/' + N.smoked + '）', () => st.b.smoke && store.smoked >= N.smoked],
    [() => '🏹 弩砲塔 4 座（' + st.tw + '/4）、石屋 ' + N.houses + ' 間（' + st.b.houses + '/' + N.houses + '）、居民 ' + N.pop + '（' + st.pop + '/' + N.pop + '）', () => st.tw >= 4 && st.b.houses >= N.houses && st.pop >= N.pop],
    [() => '🪨 倉庫囤石材 ' + N.stone + '（' + store.stone + '）、煤 ' + N.coal + '（' + store.coal + '），升級共 ' + N.ups + ' 次（' + upN() + '）', () => store.stone >= N.stone && store.coal >= N.coal && upN() >= N.ups],
    [() => '🔥 石爐保持 ' + N.fuel + '% 以上（現在 ' + Math.round(st.fuel) + '%），雪崩就會來！', () => false],
  ];
  const lacks = () => [!st.b.quarry && '🪨 採石場', !st.b.mine && '⛏️ 煤礦', !st.b.wh && '📦 倉庫', !st.b.grill && '🍖 烤肉攤', !st.b.smoke && '🥓 燻肉坊', !st.b.sled && '🛷 雪橇站', st.hire.hunter < 1 && '🏹 獵人', st.hire.sled < 1 && '🛷 雪橇夫',
    st.b.houses < N.houses && '🏠 石屋 ' + st.b.houses + '/' + N.houses, st.pop < N.pop && '👥 居民 ' + st.pop + '/' + N.pop, st.tw < N.towers && '🏹 塔 ' + st.tw + '/' + N.towers, upN() < N.ups && '⬆️ 升級 ' + upN() + '/' + N.ups,
    store.stone < N.stone && '🪨 石材 ' + store.stone + '/' + N.stone, store.coal < N.coal && '⚫ 煤 ' + store.coal + '/' + N.coal, store.smoked < N.smoked && '🥓 肉乾 ' + store.smoked + '/' + N.smoked, st.fuel < N.fuel && '🔥 石爐'].filter(Boolean);
  const selfSufficient = () => lacks().length === 0;

  // ---- 介面：直接用第 2 關那套畫面元件（左上錢＋居民、左下揹包＋倉庫、火條＋血條、上方目標＋警示）----
  const setTxt = (id, t) => { const e = $(id); if (e && e.textContent !== '' + t) e.textContent = t; };
  const show = (id, on) => { const e = $(id); if (e) e.style.display = on ? '' : 'none'; };
  function hudText() {
    const f = Math.round(st.fuel);
    while (st.goal < GOALS.length - 1 && GOALS[st.goal][1]()) { const reward = 10 * (st.goal + 1); st.goal++; save.cash += reward; goalFlash = 1.5; toast('🎯 目標完成！獎金 +' + reward + ' 元'); sfx.coin(); }
    goalFlash -= 0.25;
    setTxt('cash', save.cash); setTxt('pop', st.pop); setTxt('capP', '/' + beds()); setTxt('beds', ' 🛏️' + Math.max(0, beds() - st.pop));
    const nW = bagN('plank'), nM = bagN('meat'), nC = bagN('coal'), nS = bagN('stone');
    setTxt('wood', nW); setTxt('meat', nM); setTxt('coal', nC); setTxt('stone', nS); ['capW', 'capM', 'capC', 'capS'].forEach(id => setTxt(id, '/' + CF.cap));
    [['pWood', nW], ['pMeat', nM], ['pCoal', nC], ['pStone', nS]].forEach(([id, n]) => { show(id, n > 0); $(id).classList.toggle('full', bag.length >= CF.cap); }); show('pEmpty', bag.length === 0);
    const any = store.plank + store.stone + store.coal + store.smoked + st.cooked > 0; show('pStore', any);
    setTxt('sPlank', store.plank); setTxt('sNeed', ''); setTxt('sFood', st.cooked); setTxt('sJerky', store.smoked); setTxt('sCoal', store.coal); setTxt('sStone', store.stone);
    show('sJerkyW', store.smoked > 0); show('sCoalW', store.coal > 0); show('sStoneW', store.stone > 0);
    setTxt('fuel', f); setTxt('fireName', '石爐'); $('fuelBar').firstElementChild.style.width = f + '%'; $('fuelBar').classList.toggle('danger', f < 20);
    const hv = Math.ceil(Math.max(0, hero.hp)); setTxt('hp', hv); $('hpBar').firstElementChild.style.width = hv + '%'; $('hpBar').classList.toggle('danger', hv < 35);
    setTxt('ver', '🪨 石器村莊');
    const g = '🎯 ' + GOALS[st.goal][0]();
    if (g !== shownGoal) { $('goal').textContent = g; shownGoal = g; } $('goal').classList.toggle('done', goalFlash > 0);
    let at = '', cls = '';
    if (st.dis === 1) { at = '🏔️ 雪崩 ' + Math.ceil(st.disT) + ' 秒後來襲！物資放進倉庫、人和東西撤到南邊'; cls = 'cold'; }
    else if (st.dis === 2) { at = '🏔️ 雪崩第 ' + st.avaI + '/' + CF.avaWaves + ' 波：躲開紅圈！守住石爐'; cls = 'cold'; }
    else if (st.dis === 3) at = '🏔️ 雪埋住了採石場和煤礦……';
    else if (st.fuel <= 0) at = '🔥 石爐熄了！丟煤或木板進去';
    else if (wolves.length) { at = '🐺 狼群來了（' + wolves.length + '）！弩砲塔和斧頭會打牠們'; cls = 'warn'; }
    else if (!st.done && st.b.grill && st.dis === 0 && st.waveT <= 10) { at = '🐺 狼群 ' + Math.ceil(st.waveT) + ' 秒後從東西兩側來'; cls = 'warn'; }
    else if (st.done) at = '🚧 第 4 關製作中——先把礦坑挖開、把城鎮蓋大吧';
    else if (st.goal >= GOALS.length - 1 && !selfSufficient()) { at = '📋 還缺：' + lacks().join('、'); cls = 'warn'; }
    const key = at + cls; if (key !== shownAlert) { shownAlert = key; $('alert').textContent = at; $('alert').className = cls; $('alert').style.display = at ? 'block' : 'none'; }
    // 格子標籤：最近的一格顯示完整（名稱、花費、說明），其他只顯示小價錢，才不會互相蓋住
    let nearest = null, nd = 6.5; for (const p of pads) if (p.vis) { const d = Math.hypot(player.position.x - p.x, player.position.z - p.z); if (d < nd) { nd = d; nearest = p; } }
    for (const p of pads) {
      p.l.visible = p.vis; if (!p.vis) continue; const c = p.cost(); if (!c) { p.l.visible = false; continue; } const parts = Object.keys(c).map(k => TYPES[k] + ' ' + Math.min(c[k], (p.paid[k] || 0) + have(k)) + '/' + c[k]).join('　');
      if (p === nearest) { p.l.set([p.icon + ' ' + p.name(), parts, p.fx ? p.fx() : ''], '#ffe066', [34, 40, 24]); p.l.scale.set(3.2, 1.8, 1); p.l.position.y = 1.9; }
      else { p.l.set([Object.keys(c).map(k => TYPES[k] + c[k]).join(' ')], '#ffe066', [56]); p.l.scale.set(1.9, 1.05, 1); p.l.position.y = 0.9; }
    }
    fireLabel.set([st.fuel <= 0 ? '🔥 石爐熄了' : '🔥 石爐 Lv' + (st.up.stove + 1) + '　' + f + '%', '丟煤、木板加火'], st.fuel > 40 ? '#ffd34d' : '#ff8a5c', [32, 40]);
  }

  // ---- 每一格 ----
  const dist = (x, z, X, Z) => Math.hypot(x - X, z - Z);
  let intro = null, cine = null;
  function payPads(dt, X, Z) {
    for (const p of pads) {
      p.vis = p.show() && !intro; p.g.visible = p.vis; if (!p.vis) { p.paid = {}; continue; }
      const c = p.cost(), tot = costSum(c); p.g.fill.scale.y = Math.max(0.0001, costSum(p.paid) / tot);
      if (dist(p.x, p.z, X, Z) > 1.5 || (p.t -= dt) > 0) continue; p.t = 0.18;
      for (const k of Object.keys(c)) if ((p.paid[k] || 0) < c[k]) { if (takeRes(k)) { p.paid[k] = (p.paid[k] || 0) + 1; sfx.coin(); } break; }
      if (Object.keys(c).every(k => (p.paid[k] || 0) >= c[k])) { p.paid = {}; p.buy(); writeSave(); }
    }
  }
  function heroActs(dt, X, Z) {
    let tgt = null, kind = null, best = 99;
    for (const w of wolves) { const d = dist(w.x, w.z, X, Z) - (w.king ? 1.0 : 0); if (d < 2.9 && d < best) { best = d; tgt = w; kind = 'wolf'; } }
    if (!tgt && bag.length < CF.cap) {
      for (const h of hares) if (h.alive) { const d = dist(h.x, h.z, X, Z); if (d < 2.3 && d < best) { best = d; tgt = h; kind = 'hare'; } }
      for (const t of forest) if (t.alive) { const d = dist(t.x, t.z, X, Z); if (d < 2.4 && d < best) { best = d; tgt = t; kind = 'tree'; } }
      if (!tgt && st.b.quarry && !isBuried('quarry') && !brokenOf('採石場') && dist(STAND.quarry[0], STAND.quarry[1], X, Z) < 2.4) { tgt = { x: BLD.quarry[0], z: BLD.quarry[1] }; kind = 'rock'; }
      if (!tgt && st.b.mine && !isBuried('mine') && !brokenOf('煤礦') && dist(STAND.mine[0], STAND.mine[1], X, Z) < 2.4) { tgt = { x: BLD.mine[0], z: BLD.mine[1] }; kind = 'coal'; }
    }
    const act = !!tgt; axe.visible = act;
    if (act) {
      axeSpin += dt * 12; axe.position.set(X, 1.2, Z); axeArms.forEach((a, i) => { a.visible = i === 0; a.rotation.y = axeSpin; });
      swooshG.rotation.y = axeSpin - Math.PI / 2 - 2.4; swooshMat.opacity = 0.4; axeHeadMat.color.setHex((axeKK ? AXE_TINT : AXE_COLORS)[0]);
      player.rotation.y = Math.atan2(tgt.x - X, tgt.z - Z);
      if ((chopT -= dt) <= 0) {
        chopT = 0.45; sfx.chop(); try { burstChips(tgt.x, tgt.z); } catch (e) {}
        if (kind === 'wolf') tgt.hp -= 6;
        else if (kind === 'hare') { killHare(tgt); addBag('meat'); floatText('+🍖', tgt.x, tgt.z, '#ffb09c'); }
        else if (kind === 'tree') { tgt.hp--; tgt.shake = 0.25; if (tgt.hp <= 0) { tgt.alive = false; tgt.g.visible = false; tgt.t = CF.treeRe; let n = 0; for (let i = 0; i < CF.treeLogs; i++) if (addBag('plank')) n++; floatText('+🪵×' + n, tgt.x, tgt.z, '#ffd9a0'); } }
        else if (kind === 'rock') { if (++rockHit >= 3) { rockHit = 0; if (addBag('stone')) floatText('+🪨', tgt.x, tgt.z + 2, '#cfe6ff'); } }
        else if (kind === 'coal') { if (++mineHit >= 3) { mineHit = 0; if (addBag('coal')) floatText('+⚫', tgt.x, tgt.z + 2, '#aab4c0'); } }
      }
    } else { swooshMat.opacity = 0; chopT = Math.min(chopT, 0.2); }
    for (const t of forest) { if (!t.alive) { if ((t.t -= dt) <= 0) { t.alive = true; t.hp = CF.treeHp; t.g.visible = true; } } else if (t.shake > 0) { t.shake -= dt; t.g.rotation.z = Math.sin(t.shake * 60) * 0.08; } else t.g.rotation.z = 0; }
  }
  function economy(dt, X, Z) {
    // 石爐：丟煤、木板加火（手上有）；倉庫蓋好後自動補
    if (dist(X, Z, FIRE[0], FIRE[1]) < 2.4 && st.fuel < 99 && (fireT2 -= dt) <= 0) { fireT2 = 0.18; if (takeBag('coal')) { st.fuel = Math.min(100, st.fuel + CF.coalFuel); sfx.coin(); } else if (takeBag('plank')) { st.fuel = Math.min(100, st.fuel + CF.plankFuel); sfx.coin(); } }
    if (st.b.wh && st.fuel < 70 && store.coal > 0 && (feedT -= dt) <= 0) { feedT = 1.5; store.coal--; st.fuel = Math.min(100, st.fuel + CF.coalFuel); floatText('📦→🔥', FIRE[0] + 1, FIRE[1], '#ffd34d'); }
    // 倉庫門口：揹包的木板、石材、煤自動存進去
    const wr = whG.rotation.y, wzx = BLD.wh[0] + Math.sin(wr) * 2.6, wzz = BLD.wh[1] + Math.cos(wr) * 2.6;
    if (st.b.wh && dist(X, Z, wzx, wzz) < 3.2 && (whDepT -= dt) <= 0) { const t = ['plank', 'stone', 'coal'].find(k => bagN(k) > 0 && store[k] < storeCap()); if (t) { whDepT = 0.12; takeBag(t); store[t]++; sfx.coin(); } }
    // 烤肉攤前：生肉交給攤子
    if (st.b.grill && dist(X, Z, BLD.grill[0], BLD.grill[1] + 2.6) < 3.0 && bagN('meat') > 0 && (depT -= dt) <= 0) { depT = 0.15; takeBag('meat'); st.raw++; sfx.coin(); }
    // 烤肉、燻肉
    const gOn = st.b.grill && alive() && !brokenOf('烤肉攤'), gl = st.up.grill;
    if (gOn && st.raw > 0 && st.cooked < CF.grillMax[gl]) { if ((grillT += dt) >= CF.grillT[gl]) { grillT = 0; st.raw--; st.cooked++; } } else grillT = 0;
    if (gOn && st.b.smoke && alive() && !brokenOf('燻肉坊') && st.raw > 0 && st.cooked >= CF.grillMax[gl] && store.smoked < storeCap()) { if ((smokeProgT += dt / CF.smokeT[st.up.smoke]) >= 1) { smokeProgT = 0; st.raw--; store.smoked++; floatText('+🥓', BLD.smoke[0], BLD.smoke[1], '#ffb09c'); } }
    counterMeat.forEach((m, i) => m.visible = st.b.grill && i < st.cooked);
    smokePuffs.forEach((s, i) => { const k = (smokeT * 0.5 + i / 4) % 1; s.position.y = 2.6 + k * 1.8; s.scale.setScalar(0.25 + k * 0.4); s.material.opacity = (st.b.smoke && alive() ? 0.5 : 0) * (1 - k); });
    smokeT += dt;
  }
  // 狼群：石爐沒熄、烤肉攤蓋好後，每 80 秒一群（3→5→7 隻），東西兩側衝進來
  function waves(dt) {
    if (st.done || st.dis !== 0 || !st.b.grill || wolves.length) return;
    if ((st.waveT -= dt) <= 0) { const n = 3 + 2 * Math.min(st.wave, 2); st.wave++; st.waveT = CF.waveGap; spawnWave(n, false); toast('🐺 狼群來了！弩砲塔、斧頭都能打牠們'); }
  }
  // 大雪崩：自給自足 → 預告 20 秒 → 3 波落雪紅圈（北半邊先、往南逼近；第 2 波熊王從東側來）→ 採石場、煤礦被埋 → 劇情卡
  const circleMat = new THREE.MeshBasicMaterial({ color: 0xff3b2e, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide });
  function disaster(dt) {
    if (st.done) return;
    if (st.dis === 0) { if ((st.retryT -= dt) <= 0 && st.goal >= GOALS.length - 1 && selfSufficient() && !wolves.length) { st.dis = 1; st.disT = CF.warn; toast('🏔️ 山上傳來轟隆聲！雪崩要來了'); beep(150, 0.7, 'sawtooth', 0.07, 0.6); } }
    else if (st.dis === 1) { shake = Math.max(shake, 0.04); if ((st.disT -= dt) <= 0) { st.dis = 2; st.avaI = 1; st.avaT = CF.avaT; st.avaN = 0; st.avaNext = 0; toast('🏔️ 雪崩第 1 波！看地上的紅圈'); } }
    else if (st.dis === 2) {
      st.avaT -= dt; st.avaNext -= dt;
      if (st.avaN < 6 && st.avaNext <= 0) { st.avaNext = 1.4; st.avaN++; const zc = -3 + (st.avaI - 1) * 6.5 + Math.random() * 7, m = new THREE.Mesh(new THREE.CircleGeometry(3.4, 28), circleMat); m.rotation.x = -Math.PI / 2; m.position.set((Math.random() * 2 - 1) * 15, 0.1, zc); root.add(m); circles.push({ m, t: 2.2, x: m.position.x, z: zc }); }
      if (st.avaT <= 0 && !circles.length) {
        if (st.avaI >= CF.avaWaves) { st.dis = 3; st.disT = 4; st.buried_quarry = !!st.b.quarry; st.buried_mine = !!st.b.mine; applyLooks(); beep(110, 1.0, 'sawtooth', 0.08, 0.5); toast('🏔️ 雪埋住了採石場和煤礦！'); }
        else { st.avaI++; st.avaT = CF.avaT; st.avaN = 0; st.avaNext = 1; toast('🏔️ 雪崩第 ' + st.avaI + ' 波！'); if (st.avaI === 2) { spawnWave(0, true); toast('🐻 熊王從東邊來了！'); } }
      }
      if (st.fuel <= 0) { st.dis = 0; st.retryT = CF.retry; circles.splice(0).forEach(c => root.remove(c.m)); toast('🔥 石爐熄了…山上的雪停了，晚點再來'); }
    }
    else if (st.dis === 3) { shake = 0.1; if ((st.disT -= dt) <= 0) finish(); }
    for (let i = circles.length - 1; i >= 0; i--) {
      const c = circles[i]; c.t -= dt; c.m.material.opacity = 0.25 + 0.2 * Math.abs(Math.sin(c.t * 7));
      if (c.t <= 0) { slam(c.x, c.z); root.remove(c.m); circles.splice(i, 1); }
    }
    for (let i = mounds.length - 1; i >= 0; i--) { const o = mounds[i]; o.t -= dt; o.m.scale.y = Math.min(1, (6 - o.t) * 3) * 1.1; if (o.t <= 0) { root.remove(o.m); mounds.splice(i, 1); } }
  }
  const mounds = [];
  function slam(x, z) {
    shake = Math.max(shake, 0.12); sfx.chop();
    const m = ell(mat(C.snow), 3.2, 1, 3.2, x, 0, z); m.userData.noInk = true; mounds.push({ m, t: 6 });
    for (const e of ents) if (e.g.visible && !e.broken && dist(e.x, e.z, x, z) < 3.4 + e.r) { e.hp -= 45; if (e.hp <= 0) { e.hp = 0; e.broken = true; e.g.position.y = -0.5; } }
    if (dist(player.position.x, player.position.z, x, z) < 3.4) { hurtHero(18); const lose = bag.splice(Math.ceil(bag.length / 2)); lose.forEach(b => stackRoot.remove(b.m)); restackBag(); if (lose.length) toast('🏔️ 被雪砸到，掉了 ' + lose.length + ' 個東西'); }
  }
  function finish() {
    st.dis = 0; st.done = true; writeSave();
    story('🏔️ 大雪崩！', ['山上的積雪整片滑下來，採石場和煤礦坑都被埋住了。', '長老望著南邊說：「山腳下的河谷有黏土，可以燒磚。」', '下一站（第 4 關）還在準備，先把礦坑挖開、把石屋蓋滿，等路通了再出發。'], '繼續');
  }

  // ---- 開場動畫（跟第 2 關開場同一套）：白畫面淡入、上下黑邊，先生起石爐、再把營地一樣樣蓋起來 ----
  function startIntro() {
    delete save.arrive; writeSave();
    const items = [stoveG, tentG, ...towerG.slice(0, 2), fenceG].map((g, i) => ({ g, s: g.scale.y, sx: g.scale.x, at: 1.4 + i * 1.3, done: false }));
    items.forEach(o => o.g.scale.set(o.sx, 0.001, o.sx));
    pads.forEach(p => { p.g.visible = false; p.l.visible = false; });   // 蓋營地時格子先藏起來
    const el = document.createElement('div'); el.style.cssText = 'position:fixed;inset:0;z-index:99;pointer-events:none';
    el.innerHTML = '<div style="position:absolute;left:0;right:0;top:0;height:14%;background:#000"></div><div style="position:absolute;left:0;right:0;bottom:0;height:14%;background:#000"></div><div style="position:absolute;left:0;right:0;bottom:4%;text-align:center;color:#fff;font:700 19px sans-serif;text-shadow:0 2px 6px #000;padding:0 16px"></div><div style="position:absolute;inset:0;background:#fff;opacity:1"></div>';
    document.body.appendChild(el); intro = { t: 0, items, el, txt: el.children[2], fade: el.children[3], end: 1.4 + items.length * 1.3 + 1.2 };
  }
  function introStep(dt) {
    const k = intro; k.t += dt; const t = k.t; k.fade.style.opacity = Math.max(0, 1 - t / 1.2);
    k.items.forEach(o => { const q = (t - o.at) / 0.9; if (q <= 0) return; const e = Math.min(1, q), c1 = 1.70158, back = 1 + (c1 + 1) * Math.pow(e - 1, 3) + c1 * Math.pow(e - 1, 2); o.g.scale.set(o.sx, Math.max(0.001, o.s * back), o.sx); });
    const n = k.items.filter(o => t >= o.at).length;
    k.txt.textContent = t < 1.4 ? '北邊的岩山腳，新的營地。' : n <= 1 ? '先生起石爐……' : n < k.items.length ? '搭起帳篷、弩砲塔、石牆……' : '準備好了！';
    camera.position.lerp(tmp.copy(new THREE.Vector3(0, 0.8, 8)).add(camOffset), 1 - Math.exp(-dt * 2)); camera.lookAt(0, 0.8, 8);
    if (t > k.end) { k.items.forEach(o => o.g.scale.set(o.sx, o.s, o.sx)); k.el.remove(); intro = null; }
  }

  function step(dt) {
    undeclutter();
    if (intro) { introStep(dt); hudTxtT = 0; return; }
    const px = player.position.x, pz = player.position.z;
    // 移動（跟第 1、2 關一樣：搖桿／WASD）；石牆只有南北兩個門過得去，不穿建築和石爐
    let ix = joy.x, iy = joy.y;
    if (keys.KeyA || keys.ArrowLeft) ix -= 1; if (keys.KeyD || keys.ArrowRight) ix += 1;
    if (keys.KeyW || keys.ArrowUp) iy -= 1; if (keys.KeyS || keys.ArrowDown) iy += 1;
    if (camMode.on) ix = iy = 0;
    const il = Math.hypot(ix, iy); if (il > 1) { ix /= il; iy /= il; }
    const mx = right.x * ix + fwd.x * -iy, mz = right.y * ix + fwd.y * -iy, moving = Math.hypot(mx, mz) > 0.05;
    if (moving) {
      if (hintOn) { hintOn = false; $('hint').style.display = 'none'; }
      let nx = px + mx * CFG.speed * dt, nz = pz + mz * CFG.speed * dt;
      nx = Math.max(-30, Math.min(30, nx)); nz = Math.max(-20, Math.min(52, nz));
      if (onFence(nx, nz)) { if (!onFence(nx, pz)) nz = pz; else if (!onFence(px, nz)) nx = px; else { nx = px; nz = pz; } }
      for (const e of ents) if (e.g.visible && e.key !== '採石場' && e.key !== '煤礦') { const d = Math.hypot(nx - e.x, nz - e.z), rr = e.r + 0.4; if (d < rr && d > 0) { nx = e.x + (nx - e.x) / d * rr; nz = e.z + (nz - e.z) / d * rr; } }
      for (const [k, b] of [['quarry', BLD.quarry], ['mine', BLD.mine]]) if (st.b[k] && !st['buried_' + k]) { if (Math.abs(nx - b[0]) < 4.6 && nz < b[1] + 1.8) { nz = Math.max(nz, b[1] + 1.8); } }   // 山壁：只能站在岩壁前
      if (st.b.grill) { if (Math.abs(nx - BLD.grill[0]) < 1.9 && Math.abs(nz - BLD.grill[1]) < 1.2) { nx = px; nz = pz; } }
      if (Math.hypot(nx - BLD.tent[0], nz - BLD.tent[1]) < 1.7) { const d = Math.hypot(nx - BLD.tent[0], nz - BLD.tent[1]); nx = BLD.tent[0] + (nx - BLD.tent[0]) / d * 1.7; nz = BLD.tent[1] + (nz - BLD.tent[1]) / d * 1.7; }
      const df = Math.hypot(nx - FIRE[0], nz - FIRE[1]); if (df < 1.6 && df > 0) { nx = FIRE[0] + (nx - FIRE[0]) / df * 1.6; nz = FIRE[1] + (nz - FIRE[1]) / df * 1.6; }
      for (const t of forest) if (t.alive) { const d = Math.hypot(nx - t.x, nz - t.z); if (d < 0.7 && d > 0) { nx = t.x + (nx - t.x) / d * 0.7; nz = t.z + (nz - t.z) / d * 0.7; } }
      player.position.x = nx; player.position.z = nz; player.rotation.y = Math.atan2(mx, mz); walk += dt * 12;
    }
    player.tick(walk, moving); updateMixers(dt);
    const X = player.position.x, Z = player.position.z;
    // 石爐：燒煤；雪崩時燒得快；爐越高級燒越慢
    st.fuel = Math.max(0, st.fuel - CF.burn * [1, 0.8, 0.65][st.up.stove] * (st.dis === 2 ? 1.5 : 1) * dt);
    const fp = st.fuel / 100; flame.visible = flame2.visible = st.fuel > 0; flame.scale.set(0.6 + fp * 0.6, 0.4 + fp * 0.9 + Math.sin(tFlame += dt * 18) * 0.06, 0.6 + fp * 0.6); flame2.scale.copy(flame.scale);
    warm.visible = st.fuel > 0;
    heroActs(dt, X, Z); economy(dt, X, Z); payPads(dt, X, Z);
    updatePeople(dt); updateWorkers(dt); updateHares(dt); updateWolves(dt); updateEnts(dt); updateTowers(dt); waves(dt); disaster(dt);
    // 被打：閃紅、血量歸零回營地掉一半揹包；在石爐旁慢慢回血
    if (hero.hit > 0) hero.hit -= dt; player.flash.forEach(mt => mt.emissive && mt.emissive.setHex(hero.hit > 0 ? 0x661111 : 0));
    if (!wolves.length && dist(X, Z, FIRE[0], FIRE[1]) < 7) hero.hp = Math.min(CFG.playerHp, hero.hp + CFG.heal * dt);
    if (hero.hp <= 0) { const lose = bag.splice(Math.ceil(bag.length / 2)); lose.forEach(b => stackRoot.remove(b.m)); restackBag(); player.position.set(0, 0, 12); hero.hp = CFG.playerHp; toast(lose.length ? '被打倒了！掉了 ' + lose.length + ' 個東西' : '被打倒了！'); beep(140, 0.5, 'sawtooth', 0.07, 0.5); }
    // 鏡頭
    if (shake > 0) shake = Math.max(0, shake - dt * 0.1);
    camera.position.lerp(tmp.copy(player.position).add(camOffset), 1 - Math.exp(-dt * 6));
    if (shake > 0) { camera.position.x += (Math.random() - 0.5) * shake; camera.position.y += (Math.random() - 0.5) * shake * 0.6; }
    camera.lookAt(player.position.x, 0.8, player.position.z);
    sunC.copy(player.position).applyMatrix4(sunInv); sunC.x = Math.round(sunC.x / SUN_TEX) * SUN_TEX; sunC.y = Math.round(sunC.y / SUN_TEX) * SUN_TEX; sunC.applyMatrix4(sunRot);
    sun.target.position.copy(sunC); sun.position.set(sunC.x - 10, sunC.y + 20, sunC.z + 8);
    for (let i = 0; i < snowN; i++) { snowPos[i * 3 + 1] -= dt * (st.dis === 2 ? 4 : 1.5); if (snowPos[i * 3 + 1] < 0) { snowPos[i * 3 + 1] = 18; snowPos[i * 3] = X + rand(-25, 25); snowPos[i * 3 + 2] = Z + rand(-25, 25); } }
    snowGeo.attributes.position.needsUpdate = true;
    for (let i = flies.length - 1; i >= 0; i--) { const f = flies[i]; f.t += dt; const k = Math.min(1, f.t / f.dur), to = f.toFn(); f.mesh.position.lerpVectors(f.from, to, k); f.mesh.position.y += Math.sin(k * Math.PI) * f.arc; if (f.spin !== false) f.mesh.rotation.y += dt * 8; if (k >= 1) { flies.splice(i, 1); f.onDone && f.onDone(); } }
    for (let i = chips.length - 1; i >= 0; i--) { const c = chips[i]; c.life -= dt; c.vy -= 18 * dt; c.m.position.x += c.vx * dt; c.m.position.y = Math.max(0.08, c.m.position.y + c.vy * dt); c.m.position.z += c.vz * dt; c.m.rotation.x += dt * 10; c.m.scale.setScalar(Math.max(0.01, c.life / 0.6)); if (c.life <= 0) { scene.remove(c.m); chips.splice(i, 1); } }
    if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').style.opacity = 0; }
    if ((inkT -= dt) <= 0) { inkT = 0.5; inkAll(scene); }
    if ((hudTxtT -= dt) <= 0) { hudTxtT = 0.25; hudText(); }
    if ((saveT += dt) > 2) { saveT = 0; writeSave(); }
    hudT = 0; declutter();
  }

  // ---- 最小間距檢查（給 layout-check 用）：規則跟第 1、2 關一樣——格子互隔 ≥3、離建築邊緣 ≥1.5（離石爐 ≥1.8）、建築互隔 ≥半徑和＋0.4；中軸線不擋、排隊位置離東西 ≥2.2 ----
  const idOf = e => e.house != null ? 'house' + e.house : e.tower != null ? 'tower' + e.tower : { 採石場: 'quarry', 煤礦: 'mine', 倉庫: 'wh', 烤肉攤: 'grill', 燻肉坊: 'smoke', 雪橇站: 'sled' }[e.key];
  S.check = () => {
    const out = [], d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    const bld = [{ id: 'stove', n: '石爐', x: FIRE[0], z: FIRE[1], r: 1.4 }, { id: 'tent', n: '營地帳篷', x: BLD.tent[0], z: BLD.tent[1], r: BLD.tent[2] }, ...ents.map(e => ({ id: idOf(e), n: e.key, x: e.x, z: e.z, r: e.r }))];
    for (let i = 0; i < bld.length; i++) for (let j = i + 1; j < bld.length; j++) { const a = bld[i], b = bld[j], dd = d([a.x, a.z], [b.x, b.z]); if (dd < a.r + b.r + 0.4 && !(/^house/.test(a.id) && /^house/.test(b.id) && dd >= 4.6)) out.push('第3關建築太近：' + a.n + ' 和 ' + b.n + '（' + dd.toFixed(1) + '）'); }
    const buyId = new Set(['quarry', 'mine', 'wh', 'grill', 'smoke', 'sled', 'house0', 'house1', 'house2', 'house3', 'house4', 'house5', 'house6', 'tower2', 'tower3'].map(k => 'buy:' + k));
    const P = pads.map(p => ({ n: p.id, x: p.x, z: p.z, o: p.owner, buy: /^(quarry|mine|wh|grill|smoke|sled|house\d|tower[23])$/.test(p.id) || p.id.startsWith('house') || p.id.startsWith('tower') || p.id.startsWith('dig_') }));
    for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) { const a = P[i], b = P[j], dd = d([a.x, a.z], [b.x, b.z]); if (dd < 3.0 && !(a.o === b.o && (a.buy || b.buy))) out.push('第3關格子太近：' + a.n + ' 和 ' + b.n + '（' + dd.toFixed(1) + '）'); }
    for (const p of P) for (const b of bld) { if (p.o === b.id) continue; const dd = d([p.x, p.z], [b.x, b.z]); if (dd < b.r + (b.id === 'stove' ? 1.8 : 1.5)) out.push('第3關格子離建築太近：' + p.n + ' 和 ' + b.n + '（' + dd.toFixed(1) + '）'); }
    QUEUE.forEach(q => { bld.forEach(b => { if (b.id !== 'grill' && d(q, [b.x, b.z]) < b.r + 0.8) out.push('第3關排隊位置太靠近：' + b.n); }); P.forEach(p => { if (d(q, [p.x, p.z]) < 2.2) out.push('第3關排隊位置太靠近：' + p.n); }); });
    bld.forEach(b => { if (b.id !== 'stove' && b.id !== 'grill' && Math.abs(b.x) - b.r < GATE_W && b.z > RC.z0 && b.z < RC.z1) out.push('第3關建築擋中軸：' + b.n); });
    P.forEach(p => { if (Math.abs(p.x) < GATE_W && p.z > RC.z0 && p.z < 9) out.push('第3關格子擋北門路：' + p.n); });
    return out;
  };
  S.spots = [[0, 12], [-8, 3.9], [8, 11], [-12, 1.8], [12, 1.8], [-16.3, -1.5], [16.3, -1.5], [0, 13.2], [-3.5, 17], [3.5, 17], [-8, 15.6], [-8, 22.4], [4.7, 7.5], [-4.4, 7.5], [-4.2, -1.6], [4.2, -1.6], [-13.8, 11], [13.8, 11], [11, 13.5], [16, 6], [-15, 14], [0, 21.6]];
  S.state = st; S.step = step; S.pads = pads; S.ents = ents; S.bag = bag; S.wolves = wolves; S.workers = workers; S.store = store; S.GOALS = GOALS; S.CF = CF; S.beds = beds; S.upN = upN; S.hudText = hudText; S.lacks = lacks; S.spawnWave = spawnWave; S.applyLooks = applyLooks; S.addWorkers = addWorkers; S.addBag = addBag; S.selfSufficient = selfSufficient; S.addCustomer = addCustomer; S.syncFolks = syncFolks; S.finish = finish; S.queue = queue; S.circles = circles; S.hares = hares;
  S.enter = () => {
    S.on = true; undeclutter(); save.level = 0; save.territory = 0; resize();   // 第 3 關鏡頭跟第 1 關一樣的基準（不吃第 2 關的城市／領地等級加成）
    scene.children.slice().forEach(o => { if (!(o.isLight || o === player || o.isPoints || o === sun.target)) o.visible = false; });
    scene.add(root); root.visible = true; root.add(axe);
    ['planBtn', 'pCoal'].forEach(id => { const e = $(id); if (e && id === 'planBtn') e.style.display = 'none'; });
    $('pStore').innerHTML = '📦 🪵<b id="sPlank">0</b><span class="cap" id="sNeed"></span><span id="sFoodW" style="display:none">🍖<b id="sFood">0</b></span><span id="sJerkyW"> 🥓<b id="sJerky">0</b></span><span id="sCoalW"> ⚫<b id="sCoal">0</b></span><span id="sStoneW"> 🪨<b id="sStone">0</b></span>'; $('pStore').classList.add('tight');
    applyLooks(); addWorkers(); syncFolks();
    player.position.set(0, 0, 14); player.rotation.y = Math.PI; camera.position.copy(player.position).add(camOffset);
    hintOn = false; $('hint').style.display = 'none';
    if (scene.fog) { scene.fog.near = 90; scene.fog.far = 240; }
    if (save.arrive) startIntro();
    hudText();
  };
  return S;
})();
window.__game && (window.__game.stage3 = stage3);
if (save.stage === 3) stage3.enter();
