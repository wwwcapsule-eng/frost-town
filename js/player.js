'use strict';
// ===== 主角 =====
const player = new THREE.Group();
const body = box(0.8, 1.0, 0.6, mats.player); body.position.y = 0.75; player.add(body);
const head = box(0.6, 0.55, 0.55, mats.skin); head.position.y = 1.55; player.add(head);
const hat = box(0.7, 0.25, 0.65, mats.player); hat.position.y = 1.9; player.add(hat);
const legs = box(0.7, 0.3, 0.5, M(0x24486b)); legs.position.y = 0.15; player.add(legs);
const stackRoot = new THREE.Group(); stackRoot.position.set(0, 1.3, -0.55); player.add(stackRoot);
scene.add(player);
// 旋轉斧頭：木柄＋大斧刃，外圍一圈藍色刀光；斧刃顏色隨等級變化
const axe = new THREE.Group(); axe.visible = false; axe.scale.setScalar(1.6); scene.add(axe);
const axeArm = new THREE.Group(); axe.add(axeArm);
// 斧頭和刀光永遠畫在最上層，進到樹林裡也不會被樹冠擋住
const onTop = c => new THREE.MeshLambertMaterial({ color: c, depthTest: false });
function topBox(w, h, d, mat) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.renderOrder = 21; return m; }
const handle = topBox(0.16, 0.16, 1.5, onTop(0x7a4a2a)); handle.position.z = 0.75; axeArm.add(handle);
const axeHeadMat = onTop(0x5d6b7c);
const axeHead = topBox(0.9, 0.16, 0.6, axeHeadMat); axeHead.position.set(0.25, 0, 1.45); axeArm.add(axeHead);
const axeEdge = topBox(0.14, 0.18, 0.75, onTop(0xc9d4e0)); axeEdge.position.set(0.72, 0, 1.45); axeArm.add(axeEdge);
const AXE_COLORS = [0x5d6b7c, 0x1f86d6, 0xe8a800, 0xff4f1f]; // 鐵灰→藍→金→橘（深一點，在雪地上才看得清楚）
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
const employed = () => save.workers + (save.porters || 0) + (save.shovel ? 1 : 0);
const beds = () => CFG.tentBeds + houses.filter(h => !h.dead && !h.cold).length * CFG.housePop;
if (save.res == null) save.res = Math.max(employed(), Math.min(beds(), CFG.popBase + save.workers + houses.length * CFG.housePop)); // 舊存檔：民房當作住滿
function population() { return save.res; }
const idle = () => save.res - employed();
const mealSize = () => Math.ceil(save.res * CFG.eatRate);         // 一餐吃幾份烤肉
const needHand = () => idle() > 0 ? null : '👥 沒有空閒的居民'; // 雇人的付款格：要有沒工作的居民
function hud() {
  const lv = LEVELS[save.level], next = LEVELS[save.level + 1];
  $('pop').textContent = population(); $('capP').textContent = next ? '/' + next.need : ''; $('beds').textContent = ' 🛏️' + Math.max(0, beds() - save.res);
  $('ver').textContent = lv.icon + ' ' + lv.name; $('menuVer').textContent = '寒霜小鎮 v' + VERSION;
  if (shownCash !== save.cash) { $('cash').textContent = save.cash; bump('pCash'); shownCash = save.cash; }
  const nMeat = countOf('meat') - flies.filter(f => f.toBack === 'meat').length, nCoal = carried.filter(m => m.userData.type === 'coal').length, nLog = carried.length - nMeat - nCoal;
  if (shownWood !== carried.length * 10000 + nMeat * 100 + nCoal) { $('wood').textContent = nLog; $('meat').textContent = nMeat; $('coal').textContent = nCoal; shownWood = carried.length * 10000 + nMeat * 100 + nCoal; }
  if (save.wh) { const st = save.store; $('sPlank').textContent = st.plank; $('sFuel').textContent = st.log + st.coal; $('sFood').textContent = st.food; $('pStore').classList.toggle('danger', wh.hungry); }
  $('capW').textContent = '/' + capacity(); $('capM').textContent = '/' + capacity(); $('capC').textContent = '/' + capacity();
  $('pCoal').classList.toggle('full', countOf('coal') >= capacity());
  if (!save.coalTip && countOf('coal') > 0) { save.coalTip = true; toast('⚫ 煤比木頭耐燒 4 倍！丟進火爐，或在🏗️規劃蓋🔨鐵匠鋪拿去賣'); }
  $('pWood').classList.toggle('full', countOf('log') >= capacity()); $('pMeat').classList.toggle('full', countOf('meat') >= capacity());
}
function bump(id) { const e = $(id); e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); }
let toastT = 0;
function toast(msg) { $('toast').textContent = msg; $('toast').style.opacity = 1; toastT = 1.6; }

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
$('hint').textContent = isTouch ? '按住畫面拖曳來移動\n走到樹旁邊會自動砍' : 'WASD／方向鍵移動\n滑鼠滾輪縮放';
$('hint').style.whiteSpace = 'pre-line';
if (!hintOn) $('hint').style.display = 'none';

