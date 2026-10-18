'use strict';
// ===== 場景 =====
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xcfe3f2);
scene.fog = new THREE.Fog(0xcfe3f2, 45, 90);
const camera = new THREE.PerspectiveCamera(45, 1, 1, 200);

const hemi = new THREE.HemisphereLight(0xffffff, 0x9fb8d0, 0.75); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 0.75);
sun.position.set(-10, 20, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.03; // 減少陰影條紋閃爍
Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 60 });
scene.add(sun, sun.target);
const sunRot = new THREE.Matrix4().lookAt(new THREE.Vector3(-10, 20, 8), new THREE.Vector3(), new THREE.Vector3(0, 1, 0)), sunInv = sunRot.clone().invert(), sunC = new THREE.Vector3(), SUN_TEX = 36 / 1024;

// 賽璐璐風格（v0.67，作者 10/18）：卡通著色，亮、中、暗三段色塊，不是平滑漸層
const TOON = new THREE.DataTexture(new Uint8Array([95, 155, 215]), 3, 1, THREE.LuminanceFormat);
TOON.minFilter = TOON.magFilter = THREE.NearestFilter; TOON.needsUpdate = true;
const M = c => new THREE.MeshToonMaterial({ color: c, gradientMap: TOON });
// v0.70（作者 10/18：地上會閃、反光）：地面改逐像素打光（Lambert 只在頂點算光，一大片地只有 4 個角，營火光一變整片跟著跳），不要亮點
const ground0 = c => new THREE.MeshPhongMaterial({ color: c, specular: 0x000000, shininess: 0 });
// 地上的薄層（營地、道路、暖氣圈、付款格）像貼紙：不寫深度、用 polygonOffset 浮在雪地上，誰蓋誰由 renderOrder 決定（手機深度精度低，靠 y 差 0.01 會打架）
function decal(mesh, n) { Object.assign(mesh.material, { depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 * n }); mesh.renderOrder = n; return mesh; }
const mats = {
  snow: ground0(0xf4f8fc), dirt: ground0(0xc98c5a), // 地面用平滑著色：卡通色階會把營火光畫成一圈硬邊的黃圈
  trunk: M(0x7a4a2a), leaf: M(0x3f7f9a), leafSnow: M(0xe8f2fa),
  log: M(0xb06a35), meat: M(0xd9414a), fur: M(0xf2f0ea), cash: M(0x3fbf5a), wood: M(0x8a5a35), roof: M(0xb53a2e), player: M(0x2f8fd8),
  skin: M(0xffd6b0), ice: new THREE.MeshToonMaterial({ color: 0xd6ecff, gradientMap: TOON, transparent: true, opacity: 0.85 }),
  axe: M(0xdfe6ee), coal: M(0x2a2c33), rock: M(0x6b7280),
  pineLeaf: M(0x5d8a3c), pineBark: M(0xa8603a), birchBark: M(0xf2efe6), birchMark: M(0x2b2b2e),
};
// ===== 3D 模型（Kenney CC0，放在 assets/models）：載好之前先用方塊，載好就換上；材質換成賽璐璐 =====
const MODELS = {}, gltf = THREE.GLTFLoader ? new THREE.GLTFLoader() : null;
function loadModel(key, url, height, onLoad) {                    // height：縮放到多高
  if (!gltf) return;                                              // 載不到載入器（沒網路）就一直用方塊
  gltf.load(url, r => {
    const o = r.scene;
    o.traverse(m => { if (m.isMesh) { m.material = new THREE.MeshToonMaterial({ map: m.material.map, color: m.material.color, gradientMap: TOON }); m.castShadow = m.receiveShadow = true; } });
    const s = new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3());
    o.scale.setScalar(height / s.y); MODELS[key] = o; onLoad();
  }, undefined, () => {});
}
function box(w, h, d, mat) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.castShadow = m.receiveShadow = true; return m; }

