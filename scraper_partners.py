import json
import urllib.request
import ssl
import time
import random
import os
from datetime import datetime

# 🧥 隱形披風庫：多種常見的瀏覽器 User-Agent
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
]

# 沿用你專案中的縣市中英文對照表
CITY_MAPPING = {
    "臺北市": "taipei", "台北市": "taipei", "新北市": "new-taipei", "桃園市": "taoyuan",
    "臺中市": "taichung", "台中市": "taichung", "臺南市": "tainan", "台南市": "tainan",
    "高雄市": "kaohsiung", "基隆市": "keelung", "新竹市": "hsinchu-city", "新竹縣": "hsinchu-county",
    "苗栗縣": "miaoli", "彰化縣": "changhua", "南投縣": "nantou", "雲林縣": "yunlin",
    "嘉義市": "chiayi-city", "嘉義縣": "chiayi-county", "屏東縣": "pingtung", "宜蘭縣": "yilan",
    "花蓮縣": "hualien", "臺東縣": "taitung", "台東縣": "taitung", "澎湖縣": "penghu", 
    "金門縣": "kinmen", "連江縣": "lienchiang"
}

def scrape_and_aggregate_partners():
    print("🚀 啟動【綠色夥伴】全自動爬蟲與統計聚合器...")
    url = "https://greenlifestyle.moenv.gov.tw/api/api/GOffice/Participate/ComplexSearch"
    context = ssl._create_unverified_context()
    
    # 用來存放最終輕量化統計結果的字典
    aggregated_data = {}
    page = 1
    total_records_processed = 0
    
    while True:
        print(f"📄 正在叩關第 {page} 頁...")
        
        # 嚴格遵守伺服器的 30 筆限制，避免被判定異常
        payload = {
            "CityId": "", "Count": "30", "IdentityTypeIds": "",
            "Month": "0", "Name": "", "Page": str(page),
            "SortType": "10", "Year": "0"
        }
        data = json.dumps(payload).encode('utf-8')
        current_ua = random.choice(USER_AGENTS)
        
        headers = {
            'User-Agent': current_ua,
            'Content-Type': 'application/json; charset=utf-8',
            'Accept': '*/*',
            'Origin': 'https://greenlifestyle.moenv.gov.tw',
            'Referer': f'https://greenlifestyle.moenv.gov.tw/categories/green_office/participate?page={page}',
            # 從環境變數讀取 MOENV_API_KEY，若讀不到則保留為 None 或空字串
            'x-api-key': os.getenv('MOENV_API_KEY')
        }
        
        # === 局部修改：加入重試迴圈 ===
        max_retries = 3
        success_fetch = False
        
        for retry in range(max_retries):
            try:
                req = urllib.request.Request(url, data=data, headers=headers, method='POST')
                
                with urllib.request.urlopen(req, context=context) as response:
                    result = json.loads(response.read().decode('utf-8'))
                    
                    result_object = result.get('resultObject', {})
                    data_list = result_object.get('participates', [])
                    
                    if not data_list:
                        print("\n✅ 伺服器回傳空陣列，代表已無資料，翻頁結束！")
                        success_fetch = True
                        break 
                        
                    for item in data_list:
                        raw_city = item.get('cityName', '未知縣市')
                        city_code = CITY_MAPPING.get(raw_city, 'other')
                        year = item.get('createTime', '0000-')[:4]
                        identity = item.get('identityName', '其他')
                        
                        if city_code not in aggregated_data:
                            aggregated_data[city_code] = {"cityName": raw_city, "history": {}}
                        
                        if year not in aggregated_data[city_code]["history"]:
                            aggregated_data[city_code]["history"][year] = {"總數": 0}
                            
                        aggregated_data[city_code]["history"][year]["總數"] += 1
                        
                        if identity not in aggregated_data[city_code]["history"][year]:
                            aggregated_data[city_code]["history"][year][identity] = 0
                        aggregated_data[city_code]["history"][year][identity] += 1
                        
                        total_records_processed += 1
                        
                    print(f"  └ 成功解析 {len(data_list)} 筆資料，累積處理 {total_records_processed} 筆...")
                    
                    success_fetch = True 
                    break 
                    
            except Exception as e:
                print(f"\n⚠️ 第 {page} 頁嘗試第 {retry+1} 次連線失敗：{e}")
                if retry < max_retries - 1:
                    print("  🕒 伺服器可能繁忙，休息 60 秒後重試...")
                    time.sleep(60)
                else:
                    print(f"  ❌ 第 {page} 頁重試多次後仍失敗，放棄該頁。")

        # 如果重試 3 次都失敗，或是遇到空陣列，就跳出最外層的翻頁大迴圈
        if not success_fetch or not data_list:
            break

        # 每爬 50 頁，額外強制休息 15-30 秒，打斷連線規律
        if page % 50 == 0:
            long_sleep = random.uniform(15, 30)
            print(f"  [☕ 長休息] 已完成 50 頁，暫停 {long_sleep:.2f} 秒避免被阻擋...")
            time.sleep(long_sleep)
            
        # 💤 擬真人類休息 (嚴格遵守 1.5 到 3.5 秒)
        sleep_time = random.uniform(1.5, 3.5)
        print(f"  [🛡️ 防護機制] 休息 {sleep_time:.2f} 秒...\n")
        time.sleep(sleep_time)
        page += 1

    # 輸出最終的極輕量化 JSON
    today_str = datetime.today().strftime('%Y-%m-%d')
    final_json = {
        "updateDate": today_str,
        "statistics": aggregated_data
    }
    
    # 確保 data 資料夾存在
    os.makedirs('data', exist_ok=True)
    output_path = 'data/partners_summary.json'
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(final_json, f, ensure_ascii=False, indent=4)
        
    print(f"\n🎉 任務完成！共處理 {total_records_processed} 筆資料。")
    print(f"💾 極輕量統計檔已儲存至：{output_path}")

if __name__ == "__main__":
    scrape_and_aggregate_partners()