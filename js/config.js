'use strict';
const VERSION = '1.36';

// ===== 數值（之後平衡都改這裡） =====
const CFG = {
  townScale: 1.35,         // 城鎮放大倍數（v0.60）：所有位置 ×這個數，建築大小不變 → 建築之間更寬
  speed: 6,                 // 主角移動速度
  chopRange: 1.9,           // 自動砍樹距離
  chopInterval: [0.45, 0.32, 0.22, 0.15], // 斧頭各等級的出手間隔（秒）
  treeRegrow: 12,           // 樹重新長出來的秒數
  capacity: [10, 20, 30, 45], // 背包各等級容量
  millTime: 0.6,            // 鋸木機每根木頭加工秒數
  logValue: 1,              // 一根木頭換幾元
  meatValue: 3,             // 一塊肉換幾元
  bearHp: 5, bearCount: 8, bearRespawn: 20, meatPerBear: 2, // v0.81（作者：北邊猛獸多）：北邊森林平常 8 隻熊
  lvBearHp: 0.3, lvBearDmg: 0.2, bearMax: 14, // 營火每升 1 級：熊血量 +30%、撞門／拆建築傷害 +20%；森林裡最多幾隻熊（企劃 10.1）
  kingHp: 5, kingDmg: 3, kingEvery: 3, kingMeat: 10, kingCash: 60, // v0.87 👑 熊王（企劃 10.1）：石爐時代每 3 波來一次，血是熊的 5 倍、撞門 3 倍；打倒掉 10 塊肉＋60 元
  wolfHp: 1, wolfSpeed: 4.4, wolfLv: 4, // 冰狼：石爐時代（營火 Lv4）起跟熊群一起來，一次 4～6 隻、跑很快、血少
  towerRange: 11, towerInterval: 1.1, // 弩砲塔射程與射速
  buildCool: 2,             // 升級完要等幾秒才能再升級
  labelNear: 11, labelMax: 6, // 名稱、價錢標籤：主角幾格內才顯示、最多同時幾個
  coldBase: 0.6, coldPerUnit: 0.25, coldMax: 4, // 野外寒冷：出了暖氣圈每秒掉 0.6 血，每遠 1 格多掉 0.25，最多每秒 4（寒潮時 ×1.5）
  playerHp: 100, bearHitDps: 14, bearChase: 6, heal: 20, // 主角血量、熊每秒打人多少、熊幾格內會追人、在營地裡每秒回血
  buildHp: 100, bearBuildDps: 2.5, // 建築血量、熊每秒對建築的傷害
  gateHp: 100, raidEvery: 60, raidFirst: 90, raidBears: 2, bearDps: 1.5, // 北門血量、熊群幾秒來一次、一次幾隻、每隻每秒傷害
  workerSpeed: 3.6, workerChop: 0.6, hunterLoad: 4, workerChopLv: [0.6, 0.48, 0.38, 0.3], workerLoadLv: [6, 8, 10, 12], // v0.84（作者：木頭不夠）：斧頭每升 1 級，伐木工也砍得更快；背包每升 1 級，伐木工也揹得更多（比主角少）
  // 伐木工：速度約主角 60%、煤礦工出手間隔；獵人一次揹幾塊肉（＝兩隻熊）；伐木工一開始一次揹 6 根（＝兩棵冷杉）
  hunterPrice: [80, 160, 260, 380], huntRange: 5, huntEvery: 1.2, // 獵人（v0.79）：第 1～4 個的價錢、幾格內開弓、幾秒射一箭（熊 5 血）
  payRate: 1.1, padDelay: 0.6, // padDelay：站在付款格上幾秒後才開始付錢             // 付款格：幾秒內付完整筆
  popBase: 2,               // 新遊戲一開始的居民（主角的夥伴）
  tentBeds: 3, tentPrice: [6, 10, 14], tentUpPrice: 30, // 帳篷：一頂幾張床；第 2～4 頂要揹幾根木頭來搭（第 1 頂一開始就有）；改建木屋的價錢（換成木頭 ×0.3）
  refEvery: 9, refCold: 3, refMax: 12, refLeave: 6, // 流民（v0.76）：平常每 9 秒來一個、寒潮時每 3 秒（逃難的變多）、隊伍最多 12 人、營火變弱時每 6 秒走掉一個
  perMeat: 5, meals: 3, leaveEvery: 15, // v0.79（作者）：每 5 位居民一餐吃 1 份烤肉、也才能雇 1 個工人；倉庫留幾餐的烤肉給居民，多的才給流民；床不夠時每 15 秒走掉一位沒工作的居民
  housePop: 5, housePrice: [25, 15], // 每間民房住幾人；民房價錢：第一間 25，之後每間多 15
  fuelMax: 100, fuelBurn: 0.4, fuelPerLog: 5, heat: [10, 17], // 火爐：柴滿 100、每秒燒 0.4、一根木頭 +5；暖氣圈半徑（最小、最大）
  stovePrice: [250], stoveBurn: 0.8, stoveHeat: 2, // 石爐 Lv4～6（領地 Lv3＋煤礦後）：Lv4 的價錢（Lv5、6 用🪨石材，stoneStove）、每級燒柴變成幾成、每級暖氣圈 +2
  terrPrice: [60, 150], terrNeedBuys: 3, // 營火升級（擴大領地）：Lv1 60 元（升級任意 3 個項目後出現）、Lv2 150 元（村莊＋開拓東邊後）
  minePrice: 100, coalHp: 4, coalPerRock: 3, coalRegrow: 2.5, fuelPerCoal: 20, // 煤礦坑（村莊＋領地 Lv1 解鎖）：價錢、敲幾下、掉幾塊、坑口煤層幾秒再露出來；一塊煤 = 火爐 +20（木頭只有 +5）
  snowEvery: 7, snowMax: 10, snowHp: 3, snowSlow: 0.45, shovelPrice: 60, // 雪堆（村莊開始）：幾秒積一堆、最多幾堆、鏟幾下、踩到剩幾成速度、鏟雪工價錢
  heaterPrice: 120, heaterR: 7, cell: 3, mill2Price: 80, grill2Price: 150, smithPrice: 200, coalValue: 6, storeMax: 150, pileMax: 12, // 倉庫每樣最多存多少；v0.82 做好的東西在建築門口最多堆幾個（等搬運工揹去倉庫）（木頭存滿，鋸木廠多做的才換錢）； // 鐵匠鋪：價錢、一塊煤打成工具賣幾元； 規劃模式：暖氣塔價錢、暖氣範圍半徑、格子大小；正式關：第二台鋸木機、第二座烤肉攤價錢
  quarrierPrice: [80, 160], stoneKeep: 60, stoneSell: 3, // v0.89 採石工（作者：沒有自動採石）：第 1、2 個價錢、倉庫留幾塊🪨，多的一塊賣幾元
  quarryPrice: 150, stoneHp: 5, stonePerRock: 2, stoneRegrow: 3, // v0.85 採石場（村莊＋開了煤礦＋有倉庫）：價錢、岩壁敲幾下、掉幾塊🪨石材、幾秒再露出來
  stoneHouse: 20, stoneBeds: 3, stoneStove: [40, 70], // v0.86 石材的用處：民房改建石屋（🪨 20，每間 +3 床）、石爐 Lv5／Lv6 升級改收🪨石材
  coalerPrice: [80, 160], coalerLoad: 6, coalKeep: 40, coalSell: 3, // v0.82 煤礦工（取代自動運輸）：第 1、2 個價錢、一次揹幾塊、倉庫留幾塊煤，多的一塊賣幾元
  counterMax: 6, smokePrice: 100, jerkyValue: 5, // v0.81（作者：肉太多）：櫃台最多擺幾份烤肉；燻肉架價錢（換成木頭 ×0.3）；一份肉乾賣流民幾元
  jerkyMax: 20, meatSell: 4, // v0.88：倉庫肉乾最多存 20 份；櫃台、燻肉架都滿時一份烤肉賣商隊 4 元
  plankKeep: 40,            // 倉庫的🪵木頭存到 40 塊（或下一間民房的價錢＋10）就夠，鋸木廠多做的換錢（v0.79，作者：有倉庫後錢沒來源）
  whLogs: 10, plankRate: 0.3, fuelKeep: 20, whFood: 10, eatEvery: 60, // 倉庫（第 2 時代）：揹幾根木頭蓋；建築價錢換成🪵木頭的比例（原本的錢 ×0.3）；倉庫留幾根木頭當柴（多的送鋸木廠）；蓋好送幾份食物；居民幾秒吃一餐
  cartPrice: 120, cartEvery: 4, cartLoad: 3, binMax: 20, // 雇礦工＋木軌礦車：價錢（換成木頭）、幾秒推出來一車、一車幾塊煤、煤堆最多幾塊
  gatePrice: 30, gateW: 3.6, gateMax: 4, // 自己開的圍欄門：價錢（換成木頭 ×0.3）、門寬、最多幾個
  buyPlank: [20, 60], buyStone: [10, 120], // v1.02 🛷 商隊（作者：錢很多不知道買什麼）：倉庫旁用錢買一批建材——20 木材 60 元，開了採石場再加 10 石材 120 元（賣出 1 元／根，買比賣貴）
  hordeWaves: 3, hordeGap: 15, hordeWarn: 30, hordeReward: 80, // v1.01 🐾 獸潮（營地→村莊前的遷徙天災）：幾波、每波打完隔幾秒、預告幾秒、撐過的獎金；最後一波帶熊王
  blizAt: 0.9, blizRetry: 60, blizWarn: 30, blizLen: 60, blizSnow: 5, blizMax: 20, blizSlow: 0.75, blizReward: 50, // v0.99 大暴雪（村莊開始）：居民到下一級的幾成時來、失敗後幾秒再來、預告幾秒、持續幾秒、積雪幾倍快、雪堆上限、主角走路剩幾成、撐過去的獎金
  coldFirst: 120, coldEvery: 150, coldLen: 30, coldBurn: 3, coldShrink: 0.75, coldWork: 0.95, coldReward: 30, // 寒潮（村莊開始）：第一次幾秒後、之後每幾秒、持續幾秒、火爐燒幾倍快、暖氣圈縮成幾成、撐過去的獎金 // 火爐升級（村莊解鎖）：暖氣圈最大半徑 +7
};
// 城市等級：人口到門檻就升級（藍圖見 docs/企劃評估.md 第 8 節）；houses＝這一級最多能蓋幾間民房
// cam＝鏡頭拉遠倍數；unlock＝升級卡片上列的新東西
// v1.34（作者：第二關要 300 人太多太長，這遊戲有 10 關，不要卡在一關太久）：升級門檻 20／80／300 → 12／30／60
const LEVELS = [
  { name: '營地', icon: '🏕️', need: 0, houses: 4, heaters: 0, cam: 1 },
  { name: '村莊', icon: '🏘️', need: 12, houses: 20, heaters: 1, cam: 1.25, unlock: ['🏠 民房上限 4 → 20 間', '🔥 營火升級 Lv2：領地再擴大（要先開拓東邊）', '🏗️ 規劃模式：民房、暖氣塔自己決定蓋在哪', '⛏️ 煤礦、🧹 鏟雪工、❄️ 寒潮', '🌨️ 大暴雪：每次要升級前來襲，撐過才能升級'] },
  { name: '小鎮', icon: '🏙️', need: 30, houses: 40, heaters: 4, cam: 1.45, unlock: ['🏠 民房上限 20 → 40 間', '🔥 暖氣塔最多 4 座'] },
  { name: '城市', icon: '🌆', need: 60, houses: 40, heaters: 4, cam: 1.6, unlock: ['🚧 城市的新玩法製作中，敬請期待'] },
];