// 地面：雪地＋營地泥土圓
const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), mats.snow); // 夠大，鏡頭拉最遠也看不到邊
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const camp = new THREE.Mesh(new THREE.PlaneGeometry(17, 17), mats.dirt); // 領地地面：跟方形圍欄一樣大
camp.rotation.x = -Math.PI / 2; camp.position.y = 0.01; camp.receiveShadow = true; scene.add(decal(camp, 1));

// 自動道路（作者 10/17 回饋第 4 項）：主路＋民房環狀路，每棟建築從門口鋪一段路接到最近的路；有變動就整組重鋪
const roads = new THREE.Group(); scene.add(roads);
const roadMat = ground0(0x8d939b);
const roadGeo = new THREE.PlaneGeometry(1, 1), plazaGeo = new THREE.CircleGeometry(2.6, 24);
let roadsDirty = true;
function roadSeg(ax, az, bx, bz, w = 1.3) {
  const len = Math.hypot(bx - ax, bz - az); if (len < 0.05) return;
  const m = new THREE.Mesh(roadGeo, roadMat);
  m.scale.set(w, len + w * 0.5, 1); m.rotation.set(-Math.PI / 2, 0, Math.atan2(bx - ax, bz - az), 'YXZ'); // 先在平面上轉向，再放平
  m.position.set((ax + bx) / 2, 0.02, (az + bz) / 2); m.receiveShadow = true; roads.add(decal(m, 2));
}
function nearestOnSeg(x, z, [ax, az, bx, bz]) {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  return [ax + dx * t, az + dz * t];
}
function rebuildRoads() {
  roadsDirty = false;
  roads.children.slice().forEach(m => roads.remove(m));
  const main = [[0, -FENCE_R - 1.5, 0, FENCE_R + 0.5]];               // 南北主路：北門 → 營火 → 南門
  if (save.east) main.push([0, 0, FENCE_R + 0.5, 0]);                 // 東路
  if (save.mine) main.push([MINE.x + 3.3, 0, 0, 0], [MINE.x + 3.3, -1.4, MINE.x + 3.3, 0]); // 西路：通到礦坑口前（不穿過山）
  [[1, 9.8 * TS], [2, 14.3 * TS]].forEach(([ring, r]) => {                      // 民房環狀路：只鋪有民房的那段弧，並接到主路（90°）
    const angs = HOUSE_LOTS.slice(0, save.houses).filter(l => l.ring === ring).map(l => Math.atan2(l.z, l.x) * 180 / Math.PI);
    if (!angs.length) return;
    const a0 = Math.min(90, ...angs), a1 = Math.max(90, ...angs);
    for (let a = a0; a < a1; a += 10) {
      const b = Math.min(a + 10, a1) * Math.PI / 180, c = a * Math.PI / 180;
      main.push([Math.cos(c) * r, Math.sin(c) * r, Math.cos(b) * r, Math.sin(b) * r]);
    }
  });
  main.forEach(s => roadSeg(...s));
  const plaza = new THREE.Mesh(plazaGeo, roadMat); plaza.rotation.x = -Math.PI / 2; plaza.position.set(0, 0.02, -3 * TS); plaza.receiveShadow = true; roads.add(decal(plaza, 2)); // 營火廣場
  for (const b of buildings) {                                        // 每棟建築接一段路到最近的主路／環狀路
    let best = null, bd = Infinity;
    for (const s of main) { const p = nearestOnSeg(b.x, b.z, s), d = Math.hypot(p[0] - b.x, p[1] - b.z); if (d < bd) { bd = d; best = p; } }
    if (best && bd > b.r) roadSeg(b.x, b.z, best[0], best[1], 1.1);
  }
}

// 文字標籤（價格、名稱）
function makeLabel(w = 256, h = 128) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  sp.renderOrder = 10;
  let last = '';
  sp.set = (lines, color = '#fff', sizes = [44, 30]) => { // sizes：每一行的字級
    const key = lines.join('|') + color + sizes; if (key === last) return; last = key; // 文字沒變就不重畫
    const g = cv.getContext('2d'); g.clearRect(0, 0, w, h);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const fs = lines.map((t, i) => sizes[Math.min(i, sizes.length - 1)]);
    let y = h / 2 - fs.reduce((a, b) => a + b * 1.05, 0) / 2;
    lines.forEach((t, i) => {
      g.font = (i === 0 ? '900 ' : '800 ') + fs[i] + 'px "Noto Sans TC","Microsoft JhengHei",sans-serif';
      g.lineWidth = Math.max(8, fs[i] / 6); g.strokeStyle = 'rgba(30,40,60,.85)';
      y += fs[i] * 0.525;
      g.strokeText(t, w / 2, y); g.fillStyle = color; g.fillText(t, w / 2, y);
      y += fs[i] * 0.525;
    });
    tex.needsUpdate = true;
  };
  return sp;
}

