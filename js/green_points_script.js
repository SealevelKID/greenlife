document.addEventListener('DOMContentLoaded', () => {
    // 1. 取得 DOM 元素
    const cityDropdown = document.getElementById('city-dropdown');
    const updateDateEl = document.getElementById('update-date');
    const overviewDashboard = document.getElementById('overview-dashboard'); // 修改
    const detailDashboard = document.getElementById('detail-dashboard');     // 修改
    const overviewView = document.getElementById('overview-view');
    const detailView = document.getElementById('detail-view');
    const rankingTableBody = document.getElementById('ranking-table-body');
    const totalStatsEl = document.getElementById('total-stats');
    const currentCityTitle = document.getElementById('current-city-title');
    const cityStatsEl = document.getElementById('city-stats');
    const btnBackOverview = document.getElementById('btn-back-overview');
    const merchantListContainer = document.getElementById('merchant-list-container');
    const sortDropdown = document.getElementById('sort-dropdown');
    const rankingTitle = document.getElementById('ranking-title');

    // 2. 全域狀態變數
    let globalJsonData = null;
    let currentCity = 'all';
    let currentPage = 1;
    let currentSortMode = 'count'; // 新增：預設使用「特約機構家數」排序
    const itemsPerPage = 15;

    // 3. 初始化：只讀取一次 JSON
    async function init() {
        try {
            const response = await fetch('data/green_points.json');
            globalJsonData = await response.json();

            if (globalJsonData.summary.update_date) {
                updateDateEl.textContent = '更新：' + globalJsonData.summary.update_date;
            }

            cityDropdown.addEventListener('change', (e) => {
                currentCity = e.target.value;
                currentPage = 1;
                updateUI();
            });

            // ==========================================
            // 【新增】綁定排序選單的切換事件
            // ==========================================
            sortDropdown.addEventListener('change', (e) => {
                // 1. 更新全域變數為使用者選中的模式 ('count', 'new_f', 或 'reg_b')
                currentSortMode = e.target.value;
                
                // 2. 因為排行榜只有在「全台總覽」時才顯示，
                // 所以只要重新呼叫 renderRankingTable，它就會用新模式重新計算並畫出表格！
                if (currentCity === 'all' && globalJsonData) {
                    renderRankingTable(globalJsonData.ranking_and_merchants);
                }
            });
            // ==========================================

            btnBackOverview.addEventListener('click', () => {
                currentCity = 'all';
                cityDropdown.value = 'all';
                updateUI();
            });

            updateUI();

        } catch (error) {
            console.error('資料讀取失敗:', error);
            rankingTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: red;">資料連線錯誤，請確認 JSON 是否存在</td></tr>';
        }
    }

    // 4. 視圖切換控制器
    function updateUI() {
        if (!globalJsonData) return;

        if (currentCity === 'all') {
            overviewView.style.display = 'block';
            detailView.style.display = 'none';
            // 渲染全國看板
            renderDashboard(globalJsonData.summary, overviewDashboard);
            renderRankingTable(globalJsonData.ranking_and_merchants);
        } else {
            overviewView.style.display = 'none';
            detailView.style.display = 'block';

            cityDropdown.value = currentCity;
            currentCityTitle.textContent = `${currentCity} - 特約機構名單`;

            // 找出縣市專屬資料，並渲染專屬看板
            const countyData = globalJsonData.ranking_and_merchants.find(item => item.county === currentCity);
            if (countyData) renderDashboard(countyData, detailDashboard);

            renderMerchantList();
        }
    }

    // 5. 點擊排行榜縣市觸發的函式 (掛載到 window 供 HTML 呼叫)
    window.selectCity = function (county) {
        currentCity = county;
        currentPage = 1;
        updateUI();
        // 點擊後畫面稍微往上捲，提升瀏覽體驗
        document.querySelector('.page-header-compact').scrollIntoView({ behavior: 'smooth' });
    }

    // --- 以下為渲染畫面的專屬函式 ---

    // 渲染數據看板 (完美對齊附圖的極簡融合樣式)
    function renderDashboard(data, container) {
        if (!container) return;
        // 自動判斷是全國資料(total_registered_B)還是縣市資料(reg_b)
        const regB = data.total_registered_B ?? data.reg_b ?? 0;
        const newF = data.total_new_F ?? data.new_f ?? 0;
        const total = data.total_members ?? 0;

        const html = `
            <div style="display: flex; justify-content: center; align-items: flex-end; gap: 20px; flex-wrap: wrap;">
                <div style="text-align: center; padding-top: 5px; border-top: 2px solid #9e9e9e; min-width: 100px;">
                    <div style="color: #333; font-size: 0.95rem; font-weight: bold; margin-bottom: 8px;">累計註冊數</div>
                    <div style="font-size: 1.3rem; color: #333;">${regB.toLocaleString()}</div>
                </div>
                <div style="font-size: 1.8rem; color: #7e57c2; font-weight: bold; margin-bottom: 2px;">➕</div>
                <div style="text-align: center; padding-top: 5px; border-top: 2px solid #4CAF50; min-width: 100px;">
                    <div style="color: #4CAF50; font-size: 0.95rem; font-weight: bold; margin-bottom: 8px;">新增有效會員</div>
                    <div style="font-size: 1.3rem; color: #4CAF50;">${newF.toLocaleString()}</div>
                </div>
                <div style="font-size: 1.8rem; color: #7e57c2; font-weight: bold; margin-bottom: 2px;">🟰</div>
                <div style="text-align: center; padding-top: 5px; border-top: 2px solid #2e7d32; background-color: #f0fdf4; min-width: 120px; padding-bottom: 5px;">
                    <div style="color: #2e7d32; font-size: 0.95rem; font-weight: bold; margin-bottom: 8px;">目前累計會員</div>
                    <div style="font-size: 1.5rem; font-weight: bold; color: #2e7d32;">${total.toLocaleString()}</div>
                </div>
            </div>
        `;
        container.innerHTML = html;
    }

    // 渲染排行榜 (注入至 tbody 中)
    function renderRankingTable(rankingData) {
        rankingTableBody.innerHTML = '';
        totalStatsEl.textContent = `全台總計 ${rankingData.length} 縣市`;

        // 1. 根據目前的模式決定：排序欄位、全台總數與顯示文字
        let sortField = currentSortMode;
        let totalSum = 0;
        let metricName = "";
        let unit = sortField === 'count' ? '家' : '人';

        if (sortField === 'count') {
            totalSum = globalJsonData.ranking_and_merchants.reduce((sum, item) => sum + item.count, 0);
            metricName = "特約機構家數";
        } else if (sortField === 'new_f') {
            totalSum = globalJsonData.summary.total_new_F;
            metricName = "新增有效會員";
        } else if (sortField === 'reg_b') {
            totalSum = globalJsonData.summary.total_registered_B;
            metricName = "累積註冊數";
        }

        // 動態更新表格第三欄的標題
        const tableHeader = document.querySelector('#facilities-table thead th:nth-child(3)');
        if (tableHeader) tableHeader.textContent = metricName;
        // 動態更新上方區域的大標題
        rankingTitle.textContent = `各縣市${metricName}排名`;

        // 2. 進行陣列排序 (由大到小)
        let sortedData = [...rankingData].sort((a, b) => {
            const valA = a[sortField] || 0;
            const valB = b[sortField] || 0;
            return valB - valA; // 數值大的排前面
        });

        // 3. 渲染資料與「標準競賽排名 (跳號)」邏輯
        let currentRank = 1;

        sortedData.forEach((item, index) => {
            let currentVal = item[sortField] || 0;

            // 排名跳號判斷：如果不是第一名，且數值比上一名小，名次就變成「陣列索引值 + 1」
            if (index > 0) {
                let prevVal = sortedData[index - 1][sortField] || 0;
                if (currentVal < prevVal) {
                    currentRank = index + 1;
                }
            }

            // 計算精準佔比 (避免分母為0的防呆)
            let percentage = totalSum > 0 ? ((currentVal / totalSum) * 100).toFixed(1) : 0;

            const tr = document.createElement('tr');
            tr.className = 'clickable-row'; 
            tr.onclick = () => selectCity(item.county); 

            tr.innerHTML = `
                <td data-label="排名"><span class="medal-badge" style="background: none; color: inherit; padding: 0;">第 ${currentRank} 名</span></td>
                <td data-label="縣市別"><strong>${item.county}</strong></td>
                <td data-label="${metricName}">${currentVal.toLocaleString()} ${unit}</td>
                <td data-label="佔比">${percentage}%</td>
            `;
            rankingTableBody.appendChild(tr);
        });
    }

    // 渲染商家清單與分頁邏輯
    function renderMerchantList() {
        const countyData = globalJsonData.ranking_and_merchants.find(item => item.county === currentCity);

        if (!countyData || !countyData.merchants || countyData.merchants.length === 0) {
            merchantListContainer.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">該縣市目前無特約機構資料。</p>';
            cityStatsEl.textContent = `共 0 家`;
            return;
        }

        // 1. 【排序邏輯】僅將「開頭」為括號的失效店家排到最末尾
        countyData.merchants.sort((a, b) => {
            const isInvalidA = a.startsWith('(') || a.startsWith('（');
            const isInvalidB = b.startsWith('(') || b.startsWith('（');
            if (isInvalidA && !isInvalidB) return 1;
            if (!isInvalidA && isInvalidB) return -1;
            return 0;
        });

        const merchants = countyData.merchants;
        const totalItems = merchants.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);

        cityStatsEl.textContent = `共 ${totalItems} 家`;

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const currentMerchants = merchants.slice(startIndex, endIndex);

        // 2. 【渲染邏輯】組合商家清單 HTML
        let html = `
            <table id="facilities-table" class="ranking-table" style="width: 60% !important; max-width: 800px; margin: 0 auto 20px auto !important;">
                <thead>
                    <tr>
                        <th style="width: 80px; text-align: center;">序號</th>
                        <th style="text-align: center;">名稱</th>
                    </tr>
                </thead>
                <tbody>
        `;

        currentMerchants.forEach((merchant, index) => {
            // 判定是否為失效店家：僅檢查是否以半形或全形括號「開頭」
            const isInvalid = merchant.startsWith('(') || merchant.startsWith('（');
            
            let displayName = merchant;
            if (isInvalid) {
                // 如果是失效店家，才將「開頭」的括號替換成整齊的 【 】
                // 正則表達式中的 ^ 代表字串開頭
                displayName = merchant.replace(/^[\(（](.*?)[\)）]/, '【$1】');
            }
            
            // 設定樣式：失效店家為淺灰底 (#f9fafb) 與淡色字 (#9ca3af)
            let rowStyle = isInvalid ? 'background-color: #f9fafb; color: #9ca3af;' : '';
            let hoverTitle = isInvalid ? 'title="已不符合資格"' : '';

            html += `
                <tr style="${rowStyle}" ${hoverTitle}>
                    <td data-label="序號" style="text-align: center;">${startIndex + index + 1}</td>
                    <td data-label="業者名稱" style="text-align: left !important; padding-left: 20px;">${displayName}</td>
                </tr>
            `;
        });

        html += `</tbody></table>`;

        // 3. 【分頁邏輯】組合分頁按鈕
        if (totalPages > 1) {
            html += `
                <div class="pagination-wrapper">
                    <button class="page-btn" onclick="changePage(-1)" ${currentPage === 1 ? 'disabled' : ''}>上一頁</button>
                    <span class="page-info">第 ${currentPage} / ${totalPages} 頁</span>
                    <button class="page-btn" onclick="changePage(1)" ${currentPage === totalPages ? 'disabled' : ''}>下一頁</button>
                </div>
            `;
        }

        merchantListContainer.innerHTML = html;

        // ==========================================
        // 【新增】：在背景產生「包含所有頁面」的 CSV 資料，並獨立出狀態欄位
        // ==========================================
        let fullCsvArray = [];
        // 自訂 CSV 標題列 (新增了「資格狀態」)
        fullCsvArray.push(['序號', '特約機構名稱', '資格狀態'].join(',')); 

        countyData.merchants.forEach((merchant, index) => {
            const isInvalid = merchant.startsWith('(') || merchant.startsWith('（');
            let displayName = merchant;
            let status = '符合'; // 預設狀態
            
            if (isInvalid) {
                // 將前方的括號改為整齊的 【 】
                displayName = merchant.replace(/^[\(（](.*?)[\)）]/, '【$1】');
                status = '不符合資格'; // 標記為不符合
            }
            
            // CSV 跳脫處理 (避免名稱中有逗號導致錯位)
            displayName = displayName.replace(/"/g, '""');
            if (displayName.includes(',') || displayName.includes('"')) {
                displayName = `"${displayName}"`;
            }
            
            // 組合單筆資料並推入陣列
            fullCsvArray.push([index + 1, displayName, status].join(','));
        });

        // 找到剛剛渲染到畫面上的表格，把完整 CSV 字串藏進 dataset 裡
        const currentTable = merchantListContainer.querySelector('table');
        if (currentTable) {
            currentTable.dataset.fullCsv = fullCsvArray.join('\n');
        }

        // ==========================================
        // 呼叫全域函數掛載下載按鈕
        if (typeof initTableDownload === 'function') {
            initTableDownload();
        }
    }

    // 換頁功能 (掛載到 window 供 HTML 按鈕呼叫)
    window.changePage = function (delta) {
        currentPage += delta;
        renderMerchantList();
        // 換頁後稍微往上捲動對齊清單頂部
        document.querySelector('.detail-header').scrollIntoView({ behavior: 'smooth' });
    }

    // 啟動程式
    init();
});