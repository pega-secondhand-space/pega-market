/**
 * PEGA 二手匿名交易空間 - 資料庫與 Supabase API 通訊模組 (js/api.js)
 */

/**
 * 刪除貼文關聯之 Storage 照片檔案
 * @param {Object} item 商品物件
 */
async function deleteStorageFilesForItem(item) {
  if (!item || !item.image_url) return;
  const urls = item.image_url.split('|||');
  for (const url of urls) {
    if (!url || !url.includes('/item-images/')) continue;
    const filename = url.split('/item-images/')[1];
    if (!filename) continue;
    try {
      await fetch(`${SUPABASE_URL}/storage/v1/object/item-images/${filename}`, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });
    } catch(e) {
      console.error('Failed to delete storage file:', filename, e);
    }
  }
}

/**
 * 載入置頂商品 ID 清單
 */
async function loadGlobalPinnedIds() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/messages?item_id=eq.${CONFIG_UUIDS.PINNED_ITEMS}&select=*`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        globalPinnedIds = JSON.parse(data[0].content || '[]');
      }
    }
  } catch(e) {
    console.error('Load pinned error:', e);
  }
}

/**
 * 版主切換商品置頂狀態
 * @param {string} id 商品 UUID
 */
async function togglePinItem(id) {
  if (!isAdmin) return showNotification('⚠️ 只有版主可以置頂商品', 'warning');
  let pinned = [...globalPinnedIds];
  
  if (pinned.includes(id)) {
    pinned = pinned.filter(pId => pId !== id);
    showNotification('📌 已取消該刊登項目的置頂狀態！', 'info');
  } else {
    pinned.push(id);
    showNotification('📌 已成功將該刊登項目標記為【官方置頂】！', 'success');
  }
  globalPinnedIds = pinned;
  renderItems();

  try {
    const pwdHash = localStorage.getItem('pega_admin_hash') || '';
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/toggle_pin_item_admin`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned_ids_json: JSON.stringify(pinned), pwd_input: pwdHash })
    });
    if (!res.ok) {
      const errMsg = await res.text();
      console.error('Save pinned API error:', res.status, errMsg);
      showNotification(`⚠️ 儲存置頂失敗：${errMsg || '版主密碼失效'}`, 'warning');
    }
  } catch(e) {
    console.error('Save pinned error:', e);
  }
}

/**
 * 載入全站所有商品清單
 * @param {string} [itemIdToOpen] 載入後自動聚焦並展開的商品 ID
 */
async function loadItems(itemIdToOpen) {
  await loadItemsPerPageSetting();
  await loadGlobalPinnedIds();
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
      allItems = await res.json();
      filterItems();
      refreshAnnouncementDisplay();

      if (itemIdToOpen) {
        const searchVal = (document.getElementById('search-input')?.value || '').toLowerCase().trim();
        const filtered = allItems.filter(item => {
          if (item.device_id === 'SYSTEM' || (item.title && item.title.startsWith('SYSTEM_')) || (item.id && item.id.startsWith('00000000-0000-0000-0000-'))) return false;
          if (currentFilter !== 'all' && item.type !== currentFilter) return false;
          if (searchVal) {
            const matchTitle = (item.title || '').toLowerCase().includes(searchVal);
            const matchDesc = (item.description || '').toLowerCase().includes(searchVal);
            const matchContact = (item.contact_info || item.contact || '').toLowerCase().includes(searchVal);
            return matchTitle || matchDesc || matchContact;
          }
          return true;
        });

        const index = filtered.findIndex(item => item.id === itemIdToOpen);
        if (index !== -1) {
          const itemPage = Math.floor(index / itemsPerPage) + 1;
          currentPage = itemPage;
          renderItems();

          openDetailModal(itemIdToOpen);

          setTimeout(() => {
            const cardImg = document.getElementById(`card-img-${itemIdToOpen}`);
            if (cardImg) {
              const cardElement = cardImg.closest('.group') || cardImg.closest('[onclick*="openDetailModal"]');
              if (cardElement) {
                cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                cardElement.classList.add('ring-4', 'ring-indigo-500', 'ring-offset-2', 'ring-offset-gray-950');
                setTimeout(() => {
                  cardElement.classList.remove('ring-4', 'ring-indigo-500', 'ring-offset-2', 'ring-offset-gray-950');
                }, 3000);
              }
            }
          }, 150);
        }
      }
    }
  } catch(e) {
    console.error('Load items error:', e);
  }
}

/**
 * 靜默清理已逾期商品
 */
async function deleteItemSilently(itemId) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/items?id=eq.${itemId}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
  } catch(e) {
    console.error('Silent delete error:', e);
  }
}

/**
 * 同仁/版主切換「已售出」狀態
 * @param {string} itemId 商品 UUID
 */
