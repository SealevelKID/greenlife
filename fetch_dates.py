import pandas as pd
import time
import random
import os
import glob
import re
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

def main():
    print("📦 開始尋找原始旅宿名單...")
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)

    # 🌟 升級 1：嚴格尋找「旅宿」或「旅館」相關的檔案，防止抓到綠色商店或餐廳
    all_files = glob.glob('*.ods') + glob.glob('*.xlsx')
    target_files = []
    
    for f in all_files:
        # 必須包含關鍵字，且絕對不能是爬蟲自己產出的結果檔
        if ("旅宿" in f or "旅館" in f) and "Selenium" not in f:
            target_files.append(f)
    
    if not target_files:
        print("❌ 找不到檔名包含『旅宿』或『旅館』的名單檔案！請確認 GitHub 儲存庫內是否有正確的檔案。")
        return
        
    input_file = max(target_files, key=os.path.getmtime)
    print(f"📂 自動鎖定最新【旅宿】檔案: {input_file}")

    try:
        # 依照副檔名使用對應的讀取方式
        if input_file.endswith('.ods'):
            df = pd.read_excel(input_file, engine='odf')
        else:
            df = pd.read_excel(input_file)
    except Exception as e:
        print(f"❌ 讀取檔案失敗: {e}")
        return

    # 🌟 升級 2：自動容錯偵測真實的飯店名稱欄位 (同步 JS 防呆邏輯)
    hotel_col = next((col for col in df.columns if col in ['旅店名稱', '旅館名稱', '旅宿名稱', '環保標章旅館名稱', '業者名稱']), None)
    
    if not hotel_col:
        print(f"❌ 嚴重錯誤：找不到代表「旅店」的欄位名稱！目前檔案有的欄位為：{df.columns.tolist()}")
        return

    if '證書到期日' not in df.columns:
        df['證書到期日'] = "未登錄"

    # 🌟 設定 Chrome 瀏覽器參數
    chrome_options = Options()
    chrome_options.add_argument('--headless')  # 不開啟視窗，在背景執行
    chrome_options.add_argument('--disable-gpu')
    chrome_options.add_argument('--window-size=1920,1080')
    # 模擬真人標頭
    chrome_options.add_argument('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36')

    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)

    total_rows = len(df)
    print("🚀 開始透過模擬瀏覽器爬取日期...\n")
    
    try:
        for index, row in df.iterrows():
            # 1. 取得原始名稱
            raw_name = str(row[hotel_col])
            
            # 2. 終極防呆：攔截 Excel 的隱形空白行
            # 當 pandas 讀到空行時，會把它轉成字串 "nan"。我們直接跳過，避免拿 "nan" 去搜尋
            if raw_name.lower() == 'nan' or not raw_name.strip():
                print(f"[{index + 1}/{total_rows}] ⚠️ 發現空行或無名稱，自動跳過...")
                df.at[index, '證書到期日'] = "無名稱"
                continue

            # 3. 清洗魔法：去除多餘空白，並將所有的「台」強制轉成「臺」
            hotel_name = raw_name.strip().replace('台', '臺')

            # 4. 順手把洗乾淨的「臺」存回 DataFrame 中
            # 這樣等一下輸出的『環保旅宿_Selenium結果.xlsx』裡面的字體也會是完美統一的！
            df.at[index, hotel_col] = hotel_name

            print(f"[{index + 1}/{total_rows}] 正在查詢: {hotel_name} ...", end=" ")

            # 環境部搜尋網址
            search_url = f"https://greenlifestyle.moenv.gov.tw/categories/greenProductSearch?searched=true&k={hotel_name}"

            try:
                driver.get(search_url)
                
                # 🌟 關鍵：等待「證書效期」這幾個字出現在網頁上 (最多等 10 秒)
                # 這能解決「內容可能動態載入中」的問題
                WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.TAG_NAME, "body"))
                )
                
                # 稍微多等一下讓 JS 跑完
                time.sleep(1.5)
                
                page_text = driver.find_element(By.TAG_NAME, "body").text
                
                # 使用你提供的格式進行匹配
                match = re.search(r'證書效期\s*[:：]?\s*[\d/]+\s*至\s*([\d/]+)', page_text)
                
                if match:
                    final_date = match.group(1).strip()
                    df.at[index, '證書到期日'] = final_date
                    print(f"✅ 找到日期: {final_date}")
                else:
                    if "查無資料" in page_text or "0筆" in page_text:
                        print("❌ 網站查無資料")
                        df.at[index, '證書到期日'] = "查無資料"
                    else:
                        print("⚠️ 頁面已載入但找不到日期標籤")
                        df.at[index, '證書到期日'] = "格式異常"
                        
            except Exception as e:
                print(f"❌ 查詢超時或出錯")
                df.at[index, '證書到期日'] = "連線超時"

            # 模擬人類行為休息 (採用更安全的擬真間隔)
            time.sleep(random.uniform(1.5, 3.5))

    finally:
        driver.quit() # 務必關閉瀏覽器

    output_file = '環保旅宿_Selenium結果.xlsx'
    df.to_excel(output_file, index=False)
    print(f"\n🎉 任務結束！新檔案已儲存。")

# 👇 確保最後這兩行存在，程式才會真正啟動
if __name__ == "__main__":
    main()