// 地上的虛線方框（投放點、付款格）；icon 是畫在格子裡的圖示（emoji）
function makePad(x, z, size, color, icon) {
  const g = new THREE.Group();
  const n = 8, seg = size / (n * 2);
  const mat = new THREE.MeshBasicMaterial({ color });
  for (let s = 0; s < 4; s++) for (let i = 0; i < n; i++) {
    const d = new THREE.Mesh(new THREE.PlaneGeometry(seg * 1.2, 0.12), mat);
    d.rotation.x = -Math.PI / 2;
    const t = -size / 2 + seg * (i * 2 + 0.5) + seg * 0.5;
    const e = size / 2;
    if (s === 0) d.position.set(t, 0, -e); if (s === 1) d.position.set(t, 0, e);
    if (s === 2) { d.position.set(-e, 0, t); d.rotation.z = Math.PI / 2; }
    if (s === 3) { d.position.set(e, 0, t); d.rotation.z = Math.PI / 2; }
    g.add(d);
  }
  const fill = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35 }));
  fill.rotation.x = -Math.PI / 2; fill.position.y = -0.005; fill.scale.y = 0.0001;
  g.add(fill); g.fill = fill;
  if (icon) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 256;
    const c = cv.getContext('2d');
    c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath();
    if (c.roundRect) c.roundRect(14, 14, 228, 228, 36); else c.rect(14, 14, 228, 228);
    c.fill();
    c.font = '150px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(icon, 128, 140); // emoji 也會吃 fillStyle 的透明度
    const ic = new THREE.Mesh(new THREE.PlaneGeometry(size * 0.9, size * 0.9), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false }));
    ic.rotation.x = -Math.PI / 2; ic.position.y = 0.004; g.add(ic);
  }
  g.children.forEach(m => decal(m, m === fill ? 4 : 5)); // 圖示、虛線蓋在進度色塊上
  g.position.set(x, 0.03, z); scene.add(g);
  return g;
}

