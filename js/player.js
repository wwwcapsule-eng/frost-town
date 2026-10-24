'use strict';
// ===== 主角 =====
const player = new THREE.Group();
// v1.08（作者選 B）：自己用程式拼的 Q 版羽絨大衣主角——大頭、三節飽飽的藍色大衣、白毛邊護耳毛帽；預覽在 tools/puffytest.html
// 全部是橢圓球／圓環／圓柱，描邊由 inkAll 自動加；沒有外部模型，所以不用等載入，也是作者原創
const puff = new THREE.Group(); puff.scale.setScalar(0.88); player.add(puff);
player.flash = [];                                      // 受傷時閃紅的材質（main.js）
const pM = c => { const m = M(c); player.flash.push(m); return m; };
const pEll = (mat, rx, ry, rz, x = 0, y = 0, z = 0, par = puff) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), mat); m.scale.set(rx, ry, rz); m.position.set(x, y, z); par.add(m); return m; };
{
  const skin = pM(0xffd9b8), coat = pM(0x3f9bd6), fur = pM(0xfaf6ee), trim = pM(0x245f8a), dark = pM(0x3b3f5c), boot = pM(0x4a4a55), scarf = pM(0xff8a3d), eye = pM(0x222222), cheek = pM(0xff9a9a);
  for (let i = 0; i < 3; i++) pEll(coat, 0.46 * (1 - 0.08 * i / 2), 0.2, 0.4 * (1 - 0.06 * i / 2), 0, 0.42 + i * 0.25, 0);   // 大衣三節
  pEll(trim, 0.45, 0.07, 0.39, 0, 0.27, 0);                                                                         // 下擺鬆緊帶
  pEll(scarf, 0.4, 0.09, 0.36, 0, 1.0, 0.02);
  var pArms = [-1, 1].map(s => {                                                                                    // 袖子：兩節＋束口＋白手套，從肩膀轉
    const g = new THREE.Group(); g.position.set(s * 0.52, 0.88, 0); g.rotation.z = -s * 0.12; puff.add(g);
    pEll(coat, 0.17, 0.2, 0.17, s * 0.05, -0.12, 0, g); pEll(coat, 0.16, 0.18, 0.16, s * 0.08, -0.34, 0.02, g); pEll(trim, 0.13, 0.06, 0.13, s * 0.09, -0.5, 0.03, g); pEll(fur, 0.11, 0.11, 0.11, s * 0.1, -0.6, 0.04, g); return g;
  });
  var pLegs = [-1, 1].map(s => {                                                                                    // 腿：褲子＋靴子，從髖關節轉
    const g = new THREE.Group(); g.position.set(s * 0.17, 0.26, 0); puff.add(g);
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.14, 14), dark); c.position.y = -0.04; g.add(c); pEll(boot, 0.15, 0.1, 0.2, 0, -0.17, 0.05, g); return g;
  });
  var pHead = new THREE.Group(); pHead.position.set(0, 1.5, 0); puff.add(pHead);
  pEll(skin, 0.56, 0.52, 0.52, 0, 0, 0, pHead);
  [-1, 1].forEach(s => { pEll(eye, 0.07, 0.1, 0.04, s * 0.2, -0.02, 0.5, pHead); pEll(cheek, 0.09, 0.05, 0.03, s * 0.34, -0.17, 0.46, pHead); pEll(coat, 0.14, 0.26, 0.12, s * 0.62, -0.12, 0, pHead); pEll(fur, 0.1, 0.12, 0.1, s * 0.62, -0.34, 0, pHead); }); // 眼睛、腮紅、護耳
  pEll(pM(0xc0524c), 0.05, 0.025, 0.02, 0, -0.2, 0.52, pHead);                                                      // 小嘴
  pEll(coat, 0.6, 0.38, 0.58, 0, 0.3, 0, pHead);                                                                    // 毛帽
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.54, 0.13, 10, 24), fur); rim.rotation.x = Math.PI / 2; rim.position.set(0, 0.17, 0); rim.scale.set(1.04, 1.04, 1.1); pHead.add(rim);
  pEll(fur, 0.17, 0.17, 0.17, 0, 0.7, 0, pHead);                                                                    // 頂端毛球
}
player.tick = (walk, moving) => {                       // 走路時手腳前後擺、頭輕輕歪、身體輕輕彈
  if (player.kk) return;                                // 換上 KayKit 騎士後，走路交給動畫
  const s = moving ? Math.sin(walk * 0.65) : 0;
  pArms[0].rotation.x = pLegs[1].rotation.x = s * 0.6; pArms[1].rotation.x = pLegs[0].rotation.x = -s * 0.6;
  pHead.rotation.z = s * 0.04; player.position.y = Math.abs(s) * 0.05;
};
// v1.09（作者想試試騎士當主角）：騎士載好就把羽絨大衣藏起來；要換回羽絨大衣，把下面這段刪掉就好
dressKK(player, [puff], 'kkKnight', null, m => {
  player.kk = true; player.flash = [];
  m.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); player.flash.push(o.material); } });
  // v1.12（作者：羽絨服不要遮手、不要像輪胎，風格跟下載的模組一致）：改成一件順順的長大衣——低面數的錐形外套（跟 KayKit 一樣是稜稜的），白毛領、腰帶、下擺一圈白毛；比身體窄，手臂不被蓋住
  const vest = new THREE.Group(), vc = M(0xb8403a), vf = M(0xf4efe6), vt = M(0x4a2f24); player.flash.push(vc, vf, vt);
  const part = (geo, mat, y, sz = 1) => { const o = new THREE.Mesh(geo, mat); o.position.y = y; o.scale.z = sz; vest.add(o); return o; };
  part(new THREE.CylinderGeometry(0.27, 0.35, 0.72, 8), vc, 0.66, 0.8);            // 大衣本體（上窄下寬）
  part(new THREE.CylinderGeometry(0.295, 0.295, 0.07, 8), vt, 0.64, 0.8);           // 腰帶
  const col = part(new THREE.TorusGeometry(0.22, 0.075, 6, 10), vf, 1.0, 0.85); col.rotation.x = Math.PI / 2;   // 毛領
  const hem = part(new THREE.TorusGeometry(0.34, 0.04, 5, 10), vf, 0.31, 0.8); hem.rotation.x = Math.PI / 2;     // 下擺毛邊
  player.add(vest);
});
// v1.02（作者：最重要的是認得出主角）：腳下一圈亮藍光圈
const heroRing = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.02, 32), new THREE.MeshBasicMaterial({ color: 0x4fc3ff, transparent: true, opacity: 0.9, depthWrite: false }));
heroRing.rotation.x = -Math.PI / 2; heroRing.position.y = 0.06; player.add(heroRing);
const stackRoot = new THREE.Group(); stackRoot.position.set(0, 1.05, -0.72); player.add(stackRoot);
scene.add(player);
// 旋轉斧頭：木柄＋大斧刃，外圍一圈藍色刀光；斧刃顏色隨等級變化
const axe = new THREE.Group(); axe.visible = false; axe.scale.setScalar(1.6); scene.add(axe);
const axeArm = new THREE.Group(); axe.add(axeArm);
// 斧頭和刀光永遠畫在最上層，進到樹林裡也不會被樹冠擋住
const onTop = c => new THREE.MeshLambertMaterial({ color: c, depthTest: false });
function topBox(w, h, d, mat) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.renderOrder = 21; return m; }
const handle = topBox(0.16, 0.16, 1.5, onTop(0x7a4a2a)); handle.position.z = 0.75; axeArm.add(handle);
let axeHeadMat = onTop(0x5d6b7c), axeKK = false;   // axeKK：換成 KayKit 斧頭模型之後，等級顏色改成「染色」
const axeHead = topBox(0.9, 0.16, 0.6, axeHeadMat); axeHead.position.set(0.25, 0, 1.45); axeArm.add(axeHead);
const axeEdge = topBox(0.14, 0.18, 0.75, onTop(0xc9d4e0)); axeEdge.position.set(0.72, 0, 1.45); axeArm.add(axeEdge);
const axeArms = [axeArm]; // v0.89（作者：後期看不出斧頭升級）：斧頭每升 1 級多一把一起轉（最多 4 把）
for (let i = 1; i < 4; i++) { const a = axeArm.clone(); axe.add(a); axeArms.push(a); }
const AXE_TINT = [0xffffff, 0x6fb8ff, 0xffd34d, 0xff8a5c];   // KayKit 斧頭有貼圖，用淺色乘上去才看得出原本的造型
const AXE_COLORS = [0x5d6b7c, 0x1f86d6, 0xe8a800, 0xff4f1f]; // 鐵灰→藍→金→橘（深一點，在雪地上才看得清楚）
// v1.11（作者：主角的斧頭也要改形象）：旋轉斧頭換成 KayKit 的單手斧模型（木柄＋斧刃，貼圖在 assets/models/kaykit/）；載好就藏起方塊斧，載不到就維持方塊斧
if (typeof gltf !== 'undefined' && gltf) gltf.load('assets/models/kaykit/axe_1handed.gltf', r => {
  const mat = new THREE.MeshToonMaterial({ map: null, gradientMap: TOON, depthTest: false });
  r.scene.traverse(o => { if (o.isMesh) { mat.map = o.material.map; o.material = mat; o.renderOrder = 21; } });
  const k = 1.35, mod = new THREE.Group(); mod.add(r.scene); mod.matrixAutoUpdate = false;
  mod.matrix.set(-k, 0, 0, 0,  0, 0, k, 0.27 * k * 0,  0, k, 0, 0.27 * k,  0, 0, 0, 1);   // 模型的 y（柄）轉成 z、刀刃從 -x 轉到 +x；柄底對齊轉軸
  axeArms.forEach(a => a.add(mod.clone()));
  [handle, axeHead, axeEdge].forEach(o => o.visible = false);
  axeHeadMat = mat; axeKK = true;
});
const swooshMat = new THREE.MeshBasicMaterial({ color: 0x5fc0ff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, depthTest: false });
const swoosh = new THREE.Mesh(new THREE.RingGeometry(0.7, 1.9, 32, 1, 0, 2.4), swooshMat);
swoosh.rotation.x = -Math.PI / 2; swoosh.renderOrder = 20;
const swooshG = new THREE.Group(); swooshG.add(swoosh); axe.add(swooshG);
let axeSpin = 0, axeShow = 0;