// ===== 操作：浮動搖桿＋鍵盤 =====
const joy = { active: false, id: null, ox: 0, oy: 0, x: 0, y: 0 };
const joyEl = $('joy'), knob = $('knob');
addEventListener('pointerdown', e => {
  if (e.target.id === 'reset' || e.target.id === 'mute' || e.target.closest('#planBar, #planBtn, #menu')) return;
  if (plan.on) return planPointer('down', e);
  if (joy.active) return;
  joy.active = true; joy.id = e.pointerId; joy.ox = e.clientX; joy.oy = e.clientY; joy.x = joy.y = 0;
  joyEl.style.left = e.clientX + 'px'; joyEl.style.top = e.clientY + 'px'; joyEl.style.display = 'block';
  knob.style.transform = '';
});
addEventListener('pointermove', e => {
  if (plan.on) return planPointer('move', e);
  if (!joy.active || e.pointerId !== joy.id) return;
  let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy;
  const len = Math.hypot(dx, dy), R = 50;
  if (len > 10) clearTimeout(lpTimer);                          // 有拖動就是走路，不是長按
  if (len > R) { dx *= R / len; dy *= R / len; }
  joy.x = dx / R; joy.y = dy / R;
  knob.style.transform = `translate(${dx}px,${dy}px)`;
});
function joyEnd(e) { if (!plan.on) clearTimeout(lpTimer); if (plan.on) planPointer('up', e); if (e.pointerId === joy.id) { joy.active = false; joy.x = joy.y = 0; joyEl.style.display = 'none'; } }
addEventListener('pointerup', joyEnd); addEventListener('pointercancel', joyEnd);
const keys = {};
addEventListener('keydown', e => keys[e.code] = true);
addEventListener('keyup', e => keys[e.code] = false);
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
addEventListener('contextmenu', e => e.preventDefault());

// ===== 鏡頭 =====
const camBase = new THREE.Vector3(7, 15, 11), camOffset = camBase.clone();
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h); camera.aspect = w / h;
  camera.fov = 40;
  camOffset.copy(camBase).multiplyScalar((w < h ? Math.min(1.9, 1 + (h / w - 1) * 0.75) : 1) * zoom * LEVELS[save.level].cam * TERR[save.territory].cam); // 直式（手機）、城市等級越高，鏡頭越遠
  scene.fog.near = camOffset.length() + 10; scene.fog.far = camOffset.length() + 55; // v0.71：霧跟著鏡頭距離走，鏡頭拉遠時整片地不會被霧蓋白
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
// 電腦：滑鼠滾輪縮放鏡頭
let zoom = 1;
addEventListener('wheel', e => { zoom = Math.max(0.6, Math.min(1.8, zoom * (e.deltaY > 0 ? 1.1 : 0.9))); resize(); }, { passive: true });
resize();
const fwd = new THREE.Vector2(-camOffset.x, -camOffset.z).normalize();
const right = new THREE.Vector2(-fwd.y, fwd.x);

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
  guide.visible = save.bag + save.axe < 2; // 買過兩次升級就不再指引
  if (!guide.visible) return;
  let x, z, h = 2.2;
  const out = mills.find(m => m.out.length);
  const aff = unlocks.find(u => !u.done && !u.mat && u.price() - u.paid <= save.cash);
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

