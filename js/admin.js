/**
 * PEGA 二手匿名交易空間 - 版主管理後台與系統設定 (js/admin.js)
 */

var currentRawNotice = '';

var isAdminFullscreen = false;

/**
 * 開啟版主管理視窗 (Modal)
 */
function openAdminModal() {
  if (typeof closeAllModals === 'function') closeAllModals();
  loadAnnouncement();
  loadItemsPerPageSetting();
  document.getElementById('admin-modal').classList.remove('hidden');
  if (isAdmin) {
    document.getElementById('admin-login-view').classList.add('hidden');
    document.getElementById('admin-dashboard-view').classList.remove('hidden');
  } else {
    document.getElementById('admin-login-view').classList.remove('hidden');
    document.getElementById('admin-dashboard-view').classList.add('hidden');
  }
}

/**
 * 關閉版主管理視窗
 */
function closeAdminModal() {
  document.getElementById('admin-modal').classList.add('hidden');
}

/**
 * 切換版主後台全螢幕 / 視窗模式
 */
function toggleAdminFullscreen() {
  const card = document.getElementById('admin-modal-card');
  const btn = document.getElementById('admin-fullscreen-btn');
  if (!card) return;

  isAdminFullscreen = !isAdminFullscreen;
  if (isAdminFullscreen) {
    card.className = "bg-gray-800 border-none w-screen h-screen max-w-none max-h-none rounded-none shadow-2xl overflow-hidden flex flex-col animate-fadeIn transition-all duration-200";
    if (btn) btn.innerHTML = '<i class="fa-solid fa-compress"></i> <span class="hidden sm:inline">還原視窗</span>';
  } else {
    card.className = "bg-gray-800 border border-gray-700 w-full max-w-[98vw] xl:max-w-7xl rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[95vh] max-h-[98vh] animate-fadeIn transition-all duration-300";
    if (btn) btn.innerHTML = '<i class="fa-solid fa-expand"></i> <span class="hidden sm:inline">全螢幕</span>';
  }
}

/**
 * 切換版主密碼可見性 (Eye Icon)
 */
function toggleAdminPasswordVisibility() {
  const input = document.getElementById('admin-pwd-input');
  const icon = document.getElementById('admin-pwd-eye-icon');
  if (!input || !icon) return;
  if (input.type === 'password') {
    input.type = 'text';
    icon.className = 'fa-solid fa-eye text-sm';
  } else {
    input.type = 'password';
    icon.className = 'fa-solid fa-eye-slash text-sm';
  }
}

/**
 * 版主密碼雜湊驗證與登入
 */
async function checkAdminPassword() {
  const input = document.getElementById('admin-pwd-input');
  const pwd = (input?.value || '').trim();

  if (!pwd) {
    showNotification('⚠️ 請輸入版主密碼', 'warning');
    return;
  }

  const inputHash = await sha256(pwd);

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/check_admin_login`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ pwd_input: inputHash })
    });
    if (res.ok) {
      const pass = await res.json();
      if (pass === true) {
        isAdmin = true;
        localStorage.setItem('pega_is_admin', 'true');
        localStorage.setItem('pega_admin_hash', inputHash);
        const pwdView = document.getElementById('admin-login-view');
        const dashView = document.getElementById('admin-dashboard-view');
        const btnText = document.getElementById('admin-btn-text');

        if (pwdView) pwdView.classList.add('hidden');
        if (dashView) dashView.classList.remove('hidden');
        if (btnText) btnText.innerText = '管理面板 (已登入)';

        showNotification('🔑 版主身份驗證成功！已進入管理後台', 'success');

        const liveAnnText = localStorage.getItem('pega_custom_announcement') || document.getElementById('announcement-text')?.innerText || '';
        const annInput = document.getElementById('admin-announcement-input');
        if (annInput && liveAnnText) {
          annInput.value = liveAnnText;
        }

        setTimeout(() => {
          loadAnnouncement().catch(e => console.error(e));
          loadItemsPerPageSetting().catch(e => console.error(e));
          renderItems();
        }, 50);
        return;
      }
    }
    showNotification('⚠️ 密碼不符，請重新輸入', 'warning');
  } catch(e) {
    console.error('Cloud login error:', e);
    showNotification('⚠️ 連線驗證發生錯誤，請稍後再試', 'warning');
  }
}

/**
 * 登出版主權限
 */
function logoutAdmin() {
  isAdmin = false;
  localStorage.setItem('pega_is_admin', 'false');
  localStorage.removeItem('pega_admin_hash');
  document.getElementById('admin-btn-text').innerText = '後台管理';
  closeAdminModal();
  showNotification('已登出版主權限', 'info');
  renderItems();
}

/**
 * 讀取全站每頁卡片數量設定
 */
async function loadItemsPerPageSetting() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/messages?item_id=eq.${CONFIG_UUIDS.PER_PAGE}&select=*`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0 && data[0].content) {
        const sysVal = parseInt(data[0].content, 10);
        if (sysVal > 0) {
          itemsPerPage = sysVal;
          localStorage.setItem('pega_items_per_page', sysVal.toString());
        }
      }
    }
  } catch(e) {
    console.error('Fetch per page error:', e);
  }

  const input = document.getElementById('admin-perpage-input');
  if (input) input.value = itemsPerPage;
}

/**
 * 儲存全站每頁卡片數量設定
 */
