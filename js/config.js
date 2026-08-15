/**
 * PEGA 二手匿名交易空間 - 全域配置與狀態定義 (js/config.js)
 */

// Supabase 連線憑證
const SUPABASE_URL = 'https://llnnbanqtmnccfvtwooo.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxsbm5iYW5xdG1uY2NmdnR3b29vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyOTE5MjYsImV4cCI6MjEwMDg2NzkyNn0.ljcpgFCejH4OmUWZTp80RZ8nVsKtg5gbB1AYfNfoSDI';

// 系統預設 Magic UUID 常數 (與既有資料庫相容)
const CONFIG_UUIDS = {
  ARCHIVE_ITEM: '00000000-0000-0000-0000-000000000006',
  ISSUE_BOARD: '00000000-0000-0000-0000-000000000007',
  ANNOUNCEMENT: '00000000-0000-0000-0000-000000000008',
  ADMIN_HASH: '00000000-0000-0000-0000-000000000009',
  PER_PAGE: '00000000-0000-0000-0000-000000000011',
  PRESENCE: '00000000-0000-0000-0000-000000000012',
  PINNED_ITEMS: '00000000-0000-0000-0000-000000000013',
  SITE_NAME: '00000000-0000-0000-0000-000000000014'
};

// Supabase Client 實例
var db = null;
try {
  if (typeof supabase !== 'undefined' && supabase.createClient) {
    db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  }
} catch (e) {
  console.error('Supabase init error:', e);
}

// 全域狀態變數
var allItems = [];
var currentFilter = 'all';
var currentPage = 1;
var itemsPerPage = 40;
var filteredTotalCount = 0;
var globalPinnedIds = [];

// 使用者與管理員狀態
var isAdmin = localStorage.getItem('pega_is_admin') === 'true';
var myDeviceId = localStorage.getItem('pega_device_id') || ('device_' + Math.random().toString(36).substring(2, 10));
localStorage.setItem('pega_device_id', myDeviceId);

var myNickname = localStorage.getItem('pega_nickname') || '同仁_' + myDeviceId.substring(7, 11);
localStorage.setItem('pega_nickname', myNickname);

// 刊登與圖片上傳狀態
var selectedImages = [];
var currentEditItemId = null;

// 詳情彈窗狀態
var currentDetailItem = null;
var detailPhotos = [];
var detailPhotoIdx = 0;

// 成交紀錄狀態
var archiveLogs = [];
var selectedArchiveIds = new Set();
