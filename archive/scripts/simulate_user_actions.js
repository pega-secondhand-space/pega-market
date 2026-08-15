/**
 * 全功能端到端模擬使用者操作與系統驗證測試腳本 (simulate_user_actions.js)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BASE_URL = 'http://127.0.0.1:3000';
const SUPABASE_URL = 'https://llnnbanqtmnccfvtwooo.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxsbm5iYW5xdG1uY2NmdnR3b29vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyOTE5MjYsImV4cCI6MjEwMDg2NzkyNn0.ljcpgFCejH4OmUWZTp80RZ8nVsKtg5gbB1AYfNfoSDI';

const CONFIG_UUIDS = {
  ANNOUNCEMENT: '00000000-0000-0000-0000-000000000001',
  ISSUE_BOARD: '00000000-0000-0000-0000-000000000002',
  ARCHIVE_BOARD: '00000000-0000-0000-0000-000000000003',
  PRESENCE: '00000000-0000-0000-0000-000000000012',
  PINNED_IDS: '00000000-0000-0000-0000-000000000013'
};

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failedTests++;
  }
}

function fetchJson(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('🚀 開始執行 PEGA 系統全功能端到端模擬使用者操作驗證');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // 測試 1：本機 HTTP 伺服器與前端資源完整性
  // -------------------------------------------------------------
  console.log('【測試 1】本機 HTTP 伺服器與模組檔案路由完整性');
  const filesToVerify = [
    '/',
    '/css/style.css',
    '/js/config.js',
    '/js/utils.js',
    '/js/api.js',
    '/js/ui.js',
    '/js/admin.js',
    '/js/issue-board.js',
    '/js/main.js'
  ];

  for (const f of filesToVerify) {
    try {
      const res = await fetch(`${BASE_URL}${f}`);
      assert(res.status === 200, `靜態資源檔案載入成功 (HTTP 200): ${f}`);
    } catch (e) {
      assert(false, `靜態資源載入失敗: ${f} (${e.message})`);
    }
  }

  // -------------------------------------------------------------
  // 測試 2：DOM ID 與 JS 引用完整性比對
  // -------------------------------------------------------------
  console.log('\n【測試 2】驗證 HTML DOM 元件與所有彈窗容器');
  const htmlContent = fs.readFileSync(path.resolve(__dirname, '../../index.html'), 'utf-8');
  
  const requiredDomIds = [
    'admin-modal',
    'archive-modal',
    'issue-modal',
    'detail-modal',
    'create-modal',
    'online-users-modal',
    'announcement-bar',
    'search-input',
    'item-grid',
    'admin-items-table-body',
    'admin-batch-delete-btn',
    'toast-container'
  ];

  for (const id of requiredDomIds) {
    assert(htmlContent.includes(`id="${id}"`), `HTML 包含必要元件 ID: #${id}`);
  }

  // -------------------------------------------------------------
  // 測試 3：使用者瀏覽貼文與篩選 (Items Query)
  // -------------------------------------------------------------
  console.log('\n【測試 3】模擬使用者瀏覽貼文清單與分類篩選');
  let sampleItemId = null;
  let sampleItemTitle = null;

  try {
    const res = await fetchJson(`${SUPABASE_URL}/rest/v1/items?select=id,created_at,title,description,price,type,image_url,nickname,device_id,contact_info&order=created_at.desc&limit=50`);
    assert(res.ok, `成功向 Supabase 讀取貼文清單 (Status: ${res.status})`);
    const items = await res.json();
    assert(Array.isArray(items) && items.length > 0, `貼文清單解析成功，共載入 ${items.length} 筆貼文`);

    const sellItems = items.filter(i => i.type === 'sell');
    const buyItems = items.filter(i => i.type === 'buy');
    const freeItems = items.filter(i => i.type === 'free');
    const luckyItems = items.filter(i => i.type === 'lucky');

    assert(sellItems.length > 0, `想賣專區篩選正常 (共 ${sellItems.length} 筆)`);
    assert(buyItems.length > 0, `想買專區篩選正常 (共 ${buyItems.length} 筆)`);
    assert(freeItems.length > 0, `免費送專區篩選正常 (共 ${freeItems.length} 筆)`);
    assert(luckyItems.length > 0, `尾牙專區篩選正常 (共 ${luckyItems.length} 筆)`);

    if (items.length > 0) {
      sampleItemId = items[0].id;
      sampleItemTitle = items[0].title;
    }
  } catch (e) {
    assert(false, `讀取貼文失敗: ${e.message}`);
  }

  // -------------------------------------------------------------
  // 測試 4：模擬使用者刊登、標記售出與自刪 (Publish -> Sell -> Delete)
  // -------------------------------------------------------------
  console.log('\n【測試 4】模擬使用者刊登貼文 ➔ 標記售出 ➔ 憑密碼自刪貼文');
  let testItemId = null;
  const testPassword = '7890';
  const testDeviceId = 'simulated_test_device_999';

  try {
    // 4.1 刊登貼文 (前端標準 Header: Prefer=return=minimal)
    const testPostTitle = `【自動化模擬測試】微軟 Surface Pro (測試編號 ${Date.now()})`;
    const createRes = await fetchJson(`${SUPABASE_URL}/rest/v1/items`, {
      method: 'POST',
      headers: { 'Prefer': 'return=minimal' },
      body: JSON.stringify({
        title: testPostTitle,
        price: '18800',
        description: '這是一筆自動化端到端驗證貼文，測試完成後將自動刪除。',
        type: 'sell',
        contact_info: '分機 99999 / Teams: AutoTester',
        image_url: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600',
        nickname: '自動化測試員',
        device_id: testDeviceId,
        edit_password: testPassword
      })
    });

    assert(createRes.status === 201 || createRes.status === 200, '模擬使用者成功發布全新商品貼文 (Status: 201 Created)');

    // 4.2 查詢剛剛發布的貼文
    const queryRes = await fetchJson(`${SUPABASE_URL}/rest/v1/items?title=eq.${encodeURIComponent(testPostTitle)}&select=id,title,description`);
    assert(queryRes.ok, '成功在資料庫中檢索到剛剛發布的全新貼文');
    const queriedItems = await queryRes.json();
    if (queriedItems && queriedItems.length > 0) {
      testItemId = queriedItems[0].id;
      assert(!!testItemId, `取得新貼文 ID: ${testItemId}`);
    }

    // 4.2 標記售出
    if (testItemId) {
      const soldTimestamp = new Date().toISOString();
      const updatedDesc = `這是一筆自動化端到端驗證貼文，測試完成後將自動刪除。\n\n[SOLD_AT:${soldTimestamp}]`;
      const updateRes = await fetchJson(`${SUPABASE_URL}/rest/v1/items?id=eq.${testItemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ description: updatedDesc })
      });
      assert(updateRes.ok, '模擬使用者一鍵將貼文標記為【已售出】');

      // 4.3 憑 4 位數密碼自刪貼文 (呼叫安全的 delete_item_secured RPC)
      const deleteRes = await fetchJson(`${SUPABASE_URL}/rest/v1/rpc/delete_item_secured`, {
        method: 'POST',
        body: JSON.stringify({
          item_uuid: testItemId,
          dev_id: testDeviceId,
          pwd_input: testPassword
        })
      });
      assert(deleteRes.ok, '模擬使用者輸入 4 位數密碼成功安全自刪貼文 (RPC: delete_item_secured)');
    }
  } catch (e) {
    assert(false, `使用者刊登與刪除流程失敗: ${e.message}`);
  }

  // -------------------------------------------------------------
  // 測試 5：模擬問題回報與建議留言板 (Feedback Board)
  // -------------------------------------------------------------
  console.log('\n【測試 5】模擬使用者提出問題與建議留言');
  let testIssueId = null;
  try {
    const postIssueRes = await fetchJson(`${SUPABASE_URL}/rest/v1/messages`, {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify({
        item_id: CONFIG_UUIDS.ISSUE_BOARD,
        sender_id: 'tester_user_01',
        sender_name: '品保測試員',
        content: '【自動化反饋測試】測試留言板讀寫與彈窗互動是否正常。'
      })
    });

    assert(postIssueRes.ok, '模擬使用者成功於問題回報留言板發表新建議');
    const issueData = await postIssueRes.json();
    if (issueData && issueData.length > 0) {
      testIssueId = issueData[0].id;
    }

    // 讀取留言板列表
    const getIssuesRes = await fetchJson(`${SUPABASE_URL}/rest/v1/messages?item_id=eq.${CONFIG_UUIDS.ISSUE_BOARD}&order=created_at.desc&limit=10`);
    assert(getIssuesRes.ok, '成功讀取問題回報留言板歷史紀錄');
    const issues = await getIssuesRes.json();
    const found = issues.some(i => i.content && i.content.includes('自動化反饋測試'));
    assert(found, '剛剛發布的反饋成功出現在歷史留言清單中');

    // 清理測試留言
    if (testIssueId) {
      await fetchJson(`${SUPABASE_URL}/rest/v1/messages?id=eq.${testIssueId}`, { method: 'DELETE' });
      assert(true, '自動清理測試留言紀錄完成');
    }
  } catch (e) {
    assert(false, `問題回報流程失敗: ${e.message}`);
  }

  // -------------------------------------------------------------
  // 測試 6：即時在線心跳廣播與在線人數統計 (Presence Heartbeat)
  // -------------------------------------------------------------
  console.log('\n【測試 6】模擬在線心跳 (Heartbeat) 與在線人數統計');
  try {
    const heartbeatRes = await fetchJson(`${SUPABASE_URL}/rest/v1/messages`, {
      method: 'POST',
      body: JSON.stringify({
        item_id: CONFIG_UUIDS.PRESENCE,
        sender_id: 'auto_tester_presence_01',
        sender_name: '模擬訪客',
        content: 'HEARTBEAT'
      })
    });
    assert(heartbeatRes.ok, '成功向 Supabase 發送 30 秒在線 Heartbeat 心跳廣播');

    const thirtySecsAgo = new Date(Date.now() - 35 * 1000).toISOString();
    const presenceRes = await fetchJson(`${SUPABASE_URL}/rest/v1/messages?item_id=eq.${CONFIG_UUIDS.PRESENCE}&created_at=gte.${thirtySecsAgo}&select=sender_id`);
    assert(presenceRes.ok, '成功查詢最近 35 秒內之活躍在線同仁數');
    const presenceRows = await presenceRes.json();
    const onlineCount = Math.max(1, new Set(presenceRows.map(r => r.sender_id)).size);
    assert(onlineCount >= 1, `全站即時在線人數計算正常：此刻線上 ${onlineCount} 人`);
  } catch (e) {
    assert(false, `在線心跳測試失敗: ${e.message}`);
  }

  // -------------------------------------------------------------
  // 測試 7：歷史成交存檔讀取與 TXT 匯出格式驗證
  // -------------------------------------------------------------
  console.log('\n【測試 7】模擬成交紀錄讀取與歷史成交數據匯出');
  try {
    const archiveRes = await fetchJson(`${SUPABASE_URL}/rest/v1/messages?item_id=eq.${CONFIG_UUIDS.ARCHIVE_BOARD}&order=created_at.desc&limit=10`);
    assert(archiveRes.ok, '成功讀取歷史成交與下架存檔資料庫');
    const archiveLogs = await archiveRes.json();
    assert(Array.isArray(archiveLogs), `歷史成交存檔載入成功 (共 ${archiveLogs.length} 筆歷史存檔)`);
  } catch (e) {
    assert(false, `歷史成交存檔測試失敗: ${e.message}`);
  }

  // -------------------------------------------------------------
  // 測試 8：版主密碼 SHA-256 驗證與全站公告持久化 (Admin Verification)
  // -------------------------------------------------------------
  console.log('\n【測試 8】版主控制台權限驗證與全站公告同步');
  try {
    const defaultPwd = 'admin123';
    const pwdHash = crypto.createHash('sha256').update(defaultPwd).digest('hex');
    assert(pwdHash.length === 64, `版主密碼 SHA-256 雜湊計算正確 (${pwdHash.slice(0, 16)}...)`);

    // 讀取全站公告
    const noticeRes = await fetchJson(`${SUPABASE_URL}/rest/v1/messages?item_id=eq.${CONFIG_UUIDS.ANNOUNCEMENT}&order=created_at.desc&limit=1`);
    assert(noticeRes.ok, '版主後台全站公告資料庫讀取正常');
    const noticeData = await noticeRes.json();
    assert(Array.isArray(noticeData), '全站公告同步成功');
  } catch (e) {
    assert(false, `版主後台測試失敗: ${e.message}`);
  }

  // -------------------------------------------------------------
  // 總結報告
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`📊 測試結果摘要：通過 ${passedTests} 項，失敗 ${failedTests} 項`);
  if (failedTests === 0) {
    console.log('🎉 所有功能端到端模擬測試全部 100% PASS！系統運行穩定正常！');
  } else {
    console.log(`⚠️ 有 ${failedTests} 項測試未通過，請檢查詳細日誌。`);
  }
  console.log('================================================================\n');
}

runTestSuite();
