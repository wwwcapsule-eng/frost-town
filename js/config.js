'use strict';
const VERSION = '0.69';

// ===== 數值（之後平衡都改這裡） =====
const CFG = {
  townScale: 1.35,         // 城鎮放大倍數（v0.60）：所有位置 ×這個數，建築大小不變 → 建築之間更寬
  speed: 6,                 // 主角移動速度
  chopRange: 1.9,           // 自動砍樹距離
  chopInterval: [0.45, 0.32, 0.22, 0.15], // 斧頭各等級的出手間隔（秒）
  treeHp: 3,
  logsPerTree: 3,
  treeRegrow: 12,           // 樹重新長出來的秒數
  capacity: [10, 20, 30, 45], // 背包各等級容量
  millTime: 0.6,            // 鋸木機每根木頭加工秒數
  logValue: 1,              // 一根木頭換幾元
  meatValue: 3,             // 一塊肉換幾元
  bearHp: 5, bearCount: 5, bearRespawn: 20, meatPerBear: 2,
  lvBearHp: 0.3, lvBearDmg: 0.2, bearMax: 12, // 營火每升 1 級：熊血量 +30%、撞門／拆建築傷害 +20%；森林裡最多幾隻熊（企劃 10.1）
  wolfHp: 1, wolfSpeed: 4.4, wolfLv: 4, // 冰狼：石爐時代（營火 Lv4）起跟熊群一起來，一次 4～6 隻、跑很快、血少
  towerRange: 11, towerInterval: 1.1, // 弩砲塔射程與射速
  buildCool: 2,             // 升級完要等幾秒才能再升級
  labelNear: 11, labelMax: 6, // 名稱、價錢標籤：主角幾格內才顯示、最多同時幾個
  coldBase: 0.6, coldPerUnit: 0.25, coldMax: 4, // 野外寒冷：出了暖氣圈每秒掉 0.6 血，每遠 1 格多掉 0.25，最多每秒 4（寒潮時 ×1.5）
  playerHp: 100, bearHitDps: 14, bearChase: 6, heal: 20, // 主角血量、熊每秒打人多少、熊幾格內會追人、在營地裡每秒回血
  buildHp: 100, bearBuildDps: 2.5, // 建築血量、熊每秒對建築的傷害
  gateHp: 100, raidEvery: 60, raidFirst: 90, raidBears: 2, bearDps: 1.5, // 北門血量、熊群幾秒來一次、一次幾隻、每隻每秒傷害
  workerSpeed: 3.6, workerChop: 0.6, workerLoad: 6, // 伐木工：速度約主角 60%、出手間隔、一次揹幾根
  payRate: 1.1, padDelay: 0.6, // padDelay：站在付款格上幾秒後才開始付錢             // 付款格：幾秒內付完整筆
  popBase: 2,               // 一開始的人口（主角和夥伴），每個伐木工 +1
  housePop: 5, housePrice: [25, 15], // 每間民房住幾人；民房價錢：第一間 25，之後每間多 15
  fuelMax: 100, fuelBurn: 0.4, fuelPerLog: 5, heat: [10, 17], // 火爐：柴滿 100、每秒燒 0.4、一根木頭 +5；暖氣圈半徑（最小、最大）
  stovePrice: [250, 400, 600], stoveBurn: 0.8, stoveHeat: 2, // 石爐 Lv4～6（領地 Lv3＋煤礦後）：價錢、每級燒柴變成幾成、每級暖氣圈 +2
  terrPrice: [60, 150], terrNeedBuys: 3, // 營火升級（擴大領地）：Lv1 60 元（升級任意 3 個項目後出現）、Lv2 150 元（村莊＋開拓東邊後）
  minePrice: 100, coalHp: 4, coalPerRock: 2, coalRegrow: 20, fuelPerCoal: 20, // 煤礦（村莊解鎖）：價錢、敲幾下、掉幾塊、幾秒長回來；一塊煤 = 火爐 +20（木頭只有 +5）
  snowEvery: 7, snowMax: 10, snowHp: 3, snowSlow: 0.45, shovelPrice: 60, // 雪堆（村莊開始）：幾秒積一堆、最多幾堆、鏟幾下、踩到剩幾成速度、鏟雪工價錢
  heaterPrice: 120, heaterR: 7, cell: 3, mill2Price: 80, grill2Price: 150, smithPrice: 200, coalValue: 6, truckPrice: 150, truckEvery: 4, storeMax: 150, // 自動運輸：價錢、每幾秒送一趟、倉庫每樣最多存多少（木材存滿，鋸木廠多做的才換錢）； // 鐵匠鋪：價錢、一塊煤打成工具賣幾元； 規劃模式：暖氣塔價錢、暖氣範圍半徑、格子大小；正式關：第二台鋸木機、第二座烤肉攤價錢
  whLogs: 10, plankRate: 0.3, fuelKeep: 20, foodKeep: 20, whFood: 10, eatEvery: 90, // 倉庫（第 2 時代）：揹幾根木頭蓋；建築價錢換成🧱木材的比例（原本的錢 ×0.3）；倉庫留幾根木頭當柴（多的送鋸木廠）；存多少烤肉（多的才賣村民）；蓋好送幾份食物；工人幾秒吃一次
  gatePrice: 30, gateW: 3.6, gateMax: 4, // 自己開的圍欄門：價錢（換成木材 ×0.3）、門寬、最多幾個
  coldFirst: 120, coldEvery: 150, coldLen: 30, coldBurn: 3, coldShrink: 0.75, coldReward: 30, // 寒潮（村莊開始）：第一次幾秒後、之後每幾秒、持續幾秒、火爐燒幾倍快、暖氣圈縮成幾成、撐過去的獎金 // 火爐升級（村莊解鎖）：暖氣圈最大半徑 +7
};
// 城市等級：人口到門檻就升級（藍圖見 docs/企劃評估.md 第 8 節）；houses＝這一級最多能蓋幾間民房
// cam＝鏡頭拉遠倍數；unlock＝升級卡片上列的新東西
const LEVELS = [
  { name: '營地', icon: '🏕️', need: 0, houses: 4, heaters: 0, cam: 1 },
  { name: '村莊', icon: '🏘️', need: 20, houses: 20, heaters: 1, cam: 1.25, unlock: ['🏠 民房上限 4 → 20 間', '🔥 營火升級 Lv2：領地再擴大（要先開拓東邊）', '🏗️ 規劃模式：民房、暖氣塔自己決定蓋在哪', '⛏️ 煤礦、🧹 鏟雪工、❄️ 寒潮'] },
  { name: '小鎮', icon: '🏙️', need: 80, houses: 40, heaters: 4, cam: 1.45, unlock: ['🏠 民房上限 20 → 40 間', '🔥 暖氣塔最多 4 座'] },
  { name: '城市', icon: '🌆', need: 300, houses: 40, heaters: 4, cam: 1.6, unlock: ['🚧 城市的新玩法製作中，敬請期待'] },
];