// 砍中時噴出的木屑
const chips = [];
const chipGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
// 升級完成的閃亮特效：金色、白色小方塊往上噴
const gold = new THREE.MeshBasicMaterial({ color: 0xffd34d }), white = new THREE.MeshBasicMaterial({ color: 0xffffff });
function sparkle(x, z) {
  for (let i = 0; i < 28; i++) {
    const c = new THREE.Mesh(chipGeo, i % 3 ? gold : white);
    const a = rand(0, 6.28), sp = rand(1.5, 4);
    c.position.set(x, rand(0.3, 1.2), z); scene.add(c);
    chips.push({ m: c, vx: Math.cos(a) * sp, vy: rand(6, 11), vz: Math.sin(a) * sp, life: 0.9 });
  }
}
function burstChips(x, z, bear) {
  for (let i = 0; i < 7; i++) {
    const c = new THREE.Mesh(chipGeo, bear ? (i % 2 ? mats.meat : mats.fur) : (i % 3 ? mats.log : mats.leafSnow));
    c.position.set(x + rand(-0.3, 0.3), rand(0.6, 1.4), z + rand(-0.3, 0.3)); scene.add(c);
    chips.push({ m: c, vx: rand(-3, 3), vy: rand(3, 6), vz: rand(-3, 3), life: 0.6 });
  }
}

