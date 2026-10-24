'use strict';
// ===== 第 1 關：冰湖營地（v1.16 做、v1.17 改版、v1.18 烤魚攤；設計見 docs/第1關設計.md）=====
// 新玩家從這裡開始；舊存檔、layout-check 的存檔直接當第 2 關（config.js 的 save.stage）。
// 做法：整個第 2 關的世界照常建好，進第 1 關時把場景裡的東西都藏起來，只留燈光、主角、雪；第 1 關自己的東西放在 root 底下。
// v1.18（作者 10/24 確認設計）：火光不吸引流民了——自己去北邊冰洞釣魚 → 揹到「送魚格」→ 烤魚攤把生魚烤熟放櫃台 →
//   南門外每 12 秒走來一位流民排隊吃烤魚：有空床留下當居民、沒床付 💵5 走人。冰屋放大（圓頂半徑 2.4、高 2.2）、營區放大重新排版。
// 流程：自給自足（暫時：烤魚攤＋3 間冰屋＋6 人＋火 50%）→ 冰湖崩裂預告 → 守住火堆 45 秒 → 遷徙去第 2 關。（雇漁民、冰窖、寒潮等在 v1.19～v1.22）
const stage1 = (() => {
  const S = { on: false };
  const CFG1 = { cap: 4, igloo: 5, bedPer: 2, maxIgloo: 4, burn: 0.4, burnDis: 4.0, stormTwig: 6, whBrick: 12, whWood: 10, whCap: 40, whPop: 3, needLogs: 15, twigFuel: 14, logFuel: 25, digT: 0.6, bankHp: 4, bankBricks: 2, bankRe: 20, fishT: 3.0, twigRe: 8, twigReDis: 4,
    axePrice: 8, treeHp: 3, treeLogs: 3, treeRe: 45, stallWood: 6, stallBrick: 4, grillT: 0.8, counterMax: 6, arrive: 12, queueMax: 3, pay: 5,
    need: { igloos: 3, pop: 6, fuel: 50 }, warn: 15, dis: 45, retry: 30 };
  const st = save.s1 = Object.assign({ fuel: 55, raw: 0, cooked: 0, bricks: 0, igloos: 0, pop: 0, stall: false, dis: 0, disT: 0, retryT: 0, arriveT: 4, axe: false, done: false, wh: false, logs: 0, fishS: 0, goal: 0, up: { wh: 0, stall: 0, axe: 0, rod: 0 } }, save.s1);
  st.up = Object.assign({ wh: 0, stall: 0, axe: 0, rod: 0 }, st.up);
  const upN = () => st.up.wh + st.up.stall + st.up.axe + st.up.rod;
  const cMax = () => [6, 10, 14][st.up.stall], grillTime = () => [0.8, 0.5, 0.35][st.up.stall], arriveGap = () => [12, 12, 8][st.up.stall];
  const fishTime = () => [3.0, 2.0, 1.2][st.up.rod], chopGap = () => [0.45, 0.3, 0.2][st.up.axe], logsPer = () => [3, 4, 5][st.up.axe];
  const root = new THREE.Group();
  const RC = { x0: -15, x1: 15, z0: -3, z1: 24 };                           // 圍欄矩形
  const GATE_W = 1.8, GATE_Z = 8.5;                                         // 門寬的一半；東西門的 z
  // v1.27（作者：建物不能太近、不能互相遮擋，烤魚攤位置太怪，升級格也要照第 2 關的邏輯）：
  // 每棟建築有自己的一塊「地」：建築蓋在地上、操作格（付款／送魚）在建築旁、升級格貼著自己的建築；格子彼此 ≥3、離建築邊緣 ≥1.5（跟第 2 關 PAD_GAP／PAD_BLD 一樣）；
  // 冰屋的蓋屋格直接放在下一間冰屋的位置（像第 2 關民房格），蓋好就搬到下一個位置
  const FIRE = [0, 8.5], PAD = [-10.5, 0.5], AXEPAD = [0, 11.7], STALL = [0, 15.6], RAWPAD = [-3.5, 15.6], WHUP = [0, 4.7], STALLUP = [3.5, 15.6], FISHUP = [5.2, -10.5], LAKE = [0, -13, 7.5];
  const SLOTS = [[-10.5, 0.5], [10.5, 0.5], [-10.5, 16.0], [10.5, 16.0]];
  const BANKS = [];       // v1.20（作者：不能鏟的雪從營區拿掉、能鏟的集中成一座大雪堆）：南門外一座大雪堆，十幾個雪堆擠在一起
  const HILL = [0, 37];
  for (let j = -2; j <= 2; j++) for (let x = -7.4 + (j & 1 ? 1.35 : 0); x <= 7.5; x += 2.7) { if ((x / 7.8) ** 2 + (j * 2.5 / 5.6) ** 2 <= 1) BANKS.push([+(HILL[0] + x).toFixed(1), +(HILL[1] + j * 2.5).toFixed(1)]); }
  const WH = [0, 1.0], TWIGS = [-0.5, 3, 6, 11.5, 14.5, 18, 21.5].flatMap(z => [[-17.5, z], [17.5, z]]);   // v1.24：枯枝 4→10 堆
  const HOLES = [[0, -10.5]];                                                // 湖中間一個挖出來的大洞（半徑 1.7），旁邊插三根釣竿，人走近就自動釣魚
  const HOLE_R = 1.7;
  const QUEUE = [[0, 18.8], [0, 20.2], [0, 21.6]];     // 烤魚攤前排隊的位置（往南門方向排）
  const mat = c => M(c);
  const bag = [], banks = [], twigs = [], holes = [], igloos = [], folks = [], forest = [], queue = [];
  let walk = 0, saveT = 0, inkT = 0, shake = 0, hudTxtT = 0, fireT = 0, fireT2 = 0, padT = 0, digT = 0, chopT = 0, axeSpin = 0, shovT = 0, shovelOn = false, grillT = 0, depT = 0, stallPadT = 0, smokeT = 0;
  const ell = (m, rx, ry, rz, x, y, z, p = root) => { const o = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), m); o.scale.set(rx, ry, rz); o.position.set(x, y, z); p.add(o); return o; };
  let seed = 11; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;   // 固定亂數：每次森林長一樣
  const stallPaid = { w: 0, b: 0 };

  // ---- 場景 ----
  const ground = new THREE.Mesh(new THREE.CircleGeometry(44, 48), mat(0x6f9dbd)); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; root.add(ground);
  const lakeBed = new THREE.Mesh(new THREE.CircleGeometry(LAKE[2], 40), mat(0x2b78ab)); lakeBed.rotation.x = -Math.PI / 2; lakeBed.position.set(LAKE[0], 0.02, LAKE[1]); root.add(lakeBed);   // v1.20（作者：北面湖面太白刺眼）：湖底深藍、上面一層半透明冰、冰底下有魚在游
  const lakeFish = []; for (let i = 0; i < 9; i++) { const f = fishMesh(0x163f63); f.scale.setScalar(1.7); f.position.y = 0.05; root.add(f); const a = i * 0.7, r = 3.2 + (i % 3) * 1.4; f.position.set(LAKE[0] + Math.cos(a) * r, 0.05, LAKE[1] + Math.sin(a) * r); lakeFish.push({ f, h: Math.random() * 6.28, t: Math.random() * 3, turn: 0, sp: 0.7 + (i % 4) * 0.2 }); }
  const lakeMat = new THREE.MeshToonMaterial({ color: 0xa6dcf4, gradientMap: TOON, transparent: true, opacity: 0.5, depthWrite: false });
  const lake = new THREE.Mesh(new THREE.CircleGeometry(LAKE[2], 40), lakeMat); lake.rotation.x = -Math.PI / 2; lake.position.set(LAKE[0], 0.09, LAKE[1]); root.add(lake);
  const rim = new THREE.Mesh(new THREE.RingGeometry(LAKE[2], LAKE[2] + 0.8, 40), mat(0x9ecde6)); rim.rotation.x = -Math.PI / 2; rim.position.set(LAKE[0], 0.025, LAKE[1]); root.add(rim);
  const cracks = new THREE.Group(); cracks.visible = false; root.add(cracks);
  for (let i = 0; i < 9; i++) {                                           // 崩裂時浮現的裂縫：從湖心往外的白色折線
    const a = i / 9 * Math.PI * 2 + 0.3, len = 5.5 + (i % 3) * 0.9, c = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, len), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    c.position.set(LAKE[0] + Math.sin(a) * len / 2, 0.05, LAKE[1] + Math.cos(a) * len / 2); c.rotation.y = a; c.userData.k = i / 9; cracks.add(c);
  }
  // 圍欄：柱子每 1.05 一根、兩條橫木；四個門的位置留空
  const inGap = (t, c) => Math.abs(t - c) < GATE_W;
  const fenceG = new THREE.Group(); root.add(fenceG);
  const post = (x, z) => { const p = box(0.22, 0.9, 0.22, mats.wood); p.position.set(x, 0.45, z); fenceG.add(p); };
  const rail = (x, z, len, alongX) => [0.35, 0.7].forEach(y => { const r = box(alongX ? len : 0.1, 0.1, alongX ? 0.1 : len, mats.trunk); r.position.set(x, y, z); fenceG.add(r); });
  for (let x = RC.x0; x <= RC.x1 + 0.01; x += 1.05) [RC.z0, RC.z1].forEach(z => { if (!inGap(x, 0)) post(x, z); });
  for (let z = RC.z0; z <= RC.z1 + 0.01; z += 1.05) [RC.x0, RC.x1].forEach(x => { if (!inGap(z, GATE_Z)) post(x, z); });
  [RC.z0, RC.z1].forEach(z => { const a = RC.x0, b = -GATE_W, c = GATE_W, d = RC.x1; rail((a + b) / 2, z, b - a, true); rail((c + d) / 2, z, d - c, true); });
  [RC.x0, RC.x1].forEach(x => { const a = RC.z0, b = GATE_Z - GATE_W, c = GATE_Z + GATE_W, d = RC.z1; rail(x, (a + b) / 2, b - a, false); rail(x, (c + d) / 2, d - c, false); });
  const onFence = (x, z) => {                                               // 點在圍欄線上（門口除外）＝被擋住
    const nearX = Math.min(Math.abs(x - RC.x0), Math.abs(x - RC.x1)) < 0.35 && z > RC.z0 - 0.35 && z < RC.z1 + 0.35;
    const nearZ = Math.min(Math.abs(z - RC.z0), Math.abs(z - RC.z1)) < 0.35 && x > RC.x0 - 0.35 && x < RC.x1 + 0.35;
    if (nearZ && inGap(x, 0)) return false; if (nearX && inGap(z, GATE_Z)) return false;
    return nearX || nearZ;
  };
  const inside = (x, z) => x > RC.x0 + 0.3 && x < RC.x1 - 0.3 && z > RC.z0 + 0.3 && z < RC.z1 - 0.3;
  // 森林：東西兩邊，樹都是第 2 關同一批（冷杉、松樹、白樺）
  for (let n = 0; n < 180 && forest.length < 44; n++) {
    const side = n % 2 ? 1 : -1, x = side * (20 + rnd() * 10), z = -8 + rnd() * 32;
    if (TWIGS.some(t => Math.hypot(t[0] - x, t[1] - z) < 2.6) || BANKS.some(t => Math.hypot(t[0] - x, t[1] - z) < 2.8) || (Math.abs(z - GATE_Z) < 2.6 && Math.abs(x) < 20) || forest.some(t => Math.hypot(t.x - x, t.z - z) < 2.2)) continue;
    const kind = rnd() < 0.35 ? 'pine' : rnd() < 0.15 ? 'birch' : 'fir', g = new THREE.Group(); g.userData.noInk = true; treeLook(g, kind);
    const sc = 0.85 + rnd() * 0.35; g.position.set(x, 0, z); g.rotation.y = rnd() * 6; g.scale.setScalar(sc); root.add(g);
    forest.push({ g, x, z, sc, hp: CFG1.treeHp, alive: true, t: 0, shake: 0 });
  }
  ell(mat(0x95b7d4), 8.8, 2.3, 6.4, HILL[0], 0.1, HILL[1], root);                  // 大雪堆的底：一座寬寬的雪山，上面擠著可以挖的雪堆
  // 火堆：一圈石頭＋火焰；暖光圈
  const fireG = new THREE.Group(); fireG.position.set(FIRE[0], 0, FIRE[1]); root.add(fireG);
  for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; ell(mat(0x8a929c), 0.38, 0.28, 0.34, Math.sin(a) * 0.95, 0.2, Math.cos(a) * 0.95, fireG); }
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.3, 7), new THREE.MeshBasicMaterial({ color: 0xff8a1f })); flame.position.y = 0.8; fireG.add(flame);
  const flame2 = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.8, 7), new THREE.MeshBasicMaterial({ color: 0xffd34d })); flame2.position.y = 0.65; fireG.add(flame2);
  [[0.25, 0.1, 0.1, 0.5], [-0.3, 0.1, 0.2, -0.4], [0.05, 0.1, -0.3, 1.6]].forEach(([x, y, z, ry]) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.0, 6), mat(0x6b4a2b)); l.rotation.z = Math.PI / 2; l.rotation.y = ry; l.position.set(x, y + 0.1, z); fireG.add(l); });
  const warm = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshBasicMaterial({ color: 0xffd88a, transparent: true, opacity: 0.28, depthWrite: false })); warm.rotation.x = -Math.PI / 2; warm.position.set(FIRE[0], 0.03, FIRE[1]); root.add(warm);
  const fireLabel = makeLabel(); fireLabel.scale.set(3, 1.5, 1); fireLabel.position.set(FIRE[0], 2.6, FIRE[1]); root.add(fireLabel);
  // 雪堆（鏟子自動挖）、枯枝、冰洞
  BANKS.forEach(([x, z]) => { const g = new THREE.Group(); g.position.set(x, 0, z); root.add(g); ell(mat(0xaecbe3), 1.2, 0.62, 1.15, 0, 0.25, 0, g); ell(mat(0xa3c1da), 0.65, 0.4, 0.6, 0.6, 0.15, 0.5, g); ell(mat(0xbad3e8), 0.5, 0.3, 0.45, -0.5, 0.45, -0.1, g); banks.push({ x, z, g, hp: CFG1.bankHp, alive: true, t: 0 }); });
  TWIGS.forEach(([x, z]) => { const g = new THREE.Group(); g.position.set(x, 0, z); root.add(g);
    [0.3, 1.5, 2.6].forEach((ry, i) => { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.1, 6), mat(0x7a5230)); s.rotation.z = Math.PI / 2; s.rotation.y = ry; s.position.set(0, 0.12 + i * 0.1, 0); g.add(s); });
    twigs.push({ x, z, g, t: 0, alive: true }); });
  HOLES.forEach(([x, z]) => {
    const h = new THREE.Mesh(new THREE.CircleGeometry(HOLE_R, 28), mat(0x123f66)); h.rotation.x = -Math.PI / 2; h.position.set(x, 0.12, z); root.add(h);
    const r = new THREE.Mesh(new THREE.RingGeometry(HOLE_R, HOLE_R + 0.55, 28), mat(0xe6f6fd)); r.rotation.x = -Math.PI / 2; r.position.set(x, 0.125, z); root.add(r);
    const ripple = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 28), new THREE.MeshBasicMaterial({ color: 0xcfeaff, transparent: true, opacity: 0.6, depthWrite: false })); ripple.rotation.x = -Math.PI / 2; ripple.position.set(x, 0.14, z); root.add(ripple);
    const rods = [-1.35, -0.9, -0.45, 0, 0.45, 0.9, 1.35].map((a, i) => {                                // 三根釣竿插在洞南邊：竿尾插地、竿身斜向洞口、線和紅白浮標垂進洞裡
      const bx = x + Math.sin(a) * (HOLE_R + 1.35), bz = z + Math.cos(a) * (HOLE_R + 1.35), ang = Math.atan2(x - bx, z - bz);
      const g = new THREE.Group(); g.position.set(bx, 0, bz); g.rotation.y = ang; root.add(g);
      const pole = new THREE.Group(); pole.position.y = 0.35; pole.rotation.x = -1.0; g.add(pole);
      const rp = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.04, 2.2, 6), mat(0x7a4a2a)); rp.rotation.x = Math.PI / 2; rp.position.z = 1.1; pole.add(rp);
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.5, 8), mat(0xc96a28)); grip.rotation.x = Math.PI / 2; grip.position.z = 0.0; pole.add(grip);
      const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 10), mat(0xd9d2c0)); reel.rotation.z = Math.PI / 2; reel.position.set(0.12, -0.08, 0.3); pole.add(reel);
      const tip = new THREE.Object3D(); tip.position.z = 2.2; pole.add(tip);
      ell(mat(0x8a929c), 0.3, 0.2, 0.3, 0, 0.1, -0.2, g);
      const bob = new THREE.Group(); root.add(bob); ell(mat(0xe8453c), 0.17, 0.17, 0.17, 0, 0.1, 0, bob); ell(mat(0xffffff), 0.17, 0.1, 0.17, 0, -0.03, 0, bob);
      const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
      return { g, pole, tip, bob, geo, ox: x + Math.sin(a) * 0.7, oz: z + 0.2 };
    });
    holes.push({ x, z, prog: 0, h, ripple, rods });
  });
  // 付款格：蓋冰屋、做斧頭、蓋烤魚攤、送魚
  const mkPad = (p, color, icon, size = 2.6) => { const g = makePad(p[0], p[1], size, color, icon, true); root.add(g); g.userData.paid = 0; const l = makeLabel(320, 180); l.scale.set(3.2, 1.8, 1); l.position.set(p[0], 1.9, p[1]); root.add(l); return [g, l]; };
  const [pad, padLabel] = mkPad(PAD, 0xffd34d, '🧊'), [axePad, axeLabel] = mkPad(AXEPAD, 0x35d36a, '🪓'), [stallPad, stallLabel] = mkPad(STALL, 0xffd34d, '🍢'), [rawPad, rawLabel] = mkPad(RAWPAD, 0x4fb3e8, '🐟', 2.4), [whPad, whLabel] = mkPad(WH, 0xffd34d, '📦'), [whUpPad, whUpLabel] = mkPad(WHUP, 0x9fe870, '📦'), [stallUpPad, stallUpLabel] = mkPad(STALLUP, 0x9fe870, '🍢'), [fishUpPad, fishUpLabel] = mkPad(FISHUP, 0x9fe870, '🎣');
  const UPS = [   // 升級格：key／圖示／名稱／格子／標籤／蓋好了才出現／每級要 [木頭, 冰磚]／效果說明
    { k: 'wh', icon: '📦', name: '冰窖', pad: whUpPad, lab: whUpLabel, pos: WHUP, ok: () => st.wh, cost: [[10, 8], [20, 16]], fx: ['每樣存量 +40', '每樣存量再 +40'] },
    { k: 'stall', icon: '🍢', name: '烤魚攤', pad: stallUpPad, lab: stallUpLabel, pos: STALLUP, ok: () => st.stall, cost: [[8, 6], [16, 12]], fx: ['烤更快、櫃台 10 份', '烤更快、櫃台 14 份、流民來更勤'] },
    { k: 'axe', icon: '🪓', name: '斧頭', pad: axePad, lab: axeLabel, pos: AXEPAD, ok: () => st.axe, cost: [[12, 0], [24, 0]], fx: ['砍更快、一棵 4 塊', '砍更快、一棵 5 塊'] },
    { k: 'rod', icon: '🎣', name: '釣竿', pad: fishUpPad, lab: fishUpLabel, pos: FISHUP, ok: () => st.stall, cost: [[8, 4], [16, 8]], fx: ['釣更快（2 秒）', '釣更快（1.2 秒）'] },
  ];
  UPS.forEach(u => { u.paid = { w: 0, b: 0 }; });
  const whPaid = { w: 0, b: 0 }, whCap = () => CFG1.whCap * (1 + st.up.wh);
  const price = () => CFG1.igloo + st.igloos;
  const placePad = () => { const p = SLOTS[Math.min(st.igloos, CFG1.maxIgloo - 1)]; PAD[0] = p[0]; PAD[1] = p[1]; pad.position.x = p[0]; pad.position.z = p[1]; padLabel.position.x = p[0]; padLabel.position.z = p[1]; };
  let tFish = 0; const tipV = new THREE.Vector3();

  // 冰屋（v1.18 放大：圓頂半徑 2.4、高 2.2，門洞 1.1 寬 1.5 高，主角站得進去）
  const IG = { rx: 2.4, ry: 2.1, hit: 3.0 };
  function buildIgloo(i, pop = true) {
    const [x, z] = SLOTS[i], g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = Math.atan2(FIRE[0] - x, FIRE[1] - z); root.add(g);
    // v1.20（作者：冰屋要一塊一塊冰磚、像網路上的冰屋）：圓頂用幾圈半透明冰藍色磚塊疊成（InstancedMesh：一間冰屋一次畫完），
    // 每圈磚比上一圈錯開半塊、顏色深淺不一；門口留洞、接一條磚砌的短隧道；裡面一顆深藍內核透出來
    ell(mat(0x3f86b8), IG.rx * 0.9, IG.ry * 0.9, IG.rx * 0.9, 0, 0, 0, g);
    const ROWS = 9, bricks = [];
    for (let r = 0; r < ROWS; r++) {
      const phi = (r + 0.5) / ROWS * (Math.PI / 2), R = IG.rx * Math.cos(phi), n = Math.max(5, Math.round(2 * Math.PI * R / 1.0)), h = IG.ry * (Math.PI / 2 / ROWS) * 1.18;
      for (let k = 0; k < n; k++) {
        const th = (k + (r % 2) * 0.5) / n * Math.PI * 2;
        if (Math.abs(Math.atan2(Math.sin(th), Math.cos(th)) - 0) < 0.42 && IG.ry * Math.sin(phi) < 1.5) continue;     // 門口（+z 方向）留洞
        bricks.push([IG.rx * Math.cos(phi) * Math.sin(th), IG.ry * Math.sin(phi), IG.rx * Math.cos(phi) * Math.cos(th), 2 * Math.PI * R / n * 0.97, h, 0.55, phi, th]);
      }
    }
    const tn = 5, tr = 0.95;                                                    // 隧道：5 圈、每圈 8 塊，往 +z 伸出去
    for (let r = 0; r < tn; r++) for (let k = 0; k < 8; k++) {
      const th = k / 8 * Math.PI + (r % 2) * Math.PI / 16, y = 0.3 + Math.sin(th) * 0.95, xx = Math.cos(th) * tr;
      if (Math.sin(th) < 0.0 && false) continue;
      bricks.push([xx, y, 2.3 + r * 0.42, 0.62, 0.55, 0.42, 'tn', th]);
    }
    const geo = new THREE.BoxGeometry(1, 1, 1), im = new THREE.InstancedMesh(geo, new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: TOON, transparent: true, opacity: 0.84, depthWrite: false }), bricks.length), d = new THREE.Object3D(), c = new THREE.Color();
    bricks.forEach((br, i) => {
      d.position.set(br[0], br[1], br[2]);
      if (br[6] === 'tn') d.rotation.set(0, 0, br[7] - Math.PI / 2); else { d.lookAt(d.position.x * 2, d.position.y * 1.2 + 0.2, d.position.z * 2); }
      d.scale.set(br[3], br[4], br[5]); d.updateMatrix(); im.setMatrixAt(i, d.matrix);
      c.setHex(0x9bd1ee).offsetHSL(0, (i * 7 % 5) * 0.012, ((i * 13) % 7 - 3) * 0.018); im.setColorAt(i, c);
    });
    im.userData.noInk = true; g.add(im);
    const door = new THREE.Mesh(new THREE.CircleGeometry(0.7, 16), mat(0x23364a)); door.position.set(0, 0.5, 2.15); g.add(door);
    igloos.push({ g, x, z, smoke: [] });
    if (pop) { sfx.unlock(); sparkleAt(x, z); }
  }
  function sparkleAt(x, z) { for (let i = 0; i < 6; i++) floatText('✨', x + (i - 2.5) * 0.4, z + (i % 2) * 0.6, '#ffe066'); }
  // 烤魚攤：冰磚矮牆＋木架烤魚＋斜屋頂；櫃台上放烤好的魚（最多 6 條）；朝東（櫃台那面對著排隊的人）
  const stallG = new THREE.Group(); stallG.position.set(STALL[0], 0, STALL[1]); stallG.rotation.y = 0; stallG.visible = false; root.add(stallG);
  { const base = box(2.8, 0.95, 1.6, mat(0xeaf5fb)); base.position.y = 0.48; stallG.add(base);
    [0.3, 0.62].forEach(y => { const l = box(2.84, 0.05, 1.64, mat(0xbcd8e6)); l.position.y = y; stallG.add(l); });
    const top = box(3.0, 0.14, 1.8, mats.wood); top.position.y = 1.0; stallG.add(top);
    [-1.3, 1.3].forEach(x => { const p = box(0.16, 1.8, 0.16, mats.trunk); p.position.set(x, 1.9, -0.7); stallG.add(p); });
    const beam = box(2.9, 0.12, 0.14, mats.trunk); beam.position.set(0, 2.75, -0.7); stallG.add(beam);
    for (let i = 0; i < 4; i++) { const f = ell(mat(0xb8c9d4), 0.1, 0.34, 0.06, -1.0 + i * 0.66, 2.35, -0.7, stallG); f.userData.hang = i; }
  }
  // 冰窖（第 1 關的倉庫）：半埋在雪裡的冰磚大屋、木頭斜屋頂、門口堆魚箱；門朝南（朝火堆）
  const whG = new THREE.Group(); whG.position.set(WH[0], 0, WH[1]); whG.visible = false; root.add(whG);
  { const base = box(3.2, 1.7, 2.4, mat(0xcfe6f2)); base.position.y = 0.85; whG.add(base);
    [0.45, 0.9, 1.35].forEach(y => { const l = box(3.24, 0.05, 2.44, mat(0x9fc4da)); l.position.y = y; whG.add(l); });
    const roof = box(3.6, 0.22, 2.9, mats.wood); roof.position.set(0, 1.85, 0); roof.rotation.x = -0.12; whG.add(roof);
    ell(mat(0xf4fafd), 1.9, 0.3, 1.5, 0, 1.98, -0.05, whG);
    const door = box(1.0, 1.2, 0.06, mats.trunk); door.position.set(0, 0.6, 1.22); whG.add(door);
    [[-1.2, 1.6], [-0.55, 1.7]].forEach(([x, z]) => { const c = box(0.5, 0.4, 0.4, mats.wood); c.position.set(x, 0.2, z); whG.add(c); }); }
  const whX = new THREE.Group(), whFlag = new THREE.Group(); whG.add(whX, whFlag);                       // 升級外觀：Lv2 多一堆箱子桶子、Lv3 屋頂插金旗
  [[1.95, 0.2, 0.6], [1.95, 0.2, -0.2], [1.95, 0.6, 0.2], [-1.95, 0.2, 0.5], [-1.95, 0.2, -0.3]].forEach(([x, y, z]) => { const c = box(0.55, 0.4, 0.5, mats.wood); c.position.set(x, y, z); whX.add(c); });
  { const pole = box(0.06, 1.2, 0.06, mats.trunk); pole.position.set(0.9, 2.5, -0.5); whFlag.add(pole); const fl = box(0.6, 0.4, 0.04, mat(0xffd34d)); fl.position.set(1.22, 2.9, -0.5); whFlag.add(fl); }
  const stX = new THREE.Group(), stFlag = new THREE.Group(); stallG.add(stX, stFlag);                      // Lv2 兩盞暖光燈籠＋第二排魚架、Lv3 攤子變寬＋金旗
  [-1.3, 1.3].forEach(x => { const l = ell(new THREE.MeshBasicMaterial({ color: 0xffd98a }), 0.16, 0.2, 0.16, x, 2.15, -0.7, stX); });
  { const b2 = box(2.9, 0.1, 0.12, mats.trunk); b2.position.set(0, 2.1, -0.7); stX.add(b2); for (let i = 0; i < 5; i++) ell(mat(0xb8c9d4), 0.1, 0.3, 0.06, -1.2 + i * 0.6, 1.8, -0.7, stX); }
  { const pole = box(0.06, 1.0, 0.06, mats.trunk); pole.position.set(1.3, 3.2, -0.7); stFlag.add(pole); const fl = box(0.55, 0.36, 0.04, mat(0xffd34d)); fl.position.set(1.6, 3.55, -0.7); stFlag.add(fl); }
  function applyLooks() {
    whG.scale.setScalar(1 + 0.12 * st.up.wh); whX.visible = st.up.wh >= 1; whFlag.visible = st.up.wh >= 2;
    stallG.scale.set(1 + 0.14 * st.up.stall, 1 + 0.05 * st.up.stall, 1 + 0.08 * st.up.stall); stX.visible = st.up.stall >= 1; stFlag.visible = st.up.stall >= 2;
    axe.scale.setScalar(1.6 * (1 + 0.25 * st.up.axe));
  }
  const counterFish = []; for (let i = 0; i < 14; i++) { const j = i % 6, f = ell(mat(0xf08a3c), 0.3, 0.1, 0.14, -0.85 + (j % 3) * 0.55 + (j > 2 ? 0.2 : 0), 1.14 + (i / 6 | 0) * 0.17, 0.1 + (j > 2 ? 0.4 : -0.3), stallG); f.rotation.y = i; counterFish.push(f); }
  const smoke = []; for (let i = 0; i < 3; i++) { const s = ell(new THREE.MeshBasicMaterial({ color: 0xdfe8ee, transparent: true, opacity: 0.5, depthWrite: false }), 0.3, 0.3, 0.3, 0, 2, -0.6, stallG); smoke.push(s); }

  // ---- 背包 ----
  function fishMesh(col = 0x8fb7d4) {                                                      // 魚：藍銀色橢圓身體、三角尾巴、背鰭、小眼睛
    const g = new THREE.Group(), body = mat(col);
    ell(body, 0.42, 0.15, 0.17, 0, 0, 0, g); ell(mat(0xe8f4fa), 0.36, 0.08, 0.15, 0, -0.07, 0, g);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.3, 4), body); tail.rotation.z = -Math.PI / 2; tail.position.x = -0.5; g.add(tail);
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 4), mat(0x5f8fb0)); fin.position.set(0.02, 0.2, 0); g.add(fin);
    ell(mat(0x1d2a38), 0.03, 0.03, 0.03, 0.3, 0.05, 0.14, g); ell(mat(0x1d2a38), 0.03, 0.03, 0.03, 0.3, 0.05, -0.14, g); return g;
  }
  const bagMesh = type => type === 'brick' ? new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.3, 0.42), mat(0xbfe6f6))
    : type === 'twig' ? (() => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.7, 6), mat(0x7a5230)); m.rotation.z = Math.PI / 2; return m; })()
    : type === 'log' ? (() => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.8, 8), mats.log); m.rotation.z = Math.PI / 2; return m; })()
    : fishMesh();
  function addBag(type) { if (bag.length >= CFG1.cap) return false; const m = bagMesh(type); stackRoot.add(m); bag.push({ type, m }); restackBag(); return true; }
  function restackBag() { bag.forEach((b, i) => { b.m.position.set(0, i * 0.3, 0); b.m.rotation.y = 0; }); }
  function takeBag(type) { const k = bag.findIndex(b => b.type === type); if (k < 0) return false; stackRoot.remove(bag[k].m); bag.splice(k, 1); restackBag(); return true; }
  const takeWood = () => takeBag('log') || takeBag('twig') || (st.logs > 0 && (st.logs--, true));                  // 🪵 木頭：枯枝、木頭都算
  const woodInBag = () => bag.filter(b => b.type === 'log' || b.type === 'twig').length + st.logs;

  // ---- 人：流民（南門外排隊吃烤魚）、居民（住冰屋、在火堆旁閒晃）；圍欄裡外要走門 ----
  const gatePt = (x, z) => z < RC.z0 ? [0, RC.z0, 0, -1] : z > RC.z1 ? [0, RC.z1, 0, 1] : x < RC.x0 ? [RC.x0, GATE_Z, -1, 0] : [RC.x1, GATE_Z, 1, 0];   // 門中心＋往外的方向
  function walkTo(g, x, z, dt, sp = 2.2) { const dx = x - g.position.x, dz = z - g.position.z, d = Math.hypot(dx, dz); if (d < 0.3) return true; g.position.x += dx / d * sp * dt; g.position.z += dz / d * sp * dt; g.rotation.y = Math.atan2(dx, dz); g.position.y = Math.abs(Math.sin(performance.now() / 90)) * 0.06; return false; }
  function routeTo(g, x, z, dt) {                                           // 圍欄裡外要走門：先到門口，穿過去，再走向目標
    const p = g.position, pin = inside(p.x, p.z), tin = inside(x, z);
    if (pin === tin) return walkTo(g, x, z, dt);
    const [gx, gz, ox, oz] = pin ? gatePt(x, z) : gatePt(p.x, p.z), inner = [gx - ox * 1.2, gz - oz * 1.2], outer = [gx + ox * 1.2, gz + oz * 1.2];
    const nearGate = Math.hypot(p.x - gx, p.z - gz) < 1.6;
    if (pin) { if (!nearGate && Math.hypot(p.x - inner[0], p.z - inner[1]) > 0.5) walkTo(g, inner[0], inner[1], dt); else walkTo(g, outer[0], outer[1], dt); }
    else { if (!nearGate && Math.hypot(p.x - outer[0], p.z - outer[1]) > 0.5) walkTo(g, outer[0], outer[1], dt); else walkTo(g, inner[0], inner[1], dt); }
    return false;
  }
  function makePerson(n) {
    const g = new THREE.Group(), pal = [0x4a7fb0, 0x8e6b3e, 0xb5453f, 0x5b8a5f];
    const b = box(0.6, 0.75, 0.45, M(pal[n % 4])); b.position.y = 0.6; g.add(b); const h = box(0.45, 0.42, 0.42, mats.skin); h.position.y = 1.2; g.add(h);
    dress(g, [b, h], 1 + (n * 5) % 11); root.add(g); return g;
  }
  const doorFront = i => { const [x, z] = SLOTS[i], dx = FIRE[0] - x, dz = FIRE[1] - z, d = Math.hypot(dx, dz); return [x + dx / d * 3.5, z + dz / d * 3.5]; };
  function addResident(n, quick) {                                           // 居民：走到冰屋門口再到火堆旁閒晃
    const g = makePerson(n), home = Math.min(n >> 1, igloos.length - 1);
    const a = Math.random() * 6.28; g.position.set(quick ? FIRE[0] + Math.sin(a) * 3.5 : doorFront(Math.max(0, home))[0], 0, quick ? FIRE[1] + Math.cos(a) * 3.5 : doorFront(Math.max(0, home))[1]);
    folks.push({ g, n, t: Math.random() * 4, goal: null });
  }
  function addCustomer() { const g = makePerson(st.pop + queue.length + (cashTotal++)); g.position.set(0, 0, RC.z1 + 4); queue.push({ g, state: 'walk', t: 0, i: 0 }); }
  let cashTotal = 0;
  const beds = () => st.igloos * CFG1.bedPer;
  const selfSufficient = () => st.axe && st.stall && st.wh && st.logs >= CFG1.needLogs && upN() >= 2 && st.igloos >= CFG1.need.igloos && st.pop >= CFG1.need.pop && st.fuel >= CFG1.need.fuel;

  // ---- 介面 ----
  // v1.26（作者：第 2 關的介面最完整，第 1 關要一樣）：直接用第 2 關那一套畫面元件——左上 💵👥、左下 📦 倉庫＋揹包、🔥 火堆條、上方 🎯 目標（完成有獎金）和警示列
  const brickCount = () => st.bricks + bag.filter(b => b.type === 'brick').length;
  const GOALS = [
    [() => '⛏️ 走到南邊大雪堆旁，用手挖冰磚，揹到黃色格蓋第 1 間冰屋（🧊 ' + Math.min(price(), brickCount()) + '/' + price() + '）', () => st.igloos >= 1],
    [() => '🪓 撿森林邊的枯枝，在中間綠色格用 ' + CFG1.axePrice + ' 個做斧頭', () => st.axe],
    [() => '🍢 蓋烤魚攤（🪵 ' + CFG1.stallWood + '＋🧊 ' + CFG1.stallBrick + '），烤魚的香味才引得來流民', () => st.stall],
    [() => '🎣 去北邊冰洞釣魚，揹到藍色送魚格烤熟，流民吃飽就留下（居民 ' + st.pop + '/2）', () => st.pop >= 2],
    [() => '🏠 再蓋冰屋、留住流民：冰屋 ' + st.igloos + '/' + CFG1.need.igloos + '　居民 ' + st.pop + '/' + CFG1.need.pop, () => st.igloos >= CFG1.need.igloos && st.pop >= CFG1.need.pop],
    [() => '📦 蓋冰窖（🧊 ' + CFG1.whBrick + '＋🪵 ' + CFG1.whWood + '，居民 ' + CFG1.whPop + ' 人以上才出現）：揹包滿了可以存進去', () => st.wh],
    [() => '🪵 用斧頭砍樹，把木頭存進冰窖囤到 ' + CFG1.needLogs + ' 根（' + st.logs + '/' + CFG1.needLogs + '），暴風雪要靠它', () => st.logs >= CFG1.needLogs],
    [() => '⬆️ 升級任意 2 項（冰窖、烤魚攤、斧頭、釣竿的綠色升級格），冰窖和暴風雪都用得到（' + Math.min(2, upN()) + '/2）', () => upN() >= 2],
    [() => '🔥 火堆保持 ' + CFG1.need.fuel + '% 以上（現在 ' + Math.round(st.fuel) + '%），暴風雪就會來襲！', () => false],
  ];
  let shownGoal = '', goalFlash = 0, shownAlert = '', whFeedT = 0, whFishT = 0, whDepT = 0;
  const setTxt = (id, t) => { const e = $(id); if (e.textContent !== '' + t) e.textContent = t; };
  function hudText() {
    const f = Math.round(st.fuel), nb = bag.filter(b => b.type === 'brick').length, nf = bag.filter(b => b.type === 'fish').length, nl = bag.length - nb - nf;
    while (st.goal < GOALS.length - 1 && GOALS[st.goal][1]()) { const reward = 10 * (st.goal + 1); st.goal++; save.cash += reward; goalFlash = 1.5; toast('🎯 目標完成！獎金 +' + reward + ' 元'); sfx.coin(); }
    goalFlash -= 0.25;
    setTxt('cash', save.cash); setTxt('pop', st.pop); setTxt('capP', '/' + beds()); setTxt('beds', ' 🛏️' + Math.max(0, beds() - st.pop));
    setTxt('meat', nf); setTxt('stone', nb); setTxt('wood', nl); ['capM', 'capS', 'capW'].forEach(id => setTxt(id, '/' + CFG1.cap));
    ['pMeat', 'pStone', 'pWood'].forEach(id => $(id).classList.toggle('full', bag.length >= CFG1.cap));
    $('pMeat').style.display = nf ? '' : 'none'; $('pStone').style.display = nb ? '' : 'none'; $('pWood').style.display = nl ? '' : 'none'; $('pEmpty').style.display = bag.length ? 'none' : '';
    $('pStore').style.display = st.wh ? '' : 'none'; setTxt('sBr', st.bricks); setTxt('sLg', st.logs); setTxt('sFs', st.fishS); setTxt('sCap', '/' + whCap());
    setTxt('fuel', f); setTxt('fireName', '火堆'); $('fuelBar').firstElementChild.style.width = f + '%'; $('fuelBar').classList.toggle('danger', f < 20);
    const g = '🎯 ' + GOALS[st.goal][0]();
    if (g !== shownGoal) { $('goal').textContent = g; shownGoal = g; }
    $('goal').classList.toggle('done', goalFlash > 0);
    let at = '', cls = '';
    if (st.dis === 1) { at = '🌨️ 暴風雪 ' + Math.ceil(st.disT) + ' 秒後來襲，先囤木頭、守好火堆'; cls = 'cold'; }
    else if (st.dis === 2) { at = '🌨️ 暴風雪 ' + Math.ceil(st.disT) + ' 秒：枯枝不耐燒，丟木頭守住火堆'; cls = 'cold'; }
    else if (st.dis === 3) { at = '🧊 冰湖崩裂了！'; }
    else if (st.fuel <= 0) { at = '🔥 火堆熄了！快撿枯枝、木頭丟進去'; }
    else if (st.goal >= GOALS.length - 1 && !selfSufficient()) { at = '📋 還缺：' + [!st.axe && '🪓 斧頭', !st.stall && '🍢 烤魚攤', !st.wh && '📦 冰窖', st.logs < CFG1.needLogs && '🪵 冰窖木頭 ' + st.logs + '/' + CFG1.needLogs, upN() < 2 && '⬆️ 升級 ' + upN() + '/2', st.igloos < CFG1.need.igloos && '🏠 冰屋', st.pop < CFG1.need.pop && '👥 居民', st.fuel < CFG1.need.fuel && '🔥 火堆'].filter(Boolean).join('、'); cls = 'warn'; }
    const key = at + cls; if (key !== shownAlert) { shownAlert = key; $('alert').textContent = at; $('alert').className = cls; $('alert').style.display = at ? 'block' : 'none'; }
    padLabel.visible = st.igloos < CFG1.maxIgloo && st.dis === 0;
    if (padLabel.visible) padLabel.set(['🧊 蓋冰屋 +' + CFG1.bedPer + ' 床', '🧊 ' + Math.min(price(), pad.userData.paid + brickCount()) + '/' + price()], '#ffe066', [36, 68]);
    if (!st.axe) axeLabel.visible = st.dis === 0;
    if (!st.axe && axeLabel.visible) axeLabel.set(['🪓 做斧頭', '🪵 ' + Math.min(CFG1.axePrice, axePad.userData.paid + woodInBag()) + '/' + CFG1.axePrice], '#9fe870', [36, 68]);
    stallLabel.visible = st.dis === 0 && st.igloos >= 1;
    if (stallLabel.visible) { if (!st.stall) stallLabel.set(['🍢 蓋烤魚攤', '🪵 ' + Math.min(CFG1.stallWood, stallPaid.w + woodInBag()) + '/' + CFG1.stallWood + '　🧊 ' + Math.min(CFG1.stallBrick, stallPaid.b + brickCount()) + '/' + CFG1.stallBrick], '#ffe066', [36, 52]); else stallLabel.set(['🍢 烤魚攤', '烤好 ' + st.cooked + '/' + cMax() + (st.raw ? '　🐟 ' + st.raw : '')], '#ffe9b0', [36, 52]); stallLabel.position.y = st.stall ? 3.6 : 1.9; }
    UPS.forEach(u => {
      const lv = st.up[u.k], on = u.ok() && lv < 2 && st.dis === 0; u.lab.visible = on; if (!on) return;
      const [w, b] = u.cost[lv]; u.lab.set([u.icon + ' ' + u.name + '升級 Lv' + (lv + 2), '🪵 ' + Math.min(w, u.paid.w + woodInBag()) + '/' + w + (b ? '　🧊 ' + Math.min(b, u.paid.b + brickCount()) + '/' + b : ''), u.fx[lv]], '#9fe870', [34, 46, 30]);
    });
    rawLabel.visible = st.stall && st.dis === 0;
    if (rawLabel.visible) rawLabel.set(['🐟 送魚格', '站在這裡把魚交給烤魚攤'], '#bfe8ff', [34, 42]);
    whLabel.visible = st.dis === 0 && (st.wh || (st.pop >= CFG1.whPop && st.igloos >= 1));
    if (whLabel.visible) { if (!st.wh) whLabel.set(['📦 蓋冰窖', '🧊 ' + Math.min(CFG1.whBrick, whPaid.b + brickCount()) + '/' + CFG1.whBrick + '　🪵 ' + Math.min(CFG1.whWood, whPaid.w + woodInBag()) + '/' + CFG1.whWood], '#ffe066', [36, 52]); else whLabel.set(['📦 冰窖', '站近自動存入　每樣最多 ' + whCap()], '#d9efff', [36, 52]); whLabel.position.y = st.wh ? 3.4 : 1.9; }
    fireLabel.set([st.fuel <= 0 ? '🔥 火堆熄了' : '🔥 火堆 ' + f + '%', '丟枯枝、木頭加火'], st.fuel > 40 ? '#ffd34d' : '#ff8a5c', [34, 50]);
  }

  // ---- 每一格 ----
  const dist = (a, x, z) => Math.hypot(a.x - x, a.z - z);
  function step(dt) {
    undeclutter();
    if (cine) { cineStep(dt); return; }
    const px = player.position.x, pz = player.position.z;
    // 移動（跟第 2 關一樣用搖桿／WASD）；圍欄只有四個門過得去，不穿冰屋和火堆
    let ix = joy.x, iy = joy.y;
    if (keys.KeyA || keys.ArrowLeft) ix -= 1; if (keys.KeyD || keys.ArrowRight) ix += 1;
    if (keys.KeyW || keys.ArrowUp) iy -= 1; if (keys.KeyS || keys.ArrowDown) iy += 1;
    if (camMode.on) ix = iy = 0;
    const il = Math.hypot(ix, iy); if (il > 1) { ix /= il; iy /= il; }
    const mx = right.x * ix + fwd.x * -iy, mz = right.y * ix + fwd.y * -iy, moving = Math.hypot(mx, mz) > 0.05;
    if (moving) {
      if (hintOn) { hintOn = false; $('hint').style.display = 'none'; }
      let nx = px + mx * CFG.speed * dt, nz = pz + mz * CFG.speed * dt;
      nx = Math.max(-30, Math.min(30, nx)); nz = Math.max(-17, Math.min(44, nz));
      if (onFence(nx, nz)) { if (!onFence(nx, pz)) nz = pz; else if (!onFence(px, nz)) nx = px; else { nx = px; nz = pz; } }
      for (const o of igloos) { const d = Math.hypot(nx - o.x, nz - o.z); if (d < IG.hit && d > 0) { nx = o.x + (nx - o.x) / d * IG.hit; nz = o.z + (nz - o.z) / d * IG.hit; } }
      for (const b of banks) if (b.alive) { const d = Math.hypot(nx - b.x, nz - b.z); if (d < 1.4 && d > 0) { nx = b.x + (nx - b.x) / d * 1.4; nz = b.z + (nz - b.z) / d * 1.4; } }   // 雪堆是一堵雪牆，人進不去，站在旁邊用手挖
      if (st.wh && Math.abs(nx - WH[0]) < 1.9 && Math.abs(nz - WH[1]) < 1.5) { nx = px; nz = pz; }
      if (st.stall) { const sx = Math.abs(nx - STALL[0]), sz = Math.abs(nz - STALL[1]); if (sx < 1.8 && sz < 1.1) { nx = px; nz = pz; } }   // 烤魚攤本體不能穿
      const df = Math.hypot(nx - FIRE[0], nz - FIRE[1]); if (df < 0.9 && df > 0) { nx = FIRE[0] + (nx - FIRE[0]) / df * 0.9; nz = FIRE[1] + (nz - FIRE[1]) / df * 0.9; }
      for (const t of forest) if (t.alive) { const d = Math.hypot(nx - t.x, nz - t.z); if (d < 0.7 && d > 0) { nx = t.x + (nx - t.x) / d * 0.7; nz = t.z + (nz - t.z) / d * 0.7; } }
      player.position.x = nx; player.position.z = nz; player.rotation.y = Math.atan2(mx, mz); walk += dt * 12;
    }
    player.tick(walk, moving); updateMixers(dt);
    bag.forEach((b, i) => { b.m.position.x = Math.sin(walk * 0.5) * i * 0.012; });
    const X = player.position.x, Z = player.position.z;

    // 火堆：燒柴；崩裂時燒得快
    st.fuel = Math.max(0, st.fuel - (st.dis === 2 ? CFG1.burnDis : CFG1.burn) * dt);
    const fp = st.fuel / 100; flame.visible = flame2.visible = st.fuel > 0; flame.scale.set(0.6 + fp * 0.6, 0.4 + fp * 0.9 + Math.sin(fireT += dt * 18) * 0.06, 0.6 + fp * 0.6); flame2.scale.copy(flame.scale);
    warm.scale.setScalar(st.fuel > 0 ? 3.2 + fp * 4 : 0.001);

    // 鏟子自動挖雪堆：近處最近的雪堆，每 0.6 秒一下，4 下掉 2 塊冰磚（跟第 2 關自動砍樹一樣）
    let target = null, best = 2.45;
    for (const b of banks) {
      if (!b.alive) { if ((b.t -= dt) <= 0) { b.alive = true; b.hp = CFG1.bankHp; b.g.visible = true; b.g.scale.set(1, 1, 1); } continue; }
      const d = dist(b, X, Z); if (d < best) { best = d; target = b; }
    }
    shovelOn = !!target && bag.length < CFG1.cap;
    if (shovelOn) {
      player.rotation.y = Math.atan2(target.x - X, target.z - Z);
      if ((digT -= dt) <= 0) {
        digT = CFG1.digT; target.hp--; sfx.chop(); try { burstChips(target.x, target.z); } catch (e) {}
        target.g.scale.set(1, 0.4 + 0.6 * target.hp / CFG1.bankHp, 1);
        if (target.hp <= 0) {
          target.alive = false; target.t = CFG1.bankRe; target.g.visible = false;
          for (let i = 0; i < CFG1.bankBricks; i++) if (!addBag('brick') && (!st.wh || st.bricks < whCap())) st.bricks++;
          floatText('+🧊×' + CFG1.bankBricks, target.x, target.z, '#9fdcff');
        }
      }
    } else digT = Math.min(digT, 0.2);
    if (shovelOn) { shovT += dt; player.position.y = Math.abs(Math.sin(shovT * 14)) * 0.12; }   // 用手挖：蹲下去又起來、雪屑噴出來（不拿工具）
    // 枯枝（森林邊）
    for (const t of twigs) {
      if (!t.alive) { if ((t.t -= dt) <= 0) { t.alive = true; t.g.visible = true; } continue; }
      if (dist(t, X, Z) < 1.1 && bag.length < CFG1.cap) { t.alive = false; t.g.visible = false; t.t = st.dis === 2 ? CFG1.twigReDis : CFG1.twigRe; addBag('twig'); sfx.coin(); }
    }
    // 斧頭：做好後自動砍近處的樹（用第 2 關的旋轉斧頭）
    let tree = null; best = 2.2;
    for (const t of forest) { if (!t.alive) { if ((t.t -= dt) <= 0) { t.alive = true; t.hp = CFG1.treeHp; t.g.visible = true; } continue; } if (st.axe) { const d = dist(t, X, Z); if (d < best) { best = d; tree = t; } } }
    const chopping = !!tree && bag.length < CFG1.cap;
    axe.visible = chopping; if (chopping) {
      axeSpin += dt * 12; axe.position.set(X, 1.2, Z); axeArms.forEach((a, i) => { a.visible = i === 0; a.rotation.y = axeSpin; });
      swooshG.rotation.y = axeSpin - Math.PI / 2 - 2.4; swooshMat.opacity = 0.4; axeHeadMat.color.setHex([(axeKK ? AXE_TINT : AXE_COLORS)[0], 0x7fd6ff, 0xffd34d][st.up.axe]);
      player.rotation.y = Math.atan2(tree.x - X, tree.z - Z);
      if ((chopT -= dt) <= 0) {
        chopT = chopGap(); tree.hp--; tree.shake = 0.25; sfx.chop(); try { burstChips(tree.x, tree.z); } catch (e) {}
        if (tree.hp <= 0) { tree.alive = false; tree.g.visible = false; tree.t = CFG1.treeRe; let got = 0; for (let i = 0; i < logsPer(); i++) if (addBag('log')) got++; floatText('+🪵×' + got, tree.x, tree.z, '#ffd9a0'); }
      }
    } else { swooshMat.opacity = 0; chopT = Math.min(chopT, 0.2); }
    for (const t of forest) if (t.shake > 0) { t.shake -= dt; t.g.rotation.z = Math.sin(t.shake * 60) * 0.08; } else t.g.rotation.z = 0;
    // 湖中間的大冰洞：人一走近，旁邊三根釣竿就自動釣魚（跟鏟子、斧頭一樣不用按）
    tFish += dt;
    lakeFish.forEach(o => {                                                                // 魚隨意游：頭朝前、慢慢轉彎，游到湖邊就轉回來
      o.t -= dt; if (o.t < 0) { o.t = 1.5 + Math.random() * 3; o.turn = (Math.random() - 0.5) * 1.2; }
      const dx = o.f.position.x - LAKE[0], dz = o.f.position.z - LAKE[1];
      if (dx * dx + dz * dz > 6.2 * 6.2) { const want = Math.atan2(dz, -dx); let df = want - o.h; df = Math.atan2(Math.sin(df), Math.cos(df)); o.turn = Math.sign(df) * 1.2; }
      o.h += o.turn * dt; o.f.position.x += Math.cos(o.h) * o.sp * dt; o.f.position.z -= Math.sin(o.h) * o.sp * dt; o.f.rotation.y = o.h; });
    for (const h of holes) {
      const near = dist(h, X, Z) < HOLE_R + 1.6 && bag.length < CFG1.cap;
      if (near) { h.prog += dt; player.rotation.y = Math.atan2(h.x - X, h.z - Z); if (h.prog >= fishTime()) { h.prog = 0; addBag('fish'); sfx.coin(); floatText('+🐟', h.x, h.z, '#bfe8ff'); } }
      else h.prog = Math.max(0, h.prog - dt);
      const bite = near && h.prog > fishTime() - 0.7;
      h.h.material.color.setHex(near ? 0x1f6aa3 : 0x123f66); h.ripple.scale.setScalar(1 + (near ? (tFish * 1.2 % 1) * 0.9 : 0)); h.ripple.material.opacity = near ? 0.6 * (1 - (tFish * 1.2 % 1)) : 0;
      h.rods.forEach((r, i) => {
        const on = st.up.rod >= 2 || (st.up.rod === 1 ? i >= 1 && i <= 5 : i % 2 === 1); r.g.visible = r.bob.visible = on;                          // 釣竿升級：3 → 5 → 7 根
        r.pole.rotation.x = -1.0 + (bite ? Math.sin(tFish * 32 + i) * 0.1 : near ? Math.sin(tFish * 2 + i) * 0.04 : 0);
        r.pole.updateWorldMatrix(true, false); r.tip.getWorldPosition(tipV); r.bob.position.set(r.ox, 0.1 + Math.sin(tFish * 3 + i) * 0.03 - (bite ? 0.14 : 0), r.oz);
        const p = r.geo.attributes.position; p.setXYZ(0, tipV.x, tipV.y, tipV.z); p.setXYZ(1, r.bob.position.x, r.bob.position.y + 0.15, r.bob.position.z); p.needsUpdate = true;
      });
    }
    // 火堆旁：丟枯枝、木頭
    if (Math.hypot(X - FIRE[0], Z - FIRE[1]) < 2.2 && bag.some(b => b.type === 'log' || b.type === 'twig')) {
      if ((fireT2 -= dt) <= 0) {
        fireT2 = 0.15;
        if (takeBag('log')) { st.fuel = Math.min(100, st.fuel + CFG1.logFuel); sfx.coin(); }
        else if (takeBag('twig')) { st.fuel = Math.min(100, st.fuel + (st.dis === 2 ? CFG1.stormTwig : CFG1.twigFuel)); sfx.coin(); }
      }
    }
    // 蓋冰屋格：背著的冰磚、庫存的冰磚都能付
    if (st.igloos < CFG1.maxIgloo && st.dis === 0 && Math.hypot(X - PAD[0], Z - PAD[1]) < 1.5) {
      if ((padT -= dt) <= 0) {
        padT = 0.2;
        if (st.bricks > 0) { st.bricks--; pad.userData.paid++; sfx.coin(); }
        else if (takeBag('brick')) { pad.userData.paid++; sfx.coin(); }
        if (pad.userData.paid >= price()) { pad.userData.paid = 0; buildIgloo(st.igloos); st.igloos++; placePad(); toast('🏠 冰屋蓋好了！+' + CFG1.bedPer + ' 張床'); }
      }
    }
    pad.fill.scale.y = Math.max(0.0001, pad.userData.paid / price()); pad.visible = st.igloos < CFG1.maxIgloo && st.dis === 0;
    // 做斧頭格：用背著的木頭付；居民 ≥2 才出現
    const axeOn = !st.axe && st.dis === 0;
    if (axeOn && Math.hypot(X - AXEPAD[0], Z - AXEPAD[1]) < 1.5 && (paceT -= dt) <= 0) {
      paceT = 0.2;
      if (takeWood()) { axePad.userData.paid++; sfx.coin(); if (axePad.userData.paid >= CFG1.axePrice) { st.axe = true; sparkleAt(AXEPAD[0], AXEPAD[1]); sfx.unlock(); toast('🪓 做好斧頭了！走近樹就會自動砍，一棵 3 塊木頭'); } }
    }
    if (!st.axe) { axePad.fill.scale.y = Math.max(0.0001, axePad.userData.paid / CFG1.axePrice); axePad.visible = axeOn; }
    // 升級格：站上去用木頭（揹的、冰窖的）、冰磚付，付滿升一級（最多 Lv3）
    UPS.forEach(u => {
      const lv = st.up[u.k], on = u.ok() && lv < 2 && st.dis === 0;
      if (u.k !== 'axe' || st.axe) { u.pad.visible = on; u.pad.fill.scale.y = on ? Math.max(0.0001, (u.paid.w + u.paid.b) / (u.cost[lv][0] + u.cost[lv][1])) : 0.0001; }
      if (!on || Math.hypot(X - u.pos[0], Z - u.pos[1]) > 1.5 || (u.t = (u.t || 0) - dt) > 0) return;
      u.t = 0.2; const [w, b] = u.cost[lv];
      if (u.paid.w < w && takeWood()) { u.paid.w++; sfx.coin(); }
      else if (u.paid.b < b && (st.bricks > 0 ? (st.bricks--, true) : takeBag('brick'))) { u.paid.b++; sfx.coin(); }
      if (u.paid.w >= w && u.paid.b >= b) { u.paid.w = u.paid.b = 0; st.up[u.k]++; applyLooks(); sparkleAt(u.pos[0], u.pos[1]); sfx.unlock(); toast(u.icon + ' ' + u.name + '升到 Lv' + (st.up[u.k] + 1) + '：' + u.fx[lv]); }
    });
    // 蓋冰窖：居民 ≥3；🧊12＋🪵10（背著的、冰磚庫存都能付）
    const whOn = !st.wh && st.pop >= CFG1.whPop && st.igloos >= 1 && st.dis === 0;
    if (whOn && Math.hypot(X - WH[0], Z - WH[1]) < 2.0 && (whDepT -= dt) <= 0) {
      whDepT = 0.2;
      if (whPaid.w < CFG1.whWood && takeWood()) { whPaid.w++; sfx.coin(); }
      else if (whPaid.b < CFG1.whBrick && (st.bricks > 0 ? (st.bricks--, true) : takeBag('brick'))) { whPaid.b++; sfx.coin(); }
      if (whPaid.w >= CFG1.whWood && whPaid.b >= CFG1.whBrick) { st.wh = true; sparkleAt(WH[0], WH[1]); sfx.unlock(); toast('📦 冰窖蓋好了！站在門口，揹包裡的冰磚、木頭、魚會自動存進去'); }
    }
    whPad.fill.scale.y = Math.max(0.0001, (whPaid.w + whPaid.b) / (CFG1.whWood + CFG1.whBrick)); whPad.visible = whOn; whG.visible = st.wh;
    if (st.wh) {
      if (Math.hypot(X - WH[0], Z - (WH[1] + 1.6)) < 3.0 && (whDepT -= dt) <= 0) {                // 站在冰窖門口：揹包的冰磚、木頭、魚一個個存進去（枯枝是引火用的，不存）
        const t = bag.some(b => b.type === 'brick') && st.bricks < whCap() ? 'brick' : bag.some(b => b.type === 'log') && st.logs < whCap() ? 'log' : bag.some(b => b.type === 'fish') && st.fishS < whCap() ? 'fish' : null;
        if (t) { whDepT = 0.12; takeBag(t); if (t === 'brick') st.bricks++; else if (t === 'log') st.logs++; else st.fishS++; sfx.coin(); }
      }
      if (st.fuel < 60 && st.logs > 0 && (whFeedT -= dt) <= 0) { whFeedT = 1; st.logs--; st.fuel = Math.min(100, st.fuel + CFG1.logFuel); floatText('📦→🔥', FIRE[0] + 1, FIRE[1], '#ffd34d'); }   // 冰窖的木頭自動補火堆
      if (st.stall && st.fishS > 0 && st.raw < 3 && (whFishT -= dt) <= 0) { whFishT = 1.2; st.fishS--; st.raw++; }                   // 冰窖的魚自動送去烤
    }
    // 蓋烤魚攤：先蓋好 1 間冰屋；🪵6＋🧊4
    const stallOn = !st.stall && st.igloos >= 1 && st.dis === 0;
    if (stallOn && Math.hypot(X - STALL[0], Z - STALL[1]) < 2.0 && (stallPadT -= dt) <= 0) {
      stallPadT = 0.2;
      if (stallPaid.w < CFG1.stallWood && takeWood()) { stallPaid.w++; sfx.coin(); }
      else if (stallPaid.b < CFG1.stallBrick && (st.bricks > 0 ? (st.bricks--, true) : takeBag('brick'))) { stallPaid.b++; sfx.coin(); }
      if (stallPaid.w >= CFG1.stallWood && stallPaid.b >= CFG1.stallBrick) { st.stall = true; stallG.visible = true; sparkleAt(STALL[0], STALL[1]); sfx.unlock(); toast('🍢 烤魚攤蓋好了！把魚揹到藍色送魚格，烤好流民就會來'); }
    }
    stallPad.fill.scale.y = Math.max(0.0001, (stallPaid.w + stallPaid.b) / (CFG1.stallWood + CFG1.stallBrick)); stallPad.visible = stallOn;
    stallG.visible = st.stall;
    // 送魚格：把背著的魚交給烤魚攤；攤子每 0.8 秒烤熟一條放櫃台（最多 6 條）
    rawPad.visible = st.stall && st.dis === 0;
    if (st.stall && Math.hypot(X - RAWPAD[0], Z - RAWPAD[1]) < 1.5 && bag.some(b => b.type === 'fish') && (depT -= dt) <= 0) { depT = 0.2; takeBag('fish'); st.raw++; sfx.coin(); }
    if (st.stall && st.raw > 0 && st.cooked < cMax()) { if ((grillT += dt) >= grillTime()) { grillT = 0; st.raw--; st.cooked++; sfx.coin(); } } else grillT = 0;
    counterFish.forEach((f, i) => f.visible = st.stall && i < st.cooked);
    stallG.children.forEach(c => { if (c.userData.hang != null) c.visible = c.userData.hang < Math.min(4, st.raw + 1) && st.raw > 0; });
    igloos.forEach(o => o.smoke.forEach((p, k) => { const t = (smokeT * 0.5 + k / 4) % 1; p.position.set(Math.sin(t * 5 + k) * 0.15, 1.0 + t * 1.8, 0); p.scale.setScalar(0.2 + t * 0.35); p.material.opacity = 0.5 * (1 - t); }));
    smokeT += dt; smoke.forEach((s, i) => { const k = (smokeT * 0.6 + i / 3) % 1; s.position.y = 2 + k * 1.4; s.scale.setScalar(0.25 + k * 0.4); s.material.opacity = (st.raw > 0 ? 0.5 : 0) * (1 - k); });

    // 流民：有烤魚、火沒熄，每 12 秒從南門走來一位排隊（寒潮時之後版本會加快）
    if (st.stall && st.cooked > 0 && st.fuel > 0 && st.dis === 0 && queue.length < CFG1.queueMax) {
      if ((st.arriveT -= dt) <= 0) { st.arriveT = arriveGap(); addCustomer(); toast('👣 流民聞到烤魚的香味，從南門走過來了'); }
    }
    queue.forEach((c, k) => {                                                   // 排隊、吃魚、留下或付錢離開
      const g = c.g;
      if (c.state === 'walk') { const q = QUEUE[Math.min(k, QUEUE.length - 1)]; if (routeTo(g, q[0], q[1], dt)) c.state = 'wait'; }
      else if (c.state === 'wait') { const q = QUEUE[Math.min(k, QUEUE.length - 1)]; walkTo(g, q[0], q[1], dt); g.rotation.y = Math.atan2(STALL[0] - g.position.x, STALL[1] - g.position.z);
        if (k === 0 && st.cooked > 0 && Math.hypot(g.position.x - QUEUE[0][0], g.position.z - QUEUE[0][1]) < 0.5) { st.cooked--; c.state = 'eat'; c.t = 1.0; } }
      else if (c.state === 'eat') { g.position.y = 0; if ((c.t -= dt) <= 0) {
        if (st.pop < beds()) { st.pop++; c.state = 'stay'; toast('🏠 吃飽了，留下來當居民！人口 ' + st.pop + '/' + beds()); }
        else { save.cash += CFG1.pay; floatText('+💵' + CFG1.pay, g.position.x, g.position.z, '#ffd34d'); sfx.coin(); c.state = 'leave'; toast('💵 沒有空床，付了 ' + CFG1.pay + ' 元走了——蓋冰屋才留得住人'); } } }
      else if (c.state === 'leave') { if (routeTo(g, 0, RC.z1 + 6, dt) || g.position.z > RC.z1 + 5) c.state = 'gone'; }
    });
    for (let i = queue.length - 1; i >= 0; i--) {
      const c = queue[i];
      if (c.state === 'stay') { queue.splice(i, 1); folks.push({ g: c.g, n: folks.length, t: 0, goal: null, home: Math.min((st.pop - 1) >> 1, igloos.length - 1) }); }
      else if (c.state === 'gone') { root.remove(c.g); queue.splice(i, 1); }
    }
    for (const f of folks) {                                                    // 居民：先走到冰屋門口，之後在火堆旁閒晃
      f.t -= dt;
      if (f.home != null) { const d = doorFront(Math.max(0, f.home)); if (routeTo(f.g, d[0], d[1], dt)) f.home = null; continue; }
      if (!f.goal || f.t <= 0) { const a = Math.random() * 6.28, r = 2.6 + Math.random() * 2.2; f.goal = [FIRE[0] + Math.sin(a) * r, FIRE[1] + Math.cos(a) * r]; f.t = 4 + Math.random() * 5; }
      walkTo(f.g, f.goal[0], f.goal[1], dt, 1.2); if (Math.hypot(f.goal[0] - f.g.position.x, f.goal[1] - f.g.position.z) < 0.4) f.g.position.y = 0;
    }
    // 自給自足 → 崩裂預告 → 崩裂 → 遷徙
    if (!st.done) {
      if (st.dis === 0) {
        if ((st.retryT -= dt) <= 0 && selfSufficient()) { st.dis = 1; st.disT = CFG1.warn; toast('🌨️ 遠方颳起暴風雪！'); beep(180, 0.5, 'sawtooth', 0.06, 0.6); }
      } else if (st.dis === 1) {
        if ((st.disT -= dt) <= 0) { st.dis = 2; st.disT = CFG1.dis; toast('🌨️ 暴風雪來了！守住火堆！'); }
      } else if (st.dis === 2) {                                                // 暴風雪：畫面漸漸變白、雪下得又急又大、火堆燒 3 倍；撐到時間到，湖面才崩（dis 3）
        st.disT -= dt; const k = 1 - st.disT / CFG1.dis; setStorm(Math.min(0.55, k * 1.5) * (0.85 + 0.15 * Math.sin(performance.now() / 300)));
        if (st.fuel <= 0) { st.dis = 0; st.retryT = CFG1.retry; setStorm(0); toast('🔥 火堆熄了…暴風雪停了，晚點再來'); }
        else if (st.disT <= 0) { st.dis = 3; st.disT = 4; cracks.visible = true; setStorm(0); toast('🧊 冰湖崩裂了！'); beep(120, 0.8, 'sawtooth', 0.08, 0.6); }
      } else if (st.dis === 3) {
        st.disT -= dt; shake = 0.12; const k = 1 - st.disT / 4; cracks.children.forEach(c => { c.visible = k >= c.userData.k * 0.8; }); lake.material.color.setRGB(0.9 - k * 0.55, 0.96 - k * 0.4, 0.99 - k * 0.2);
        if (st.disT <= 0) { st.done = true; finish(); }
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
      snowPos[i * 3 + 1] -= dt * (st.dis === 2 ? 6 : 1.5); if (st.dis === 2) snowPos[i * 3] -= dt * 4;
      if (snowPos[i * 3 + 1] < 0) { snowPos[i * 3 + 1] = 18; snowPos[i * 3] = X + rand(-25, 25); snowPos[i * 3 + 2] = Z + rand(-25, 25); }
    }
    snowGeo.attributes.position.needsUpdate = true;
    for (let i = flies.length - 1; i >= 0; i--) {                              // 飄字、飛行動畫
      const f = flies[i]; f.t += dt; const k = Math.min(1, f.t / f.dur), to = f.toFn();
      f.mesh.position.lerpVectors(f.from, to, k); f.mesh.position.y += Math.sin(k * Math.PI) * f.arc; if (f.spin !== false) f.mesh.rotation.y += dt * 8;
      if (k >= 1) { flies.splice(i, 1); f.onDone && f.onDone(); }
    }
    for (let i = chips.length - 1; i >= 0; i--) {                              // 鏟子、斧頭的木屑／雪屑
      const c = chips[i]; c.life -= dt; c.vy -= 18 * dt;
      c.m.position.x += c.vx * dt; c.m.position.y = Math.max(0.08, c.m.position.y + c.vy * dt); c.m.position.z += c.vz * dt;
      c.m.rotation.x += dt * 10; c.m.scale.setScalar(Math.max(0.01, c.life / 0.6));
      if (c.life <= 0) { scene.remove(c.m); chips.splice(i, 1); }
    }
    if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').style.opacity = 0; }
    if ((inkT -= dt) <= 0) { inkT = 0.5; inkAll(scene); }
    if ((hudTxtT -= dt) <= 0) { hudTxtT = 0.25; hudText(); }
    if ((saveT += dt) > 2) { saveT = 0; writeSave(); }
    hudT = 0; declutter();   // 介面範圍每格重量一次（第 1 關的介面文字會變）
  }
  // 過場動畫（約 8 秒）：上下黑邊滑進來 → 湖面裂縫變寬、冰屋一間間沉進湖裡、魚群散開 → 全村人帶著火種往南走 → 畫面變白 → 進第 2 關
  let cine = null;
  const CINE_LINES = [[0, '湖冰整片裂開了……'], [2.6, '冰屋一間一間沉進了湖裡。'], [5, '長老捧著火種：「往南走，那裡有森林。」']];
  function startCine() {
    const el = document.createElement('div'); el.style.cssText = 'position:fixed;inset:0;z-index:99;pointer-events:none';
    el.innerHTML = '<div style="position:absolute;left:0;right:0;top:0;height:0;background:#000"></div><div style="position:absolute;left:0;right:0;bottom:0;height:0;background:#000"></div><div style="position:absolute;left:0;right:0;bottom:4%;text-align:center;color:#fff;font:700 19px sans-serif;text-shadow:0 2px 6px #000;padding:0 16px"></div><div style="position:absolute;inset:0;background:#fff;opacity:0"></div>';
    document.body.appendChild(el);
    cracks.visible = true; cracks.children.forEach(k => { k.visible = true; }); lakeFish.forEach(o => { o.f.visible = false; });
    folks.forEach(f => { f.goal = null; });
    cine = { t: 0, el, top: el.children[0], bot: el.children[1], txt: el.children[2], fade: el.children[3], camP: new THREE.Vector3(0, 28, 36) };
  }
  function cineStep(dt) {
    const k = cine; k.t += dt; const t = k.t;
    const bar = Math.min(1, t / 1) * 14; k.top.style.height = k.bot.style.height = bar + '%';
    for (const [at, s] of CINE_LINES) if (t >= at) k.txt.textContent = s;
    const sk = t < 4.5 ? 0.18 : 0;
    cracks.children.forEach(c => { c.scale.x = 1 + t * 1.2; });
    lake.material.color.setRGB(0.35, 0.55, 0.78);
    igloos.forEach((o, i) => { const sink = Math.max(0, t - 1 - i * 0.5); o.g.position.y = -Math.min(sink * 0.9, 3.2); o.g.rotation.z = Math.min(sink * 0.08, 0.3) * (i % 2 ? 1 : -1); });
    if (t < 4.5) { camera.position.lerp(k.camP, 1 - Math.exp(-dt * 2)); camera.lookAt(0, 0, 8); }
    else {
      folks.forEach((f, i) => walkTo(f.g, ((i % 5) - 2) * 1.4, 36 + (i >> 2) * 1.2, dt, 2.4)); player.rotation.y = 0;
      walkTo(player, 0, 38, dt, 2.6);
      camera.position.lerp(tmp.copy(player.position).add(camOffset), 1 - Math.exp(-dt * 3)); camera.lookAt(player.position.x, 0.8, player.position.z);
    }
    if (sk) { camera.position.x += (Math.random() - 0.5) * sk; camera.position.y += (Math.random() - 0.5) * sk * 0.6; }
    for (let i = 0; i < snowN; i++) { snowPos[i * 3 + 1] -= dt * 1.5; if (snowPos[i * 3 + 1] < 0) { snowPos[i * 3 + 1] = 18; snowPos[i * 3] = player.position.x + rand(-25, 25); snowPos[i * 3 + 2] = player.position.z + rand(-25, 25); } }
    snowGeo.attributes.position.needsUpdate = true;
    if (t > 7) k.fade.style.opacity = Math.min(1, t - 7);
    if (t > 8.2) { save.stage = 2; save.arrive = true; save.res = Math.min(Math.floor(st.pop / 2), 3); writeSave(); resetting = true; try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} location.reload(); k.t = -1e9; }
  }
  let stormEl = null;
  function setStorm(o) { if (!stormEl) { stormEl = document.createElement('div'); stormEl.style.cssText = 'position:fixed;inset:0;z-index:5;pointer-events:none;background:radial-gradient(circle,rgba(190,212,230,.35),#7d9db8);opacity:0'; document.body.appendChild(stormEl); } stormEl.style.opacity = o; }
  let paceT = 0;
  function finish() {                                                            // 撐過崩裂 → 遷徙劇情卡 → 第 2 關（帶走錢 100%、居民折半）
    writeSave();
    story('🧊 冰湖崩裂了！', ['湖冰整片裂開，冰屋沉進了湖裡，魚群也游走了。', '長老捧起火種說：「南邊的森林有木頭，可以蓋木屋。」', '帶著火種和族人，往南遷徙吧！'], '出發！');
    $('lvOk').addEventListener('click', startCine, { once: true });
  }
  // 最小間距檢查（給 layout-check 用）：格子、雪堆、枯枝、冰洞、冰屋、烤魚攤、火堆互相隔夠遠
  S.check = () => {
    const out = [], bld = [['火堆', FIRE[0], FIRE[1], 1.2], ['冰窖', WH[0], WH[1], 1.9], ['烤魚攤', STALL[0], STALL[1], 1.8], ...SLOTS.map((p, i) => ['冰屋' + (i + 1), p[0], p[1], IG.hit]), ...HOLES.map((p, i) => ['冰洞' + i, p[0], p[1], HOLE_R + 0.3])];
    const pads = [...SLOTS.map((p, i) => ['蓋冰屋格' + (i + 1), p[0], p[1], '冰屋' + (i + 1)]), ['蓋冰窖格', WH[0], WH[1], '冰窖'], ['蓋烤魚攤格', STALL[0], STALL[1], '烤魚攤'], ['做斧頭／升級格', AXEPAD[0], AXEPAD[1]], ['送魚格', RAWPAD[0], RAWPAD[1]], ['冰窖升級格', WHUP[0], WHUP[1]], ['烤魚攤升級格', STALLUP[0], STALLUP[1]], ['釣竿升級格', FISHUP[0], FISHUP[1]]];
    const slotPadNames = pads.filter(p => /^蓋冰屋格/.test(p[0]));
    for (let i = 0; i < bld.length; i++) for (let j = i + 1; j < bld.length; j++) { const d = Math.hypot(bld[i][1] - bld[j][1], bld[i][2] - bld[j][2]); if (d < bld[i][3] + bld[j][3] + 0.4) out.push('第1關建築太近：' + bld[i][0] + ' 和 ' + bld[j][0] + '（' + d.toFixed(1) + '）'); }
    for (let i = 0; i < pads.length; i++) for (let j = i + 1; j < pads.length; j++) { const d = Math.hypot(pads[i][1] - pads[j][1], pads[i][2] - pads[j][2]); if (d < 3.0 && !(slotPadNames.includes(pads[i]) && slotPadNames.includes(pads[j]))) out.push('第1關格子太近：' + pads[i][0] + ' 和 ' + pads[j][0] + '（' + d.toFixed(1) + '）'); }
    for (const p of pads) for (const b of bld) { if (p[3] === b[0] || /^冰洞/.test(b[0])) continue; const d = Math.hypot(p[1] - b[1], p[2] - b[2]); if (d < b[3] + (b[0] === '火堆' ? 1.8 : 1.5)) out.push('第1關格子離建築太近：' + p[0] + ' 和 ' + b[0] + '（' + d.toFixed(1) + '）'); }
    const pts = [...BANKS.map((s, i) => ['雪堆' + i, s[0], s[1], 1.2]), ...TWIGS.map((s, i) => ['枯枝' + i, s[0], s[1], 1.0])];
    for (const p of pts) { for (const b of bld) { if (/^雪堆/.test(p[0]) && /^冰洞/.test(b[0])) continue; if (Math.hypot(p[1] - b[1], p[2] - b[2]) < p[3] + b[3] + 0.4) out.push('第1關太近：' + p[0] + ' 和 ' + b[0]); } for (const q of pads) if (Math.hypot(p[1] - q[1], p[2] - q[2]) < p[3] + 1.4) out.push('第1關太近：' + p[0] + ' 和 ' + q[0]); }
    QUEUE.forEach((q, i) => { bld.forEach(b => { if (b[0] !== '烤魚攤' && Math.hypot(q[0] - b[1], q[1] - b[2]) < b[3] + 0.8) out.push('第1關排隊位置太靠近：' + b[0]); }); pads.forEach(p => { if (Math.hypot(q[0] - p[1], q[1] - p[2]) < 2.2) out.push('第1關排隊位置太靠近：' + p[0]); }); });
    return out;
  };
  S.spots = [[0, 12], WH, WHUP, FIRE, AXEPAD, STALL, RAWPAD, STALLUP, FISHUP, ...HOLES, [0, -7.5], BANKS[0], BANKS[BANKS.length - 1], HILL, TWIGS[0], TWIGS[1], SLOTS[0], SLOTS[3], QUEUE[1]];   // layout-check 讓主角走過去看的位置
  S.state = st; S.addResident = addResident; S.addCustomer = addCustomer; S.buildIgloo = buildIgloo; S.bag = bag; S.folks = folks; S.igloos = igloos; S.banks = banks; S.forest = forest; S.twigs = twigs; S.queue = queue; S.stallG = stallG;
  S.step = step;
  S.enter = () => {
    S.on = true; undeclutter();                                    // 先把「被避讓藏起來的標籤」放回去再一起藏，不然之後 undeclutter 會把它們叫回來
    scene.children.slice().forEach(o => { if (!(o.isLight || o === player || o.isPoints || o === sun.target)) o.visible = false; });
    scene.add(root); root.visible = true; root.add(axe);
    ['planBtn', 'hpBar', 'pCoal'].forEach(id => { const e = $(id); if (e) e.style.display = 'none'; });
    $('pMeat').innerHTML = '🐟 <b id="meat">0</b><span class="cap" id="capM"></span>'; $('pStone').innerHTML = '🧊 <b id="stone">0</b><span class="cap" id="capS"></span>'; 
    $('pStore').innerHTML = '📦 冰窖 🧊<b id="sBr">0</b><span class="cap" id="sCap"></span> 🪵<b id="sLg">0</b> 🐟<b id="sFs">0</b>';
    for (let i = 0; i < st.igloos; i++) buildIgloo(i, false);
    stallG.visible = st.stall; whG.visible = st.wh; placePad(); applyLooks();
    for (let i = 0; i < st.pop; i++) addResident(i, true);
    player.position.set(0, 0, 12); player.rotation.y = Math.PI; camera.position.copy(player.position).add(camOffset);
    hintOn = false; $('hint').style.display = 'none';              // 操作提示改放在上方目標列，不另外蓋在畫面中間
    if (scene.fog) { scene.fog.near = 90; scene.fog.far = 240; }    // 第 1 關地圖小，不要讓霧把地面洗成一片白
    hudText();
  };
  return S;
})();
window.__game && (window.__game.stage1 = stage1);
if (save.stage === 1) stage1.enter();