const TS = CFG.townScale;
// 三種樹（作者 10/18）：木頭都是同一種資源，樹只差在 hp＝要砍幾下（砍的時間）、logs＝倒下掉幾根木頭
const WOODS = {
  fir: { name: '冷杉', hp: 3, logs: 3 },
  pine: { name: '松樹', hp: 2, logs: 2 },  // 軟、好砍
  birch: { name: '白樺', hp: 6, logs: 2 }, // 硬、砍很久；只長在森林外圍
};
const P = cash => Math.ceil(cash * CFG.plankRate); // 建築用木頭蓋（企劃 11.3）：原本的價錢換成幾塊🪵木頭
// 領地等級：營火升級一次，圍欄往外推（r＝圍欄半徑）、暖氣圈變大（heat）、鏡頭拉遠一點（cam）
const TERR = [ { r: 10 * TS, heat: 0, cam: 1.15 }, { r: 14 * TS, heat: 3, cam: 1.28 }, { r: 18.5 * TS, heat: 7, cam: 1.42 } ];
// 地塊配置（作者 10/17 第二次回饋：每個建築、付款格都有自己的位置，不互擋）
// v0.64（作者 10/18）：升級格放在它升級的東西旁邊——營火升級貼著營火、雇伐木工在倉庫旁（木頭送倉庫）、雇鏟雪工在村民櫃台旁
// 營火廣場在 (0,-3)；N-S 主路 x≈0；東路 z≈0；民房在南邊一圈圈的地塊上，門朝營火
const LOT = {
  bag: [-2.8, -5.6], axe: [2.8, -5.6], terr: [-1.9, -1.2], worker: [8.7, 2.3], porter: [8.7, 3.9], hunter: [-6.3, 0], shovel: [-1.9, 6.6], store: [6.7, 3.1], tower1: [4.4, 0], tower2: [-4.4, 0],
  mill: [6.4, -4], bbq: [2.7, 6.3],
};
for (const k in LOT) if (!/^tower/.test(k)) LOT[k] = LOT[k].map(v => +(v * TS).toFixed(2)); // 弩砲塔付款格貼著北門兩側（門寬不變），x 不放大；z 跟著圍欄（towerPadZ）
// v1.29（作者：下面都是住宅區、上面很空，升級不要一區空一區擠）：民房改成南北東西輪流蓋——順序是 南東、南西、東、西、東北…，每升一級四面都長一點；
// 座標都是避開鋸木廠、倉庫、礦坑、採石場、北門塔之後留下的空地（用畫面檢查驗過）；第 1 圈 6 間（Lv1 領地）、第 2 圈 10 間（Lv2 領地）
const HOUSE_LOTS = [
  [6.62, 14.19, 1], [-6.62, 14.19, 1], [12.83, 8.98, 1], [-12.83, 8.98, 1], [10.5, -14, 1], [16.5, -12, 1],
  [9.93, 19.49, 2], [-9.93, 19.49, 2], [-9.5, -15, 2], [20.5, 0, 2], [16.51, 14.35, 2], [-16.51, 14.35, 2], [16.5, -18.5, 2], [10.5, -21, 2], [21, -6.5, 2], [-13.46, 17.23, 2],
].map(([x, z, ring]) => ({ x, z, ring }));
const MINE = { x: -11.9 * TS, z: -1.9 * TS }; // 煤礦坑的山（西邊，第 1 次擴大領地後圈進來）；坑口朝東
LOT.minePad = LOT.cart = [+(MINE.x + 4.1).toFixed(2), +(MINE.z - 0.55).toFixed(2)];
const QUARRY = { x: -12.4 * TS, z: -8.6 * TS }; // v0.85 採石場：煤礦坑北邊、圍欄裡；切開的岩壁朝東
LOT.quarry = [+(QUARRY.x + 4.6).toFixed(2), +(QUARRY.z + 1.6).toFixed(2)];
LOT.quarrier = [+(QUARRY.x + 4.6).toFixed(2), +(QUARRY.z - 1.2).toFixed(2)]; // v0.89 雇用採石工：開採石場格子的北邊
LOT.coaler = [+(MINE.x + 4.1).toFixed(2), +(MINE.z - 3.7).toFixed(2)]; // v0.82 雇用煤礦工：煤堆北邊 // v0.81（作者：礦場的格子不在附近）：開採、礦車格都在坑口前（之後煤堆的位置）

