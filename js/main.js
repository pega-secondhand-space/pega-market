/**
 * PEGA 二手匿名交易空間 - 主應用程式入口與全域啟動 (js/main.js)
 */

/**
 * 全域錯誤捕獲提示
 */
window.onerror = function(msg, url, lineNo, columnNo, error) {
  const errBox = document.getElementById('debug-error-box');
  if (errBox) {
    errBox.classList.remove('hidden');
    errBox.innerHTML = `<strong>⚠️ 系統載入提示：</strong> ${escapeHtml(msg)} (Line: ${lineNo})`;
  }
  return false;
};

/**
 * 更新頂部使用者身份代號顯示
 */
function updateIdentityDisplay() {
  const display = document.getElementById('user-identity-display');
  if (display) {
    display.innerHTML = `<i class="fa-solid fa-user-secret text-indigo-400"></i> 您的代號：<strong class="text-indigo-300 font-bold">${escapeHtml(myNickname)}</strong>`;
  }
}

/**
 * 手動一鍵重新整理頁面數據
 */
function refreshPageData() {
  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.value = '';
  setFilter('all');
  loadItems();
  loadAnnouncement();
  showNotification('🔄 已重新整理資料與貼文！', 'info');
}

/**
 * 視窗關閉前發送離線信號
 */
window.addEventListener('beforeunload', () => {
  if (myDeviceId) {
    navigator.sendBeacon(
      `${SUPABASE_URL}/rest/v1/messages?item_id=eq.${CONFIG_UUIDS.PRESENCE}&sender_id=eq.${myDeviceId}`,
      null
    );
  }
});

/**
 * 頁面載入與初始化
 */
document.addEventListener('DOMContentLoaded', () => {
  // 1. 初始化字體大小
  initFontSize();

  // 2. 初始化身分代號
  updateIdentityDisplay();

  // 3. 載入全站設定 (站名、公告)
  loadSiteName();
  loadAnnouncement();

  // 4. 初始化排版佈局 (手機端統一鎖定 Threads 單排資訊流)
  updateGridLayoutOptions();
  window.addEventListener('resize', updateGridLayoutOptions);

  // 5. 載入商品列表、啟動手機端無限滾動與詳情/燈箱滑動手勢
  loadItems();
  if (typeof setupMobileInfiniteScroll === 'function') {
    setupMobileInfiniteScroll();
  }
  if (typeof initDetailModalGestures === 'function') {
    initDetailModalGestures();
  }
  if (typeof initLightboxGestures === 'function') {
    initLightboxGestures();
  }

  // 6. 啟動在線心跳計時器
  sendPresenceHeartbeat();
  setInterval(sendPresenceHeartbeat, 15000); // 每 15 秒同步心跳
  setInterval(fetchOnlineUsers, 10000);       // 每 10 秒刷新人數

  // 7. 若已登入版主，更新按鈕文字
  if (isAdmin) {
    const btnText = document.getElementById('admin-btn-text');
    if (btnText) btnText.innerText = '管理面板 (已登入)';
  }

  // 8. 💻 PC 專屬極致體驗：按 Escape 鍵自動關閉所有開啟的彈窗
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const lightbox = document.getElementById('lightbox-modal');
      if (lightbox && !lightbox.classList.contains('hidden')) {
        if (typeof closeLightboxModal === 'function') closeLightboxModal();
        return;
      }
      const searchOverlay = document.getElementById('sticky-search-overlay');
      if (searchOverlay && !searchOverlay.classList.contains('hidden')) {
        if (typeof closeSearchOverlay === 'function') closeSearchOverlay();
        return;
      }
      if (typeof closeAllModals === 'function') closeAllModals();
    }
  });

  // 9. 📱/💻 點擊任何彈窗的半透明暗色遮罩背景，自動關閉該彈窗
  const backdropModalIds = [
    'detail-modal',
    'create-modal',
    'issue-modal',
    'archive-modal',
    'admin-modal',
    'online-users-modal',
    'guide-modal'
  ];
  backdropModalIds.forEach(id => {
    const modalEl = document.getElementById(id);
    if (modalEl) {
      modalEl.addEventListener('click', (e) => {
        if (e.target === modalEl) {
          modalEl.classList.add('hidden');
        }
      });
    }
  });
});

// 綁定全域
window.updateIdentityDisplay = updateIdentityDisplay;
window.refreshPageData = refreshPageData;
