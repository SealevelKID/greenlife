// main_script.js - 版本：v2.1
// 功能：處理主頁的互動邏輯與全域資料讀取

document.addEventListener('DOMContentLoaded', () => {
    
    // 讀取 JSON 並更新主頁最下方的日期
    fetch('data/facilities.json')
        .then(response => response.json())
        .then(jsonData => {
            const updateDateEl = document.getElementById('update-date');
            if (updateDateEl && jsonData.updateDate) {
                updateDateEl.textContent = '更新：' + jsonData.updateDate;
            }
        })
        .catch(error => console.error('資料讀取失敗:', error));

});