const TS = CFG.townScale;
const P = cash => Math.ceil(cash * CFG.plankRate); // 建築用木材蓋（企劃 11.3）：原本的價錢換成幾塊🧱木材
// 領地等級：營火升級一次，圍欄往外推（r＝圍欄半徑）、暖氣圈變大（heat）、鏡頭拉遠一點（cam）
const TERR = [ { r: 10 * TS, heat: 0, cam: 1.15 }, { r: 14 * TS, heat: 3, cam: 1.28 }, { r: 18.5 * TS, heat: 7, cam: 1.42 } ];
// 地塊配置（作者 10/17 第二次回饋：每個建築、付款格都有自己的位置，不互擋）
// v0.64（作者 10/18）：升級格放在它升級的東西旁邊——營火升級貼著營火、雇伐木工在倉庫旁（木頭送倉庫）、雇鏟雪工在村民櫃台旁
// 營火廣場在 (0,-3)；N-S 主路 x≈0；東路 z≈0；民房在南邊一圈圈的地塊上，門朝營火
const LOT = {
  bag: [-2.8, -5.6], axe: [2.8, -5.6], terr: [-1.9, -1.2], worker: [6.7, 1.4], porter: [4.3, 3.1], shovel: [-1.9, 6.6], store: [6.7, 3.1], tower1: [3.6, -7.4], tower2: [-3.6, -7.4],
  mill: [6.4, -4], mill2: [-6.4, -4], bbq: [2.7, 6.3], minePad: [-8, 3], truckCash: [-8, 3], truckStore: [-8.6, -0.4],
};
for (const k in LOT) if (!/^tower/.test(k)) LOT[k] = LOT[k].map(v => +(v * TS).toFixed(2)); // 弩砲塔貼著北門（門寬不變），不放大
const HOUSE_LOTS = [];                    // 第 1 圈 6 間（Lv1 領地），第 2 圈 10 間（Lv2 領地）
[[11.6 * TS, [35, 50, 65, 115, 130, 145], 1], [16.2 * TS, [30, 41, 52, 63, 74, 106, 117, 128, 139, 150], 2]].forEach(([r, angs, ring]) =>
  angs.forEach(a => HOUSE_LOTS.push({ x: +(Math.cos(a * Math.PI / 180) * r).toFixed(2), z: +(Math.sin(a * Math.PI / 180) * r).toFixed(2), ring })));
