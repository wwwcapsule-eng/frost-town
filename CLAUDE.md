# 寒霜小鎮（暫名）— 專案規則

寒地揹物堆疊經營遊戲：親手做 → 雇人做 → 規劃城市。企劃見 `docs/企劃評估.md`。

## 技術
- Three.js r128（v0.90 起放在 `js/lib/`，離線也能玩；`sw.js` 讓網頁版第一次上網後可離線開），不需要建置：`index.html` 只放畫面版面，程式在 `js/`，用一般 `<script>` 依序載入（config → world → buildings → plan → player → main），變數彼此共用
- 新程式放進對應的 `js/` 檔；某個檔一載入就要用的函式，要寫在同一個檔或更前面的檔（拆檔後函式不會跨檔提前可用）
- 本機試玩：`node tools/serve.js` 後開 http://localhost:8080
- 3D 模型只用 CC0 素材（Kenney、Quaternius）或自製，放 `assets/`
- 不使用《寒霜啟示錄》的名稱、角色、美術、介面

## 平台
- **主機是手機**（直式、單指浮動搖桿）；電腦也能玩（WASD／方向鍵，或滑鼠拖曳）
- 設計、介面大小、效能一律以手機為準；電腦版只要能玩、不壞

## 版本規則
- 版本號寫在 `js/config.js` 的 `const VERSION = '0.01'`，每次更新 +0.01，並在 `docs/更新紀錄.md` 加一行
- **每 5 版**：合併進 main 時版本號跨過 0.05、0.10、0.15…（一次合併好幾版也算），GitHub Actions 會自動發布到 GitHub Pages：https://wwwcapsule-eng.github.io/frost-town/
- **每 10 版**（0.10、0.20…）要做一次電腦版檢查：在電腦瀏覽器用鍵盤、滑鼠實測，有問題就修，結果寫進更新紀錄
- **每次開 PR 前跑畫面檢查**：本機開 http://localhost:8080/?check （手機尺寸 375×812），console 用 `layoutCheck.preset(0～3)` 換 4 種進度各跑一次，結果要是「沒有問題」；新增建築、付款格、標籤時，如果新進度沒被涵蓋，就在 `tools/layout-check.js` 的 PRESETS 加一個
- 標籤一律用 `makeLabel`（會自動避讓）；不要另外用 HTML 疊在 3D 畫面上
- 每次改動都開新分支 → PR（繁體中文說明）→ 由作者合併，不直接改 main
