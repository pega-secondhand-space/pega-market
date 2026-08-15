# PEGA 二手匿名交易空間 - 技術與架構文件 (PROJECT_DOC.md)

## 1. 專案簡介
本專案為一個極簡、輕量化的單頁式 (Single Page Application) 匿名二手交易與需求媒合平台。
專為企業內部同仁設計，無須註冊即可發布商品、求購需求、免費贈送與尾牙全新專區。

## 2. 技術棧 (Tech Stack)
- **Frontend**: HTML5, Vanilla JavaScript (ES6+ 模組化架構)
- **Styling**: Tailwind CSS, FontAwesome (Icons), 自訂動態字級與動畫 (`css/style.css`)
- **Backend as a Service (BaaS)**: Supabase
  - Database: PostgreSQL (Realtime & RPC 安全函式)
  - Storage: Storage Bucket (`item-images`)

## 3. 模組化檔案架構
```
m:\PYTHON\二手交換\
├── index.html                 # 主頁面結構與 DOM 容器 (純 HTML 結構)
├── css/
│   └── style.css              # 動畫、卡片特效、氣泡預覽與全站動態字級樣式
├── js/
│   ├── config.js              # Supabase URL/Key、全域常數與狀態變數
│   ├── utils.js               # XSS escapeHtml, 時間計算, Toast 提示, 圖片壓縮
│   ├── api.js                 # Supabase 交互 (載入列表、刪除、售出狀態、心跳)
│   ├── ui.js                  # 卡片渲染 (renderItems)、分頁、搜尋篩選、詳情彈窗
│   ├── admin.js               # 版主管理後台、公告同步、站名修改、每頁筆數配置
│   ├── issue-board.js         # 問題回報與建議留言板邏輯
│   └── main.js                # 程式入口、初始化啟動、即時人數與全域事件監聽
├── archive/                   # 歷史備份與過往暫存腳本歸檔
│   └── scripts/               # 歷史修復與測試 Python / JS 腳本
├── PROJECT_DOC.md             # 架構技術文件
└── PROJECT_PROGRESS.md        # 開發進度與更新記錄
```

## 4. 安全性與防護機制
- **XSS 防護**：所有使用者輸入資料（標題、描述、聯絡方式、暱稱、問題留言）在渲染至 DOM 時，一律經過 `escapeHtml()` 嚴格跳脫轉義。
- **管理權限防護**：管理員密碼驗證採用 SHA-256 雜湊結合後端 PostgreSQL 安全函式（RPC）校對，不在客戶端暴露明文密碼。
- **貼文管理密碼**：刊登時自動生成 4 位數密碼，跨裝置修改或下架需驗證密碼或版主金鑰。

## 5. Supabase 資料庫 Schema 設計

### A. 商品與需求表 `items`
```sql
create table public.items (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  price text not null,
  description text,
  type text not null, -- 'sell' (想賣), 'buy' (想買/求購), 'free' (免費送), 'lucky' (尾牙專區)
  contact_info text,
  image_url text,
  device_id text not null,
  nickname text not null,
  edit_password text,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```