// ===== 樹 =====
const trees = [];
const TREE_KEYS = ['treeA', 'treeB', 'treeC'];
function treeLook(g, kind) {                                      // 冷杉：原本的雪松模型；松樹：矮胖黃綠；白樺：冬天沒葉子的白樹幹
  g.clear();
  if (kind === 'birch') {
    const tr = box(0.26, 2.8, 0.26, mats.birchBark); tr.position.y = 1.4; g.add(tr);
    [0.5, 1.1, 1.7, 2.3].forEach((y, i) => { const m = box(0.28, 0.07, 0.28, mats.birchMark); m.position.y = y; m.rotation.y = i; g.add(m); }); // 黑色橫紋
    [[0.7, 1.9, 0], [-0.7, 2.2, 1.6], [0.6, 2.5, 3.2], [-0.6, 1.6, 4.4]].forEach(([r, y, a]) => {   // 光禿的樹枝，上面積一點雪
      const b = new THREE.Group(), s = box(0.08, 0.9, 0.08, mats.birchBark); s.position.y = 0.45; b.add(s);
      const sn = box(0.14, 0.08, 0.14, mats.leafSnow); sn.position.y = 0.92; b.add(sn);
      b.position.y = y; b.rotation.set(0, a, r); g.add(b);
    });
    return;
  }
  if (kind === 'pine') {                                          // 松樹：高高的橘褐色光樹幹，樹冠圓圓一團在頂上，冠上積雪
    const tr = box(0.28, 2.2, 0.28, mats.pineBark); tr.position.y = 1.1; g.add(tr);
    [[0, 2.25, 0, 0.85], [0.35, 1.85, 0.2, 0.6], [-0.3, 1.95, -0.25, 0.6]].forEach(([x, y, z, r]) => {
      const c = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), mats.pineLeaf); c.scale.y = 0.6; c.position.set(x, y, z); c.castShadow = true; g.add(c);
      const s = new THREE.Mesh(new THREE.IcosahedronGeometry(r * 0.75, 0), mats.leafSnow); s.scale.y = 0.35; s.position.set(x, y + r * 0.35, z); g.add(s);
    });
    return;
  }
  const k = TREE_KEYS[(Math.random() * 3) | 0];
  if (MODELS[k]) { g.add(MODELS[k].clone()); return; }
  const trunk = box(0.35, 0.8, 0.35, mats.trunk); trunk.position.y = 0.4; g.add(trunk);
  [[1.3, 1.3, 1.0], [1.0, 1.1, 1.7], [0.65, 0.9, 2.3]].forEach(([r, h, y]) => {
    const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), mats.leaf); c.position.y = y; c.castShadow = true; g.add(c);
    const s = new THREE.Mesh(new THREE.ConeGeometry(r * 0.55, h * 0.45, 7), mats.leafSnow); s.position.y = y + h * 0.3; g.add(s);
  });
}
function pickWood(z, locked) {                                    // 白樺只長在森林外圍（離營地遠的北邊、東邊森林）
  if ((z < -19 * TS || locked) && Math.random() < (locked ? 0.15 : 0.35)) return 'birch';
  return Math.random() < 0.4 ? 'pine' : 'fir';
}
let treesLoaded = 0;
['a', 'b', 'c'].forEach((v, i) => loadModel(TREE_KEYS[i], 'assets/models/holiday/tree-snow-' + v + '.glb', 3, () => {
  if (++treesLoaded === 3) trees.forEach(t => { if (t.kind === 'fir') treeLook(t.g, 'fir'); });
}));
function addTree(x, z, locked, kind = pickWood(z, locked)) {
  const g = new THREE.Group(); treeLook(g, kind);
  g.position.set(x, 0, z); g.rotation.y = Math.random() * 6;
  const sc = 0.85 + Math.random() * 0.35; g.scale.setScalar(sc);
  scene.add(g);
  trees.push({ g, x, z, kind, hp: WOODS[kind].hp, alive: true, regrow: 0, sc, shake: 0, locked });
}
function rand(a, b) { return a + Math.random() * (b - a); }
// 北門門板往外開的範圍：兩根門柱為圓心、門板長為半徑（門柱位置跟下面 GATES 的北門一樣）
let NG_PX = 4.15, NG_PZ = -8.7, NG_LEN = NG_PX; // 北門兩片門板的門柱位置；領地擴大時重算
function nearNorthDoors(x, z, pad) { return z < NG_PZ + 0.5 && (Math.hypot(x - NG_PX, z - NG_PZ) < NG_LEN + pad || Math.hypot(x + NG_PX, z - NG_PZ) < NG_LEN + pad); }
// 北邊森林（一開始就能砍）；門板擺動範圍內不長樹
for (let i = 0; i < 95; i++) {                   // 森林變大，樹也多一點
  const x = rand(-13, 9) * TS, z = rand(-22, -9) * TS;
  if (!nearNorthDoors(x, z, 1.2) && trees.every(t => (t.x - x) ** 2 + (t.z - z) ** 2 > 2.6)) addTree(x, z, false);
}
// 東邊森林（被冰牆擋住，要開拓）
for (let i = 0; i < 60; i++) {
  const x = rand(17.5, 32) * TS, z = rand(-12, 10) * TS;
  if (trees.every(t => (t.x - x) ** 2 + (t.z - z) ** 2 > 2.6)) addTree(x, z, true);
}
// 冰牆
const iceWall = new THREE.Group();
for (let z = -14 * TS; z <= 12 * TS; z += 1.6) {
  const b = box(1.4, rand(1.6, 2.6), 1.6, mats.ice); b.position.set(16 * TS + rand(-0.2, 0.2), b.geometry.parameters.height / 2, z); iceWall.add(b);
}
scene.add(iceWall);
// ===== 營地圍欄（v0.65 作者 10/18：改正方形，跟格子城鎮對齊）：FENCE_R＝正方形邊長的一半；走不過去，只能從門進出；門有人靠近會自己打開 =====
let FENCE_R = 8.7;                  // 圍欄半邊長：營火升級（擴大領地）時變大
const fd = (x, z) => Math.max(Math.abs(x), Math.abs(z)); // 離營地中心的「方形距離」：< FENCE_R 就在圍欄裡
const GATES = [                      // a＝門在哪一邊（北、南、東）；w＝門寬（固定）
  { a: Math.PI * 1.5, w: 8.3 },  // 北門（熊會來撞）
  { a: Math.PI / 2, w: 5.1 },    // 南門（村民進出）
  { a: 0, w: 7.6 },              // 東門
];
// 自己開的門（v0.66，作者 10/18）：規劃模式在圍欄上開口；off＝沿著那一邊離中間多遠
save.gates = save.gates || [];
save.gates.forEach(c => GATES.push({ a: c.a, w: CFG.gateW, off: c.off, own: true }));
function angDiff(a, b) { let d = (a - b) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return Math.abs(d); }
// 門的這一邊：沿著圍欄離門中心多遠（along）、往外多遠（out）
function gateLocal(g, x, z) { const ux = Math.round(Math.cos(g.a)), uz = Math.round(Math.sin(g.a)), t = -uz * x + ux * z; return { t, along: Math.abs(t - (g.off || 0)), out: ux * x + uz * z }; }
function inGate(x, z, m = 0.3, open = false) { return GATES.some(g => { if (open && g === GATES[2] && !save.east) return false; const l = gateLocal(g, x, z); return l.along < g.w / 2 - m && l.out > FENCE_R - 2; }); }
function gatePoint(g, r) { const ux = Math.round(Math.cos(g.a)), uz = Math.round(Math.sin(g.a)), o = g.off || 0; return [ux * r - uz * o, uz * r + ux * o]; }
const fencePosts = new THREE.Group(); scene.add(fencePosts);
function buildFence() {
  fencePosts.clear();
  const n = Math.round(FENCE_R * 2 / 1.05);                       // 邊變長，柱子間距維持差不多
  for (let s = 0; s < 4; s++) for (let i = 0; i <= n; i++) {
    const t = -FENCE_R + i * FENCE_R * 2 / n, [x, z] = [[t, -FENCE_R], [t, FENCE_R], [-FENCE_R, t], [FENCE_R, t]][s];
    if (inGate(x, z, 0)) continue;
    const p = box(0.22, 0.9, 0.22, mats.wood); p.position.set(x, 0.45, z); fencePosts.add(p);
  }
}
buildFence();
// 雙開木門：兩片門板各自繞門柱轉，往外打開
const doors = [];
function makeDoors(g, tall) {
  const group = new THREE.Group();
  const [mx, mz] = gatePoint(g, FENCE_R), tx = -Math.round(Math.sin(g.a)), tz = Math.round(Math.cos(g.a)); // 門中心、沿著圍欄的方向
  const leaves = [];
  [-1, 1].forEach(side => {
    const ex = mx + tx * side * g.w / 2, ez = mz + tz * side * g.w / 2;
    const len = Math.hypot(mx - ex, mz - ez), base = Math.atan2(-(mz - ez), mx - ex);
    const pivot = new THREE.Group(); pivot.position.set(ex, 0, ez); pivot.rotation.y = base;
    for (let x = 0.3; x < len; x += 0.55) {
      const h = tall ? 1.5 + Math.abs(Math.sin(x * 3)) * 0.4 : 1.0;
      const p = box(tall ? 0.4 : 0.3, h, tall ? 0.4 : 0.3, mats.wood); p.position.set(x, h / 2, 0); pivot.add(p);
    }
    const bar = box(len, 0.18, 0.14, mats.trunk); bar.position.set(len / 2, tall ? 1.1 : 0.7, 0.2); pivot.add(bar);
    const t = base + 1.2; // 往外開：轉完門板尖端要離營地中心更遠
    const sign = Math.cos(t) * Math.cos(g.a) + -Math.sin(t) * Math.sin(g.a) > Math.cos(base) * Math.cos(g.a) + -Math.sin(base) * Math.sin(g.a) ? 1 : -1;
    leaves.push({ pivot, base, sign });
    group.add(pivot);
  });
  scene.add(group);
  const d = { group, leaves, open: 0, x: mx, z: mz };
  doors.push(d);
  return d;
}
let southDoors = makeDoors(GATES[1], false), eastDoors = makeDoors(GATES[2], false);
function updateDoors(dt) {
  const movers = [player.position, ...workers.map(w => w.g.position), ...villagers.map(v => v.g.position), ...leaving.map(l => l.g.position)];
  for (const d of doors) {
    if (d === eastDoors && !save.east) continue;                     // 東邊還被冰牆擋著，東門不開
    const near = movers.some(p => Math.hypot(p.x - d.x, p.z - d.z) < 3.8);
    d.open += ((near ? 1 : 0) - d.open) * Math.min(1, dt * 8);
    d.leaves.forEach(l => l.pivot.rotation.y = l.base + l.sign * d.open * 1.45);
  }
}

