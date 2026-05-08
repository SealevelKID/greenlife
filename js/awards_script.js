// awards_script.js - 國家企業環保獎專屬邏輯
document.addEventListener('DOMContentLoaded', () => {
    // 1. 取得 DOM 元素
    const cityDropdown = document.getElementById('city-dropdown');
    const overviewEditionDropdown = document.getElementById('overview-edition-dropdown');

    // 視圖容器
    const overviewView = document.getElementById('overview-view');
    const historyView = document.getElementById('history-view');
    const detailView = document.getElementById('detail-view');

    // 表格 tbody
    const rankingTableBody = document.getElementById('ranking-table-body');
    const historyTableBody = document.getElementById('history-table-body');
    const detailTableBody = document.getElementById('detail-table-body');

    // 標題與統計文字
    const updateDateEl = document.getElementById('update-date');
    const overviewTitle = document.getElementById('overview-title');
    const totalStatsEl = document.getElementById('total-stats');
    const currentCityTitle = document.getElementById('current-city-title');
    const cityStatsEl = document.getElementById('city-stats');
    const detailTitle = document.getElementById('detail-title');
    const detailStatsEl = document.getElementById('detail-stats');

    // 按鈕
    const btnBackOverview = document.getElementById('btn-back-overview');
    const btnBackHistory = document.getElementById('btn-back-history');

    // 狀態暫存
    let globalJsonData = null;
    let currentCity = 'all';
    let latestEditionName = ""; // 用來儲存「最新一屆」的名稱，如 "第 5 屆"

    // 獎項權重與樣式設定 (巨擘獎最高)
    const awardConfig = {
        '巨擘獎': { weight: 5, cssClass: 'badge-giant' },
        '金級獎': { weight: 4, cssClass: 'badge-gold' },
        '銀級獎': { weight: 3, cssClass: 'badge-silver' },
        '銅級獎': { weight: 2, cssClass: 'badge-bronze' },
        '入圍獎': { weight: 1, cssClass: 'badge-entry' }
    };

    // 2. 初始化函數
    async function init() {
        try {
            const response = await fetch('data/awards_summary.json');
            if (!response.ok) throw new Error('找不到 awards_summary.json');
            globalJsonData = await response.json();

            if (updateDateEl && globalJsonData.updateDate) {
                updateDateEl.textContent = '更新：' + globalJsonData.updateDate;
            }

            // 自動計算「最新一屆」是第幾屆
            latestEditionName = findLatestEdition(globalJsonData.statistics);

            // 🌟 產生屆別下拉選單 (從最新屆排到第 1 屆)
            if (overviewEditionDropdown) {
                // 找出所有存在過的屆別數字
                const editionsSet = new Set();
                for (const city in globalJsonData.statistics) {
                    for (const edition in globalJsonData.statistics[city].history) {
                        editionsSet.add(parseEditionNum(edition));
                    }
                }

                // 轉陣列並由大到小排序
                const sortedEditions = Array.from(editionsSet).sort((a, b) => b - a);

                sortedEditions.forEach(num => {
                    const option = document.createElement('option');
                    option.value = num.toString();
                    option.textContent = `第 ${num} 屆`;
                    overviewEditionDropdown.appendChild(option);
                });

                // 設定預設值為最新一屆
                overviewEditionDropdown.value = parseEditionNum(latestEditionName).toString();

                // 綁定切換事件
                overviewEditionDropdown.addEventListener('change', () => {
                    updateUI();
                });
            }

            // 綁定下拉選單事件
            if (cityDropdown) {
                cityDropdown.addEventListener('change', (e) => {
                    currentCity = e.target.value;
                    updateUI();
                });
            }

            // 綁定返回按鈕事件
            if (btnBackOverview) {
                btnBackOverview.addEventListener('click', () => {
                    currentCity = 'all';
                    if (cityDropdown) cityDropdown.value = 'all';
                    updateUI();
                });
            }

            if (btnBackHistory) {
                btnBackHistory.addEventListener('click', () => {
                    // 從層級三返回層級二，不需要改 currentCity，只需切換視圖
                    showView('history');
                });
            }

            // 初次渲染畫面
            updateUI();

        } catch (error) {
            console.error('資料讀取失敗:', error);
            rankingTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: red;">資料連線錯誤，請確認 JSON 是否已產生</td></tr>';
        }
    }

    // --- 輔助函數 ---

    // 找出所有資料中的最新一屆 (擷取數字比大小)
    function findLatestEdition(stats) {
        let maxNum = 0;
        let latestName = "";
        for (const city in stats) {
            for (const edition in stats[city].history) {
                const numMatch = edition.match(/\d+/);
                if (numMatch) {
                    const num = parseInt(numMatch[0], 10);
                    if (num > maxNum) {
                        maxNum = num;
                        latestName = edition;
                    }
                }
            }
        }
        return latestName;
    }

    // 解析屆別數字用於排序
    function parseEditionNum(editionStr) {
        const match = editionStr.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
    }

    // 取得獎項權重 (找不到預設為 0)
    function getAwardWeight(awardName) {
        for (const key in awardConfig) {
            if (awardName.includes(key)) return awardConfig[key].weight;
        }
        return 0;
    }

    // 產生專屬獎項標籤 HTML
    function getBadgeHtml(awardName) {
        let cssClass = 'badge-entry'; // 預設
        for (const key in awardConfig) {
            if (awardName.includes(key)) {
                cssClass = awardConfig[key].cssClass;
                break;
            }
        }
        return `<span class="badge-level ${cssClass}"><span class="level-text">${awardName}</span></span>`;
    }

    // 控制視圖顯示
    function showView(viewName) {
        overviewView.style.display = viewName === 'overview' ? 'block' : 'none';
        historyView.style.display = viewName === 'history' ? 'block' : 'none';
        detailView.style.display = viewName === 'detail' ? 'block' : 'none';
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

    // 3. 視圖切換總控制器 (層級一 與 層級二)
    function updateUI() {
        if (!globalJsonData) return;

        if (currentCity === 'all') {
            showView('overview');
            renderOverview();
        } else {
            showView('history');
            renderHistory(currentCity);
        }
    }

    // --- 層級一：全台屆別總覽 ---
    function renderOverview() {
        rankingTableBody.innerHTML = '';

        // 🌟 取得目前選單選擇的屆別
        const selectedEditionStr = overviewEditionDropdown ? overviewEditionDropdown.value : parseEditionNum(latestEditionName).toString();

        overviewTitle.textContent = `全台第 ${selectedEditionStr} 屆得獎排名`;

        const stats = globalJsonData.statistics;
        let totalNational = 0;
        const cityStatsList = [];

        for (const cityCode in stats) {
            const cityName = stats[cityCode].cityName;
            const history = stats[cityCode].history;

            // 🌟 在該縣市的歷史紀錄中，尋找對應的屆數 (比對數字)
            for (const edition in history) {
                if (parseEditionNum(edition).toString() === selectedEditionStr) {
                    const cityTotal = history[edition]["總數"] || 0;
                    if (cityTotal > 0) {
                        cityStatsList.push({ cityCode, cityName, count: cityTotal });
                        totalNational += cityTotal;
                    }
                }
            }
        }

        totalStatsEl.textContent = `全國共計 ${totalNational} 家企業獲獎`;

        if (cityStatsList.length === 0) {
            rankingTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">最新一屆尚無資料</td></tr>';
            return;
        }

        // 依數量降冪排序
        cityStatsList.sort((a, b) => b.count - a.count);

        for (let i = 0; i < cityStatsList.length; i++) {
            if (i > 0 && cityStatsList[i].count === cityStatsList[i - 1].count) {
                cityStatsList[i].rank = cityStatsList[i - 1].rank;
            } else {
                cityStatsList[i].rank = i + 1;
            }

            const percentage = Math.round((cityStatsList[i].count / totalNational) * 1000) / 10;

            const tr = document.createElement('tr');

            // 加入這兩行：綁定 class 樣式與點擊事件
            tr.className = 'clickable-row'; 
            tr.onclick = () => selectCity(cityStatsList[i].cityCode);
            
            tr.innerHTML = `
                <td data-label="排名">第 ${cityStatsList[i].rank} 名</td>
                <td data-label="縣市別">${cityStatsList[i].cityName}</td>
                <td data-label="獲獎總數">${cityStatsList[i].count} 家</td>
                <td data-label="該屆佔比">${percentage}%</td>
            `;
            rankingTableBody.appendChild(tr);
        }
    }

    // --- 層級二：縣市歷屆戰績 ---
    function renderHistory(cityCode) {
        historyTableBody.innerHTML = '';
        const stats = globalJsonData.statistics;
        const cityData = stats[cityCode];

        if (!cityData) {
            currentCityTitle.textContent = "查無此縣市資料";
            cityStatsEl.textContent = "";
            return;
        }

        currentCityTitle.textContent = `${cityData.cityName} - 歷屆戰績`;

        const history = cityData.history;
        // 依照屆別數字排序 (小到大，確保最新的在最下方)
        const sortedEditions = Object.keys(history).sort((a, b) => parseEditionNum(a) - parseEditionNum(b));

        let totalAllYears = 0;

        sortedEditions.forEach(edition => {
            const editionData = history[edition];
            const editionTotal = editionData["總數"] || 0;
            totalAllYears += editionTotal;

            // 整理獎項概況字串 (例如：金級獎 1、銀級獎 2)
            let detailsArray = [];
            for (const level in editionData.levels) {
                detailsArray.push(`${level} ${editionData.levels[level]}`);
            }
            const detailsString = detailsArray.join('、');

            const tr = document.createElement('tr');
            tr.className = 'clickable-row'; // 延用綠色夥伴的點擊特效
            tr.title = `點擊查看 ${edition} 獲獎企業名單`;

            tr.innerHTML = `
    <td data-label="屆別" style="font-weight: bold; color: var(--primary-color); cursor: pointer;">第 ${edition} 屆</td>
    <td data-label="該屆得獎總數">${editionTotal} 家</td>
    <td data-label="獎項概況" style="text-align: left; color: #555;">${detailsString}</td>
`;

            // 點擊事件：進入層級三
            tr.addEventListener('click', () => {
                renderDetail(cityData.cityName, edition, editionData.winners);
            });

            historyTableBody.appendChild(tr);
        });

        cityStatsEl.textContent = `歷屆累計 ${totalAllYears} 家次獲獎`;
    }

    // --- 層級三：該屆獲獎企業明細 ---
    function renderDetail(cityName, edition, winners) {
        showView('detail');

        detailTitle.textContent = `${cityName} - 第 ${edition} 屆獲獎名單`;
        detailTableBody.innerHTML = '';

        // 🌟 1. 企業合併邏輯 (Merge duplicates) - 增強空白過濾
        const mergedWinnersMap = {};

        winners.forEach(winner => {
            // 把全形括號轉半形，並「移除所有空白」，確保名稱絕對一致才能完美合併
            const cleanName = winner.n.replace(/（/g, '(').replace(/）/g, ')').replace(/\s+/g, '');

            if (!mergedWinnersMap[cleanName]) {
                mergedWinnersMap[cleanName] = {
                    name: winner.n, // 畫面上還是顯示原本的名稱
                    awards: [],
                    highestWeight: 0
                };
            }

            mergedWinnersMap[cleanName].awards.push(winner.l);

            const weight = getAwardWeight(winner.l);
            if (weight > mergedWinnersMap[cleanName].highestWeight) {
                mergedWinnersMap[cleanName].highestWeight = weight;
            }
        });

        const mergedWinnersArray = Object.values(mergedWinnersMap);
        detailStatsEl.textContent = `共 ${mergedWinnersArray.length} 家`;
        mergedWinnersArray.sort((a, b) => b.highestWeight - a.highestWeight);

        // 🌟 4. 渲染到畫面
        mergedWinnersArray.forEach(winnerData => {
            const badgesHtml = winnerData.awards.map(award => getBadgeHtml(award)).join('');

            const tr = document.createElement('tr');
            // 移除所有 style="text-align: left..." 等行內樣式[cite: 2]
            tr.innerHTML = `
        <td data-label="獲獎單位" style="font-weight: bold;">
            ${winnerData.name}
        </td>
        <td data-label="獲得獎項">
            <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
                ${badgesHtml}
            </div>
        </td>
    `;
        detailTableBody.appendChild(tr);
    });
    }

// 啟動程式
init();
});