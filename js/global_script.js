// global_script.js - 版本：v1.7 (整合表格下載與手機版響應式外框)

document.addEventListener('DOMContentLoaded', () => {
    // === 1. 原有的導覽列狀態亮燈邏輯 ===
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('#global-navbar .nav-links a');

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (currentPath.includes(link.getAttribute('href'))) {
            link.classList.add('active');
        }
    });

    // === 2. 禁止滑鼠右鍵與快捷鍵設定 ===
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'F12' || (e.ctrlKey && (e.key === 'c' || e.key === 'C' || e.key === 'u' || e.key === 'U'))) {
            e.preventDefault();
        }
    });

    document.addEventListener('dragstart', (e) => {
        if (e.target.tagName === 'IMG') {
            e.preventDefault();
        }
    });

    // === 3. 啟動：全域表格下載 CSV 邏輯 ===
    initTableDownload();

    // === 4. 啟動：自動為所有表格加上響應式滑動容器 (手機版防破圖) ===
    const tables = document.querySelectorAll("table");
    tables.forEach(table => {
        const wrapper = document.createElement("div");
        wrapper.className = "table-responsive";
        // 將外框插入到 table 之前，並將 table 搬進去
        table.parentNode.insertBefore(wrapper, table);
        wrapper.appendChild(table);
    });
    // === 5. 新增：手機模式懸浮按鈕與跨頁記憶邏輯 ===
    initMobileModeToggle();

    // === 6. 自動在頁尾加入免責聲明警語 ===
    const footer = document.querySelector('footer');
    if (footer) {
        const disclaimer = document.createElement('div');
        disclaimer.textContent = "※ 網頁資料可能有誤，請至官方網頁確認";
        
        // 微調外觀：設定字體大小、顏色（柔和的灰色帶點專業感）與上方間距
        disclaimer.style.fontSize = "0.85rem";
        disclaimer.style.color = "#6b7280"; 
        disclaimer.style.marginTop = "10px";
        disclaimer.style.letterSpacing = "1px";
        
        // 將警語塞入頁尾的最下方
        footer.appendChild(disclaimer);
    }
});