// ===== 北極熊：在北邊森林閒晃，打倒掉肉，過一陣子重生 =====
const bears = [];
function bearSpot() { let x, z; do { x = rand(-12, 8) * TS; z = rand(-FENCE_R - 14 * TS, -FENCE_R - 2.3); } while (nearNorthDoors(x, z, 2)); return [x, z]; }
function makeMob(wolf) {
  const g = new THREE.Group();
  if (wolf) {                                                   // 冰狼：灰色、細長、比熊小
    const fur = M(0x9aa3ad);
    const bd = box(1.1, 0.5, 0.45, fur); bd.position.y = 0.6; bd.rotation.y = Math.PI / 2; g.add(bd);
    const hd = box(0.38, 0.36, 0.5, fur); hd.position.set(0, 0.85, 0.7); g.add(hd);
    const nose = box(0.14, 0.12, 0.14, M(0x333333)); nose.position.set(0, 0.8, 1); g.add(nose);
    [-0.12, 0.12].forEach(ex => { const e = box(0.1, 0.18, 0.08, fur); e.position.set(ex, 1.1, 0.62); g.add(e); });
    const tail = box(0.14, 0.14, 0.5, fur); tail.position.set(0, 0.7, -0.75); tail.rotation.x = 0.5; g.add(tail);
    [[-0.15, -0.35], [0.15, -0.35], [-0.15, 0.35], [0.15, 0.35]].forEach(([lx, lz]) => { const l = box(0.14, 0.4, 0.14, fur); l.position.set(lx, 0.2, lz); g.add(l); });
  } else {
    const bd = box(1.5, 0.9, 0.95, mats.fur); bd.position.y = 0.75; g.add(bd);
    const hd = box(0.6, 0.55, 0.6, mats.fur); hd.position.set(0, 0.95, 0.95); g.add(hd);
    const nose = box(0.25, 0.2, 0.2, M(0x333333)); nose.position.set(0, 0.9, 1.3); g.add(nose);
    [-0.2, 0.2].forEach(ex => { const e = box(0.14, 0.14, 0.1, mats.fur); e.position.set(ex, 1.28, 0.85); g.add(e); });
    [[-0.5, -0.3], [0.5, -0.3], [-0.5, 0.3], [0.5, 0.3]].forEach(([lx, lz]) => { const l = box(0.3, 0.45, 0.3, mats.fur); l.position.set(lx * 0.8, 0.22, lz * 1.2); g.add(l); });
    bd.rotation.y = Math.PI / 2; // 身體朝 +z
  }
  const [x, z] = bearSpot();
  g.position.set(x, 0, z); scene.add(g);
  const b = { g, x, z, isBear: true, wolf, hp: wolf ? CFG.wolfHp : CFG.bearHp, alive: true, respawn: 0, dir: rand(0, 6.28), turn: 0, shake: 0, pop: 0 };
  bears.push(b); return b;
}
for (let i = 0; i < CFG.bearCount; i++) makeMob(false);
// 怪物跟著營火等級變強（企劃 10.1）：Lv1 是原本的熊，之後每級血量、傷害往上加
const mobLv = () => fireLv() - 1;
const mobHp = b => Math.round((b.wolf ? CFG.wolfHp : CFG.bearHp) * (1 + CFG.lvBearHp * mobLv()));
const mobDmg = b => (1 + CFG.lvBearDmg * mobLv()) * (b.wolf ? 0.15 : 1); // 狼咬門比熊弱很多，威脅在數量多、跑得快
function updateBears(dt) {
  for (const b of bears) {
    if (!b.alive) {
      b.g.scale.setScalar(Math.max(0.001, b.g.scale.x - dt * 4));
      b.respawn -= dt;
      if (b.wolf) continue;                         // 冰狼打倒就不重生，下次來襲再叫出來
      if (b.respawn <= 0) { [b.x, b.z] = bearSpot(); b.alive = true; b.hp = mobHp(b); b.aggro = false; }
      b.g.position.set(b.x, 0, b.z);
      continue;
    }
    if (b.g.scale.x < 1) b.g.scale.setScalar(Math.min(1, b.g.scale.x + dt * 2));
    b.turn -= dt;
    if (b.turn <= 0) { b.turn = rand(1.5, 4); b.dir = rand(0, 6.28); b.idle = Math.random() < 0.35; }
    if (b.aggro && b.shake <= 0) {                 // 熊群來襲：衝向北門，北門破了就去拆最近的建築
      let tx, tz, reach = 0.3, prey = null;
      if (gate.hp > 0) { tx = Math.max(-3, Math.min(3, b.x)); tz = -FENCE_R - 1.1; }
      else {
        prey = buildings.filter(o => !o.dead).sort((p, q) => Math.hypot(p.x - b.x, p.z - b.z) - Math.hypot(q.x - b.x, q.z - b.z))[0];
        if (prey) { tx = prey.x; tz = prey.z; reach = prey.r + 0.9; } else { tx = CX; tz = CZ - 1.5; }
        const bearIn = fd(b.x, b.z) < FENCE_R, preyIn = fd(tx, tz) < FENCE_R;
        const inGateBand = Math.abs(b.x) < 3 && b.z > -FENCE_R - 1.9 && b.z < -FENCE_R + 2.1;
        if (bearIn !== preyIn && !inGateBand) { tx = Math.max(-2.5, Math.min(2.5, b.x)); tz = bearIn ? -FENCE_R + 1.7 : -FENCE_R - 1.3; reach = 0.3; prey = null; } // 進出營地都走北門
      }
      const dx = tx - b.x, dz = tz - b.z, d = Math.hypot(dx, dz);
      const sp = b.wolf ? CFG.wolfSpeed : 2.2;
      if (d > reach) { b.dir = Math.atan2(dx, dz); b.x += dx / d * sp * dt; b.z += dz / d * sp * dt; }
      else if (gate.hp > 0) { gate.hp -= CFG.bearDps * mobDmg(b) * dt; gate.hit = 0.2; }
      else if (prey) { b.dir = Math.atan2(dx, dz); prey.hp -= CFG.bearBuildDps * mobDmg(b) * dt; prey.hit = 0.2; }
    } else if (b.shake <= 0 && huntable(b)) {     // 野外的熊：主角在營地外又靠太近，就追過去打
      const dx = player.position.x - b.x, dz = player.position.z - b.z, d = Math.hypot(dx, dz);
      b.dir = Math.atan2(dx, dz); b.hunting = true;
      if (d > 1.3) { b.x += dx / d * 2.4 * dt; b.z += dz / d * 2.4 * dt; }
      else if (hurtCd <= 0) { hero.hp -= CFG.bearHitDps * dt; hero.hit = 0.15; }
    } else if (!b.idle && b.shake <= 0) {
      b.hunting = false;
      b.x += Math.sin(b.dir) * 1.2 * dt; b.z += Math.cos(b.dir) * 1.2 * dt;
      if (b.x < -13 * TS || b.x > 9 * TS || b.z < -FENCE_R - 15 * TS || b.z > -FENCE_R - 1.3) { b.dir = Math.atan2(-2 - b.x, -FENCE_R - 8 - b.z); b.x += Math.sin(b.dir) * 1.5 * dt; b.z += Math.cos(b.dir) * 1.5 * dt; } // 追完人慢慢走回森林
    }
    if (!b.aggro && !b.hunting && nearNorthDoors(b.x, b.z, 1.6)) {  // 平常閒晃的熊不靠近北門，碰到就往北走開
      b.z -= 2.5 * dt; b.dir = Math.PI + rand(-0.6, 0.6); b.idle = false;
    }
    b.g.position.set(b.x, 0, b.z);
    b.g.rotation.y = b.dir;
    if (b.shake > 0) { b.shake -= dt; b.g.rotation.z = Math.sin(b.shake * 60) * 0.12; } else b.g.rotation.z = 0;
    if (b.pop > 0) { b.pop -= dt; b.g.scale.setScalar(1 + Math.max(0, b.pop)); }
  }
}