const carried = []; // 背上的木頭 mesh
const logGeo = new THREE.BoxGeometry(0.9, 0.22, 0.32);
function capacity() { return CFG.capacity[save.bag]; } // 木頭、肉各自的上限
function countOf(type) { return carried.filter(m => m.userData.type === type).length + flies.filter(f => f.toBack === type).length; }
function stackHeight() { return carried.length + flies.filter(f => f.toBack).length; }
function restack() { carried.forEach((m, i) => { m.position.set(0, i * 0.24, 0); m.rotation.set(0, 0, 0); }); }

// ===== 飛行動畫 =====
const flies = [];
function fly(mesh, from, toFn, dur, onDone, arc = 1.5) {
  scene.add(mesh); mesh.position.copy(from);
  flies.push({ mesh, from: from.clone(), toFn, t: 0, dur, onDone, arc });
}
function toBack(kind, x, y, z, delay) {                           // 一塊東西從 (x,y,z) 飛到主角背上
  const idx = stackHeight(), m = new THREE.Mesh(logGeo, mats[kind]); m.castShadow = true; m.userData.type = kind;
  fly(m, tmp.set(x, y, z), () => stackRoot.localToWorld(new THREE.Vector3(0, idx * 0.24, 0)), 0.35 + delay, () => { stackRoot.add(m); carried.push(m); restack(); });
  flies[flies.length - 1].toBack = kind;
}

