import pandas as pd
import json
import os
from datetime import datetime  # 🌟 新增這一行

SHEET_ID = "1Na6IfnxL-Za7EBtOOTvVUapmubFA3R5OmKZKcpxvgY0"
GID = "2016489962"
CSV_URL = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv&gid={GID}"

OUTPUT_DIR = "data"
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "green_points.json")

def fetch_and_process_data():
    print("⏳ 正在讀取環保集點試算表資料...")
    try:
        # 【新增功能 1】先讀取最上面兩列，為了抓取 B1 的「更新日：2026/4/1」
        df_raw = pd.read_csv(CSV_URL, header=None, nrows=2, dtype=str)
        update_text = str(df_raw.iloc[0, 1]).strip() # 抓取 B1
        raw_date_str = update_text.replace("更新日：", "").strip() if "更新日" in update_text else "最新資料"

        # 🌟 新增功能：統一日期格式
        # 嘗試將官方的 "YYYY/M/D" 轉換成標準的 "YYYY-MM-DD"
        update_date = raw_date_str
        try:
            # 如果字串看起來像日期（包含斜線）
            if "/" in raw_date_str:
                # 使用 datetime 解析，然後重新格式化，這樣能自動補齊個位數的 0
                parsed_date = datetime.strptime(raw_date_str, "%Y/%m/%d")
                update_date = parsed_date.strftime("%Y-%m-%d")
        except ValueError:
             # 如果解析失敗（例如官方突然寫了 "即時更新"），就維持原來的文字，避免程式當掉
            print(f"⚠️ 無法解析日期格式：{raw_date_str}，將維持原始文字。")
            update_date = raw_date_str

        # 正式讀取資料主體 (以第 2 列為標題)
        df = pd.read_csv(CSV_URL, header=1, dtype=str)
        df = df.fillna("")

        def to_int(val):
            try:
                return int(float(str(val).replace(',', '').strip()))
            except ValueError:
                return 0

        total_b = 0
        total_f = 0
        ranking_and_merchants = []

        for index, row in df.iterrows():
            # 🌟 清洗魔法：去除多餘空白，強制把台轉成臺
            county = str(row.iloc[0]).strip().replace('台', '臺')
            
            # 【新增功能 2】精準過濾：如果字數大於 5，或者結尾不是「市」跟「縣」，就跳過不處理！
            if not county or len(county) > 5 or not (county.endswith('市') or county.endswith('縣')):
                continue

            b_val = to_int(row.iloc[1])
            f_val = to_int(row.iloc[5])
            i_val = to_int(row.iloc[8])

            total_b += b_val
            total_f += f_val

            merchants = []
            for col_idx in range(12, len(row)):
                m_name = str(row.iloc[col_idx]).strip()
                if m_name:
                    merchants.append(m_name)

            ranking_and_merchants.append({
                "county": county,
                "count": i_val,
                "reg_b": b_val,                 # 新增：該縣市的累計註冊數
                "new_f": f_val,                 # 新增：該縣市的新增有效會員
                "total_members": b_val + f_val, # 新增：該縣市的目前累計會員
                "merchants": merchants
            })

        total_members = total_b + total_f
        total_stores = sum(item["count"] for item in ranking_and_merchants)

        ranking_and_merchants.sort(key=lambda x: x["count"], reverse=True)

        for i, item in enumerate(ranking_and_merchants):
            item["rank"] = i + 1
            if total_stores > 0:
                item["percentage"] = round((item["count"] / total_stores) * 100, 2)
            else:
                item["percentage"] = 0.0

        output_data = {
            "summary": {
                "update_date": update_date, # 將日期加入 JSON
                "total_registered_B": total_b,
                "total_new_F": total_f,
                "total_members": total_members
            },
            "ranking_and_merchants": ranking_and_merchants
        }

        os.makedirs(OUTPUT_DIR, exist_ok=True)
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, ensure_ascii=False, indent=4)

        print(f"✅ 資料處理完成！已匯出至 {OUTPUT_FILE} (更新日期: {update_date})")

    except Exception as e:
        print(f"❌ 發生錯誤: {e}")

if __name__ == "__main__":
    fetch_and_process_data()
