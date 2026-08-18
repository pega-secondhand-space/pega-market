# 📌 PEGAPEGA 二手交換與免費贈送告示牌 - 專案開發進度與功能清單

**最後更新時間**：2026-08-18  
**專案版本**：`v2.01-ShareModal-Edition` (Apple 沉浸階差、刊登成功分享彈窗與全端直達升級版)  
**正式部署網址**：[https://pega-exchange.netlify.app](https://pega-exchange.netlify.app)  
**GitHub 備份倉庫**：[https://github.com/pega-secondhand-space/pega-market](https://github.com/pega-secondhand-space/pega-market) (`JOVIANpega`)

---

## 📈 開發紀錄與修復歷程

| 日期 | 功能 / 修正項目 | 狀態 | 備註 |
| :--- | :--- | :---: | :--- |
| 2026-08-18 | 實作【🎉 刊登成功 ＆ 好物專屬文案/直達連結分享】彈窗 | ✅ 徹底完成 | 替換瀏覽器預設 alert，提供一鍵複製排版文案與商品專屬直達連結 |
| 2026-08-18 | 4 位數自刪/修改管理 PIN 碼智慧備忘卡 | ✅ 徹底完成 | 刊登成功彈窗中醒目展示 PIN 碼並自動本機記住，換裝置修改不遺失 |
| 2026-08-18 | 全站商品專屬直達網址導流 (`?item_id=...`) | ✅ 徹底完成 | 點擊分享網址進站自動高亮聚焦該商品並展開詳細照片彈窗 |
| 2026-08-16 | 刊登好物表單 ❶ ❷ ❸ ❹ 階梯步驟引導 (Apple 玻璃質感風格) | ✅ 徹底完成 | 明確區分【必選/必填】與【選填】，支援照片即時壓縮預覽 |
| 2026-08-16 | 首頁採用「觀點 A：動態時序流」，最新刊登自動登頂 `NO. 01` 王座 | ✅ 徹底完成 | 刊登即登頂並獲金色徽章與巨大琥珀金浮水印序號 |
| 2026-08-16 | PC 電腦端頂部導覽列與工具列常駐醒目【🎁 我要刊登】按鈕 | ✅ 徹底完成 | 解決 PC 版無刊登入口問題，支援 2~4 卡寬螢幕下拉切換 |
| 2026-08-16 | 手機端預設鎖定【🍎 階差大卡 (Showcase Mode)】沉浸版型 | ✅ 徹底完成 | 保留頂部膠囊隨時切換串文與雙排 |
| 2026-08-16 | 回報問題留言板全面升級多選全選、批次刪除與版主官方回覆 | ✅ 徹底完成 | 留言板彈窗與後台管理控制台雙入口支援 |
| 2026-08-16 | 歷史成交紀錄新增【🧹 一鍵清空所有存檔】與多選批次刪除 | ✅ 徹底完成 | 支援自動密碼授權與一鍵清空 |
| 2026-08-16 | PC 鍵盤 `Escape` 鍵一鍵關閉全站彈窗 & 遮罩背景點擊自動關閉 | ✅ 徹底完成 | 桌面端極致快捷體驗 |
| 2026-08-16 | iOS 底部安全區域適配 (`safe-area-inset-bottom`) & 彈窗防滾動透穿 | ✅ 徹底完成 | 手機操作如原生 App 般滑順 |
| 2026-08-16 | 全站 Quota 額度健檢：圖片空間 99.3% 可用 (可再傳 13,000+ 張圖) | ✅ 徹底完成 | 資料庫容量 > 99.9% 充足，輕量化永續運作 |
| 2026-08-15 | 全站 3,460 行巨石代碼解耦，完成 CSS / JS 模組化重構 | ✅ 徹底完成 | 拆分 css/ 與 7 個 js/ 獨立模組，零破壞相容 |
| 2026-08-15 | 全面實施 XSS 安全防護 (通用 `escapeHtml`) | ✅ 徹底完成 | 卡片、詳情、留言板與代號全面安全跳脫 |
| 2026-08-15 | 專案目錄整潔度維護，歷史暫存腳本全數歸檔 | ✅ 徹底完成 | 60+ 歷史腳本歸檔至 archive/scripts/ |
| 2026-08-03 | 遷移至 `jovianpega` 專屬 Netlify 帳號運作 | ✅ 徹底完成 | 遷移至 pega-market.netlify.app |
| 2026-08-03 | 100% 移除了所有原始碼中的明文密碼字串 | ✅ 徹底完成 | 改用 SHA-256 雜湊比對與 Supabase 雲端校對 |
| 2026-08-03 | 實施即時線上人數追蹤與版主儀表板 | ✅ 徹底完成 | 自動 upsert (35s 逾期視窗) & beforeunload 離線清理 |
| 2026-08-03 | 簡化公告發佈流程，編輯後立即生效 | ✅ 徹底完成 | 解決 announcement-text 抓取覆蓋問題 |
| 2026-08-03 | 修正 UUID 儲存設定架構的 schema 錯誤 | ✅ 徹底完成 | 實現 100% 全裝置跨平台雲端設定同步 |
| 2026-07-30 | 雙圖片 `◀`/`▶` 無縫無限循環播放 (`data-photo-idx` 取餘數計算) | ✅ 徹底完成 | 解決按右鍵卡死在第二張圖的問題 |
| 2026-07-30 | 物品詳情 Modal 圓形紅底白字 ✖ 按鈕 100% 覆蓋所有長短標題貼文 | ✅ 徹底完成 | 防止長標題擠壓，全數強制顯示 |
| 2026-07-30 | Markdown 專案開發進度與功能清單報告 (`PROJECT_PROGRESS.md`) | ✅ 完成 | 存於專案根目錄 |
| 2026-07-30 | 全站 4 級字體大小控制按鈕 (`A⁻`/`A`/`A⁺`/`A⁺⁺`) 與手機版專屬 25px 放大 | ✅ 完成 | 支援 `localStorage` 偏好記憶 |
| 2026-07-30 | 圖片改為 `object-contain` 100% 全貌展示 (解決哆啦A夢被切頭問題) | ✅ 完成 | 保留完整邊界不裁切 |
| 2026-07-30 | 刊登貼文「聯絡方式」強制必填驗證 (`* 必填`) | ✅ 完成 | 未填寫自動跳出紅框提示 |
| 2026-07-30 | 全站使用須知資料庫 + 快取雙重持久化持久儲存 | ✅ 完成 | 解決 Refresh 恢復舊文字問題 |
| 2026-07-30 | 分頁容器 `#pagination-container` 移出網格 DOM 避免清空 | ✅ 完成 | 版主可設每頁 10 筆或 40 筆 |
| 2026-07-30 | 問題回報留言板「已修復」狀態項目自動沉底 | ✅ 完成 | 版主可一鍵切換狀態與刪除 |
| 2026-07-30 | 全站完整 87KB 程式碼 GitHub Pages 自動部署與備份 | ✅ 完成 | 倉庫 `JOVIANpega/pega-market` |

---

## 🚀 未來安全與架構改善計畫 (公開發布防護升級)

當專案需要丟到社群給大眾公開測試或長期使用時，應實施以下安全改造防堵金鑰洩漏與惡意操作：

1. **替換為 `anon` (Anonymous) 公開金鑰**：
   - **目的**：防止現行在 `index.html` 暴露的 `service_role` 超級管理員金鑰被外部惡意用戶竊取。
   - **做法**：將前端 `SUPABASE_KEY` 改為無特權的 `anon` 金鑰。

2. **啟用 Supabase RLS (Row Level Security，行級安全策略)**：
   - **目的**：禁止匿名使用者直接透過 API 對所有貼文進行 `DELETE` 與 `UPDATE`。
   - **做法**：
     - `items`（貼文表）：設定 RLS 策略為「唯獨允許匿名用戶 `SELECT` 與 `INSERT`」，不給予直接 `UPDATE` 或 `DELETE` 權限。
     - `messages`（設定/公告表）：設定 RLS 策略為「唯獨允許匿名用戶 `SELECT`」，其餘一律拒絕。

3. **設計 Postgres 安全函數 (RPC) 執行管理動作**：
   - **目的**：安全的在伺服器端驗證管理密碼並執行敏感的版主操作。
   - **做法**：
     - 在 Supabase 的 SQL Editor 中定義資料庫函數，例如：
       ```sql
       -- 版主安全刪除函數範例
       create or replace function admin_delete_item(item_uuid uuid, pwd_input text)
       returns boolean security definer as $$
       declare
         saved_hash text;
       begin
         -- 1. 取得資料庫中儲存的密碼 SHA-256 雜湊值
         select content into saved_hash from public.messages where id = '00000000-0000-0000-0000-000000000009';
         -- 2. 校對雜湊密碼 (pwd_input 在前端傳入前或後端經 sha256 處理)
         if encode(digest(pwd_input, 'sha256'), 'hex') = saved_hash then
           delete from public.items where id = item_uuid;
           return true;
         else
           return false;
         end if;
       end;
       $$ language plpgsql;
       ```
     - 前端網頁只需透過 `anon` 金鑰呼叫該 RPC：`supabase.rpc('admin_delete_item', { item_uuid: '...', pwd_input: '...' })`。
     - 這保證了超級權限 (`security definer`) 只執行在被驗證過密碼的伺服器端，網頁原始碼不再有任何漏洞。

8. **📋 版主全站貼文批次管理 / 強制多選刪除 (Admin Batch Item Management)**：
   - 版主後台新增專屬分頁 **「📋 貼文批次管理 / 強制刪除」**。
   - 提供搜尋過濾、類型篩選（💰賣/🔍買/🎁送/🎁尾牙）、全選 Checkbox 與一鍵強制批次刪除 RPC 安全清理。
   - 表格最右側支援單筆 📌 置頂切換與 🗑️ 即時刪除。

9. **🖥️ 版主控制台滿版大工作區 & ⛶ 全螢幕切換**：
   - 預設提供 `98vw` 滿版沉浸式工作區，大幅釋放桌面端大螢幕操作空間，單頁可同時檢視 15~20 筆貼文。
   - 頂部支援 **「⛶ 全螢幕 / 視窗還原」** 一鍵切換。

10. **🟢 全站即時在線監控儀表板 (Online Presence Modal)**：
    - 點擊頂部 `🟢 此刻線上: X 人` 彈出即時在線連線儀表板。
    - 透過 30 秒 Heartbeat 匿名廣播，準確統計全站即時活躍同仁數。

11. **🛠️ 模組化架構重構 (Modular Refactoring)**：
    - 將原本 3,464 行單一 HTML 解構為 7 大 ES6 模組 (`config.js`, `utils.js`, `api.js`, `ui.js`, `admin.js`, `issue-board.js`, `main.js`) 與 `css/style.css`。
    - 全面導入 `closeAllModals()` 互斥彈窗機制與 `escapeHtml()` XSS 安全防護。
    - 通過 44 項端到端自動化測試套件（100% PASS）。

---

## 🌐 託管平台與帳號設定紀錄 (Netlify & Supabase)

### 1. 👑 官方正式發布站點 (主要網址)：`jovianturkey`
- **官方正式網址**：[https://pega-exchange.netlify.app](https://pega-exchange.netlify.app)
- **管理後台**：[https://app.netlify.com/projects/pega-exchange/overview](https://app.netlify.com/projects/pega-exchange/overview)
- **API Token**：`nfp_V3DpF4V5iA15yiQeDEsZwnV2yvcd6BYt7ed3`

### 2. 🌿 分枝 / 備用分流站點 (Branches & Mirrors)
- **分枝 1 (`imjovian`)**：
  - 網址：[https://pega-market.netlify.app](https://pega-market.netlify.app)
  - 後台：[https://app.netlify.com/projects/pega-market/overview](https://app.netlify.com/projects/pega-market/overview)
  - API Token：`nfp_eGgrKsCuTaxKnWgj3cCnJGXck6D9JVXa80ab`
- **分枝 2 (`jovianpega`)**：
  - 網址：[https://chipper-rolypoly-7c56c3.netlify.app/](https://chipper-rolypoly-7c56c3.netlify.app/)
  - 後台：[https://app.netlify.com/projects/chipper-rolypoly-7c56c3/overview](https://app.netlify.com/projects/chipper-rolypoly-7c56c3/overview)
  - API Token：`nfp_CUjzB56wkGYCREfpAWCQfc8aHtSCxs4Ga872`

### 3. Supabase 雲端資料庫
- **專案網址**：[https://supabase.com/dashboard/project/llnnbanqtmnccfvtwooo](https://supabase.com/dashboard/project/llnnbanqtmnccfvtwooo)
- **API URL**：`https://llnnbanqtmnccfvtwooo.supabase.co`

---
*文件更新時間: 2026-08-18 | PEGAPEGA 告示牌團隊*