// ===== HUD =====
const $ = id => document.getElementById(id);
let shownCash = -1, shownWood = -1;
// 人口（v0.76，作者 10/18）：人口＝真的留下來的居民 save.res；流民吃到烤肉、而且有空床才會留下；工人都從居民裡雇
// v0.79（作者）：每 5 位居民一餐吃 1 份烤肉，也才能雇 1 個工人 → 等於一個工人背後要 1 份肉
const employed = () => save.workers + Math.max(0, (save.porters || 0) - 1) + (save.shovel ? 1 : 0) + (save.hunters || 0) + (save.coalers || 0) + (save.quarriers || 0);
const beds = () => (save.tents - save.tentUp) * CFG.tentBeds + [...houses, ...tentHouses].filter(h => !h.dead && !h.cold).reduce((n, h) => n + CFG.housePop + (isStone(h) ? CFG.stoneBeds : 0), 0); // 帳篷＋民房＋帳篷改建的木屋；v0.86 石屋多 3 床
if (save.res == null) save.res = Math.max(employed(), Math.min(beds(), CFG.popBase + save.workers + houses.length * CFG.housePop)); // 舊存檔：民房當作住滿
function population() { return save.res; }
const idle = () => save.res - employed();
const jobSlots = () => Math.floor(save.res / CFG.perMeat);         // 最多能雇幾個工人
const mealSize = () => Math.ceil(save.res / CFG.perMeat);         // 一餐吃幾份烤肉
const needHand = () => employed() < jobSlots() ? null : '👥 居民 ' + save.res + '/' + (employed() + 1) * CFG.perMeat; // 雇人的付款格：每 5 位居民雇 1 人，顯示還差多少
function hud() {
  const lv = LEVELS[save.level], next = LEVELS[save.level + 1];
  $('pop').textContent = population(); $('capP').textContent = next ? '/' + next.need : ''; $('beds').textContent = ' 🛏️' + Math.max(0, beds() - save.res);
  $('ver').textContent = lv.icon + ' ' + lv.name; $('menuVer').textContent = '寒霜小鎮 v' + VERSION;
  if (shownCash !== save.cash) { $('cash').textContent = save.cash; bump('pCash'); shownCash = save.cash; }
  const nMeat = countOf('meat') - flies.filter(f => f.toBack === 'meat').length, nCoal = carried.filter(m => m.userData.type === 'coal').length, nStone = carried.filter(m => m.userData.type === 'stone').length, nLog = carried.length - nMeat - nCoal - nStone;
  const key = [carried.length, nMeat, nCoal, nStone].join();
  if (shownWood !== key) { $('wood').textContent = nLog; $('meat').textContent = nMeat; $('coal').textContent = nCoal; $('stone').textContent = nStone; shownWood = key; }
  if (save.wh) { const st = save.store; $('sPlank').textContent = st.plank; $('sNeed').textContent = '/' + plankNeed(); $('sFood').textContent = st.food; $('sCoal').textContent = st.coal; $('sCoalW').style.display = save.mine && st.coal > 0 ? '' : 'none'; $('sJerky').textContent = st.jerky; $('sJerkyW').style.display = save.smoke && st.jerky > 0 ? '' : 'none'; $('sStone').textContent = st.stone; $('sStoneW').style.display = save.quarry && st.stone > 0 ? '' : 'none'; $('pStore').classList.toggle('danger', wh.hungry); }
  $('capW').textContent = '/' + capacity(); $('capM').textContent = '/' + capacity(); $('capC').textContent = '/' + capacity(); $('capS').textContent = '/' + capacity();
  { const show = { pWood: nLog, pMeat: nMeat, pCoal: save.mine ? nCoal : 0, pStone: save.quarry ? nStone : 0 };   // v1.29（作者：下面的資源會擋到、有些重複）：揹包裡沒有的東西不顯示，什麼都沒揹就顯示「空手」
    for (const id in show) $(id).style.display = show[id] > 0 ? '' : 'none'; $('pEmpty').style.display = carried.length ? 'none' : ''; }
  $('pStone').classList.toggle('full', countOf('stone') >= capacity());
  $('pCoal').classList.toggle('full', countOf('coal') >= capacity());
  if (!save.coalTip && countOf('coal') > 0) { save.coalTip = true; toast('⚫ 煤比木頭耐燒 4 倍！丟進火爐，或在🏗️規劃蓋🔨鐵匠鋪拿去賣'); }
  $('pWood').classList.toggle('full', countOf('log') >= capacity()); $('pMeat').classList.toggle('full', countOf('meat') >= capacity());
}
function bump(id) { const e = $(id); e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); }
let toastT = 0;
function toast(msg) { $('toast').innerHTML = (msg); $('toast').style.opacity = 1; toastT = 1.6; }

