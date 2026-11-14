'use strict';
// ===== 世界地圖（v1.47，作者 11/14）：選單 → 🗺️，或開遊戲時（玩到第 2 關以後）先看到 =====
// 一條由下往上的雪地小路，一關一個圓點。點開放的關卡：▶ 繼續（回到上次離開的樣子）或 🔄 重玩（從那一關開場重來）。
// 存檔怎麼分關、遷徙怎麼更新下一關，見 config.js 的 world／migrateTo。
(() => {
  const NODES = [['🧊', '冰湖營地'], ['🌲', '森林營地'], ['⛰️', '石器村莊'], ['🧱', '河谷（製作中）'], ['❔', '？？？']];
  const W = 250, GAP = 76, H = NODES.length * GAP + 10;
  const at = i => [W / 2 + (i % 2 ? 58 : -58), H - 52 - i * GAP];           // 第 i 個圓點的位置：左右交錯往上
  const trail = $('wmTrail'), sheet = $('wmSheet');
  let sel = save.stage;
  const btn = (html, fn, bg) => { const b = document.createElement('button'); b.innerHTML = html; if (bg) b.style.background = bg; b.onclick = fn; sheet.appendChild(b); };
  function draw() {
    trail.style.height = H + 'px';
    trail.innerHTML = '<svg width="' + W + '" height="' + H + '"><polyline fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-dasharray="1 18" points="' + NODES.map((_, i) => at(i).join(',')).join(' ') + '"/></svg>';
    NODES.forEach(([icon, name], i) => {
      const n = i + 1, [x, y] = at(i), open = n <= world.max && n <= LAST_STAGE, b = document.createElement('button'), s = document.createElement('span');
      b.textContent = open ? icon : '🔒'; b.className = (open ? '' : 'lock') + (n === save.stage ? ' cur' : '') + (n === sel ? ' sel' : '');
      b.style.left = s.style.left = x + 'px'; b.style.top = y + 'px'; s.style.top = y + 34 + 'px';
      b.setAttribute('aria-label', '第 ' + n + ' 關 ' + name); b.disabled = !open; b.onclick = () => { sel = n; draw(); };
      s.textContent = n + '. ' + name + (n === save.stage ? '（現在）' : '');
      trail.append(b, s);
    });
    const n = sel, here = n === save.stage, saved = here || !!world.now[n];
    sheet.innerHTML = '<b>第 ' + n + ' 關　' + NODES[n - 1][1] + '</b>';
    if (here) btn('▶ 繼續玩', close);
    else if (saved) btn('▶ 繼續<small>回到上次離開的樣子</small>', () => continueStage(n));
    if (here && save.cleared && n < LAST_STAGE) btn('🧳 出發去第 ' + (n + 1) + ' 關<small>重新選 3 樣帶走</small>', () => {
      if (!confirm('出發後，第 ' + (n + 1) + ' 關會用新帶的東西重新開始，原本第 ' + (n + 1) + ' 關的進度會清掉。確定嗎？')) return;
      close(); n === 1 ? stage1.depart() : depart2();
    });
    btn('🔄 從頭重玩這一關', () => { if (!saved || confirm('第 ' + n + ' 關會從開場重來，這一關現在的進度會清掉（其他關不受影響）。確定嗎？')) replayStage(n); }, '#eee');
    sheet.insertAdjacentHTML('beforeend', '<small style="margin-top:8px">回前面的關卡玩，不會改變後面的關；過關後再「出發」一次，下一關才會換成新帶的東西。</small>');
  }
  function open() { showMenu(false); sel = save.stage; draw(); $('wmap').style.display = 'flex'; paused = true; }
  function close() { $('wmap').style.display = 'none'; paused = false; clock.getDelta(); }
  $('menuMap').onclick = open; $('wmClose').onclick = close;
  let skip = false; try { skip = !!sessionStorage.getItem('frost-town-skip-map'); sessionStorage.removeItem('frost-town-skip-map'); } catch (e) {}
  if (world.max >= 2 && !skip && !save.arrive && !/check/.test(location.search)) open();   // 開遊戲先看地圖（剛從地圖選完、遷徙剛到、畫面檢查時不跳）
  window.__game.worldMap = { open, close, draw };
})();
