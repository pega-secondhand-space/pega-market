# PEGA 二手匿名交易空間 - 技術與架構文件 (PROJECT_DOC.md)

## 1. 專案簡介
本專案為一個極簡、輕量化的單頁式 (Single Page Application) 匿名二手交易與需求媒合平台。
專為企業內部同仁設計，無須註冊即可發布商品、求購需求與即時對話。

## 2. 技術棧 (Tech Stack)
- **Frontend**: HTML5, Vanilla JavaScript (ES6+)
- **Styling**: Tailwind CSS (via CDN), FontAwesome (Icons)
- **Backend as a Service (BaaS)**: Supabase
  - Database: PostgreSQL (Realtime enabled)
  - Storage: Storage Bucket (`item-images`)

## 3. Supabase 資料庫 Schema 設計

### A. 商品與需求表 `items`
```sql
create table public.items (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  price text not null,
  description text,
  type text not null, -- 'sell' (想賣), 'buy' (想買/求購), 'free' (免費送)
  contact_info text,
  image_url text,
  device_id text not null,
  nickname text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);