// ===== 音效（用程式合成，不需要音檔；手機要先碰一下畫面才能出聲） =====
let actx = null;
function initAudio() { if (!actx) try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
addEventListener('pointerdown', initAudio); addEventListener('keydown', initAudio);
function beep(freq, dur, type, vol, slide) {
  if (!actx || save.mute) return;
  const t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + dur);
}
function muteLabel() { $('mute').textContent = save.mute ? '🔇 音效關' : '🔊 音效開'; }
$('mute').onclick = () => { save.mute = !save.mute; muteLabel(); writeSave(); };
muteLabel();
let coinCd = 0;
const sfx = {
  chop: () => beep(170, 0.09, 'square', 0.05, 0.5),
  coin: () => { if (coinCd > 0) return; coinCd = 0.05; beep(1100, 0.07, 'triangle', 0.05, 1.6); },
  unlock: () => { beep(523, 0.12, 'triangle', 0.1); setTimeout(() => beep(784, 0.2, 'triangle', 0.1), 110); try { navigator.vibrate && navigator.vibrate(60); } catch (e) {} },
};
const isTouch = matchMedia('(pointer: coarse)').matches;
let hintOn = save.cash === 0 && !save.bag && !save.axe;
$('hint').textContent = isTouch ? '按住畫面拖曳來移動\n走到樹旁邊會自動砍' : 'WASD／方向鍵移動\n滾輪縮放、按住右鍵拖曳轉視角';
$('hint').style.whiteSpace = 'pre-line';
if (!hintOn) $('hint').style.display = 'none';