async function saveItemsPerPage() {
  const input = document.getElementById('admin-perpage-input');
  const val = parseInt(input?.value, 10);
  if (!val || val < 1) return showNotification('⚠️ 每頁數量必須大於 0', 'warning');

  itemsPerPage = val;
  localStorage.setItem('pega_items_per_page', val.toString());
  currentPage = 1;

  try {
    const pwdHash = localStorage.getItem('pega_admin_hash') || '';
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/save_perpage_admin`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ val_input: val.toString(), pwd_input: pwdHash })
    });
    if (res.ok) {
      showNotification(`🎉 全站每頁商品展示筆數已永久設定為：${val} 筆！`, 'success');
      renderItems();
    } else {
      showNotification('⚠️ 儲存失敗，密碼已失效，請重新登入版主', 'warning');
    }
  } catch(e) {
    console.error('Save per page error:', e);
    showNotification(`✅ 已於本機儲存每頁筆數為：${val} 筆！`, 'success');
    renderItems();
  }
}

/**
 * 載入網站自訂名稱
 */
async function loadSiteName() {
  const defaultName = localStorage.getItem('pega_site_name') || 'PEGAPEGA';
  let nameToUse = defaultName;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/messages?item_id=eq.${CONFIG_UUIDS.ANNOUNCEMENT}&select=*&order=created_at.desc&limit=1`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0 && data[0].content) {
        nameToUse = data[0].content;
        localStorage.setItem('pega_site_name', nameToUse);
      }
    }
  } catch(e) { 
    console.error('Fetch sitename error:', e); 
  }

  const titleSpan = document.getElementById('site-title-text');
  const input = document.getElementById('admin-sitename-input');
  const docTitle = document.getElementById('doc-site-title');
  if (titleSpan) titleSpan.innerText = nameToUse;
  if (input) input.value = nameToUse;
  if (docTitle) docTitle.innerText = nameToUse;
  document.title = nameToUse;
}

/**
 * 儲存網站自訂名稱
 */
async function saveSiteName() {
  const input = document.getElementById('admin-sitename-input');
  const newName = (input?.value || '').trim();
  if (!newName) return showNotification('⚠️ 網站名稱不可為空', 'warning');
  
  localStorage.setItem('pega_site_name', newName);
  
  const titleSpan = document.getElementById('site-title-text');
  const docTitle = document.getElementById('doc-site-title');
  if (titleSpan) titleSpan.innerText = newName;
  if (docTitle) docTitle.innerText = newName;
  document.title = newName;

  try {
    const pwdHash = localStorage.getItem('pega_admin_hash') || '';
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/save_sitename_admin`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_name: newName, pwd_input: pwdHash })
    });
    if (res.ok) {
      showNotification(`✅ 網站名稱已永久寫入雲端並更新為：${newName}`, 'success');
    } else {
      showNotification('⚠️ 儲存失敗，密碼已失效，請重新登入版主', 'warning');
    }
  } catch(e) {
    console.error('Save site name error:', e);
    showNotification(`✅ 已於本機更新網站名稱為：${newName}`, 'success');
  }
}

/**
 * 重新整理全站公告顯示
 */
function refreshAnnouncementDisplay() {
  const textSpan = document.getElementById('announcement-text');
  if (!textSpan) return;
  
  const count = typeof filteredTotalCount !== 'undefined' ? filteredTotalCount : 0;
  const countText = `\n📊 目前刊登物品共 ${count} 件`;
  
  let noticeToDisplay = currentRawNotice;
  if (noticeToDisplay) {
    const lines = noticeToDisplay.split('\n');
    const filteredLines = lines.filter(line => !line.includes('目前刊登物品共'));
    noticeToDisplay = filteredLines.join('\n').trim();
    textSpan.innerText = noticeToDisplay + countText;
  }
}

/**
 * 關閉/收合全站公告欄 (並記錄至 sessionStorage 避免每次跳轉打擾使用者)
 */
function closeAnnouncementBar() {
  const bar = document.getElementById('announcement-bar');
  if (bar) {
    bar.classList.add('hidden');
    sessionStorage.setItem('pega_announcement_dismissed', 'true');
  }
}

/**
 * 載入全站公告
 */
async function loadAnnouncement() {
  const defaultNotice = '歡迎使用 PEGA 告示牌！匿名二手與尾牙獎品交換平台：\n💡 免登入直接刊登：支援「想買、想賣、免費送」，全新推出「尾牙全新專區」與「以物易物」功能！\n📞 填寫正確聯絡管道：請務必提供分機 或 Teams，方便同仁一鍵複製快速聯繫。\n🤝 成交請及時下架：交易完成後，請務必點選卡片「已售出」或「下架貼文」，讓版面保持乾淨。';
  const textSpan = document.getElementById('announcement-text');
  const adminInput = document.getElementById('admin-announcement-input');
  const bar = document.getElementById('announcement-bar');

  const cachedNotice = localStorage.getItem('pega_custom_announcement');
  const initialNotice = cachedNotice || defaultNotice;

  currentRawNotice = initialNotice;
  refreshAnnouncementDisplay();

  if (adminInput && !adminInput.value) adminInput.value = initialNotice;
  
  if (bar) {
    const isDismissed = sessionStorage.getItem('pega_announcement_dismissed') === 'true';
    if (!isDismissed) {
      bar.classList.remove('hidden');
    }
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/messages?item_id=eq.00000000-0000-0000-0000-000000000001&select=*&order=created_at.desc&limit=1`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0 && data[0].content) {
        const dbText = data[0].content;
        currentRawNotice = dbText;
        refreshAnnouncementDisplay();
        if (adminInput) adminInput.value = dbText;
        localStorage.setItem('pega_custom_announcement', dbText);
      }
    }
  } catch(e) { 
    console.error('Fetch notice error:', e); 
  }
}

/**
 * 儲存全站公告
 */
async function saveAnnouncement() {
  const input = document.getElementById('admin-announcement-input');
  const text = (input?.value || '').trim();
  if (!text) return showNotification('請輸入公告內容', 'warning');

  try {
    const pwdHash = localStorage.getItem('pega_admin_hash') || '';
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/save_announcement_admin`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text_input: text, pwd_input: pwdHash })
    });

    if (res.ok) {
      localStorage.setItem('pega_custom_announcement', text);
      localStorage.setItem('pega_saved_default_announcement', text);

      await fetch(`${SUPABASE_URL}/rest/v1/rpc/set_default_announcement_admin`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text_input: text, pwd_input: pwdHash })
      });

      currentRawNotice = text;
      refreshAnnouncementDisplay();
      const bar = document.getElementById('announcement-bar');
      if (bar) bar.classList.remove('hidden');

      showNotification('🎉 全站公告已發布並儲存為預設範本！', 'success');
    } else {
      showNotification('⚠️ 儲存公告失敗，密碼已失效，請重新登入版主', 'warning');
    }
  } catch(e) { 
    console.error('Save announcement error:', e); 
    showNotification(`❌ 儲存公告失敗：${e.message}`, 'error');
  }
}

/**
 * 設定為預設須知範本
 */
async function setDefaultAnnouncementTemplate() {
  const adminInput = document.getElementById('admin-announcement-input');
  const text = (adminInput?.value || '').trim();
  if (!text) {
    showNotification('⚠️ 請輸入欲設定為預設範本的須知內容', 'warning');
    return;
  }

  localStorage.setItem('pega_saved_default_announcement', text);

  try {
    const pwdHash = localStorage.getItem('pega_admin_hash') || '';
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/set_default_announcement_admin`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text_input: text, pwd_input: pwdHash })
    });

    if (res.ok) {
      showNotification('⭐ 已成功儲存為您的專屬預設須知範本！以後點擊「填入預設須知」將自動填入。', 'success');
    } else {
      showNotification('⚠️ 儲存範本失敗，密碼已失效，請重新登入版主', 'warning');
    }
  } catch(e) {
    console.error('Save template error:', e);
    showNotification('⭐ 已儲存為本機預設須知範本！', 'success');
  }
}

