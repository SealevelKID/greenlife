import json
import urllib.request
import ssl
import os  # 新增這個模組來讀取系統變數
from datetime import datetime

def fetch_and_process_data():
    today_str = datetime.today().strftime('%Y-%m-%d')
    print(f"啟動【臺灣綠生活資訊站】爬蟲機器人，執行日期：{today_str}")

    # 安全升級：從系統環境變數中讀取金鑰，不把密碼寫死在程式碼裡
    api_key = os.getenv("MOENV_API_KEY")
    
    if not api_key:
        print("❌ 找不到 API 金鑰！請確認 GitHub Secrets 或本地環境變數是否已設定。")
        return

    # 動態組裝網址
    api_url = f"https://data.moenv.gov.tw/api/v2/EEDU_S_01?api_key={api_key}&format=json&limit=1000"
    
    try:
        print("正在連線至環境部開放資料平臺...")
        context = ssl._create_unverified_context()
        
        # 升級 2：換上更完整的「人類披風」，模擬最新的 Windows Chrome 瀏覽器，並聲明接受 JSON
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*'
        }
        
        req = urllib.request.Request(api_url, headers=headers)
        
        with urllib.request.urlopen(req, context=context) as response:
            # 先不要急著轉 JSON，先把原始資料讀出來變成文字
            raw_text = response.read().decode('utf-8')
            
            
        if not raw_text.strip().startswith(('{', '[')):
                print("❌ 伺服器回傳的不是 JSON 格式！(可能是防火牆阻擋或系統維護中)")
                print(f"--- 伺服器實際回傳的內容 (前 300 個字) --- \n{raw_text[:300]}")
                return
                
            # --- 請替換為這一行 ---
        raw_records = json.loads(raw_text)
        print(f"✅ 連線成功！共抓取到 {len(raw_records)} 筆真實設施資料。")
        
    except Exception as e:
        print(f"❌ 抓取失敗，錯誤訊息：{e}")
        return

    # 縣市對照表 (完整版)
    city_mapping = {
        # 直轄市
        "臺北市": "taipei", "臺北市": "taipei",
        "新北市": "new-taipei",
        "桃園市": "taoyuan",
        "臺中市": "taichung", "臺中市": "taichung",
        "臺南市": "tainan", "臺南市": "tainan",
        "高雄市": "kaohsiung",
        
        # 其他縣市
        "基隆市": "keelung",
        "新竹市": "hsinchu-city",
        "新竹縣": "hsinchu-county",
        "苗栗縣": "miaoli",
        "彰化縣": "changhua",
        "南投縣": "nantou",
        "雲林縣": "yunlin",
        "嘉義市": "chiayi-city",
        "嘉義縣": "chiayi-county",
        "屏東縣": "pingtung",
        "宜蘭縣": "yilan",
        "花蓮縣": "hualien",
        "臺東縣": "taitung", "臺東縣": "taitung",
        "澎湖縣": "penghu",
        "金門縣": "kinmen",
        "連江縣": "lienchiang"
    }

    processed_records = []
    print("正在執行資料清洗與格式轉換...")

    for item in raw_records:
        address = item.get("address", "")
        org_name = item.get("org_name", "無資料")
        applicant = item.get("applicant", "無資料")
        cert_date = item.get("cert_date", "無資料")
        valid_date = item.get("valid_date", "")
        
        city_keyword = address[:3]
        city_code = city_mapping.get(city_keyword, "other")
        
        status = f"有效 (至{valid_date})" if valid_date else "審核中/無資料"
        
        site_type = "環境教育設施"
        if "農場" in org_name: site_type = "休閒農場"
        elif "公園" in org_name: site_type = "自然公園"
        elif "博物館" in org_name or "館" in org_name: site_type = "博物館/展覽館"
        elif "廠" in org_name or "資源回收" in org_name: site_type = "環保/處理廠"
        elif "中心" in org_name: site_type = "教育中心"
        elif "學校" in org_name or "大學" in org_name: site_type = "學校機關"

        processed_records.append({
            "cityCode": city_code,
            "date": cert_date,
            "type": site_type,
            "name": org_name,
            "unit": applicant,
            "status": status
        })

    final_json = {
        "updateDate": today_str,
        "records": processed_records
    }

    with open('data/facilities.json', 'w', encoding='utf-8') as f:
        json.dump(final_json, f, ensure_ascii=False, indent=4)
    
    print("✅ 全臺資料處理完成，已成功更新 facilities.json 檔案！")

if __name__ == "__main__":
    fetch_and_process_data()
