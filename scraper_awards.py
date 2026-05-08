import os
import json
import time
import random
import re
from datetime import datetime
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

# 縣市對照表
CITY_MAPPING = {
    "臺北市": "taipei", "台北市": "taipei", "新北市": "new-taipei", "桃園市": "taoyuan",
    "臺中市": "taichung", "台中市": "taichung", "臺南市": "tainan", "台南市": "tainan",
    "高雄市": "kaohsiung", "基隆市": "keelung", "新竹市": "hsinchu-city", "新竹縣": "hsinchu-county",
    "苗栗縣": "miaoli", "彰化縣": "changhua", "南投縣": "nantou", "雲林縣": "yunlin",
    "嘉義市": "chiayi-city", "嘉義縣": "chiayi-county", "屏東縣": "pingtung", "宜蘭縣": "yilan",
    "花蓮縣": "hualien", "臺東縣": "taitung", "台東縣": "taitung", "澎湖縣": "penghu", 
    "金門縣": "kinmen", "連江縣": "lienchiang"
}

REVERSE_MAPPING = {v: k for k, v in CITY_MAPPING.items() if "台" not in k} 

def scrape_corporate_awards_ultimate():
    print("🚀 啟動【國家企業環保獎】精準視力版爬蟲 (直接抓取縣市欄位)...")
    url = "https://aeepa.moenv.gov.tw/Nation_history_deeds.aspx"
    
    chrome_options = Options()
    chrome_options.add_argument('--headless')
    chrome_options.add_argument('--disable-gpu')
    chrome_options.add_argument('--window-size=1920,1080')
    chrome_options.add_argument('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36')

    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    
    aggregated_data = {}
    total_scraped = 0
    current_page = 1
    last_edition = "未知"
    total_pages = 49 
    
    try:
        driver.get(url)
        WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.TAG_NAME, "table")))
        time.sleep(2) 

        try:
            page_text = driver.find_element(By.TAG_NAME, "body").text
            match = re.search(r'第\s*\d+\s*/\s*(\d+)\s*頁', page_text)
            if match:
                total_pages = int(match.group(1))
        except Exception:
            pass

        while True:
            print(f"📄 正在解析第 {current_page}/{total_pages} 頁...")
            time.sleep(1.5) 
            
            soup = BeautifulSoup(driver.page_source, 'html.parser')
            tables = soup.find_all('table')
            
            target_table = None
            for tbl in tables:
                # 確保這個表格有「縣市」欄位
                if "屆數" in tbl.text and "獲獎單位" in tbl.text and "縣市" in tbl.text:
                    target_table = tbl
                    break
            
            if target_table:
                for row in target_table.find_all('tr'):
                    cols = row.find_all(['td', 'th'])
                    # 💡 保留空字串，以維持欄位 index 的絕對位置
                    col_texts = [re.sub(r'\s+', ' ', c.text.strip()) for c in cols]
                    
                    if not any(col_texts) or "屆數" in col_texts[0] or "獲獎單位" in col_texts[0]:
                        continue
                        
                    # 💡 依照截圖，完整列有 6 個欄位：[屆數, 獎項, 單位, 縣市, 格式, 下載]
                    if len(col_texts) >= 6:
                        last_edition = col_texts[0]
                        award_level = col_texts[1]
                        company_name = col_texts[2]
                        city_raw = col_texts[3]      # ⬅️ 直接抓取縣市欄位
                    elif len(col_texts) == 5:
                        # 發生跨列，少掉屆數
                        award_level = col_texts[0]
                        company_name = col_texts[1]
                        city_raw = col_texts[2]      # ⬅️ 直接抓取縣市欄位
                    elif len(col_texts) == 4:
                        # 發生跨列，少掉屆數與獎項
                        company_name = col_texts[0]
                        city_raw = col_texts[1]      # ⬅️ 直接抓取縣市欄位
                    else:
                        continue

                    if "HyperLink" in award_level or "事蹟" in last_edition or "事蹟" in company_name or "彙編" in company_name or len(company_name) < 2 or company_name == "×":
                        continue

                    edition_num = re.search(r'\d+', last_edition)
                    clean_edition = edition_num.group(0) if edition_num else last_edition

                    # 【精準分類】直接比對抓下來的縣市名稱
                    city_code = "other"
                    for zh_city, en_city in CITY_MAPPING.items():
                        if zh_city in city_raw:
                            city_code = en_city
                            break
                    
                    # 👇 加入這兩行，讓爬蟲抓出兇手！
                    if city_code == "other":
                        print(f"🚨 抓到未分類！企業：【{company_name}】/ 網頁填寫的縣市竟然是：【{city_raw}】")
                    
                    if city_code not in aggregated_data:
                        city_zh = REVERSE_MAPPING.get(city_code, "未分類縣市") if city_code != "other" else "未分類"
                        aggregated_data[city_code] = {"cityName": city_zh, "history": {}}
                        
                    if clean_edition not in aggregated_data[city_code]["history"]:
                        aggregated_data[city_code]["history"][clean_edition] = {
                            "總數": 0, "levels": {}, "winners": []
                        }
                        
                    history_node = aggregated_data[city_code]["history"][clean_edition]
                    history_node["總數"] += 1
                    history_node["levels"][award_level] = history_node["levels"].get(award_level, 0) + 1
                    history_node["winners"].append({"n": company_name, "l": award_level})
                    
                    total_scraped += 1

            try:
                if current_page >= total_pages:
                    break
                next_page_num = str(current_page + 1)
                next_btn = driver.find_element(By.XPATH, f"//a[text()='{next_page_num}'] | //a[contains(text(), '下一頁')] | //a[contains(text(), '>')]")
                next_btn.click()
                current_page += 1
                time.sleep(random.uniform(2, 4))
            except Exception:
                break

    except Exception as e:
        print(f"❌ 發生錯誤: {e}")
    finally:
        driver.quit() 

    today_str = datetime.today().strftime('%Y-%m-%d')
    with open('data/awards_summary.json', 'w', encoding='utf-8') as f:
        json.dump({"updateDate": today_str, "statistics": aggregated_data}, f, ensure_ascii=False, indent=4)
        
    print(f"\n🎉 任務完成！靠著網頁原生的縣市欄位，精準解析了 {total_scraped} 筆記錄。")

if __name__ == "__main__":
    scrape_corporate_awards_ultimate()