/**
 * 快速填入預設須知
 */
async function fillDefaultAnnouncement() {
  const adminInput = document.getElementById('admin-announcement-input');
  if (!adminInput) return;

  const systemDefaultNotice = '歡迎使用 PEGA 告示牌！匿名二手與尾牙獎品交換平台：\n💡 免登入直接刊登：支援「想買、想賣、免費送」，全新推出「尾牙全新專區」與「以物易物」功能！\n📞 填寫正確聯絡管道：請務必提供分機 或 Teams，方便同仁一鍵複製快速聯繫。\n🤝 成交請及時下架：交易完成後，請務必點選卡片「已售出」或「下架貼文」，讓版面保持乾淨。';
  let customTemplate = localStorage.getItem('pega_saved_default_announcement');

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/messages?item_id=eq.00000000-0000-0000-0000-000000000010&select=*&order=created_at.desc&limit=1`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0 && data[0].content) {
        customTemplate = data[0].content;
        localStorage.setItem('pega_saved_default_announcement', customTemplate);
      }
    }
  } catch(e) { console.error('Fetch notice template error:', e); }

  const noticeToUse = customTemplate || systemDefaultNotice;
  adminInput.value = noticeToUse;

  if (customTemplate) {
    showNotification('📋 已載入您自訂的預設須知範本，請點擊「儲存公告」生效！', 'info');
  } else {
    showNotification('📋 已載入系統預設須知文字，請點擊「儲存公告」生效！', 'info');
  }
}

/**
 * 完全清除全站公告
 */
async function clearAnnouncement() {
  try {
    const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/messages?item_id=eq.00000000-0000-0000-0000-000000000001&select=id`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    if (!checkRes.ok) throw new Error('連線查詢失敗。');
    const existing = await checkRes.json();
    if (existing && existing.length > 0) {
      for (const item of existing) {
        const delRes = await fetch(`${SUPABASE_URL}/rest/v1/messages?id=eq.${item.id}`, {
          method: 'DELETE',
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        if (!delRes.ok) throw new Error('雲端公告清除失敗。');
      }
    }
    
    localStorage.removeItem('pega_custom_announcement');
    
    const textSpan = document.getElementById('announcement-text');
    const adminInput = document.getElementById('admin-announcement-input');
    const bar = document.getElementById('announcement-bar');

    if (textSpan) textSpan.innerText = '';
    if (adminInput) adminInput.value = '';
    if (bar) bar.classList.add('hidden');

    showNotification('🗑️ 全站公告已從資料庫與畫面完全清除！', 'info');
  } catch(e) { 
    console.error('Clear announcement error:', e); 
    showNotification(`❌ 清除失敗：${e.message}`, 'error');
  }
}

function closeAnnouncementBar() {
  document.getElementById('announcement-bar').classList.add('hidden');
}

// -----------------------------------------------------------------------------
// 🏆 歷史成交紀錄 (Archive Modal)
// -----------------------------------------------------------------------------

function openArchiveModal() {
  if (typeof closeAllModals === 'function') closeAllModals();
  document.getElementById('archive-modal').classList.remove('hidden');
  loadArchiveLogs();
}

function closeArchiveModal() {
  document.getElementById('archive-modal').classList.add('hidden');
}

function toggleSelectAllArchive(master) {
  const cbs = document.querySelectorAll('.archive-checkbox');
  cbs.forEach(cb => cb.checked = master.checked);
  updateArchiveBatchDeleteUI();
}

function updateArchiveBatchDeleteUI() {
  const cbs = document.querySelectorAll('.archive-checkbox');
  const checked = Array.from(cbs).filter(cb => cb.checked);
  const btn = document.getElementById('archive-batch-delete-btn');
  const cnt = document.getElementById('archive-selected-count');
  
  if (cnt) cnt.innerText = checked.length;
  if (btn) {
    if (checked.length > 0) {
      btn.classList.remove('hidden');
      btn.classList.add('flex');
    } else {
      btn.classList.add('hidden');
      btn.classList.remove('flex');
    }
  }
  
  const master = document.getElementById('archive-select-all');
  if (master && cbs.length > 0) {
    master.checked = (checked.length === cbs.length);
  }
}

async function deleteSelectedArchiveLogs() {
  if (!isAdmin) return showNotification('⚠️ 權限不足，僅限版主批次刪除', 'warning');
  
  const cbs = document.querySelectorAll('.archive-checkbox:checked');
  const selectedIds = Array.from(cbs).map(cb => cb.value);
  
  if (selectedIds.length === 0) return;
  
  if (!confirm(`您確定要一次【批次刪除】選取的 ${selectedIds.length} 筆歷史成交/下架存檔紀錄嗎？\n\n（此操作無法恢復，且會從成交清單中永久移除）`)) {
    return;
  }
  
  showNotification(`🗑️ 正在批次刪除 ${selectedIds.length} 筆歷史紀錄...`, 'info');
  
  const pwdHash = localStorage.getItem('pega_admin_hash') || '';
  let successCount = 0;
  
  for (const logUuid of selectedIds) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/delete_archive_log_admin`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ log_uuid: logUuid, pwd_input: pwdHash })
      });
      if (res.ok) successCount++;
    } catch(e) {
      console.error('Batch delete single log error:', e);
    }
  }
  
  showNotification(`🎉 批次刪除完成！成功刪除 ${successCount} 筆紀錄。`, 'success');
  await loadArchiveLogs();
}

async function deleteArchiveLog(dbId) {
  if (!isAdmin) {
    showNotification('⚠️ 權限不足，僅限版主刪除紀錄', 'warning');
    return;
  }
  if (!confirm('您確定要刪除此筆成交/下架存檔紀錄嗎？\n（此操作無法恢復，且會從歷史成交中移除）')) {
    return;
  }

  try {
    const pwdHash = localStorage.getItem('pega_admin_hash') || '';
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/delete_archive_log_admin`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ log_uuid: dbId, pwd_input: pwdHash })
    });

    if (!res.ok) throw new Error('刪除失敗，密碼已失效，請重新登入版主');

    showNotification('🗑️ 歷史存檔紀錄已成功刪除！', 'success');
    await loadArchiveLogs();
  } catch(e) {
    console.error('Delete archive log error:', e);
    showNotification(`❌ 刪除失敗：${e.message}`, 'warning');
  }
}