const ROCK_LOTS = [[-11.2, -0.6], [-10.2, 2.2], [-11.6, -3.4], [-9.9, -6.2], [-12, 1]].map(p => p.map(v => v * TS)); // 煤礦區（西邊，第 1 次擴大領地後圈進來）

// ===== 存檔 =====
// 關卡（企劃 9.2）：教學關沿用原本的存檔；正式關（自己蓋／電腦託管）各有自己的存檔
const MODE_KEY = 'frost-town-mode';
// 作者 10/17：拿掉正式關，只留一關；自己選位置改成右下「規劃」（上帝視角）
const MODE = 'tutorial', firstRun = false;
const PRO = MODE !== 'tutorial';
const SAVE_KEY = 'frost-town-save-v1' + (PRO ? '-' + MODE : '');
let save = { cash: 0, bag: 0, axe: 0, east: false, mill2: false, tower: false, workers: 0, level: 0, houses: 0, stove: 0 };
try { Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); } catch (e) {}
if (save.plan && !save.scaled) {                                // v0.60 前的存檔：規劃蓋的、搬過的建築位置跟著城鎮放大
  save.plan.forEach(p => { p.x *= TS; p.z *= TS; });
  for (const k in save.moved || {}) save.moved[k] = save.moved[k].map(v => v * TS);
}
save.scaled = TS;
if (save.territory == null) save.territory = save.furnace ? (save.east ? 2 : 1) : 0;          // 舊進度：火爐升級過就當作領地擴大過
if (save.buys == null) save.buys = (save.bag || 0) + (save.axe || 0) + (save.tower ? 1 : 0) + (save.tower2 ? 1 : 0) + (save.workers || 0) + (save.east ? 1 : 0) + (save.mill2 ? 1 : 0);
let resetting = false; // 重新開始時不要再把舊進度寫回去
function writeSave() { if (resetting) return; try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }
function wipeAndReload() { resetting = true; try { localStorage.removeItem(SAVE_KEY); } catch (e) {} location.reload(); }
document.getElementById('retry').onclick = wipeAndReload;
// 存檔碼（企劃 9.4）：手機瀏覽器可能清掉存檔，玩家可以把進度抄成一段文字、換手機或清掉後貼回來
document.getElementById('saveCode').onclick = () => {
  writeSave();
  const code = btoa(unescape(encodeURIComponent(JSON.stringify(save))));
  try { navigator.clipboard.writeText(code).catch(() => {}); } catch (e) {} // 不能複製也沒關係，畫面上看得到
  const got = prompt('這是你的存檔碼（已試著複製），請存在記事本。\n要讀取別的進度：把存檔碼貼在下面、按確定。', code);
  if (!got || got.trim() === code) return;
  let data;
  try { data = JSON.parse(decodeURIComponent(escape(atob(got.trim())))); } catch (e) {}
  if (!data || typeof data !== 'object' || Array.isArray(data) || typeof data.cash !== 'number') { alert('存檔碼看不懂，請確認有完整貼上。'); return; }
  resetting = true; try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) {} location.reload();
};
document.getElementById('menuReset').onclick = () => {
  if (confirm('確定要清除這一關的進度、重新開始嗎？')) { resetting = true; try { localStorage.removeItem(SAVE_KEY); } catch (e) {} location.reload(); }
};

