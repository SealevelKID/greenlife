// facilities_script.js - 統整與效能升級版
document.addEventListener('DOMContentLoaded', () => {
    // 1. 取得所有 DOM 元素
    const cityDropdown = document.getElementById('city-dropdown');
    const statusFilter = document.getElementById('status-filter');
    const tableBody = document.getElementById('table-body');
    const currentCityTitle = document.getElementById('current-city-title');
    const updateDateEl = document.getElementById('update-date');
    const cityStatsEl = document.getElementById('city-stats');
    const summaryEl = document.getElementById('status-summary');

    // 【新增】取得視圖與按鈕元素
    const overviewView = document.getElementById('overview-view');
    const detailView = document.getElementById('detail-view');
    const rankingTableBody = document.getElementById('ranking-table-body');
    const totalStatsEl = document.getElementById('total-stats');
    const btnBackOverview = document.getElementById('btn-back-overview');

    // 暫存資料，避免重複 fetch
    let globalJsonData = null;
    let currentCity = 'all';

    // 2. 初始化函數
    async function init() {
        // 解析網址參數
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('city')) {
            currentCity = urlParams.get('city');
        }

        try {
            // 統一讀取資料 (只讀取一次，大幅提升效能)
            const response = await fetch('data/facilities.json');
            globalJsonData = await response.json();

            if (updateDateEl && globalJsonData.updateDate) {
                updateDateEl.textContent = '更新：' + globalJsonData.updateDate;
            }

            // 綁定下拉選單事件
            if (cityDropdown) {
                cityDropdown.value = currentCity;
                cityDropdown.addEventListener('change', (e) => {
                    currentCity = e.target.value;
                    updateUI();
                });
            }

            // 綁定狀態篩選事件
            if (statusFilter) {
                statusFilter.addEventListener('change', () => updateUI());
            }

            // 【新增】綁定返回按鈕事件
            if (btnBackOverview) {
                btnBackOverview.addEventListener('click', () => {
                    currentCity = 'all';
                    if (cityDropdown) cityDropdown.value = 'all';
                    updateUI();
                });
            }

            // 初次渲染畫面
            updateUI();

        } catch (error) {
            console.error('資料讀取失敗:', error);
            if (rankingTableBody) rankingTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: red;">資料連線錯誤</td></tr>';
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: red;">資料連線錯誤</td></tr>';
        }
    }

    // 3. 視圖切換控制器
    function updateUI() {
        if (!globalJsonData) return;

        if (currentCity === 'all') {
            // 顯示排行榜
            overviewView.style.display = 'block';
            detailView.style.display = 'none';
            renderRankingTable();
        } else {
            // 顯示明細表
            overviewView.style.display = 'none';
            detailView.style.display = 'block';

            const cityName = cityDropdown.options[cityDropdown.selectedIndex].text;
            currentCityTitle.textContent = `${cityName} - 設施詳細資料`;

            renderDetailTable(currentCity, statusFilter.value);
        }
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

    // 4. 【新增】渲染排行榜視圖
    function renderRankingTable() {
        rankingTableBody.innerHTML = '';
        const records = globalJsonData.records || [];
        const totalNational = records.length;

        if (totalStatsEl) {
            totalStatsEl.textContent = `全台總計 ${totalNational} 處`;
        }

        if (totalNational === 0) {
            rankingTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">目前無統計資料。</td></tr>';
            return;
        }

        // 動態計算各縣市數量
        const cityCounts = {};
        records.forEach(r => {
            const c = r.cityCode;
            if (c && c !== 'other') {
                cityCounts[c] = (cityCounts[c] || 0) + 1;
            }
        });

        // 建立城市名稱對照表 (從 HTML 下拉選單抓取中文名)
        const cityNames = {};
        Array.from(cityDropdown.options).forEach(opt => {
            if (opt.value && opt.value !== 'all') {
                cityNames[opt.value] = opt.text;
            }
        });

        // 轉為陣列並計算佔比
        let statsList = Object.keys(cityCounts).map(code => {
            return {
                cityCode: code,
                cityName: cityNames[code] || '未知縣市',
                count: cityCounts[code],
                percentage: Math.round((cityCounts[code] / totalNational) * 100)
            };
        });

        // 依數量降冪排序
        statsList.sort((a, b) => b.count - a.count);

        // 計算排名 (處理同分同名次)
        for (let i = 0; i < statsList.length; i++) {
            if (i > 0 && statsList[i].count === statsList[i - 1].count) {
                statsList[i].rank = statsList[i - 1].rank;
            } else {
                statsList[i].rank = i + 1;
            }
        }

        // 渲染產生表格
        statsList.forEach(stat => {
            const tr = document.createElement('tr');
            
            // 加入這兩行：綁定 class 樣式與點擊事件
            tr.className = 'clickable-row'; 
            tr.onclick = () => selectCity(stat.cityCode); 

            tr.innerHTML = `
                <td data-label="排名">第 ${stat.rank} 名</td>
                <td data-label="縣市別">${stat.cityName}</td>
                <td data-label="設施數量">${stat.count} 處</td>
                <td data-label="全國佔比">${stat.percentage}%</td>
            `;
            rankingTableBody.appendChild(tr);
        });
    }

    // 5. 渲染詳細明細視圖 (保留你原本的心血邏輯)
    function renderDetailTable(cityValue, statusValue) {
        tableBody.innerHTML = '';

        let records = globalJsonData.records || [];
        const totalNational = records.length;

        // 縣市過濾
        const cityRecords = records.filter(item => item.cityCode === cityValue);
        const totalCity = cityRecords.length;

        // 【修改】統一格式更新統計數據
        const percentage = totalNational === 0 ? 0 : Math.round((totalCity / totalNational) * 100);
        cityStatsEl.textContent = `${totalCity} / ${totalNational} (${percentage}%)`;

        // 預處理狀態與計算橫幅
        let warningCount = 0;
        let expiredCount = 0;

        const processedRecords = cityRecords.map(item => {
            const dateMatch = item.status.match(/(\d{4})[\/\-](\d{2})[\/\-](\d{2})/);
            let badgeType = 'none';
            if (dateMatch) {
                const expireDate = new Date(`${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`);
                const today = new Date();
                const warningThreshold = new Date();
                warningThreshold.setMonth(today.getMonth() + 8);
                if (expireDate < today) {
                    badgeType = 'expired';
                    expiredCount++;
                } else if (expireDate <= warningThreshold) {
                    badgeType = 'warning';
                    warningCount++;
                }
            }
            return { ...item, badgeType };
        });

        // 更新橫幅
        summaryEl.innerHTML = (warningCount === 0 && expiredCount === 0) ?
            '<span class="summary-item safe">✅ 狀態良好：目前無過期或需展延之設施</span>' :
            (warningCount > 0 ? `<span class="summary-item warning">⚠️ 需評估展延：${warningCount} 筆</span>` : '') +
            (expiredCount > 0 ? `<span class="summary-item expired">❌ 已過期：${expiredCount} 筆</span>` : '');

        // 狀態過濾
        let finalRecords = processedRecords;
        if (statusValue !== 'all') {
            finalRecords = processedRecords.filter(r => r.badgeType === statusValue);
        }

        if (finalRecords.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">目前無符合條件的資料。</td></tr>';
            return;
        }

        finalRecords.forEach(data => {
            let statusHtml = data.status;

            if (data.badgeType === 'expired') {
                statusHtml += ' <span class="status-icon expired" title="已過期">❌</span>';
            } else if (data.badgeType === 'warning') {
                statusHtml += ' <span class="status-icon warning" title="需評估展延">⚠️</span>';
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td data-label="核准時間">${data.date}</td>
                <td data-label="場所類型">${data.type}</td>
                <td data-label="設施場所名稱">${data.name}</td>
                <td data-label="申請單位全銜">${data.unit}</td>
                <td data-label="證書狀態">${statusHtml}</td>
            `;
            tableBody.appendChild(tr);
        });
    }

    // 啟動程式
    init();
});