async function toggleItemSoldState(itemId) {
  const item = allItems.find(i => i.id === itemId);
  if (!item) return;

  const myItems = JSON.parse(localStorage.getItem('my_created_item_ids') || '[]');
  const isOwner = (item.device_id === myDeviceId) || myItems.includes(item.id);
  const hasPermission = isOwner || isAdmin;

  if (!hasPermission) {
    return showNotification('⚠️ 只有該貼文的發布同仁或版主可以標記「已售出」喔！', 'warning');
  }

  const isSold = isItemSold(item);

  if (isSold) {
    if (!confirm('您確定要取消「已售出」標記，將商品重新上架嗎？')) {
      return;
    }
  } else {
    if (!confirm('您確定要將此商品標記為【已售出】嗎？\n\n（標記後，系統將於 2 天後安全自動下架，避免打擾喔！）')) {
      return;
    }
  }

  let newDesc = item.description || '';

  if (isSold) {
    newDesc = newDesc.replace(/\[SOLD_AT:.*?\]/g, '').trim();
    showNotification('🔄 已取消「已售出」標記，物品重新上架！', 'info');
  } else {
    const soldTimeStr = new Date().toISOString();
    newDesc = `${newDesc}\n[SOLD_AT:${soldTimeStr}]`;
    showNotification('✅ 成功標記為「已售出」，將於 2 天後自動下架！', 'success');
  }

  item.description = newDesc;
  renderItems();

  try {
    let res;
    if (isOwner) {
      res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/toggle_item_sold_own`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_uuid: itemId, dev_id: myDeviceId, new_desc: newDesc })
      });
    } else {
      const pwdHash = localStorage.getItem('pega_admin_hash') || '';
      res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/toggle_item_sold_admin`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_uuid: itemId, new_desc: newDesc, pwd_input: pwdHash })
      });
    }
    if (!res.ok) {
      console.error('Update description db error');
    }
  } catch(e) {
    console.error('Update description error:', e);
  }
}

/**
 * 同仁下架/自刪貼文 (驗證 4 位數密碼或裝置憑證)
 */
async function deleteMyItem(itemId) {
  const item = allItems.find(i => i.id === itemId);
  if (!item) return;

  const isSold = isItemSold(item);

  const myItems = JSON.parse(localStorage.getItem('my_created_item_ids') || '[]');
  const myPasswords = JSON.parse(localStorage.getItem('pega_my_post_passwords') || '{}');
  const cachedPwd = myPasswords[itemId] || "";
  const isOwner = (item.device_id === myDeviceId) || myItems.includes(itemId) || (cachedPwd !== "");

  let finalPwd = cachedPwd;

  if (!isOwner && !isAdmin) {
    const userPwd = prompt('本裝置無此貼文的下架憑證。\n請輸入該貼文的 4 位數密碼（或版主管理密碼）：');
    if (!userPwd) return;
    finalPwd = userPwd.trim();
  }

  if (!isSold) {
    const becauseSold = confirm('這件商品是因為「已售出 / 已送出」而要下架的嗎？\n\n【確定】是，已成交（將會自動記入歷史成交紀錄後下架）\n【取消】否，只是想直接刪除/取消貼文');
    if (becauseSold) {
      const soldTimeStr = new Date().toISOString();
      const newDesc = `${item.description || ''}\n[SOLD_AT:${soldTimeStr}]`;
      
      const resSold = await fetch(`${SUPABASE_URL}/rest/v1/rpc/toggle_item_sold_secured`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_uuid: itemId,
          dev_id: myDeviceId,
          new_desc: newDesc,
          pwd_input: finalPwd
        })
      });
      
      if (!resSold.ok) {
        const err = await resSold.json();
        showNotification('⚠️ 標記售出失敗：' + (err.message || '權限不足'), 'warning');
        return;
      }
    } else {
      if (!confirm('您確定要直接刪除此貼文嗎？（此操作無法恢復，且不會計入歷史成交紀錄）')) {
        return;
      }
    }
  } else {
    if (!confirm('此貼文已標記為售出，您確定要立即將其下架刪除嗎？')) {
      return;
    }
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/delete_item_secured`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        item_uuid: itemId,
        dev_id: myDeviceId,
        pwd_input: finalPwd
      })
    });

    if (res.ok) {
      const success = await res.json();
      if (success) {
        let myItems = JSON.parse(localStorage.getItem('my_created_item_ids') || '[]');
        myItems = myItems.filter(id => id !== itemId);
        localStorage.setItem('my_created_item_ids', JSON.stringify(myItems));

        const myPasswords = JSON.parse(localStorage.getItem('pega_my_post_passwords') || '{}');
        delete myPasswords[itemId];
        localStorage.setItem('pega_my_post_passwords', JSON.stringify(myPasswords));

        deleteStorageFilesForItem(item);
        showNotification('🗑️ 您的貼文已成功下架！', 'success');
        closeDetailModal();
        loadItems();
      } else {
        showNotification('⚠️ 下架失敗：憑證或密碼不正確，您無權下架。', 'warning');
      }
    } else {
      showNotification('⚠️ 下架失敗，請稍後再試', 'warning');
    }
  } catch(e) {
    console.error('Delete my item error:', e);
    showNotification('⚠️ 下架發生錯誤：' + e.message, 'warning');
  }
}

/**
 * 版主強制刪除貼文
 */
async function deleteItemAdmin(id) {
  const item = allItems.find(i => i.id === id);
  if (!item) return;

  const isSold = isItemSold(item);
  const pwdHash = localStorage.getItem('pega_admin_hash') || '';

  if (!isSold) {
    const becauseSold = confirm('版主下架確認：這件商品是因為「已售出 / 已送出」而要下架的嗎？\n\n【確定】是，已成交（將會自動記入歷史成交紀錄後下架）\n【取消】否，強制刪除貼文（不計入歷史成交紀錄）');
    if (becauseSold) {
      const soldTimeStr = new Date().toISOString();
      const newDesc = `${item.description || ''}\n[SOLD_AT:${soldTimeStr}]`;
      await fetch(`${SUPABASE_URL}/rest/v1/rpc/toggle_item_sold_admin`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_uuid: id, new_desc: newDesc, pwd_input: pwdHash })
      });
    } else {
      if (!confirm('您確定要直接「強制刪除」此貼文嗎？（此操作無法恢復，且不會計入歷史成交紀錄）')) {
        return;
      }
    }
  } else {
    if (!confirm('此貼文已標記為售出，您確定要立即將其刪除下架嗎？')) {
      return;
    }
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/delete_item_admin`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_uuid: id, pwd_input: pwdHash })
    });
    if (res.ok) {
      deleteStorageFilesForItem(item);
      showNotification('🗑️ 已成功刪除該刊登項目', 'success');
      loadItems();
    } else {
      showNotification('⚠️ 刪除失敗：管理員密碼驗證未通過', 'warning');
    }
  } catch(e) {
    console.error('Delete item error:', e);
  }
}

