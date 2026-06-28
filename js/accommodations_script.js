// 1. 抓取自訂視窗的 DOM 元素
const customModal = document.getElementById('custom-modal');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalCloseBtn = document.getElementById('modal-close-btn');

// 2. 建立一個呼叫視窗的函數
function showAlert(title, message) {
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    // 使用 flex 讓視窗出現並自動置中
    customModal.style.display = 'flex';
}

// 3. 綁定關閉按鈕事件
modalCloseBtn.addEventListener('click', () => {
    customModal.style.display = 'none';
});

// (選用) 點擊視窗外圍的半透明黑色區域，也可以關閉視窗
customModal.addEventListener('click', (e) => {
    if (e.target === customModal) {
        customModal.style.display = 'none';
    }
});

document.addEventListener("DOMContentLoaded", () => {
    // 1. 取得 DOM 元素
    const fileUpload = document.getElementById('file-upload');
    const triggerUploadBtn = document.getElementById('trigger-upload');
    const uploadStatus = document.getElementById('upload-status');
    const updateDate = document.getElementById('update-date');

    const controlPanel = document.getElementById('control-panel');
    const cityDropdown = document.getElementById('city-dropdown');

    const overviewView = document.getElementById('overview-view');
    const detailView = document.getElementById('detail-view');
    const rankingTableBody = document.getElementById('ranking-table-body');
    const totalStats = document.getElementById('total-stats');
    const initialPrompt = document.getElementById('initial-prompt');

    // 全域變數：儲存解析後的 Excel 資料，方便後續切換縣市時直接使用
    let globalJsonData = [];
    let currentCity = 'all';
    // ==========================================
    // 修改後的快取檢查邏輯 (永久有效，除非有新版)
    // ==========================================
    const CACHE_KEY = 'eco_accommodations_data';
    // 移除 CACHE_EXPIRY_MS

    function checkCache() {
        const cachedString = localStorage.getItem(CACHE_KEY);
        if (cachedString) {
            try {
                const cachedData = JSON.parse(cachedString);

                // 直接使用快取資料
                globalJsonData = cachedData.data;

                // 更新 UI，顯示使用快取
                uploadStatus.textContent = "✅ 已載入伺服器最新資料";

                controlPanel.style.display = "flex";
                overviewView.style.display = "block";
                detailView.style.display = "none";

                currentCity = 'all';
                cityDropdown.value = 'all';
                renderRankingTable();

                // 如果有儲存時間，更新畫面上的時間
                if (cachedData.lastUpdated) {
                    updateDate.textContent = cachedData.lastUpdated;
                }

                return true;
            } catch (e) {
                console.error("讀取快取失敗，將重新下載", e);
                localStorage.removeItem(CACHE_KEY);
            }
        }
        return false;
    }
    // 🌟 修改：主動從伺服器抓取檔案的函式（加入最後修改時間偵測）
    async function autoLoadFromServer() {
        const filePath = './環保旅宿_Selenium結果.xlsx';

        try {
            const response = await fetch(filePath);
            if (!response.ok) throw new Error('伺服器上找不到檔案');

            // 📡 關鍵新增：從伺服器回應標頭中，抓取檔案最後修改時間
            const lastModifiedHeader = response.headers.get('Last-Modified');
            let fileDateString = null;

            if (lastModifiedHeader) {
                const fileDate = new Date(lastModifiedHeader);
                // 轉為標準的 YYYY-MM-DD 格式
                fileDateString = `${fileDate.getFullYear()}-${String(fileDate.getMonth() + 1).padStart(2, '0')}-${String(fileDate.getDate()).padStart(2, '0')}`;
            }

            const arrayBuffer = await response.arrayBuffer();

            // 將抓到的「真實檔案日期」當作第三個參數傳入
            processDataBuffer(arrayBuffer, "✅ 已同步伺服器最新資料", fileDateString);

        } catch (error) {
            console.log("自動載入失敗，可能檔案尚未產出。請點擊按鈕手動更新。", error);
            uploadStatus.textContent = "💡 建議上傳名單以啟動分析";
        }
    }

    // 修改原本的啟動流程
    // 優先順序：1. 檢查本機有沒有快取資料 2. 沒有的話就去伺服器抓
    if (!checkCache()) {
        autoLoadFromServer();
    } else {
        // 即便有快取，我們也可以在背景偷偷更新一次，確保使用者看到的是最新的
        autoLoadFromServer();
    }

    // 網頁一載入，馬上執行快取檢查
    checkCache();
    // ==========================================

    // 🌟 修改：支援接收真實檔案日期的解析函式
    function processDataBuffer(buffer, successMessage, fileDate = null) {
        uploadStatus.textContent = "⏳ 讀取與分析中，請稍候...";
        if (initialPrompt) initialPrompt.style.display = "none";

        try {
            // 把二進位資料轉換為 SheetJS 看得懂的格式
            const data = new Uint8Array(buffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            // 🌟 加入 raw: false，強制讓 Excel 裡的所有日期數字都轉成純文字，避免當機！
            const rawJsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "", raw: false });

            // 🌟 新增：自動點亮左上角進度指示燈
            if (rawJsonData.length > 0) {
                const firstRow = rawJsonData[0];
                const hasDateColumn = ('證書到期日' in firstRow) || ('到期日' in firstRow);
                const step1El = document.getElementById('status-step1');
                const step2El = document.getElementById('status-step2');

                if (step1El && step2El) {
                    step1El.innerHTML = '✅ 1. 旅宿名單';
                    step1El.style.color = '#059669';

                    if (hasDateColumn) {
                        step2El.innerHTML = '✅ 2. 日期檔案';
                        step2El.style.color = '#059669';
                    } else {
                        step2El.innerHTML = '⚪ 2. 日期檔案';
                        step2El.style.color = '#9ca3af';
                    }
                }
            }

            // 預先處理每一筆資料，提取縣市並存起來
            globalJsonData = rawJsonData.map(row => {
                const name = row['旅店名稱'] || "";
                const address = row['旅店地址'] || "";
                const city = extractCity(address, name);
                return { ...row, extractCity: city };
            });

            // 🧠 智慧日期判斷區塊
            let dateString = fileDate;

            if (!dateString) {
                // 如果 fileDate 是空的（代表是管理員「手動上傳」本機檔案），則採用當下時間
                const today = new Date();
                dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            }

            // 將正確的日期存入 LocalStorage 快取中
            const cacheObject = {
                lastUpdated: `更新：${dateString}`,
                data: globalJsonData
            };
            localStorage.setItem(CACHE_KEY, JSON.stringify(cacheObject));

            // 更新網頁 UI 狀態
            uploadStatus.textContent = successMessage;
            updateDate.textContent = cacheObject.lastUpdated; // 畫面會顯示真正的新增/修改日期
            controlPanel.style.display = "flex";
            overviewView.style.display = "block";
            detailView.style.display = "none";

            currentCity = 'all';
            cityDropdown.value = 'all';
            renderRankingTable();

        } catch (error) {
            print("處理資料失敗:", error);
            uploadStatus.textContent = "❌ 檔案解析失敗，請確認檔案格式是否正確。";
        }
    }
    // 縣市正規化對照表 (延用綠色商店的邏輯)
    const cityMapping = {
        "臺北市": "臺北市", "臺北市": "臺北市", "新北市": "新北市", "桃園市": "桃園市", "桃園縣": "桃園市",
        "臺中市": "臺中市", "臺中市": "臺中市", "臺南市": "臺南市", "臺南市": "臺南市", "高雄市": "高雄市",
        "基隆市": "基隆市", "新竹市": "新竹市", "新竹縣": "新竹縣", "竹北市": "新竹縣",
        "苗栗縣": "苗栗縣", "苗栗市": "苗栗縣", "頭份市": "苗栗縣", "彰化縣": "彰化縣", "彰化市": "彰化縣", "員林市": "彰化縣",
        "南投縣": "南投縣", "南投市": "南投縣", "雲林縣": "雲林縣", "斗六市": "雲林縣",
        "嘉義市": "嘉義市", "嘉義縣": "嘉義縣", "太保市": "嘉義縣", "朴子市": "嘉義縣",
        "屏東縣": "屏東縣", "屏東市": "屏東縣", "宜蘭縣": "宜蘭縣", "宜蘭市": "宜蘭縣",
        "花蓮縣": "花蓮縣", "花蓮市": "花蓮縣", "臺東縣": "臺東縣", "臺東縣": "臺東縣", "臺東市": "臺東縣", "臺東市": "臺東縣",
        "澎湖縣": "澎湖縣", "馬公市": "澎湖縣", "金門縣": "金門縣", "連江縣": "連江縣"
    };

    function extractCity(address, name) {
        // 🌟 進入函數的瞬間，立刻把傳進來的字串洗乾淨（將所有的台替換成臺）
        address = (address || "").replace(/台/g, '臺');
        name = (name || "").replace(/台/g, '臺');

        let textToSearch = address + name;
        for (const [key, value] of Object.entries(cityMapping)) {
            if (textToSearch.includes(key)) return value;
        }
        if (address) {
            let cleanAddress = address.replace(/^\d{3,5}\s*/, '');
            if (cleanAddress.length >= 2) {
                for (const [key, value] of Object.entries(cityMapping)) {
                    let shortName = key.substring(0, 2);
                    if (cleanAddress.startsWith(shortName)) return value;
                }
            }
        }
        return "未知縣市";
    }

    // 點擊「上傳旅宿名單」按鈕
    triggerUploadBtn.addEventListener('click', () => fileUpload.click());

    // 選擇檔案後開始解析
    fileUpload.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        uploadStatus.textContent = "⏳ 手動讀取與分析中，請稍候...";
        triggerUploadBtn.disabled = true;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                // 1. 先做初步解析，為了防呆檢查
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                // 🌟 加入 raw: false，強制讓 Excel 裡的所有日期數字都轉成純文字，避免當機！
                const rawJsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "", raw: false });

                // ==========================================
                // 【保留】防呆模式：檢查是否傳錯檔案
                // ==========================================
                if (rawJsonData.length > 0) {
                    const firstRow = rawJsonData[0];
                    const isAccommodationFile =
                        ('旅店名稱' in firstRow) ||
                        ('旅館名稱' in firstRow) ||
                        ('旅宿名稱' in firstRow) ||
                        ('環保標章旅館名稱' in firstRow);

                    if (!isAccommodationFile) {
                        showAlert("⚠️ 傳錯檔案囉！\n這似乎不是「環保標章旅館/環保旅宿」的資料，請確認是否誤傳為綠色商店或餐廳的檔案。");
                        uploadStatus.textContent = "❌ 上傳失敗：請確認檔案是否正確。";
                        triggerUploadBtn.disabled = false;
                        fileUpload.value = "";
                        return; // 中斷執行
                    }
                } else {
                    showAlert("⚠️ 上傳的檔案裡面沒有資料喔！");
                    uploadStatus.textContent = "❌ 上傳失敗：檔案為空。";
                    triggerUploadBtn.disabled = false;
                    fileUpload.value = "";
                    return; // 中斷執行
                }
                // ==========================================

                // 2. 防呆通過！把完整資料交給共用函式去處理剩下的所有事情
                processDataBuffer(e.target.result, "✅ 手動更新名單完成！");

            } catch (error) {
                console.error(error);
                uploadStatus.textContent = "❌ 解析失敗，請確認檔案格式是否正確。";
            } finally {
                // 不論成功或失敗，最後都解鎖按鈕
                triggerUploadBtn.disabled = false;
                fileUpload.value = "";
            }
        };
        reader.readAsArrayBuffer(file);
    });

    // 產生排行榜 (跟綠色商店邏輯相似，但改吃 globalJsonData)
    function renderRankingTable() {
        let cityCounts = {};
        let validCount = 0;

        globalJsonData.forEach(row => {
            const city = row.extractCity;
            if (city !== "未知縣市") {
                cityCounts[city] = (cityCounts[city] || 0) + 1;
                validCount++;
            }
        });

        let statsArray = Object.entries(cityCounts).map(([city, count]) => ({
            city, count, percentage: validCount === 0 ? 0 : ((count / validCount) * 100).toFixed(2)
        })).sort((a, b) => b.count - a.count);

        totalStats.textContent = `總計 ${validCount.toLocaleString()} 筆資料`;
        rankingTableBody.innerHTML = "";

        let currentRank = 1;
        statsArray.forEach((item, index) => {
            if (index > 0 && item.count < statsArray[index - 1].count) {
                currentRank = index + 1;
            }

            const tr = document.createElement('tr');

            // 加入這兩行：綁定 class 樣式與點擊事件
            tr.className = 'clickable-row';
            tr.onclick = () => selectCity(item.city);

            tr.innerHTML = `
                <td>${currentRank}</td>
                <td>${item.city}</td>
                <td>${item.count.toLocaleString()}</td>
                <td>${item.percentage}%</td>
            `;
            rankingTableBody.appendChild(tr);
        });
    }
    // 點擊排行榜切換縣市的函式
    window.selectCity = function (cityCode) {
        currentCity = cityCode;
        // 同步頂部的下拉選單
        if (cityDropdown) cityDropdown.value = cityCode;
        updateUI();
        // 點擊後畫面稍微往上捲，提升瀏覽體驗
        document.querySelector('.page-header-compact').scrollIntoView({ behavior: 'smooth' });
    }
    // ==========================================
    // 第三步：切換下拉選單與渲染詳細資料
    // ==========================================

    const statusFilter = document.getElementById('status-filter');
    const tableBody = document.getElementById('table-body');
    const currentCityTitle = document.getElementById('current-city-title');
    const cityStatsEl = document.getElementById('city-stats');
    const summaryEl = document.getElementById('status-summary');
    const btnBackOverview = document.getElementById('btn-back-overview');

    // 1. 綁定按鈕與選單事件
    cityDropdown.addEventListener('change', (e) => {
        currentCity = e.target.value;
        updateUI();
    });

    statusFilter.addEventListener('change', () => {
        if (currentCity !== 'all') updateUI();
    });

    btnBackOverview.addEventListener('click', () => {
        currentCity = 'all';
        cityDropdown.value = 'all';
        updateUI();
    });

    // 2. 控制視圖切換
    function updateUI() {
        if (currentCity === 'all') {
            overviewView.style.display = 'block';
            detailView.style.display = 'none';
        } else {
            overviewView.style.display = 'none';
            detailView.style.display = 'block';

            const cityName = cityDropdown.options[cityDropdown.selectedIndex].text;
            currentCityTitle.textContent = `${cityName} - 旅宿詳細資料`;

            renderDetailTable(currentCity, statusFilter.value);
        }
    }

    // 3. 渲染詳細資料清單
    function renderDetailTable(cityValue, statusValue) {
        tableBody.innerHTML = '';

        // 過濾出該縣市的資料
        const cityRecords = globalJsonData.filter(item => item.extractCity === cityValue);
        const totalNational = globalJsonData.length;
        const totalCity = cityRecords.length;

        const percentage = totalNational === 0 ? 0 : Math.round((totalCity / totalNational) * 100);
        cityStatsEl.textContent = `${totalCity} / ${totalNational} (${percentage}%)`;

        let warningCount = 0;
        let expiredCount = 0;

        // 預處理每一筆資料的日期與狀態
        const processedRecords = cityRecords.map(item => {
            // 🌟 強制轉為字串 (String)，徹底預防 .includes() 崩潰
            const dateStr = String(item['到期日'] || item['證書到期日'] || "");
            const level = item['環保作為'] || "一般環保旅宿";
            let badgeType = 'none';

            // 關鍵需求 1：8個月警示判斷
            if (dateStr && !dateStr.includes("查無") && !dateStr.includes("未登錄")) {
                const dateMatch = dateStr.match(/(\d{4})[\/\-](\d{2})[\/\-](\d{2})/);
                if (dateMatch) {
                    const expireDate = new Date(`${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`);
                    const today = new Date();
                    const warningThreshold = new Date();
                    warningThreshold.setMonth(today.getMonth() + 8); // 設定 8 個月期限

                    if (expireDate < today) {
                        badgeType = 'expired';
                    } else if (expireDate <= warningThreshold) {
                        badgeType = 'warning';
                    }
                }
            }

            return { ...item, displayDate: dateStr, displayLevel: level, badgeType };
        });

        // 更新狀態橫幅
        summaryEl.innerHTML = (warningCount === 0 && expiredCount === 0) ?
            '<span class="summary-item safe">ℹ️ 目前名單無過期紀錄</span>' :
            (warningCount > 0 ? `<span class="summary-item warning">⚠️ 即將到期：${warningCount} 筆</span>` : '') +
            (expiredCount > 0 ? `<span class="summary-item expired">❌ 已過期：${expiredCount} 筆</span>` : '');

        // 狀態過濾
        let finalRecords = processedRecords;
        if (statusValue !== 'all') {
            finalRecords = processedRecords.filter(r => r.badgeType === statusValue);
        }

        if (finalRecords.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">目前無符合條件的資料。</td></tr>';
            return;
        }

        // 產出表格 HTML (依照你指定的 <th> 順序)
        finalRecords.forEach(data => {
            // --- 修改後的邏輯：處理到期日與自動連結 ---
            let statusHtml = data.displayDate;

            // 🌟 擴充判定：如果沒有填寫(空值)，或是包含任何爬蟲報錯訊息，通通顯示官網查詢連結
            if (!data.displayDate || data.displayDate.includes("查無") || data.displayDate.includes("未登") || data.displayDate.includes("異常") || data.displayDate.includes("超時")) {
                
                const searchKeyword = (data['旅店名稱'] || "").replace(/臺/g, '台');
                const searchUrl = `https://greenlifestyle.moenv.gov.tw/categories/greenProductSearch?searched=true&k=${encodeURIComponent(searchKeyword)}`;
                
                // 套用 manual-search-link 樣式類別
                statusHtml = `<a href="${searchUrl}" target="_blank" class="manual-search-link">官網查詢</a>`;
            } else {
                // 原有的日期警示圖示邏輯[cite: 4, 5]
                if (data.badgeType === 'expired') {
                    statusHtml += ' <span class="status-icon expired" title="已過期">❌</span>';
                } else if (data.badgeType === 'warning') {
                    statusHtml += ' <span class="status-icon warning" title="即將到期">⚠️</span>';
                }
            }

            // ==========================================
            // 【新增】判斷金銀銅並設定專屬圖示
            // ==========================================
            let levelIcon = '';
            if (data.displayLevel.includes('金')) {
                levelIcon = '🥇 ';
            } else if (data.displayLevel.includes('銀')) {
                levelIcon = '🥈 ';
            } else if (data.displayLevel.includes('銅')) {
                levelIcon = '🥉 ';
            } else if (data.displayLevel.includes('一般')) {
                levelIcon = '🌱 '; // 如果是一般環保旅宿，給一個葉子圖示
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td data-label="標章等級">
                    <span class="badge-level">
                        <span class="level-icon">${levelIcon}</span>
                        <span class="level-text">${data.displayLevel}</span>
                    </span>
                </td>
                <td data-label="旅宿名稱">${data['旅店名稱'] || '無資料'}</td>
                <td data-label="聯絡地址">${data['旅店地址'] || '無資料'}</td>
                <td data-label="證書到期日/狀態">${statusHtml}</td>
            `;
            tableBody.appendChild(tr);
        });
    }

});
