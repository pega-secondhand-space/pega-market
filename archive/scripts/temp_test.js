
    const SUPABASE_URL = 'https://llnnbanqtmnccfvtwooo.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_zLB9PBofh-rrS-mFr1CIWg_K8wUiSVk';
    const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    let adminPassword = localStorage.getItem('pega_admin_pwd') || 'admin123';
    let isAdmin = localStorage.getItem('pega_is_admin') === 'true'; 

    let deviceId = localStorage.getItem('user_device_id');
    let nickname = localStorage.getItem('user_nickname');
    if (!deviceId) {
      deviceId = 'usr_' + Math.random().toString(36).substr(2, 9);
      nickname = 'PEGA同仁#' + Math.floor(1000 + Math.random() * 9000);
      localStorage.setItem('user_device_id', deviceId);
      localStorage.setItem('user_nickname', nickname);
    }
    document.getElementById('user-display').innerText = '你的代號：' + nickname;

    if (isAdmin) {
      document.getElementById('admin-btn-text').innerText = '後台管理 (已登入)';
    }

    const savedBg = localStorage.getItem('pega_bg_url');
    if (savedBg) {
      document.getElementById('main-body').style.backgroundImage = `url('${savedBg}')`;
      document.getElementById('bg-url-input').value = savedBg;
    }

    // 🎯 讀取使用者偏好欄數 (手機預設 2 欄，PC 預設 4 欄)
    const isMobile = window.innerWidth < 640;
    let savedCols = localStorage.getItem('pega_grid_cols');
    if (!savedCols) {
      savedCols = isMobile ? '2' : '4';
    }
    
    // 初始化選單狀態與 Grid 寬度限制
    document.getElementById('grid-layout-select').value = savedCols;
    applyGridLayout(savedCols);

    function changeGridLayout(cols) {
      localStorage.setItem('pega_grid_cols', cols);
      applyGridLayout(cols);
    }

    function applyGridLayout(cols) {
      const container = document.getElementById('grid-container');
      const grid = document.getElementById('item-grid');
      
      // 清除原本的動態寬度與 grid-cols 類別
      container.className = container.className.replace(/max-w-[^\s]+/g, '').trim();
      grid.className = grid.className.replace(/grid-cols-\d+/g, '').trim();

      // 針對不同的欄位設定「完美的容器最大寬度限制」，確保卡片維持固定的精緻尺寸 (單張寬度約 260px~280px)
      const maxWMap = {
        '1': 'max-w-xs',       // ~320px
        '2': 'max-w-xl',       // ~576px
        '3': 'max-w-3xl',      // ~768px
        '4': 'max-w-5xl',      // ~1024px
        '5': 'max-w-7xl'       // ~1280px
      };

      const containerWidth = maxWMap[cols] || 'max-w-5xl';
      container.classList.add(containerWidth);
      grid.classList.add(`grid-cols-${cols}`);
    }

    let allItems = [];
    let currentFilter = 'all';
    let currentItemId = null;
    let chatSubscription = null;

    function switchAdminTab(tabName) {
      const itemsTab = document.getElementById('admin-tab-items');
      const settingsTab = document.getElementById('admin-tab-settings');
      const itemsBtn = document.getElementById('admin-tab-btn-items');
      const settingsBtn = document.getElementById('admin-tab-btn-settings');

      if (tabName === 'items') {
        itemsTab.classList.remove('hidden');
        settingsTab.classList.add('hidden');
        itemsBtn.className = 'px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-bold transition flex items-center gap-1';
        settingsBtn.className = 'px-3 py-1.5 rounded-xl bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700 font-bold transition flex items-center gap-1';
        renderAdminItemList();
      } else {
        itemsTab.classList.add('hidden');
        settingsTab.classList.remove('hidden');
        settingsBtn.className = 'px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-bold transition flex items-center gap-1';
        itemsBtn.className = 'px-3 py-1.5 rounded-xl bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700 font-bold transition flex items-center gap-1';
      }
    }

    function getPinnedItems() {
      try {
        return JSON.parse(localStorage.getItem('pega_pinned_items') || '[]');
      } catch (e) {
        return [];
      }
    }

    function togglePinItem(id) {
      let pinned = getPinnedItems();
      if (pinned.includes(id)) {
        pinned = pinned.filter(pId => pId !== id);
        alert('📍 已取消該刊登項目的置頂狀態！');
      } else {
        pinned.push(id);
        alert('📌 已成功將該刊登項目標記為【官方置頂】！');
      }
      localStorage.setItem('pega_pinned_items', JSON.stringify(pinned));
      renderItems();
      renderAdminItemList();
      updateStats();
    }

    function renderAdminItemList() {
      const listContainer = document.getElementById('admin-item-list');
      if (!listContainer) return;

      const searchKey = (document.getElementById('admin-item-search')?.value || '').toLowerCase();
      const pinnedIds = getPinnedItems();

      const filtered = allItems.filter(item => {
        return (item.title && item.title.toLowerCase().includes(searchKey)) ||
               (item.description && item.description.toLowerCase().includes(searchKey)) ||
               (item.nickname && item.nickname.toLowerCase().includes(searchKey));
      });

      if (filtered.length === 0) {
        listContainer.innerHTML = '<p class="text-gray-500 text-center py-8 text-xs">查無符合作業條件的刊登項目</p>';
        return;
      }

      listContainer.innerHTML = filtered.map(item => {
        const isPinned = pinnedIds.includes(item.id);
        const itemType = item.type || 'sell';
        let typeBadge = '<span class="bg-indigo-900/90 text-indigo-300 px-1.5 py-0.5 rounded text-[10px] font-bold">想賣</span>';
        if (itemType === 'buy') typeBadge = '<span class="bg-amber-900/90 text-amber-300 px-1.5 py-0.5 rounded text-[10px] font-bold">想買</span>';
        if (itemType === 'free') typeBadge = '<span class="bg-emerald-900/90 text-emerald-300 px-1.5 py-0.5 rounded text-[10px] font-bold">免費送</span>';

        return `
          <div class="bg-gray-900/90 border ${isPinned ? 'border-amber-500/80 ring-1 ring-amber-500/40' : 'border-gray-700/80'} p-2.5 rounded-xl flex items-center justify-between gap-2 hover:border-gray-600 transition">
            <div class="flex items-center gap-2.5 min-w-0 flex-1">
              <div class="w-10 h-10 bg-gray-800 rounded-lg overflow-hidden shrink-0 flex items-center justify-center border border-gray-700">
                ${item.image_url ? `<img src="${item.image_url}" class="w-full h-full object-cover">` : `<i class="fa-solid fa-box text-gray-600 text-sm"></i>`}
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5">
                  ${typeBadge}
                  ${isPinned ? '<span class="bg-amber-500 text-gray-950 font-bold px-1.5 py-0.5 rounded text-[9px]">📌 已置頂</span>' : ''}
                  <h4 class="font-bold text-gray-200 text-xs truncate">${item.title}</h4>
                </div>
                <p class="text-[10px] text-gray-400 truncate mt-0.5">
                  發布者: <span class="text-gray-300">${item.nickname}</span> (${item.device_id ? item.device_id.slice(0, 8) : 'unknown'}...) · $${item.price || '0'} · ${timeAgo(item.created_at)}
                </p>
              </div>
            </div>

            <div class="flex items-center gap-1 shrink-0">
              <button onclick="togglePinItem('${item.id}')" class="px-2 py-1 ${isPinned ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-gray-800 hover:bg-gray-700 text-amber-400 border border-amber-500/40'} rounded-lg font-bold text-[10px] transition">
                ${isPinned ? '📍 取消置頂' : '📌 置頂'}
              </button>
              <button onclick="deleteItem('${item.id}', '${item.title}')" class="px-2 py-1 bg-red-600/80 hover:bg-red-600 text-white rounded-lg font-bold text-[10px] transition">
                🗑️ 下架
              </button>
            </div>
          </div>
        `;
      }).join('');
    }

    function exportItemsCSV() {
      if (allItems.length === 0) {
        return alert('目前沒有任何刊登資料可供匯出！');
      }

      const pinnedIds = getPinnedItems();
      const headers = ['ID', '標題', '類型', '價格/預算', '詳細說明', '聯絡方式', '發布者暱稱', '設備識別碼 (Device ID)', '發布時間', '是否置頂'];

      const rows = allItems.map(item => {
        const typeLabel = item.type === 'buy' ? '想買' : (item.type === 'free' ? '免費送' : '想賣');
        const isPinned = pinnedIds.includes(item.id) ? '是' : '否';
        return [
          `"${(item.id || '').replace(/"/g, '""')}"`,
          `"${(item.title || '').replace(/"/g, '""')}"`,
          `"${typeLabel}"`,
          `"${(item.price || '').replace(/"/g, '""')}"`,
          `"${(item.description || '').replace(/"/g, '""')}"`,
          `"${(item.contact_info || '').replace(/"/g, '""')}"`,
          `"${(item.nickname || '').replace(/"/g, '""')}"`,
          `"${(item.device_id || '').replace(/"/g, '""')}"`,
          `"${item.created_at ? new Date(item.created_at).toLocaleString('zh-TW') : ''}"`,
          `"${isPinned}"`
        ].join(',');
      });

      const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      const today = new Date().toISOString().slice(0, 10);
      link.setAttribute('href', url);
      link.setAttribute('download', `PEGA_二手交易_刊登紀錄備份_${today}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    function openAdminModal() {
      document.getElementById('admin-modal').classList.remove('hidden');
      if (isAdmin) {
        document.getElementById('admin-login-box').classList.add('hidden');
        document.getElementById('admin-panel').classList.remove('hidden');
        document.getElementById('banned-words-input').value = localStorage.getItem('pega_banned_words') || '';
        updateStats();
        renderAdminItemList();
      }
    }
    function closeAdminModal() { document.getElementById('admin-modal').classList.add('hidden'); }

    function checkAdminPassword() {
      const pwd = document.getElementById('admin-password').value;
      if (pwd === adminPassword) {
        isAdmin = true;
        localStorage.setItem('pega_is_admin', 'true');
        document.getElementById('admin-btn-text').innerText = '後台管理 (已登入)';
        document.getElementById('admin-login-box').classList.add('hidden');
        document.getElementById('admin-panel').classList.remove('hidden');
        document.getElementById('banned-words-input').value = localStorage.getItem('pega_banned_words') || '';
        updateStats();
        renderAdminItemList();
        renderItems();
      } else {
        alert('密碼錯誤！');
      }
    }

    function logoutAdmin() {
      isAdmin = false;
      localStorage.removeItem('pega_is_admin');
      document.getElementById('admin-btn-text').innerText = '後台管理';
      document.getElementById('admin-login-box').classList.remove('hidden');
      document.getElementById('admin-panel').classList.add('hidden');
      document.getElementById('admin-password').value = '';
      renderItems();
    }

    function changeAdminPassword() {
      const newPwd = document.getElementById('new-admin-pwd').value.trim();
      if (!newPwd) return alert('請輸入新密碼！');
      adminPassword = newPwd;
      localStorage.setItem('pega_admin_pwd', newPwd);
      alert('🔑 後台密碼已修改成功！下次登入請使用新密碼。');
      document.getElementById('new-admin-pwd').value = '';
    }

    function changeBgImage() {
      const url = document.getElementById('bg-url-input').value.trim();
      if (url) {
        localStorage.setItem('pega_bg_url', url);
        document.getElementById('main-body').style.backgroundImage = `url('${url}')`;
      } else {
        localStorage.removeItem('pega_bg_url');
        document.getElementById('main-body').style.backgroundImage = 'none';
      }
      alert('🖼️ 桌面背景圖更換成功！');
    }

    function saveBannedWords() {
      const words = document.getElementById('banned-words-input').value.trim();
      localStorage.setItem('pega_banned_words', words);
      alert('🚫 禁詞庫設定成功！');
    }

    function updateStats() {
      document.getElementById('stat-total').innerText = allItems.length;
      document.getElementById('stat-buy').innerText = allItems.filter(i => i.type === 'buy').length;
      document.getElementById('stat-free').innerText = allItems.filter(i => i.type === 'free').length;
      const pinnedCount = getPinnedItems().length;
      const statPinnedElem = document.getElementById('stat-pinned');
      if (statPinnedElem) statPinnedElem.innerText = pinnedCount;
    }

    async function updateAnnouncement() {
      const content = document.getElementById('admin-announcement-input').value.trim();
      if (!content) return alert('請輸入內容！');

      const { error } = await db.from('announcements').insert([{ content: content, is_active: true }]);
      if (error) {
        alert('更新失敗：' + error.message);
      } else {
        alert('🎉 告示板更新成功！');
        document.getElementById('admin-announcement-input').value = '';
        loadAnnouncement();
        closeAdminModal();
      }
    }

    async function deleteItem(id, title) {
      if (!confirm(`確定要下架刪除「${title}」嗎？此操作無法復原！`)) return;

      const { error } = await db.from('items').delete().eq('id', id);
      if (error) {
        alert('刪除失敗：' + error.message);
      } else {
        alert('🗑️ 已成功刪除該刊登項目！');
        loadItems();
      }
    }

    function openEditModal(id) {
      const item = allItems.find(i => i.id === id);
      if (!item) return;

      document.getElementById('editing-item-id').value = item.id;
      document.getElementById('post-modal-title').innerText = '編輯刊登內容';
      document.getElementById('type').value = item.type || 'sell';
      document.getElementById('title').value = item.title;
      document.getElementById('price').value = item.price;
      document.getElementById('description').value = item.description || '';
      document.getElementById('contact').value = item.contact_info || '';
      document.getElementById('submit-btn').innerText = '儲存修改';

      togglePriceInput();
      openPostModal();
    }

    async function loadAnnouncement() {
      const { data } = await db.from('announcements').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(1);
      if (data && data.length > 0) {
        document.getElementById('announcement-text').innerText = data[0].content;
        document.getElementById('announcement-bar').classList.remove('hidden');
      }
    }

    function previewImageDimension(input) {
      const badge = document.getElementById('img-dimension-badge');
      if (input.files && input.files[0]) {
        const file = input.files[0];
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
          badge.innerText = `尺寸: ${img.width} × ${img.height} px`;
          badge.classList.remove('hidden');
        };
      } else {
        badge.classList.add('hidden');
      }
    }

    async function loadItems() {
      const { data, error } = await db.from('items').select('*').order('created_at', { ascending: false });
      if (error) {
        document.getElementById('item-grid').innerHTML = '<p class="col-span-full text-red-400 text-center py-8">載入失敗，請稍後重試。</p>';
        return;
      }
      allItems = data || [];
      if (isAdmin) {
        updateStats();
        renderAdminItemList();
      }
      renderItems();
    }

    function timeAgo(dateString) {
      const date = new Date(dateString);
      const now = new Date();
      const seconds = Math.floor((now - date) / 1000);
      if (seconds < 60) return '剛剛';
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes}分鐘前`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}小時前`;
      return `${Math.floor(hours / 24)}天前`;
    }

    function renderItems() {
      const searchKey = document.getElementById('search-input').value.toLowerCase();
      const grid = document.getElementById('item-grid');
      const pinnedIds = getPinnedItems();

      const filtered = allItems.filter(item => {
        const itemType = item.type || 'sell';
        const matchesFilter = currentFilter === 'all' || itemType === currentFilter;
        const matchesSearch = item.title.toLowerCase().includes(searchKey) || (item.description && item.description.toLowerCase().includes(searchKey));
        return matchesFilter && matchesSearch;
      });

      // 排序：將【官方置頂】之項目排在最前面
      filtered.sort((a, b) => {
        const aPinned = pinnedIds.includes(a.id) ? 1 : 0;
        const bPinned = pinnedIds.includes(b.id) ? 1 : 0;
        if (aPinned !== bPinned) return bPinned - aPinned;
        return new Date(b.created_at) - new Date(a.created_at);
      });

      if (filtered.length === 0) {
        grid.innerHTML = '<p class="col-span-full text-gray-500 text-center py-12 text-sm">目前沒有相關刊登內容</p>';
        return;
      }

      grid.innerHTML = filtered.map(item => {
        const itemType = item.type || 'sell';
        const isOwner = item.device_id === deviceId;
        const isPinned = pinnedIds.includes(item.id);

        let badgeClass = 'bg-indigo-600/90 text-white';
        let badgeText = '想賣';
        let priceText = '$' + item.price;

        if (itemType === 'buy') {
          badgeClass = 'bg-amber-600/90 text-white';
          badgeText = '求購中';
          priceText = item.price ? '預算 $' + item.price : '面議/求贈';
        } else if (itemType === 'free') {
          badgeClass = 'bg-emerald-600/90 text-white';
          badgeText = '免費送';
          priceText = '免費';
        }

        return `
          <div class="w-full max-w-[320px] mx-auto bg-gray-800/90 backdrop-blur-md rounded-2xl border ${isPinned ? 'border-amber-500/80 ring-2 ring-amber-500/40 shadow-amber-500/10' : (isOwner ? 'border-indigo-500/60 ring-1 ring-indigo-500/30' : 'border-gray-700/80')} overflow-hidden flex flex-col justify-between shadow-md hover:border-gray-600 transition group relative">
            
            ${isPinned ? `
              <span class="absolute top-2 left-2 bg-gradient-to-r from-amber-500 to-amber-600 text-gray-950 font-black text-[10px] px-2 py-0.5 rounded-full shadow-lg z-10 flex items-center gap-1">
                <i class="fa-solid fa-thumbtack"></i> 官方置頂
              </span>
            ` : `
              <span class="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeClass} shadow">
                ${badgeText}
              </span>
            `}

            ${isOwner ? `<span class="absolute top-2 right-2 bg-indigo-900/90 text-indigo-200 text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-indigo-500/30 z-10">我的貼文</span>` : ''}

            <div onclick="openImageModal('${item.id}')" class="cursor-pointer">
              <div class="relative w-full h-32 sm:h-36 bg-gray-900 flex items-center justify-center overflow-hidden">
                ${item.image_url 
                  ? `<img src="${item.image_url}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">` 
                  : `<i class="fa-solid ${itemType === 'buy' ? 'fa-magnifying-glass' : 'fa-box-open'} text-3xl text-gray-700"></i>`
                }
                <span class="absolute bottom-2 right-2 text-[9px] bg-black/60 text-gray-300 px-1.5 py-0.5 rounded-md backdrop-blur-sm">
                  ${timeAgo(item.created_at)}
                </span>
              </div>
              <div class="p-2.5 sm:p-3">
                <h3 class="font-bold text-xs sm:text-sm text-gray-100 line-clamp-1">${item.title}</h3>
                <p class="text-[11px] text-gray-400 mt-1 line-clamp-1">${item.description || '無詳細說明'}</p>
                <p class="text-xs sm:text-sm font-black text-indigo-400 mt-2">${priceText}</p>
              </div>
            </div>

            <div class="p-2.5 sm:p-3 pt-0 space-y-1.5">
              <button onclick="openChat('${item.id}', '${item.title}')" class="w-full bg-gray-700/60 hover:bg-gray-700 text-indigo-300 text-xs py-1.5 rounded-xl font-bold border border-gray-600/50 transition">
                私訊聯繫
              </button>

              ${(isOwner || isAdmin) ? `
                <div class="flex gap-1">
                  ${isOwner ? `
                    <button onclick="openEditModal('${item.id}')" class="flex-1 bg-amber-600/80 hover:bg-amber-600 text-white text-[10px] sm:text-[11px] py-1 rounded-lg font-bold transition">
                      ✏️ 編輯
                    </button>
                  ` : ''}
                  ${isAdmin ? `
                    <button onclick="togglePinItem('${item.id}')" class="flex-1 ${isPinned ? 'bg-amber-600 hover:bg-amber-500' : 'bg-gray-700 hover:bg-gray-600 text-amber-300'} text-white text-[10px] sm:text-[11px] py-1 rounded-lg font-bold transition">
                      ${isPinned ? '📍 取消置頂' : '📌 置頂'}
                    </button>
                  ` : ''}
                  <button onclick="deleteItem('${item.id}', '${item.title}')" class="${(isOwner && !isAdmin) ? 'flex-1' : 'flex-1'} bg-red-600/80 hover:bg-red-600 text-white text-[10px] sm:text-[11px] py-1 rounded-lg font-bold transition">
                    🗑️ 刪除
                  </button>
                </div>
              ` : ''}
            </div>

          </div>
        `;
      }).join('');
    }

    function openImageModal(id) {
      const item = allItems.find(i => i.id === id);
      if (!item) return;

      const itemType = item.type || 'sell';
      const imgBox = document.getElementById('modal-img-box');
      if (item.image_url) {
        imgBox.innerHTML = `<img src="${item.image_url}" class="w-full h-full object-contain max-h-[350px]">`;
      } else {
        imgBox.innerHTML = `<div class="p-8 text-center text-gray-600"><i class="fa-solid ${itemType === 'buy' ? 'fa-magnifying-glass' : 'fa-image'} text-5xl mb-2"></i><p class="text-xs">刊登者未上傳圖片</p></div>`;
      }

      const badge = document.getElementById('modal-badge');
      if (itemType === 'buy') {
        badge.className = 'text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30';
        badge.innerText = '🔍 想買/求購';
      } else if (itemType === 'free') {
        badge.className = 'text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
        badge.innerText = '🎁 免費贈送';
      } else {
        badge.className = 'text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30';
        badge.innerText = '💰 我想賣';
      }

      document.getElementById('modal-title').innerText = item.title;
      document.getElementById('modal-price').innerText = itemType === 'free' ? '免費' : (itemType === 'buy' ? '預算: $' + (item.price || '面議') : '$' + item.price);
      document.getElementById('modal-desc').innerText = item.description || '無詳細說明。';
      document.getElementById('modal-time').innerText = timeAgo(item.created_at);
      document.getElementById('modal-seller').innerText = '發布者：' + item.nickname;

      document.getElementById('modal-chat-btn').onclick = () => {
        closeImageModal();
        openChat(item.id, item.title);
      };

      document.getElementById('image-modal').classList.remove('hidden');
    }

    function closeImageModal() { document.getElementById('image-modal').classList.add('hidden'); }

    function setFilter(filter) {
      currentFilter = filter;
      ['all', 'sell', 'buy', 'free'].forEach(f => {
        const btn = document.getElementById('btn-' + f);
        if (f === filter) {
          btn.className = 'py-2 rounded-xl bg-indigo-600 text-white font-bold shadow-md transition';
        } else {
          btn.className = 'py-2 rounded-xl bg-gray-800/80 text-gray-300 border border-gray-700 hover:bg-gray-750 transition backdrop-blur-sm';
        }
      });
      renderItems();
    }

    function togglePriceInput() {
      const type = document.getElementById('type').value;
      const priceInput = document.getElementById('price');
      if (type === 'free') {
        priceInput.value = '0';
        priceInput.placeholder = '免費贈送 (無需填寫價格)';
        priceInput.disabled = true;
      } else if (type === 'buy') {
        priceInput.disabled = false;
        priceInput.placeholder = '徵求預算 ($)';
      } else {
        priceInput.disabled = false;
        priceInput.placeholder = '預售金額 ($)';
      }
    }

    function filterItems() { renderItems(); }
    
    function openPostModal() { 
      document.getElementById('post-modal').classList.remove('hidden'); 
    }
    
    function closePostModal() { 
      document.getElementById('post-modal').classList.add('hidden'); 
      document.getElementById('editing-item-id').value = '';
      document.getElementById('post-modal-title').innerText = '刊登物品 / 發布求購';
      document.getElementById('submit-btn').innerText = '確認發布';
      document.getElementById('post-form').reset();
      document.getElementById('img-dimension-badge').classList.add('hidden');
    }

    function compressImage(file) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
          const img = new Image();
          img.src = event.target.result;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const maxWidth = 800;
            let width = img.width;
            let height = img.height;
            if (width > maxWidth) {
              height = (maxWidth / width) * height;
              width = maxWidth;
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.7);
          };
        };
      });
    }

    document.getElementById('post-form').onsubmit = async (e) => {
      e.preventDefault();

      const editingId = document.getElementById('editing-item-id').value;
      const isEditing = Boolean(editingId);

      if (!isEditing) {
        const userItems = allItems.filter(i => i.device_id === deviceId);
        if (userItems.length >= 5) {
          alert('⚠️ 刊登數量已達上限！為了避免洗板，每位同仁最多只能同時刊登 5 項物品。');
          return;
        }
      }

      const title = document.getElementById('title').value;
      const desc = document.getElementById('description').value;

      const bannedWordsStr = localStorage.getItem('pega_banned_words');
      if (bannedWordsStr) {
        const bannedWords = bannedWordsStr.split(',').map(w => w.trim()).filter(Boolean);
        for (let word of bannedWords) {
          if (title.includes(word) || desc.includes(word)) {
            alert(`🚫 刊登內容包含敏感詞「${word}」，請修改後再發布！`);
            return;
          }
        }
      }

      const btn = document.getElementById('submit-btn');
      btn.innerText = isEditing ? '儲存中...' : '發布中...';
      btn.disabled = true;

      let imageUrl = null;
      const fileInput = document.getElementById('image-input');
      
      if (fileInput.files.length > 0) {
        const rawFile = fileInput.files[0];
        const compressedBlob = await compressImage(rawFile);
        const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 5)}.jpg`;

        const { error: uploadError } = await db.storage
          .from('item-images')
          .upload(fileName, compressedBlob, { contentType: 'image/jpeg' });

        if (uploadError) {
          alert('圖片上傳失敗：' + uploadError.message);
          btn.innerText = isEditing ? '儲存修改' : '確認發布';
          btn.disabled = false;
          return;
        }

        const { data: publicUrlData } = db.storage.from('item-images').getPublicUrl(fileName);
        imageUrl = publicUrlData.publicUrl;
      }

      const payload = {
        title: title,
        price: document.getElementById('price').value || '0',
        description: desc,
        type: document.getElementById('type').value,
        contact_info: document.getElementById('contact').value,
      };

      if (imageUrl) payload.image_url = imageUrl;

      let error = null;

      if (isEditing) {
        const res = await db.from('items').update(payload).eq('id', editingId);
        error = res.error;
      } else {
        payload.device_id = deviceId;
        payload.nickname = nickname;
        const res = await db.from('items').insert([payload]);
        error = res.error;
      }

      if (error) {
        alert((isEditing ? '修改' : '發布') + '失敗：' + error.message);
      } else {
        alert(isEditing ? '🎉 貼文更新成功！' : '🎉 刊登成功！');
        closePostModal();
        loadItems();
      }

      btn.innerText = '確認發布';
      btn.disabled = false;
    };

    async function openChat(itemId, title) {
      currentItemId = itemId;
      document.getElementById('chat-title').innerText = '對話：' + title;
      document.getElementById('chat-modal').classList.remove('hidden');
      loadMessages();

      if (chatSubscription) db.removeChannel(chatSubscription);
      chatSubscription = db.channel('public:messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `item_id=eq.${itemId}` }, payload => {
          appendMessage(payload.new);
        })
        .subscribe();
    }

    function closeChat() { document.getElementById('chat-modal').classList.add('hidden'); }

    async function loadMessages() {
      const { data } = await db.from('messages').select('*').eq('item_id', currentItemId).order('created_at', { ascending: true });
      const msgBox = document.getElementById('chat-messages');
      msgBox.innerHTML = '';
      if (data) data.forEach(appendMessage);
    }

    function appendMessage(msg) {
      const msgBox = document.getElementById('chat-messages');
      const isMe = msg.sender_id === deviceId;
      const div = document.createElement('div');
      div.className = `flex flex-col ${isMe ? 'items-end' : 'items-start'}`;
      div.innerHTML = `
        <span class="text-[10px] text-gray-500 mb-0.5">${msg.sender_name}</span>
        <div class="px-3.5 py-2 rounded-2xl max-w-[80%] text-sm ${isMe ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-200 border border-gray-700'}">
          ${msg.content}
        </div>
      `;
      msgBox.appendChild(div);
      msgBox.scrollTop = msgBox.scrollHeight;
    }

    async function sendMessage() {
      const input = document.getElementById('chat-input');
      const content = input.value.trim();
      if (!content) return;
      input.value = '';

      await db.from('messages').insert([{
        item_id: currentItemId,
        sender_id: deviceId,
        sender_name: nickname,
        content: content
      }]);
    }

    loadAnnouncement();
    loadItems();
  