/**
 * 即時線上心跳回報
 */
async function sendPresenceHeartbeat() {
  if (!myDeviceId) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/messages?item_id=eq.${CONFIG_UUIDS.PRESENCE}&sender_id=eq.${myDeviceId}`, {
      method: 'DELETE',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });

    await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        item_id: CONFIG_UUIDS.PRESENCE,
        sender_id: myDeviceId,
        sender_name: myNickname || '訪客',
        content: 'HEARTBEAT'
      })
    });
  } catch(e) {
    console.error('Heartbeat ping error:', e);
  }
  fetchOnlineUsers();
}

/**
 * 取得當前在線活躍人數
 */
async function fetchOnlineUsers() {
  try {
    const thirtySecsAgo = new Date(Date.now() - 35 * 1000).toISOString();
    const res = await fetch(`${SUPABASE_URL}/rest/v1/messages?item_id=eq.${CONFIG_UUIDS.PRESENCE}&created_at=gte.${thirtySecsAgo}&select=sender_id`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });

    if (res.ok) {
      const records = await res.json();
      if (records && Array.isArray(records)) {
        const uniqueSenders = new Set(records.map(r => r.sender_id).filter(Boolean));
        const count = Math.max(1, uniqueSenders.size);

        const headerDisplay = document.getElementById('online-count-display');
        if (headerDisplay) headerDisplay.innerText = `此刻線上: ${count} 人`;

        const adminCurrent = document.getElementById('admin-online-current');
        if (adminCurrent) adminCurrent.innerText = `${count} 人`;

        let peak = parseInt(localStorage.getItem('pega_peak_online') || '1', 10);
        if (count > peak) {
          peak = count;
          localStorage.setItem('pega_peak_online', peak.toString());
        }
        const adminPeak = document.getElementById('admin-online-peak');
        if (adminPeak) adminPeak.innerText = `${peak} 人`;

        const adminTime = document.getElementById('admin-presence-refresh-time');
        if (adminTime) adminTime.innerText = `最後更新：${new Date().toLocaleTimeString('zh-TW', { hour12: false })}`;
      }
    }
  } catch(e) {
    console.error('Fetch online users error:', e);
  }
}

/**
 * 開啟在線人數儀表板 Modal
 */
function openOnlineUsersModal() {
  if (typeof closeAllModals === 'function') closeAllModals();
  const modal = document.getElementById('online-users-modal');
  if (modal) modal.classList.remove('hidden');
  fetchOnlineUsers();
}

/**
 * 關閉在線人數儀表板 Modal
 */
function closeOnlineUsersModal() {
  const modal = document.getElementById('online-users-modal');
  if (modal) modal.classList.add('hidden');
}

// 綁定全域以供呼叫
window.deleteStorageFilesForItem = deleteStorageFilesForItem;
window.loadGlobalPinnedIds = loadGlobalPinnedIds;
window.togglePinItem = togglePinItem;
window.loadItems = loadItems;
window.deleteItemSilently = deleteItemSilently;
window.toggleItemSoldState = toggleItemSoldState;
window.deleteMyItem = deleteMyItem;
window.deleteItemAdmin = deleteItemAdmin;
window.sendPresenceHeartbeat = sendPresenceHeartbeat;
window.fetchOnlineUsers = fetchOnlineUsers;
window.openOnlineUsersModal = openOnlineUsersModal;
window.closeOnlineUsersModal = closeOnlineUsersModal;