// ===== 建築血量：北門破了熊會進來拆建築；全部被拆光就失敗 =====
const buildings = [];
save.bhp = save.bhp || {};
function addBuilding(key, g, r) {
  const b = { key, g, r, x: g.position.x, z: g.position.z, hp: save.bhp[key] ?? CFG.buildHp, hit: 0, dead: false };
  b.label = makeLabel(); b.label.scale.set(2.6, 1.3, 1); b.label.position.set(b.x, 4.6, b.z); scene.add(b.label);
  b.rubble = new THREE.Group();                       // 被拆掉後剩下的瓦礫
  for (let i = 0; i < 6; i++) { const c = box(rand(0.4, 0.9), rand(0.2, 0.5), rand(0.4, 0.9), i % 2 ? mats.wood : mats.trunk); c.position.set(rand(-r, r) * 0.6, 0.15, rand(-r, r) * 0.6); c.rotation.y = rand(0, 3); b.rubble.add(c); }
  b.rubble.position.set(b.x, 0, b.z); scene.add(b.rubble);
  buildings.push(b); setBuildingState(b); roadsDirty = true;
  return b;
}
// 建築碰撞（v0.59，作者第三次回饋第 3 點）：人物走進建築的圓圈就推回圈邊；拆掉的瓦礫可以走過去
// slide＞0：順便往目標那一側滑一點，工人才會繞過建築而不是卡住；目的地本身在圈內（門口付款格）就不擋
const props = [];                                                // 沒有血量、但人走不過去的東西（櫃台、營火）
function pushOut(x, z, pad, slide = 0, tx = null, tz = null) {
  for (const b of buildings.concat(props)) {
    if (b.dead) continue;
    const R = b.r + pad, dx = x - b.x, dz = z - b.z, d = Math.hypot(dx, dz);
    if (d >= R || d === 0 || (tx !== null && Math.hypot(tx - b.x, tz - b.z) < R)) continue;
    const ux = dx / d, uz = dz / d, s = slide * Math.sign(-uz * (tx - x) + ux * (tz - z) || 1);
    x = b.x + ux * R - uz * s; z = b.z + uz * R + ux * s;
  }
  return [x, z];
}
function setBuildingState(b) {
  b.dead = b.hp <= 0; b.g.visible = !b.dead; b.rubble.visible = b.dead;
  const pct = Math.round(b.hp / CFG.buildHp * 100);
  const lines = b.dead ? ['被拆掉了', '🔨 揹木頭來修'] : [...(b.cold ? ['❄️ 太冷停工'] : []), ...(pct < 100 ? ['🔨 ' + pct + '%'] : [])];
  b.label.visible = lines.length > 0;
  b.label.set(lines, b.dead || pct <= 50 ? '#ff6a5a' : b.cold ? '#9fdcff' : '#ffd34d');
}

