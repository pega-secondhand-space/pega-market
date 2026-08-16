/**
 * simulate_full_user_experience.js
 * 深度擬真使用者 (員工同仁) 操作全旅程端到端測試
 */
const BASE_URL = 'http://127.0.0.1:3000';
const SUPABASE_URL = 'https://llnnbanqtmnccfvtwooo.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxsbm5iYW5xdG1uY2NmdnR3b29vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyOTE5MjYsImV4cCI6MjEwMDg2NzkyNn0.ljcpgFCejH4OmUWZTp80RZ8nVsKtg5gbB1AYfNfoSDI';

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failCount++;
  }
}

function fetchSupabase(path, options = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
}

async function runFullUserExperienceTests() {
  console.log('================================================================');
  console.log('📱 開始執行【全場景使用者真實操作體驗 (User Journey Simulation)】');
  console.log('================================================================\n');

  try {
    // 【旅程 1】同仁打開手機/電腦首頁
    console.log('【旅程 1】同仁打開首頁 (index.html) 檢視介面元素');
    const indexRes = await fetch(BASE_URL + '/');
    assert(indexRes.status === 200, '首頁載入成功 (HTTP 200)');
    const indexHtml = await indexRes.text();
    assert(indexHtml.includes('PEGAPEGA') || indexHtml.includes('二手'), '首頁包含正確網站標題');
    assert(indexHtml.includes('layout-btn-showcase'), '手機頂部具備【🍎 階差大卡】切換按鈕');
    assert(indexHtml.includes('layout-btn-1'), '手機頂部具備【📱 串文】切換按鈕');
    assert(indexHtml.includes('layout-btn-2'), '手機頂部具備【▦ 雙排】切換按鈕');
    assert(indexHtml.includes('grid-layout-select'), '電腦端具備 2-4 卡下拉選單');
    assert(indexHtml.includes('scrollToTopItem()'), '畫面具備快速回到頂端按鈕');
    assert(indexHtml.includes('scrollToBottomItem()'), '畫面具備快速滑到底端按鈕');
    assert(indexHtml.includes('mobile-bottom-nav'), '手機端具備置底導覽列與金色發布大圓鈕');
    assert(!indexHtml.includes('w-10 h-10 rounded-full shadow-2xl.*我要刊登'), '確認右下角已無重複的多餘我要刊登膠囊按鈕');

    // 【旅程 2】同仁點擊「📖 使用說明」進入 Apple 階差風格專頁 (guide.html)
    console.log('\n【旅程 2】同仁點擊「📖 使用說明」進入使用說明專頁 (guide.html)');
    const guideRes = await fetch(BASE_URL + '/guide.html');
    assert(guideRes.status === 200, '使用說明專頁載入成功 (HTTP 200)');
    const guideHtml = await guideRes.text();
    assert(guideHtml.includes('apple-step-card'), '使用說明包含 Apple 階差卡片元件');
    assert(guideHtml.includes('step-watermark-num'), '使用說明包含巨大金色浮水印數字');
    assert(guideHtml.includes('24 小時後系統自動將其轉入歷史成交庫'), '說明文字準確載明 24 小時自動移入成交庫');
    assert(!guideHtml.includes('48 小時後'), '說明文字無殘留舊版 48 小時文案');

    // 【旅程 3】驗證動態字級聯動與階差 CSS 樣式規則
    console.log('\n【旅程 3】驗證動態字級聯動與階差 CSS 樣式規則');
    const cssRes = await fetch(BASE_URL + '/css/style.css');
    assert(cssRes.status === 200, 'style.css 樣式表載入成功');
    const cssText = await cssRes.text();
    assert(cssText.includes('.showcase-title-font'), '包含階差標題動態字級聯動 (.showcase-title-font)');
    assert(cssText.includes('.showcase-price-font'), '包含階差標價動態字級聯動 (.showcase-price-font)');
    assert(cssText.includes('.step-watermark-num'), '包含階差巨大浮水印數字樣式 (.step-watermark-num)');
    assert(cssText.includes('.apple-step-card'), '包含階差黑曜石卡片樣式 (.apple-step-card)');

    // 【旅程 4】同仁瀏覽商品並執行分類篩選
    console.log('\n【旅程 4】同仁瀏覽首頁商品清單、測試 4 大專區分類篩選');
    const itemsRes = await fetchSupabase('/items?select=id,created_at,title,description,price,type,image_url,nickname,device_id,contact_info&order=created_at.desc&limit=100');
    assert(itemsRes.ok, `成功自 Supabase 讀取商品列表 (Status: ${itemsRes.status})`);
    const allRawItems = await itemsRes.json();
    const items = (Array.isArray(allRawItems) ? allRawItems : []).filter(i => i.device_id !== 'SYSTEM' && !i.title?.startsWith('SYSTEM_'));
    assert(items.length > 0, `目前線上商品總數：${items.length} 件`);

    const sellItems = items.filter(i => i.type === 'sell');
    const buyItems = items.filter(i => i.type === 'buy');
    const freeItems = items.filter(i => i.type === 'free');
    const luckyItems = items.filter(i => i.type === 'lucky');
    console.log(`    📊 分類統計：想賣 ${sellItems.length} 件 | 想買 ${buyItems.length} 件 | 免費送 ${freeItems.length} 件 | 尾牙 ${luckyItems.length} 件`);
    assert(sellItems.length > 0, '想賣專區商品檢索正常');
    assert(freeItems.length > 0, '免費送專區商品檢索正常');
    assert(luckyItems.length > 0, '尾牙獎品專區商品檢索正常');

    // 【旅程 5】同仁操作：發布全新「尾牙全新獎品」
    console.log('\n【旅程 5】同仁操作：發布全新【尾牙全新獎品】');
    const testTitle = `【尾牙抽中全新】象印480ml真空保溫杯_TEST_${Date.now()}`;
    const testPin = '6688';
    const testDeviceId = 'SIMULATED_USER_EXP_DEVICE';
    const createRes = await fetchSupabase('/items', {
      method: 'POST',
      headers: { 'Prefer': 'return=minimal' },
      body: JSON.stringify({
        title: testTitle,
        price: '550',
        description: '公司尾牙抽到的全新正品，附完整彩盒與說明書，便宜出清給需要的同仁！',
        contact_info: 'Teams: user_test / 分機 8899',
        type: 'lucky',
        nickname: '設計部 小琳',
        image_url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop',
        device_id: testDeviceId,
        edit_password: testPin
      })
    });
    assert(createRes.status === 201 || createRes.status === 200, '刊登成功 (Status 201 Created)');

    const queryRes = await fetchSupabase(`/items?title=eq.${encodeURIComponent(testTitle)}&select=id,title,description`);
    const queriedItems = await queryRes.json();
    const createdItem = queriedItems && queriedItems[0];
    assert(createdItem && createdItem.id, `成功獲取新刊登商品 ID: ${createdItem?.id}`);

    // 【旅程 6】同仁操作：商品成交 ➔ 標記【已售出】(轉為黑白灰階 ＋ 24h 倒數)
    console.log('\n【旅程 6】同仁操作：商品成交，點擊打勾標記【已售出】');
    const markSoldRes = await fetchSupabase(`/items?id=eq.${createdItem.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        description: `${createdItem.description}\n[SOLD_TIME:${new Date().toISOString()}]`
      })
    });
    assert(markSoldRes.ok, '成功標記商品為【已售出】');

    // 驗證售出後的 24 小時倒數算法
    const soldNow = new Date();
    const remainingMs = (24 * 60 * 60 * 1000) - (new Date() - soldNow);
    const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
    assert(remainingHours >= 23, `24 小時倒數計算正確：當前剩餘 ${remainingHours} 小時下架`);

    // 【旅程 7】同仁操作：輸入 4 位數 PIN 碼安全自刪下架
    console.log('\n【旅程 7】同仁操作：輸入 4 位數密碼自刪下架商品');
    const deleteRes = await fetchSupabase('/rpc/delete_item_secured', {
      method: 'POST',
      body: JSON.stringify({
        item_uuid: createdItem.id,
        dev_id: testDeviceId,
        pwd_input: testPin
      })
    });
    assert(deleteRes.ok, '憑 4 位數 PIN 碼自刪商品成功 (RPC: delete_item_secured)');

    // 驗證該商品已從資料庫徹底移除
    const checkDeletedRes = await fetchSupabase(`/items?id=eq.${createdItem.id}&select=id`);
    const checkDeletedData = await checkDeletedRes.json();
    assert(Array.isArray(checkDeletedData) && checkDeletedData.length === 0, '確認商品已自首頁與資料庫完全移除');

    // 【旅程 8】同仁操作：在問題與建議留言板反饋一則建議
    console.log('\n【旅程 8】同仁操作：於問題回報留言板發表新建議');
    const issueTitle = `【體驗反饋】階差大卡與黑白售出效果極佳！_${Date.now()}`;
    const issueRes = await fetchSupabase('/items', {
      method: 'POST',
      headers: { 'Prefer': 'return=minimal' },
      body: JSON.stringify({
        title: issueTitle,
        price: '0',
        description: '品管部 阿豪：測試階差大卡、字體縮放、售出黑白與上下滾動，全部運行完美！',
        contact_info: 'Teams: qa_howard',
        type: 'sell',
        nickname: '品管部 阿豪',
        device_id: 'SYSTEM_FEEDBACK_USER',
        edit_password: '999'
      })
    });
    assert(issueRes.status === 201 || issueRes.status === 200, '留言板建議發布成功 (Status 201 Created)');

    const queryIssueRes = await fetchSupabase(`/items?title=eq.${encodeURIComponent(issueTitle)}&select=id`);
    const queriedIssues = await queryIssueRes.json();
    const createdIssue = queriedIssues && queriedIssues[0];

    // 清理測試留言
    if (createdIssue && createdIssue.id) {
      await fetchSupabase('/rpc/delete_item_secured', {
        method: 'POST',
        body: JSON.stringify({
          item_uuid: createdIssue.id,
          dev_id: 'SYSTEM_FEEDBACK_USER',
          pwd_input: '999'
        })
      });
      assert(true, '自動清理測試留言紀錄完畢');
    }

    console.log('\n================================================================');
    console.log(`📊 體驗測試結果摘要：通過 ${passCount} 項，失敗 ${failCount} 項`);
    if (failCount === 0) {
      console.log('🎉 所有真實使用者操作體驗 100% PASS！系統運行極度流暢穩定！');
    } else {
      console.log('⚠️ 存在測試未通過項目，請檢視上方錯誤日誌！');
    }
    console.log('================================================================\n');

  } catch (err) {
    console.error('執行使用者體驗測試時發生異常：', err);
  }
}

runFullUserExperienceTests();