// ===== 操作：浮動搖桿＋鍵盤 =====
const joy = { active: false, id: null, ox: 0, oy: 0, x: 0, y: 0 };
const joyEl = $('joy'), knob = $('knob');
addEventListener('pointerdown', e => {
  if (e.target.id === 'camBtn') return;
  if (camMode.on) return camPointer('down', e);
  if (e.button === 2 && !plan.on) { camMode.pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); return; } // v0.90 電腦：按住右鍵拖曳轉視角
  if (e.target.id === 'reset' || e.target.id === 'mute' || e.target.closest('#planBar, #planBtn, #menu')) return;
  if (plan.on) return planPointer('down', e);
  if (joy.active) return;
  joy.active = true; joy.id = e.pointerId; joy.ox = e.clientX; joy.oy = e.clientY; joy.x = joy.y = 0;
  joyEl.style.left = e.clientX + 'px'; joyEl.style.top = e.clientY + 'px'; joyEl.style.display = 'block';
  knob.style.transform = '';
});
addEventListener('pointermove', e => {
  if (camMode.on || camMode.pts.has(e.pointerId)) return camPointer('move', e);
  if (plan.on) return planPointer('move', e);
  if (!joy.active || e.pointerId !== joy.id) return;
  let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy;
  const len = Math.hypot(dx, dy), R = 50;
  if (len > 10) clearTimeout(lpTimer);                          // 有拖動就是走路，不是長按
  if (len > R) { dx *= R / len; dy *= R / len; }
  joy.x = dx / R; joy.y = dy / R;
  knob.style.transform = `translate(${dx}px,${dy}px)`;
});
function joyEnd(e) { camPointer('up', e); if (!plan.on) clearTimeout(lpTimer); if (plan.on) planPointer('up', e); if (e.pointerId === joy.id) { joy.active = false; joy.x = joy.y = 0; joyEl.style.display = 'none'; } }
addEventListener('pointerup', joyEnd); addEventListener('pointercancel', joyEnd);
const keys = {};
// v0.88 視角模式（作者：多一個按鍵，按下去不能走，一指滑動轉視角、兩指縮放，要有說明）
const camMode = { on: false, pts: new Map(), pinch: 0 };
function setCamMode(on) {
  camMode.on = on; camMode.pts.clear(); joy.active = false; joy.x = joy.y = 0; joyEl.style.display = 'none';
  $('camBtn').textContent = on ? '✅ 回去走路' : '🎥 轉視角'; $('camBtn').classList.toggle('on', on);
  $('camHint').style.display = on ? 'block' : 'none';
}
$('camBtn').onclick = () => setCamMode(!camMode.on);
function camPointer(type, e) {
  const pts = camMode.pts;
  if (type === 'up') { pts.delete(e.pointerId); camMode.pinch = 0; return; }
  if (type === 'down') { pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); camMode.pinch = 0; return; }
  const p = pts.get(e.pointerId); if (!p) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  if (pts.size >= 2) {                                           // 兩指：看兩指距離變化縮放
    const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
    if (camMode.pinch) setZoom(zoom * camMode.pinch / d);
    camMode.pinch = d;
  } else { cam.yaw -= dx * 0.008; cam.pitch = Math.max(-0.5, Math.min(0.5, cam.pitch - dy * 0.005)); resize(); }
}
addEventListener('keydown', e => keys[e.code] = true);
addEventListener('keyup', e => keys[e.code] = false);
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
addEventListener('contextmenu', e => e.preventDefault());

