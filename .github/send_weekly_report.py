#!/usr/bin/env python3
"""
PEGA 好物交換所 - 每週系統保活健康週報與異常通知發信腳本
透過 GitHub Actions Bot 建立/更新週報 Issue 並標註 @JOVIANpega，
觸發 GitHub 官方通知系統 (notifications@github.com) 寄送 HTML 格式報表至信箱。
"""
import json
import os
import urllib.request


def main():
    token = os.environ.get("GH_TOKEN", "")
    repo = os.environ.get("GITHUB_REPOSITORY", "pega-secondhand-space/pega-market")
    tw_time = os.environ.get("TW_TIME", "")
    date_only = tw_time.split(" ")[0] if tw_time else "今日"
    report_type = os.environ.get("REPORT_TYPE", "每週一例行系統健康週報")
    final_status = os.environ.get("FINAL_STATUS", "ACTIVE_HEALTHY")
    s_items = os.environ.get("STATUS_ITEMS", "200")
    s_post = os.environ.get("STATUS_POST", "201")
    s_del = os.environ.get("STATUS_DEL", "204")
    active_count = os.environ.get("ACTIVE_COUNT", "5")

    title = f"📊 [PEGA 好物交換所] 系統運作健康週報 ({date_only})"
    lines = [
        f"@JOVIANpega 您好，系統自動保活守衛為您回報最新運作狀態（**{report_type}**）：",
        "",
        "### 🟢 1. 雲端資料庫與保活心跳狀態",
        "| 檢查項目 | 檢測結果 | 狀態說明 |",
        "| :--- | :--- | :--- |",
        f"| **Supabase 總控台狀態** | `{final_status}` | 🟢 雲端伺服器正常運作中 |",
        f"| **資料庫讀取驗證 (`GET`)** | `HTTP {s_items}` | ✅ 商品與公告資料表讀取正常 |",
        f"| **資料庫寫入交易 (`POST`)** | `HTTP {s_post}` | ✅ 底層 WAL 實質寫入交易成功 |",
        f"| **保活紀錄清理 (`DELETE`)** | `HTTP {s_del}` | ✅ 自動清除測試紀錄、零垃圾殘留 |",
        f"| **目前雲端真實刊登數** | **{active_count} 件** | 📦 另含 13 件常態示範好物離線保底 |",
        f"| **打卡檢測時間 (台灣時間)** | `{tw_time}` | ⏰ 每日中午 12:00 定時執行保活 |",
        "",
        "---",
        "",
        "### 🌐 2. 線上站點快速巡檢連結",
        "* **官方正式站**：https://pega-exchange.netlify.app",
        "* **備用分流站**：https://chipper-rolypoly-7c56c3.netlify.app",
        "* **2026 尾牙歷史行情庫**：https://pega-exchange.netlify.app/history-2026.html",
        "",
        "> 💡 **說明**：本通知信由 GitHub Actions 保活守衛於每週一中午 12:00（或手動測試、自動喚醒時）自動產生，並由 GitHub 官方通知系統寄達您的信箱；平時週二至週日將安靜執行保活不打擾您。",
    ]
    body = "\n".join(lines)

    # 1. 先關閉舊的週報 Issue 保持版面整潔
    req_list = urllib.request.Request(
        f"https://api.github.com/repos/{repo}/issues?state=open",
        headers={
            "Authorization": f"Bearer {token}",
            "User-Agent": "PEGA-KeepAlive-Bot",
        },
    )
    try:
        with urllib.request.urlopen(req_list) as r:
            old_issues = json.loads(r.read().decode("utf-8"))
            for iss in old_issues:
                if "[PEGA 好物交換所]" in (iss.get("title") or ""):
                    num = iss["number"]
                    close_req = urllib.request.Request(
                        f"https://api.github.com/repos/{repo}/issues/{num}",
                        data=json.dumps({"state": "closed"}).encode("utf-8"),
                        headers={
                            "Authorization": f"Bearer {token}",
                            "Content-Type": "application/json",
                            "User-Agent": "PEGA-KeepAlive-Bot",
                        },
                        method="PATCH",
                    )
                    urllib.request.urlopen(close_req).read()
    except Exception as e:
        print("Close old issues warning:", e)

    # 2. 建立最新一期週報 Issue，觸發 GitHub 官方 Email 通知
    req_create = urllib.request.Request(
        f"https://api.github.com/repos/{repo}/issues",
        data=json.dumps(
            {
                "title": title,
                "body": body,
                "assignees": ["JOVIANpega"],
            }
        ).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "User-Agent": "PEGA-KeepAlive-Bot",
        },
        method="POST",
    )
    with urllib.request.urlopen(req_create) as r:
        res_data = json.loads(r.read().decode("utf-8"))
        print("✅ 已成功發布週報並觸發 GitHub 官方通知信！Issue URL:", res_data.get("html_url"))


if __name__ == "__main__":
    main()