// ===== 存檔 =====
// 關卡（企劃 9.2）：教學關沿用原本的存檔；正式關（自己蓋／電腦託管）各有自己的存檔
const MODE_KEY = 'frost-town-mode';
// 作者 10/17：拿掉正式關，只留一關；自己選位置改成右下「規劃」（上帝視角）
const MODE = 'tutorial', firstRun = false;
const PRO = MODE !== 'tutorial';
const SAVE_KEY = 'frost-town-save-v1' + (PRO ? '-' + MODE : '');
let hadSave = false; try { hadSave = !!localStorage.getItem(SAVE_KEY); } catch (e) {}
let save = { cash: 0, bag: 0, axe: 0, east: false, mill2: false, tower: false, workers: 0, level: 0, houses: 0, stove: 0 };
try { Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); } catch (e) {}
if (save.plan && !save.scaled) {                                // v0.60 前的存檔：規劃蓋的、搬過的建築位置跟著城鎮放大
  save.plan.forEach(p => { p.x *= TS; p.z *= TS; });
  for (const k in save.moved || {}) save.moved[k] = save.moved[k].map(v => v * TS);
}
save.scaled = TS;
if (save.stage == null) save.stage = hadSave ? 2 : 1;
// v1.35（作者 10/28）：第 2 關只玩到村莊（居民 12＋撐過獸潮）就遷徙；已經玩過第 2 關後半（村莊以上）的舊存檔直接當第 3 關開頭，錢和居民（折半、最多 5）、倉庫 2 成材料帶過去
if (save.stage === 2 && save.level >= 1 && !/check/.test(location.search)) {
  const old = save.store || {}, res = save.res != null ? save.res : 10;
  save.stage = 3; save.arrive = true; save.s3 = save.s3 || { pop: Math.max(3, Math.min(5, Math.floor(res / 2))), store: { plank: 12 + Math.floor((old.plank || 0) * 0.2), stone: Math.floor((old.stone || 0) * 0.2), coal: 10 + Math.floor((old.coal || 0) * 0.2), smoked: 0 } };
}   // v1.16：新玩家從第 1 關冰湖營地開始；舊存檔當第 2 關（森林營地）
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


// 分區（企劃 9.1）：民房區＝南邊 z > 3；防禦區＝北邊熊來的方向 z < -12；工業區＝西邊煤礦那側 x < -7；其他是加工區。v0.94 起鐵匠鋪、升級格也照分區放，不會跑進民房區
const zoneOf = (x, z) => z > 3 * TS ? 'house' : z < -12 * TS ? 'def' : x < -7 * TS ? 'ind' : 'work';
