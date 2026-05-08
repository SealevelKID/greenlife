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
    const fileUpload = document.getElementById('file-upload');
    const triggerUploadBtn = document.getElementById('trigger-upload'); // 新增：抓取自訂按鈕
    const uploadStatus = document.getElementById('upload-status');
    const overviewView = document.getElementById('overview-view');
    const rankingTableBody = document.getElementById('ranking-table-body');
    const totalStats = document.getElementById('total-stats');
    const updateDate = document.getElementById('update-date');
    const initialPrompt = document.getElementById('initial-prompt');

    // ==========================================
    // 【新增】綠色商店專屬快取設定
    // ==========================================
    const CACHE_KEY = 'eco_stores_data'; // 專屬 Key，避免跟其他網頁打架
    const CACHE_EXPIRY_MS = 60 * 60 * 1000; // 1 小時過期

    function checkCache() {
        const cachedString = localStorage.getItem(CACHE_KEY);
        if (cachedString) {
            const cachedData = JSON.parse(cachedString);
            const now = new Date().getTime();

            if (now - cachedData.timestamp < CACHE_EXPIRY_MS) {
                // 如果沒過期，直接拿快取資料來畫排行榜
                processAndRender(cachedData.data);

                uploadStatus.textContent = "✅ 已自動載入快取資料 (1小時內有效)";
                overviewView.style.display = "block";

                // 還原當初上傳的日期
                if (cachedData.dateStr) updateDate.textContent = cachedData.dateStr;
                // 如果有快取，隱藏初始提示
                if (initialPrompt) initialPrompt.style.display = "none";
                return true;
            } else {
                localStorage.removeItem(CACHE_KEY);
            }
        }
        return false;
    }

    // ==========================================

    // 縣市正規化對照表 (維持不變)
    // 擴充字典：把縣轄市也納入，避免它們被獨立出來
    const cityMapping = {
        // 直轄市/市
        "臺北市": "台北市", "台北市": "台北市",
        "新北市": "新北市",
        "桃園市": "桃園市", "桃園縣": "桃園市", // 相容舊制
        "臺中市": "台中市", "台中市": "台中市",
        "臺南市": "台南市", "台南市": "台南市",
        "高雄市": "高雄市",
        "基隆市": "基隆市",
        "新竹市": "新竹市",
        "嘉義市": "嘉義市",

        // 縣與底下的縣轄市 (直接歸類回縣)
        "新竹縣": "新竹縣", "竹北市": "新竹縣",
        "苗栗縣": "苗栗縣", "苗栗市": "苗栗縣", "頭份市": "苗栗縣",
        "彰化縣": "彰化縣", "彰化市": "彰化縣", "員林市": "彰化縣",
        "南投縣": "南投縣", "南投市": "南投縣",
        "雲林縣": "雲林縣", "斗六市": "雲林縣",
        "嘉義縣": "嘉義縣", "太保市": "嘉義縣", "朴子市": "嘉義縣",
        "屏東縣": "屏東縣", "屏東市": "屏東縣",
        "宜蘭縣": "宜蘭縣", "宜蘭市": "宜蘭縣",
        "花蓮縣": "花蓮縣", "花蓮市": "花蓮縣",
        "臺東縣": "台東縣", "台東縣": "台東縣", "臺東市": "台東縣", "台東市": "台東縣",

        // 離島
        "澎湖縣": "澎湖縣", "馬公市": "澎湖縣",
        "金門縣": "金門縣",
        "連江縣": "連江縣"
    };

    function extractCity(address, name) {
        let textToSearch = (address || "") + (name || "");

        // 1. 嚴格對照字典表 (例如看到"屏東市"會自動轉成"屏東縣")
        for (const [key, value] of Object.entries(cityMapping)) {
            if (textToSearch.includes(key)) return value;
        }

        // 2. 最後防線：處理省略「縣/市」字眼的情況 (例如地址只寫"屏東中正路")
        if (address) {
            let cleanAddress = address.replace(/^\d{3,5}\s*/, ''); // 清理郵遞區號
            if (cleanAddress.length >= 2) {
                for (const [key, value] of Object.entries(cityMapping)) {
                    // 取字典裡的前兩個字(如"台北","屏東")來比對地址開頭
                    let shortName = key.substring(0, 2);
                    if (cleanAddress.startsWith(shortName)) {
                        return value;
                    }
                }
            }
        }

        // 3. 如果連前兩個字都對不上，就代表資料真的沒寫縣市，直接歸類為未知
        return "未知縣市";
    }

    // 點擊「上傳檔案」按鈕時，觸發隱藏的 file input 彈出選擇視窗
    triggerUploadBtn.addEventListener('click', () => {
        fileUpload.click();
    });

    // 當使用者選好檔案後，直接自動開始分析
    fileUpload.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return; // 如果使用者取消選擇檔案則中斷

        uploadStatus.textContent = "⏳ 讀取與分析中，請稍候...";
        triggerUploadBtn.disabled = true; // 處理期間禁用按鈕避免重複點擊

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

                // ==========================================
                // 【新增】防呆模式：檢查是否傳錯檔案
                // ==========================================
                if (jsonData.length > 0) {
                    const firstRow = jsonData[0];
                    // 檢查欄位中是否包含綠色商店的專屬標題
                    if (!('綠色商店名稱' in firstRow) && !('name' in firstRow)) {
                        // 跳出視窗警告
                        showAlert("⚠️ 傳錯檔案囉！\n這似乎不是「綠色商店」的資料，請確認是否誤傳為環保餐廳或環保標章旅館的檔案。");

                        // 更新網頁上的文字狀態
                        uploadStatus.textContent = "❌ 上傳失敗：請確認檔案是否正確。";
                        triggerUploadBtn.disabled = false; // 恢復按鈕功能[cite: 1]
                        fileUpload.value = ""; // 清空 input 的值[cite: 1]

                        return; // 直接中斷執行，不要往下產生排行榜和寫入快取
                    }
                } else {
                    // 順便防呆：如果使用者上傳了一個完全空白的 Excel
                    showAlert("⚠️ 上傳的檔案裡面沒有資料喔！");
                    uploadStatus.textContent = "❌ 上傳失敗：檔案為空。";
                    triggerUploadBtn.disabled = false; //[cite: 1]
                    fileUpload.value = ""; //[cite: 1]
                    return;
                }
                // ==========================================

                // 產生排行榜[cite: 1]
                processAndRender(jsonData); //[cite: 1]

                // 產生排行榜
                processAndRender(jsonData);

                // 取得今天日期字串
                const today = new Date();
                const dateString = `更新：${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                updateDate.textContent = dateString;

                // ==========================================
                // 【新增】將解析完的資料存入 LocalStorage
                // ==========================================
                const cacheObject = {
                    timestamp: new Date().getTime(),
                    data: jsonData,
                    dateStr: dateString
                };
                localStorage.setItem(CACHE_KEY, JSON.stringify(cacheObject));
                // ==========================================

                uploadStatus.textContent = "✅ 分析完成！";
                // 上傳並解析成功後，隱藏初始提示
                if (initialPrompt) initialPrompt.style.display = "none";
                overviewView.style.display = "block";

            } catch (error) {
                console.error(error);
                uploadStatus.textContent = "❌ 解析失敗，請確認檔案格式是否正確。";
            } finally {
                triggerUploadBtn.disabled = false; // 恢復按鈕功能
                // 清空 input 的值，這樣即使下次上傳同一個檔案也能觸發 change 事件
                fileUpload.value = "";
            }
        };
        reader.readAsArrayBuffer(file);
    });

    // processAndRender 函數維持原本邏輯即可
    function processAndRender(data) {
        let cityCounts = {};
        let validCount = 0;

        data.forEach(row => {
            const name = row['綠色商店名稱'] || row['name'] || "";
            const address = row['聯絡地址'] || row['address'] || "";
            if (!name && !address) return;

            const city = extractCity(address, name);
            if (city !== "未知縣市") {
                cityCounts[city] = (cityCounts[city] || 0) + 1;
                validCount++;
            }
        });

        let statsArray = Object.entries(cityCounts).map(([city, count]) => ({
            city, count, percentage: ((count / validCount) * 100).toFixed(2)
        })).sort((a, b) => b.count - a.count);

        totalStats.textContent = `總計 ${validCount.toLocaleString()} 筆資料`;
        rankingTableBody.innerHTML = "";

        let currentRank = 1;
        statsArray.forEach((item, index) => {
            if (index > 0 && item.count < statsArray[index - 1].count) {
                currentRank = index + 1;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${currentRank}</td>
                <td>${item.city}</td>
                <td>${item.count.toLocaleString()}</td>
                <td>${item.percentage}%</td>
            `;
            rankingTableBody.appendChild(tr);
        });
    }
    // ==========================================
    // 【修正】將執行快取的指令移到所有字典與函數都建立完成之後
    // ==========================================
    checkCache();

}); // 這是整個檔案最後一行的結束符號