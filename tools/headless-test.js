// 無畫面測試（v0.85 加）：用假的 THREE／DOM 把遊戲腳本跑起來，只檢查遊戲邏輯（不檢查畫面）
// 用法：node tools/headless-test.js . 測試檔.js；測試檔第一行可寫「// SAVE {存檔 JSON}」當作起始進度，裡面可用 __game.step(1/30)、save、player 等
// 自動排程開不了瀏覽器時用這個；畫面（遮擋、反光、字被切）還是要用瀏覽器看
const fs = require('fs'), vm = require('vm'), path = require('path');
const dir = process.argv[2], test = fs.readFileSync(process.argv[3], 'utf8');
const VEC = new Set(['x', 'y', 'z', 'w']);
function S(init) {                                    // 萬用假物件：沒有的屬性自動長出來；x/y/z 是數字
  const t = function () {}; t.__s = { x: 0, y: 0, z: 0, ...(init || {}) };
  const p = new Proxy(t, {
    get(_, k) {
      const s = t.__s;
      if (k === Symbol.toPrimitive) return () => 0;
      if (k === Symbol.iterator) return function* () {};
      if (k === 'then') return undefined;
      if (k in s) return s[k];
      if (VEC.has(k)) return 0;
      if (k === 'set') return (x, y, z) => { if (typeof x === 'number') { s.x = x; s.y = y ?? s.y; s.z = z ?? s.z; } return p; };
      if (k === 'setScalar') return v => { s.x = s.y = s.z = v; return p; };
      if (k === 'copy') return o => { s.x = +o.x || 0; s.y = +o.y || 0; s.z = +o.z || 0; return p; };
      if (k === 'clone') return () => S({ x: s.x, y: s.y, z: s.z });
      if (k === 'add') return o => { if (o && typeof o.x === 'number') { s.x += o.x; s.y += o.y; s.z += o.z; } return p; };
      if (k === 'sub') return o => { s.x -= o.x; s.y -= o.y; s.z -= o.z; return p; };
      if (k === 'multiplyScalar') return v => { s.x *= v; s.y *= v; s.z *= v; return p; };
      if (k === 'lerp') return (o, a) => { s.x += (o.x - s.x) * a; s.y += (o.y - s.y) * a; s.z += (o.z - s.z) * a; return p; };
      if (k === 'lerpVectors') return (a, b, f) => { s.x = a.x + (b.x - a.x) * f; s.y = a.y + (b.y - a.y) * f; s.z = a.z + (b.z - a.z) * f; return p; };
      if (k === 'length') return () => Math.hypot(s.x, s.y, s.z);
      if (k === 'distanceTo') return o => Math.hypot(s.x - o.x, s.y - o.y, s.z - o.z);
      if (k === 'normalize') return () => { const l = Math.hypot(s.x, s.y, s.z) || 1; s.x /= l; s.y /= l; s.z /= l; return p; };
      if (k === 'children') return (s.children = []);
      if (k === 'add' ) return () => p;
      if (k === 'traverse') return f => { f(p); (s.children || []).forEach(c => c.traverse && c.traverse(f)); };
      if (k === 'getWorldPosition' || k === 'localToWorld') return v => (v ? v.copy ? v.copy(p.position) : v : S());
      if (k === 'remove') return o => { if (s.children) { const i = s.children.indexOf(o); if (i >= 0) s.children.splice(i, 1); } return p; };
      if (k === 'clear') return () => { if (s.children) s.children.length = 0; return p; };
      if (k === 'parameters') return (s.parameters = { width: 1, height: 1, depth: 1 });
      if (k === 'width' || k === 'height') return 100;
      return (s[k] = S());
    },
    set(_, k, v) { t.__s[k] = v; return true; },
    apply(_, self, args) { return S(); },
    construct(_, args) { return S(); },
    has(_, k) { return k in t.__s; },
  });
  return p;
}
// Group.add 要真的把東西放進 children
const mk = () => { const o = S(); o.children = []; o.add = (...a) => { o.children.push(...a); return o; }; o.position = S(); o.rotation = S(); o.scale = S({ x: 1, y: 1, z: 1 }); o.userData = {}; o.visible = true; return o; };
const THREE = new Proxy({}, { get(_, k) {
  if (k === 'Vector3' || k === 'Vector2') return function (x = 0, y = 0, z = 0) { return S({ x, y, z }); };
  if (/^(Group|Mesh|Object3D|Sprite|Points|InstancedMesh|PointLight|DirectionalLight|AmbientLight|HemisphereLight|Scene|PerspectiveCamera|Line|LineSegments)$/.test(k)) return function () { return mk(); };
  return S();
} });
const els = {};
const el = id => els[id] || (els[id] = (() => { const e = S(); e.style = {}; e.classList = { toggle() {}, add() {}, remove() {}, contains: () => false }; e.textContent = ''; e.addEventListener = () => {}; e.closest = () => null; e.getContext = () => S(); return e; })());
const store = {};
const ctx = {
  THREE, console, Math, JSON, Date, Object, Array, Number, String, Set, Map, Symbol, Promise, Infinity, NaN, isNaN, parseInt, parseFloat, Error,
  btoa: s => Buffer.from(s, 'binary').toString('base64'), atob: s => Buffer.from(s, 'base64').toString('binary'), escape, unescape, encodeURIComponent, decodeURIComponent,
  localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => store[k] = String(v), removeItem: k => delete store[k] },
  document: { getElementById: el, createElement: () => el('_c' + Math.random()), body: el('body'), querySelectorAll: () => [], querySelector: () => el('q'), addEventListener() {} },
  innerWidth: 375, innerHeight: 812, devicePixelRatio: 2, navigator: { vibrate() {}, clipboard: { writeText: async () => {} } },
  matchMedia: () => ({ matches: true }), getComputedStyle: () => ({ display: 'block', position: 'fixed' }), addEventListener() {}, requestAnimationFrame() {}, setTimeout() {}, clearTimeout() {}, setInterval() {}, performance: { now: () => 0 },
  location: { reload() {}, search: '' }, prompt() {}, alert() {}, confirm: () => false,
};
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
const pre = /^\/\/ SAVE (.*)$/m.exec(test);
if (pre) store['frost-town-save-v1'] = pre[1];
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const files = [...html.matchAll(/<script src="(js\/[^"]+)"/g)].map(m => m[1]).filter(f => !f.startsWith("js/lib/")); // three.js 用上面的假版本
let all = files.map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n;\n'); // 同一個 script 範圍（let/const 彼此看得到，跟瀏覽器一樣）
vm.runInContext(all + '\n;\n' + test, ctx, { filename: 'game+test' });
