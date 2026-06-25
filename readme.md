# 臺灣綠生活資訊站

這是一個專為教學與生活觀察設計的自動化數據儀表板，旨在整合環境部（MOENV）的開放資料，透過 Python 爬蟲進行數據清洗與統計，並以直觀、輕量化的網頁介面呈現臺灣各縣市的環保生活量能。

## 🌟 專案核心特色

*   **自動化數據驅動**：利用 Python 定時抓取政府 API 數據，並透過 GitHub Actions 進行自動更新。
*   **隱私與彈性並重**：部分網頁提供「使用者上傳模式」，讓教學者或使用者能針對特定區域的 Excel/CSV 資料進行即時上傳與視覺化，不依賴固定 API，增加資料處理的靈活性。
*   **極致效能優化**：前端僅加載包含縣市統計數值的輕量化 JSON，不儲存任何店家明細，大幅提升手機載入速度並降低瀏覽器負擔。
*   **職場應用導向**：模組化的代碼結構（HTML/CSS/JS 分離）便於後續擴充，適合用於社會人士或學生觀察與研究。

## 📊 核心模組介紹

### 1. 基礎生活場域查詢
*   **環境教育設施**：完整收錄全臺合格場域，並內建證書過濾器（即將到期/已過期提醒）。
*   **綠食飯桌 (餐廳)**：支援使用者上傳由政府開放平臺下載的原始資料（JSON/CSV），透過前端解析邏輯，即時產出該縣市的分佈密度排行榜與明細清單。
*   **綠色商店**：支援使用者上傳由政府開放平臺下載的原始資料（JSON/CSV），透過前端解析邏輯，即時產出該縣市的分佈密度排行榜與明細清單。
*   **環保旅宿**：支援使用者上傳由政府開放平臺下載的原始資料（JSON/CSV），透過前端解析邏輯，即時產出該縣市的分佈密度排行榜與明細清單。

### 2. 進階視覺化儀表板
*   **全國環保集點分析 (NEW)**：動態整合全臺環保集點註冊與有效會員數據。具備「宏觀排行榜」與「微觀縣市清單」的鑽取視圖 (Drill-down)，並內建直覺的會員加總動態看板與分頁渲染功能。
*   **綠色夥伴響應統計**：將超過 20,000 筆響應資料視覺化，內建 Chart.js 歷年圓餅圖與年度增減指標，並整合 `html2canvas` 支援一鍵匯出高畫質 PNG 報告圖片。
*   **國家企業環保獎榮譽榜**：提供三層級鑽取視圖（全臺總覽 ➔ 縣市戰績 ➔ 單屆明細），並透過前端 JS 進行智慧企業名稱清洗合併，搭配專屬獎項顏色標籤呈現歷屆戰力。

---

## 📁 專案架構 (Directory Tree)
```text
Env_Dashboard/
│
├── index.html               (主頁：六都捷徑與總覽)
├── facilities.html          (子頁：全臺環境教育設施查詢)
├── stores.html              (子頁：綠色商店)
├── restaurants.html         (子頁：綠色餐廳)
├── accommodations.html      (子頁：環保旅宿)
├── partners.html            (子頁：綠色夥伴互動圖表)
├── awards.html              (子頁：國家企業環保獎)
├── green_points.html        (子頁：全國環保集點特約機構分析)
│
├── scraper.py               (Python 機器人：基礎設施資料抓取)
├── partners_spider.py       (Python 機器人：綠色夥伴資料清洗與統計)
├── fetch_dates.py           (Python 機器人：更新日期同步)
├── scraper_green_points.py  (Python 機器人：環保集點數據彙整與行列轉換)
│
├── css/
│   ├── global_style.css     (共用：導覽列、色彩、RWD 基礎)
│   ├── main_style.css       (專屬：首頁 Grid 佈局)
│   └── facilities_style.css (專屬：表格樣式與手機版卡片式折疊設計)
│
├── js/
│   ├── global_script.js     (共用：導覽列 Active 狀態切換)
│   ├── main_script.js       (專屬：首頁參數傳遞跳轉)
│   ├── facilities_script.js (專屬：設施狀態運算與視圖切換)
│   ├── stores_script.js     (專屬：商店資料渲染)
│   ├── restaurants_script.js(專屬：餐廳資料渲染)
│   ├── accommodations_script.js (專屬：旅宿資料渲染)
│   ├── partners_script.js   (專屬：互動圓餅圖與資料動態生成)
│   ├── awards_script.js     (專屬：環保獎多層級視圖切換與標籤渲染)
│   └── green_points_script.js (專屬：環保集點動態看板與分頁清單渲染)
│
├── data/
│   ├── facilities.json      (自動生成：設施最新數據)
│   ├── partners_summary.json(自動生成：綠色夥伴輕量化統計)
│   ├── awards_summary.json  (自動生成：環保獎歷屆統計與明細數據)
│   └── green_points.json    (自動生成：環保集點會員統計與縣市名單)
│
└── .github/workflows/
    └── update.yml           (GitHub Actions：每週自動化排程設定)

架構細節備註：
scraper 系列 .py：專案的心臟，負責發送 API 請求、執行連鎖關鍵字過濾及數據匯總統計。

data/：存放由爬蟲產出的統計結果。資料採兩階段分流：JSON 包含彙總統計以確保極速載入排名，同時保留結構化明細供縣市深度查詢。

css/facilities_style.css：包含專為移動裝置設計的「卡片式折疊」邏輯，確保在校園舊款硬體或手機上都能一目了然。

🛠️ 技術棧 (Tech Stack)
語言：Python 3.x (數據抓取、清洗、統計)

網頁開發：原生 HTML5, CSS3 (Flexbox/Grid), JavaScript (ES6+ Fetch API, Chart.js, html2canvas)

資料格式：JSON

自動化：GitHub Actions

File API 應用：實作客戶端檔案讀取，確保數據在進入瀏覽器時即時處理，無需經過後端伺服器，保障數據安全性。