// ==========================================
// 以下為表格下載的核心函數 (保持你原本的優秀邏輯，無需更動)
// ==========================================
function initTableDownload() {
    const pageTitle = document.title.trim() || '未命名網頁';
    const tables = document.querySelectorAll('table');

    tables.forEach((table, index) => {
        // 防呆機制：避免重複加入按鈕
        if (table.hasAttribute('data-download-added')) return;
        table.setAttribute('data-download-added', 'true');

        const headerRow = table.querySelector('thead tr') || table.querySelector('tr');
        if (!headerRow) return;

        const headerCells = headerRow.querySelectorAll('th, td');
        if (headerCells.length === 0) return;

        const lastCell = headerCells[headerCells.length - 1];

        const downloadBtn = document.createElement('span');
        downloadBtn.innerHTML = ' 📥';
        downloadBtn.style.cursor = 'pointer';
        downloadBtn.style.marginLeft = '10px';
        downloadBtn.style.fontSize = '1.1em';
        downloadBtn.title = '點擊下載表格資料';

        lastCell.appendChild(downloadBtn);

        downloadBtn.addEventListener('click', (e) => {
            e.stopPropagation();

            // 1. 在點擊的瞬間尋找表格名稱
            let tableTitle = `表格${index + 1}`;
            const caption = table.querySelector('caption');

            if (caption) {
                tableTitle = caption.innerText.trim();
            } else {
                let currentElement = table;
                let foundHeading = false;

                while (currentElement && currentElement !== document.body && !foundHeading) {
                    let prevSibling = currentElement.previousElementSibling;
                    while (prevSibling) {
                        if (/^H[1-6]$/.test(prevSibling.tagName)) {
                            tableTitle = prevSibling.innerText.trim();
                            foundHeading = true;
                            break;
                        }
                        const innerHeading = prevSibling.querySelector('h1, h2, h3, h4, h5, h6');
                        if (innerHeading) {
                            tableTitle = innerHeading.innerText.trim();
                            foundHeading = true;
                            break;
                        }
                        prevSibling = prevSibling.previousElementSibling;
                    }
                    currentElement = currentElement.parentElement;
                }
            }

            tableTitle = tableTitle.replace(/[\\/:*?"<>|\n\r]/g, '');

            // ==========================================
            // 【修正版】優先抓取彈出視窗 (Modal) 的標題作為檔名
            // ==========================================
            const modalTitleEl = document.getElementById('modal-year-title');

            // 檢查視窗標題是否存在，且確認現在視窗是打開的 (display != none)
            const isModalOpen = modalTitleEl && window.getComputedStyle(modalTitleEl.closest('#chart-modal-overlay') || {}).display !== 'none';

            if (isModalOpen && modalTitleEl.innerText.trim() !== "") {
                let modalText = modalTitleEl.innerText.trim();

                // 1. 去除括號及其中的統計文字
                modalText = modalText.split(' (')[0].trim();

                // 2. 將空格轉換為底線
                const formattedTitle = modalText.replace(/\s+/g, '_');

                // 3. 組合最終檔名 (直接把乾淨的標題交給它，不自己加前綴)
                tableTitle = formattedTitle;
            } // 🌟 新增：要在這裡就把 if 關起來！

            // 動態抓取「年份」與「縣市」下拉選單的值
            const selects = document.querySelectorAll('select');
            selects.forEach(select => {
                const option = select.options[select.selectedIndex];
                if (option) {
                    const optionText = option.innerText.trim();

                    // 1. 處理年份：判斷是否為年份選項 (包含 '年' 或是 4位數字，且排除 '歷年' 本身)
                    if ((optionText.includes('年') || /^\d{4}$/.test(optionText)) && !optionText.includes('歷年')) {
                        // 確保格式是 "2022年" (把空白拿掉)
                        const yearStr = optionText.includes('年') ? optionText.replace(/\s+/g, '') : `${optionText}年`;

                        // 關鍵修改：針對各種可能的標題文字，精確插入年份
                        if (tableTitle.includes('歷年累計響應統計')) {
                            // 如果檔名是：...桃園市_歷年累計響應統計
                            tableTitle = tableTitle.replace('歷年累計響應統計', `${yearStr}響應統計_歷年累計`);

                        } else if (tableTitle.includes('綠色夥伴響應統計_歷年累計')) {
                            // 如果檔名是：...高雄市_綠色夥伴響應統計_歷年累計
                            tableTitle = tableTitle.replace('綠色夥伴響應統計_歷年累計', `${yearStr}響應統計_歷年累計`);

                        } else if (tableTitle.includes('綠色夥伴響應統計')) {
                            // 一般情況
                            tableTitle = tableTitle.replace('綠色夥伴響應統計', `${yearStr}響應統計`);

                        } else if (!tableTitle.includes(yearStr)) {
                            // 防呆：如果上面的字眼都沒出現，至少把年份加在最後面
                            tableTitle += `_${yearStr}`;
                        }
                    }

                    // 2. 處理縣市：維持你原有的邏輯不動
                    else if (select.id === 'city-dropdown' && optionText !== '請選擇縣市' && option.value !== 'all') {
                        if (!tableTitle.includes(optionText)) {
                            tableTitle = `${optionText}_${tableTitle}`;
                        }
                    }
                }
            });

            const today = new Date();
            const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            const fileName = `${pageTitle}_${tableTitle}_${dateString}.csv`;

            // === 新增：默默發送下載紀錄到 Google 表單 ===
            logDownloadToGoogleForm(fileName);

            // 2. 處理 CSV 資料提取
            let csvContent = '\uFEFF';
            if (table.dataset.fullCsv) {
                csvContent += table.dataset.fullCsv;
            } else {
                const rows = table.querySelectorAll('tr');
                rows.forEach(row => {
                    const cols = row.querySelectorAll('th, td');
                    const rowData = [];

                    cols.forEach(col => {
                        const cloneCell = col.cloneNode(true);

                        const spans = cloneCell.querySelectorAll('span');
                        spans.forEach(span => {
                            if (span.innerText.includes('📥') || span.title.includes('下載')) {
                                span.remove();
                            }
                        });

                        const mediaElements = cloneCell.querySelectorAll('img, svg, i, em');
                        mediaElements.forEach(el => el.remove());

                        cloneCell.innerHTML = cloneCell.innerHTML
                            .replace(/<br\s*[\/]?>/gi, ', ')
                            .replace(/<\/span>\s*<span/gi, '</span>, <span')
                            .replace(/<\/div>\s*<div/gi, '</div>, <div');

                        let text = cloneCell.innerText;
                        text = text.replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
                        text = text.replace(/,\s*,/g, ', ').replace(/^,|,$/g, '').trim();
                        text = text.replace(/"/g, '""');
                        if (text.includes(',') || text.includes('"')) {
                            text = `"${text}"`;
                        }
                        rowData.push(text);
                    });
                    csvContent += rowData.join(',') + '\n';
                });
            }
            // 3. 觸發下載
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        });
    });
}
function initMobileModeToggle() {
    // 1. 動態在網頁右上角建立切換按鈕
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'mobile-mode-btn';
    toggleBtn.innerHTML = '📱 手機模式';

    // 2. 讀取瀏覽器的「短期記憶」，檢查上次是不是開著手機模式
    const isMobileMode = localStorage.getItem('isMobileMode') === 'true';

    // 如果上次是開著的，就在 <body> 貼上標籤，並改變按鈕外觀
    if (isMobileMode) {
        document.body.classList.add('mobile-mode');
        toggleBtn.classList.add('active');
    }

    // 3. 設定按鈕點擊事件
    toggleBtn.addEventListener('click', () => {
        // 切換 body 的 class (有就拿掉，沒有就加上)
        const currentMode = document.body.classList.toggle('mobile-mode');

        // 切換按鈕本身的視覺樣式
        toggleBtn.classList.toggle('active');

        // 將最新狀態寫入瀏覽器記憶中
        localStorage.setItem('isMobileMode', currentMode);
    });

    // 4. 將按鈕放入網頁中
    document.body.appendChild(toggleBtn);
}
// ==========================================
// 新增：背景自動提交 Google 表單紀錄函數 (隱藏框架法)
// ==========================================
function logDownloadToGoogleForm(fileName) {
    const actionUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSdcRXoI8BsLVeJI52T02Lp8_DmWczmZeRz8Bpk8tgXAa-7Xpw/formResponse';
    const entryId = 'entry.387104524';

    // 1. 建立一個隱藏的 iframe 作為接收目標，確保畫面不會跳轉
    const iframeName = 'hidden_iframe_' + Date.now();
    const iframe = document.createElement('iframe');
    iframe.name = iframeName;
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    // 2. 建立一個虛擬的 HTML 表單
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = actionUrl;
    form.target = iframeName; // 將表單送出結果導向隱藏的 iframe
    form.style.display = 'none';

    // 3. 建立輸入框並填入資料 (就像真實的表單欄位)
    const input = document.createElement('input');
    input.type = 'text';
    input.name = entryId;
    input.value = fileName;
    form.appendChild(input);

    // 4. 將這些隱形元素加入網頁並按下「送出」
    document.body.appendChild(form);
    form.submit();
    
    console.log(`📥 嘗試透過隱藏表單送出紀錄：${fileName}`);

    // 5. 兩秒後，把用完的隱形表單跟框架從網頁上掃掉，保持網頁乾淨
    setTimeout(() => {
        if (document.body.contains(form)) document.body.removeChild(form);
        if (document.body.contains(iframe)) document.body.removeChild(iframe);
    }, 2000);
}