async function loadArchiveLogs() {
  const tbody = document.getElementById('archive-table-body');
  const colspan = isAdmin ? 6 : 5;
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="${colspan}" class="px-4 py-8 text-center text-gray-400 font-bold">⏳ 正在連線讀取存檔數據...</td></tr>`;
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/messages?item_id=eq.00000000-0000-0000-0000-000000000003&order=created_at.desc`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    
    if (!res.ok) throw new Error('讀取失敗');
    const rows = await res.json();
    
    archiveLogs = rows.map(r => {
      try {
        const parsed = JSON.parse(r.content);
        return {
          ...parsed,
          db_id: r.id
        };
      } catch(e) {
        return null;
      }
    }).filter(Boolean);

    renderArchive(archiveLogs);
  } catch(e) {
    console.error('Load archive logs error:', e);
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="${colspan}" class="px-4 py-8 text-center text-red-400 font-bold">⚠️ 無法連線讀取歷史存檔 (${e.message})</td></tr>`;
    }
  }
}

function renderArchive(logs) {
  const tbody = document.getElementById('archive-table-body');
  if (!tbody) return;

  const selectHeader = document.getElementById('archive-header-select');
  const actionHeader = document.getElementById('archive-header-action');
  if (selectHeader) {
    if (isAdmin) selectHeader.classList.remove('hidden');
    else selectHeader.classList.add('hidden');
  }
  if (actionHeader) {
    if (isAdmin) actionHeader.classList.remove('hidden');
    else actionHeader.classList.add('hidden');
  }

  const masterCb = document.getElementById('archive-select-all');
  if (masterCb) masterCb.checked = false;
  updateArchiveBatchDeleteUI();

  const colspan = isAdmin ? 7 : 5;
  if (!logs || logs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${colspan}" class="px-4 py-8 text-center text-gray-400 font-bold">尚無成交或下架存檔紀錄</td></tr>`;
    const countElem = document.getElementById('archive-stat-count');
    const freeElem = document.getElementById('archive-stat-free');
    if (countElem) countElem.innerText = '0';
    if (freeElem) freeElem.innerText = '0';
    return;
  }

  let totalCount = logs.length;
  let totalSum = 0;
  let freeCount = 0;

  const html = logs.map(log => {
    const titleSafe = escapeHtml(log.title || '無標題');
    const price = log.type === 'free' ? 0 : parseInt(log.price || '0', 10);
    const nicknameSafe = escapeHtml(log.nickname || '匿名同仁');
    
    if (log.type === 'free') {
      freeCount++;
    } else {
      totalSum += (isNaN(price) ? 0 : price);
    }

    const typeBadge = log.type === 'free' ? '<span class="bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded text-xs">🎁 送</span>' :
                      log.type === 'buy' ? '<span class="bg-amber-950 text-amber-400 border border-amber-800 px-2 py-0.5 rounded text-xs">🔍 買</span>' :
                      '<span class="bg-indigo-950 text-indigo-400 border border-indigo-800 px-2 py-0.5 rounded text-xs">💰 賣</span>';

    const priceStr = log.type === 'free' ? '免費送' : `NT$ ${price.toLocaleString()}`;
    const soldDate = log.sold_at ? new Date(log.sold_at).toLocaleString('zh-TW', { hour12: false }) : '未知時間';

    const deleteBtnHtml = isAdmin ? `
      <td class="px-3 py-3 text-center">
        <button onclick="deleteArchiveLog('${log.db_id}')" class="text-red-400 hover:text-red-300 transition active:scale-95 px-1.5 py-0.5 hover:bg-red-500/10 rounded" title="刪除此紀錄">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </td>
    ` : '';

    const checkboxTd = isAdmin ? `
      <td class="px-3 py-3 text-center">
        <input type="checkbox" class="archive-checkbox w-4 h-4 rounded bg-gray-950 border-gray-700 text-indigo-600 focus:ring-0 cursor-pointer" value="${log.db_id}" onclick="updateArchiveBatchDeleteUI()">
      </td>
    ` : '';

    return `
      <tr class="hover:bg-gray-800/40 transition">
        ${checkboxTd}
        <td class="px-4 py-3 font-bold text-gray-100">${titleSafe}</td>
        <td class="px-3 py-3">${typeBadge}</td>
        <td class="px-3 py-3 font-black text-indigo-400">${priceStr}</td>
        <td class="px-3 py-3 text-gray-400">${nicknameSafe}</td>
        <td class="px-4 py-3 text-gray-400 text-xs">${soldDate}</td>
        ${deleteBtnHtml}
      </tr>
    `;
  }).join('');

  tbody.innerHTML = html;

  const countElem = document.getElementById('archive-stat-count');
  const sumElem = document.getElementById('archive-stat-sum');
  const freeElem = document.getElementById('archive-stat-free');
  if (countElem) countElem.innerText = totalCount;
  if (sumElem) sumElem.innerText = `NT$ ${totalSum.toLocaleString()}`;
  if (freeElem) freeElem.innerText = freeCount;
}

function filterArchive() {
  const search = (document.getElementById('archive-search')?.value || '').toLowerCase().trim();
  if (!search) {
    renderArchive(archiveLogs);
    return;
  }

  const filtered = archiveLogs.filter(log => {
    const titleMatch = (log.title || '').toLowerCase().includes(search);
    const nicknameMatch = (log.nickname || '').toLowerCase().includes(search);
    const priceMatch = String(log.price || '').includes(search);
    return titleMatch || nicknameMatch || priceMatch;
  });

  renderArchive(filtered);
}