// ===== 鏡頭 =====
const camBase = new THREE.Vector3(7, 15, 11), camOffset = camBase.clone();
const camSph = new THREE.Spherical().setFromVector3(camBase), camRef = camBase.length() * 1.5; // camRef：標籤放大的基準距離（剛開始的手機鏡頭）
const cam = { yaw: 0, pitch: 0 };                                // v0.88 視角模式：轉的角度
const fwd = new THREE.Vector2(), right = new THREE.Vector2();
let fogR = 30, fogK = 0;
function updateFog(dt) { // v0.99 大暴雪：霧慢慢收近，只看得清主角附近
  fogK += ((blizzard.on > 0 ? 1 : 0) - fogK) * Math.min(1, dt * 0.8);
  scene.fog.near = fogR + 10 - fogK * (fogR * 0.55 + 10); scene.fog.far = fogR + 55 - fogK * 40;
}
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h); camera.aspect = w / h;
  camera.fov = 40;
  const r = camSph.radius * (w < h ? Math.min(1.9, 1 + (h / w - 1) * 0.75) : 1) * zoom * LEVELS[save.level].cam * TERR[save.territory].cam; // 直式（手機）、城市等級越高，鏡頭越遠
  camOffset.setFromSphericalCoords(r, Math.max(0.25, Math.min(1.25, camSph.phi + cam.pitch)), camSph.theta + cam.yaw);
  fwd.set(-camOffset.x, -camOffset.z).normalize(); right.set(-fwd.y, fwd.x); // 搖桿方向跟著鏡頭轉
  const k = Math.max(1, r / camRef); labelK.set(k, k, 1); player.scale.setScalar(Math.min(1.6, Math.sqrt(k))); // v0.88（作者：營地越大人物越小）：拉遠時標籤、主角跟著放大
  fogR = r; updateFog(0); // v0.71：霧跟著鏡頭距離走，鏡頭拉遠時整片地不會被霧蓋白
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
// 電腦：滑鼠滾輪縮放鏡頭；手機：視角模式兩指縮放
let zoom = 1;
const setZoom = z => { zoom = Math.max(0.45, Math.min(1.8, z)); resize(); };
addEventListener('wheel', e => setZoom(zoom * (e.deltaY > 0 ? 1.1 : 0.9)), { passive: true });
resize();

// ===== 下雪 =====
const snowN = 400, snowPos = new Float32Array(snowN * 3);
for (let i = 0; i < snowN; i++) { snowPos[i * 3] = rand(-25, 25); snowPos[i * 3 + 1] = rand(0, 18); snowPos[i * 3 + 2] = rand(-25, 25); }
const snowGeo = new THREE.BufferGeometry(); snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
const snow = new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.15 }));
scene.add(snow);

// ===== 新手指引箭頭：前期告訴玩家下一步去哪 =====
const guide = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1, 4), new THREE.MeshBasicMaterial({ color: 0xffc400, depthTest: false }));
guide.rotation.x = Math.PI; guide.renderOrder = 22; scene.add(guide);
let guideT = 0;
function updateGuide(dt) {
  guideT += dt;
  const aff = unlocks.find(u => !u.done && !u.mat && !u.blk && !(u.cool > 0) && u.price() - u.paid <= save.cash);
  const rich = aff && save.cash >= 150 && !carried.length;        // v1.02（作者：錢很多不知道要升級什麼）：錢堆起來時，箭頭指向買得起的那一格
  guide.visible = save.bag + save.axe < 2 || rich; // 買過兩次升級就不再指引
  if (!guide.visible) return;
  let x, z, h = 2.2;
  const out = mills.find(m => m.out.length);
  if (out) { x = out.outPad.position.x; z = out.outPad.position.z; }
  else if (carried.length >= Math.min(capacity(), 9)) { const s = mills.find(m => m.accept === carried[carried.length - 1].userData.type) || { inPad: fg }; x = s.inPad.position.x; z = s.inPad.position.z; }
  else if (aff && !carried.length) { x = aff.x; z = aff.z; h = 3.2; }
  else {
    let best = 1e9;
    for (const t of trees) {
      if (!t.alive || t.locked) continue;
      const d = (t.x - player.position.x) ** 2 + (t.z - player.position.z) ** 2;
      if (d < best) { best = d; x = t.x; z = t.z; }
    }
    h = 4;
  }
  guide.position.set(x, h + Math.abs(Math.sin(guideT * 4)) * 0.6, z);
  guide.rotation.y += dt * 3;
}

