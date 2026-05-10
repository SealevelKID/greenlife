// partners_script.js - 綠色夥伴資料渲染邏輯 (互動圖表版)

document.addEventListener('DOMContentLoaded', () => {
    // 1. 取得 DOM 元素
    const cityDropdown = document.getElementById('city-dropdown');
    const overviewYearDropdown = document.getElementById('overview-year-dropdown'); // 新增這行
    const overviewView = document.getElementById('overview-view');
    const detailView = document.getElementById('detail-view');
    const rankingTableBody = document.getElementById('ranking-table-body');
    const tableBody = document.getElementById('table-body');
    const currentCityTitle = document.getElementById('current-city-title');
    const totalStatsEl = document.getElementById('total-stats');
    const cityStatsEl = document.getElementById('city-stats');
    const updateDateEl = document.getElementById('update-date');
    const btnBackOverview = document.getElementById('btn-back-overview');
    const citySearchInput = document.getElementById('city-search');

    // Modal 與圖表相關 DOM
    const modalOverlay = document.getElementById('chart-modal-overlay');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const modalYearTitle = document.getElementById('modal-year-title');
    const modalTableBody = document.getElementById('modal-table-body');
    const pieChartCanvas = document.getElementById('pieChart');
    const btnDownloadChart = document.getElementById('btn-download-chart');

    // 暫存資料
    let globalJsonData = null;
    let currentCity = 'all';
    let myChart = null; // 用來儲存 Chart.js 的圖現實體

    // 2. 初始化函數
    async function init() {
        try {
            const response = await fetch('data/partners_summary.json');
            if (!response.ok) throw new Error('找不到資料庫檔案');
            globalJsonData = await response.json();

            if (updateDateEl && globalJsonData.updateDate) {
                updateDateEl.textContent = '更新：' + globalJsonData.updateDate;
            }

            // 【新增】掃描 JSON 找出所有年份，放入下拉選單
            const yearsSet = new Set();
            for (const city in globalJsonData.statistics) {
                for (const year in globalJsonData.statistics[city].history) {
                    yearsSet.add(year);
                }
            }
            const sortedYears = Array.from(yearsSet).sort((a, b) => b - a); // 新到舊
            if (overviewYearDropdown) {
                sortedYears.forEach(year => {
                    const option = document.createElement('option');
                    option.value = year;
                    option.textContent = year + ' 年';
                    overviewYearDropdown.appendChild(option);
                });

                // 綁定選單切換事件
                overviewYearDropdown.addEventListener('change', () => {
                    updateUI();
                });
            }

            // 綁定事件監聽器
            if (cityDropdown) {
                cityDropdown.addEventListener('change', (e) => {
                    currentCity = e.target.value;
                    updateUI();
                });
            }
            // 【新增】快捷搜尋功能 (支援「台/臺」容錯)
            if (citySearchInput) {
                citySearchInput.addEventListener('input', (e) => {
                    // 自動將輸入的「台」轉成「臺」以符合系統資料
                    const keyword = e.target.value.trim().replace(/台/g, '臺');
                    if (!keyword) return;

                    // 尋找匹配的選項並自動切換
                    Array.from(cityDropdown.options).forEach(option => {
                        if (option.text.includes(keyword) && option.value !== 'all') {
                            cityDropdown.value = option.value;
                            currentCity = option.value;
                            updateUI();
                        }
                    });
                });
            }

            // 【新增】下載圖表截圖功能 (終極防透明版)
            if (btnDownloadChart) {
                btnDownloadChart.addEventListener('click', () => {
                    const modalContent = document.querySelector('.chart-modal-content');
                    const actionBtns = document.getElementById('modal-action-btns');

                    // 1. 截圖前：隱藏按鈕
                    if (actionBtns) actionBtns.style.display = 'none';

                    // 2. 截圖前：暫存原本的樣式，並強制關閉動畫與設定純白底
                    const originalAnimation = modalContent.style.animation;
                    const originalBackground = modalContent.style.backgroundColor;
                    
                    // 拔掉動畫！這是解決半透明最關鍵的一步
                    modalContent.style.animation = 'none'; 
                    modalContent.style.backgroundColor = '#ffffff';

                    // 3. 執行截圖
                    html2canvas(modalContent, { 
                        backgroundColor: '#ffffff',
                        scale: 2 
                    }).then(canvas => {
                        
                        // 4. 截圖後：恢復原本的按鈕與動畫樣式
                        if (actionBtns) actionBtns.style.display = 'flex';
                        modalContent.style.animation = originalAnimation;
                        modalContent.style.backgroundColor = originalBackground;

                        // 5. 觸發下載 (使用你原本設定好的標題與縣市年份)
                        const link = document.createElement('a');
                        link.download = `${modalYearTitle.textContent.replace(/\s+/g, '_')}.png`;
                        link.href = canvas.toDataURL('image/png');
                        link.click();
                    });
                });
            }

            if (btnBackOverview) {
                btnBackOverview.addEventListener('click', () => {
                    currentCity = 'all';
                    if (cityDropdown) cityDropdown.value = 'all';
                    updateUI();
                });
            }

            if (closeModalBtn) {
                closeModalBtn.addEventListener('click', () => {
                    modalOverlay.style.display = 'none';
                });
            }
            if (modalOverlay) {
                modalOverlay.addEventListener('click', (e) => {
                    if (e.target === modalOverlay) {
                        modalOverlay.style.display = 'none';
                    }
                });
            }

            updateUI();

        } catch (error) {
            console.error('資料讀取失敗:', error);
            if (rankingTableBody) rankingTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: red;">資料連線錯誤</td></tr>';
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
    // 3. 視圖切換總控制器
    function updateUI() {
        if (!globalJsonData) return;

        if (currentCity === 'all') {
            overviewView.style.display = 'block';
            detailView.style.display = 'none';
            renderRankingTable();
        } else {
            overviewView.style.display = 'none';
            detailView.style.display = 'block';

            const cityName = cityDropdown.options[cityDropdown.selectedIndex].text;
            currentCityTitle.textContent = `${cityName} - 歷年響應明細`;

            renderDetailTable(currentCity);
        }
    }

    // 4. 渲染第一階段：全台總數排行榜 (支援年份切換)
    function renderRankingTable() {
        rankingTableBody.innerHTML = '';
        const stats = globalJsonData.statistics;
        let totalNational = 0;
        const cityStatsList = [];

        // 取得使用者目前選擇的年份
        const selectedYear = overviewYearDropdown ? overviewYearDropdown.value : 'all';

        for (const cityCode in stats) {
            const cityName = stats[cityCode].cityName;
            const history = stats[cityCode].history;
            let cityTotal = 0;

            for (const year in history) {
                // 如果是「歷年累計」就全加；如果是特定年份，就只加那一年
                if (selectedYear === 'all' || year === selectedYear) {
                    cityTotal += history[year]["總數"] || 0;
                }
            }

            if (cityTotal > 0) {
                cityStatsList.push({ cityCode, cityName, count: cityTotal });
                totalNational += cityTotal;
            }
        }

        if (totalStatsEl) {
            const yearText = selectedYear === 'all' ? '歷年' : `${selectedYear}年`;
            totalStatsEl.textContent = `${yearText}全台共響應 ${totalNational.toLocaleString()} 處`;
        }

        if (cityStatsList.length === 0) {
            rankingTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">該年度無資料</td></tr>';
            return;
        }

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
                <td data-label="響應總數">${cityStatsList[i].count.toLocaleString()}</td>
                <td data-label="全國佔比">${percentage}%</td>
            `;
            rankingTableBody.appendChild(tr);
        }
    }

    // 5. 渲染第二階段：單一縣市的「歷年列表」
    function renderDetailTable(cityCode) {
        tableBody.innerHTML = '';
        const stats = globalJsonData.statistics;
        const cityData = stats[cityCode];

        if (!cityData) return;

        const history = cityData.history;
        const sortedYears = Object.keys(history).sort((a, b) => a - b);
        let totalAllYears = 0;

        let prevYearTotal = null; // 用來記錄前一年的數字

        // 產出歷年資料列
        sortedYears.forEach(year => {
            const yearData = history[year];
            const yearTotal = yearData["總數"] || 0;
            totalAllYears += yearTotal;

            // 【修改】計算成長率與產出 HTML (排除當前未結束的年度)
            const currentYear = new Date().getFullYear().toString(); // 自動取得使用者現在的真實年份
            let growthHtml = '<span style="color: #999;">-</span>';
            
            if (year === currentYear) {
                // 如果表格跑到今年，因為年度還沒結束，改顯示橘色的「統計中」避免誤導
                growthHtml = `<span style="color: #f59e0b; font-weight: bold;">統計中...</span>`;
            } else if (prevYearTotal !== null) {
                // 過去的完整年度，正常計算增減
                const diff = yearTotal - prevYearTotal;
                if (diff > 0) {
                    growthHtml = `<span style="color: #e53935; font-weight: bold;">↑ +${diff}</span>`; 
                } else if (diff < 0) {
                    growthHtml = `<span style="color: #43a047; font-weight: bold;">↓ ${diff}</span>`;  
                } else {
                    growthHtml = `<span style="color: #888;">-</span>`;
                }
            }
            prevYearTotal = yearTotal; // 依然要更新前一年數字，確保邏輯順暢

            let detailsArray = [];
            for (const key in yearData) {
                if (key !== "總數") {
                    detailsArray.push(`${key} ${yearData[key]}`);
                }
            }
            const detailsString = detailsArray.join('、');

            const tr = document.createElement('tr');
            tr.className = 'clickable-row';
            tr.title = `點擊查看 ${year} 年各單位佔比圓餅圖`;

            tr.innerHTML = `
                <td data-label="年度" style="font-weight: bold; color: var(--primary-color);">🔍 ${year} 年</td>
                <td data-label="響應數量">${yearTotal.toLocaleString()}</td>
                <td data-label="年度增額">${growthHtml}</td> <!-- 插入增額資料 -->
                <td data-label="單位性質明細" style="text-align: left; color: #555;">${detailsString}</td>
            `;

            tr.addEventListener('click', () => {
                openChartModal(cityData.cityName, year, yearData, yearTotal);
            });

            tableBody.appendChild(tr);
        });

        // 加上最下方的總計列 (注意 colspan 數量增加為 2)
        const totalTr = document.createElement('tr');
        totalTr.innerHTML = `
            <td data-label="年度" style="background-color: #f8fafc; font-weight: bold; text-align: center;">總計</td>
            <td data-label="響應數量" style="background-color: #f8fafc; font-weight: bold;">${totalAllYears.toLocaleString()}</td>
            <td data-label="年度增額" colspan="2" style="background-color: #f8fafc;"></td>
        `;
        tableBody.appendChild(totalTr);

        cityStatsEl.textContent = `歷年總計 ${totalAllYears.toLocaleString()} 處`;
    }

    // 6. 核心繪圖函數：開啟 Modal 並繪製圓餅圖
    function openChartModal(cityName, year, yearData, total) {
        // 顯示 Modal
        modalOverlay.style.display = 'flex';
        modalYearTitle.textContent = `${cityName} ${year}年 響應佔比 (共 ${total} 處)`;

        // 【新增】語義化配色字典
        const semanticColors = {
            '企業': '#3b82f6', // 藍色
            '學校': '#10b981', // 綠色
            '機關': '#f59e0b', // 橘色
            '團體': '#8b5cf6', // 紫色
            '社區': '#ec4899', // 粉色
            '其他': '#94a3b8'  // 預設灰
        };

        const labels = [];
        const dataValues = [];
        const bgColorsForChart = []; // 給 Chart.js 用的顏色陣列

        modalTableBody.innerHTML = '';

        // 抓出「總數」以外的單位並排序
        const sortedData = [];
        for (const key in yearData) {
            if (key !== "總數") {
                sortedData.push({ name: key, count: yearData[key] });
            }
        }
        sortedData.sort((a, b) => b.count - a.count);

        // 填入右側小表格與整理圖表資料
        sortedData.forEach((item) => {
            labels.push(item.name);
            dataValues.push(item.count);

            // 從字典取得顏色，若找不到該類別則用灰色
            const itemColor = semanticColors[item.name] || semanticColors['其他'];
            bgColorsForChart.push(itemColor);

            const percentage = Math.round((item.count / total) * 1000) / 10;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="text-align: left; padding: 7px 5px; border-bottom: 1px solid #eee; white-space: nowrap;">
                    <span style="display:inline-block; width:10px; height:10px; border-radius: 50%; background-color:${itemColor}; margin-right:6px; vertical-align: middle;"></span>
                    <span style="vertical-align: middle;">${item.name}</span>
                </td>
                <td style="text-align: right; padding: 7px 5px; border-bottom: 1px solid #eee; white-space: nowrap;">
                    <span style="font-weight: bold; font-size: 1rem; vertical-align: middle;">${item.count.toLocaleString()}</span> 
                    <span style="color:#888; font-size:0.85rem; margin-left: 4px; vertical-align: middle;">(${percentage}%)</span>
                </td>
            `;
            modalTableBody.appendChild(tr);
        });

        // ==========================================
        // 繪製圓餅圖
        // ==========================================
        // ===== 新增第 1 部分：定義白色背景 Plugin (放在 if 判斷之前) =====
        const customCanvasBackgroundColor = {
            id: 'customCanvasBackgroundColor',
            beforeDraw: (chart, args, options) => {
                const {ctx} = chart;
                ctx.save();
                ctx.globalCompositeOperation = 'destination-over';
                ctx.fillStyle = options.color || '#ffffff';
                ctx.fillRect(0, 0, chart.width, chart.height);
                ctx.restore();
            }
        };
        // =========================================================

        if (myChart) {
            myChart.destroy();
        }

        const ctx = pieChartCanvas.getContext('2d');
        myChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: dataValues,
                    backgroundColor: bgColorsForChart, // 使用指定的顏色
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'left', // 圖例放左側
                        labels: { font: { size: 14 } }
                    },
                    // ===== 新增第 2 部分：啟用背景顏色設定 =====
                    customCanvasBackgroundColor: {
                        color: 'white',
                    }
                    // ==========================================
                }
            },
            // ===== 新增第 3 部分：將 Plugin 註冊到這張圖表中 =====
            plugins: [customCanvasBackgroundColor]
            // ===================================================
        });
    }

    // 啟動程式
    init();
});