function exportArchiveToTxt() {
  if (archiveLogs.length === 0) {
    return showNotification('⚠️ 目前沒有任何成交紀錄可以匯出！', 'warning');
  }

  const searchVal = document.getElementById('archive-search')?.value || '';
  let logsToExport = archiveLogs;
  if (searchVal) {
    logsToExport = archiveLogs.filter(log => {
      const titleMatch = (log.title || '').toLowerCase().includes(searchVal);
      const nicknameMatch = (log.nickname || '').toLowerCase().includes(searchVal);
      const priceMatch = String(log.price || '').includes(searchVal);
      return titleMatch || nicknameMatch || priceMatch;
    });
  }

  let totalSum = 0;
  let freeCount = 0;
  let text = `==================================================\n`;
  text += `    PEGA 二手告示牌 - 歷史成交與下架存檔紀錄\n`;
  text += `    導出時間：${new Date().toLocaleString('zh-TW', { hour12: false })}\n`;
  if (searchVal) {
    text += `    搜尋條件：${searchVal}\n`;
  }
  text += `==================================================\n\n`;

  logsToExport.forEach((log, index) => {
    const typeStr = log.type === 'free' ? '免費送' : log.type === 'buy' ? '想買' : '想賣';
    const price = log.type === 'free' ? 0 : parseInt(log.price || '0', 10);
    
    if (log.type === 'free') {
      freeCount++;
    } else {
      totalSum += (isNaN(price) ? 0 : price);
    }

    const priceText = log.type === 'free' ? 'NT$ 0 (免費)' : `NT$ ${price.toLocaleString()}`;
    const soldDate = log.sold_at ? new Date(log.sold_at).toLocaleString('zh-TW', { hour12: false }) : '未知時間';
    const createDate = log.created_at ? new Date(log.created_at).toLocaleString('zh-TW', { hour12: false }) : '未知時間';

    text += `${index + 1}. 【${typeStr}】${log.title}\n`;
    text += `   - 交易金額：${priceText}\n`;
    text += `   - 刊登同仁：${log.nickname || '匿名同仁'}\n`;
    text += `   - 上架時間：${createDate}\n`;
    text += `   - 成交時間：${soldDate}\n`;
    text += `   - 商品 ID ：${log.id || ''}\n`;
    text += `--------------------------------------------------\n`;
  });

  text += `\n==================================================\n`;
  text += `【存檔統計摘要】\n`;
  text += `累計存檔總數：${logsToExport.length} 件\n`;
  text += `交易金額總計：NT$ ${totalSum.toLocaleString()} 元\n`;
  text += `免費贈送件數：${freeCount} 件\n`;
  text += `==================================================\n`;

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `PEGA_secondhand_transactions_${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showNotification('📥 歷史成交紀錄文字檔已成功下載！', 'success');
}

// -----------------------------------------------------------------------------
// 📋 版主專屬 - 全站貼文批次管理與強制刪除 (Admin Items Batch Management)
// -----------------------------------------------------------------------------

var adminItemsList = [];

var adminIssuesList = [];

/**
 * 切換版主後台內部子頁籤 (系統設定 vs 貼文批次管理 vs 留言板批次管理)
 * @param {'settings'|'items'|'issues'} tab 子分頁
 */
function switchAdminTab(tab) {
  const settingsView = document.getElementById('admin-subview-settings');
  const itemsView = document.getElementById('admin-subview-items');
  const issuesView = document.getElementById('admin-subview-issues');
  const settingsBtn = document.getElementById('admin-tab-btn-settings');
  const itemsBtn = document.getElementById('admin-tab-btn-items');
  const issuesBtn = document.getElementById('admin-tab-btn-issues');

  if (settingsView) settingsView.classList.add('hidden');
  if (itemsView) itemsView.classList.add('hidden');
  if (issuesView) issuesView.classList.add('hidden');

  if (settingsBtn) settingsBtn.className = 'px-3.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-bold text-xs transition cursor-pointer';
  if (itemsBtn) itemsBtn.className = 'px-3.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer';
  if (issuesBtn) issuesBtn.className = 'px-3.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer';

  if (tab === 'settings') {
    if (settingsView) settingsView.classList.remove('hidden');
    if (settingsBtn) settingsBtn.className = 'px-3.5 py-1.5 bg-indigo-600 text-white rounded-xl font-bold text-xs shadow transition cursor-pointer';
  } else if (tab === 'items') {
    if (itemsView) itemsView.classList.remove('hidden');
    if (itemsBtn) itemsBtn.className = 'px-3.5 py-1.5 bg-indigo-600 text-white rounded-xl font-bold text-xs shadow transition flex items-center gap-1.5 cursor-pointer';
    loadAdminItemsTable();
  } else if (tab === 'issues') {
    if (issuesView) issuesView.classList.remove('hidden');
    if (issuesBtn) issuesBtn.className = 'px-3.5 py-1.5 bg-amber-500 text-gray-950 rounded-xl font-black text-xs shadow transition flex items-center gap-1.5 cursor-pointer';
    loadAdminIssuesTable();
  }
}

/**
 * 載入並渲染版主留言板管理列表
 */
async function loadAdminIssuesTable() {
  const tbody = document.getElementById('admin-issues-table-body');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="7" class="px-4 py-8 text-center text-gray-400 font-bold">⏳ 正在載入留言板清單...</td></tr>';
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/messages?item_id=eq.00000000-0000-0000-0000-000000000002&order=created_at.desc`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    if (res.ok) {
      const data = await res.json();
      adminIssuesList = data || [];

      const badge = document.getElementById('admin-issues-total-badge');
      if (badge) badge.innerText = adminIssuesList.length;

      filterAdminIssues();
    } else {
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="7" class="px-4 py-8 text-center text-rose-400 font-bold">⚠️ 載入留言失敗，請檢查網路連線</td></tr>';
      }
    }
  } catch(e) {
    console.error('Load admin issues error:', e);
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="7" class="px-4 py-8 text-center text-rose-400 font-bold">⚠️ 載入失敗：${e.message}</td></tr>`;
    }
  }
}

/**
 * 依搜尋與狀態條件過濾留言
 */
function filterAdminIssues() {
  const searchVal = (document.getElementById('admin-issues-search')?.value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('admin-issues-status-filter')?.value || 'all';

  const filtered = adminIssuesList.filter(iss => {
    const isResolved = (iss.content || '').includes('[RESOLVED]');
    if (statusFilter === 'pending' && isResolved) return false;
    if (statusFilter === 'resolved' && !isResolved) return false;

    if (searchVal) {
      const matchNick = (iss.sender_name || '').toLowerCase().includes(searchVal);
      const matchContent = (iss.content || '').toLowerCase().includes(searchVal);
      return matchNick || matchContent;
    }
    return true;
  });

  renderAdminIssuesTable(filtered);
}

/**
 * 渲染版主留言板表格 DOM
 */
function renderAdminIssuesTable(issues) {
  const tbody = document.getElementById('admin-issues-table-body');
  if (!tbody) return;

  const masterCb = document.getElementById('admin-issues-select-all');
  if (masterCb) masterCb.checked = false;
  updateAdminIssueBatchUI();

  if (issues.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="px-4 py-8 text-center text-gray-400 font-bold">尚無符合條件的留言資料</td></tr>';
    return;
  }

  tbody.innerHTML = issues.map(iss => {
    const isResolved = (iss.content || '').includes('[RESOLVED]');
    const fullContent = iss.content || '';
    
    let replyText = '';
    const replyMatch = fullContent.match(/\[ADMIN_REPLY:([\s\S]*?)\]/);
    if (replyMatch && replyMatch[1]) {
      replyText = replyMatch[1];
    }

    const cleanUserText = fullContent
      .replace(/\[ADMIN_REPLY:[\s\S]*?\]/g, '')
      .replace(/\[RESOLVED_AT:.*?\]/g, '')
      .replace(/\[RESOLVED\]/g, '')
      .trim();

    const safeSenderName = escapeHtml(iss.sender_name || '熱心同仁');
    const safeUserText = escapeHtml(cleanUserText);
    const safeReplyText = escapeHtml(replyText);

    return `
      <tr class="hover:bg-gray-900/80 transition ${isResolved ? 'opacity-70 bg-gray-950/40' : ''}">
        <td class="px-3.5 py-3 text-center">
          <input type="checkbox" class="admin-issue-checkbox w-4 h-4 rounded bg-gray-950 border-gray-700 text-amber-500 focus:ring-0 cursor-pointer" value="${iss.id}" onchange="updateAdminIssueBatchUI()">
        </td>
        <td class="px-3.5 py-3 font-bold text-gray-200">
          <span class="flex items-center gap-1.5"><i class="fa-solid fa-circle-user text-amber-400"></i> ${safeSenderName}</span>
        </td>
        <td class="px-3.5 py-3 text-gray-200 max-w-xs break-words">
          <div class="line-clamp-3 text-xs leading-relaxed font-medium bg-black/30 p-2 rounded-lg border border-white/5 whitespace-pre-line">${safeUserText}</div>
        </td>
        <td class="px-3.5 py-3 text-xs max-w-xs break-words">
          ${safeReplyText ? `
            <div class="text-indigo-300 bg-indigo-950/60 p-2 rounded-lg border border-indigo-500/30 line-clamp-3 leading-relaxed">
              <span class="font-bold text-amber-300">版主：</span>${safeReplyText}
            </div>
          ` : '<span class="text-gray-500 text-xs italic">尚未回覆</span>'}
        </td>
        <td class="px-3.5 py-3 text-center">
          ${isResolved ? 
            '<span class="bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 text-[11px] font-bold px-2 py-0.5 rounded-md">✅ 已處理完成</span>' : 
            '<span class="bg-amber-950/80 text-amber-400 border border-amber-500/40 text-[11px] font-bold px-2 py-0.5 rounded-md animate-pulse">⚡ 處理中</span>'}
        </td>
        <td class="px-3.5 py-3 text-xs text-gray-400 whitespace-nowrap font-medium">${timeAgo(iss.created_at)}</td>
        <td class="px-3.5 py-3 text-center whitespace-nowrap">
          <div class="flex items-center justify-center gap-1.5">
            <button onclick="replyIssueAdmin('${iss.id}').then(() => loadAdminIssuesTable())" class="px-2.5 py-1 bg-indigo-900/80 hover:bg-indigo-700 text-indigo-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer" title="回覆同仁">
              💬 回覆
            </button>
            <button onclick="toggleResolveIssue('${iss.id}', ${isResolved}).then(() => loadAdminIssuesTable())" class="px-2.5 py-1 ${isResolved ? 'bg-amber-900/60 hover:bg-amber-700 text-amber-300' : 'bg-emerald-900/60 hover:bg-emerald-700 text-emerald-300'} rounded-lg text-xs font-bold transition cursor-pointer" title="切換狀態">
              ${isResolved ? '↩️ 處理中' : '✍️ 標已解'}
            </button>
            <button onclick="deleteIssueAdmin('${iss.id}').then(() => loadAdminIssuesTable())" class="px-2.5 py-1 bg-rose-950/80 hover:bg-rose-900 border border-rose-700/50 text-rose-300 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer" title="刪除留言">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * 全選或取消全選版主留言表格
 */
function toggleSelectAllAdminIssues(master) {
  const cbs = document.querySelectorAll('.admin-issue-checkbox');
  cbs.forEach(cb => cb.checked = master.checked);
  updateAdminIssueBatchUI();
}

/**
 * 更新版主留言表格批次選取狀態
 */
function updateAdminIssueBatchUI() {
  const cbs = document.querySelectorAll('.admin-issue-checkbox:checked');
  const cnt = cbs.length;
  const badge = document.getElementById('admin-issues-selected-count');
  const btn = document.getElementById('admin-issues-batch-delete-btn');
  const master = document.getElementById('admin-issues-select-all');

  if (badge) badge.innerText = cnt;
  if (btn) {
    if (cnt > 0) {
      btn.classList.remove('hidden');
      btn.classList.add('flex');
    } else {
      btn.classList.add('hidden');
      btn.classList.remove('flex');
    }
  }

  const allCbs = document.querySelectorAll('.admin-issue-checkbox');
  if (master && allCbs.length > 0) {
    master.checked = (cnt === allCbs.length);
  }
}

/**
 * 版主表格批次強制刪除留言
 */
async function batchDeleteSelectedAdminIssues() {
  const cbs = document.querySelectorAll('.admin-issue-checkbox:checked');
  const selectedIds = Array.from(cbs).map(cb => cb.value);

  if (selectedIds.length === 0) return;

  if (!confirm(`⚠️ 確定要批次永久刪除選取的 ${selectedIds.length} 則留言紀錄嗎？\n此操作無法復原！`)) return;

  showNotification(`🗑️ 正在批次刪除 ${selectedIds.length} 則留言...`, 'info');

  const pwdHash = localStorage.getItem('pega_admin_hash') || '';
  let successCount = 0;

  for (const id of selectedIds) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/delete_issue_admin`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ issue_id: id, pwd_input: pwdHash })
      });
      if (res.ok) successCount++;
    } catch(e) {
      console.error('Batch delete single issue error:', e);
    }
  }

  showNotification(`🎉 批次刪除完成！成功刪除 ${successCount} 則留言。`, 'success');
  await loadAdminIssuesTable();
  if (typeof loadAndRenderIssues === 'function') loadAndRenderIssues();
}

/**
 * 載入並渲染版主貼文管理列表
 */
async function loadAdminItemsTable() {
  const tbody = document.getElementById('admin-items-table-body');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="8" class="px-4 py-8 text-center text-gray-400 font-bold">⏳ 正在載入貼文清單...</td></tr>';
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/items?select=id,created_at,title,description,price,type,image_url,nickname,device_id,contact_info&order=created_at.desc`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    if (res.ok) {
      const data = await res.json();
      adminItemsList = data.filter(item => {
        return item.device_id !== 'SYSTEM' && !(item.title && item.title.startsWith('SYSTEM_')) && !(item.id && item.id.startsWith('00000000-0000-0000-0000-'));
      });

      const badge = document.getElementById('admin-items-total-badge');
      if (badge) badge.innerText = adminItemsList.length;

      filterAdminItems();
    } else {
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="8" class="px-4 py-8 text-center text-red-400 font-bold">⚠️ 載入失敗，請檢查網路連線</td></tr>';
      }
    }
  } catch(e) {
    console.error('Load admin items error:', e);
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="8" class="px-4 py-8 text-center text-red-400 font-bold">⚠️ 載入失敗：${e.message}</td></tr>`;
    }
  }
}

/**
 * 依搜尋與分類條件過濾並渲染版主貼文表格
 */
function filterAdminItems() {
  const searchVal = (document.getElementById('admin-items-search')?.value || '').toLowerCase().trim();
  const typeFilter = document.getElementById('admin-items-type-filter')?.value || 'all';

  const filtered = adminItemsList.filter(item => {
    if (typeFilter !== 'all' && item.type !== typeFilter) return false;
    if (searchVal) {
      const matchTitle = (item.title || '').toLowerCase().includes(searchVal);
      const matchNick = (item.nickname || '').toLowerCase().includes(searchVal);
      const matchPrice = String(item.price || '').toLowerCase().includes(searchVal);
      return matchTitle || matchNick || matchPrice;
    }
    return true;
  });

  renderAdminItemsTable(filtered);
}

/**
 * 渲染版主貼文表格 DOM
 */
function renderAdminItemsTable(items) {
  const tbody = document.getElementById('admin-items-table-body');
  if (!tbody) return;

  const masterCb = document.getElementById('admin-items-select-all');
  if (masterCb) masterCb.checked = false;
  updateAdminItemBatchUI();

  if (items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="px-4 py-8 text-center text-gray-400 font-bold">尚無符合條件的貼文資料</td></tr>';
    return;
  }

  tbody.innerHTML = items.map(item => {
    const isSold = isItemSold(item);
    const isPinned = globalPinnedIds.includes(item.id);
    const safeTitle = escapeHtml(item.title || '無標題');
    const safeNickname = escapeHtml(item.nickname || '同仁');
    const firstImg = (item.image_url || '').split('|||')[0] || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop';

    const typeBadge = item.type === 'free' ? '<span class="bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded text-xs font-bold">🎁 送</span>' :
                      item.type === 'buy' ? '<span class="bg-amber-950 text-amber-400 border border-amber-800 px-2 py-0.5 rounded text-xs font-bold">🔍 買</span>' :
                      item.type === 'lucky' ? '<span class="bg-rose-950 text-rose-400 border border-rose-800 px-2 py-0.5 rounded text-xs font-bold">🎁 尾牙</span>' :
                      '<span class="bg-indigo-950 text-indigo-400 border border-indigo-800 px-2 py-0.5 rounded text-xs font-bold">💰 賣</span>';

    let priceStr = '';
    if (item.price && String(item.price).startsWith('swap:')) {
      priceStr = '以物易物';
    } else if (item.type === 'free') {
      priceStr = 'NT$ 0';
    } else {
      const num = parseFloat(item.price);
      priceStr = isNaN(num) ? `NT$ ${escapeHtml(item.price)}` : `NT$ ${num.toLocaleString()}`;
    }

    const postDate = item.created_at ? new Date(item.created_at).toLocaleString('zh-TW', { hour12: false }) : '未知時間';

    return `
      <tr class="hover:bg-gray-800/40 transition">
        <td class="px-3 py-2.5 text-center">
          <input type="checkbox" class="admin-item-checkbox w-4 h-4 rounded bg-gray-950 border-gray-700 text-indigo-600 focus:ring-0 cursor-pointer" value="${item.id}" onclick="updateAdminItemBatchUI()">
        </td>
        <td class="px-3 py-2.5">
          <img src="${firstImg}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop';" class="w-10 h-10 object-cover rounded-lg border border-gray-700">
        </td>
        <td class="px-3 py-2.5 font-bold text-gray-100 max-w-[200px] truncate" title="${safeTitle}">
          <div class="flex items-center gap-1.5">
            ${isPinned ? '<span class="text-amber-400 text-xs font-black">📌</span>' : ''}
            ${isSold ? '<span class="text-emerald-400 text-xs font-black">[已售出]</span>' : ''}
            <span class="hover:text-indigo-400 cursor-pointer" onclick="openDetailModal('${item.id}')">${safeTitle}</span>
          </div>
        </td>
        <td class="px-3 py-2.5">${typeBadge}</td>
        <td class="px-3 py-2.5 font-bold text-indigo-300">${priceStr}</td>
        <td class="px-3 py-2.5 text-gray-400 font-medium">${safeNickname}</td>
        <td class="px-3 py-2.5 text-gray-400 text-xs">${timeAgo(item.created_at)}</td>
        <td class="px-3 py-2.5 text-center">
          <div class="flex items-center justify-center gap-1.5">
            <button onclick="togglePinItem('${item.id}'); loadAdminItemsTable();" class="p-1.5 ${isPinned ? 'text-amber-400 bg-amber-500/10' : 'text-gray-400 hover:text-white hover:bg-gray-800'} rounded-lg transition" title="${isPinned ? '取消置頂' : '設為官方置頂'}">
              <i class="fa-solid fa-thumbtack text-xs"></i>
            </button>
            <button onclick="deleteSingleItemFromAdminTable('${item.id}')" class="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition" title="強制刪除此貼文">
              <i class="fa-solid fa-trash-can text-xs"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * 全選/全取消版主貼文清單
 */
function toggleSelectAllAdminItems(master) {
  const cbs = document.querySelectorAll('.admin-item-checkbox');
  cbs.forEach(cb => cb.checked = master.checked);
  updateAdminItemBatchUI();
}

/**
 * 更新版主批次刪除按鈕狀態與計數
 */
function updateAdminItemBatchUI() {
  const cbs = document.querySelectorAll('.admin-item-checkbox');
  const checked = Array.from(cbs).filter(cb => cb.checked);
  const btn = document.getElementById('admin-batch-delete-btn');
  const cnt = document.getElementById('admin-selected-count');

  if (cnt) cnt.innerText = checked.length;
  if (btn) {
    if (checked.length > 0) {
      btn.classList.remove('hidden');
      btn.classList.add('flex');
    } else {
      btn.classList.add('hidden');
      btn.classList.remove('flex');
    }
  }

  const master = document.getElementById('admin-items-select-all');
  if (master && cbs.length > 0) {
    master.checked = (checked.length === cbs.length);
  }
}

/**
 * 版主表格內單筆強制刪除
 */
async function deleteSingleItemFromAdminTable(itemId) {
  await deleteItemAdmin(itemId);
  await loadAdminItemsTable();
}

/**
 * 版主多選強制批次刪除貼文
 */
async function batchDeleteSelectedAdminItems() {
  if (!isAdmin) return showNotification('⚠️ 權限不足，僅限版主批次刪除', 'warning');

  const cbs = document.querySelectorAll('.admin-item-checkbox:checked');
  const selectedIds = Array.from(cbs).map(cb => cb.value);

  if (selectedIds.length === 0) return;

  if (!confirm(`⚠️ 版主警告：您確定要【強制批次刪除】選取的 ${selectedIds.length} 筆貼文嗎？\n\n（此操作將從資料庫中永久刪除貼文與照片，無法復原！）`)) {
    return;
  }

  showNotification(`🗑️ 正在批次強制刪除 ${selectedIds.length} 筆貼文...`, 'info');

  const pwdHash = localStorage.getItem('pega_admin_hash') || '';
  let successCount = 0;

  for (const id of selectedIds) {
    try {
      const item = adminItemsList.find(i => i.id === id);
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/delete_item_admin`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ item_uuid: id, pwd_input: pwdHash })
      });
      if (res.ok) {
        if (item) deleteStorageFilesForItem(item);
        successCount++;
      }
    } catch(e) {
      console.error('Batch delete single item error:', e);
    }
  }

  showNotification(`🎉 批次刪除完成！成功刪除 ${successCount} 筆貼文。`, 'success');
  await loadItems();
  await loadAdminItemsTable();
}

// 綁定全域以供呼叫
window.openAdminModal = openAdminModal;
window.closeAdminModal = closeAdminModal;
window.toggleAdminPasswordVisibility = toggleAdminPasswordVisibility;
window.checkAdminPassword = checkAdminPassword;
window.logoutAdmin = logoutAdmin;
window.loadItemsPerPageSetting = loadItemsPerPageSetting;
window.saveItemsPerPage = saveItemsPerPage;
window.loadSiteName = loadSiteName;
window.saveSiteName = saveSiteName;
window.refreshAnnouncementDisplay = refreshAnnouncementDisplay;
window.loadAnnouncement = loadAnnouncement;
window.saveAnnouncement = saveAnnouncement;
window.setDefaultAnnouncementTemplate = setDefaultAnnouncementTemplate;
window.fillDefaultAnnouncement = fillDefaultAnnouncement;
window.clearAnnouncement = clearAnnouncement;
window.closeAnnouncementBar = closeAnnouncementBar;
window.openArchiveModal = openArchiveModal;
window.closeArchiveModal = closeArchiveModal;
window.toggleSelectAllArchive = toggleSelectAllArchive;
window.updateArchiveBatchDeleteUI = updateArchiveBatchDeleteUI;
window.deleteSelectedArchiveLogs = deleteSelectedArchiveLogs;
window.deleteArchiveLog = deleteArchiveLog;
window.loadArchiveLogs = loadArchiveLogs;
window.renderArchive = renderArchive;
window.filterArchive = filterArchive;
window.exportArchiveToTxt = exportArchiveToTxt;

window.switchAdminTab = switchAdminTab;
window.loadAdminItemsTable = loadAdminItemsTable;
window.renderAdminItemsTable = renderAdminItemsTable;
window.filterAdminItems = filterAdminItems;
window.toggleSelectAllAdminItems = toggleSelectAllAdminItems;
window.updateAdminItemBatchUI = updateAdminItemBatchUI;
window.deleteSingleItemFromAdminTable = deleteSingleItemFromAdminTable;
window.batchDeleteSelectedAdminItems = batchDeleteSelectedAdminItems;
window.toggleAdminFullscreen = toggleAdminFullscreen;

window.loadAdminIssuesTable = loadAdminIssuesTable;
window.filterAdminIssues = filterAdminIssues;
window.renderAdminIssuesTable = renderAdminIssuesTable;
window.toggleSelectAllAdminIssues = toggleSelectAllAdminIssues;
window.updateAdminIssueBatchUI = updateAdminIssueBatchUI;
window.batchDeleteSelectedAdminIssues = batchDeleteSelectedAdminIssues;

