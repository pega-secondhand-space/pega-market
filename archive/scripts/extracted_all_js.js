
    function scrollToTopItem() {
      const grid = document.getElementById('item-grid');
      if (grid) {
        const firstCard = grid.firstElementChild;
        if (firstCard) {
          firstCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          showNotification('⬆️ 已捲動至最上方的一筆資料！', 'info');
        } else {
          grid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }

    function scrollToBottomItem() {
      const grid = document.getElementById('item-grid');
      if (grid) {
        const lastCard = grid.lastElementChild;
        if (lastCard) {
          lastCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          showNotification('⬇️ 已捲動至最下方的一筆資料！', 'info');
        } else {
          grid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }

    function toggleSwapMode(isSwap) {
      const priceContainer = document.getElementById('price-input-container');
      const swapContainer = document.getElementById('swap-input-container');
      const priceInput = document.getElementById('post-price');
      const swapInput = document.getElementById('post-swap-item');

      if (isSwap) {
        if (priceContainer) priceContainer.classList.add('hidden');
        if (swapContainer) swapContainer.classList.remove('hidden');
        if (priceInput) priceInput.value = '';
      } else {
        if (priceContainer) priceContainer.classList.remove('hidden');
        if (swapContainer) swapContainer.classList.add('hidden');
        if (swapInput) swapInput.value = '';
      }
    }

    function applyCouponDiscount(pct) {
      const priceInput = document.getElementById('post-price');
      const titleInput = document.getElementById('post-title');
      if (!priceInput) return;
      const originalVal = parseFloat(priceInput.value);
      if (isNaN(originalVal) || originalVal <= 0) {
        showNotification('⚠️ 請先輸入商品價格/面額，才能進行折價計算！', 'warning');
        return;
      }
      const discounted = Math.round(originalVal * pct);
      priceInput.value = discounted;
      
      const pctText = pct === 0.9 ? '9折' : '95折';
      showNotification(`🎉 禮券已自動打${pctText}！折價後價格為 NT$ ${discounted}`, 'success');

      if (titleInput) {
        let title = titleInput.value.trim();
        if (title && !title.includes(pctText)) {
          title = title.replace(/\((9折|95折)\)/g, '').trim();
          titleInput.value = `${title} (${pctText})`;
        }
      }
    }

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

    window.onerror = function(msg, url, lineNo, columnNo, error) {
      var errBox = document.getElementById('debug-error-box');
      if (errBox) {
        errBox.classList.remove('hidden');
        errBox.innerHTML = '<strong>⚠️ 系統載入提示：</strong> ' + msg + ' (Line: ' + lineNo + ')';
      }
      return false;
    };

    function showNotification(msg, type) {
      const container = document.getElementById('toast-container');
      if (!container) {
        alert(msg);
        return;
      }
      const toast = document.createElement('div');
      const bg = type === 'success' ? 'bg-emerald-600 border border-emerald-400/50 shadow-emerald-900/40' : 
                 type === 'warning' ? 'bg-amber-600 border border-amber-400/50 shadow-amber-900/40' : 
                 'bg-indigo-600 border border-indigo-400/50 shadow-indigo-900/40';
      toast.className = `${bg} text-white px-4 py-3 rounded-2xl text-xs font-black shadow-2xl flex items-center gap-2.5 pointer-events-auto animate-fadeIn backdrop-blur-md`;
      toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-circle-check' : type === 'warning' ? 'fa-triangle-exclamation' : 'fa-circle-info'} text-sm"></i><span>${msg}</span>`;
      container.appendChild(toast);
      setTimeout(() => { toast.remove(); }, 3500);
    }

    const SUPABASE_URL = 'https://llnnbanqtmnccfvtwooo.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxsbm5iYW5xdG1uY2NmdnR3b29vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyOTE5MjYsImV4cCI6MjEwMDg2NzkyNn0.ljcpgFCejH4OmUWZTp80RZ8nVsKtg5gbB1AYfNfoSDI';

    var db = null;
    try {
      if (typeof supabase !== 'undefined' && supabase.createClient) {
        db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      }
    } catch(e) {
      console.error('Supabase init error:', e);
    }

    let isAdmin = localStorage.getItem('pega_is_admin') === 'true';

    let deviceId = localStorage.getItem('pega_device_id');
    let nickname = localStorage.getItem('pega_nickname');
    if (!deviceId) {
      deviceId = 'usr_' + Math.random().toString(36).substring(2, 11);
      nickname = 'PEGA同仁#' + Math.floor(1000 + Math.random() * 9000);
      localStorage.setItem('pega_device_id', deviceId);
      localStorage.setItem('pega_nickname', nickname);
    }

    
    let currentPage = 1;
    let itemsPerPage = parseInt(localStorage.getItem('pega_items_per_page') || '40', 10);

    async function loadItemsPerPageSetting() {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/messages?item_id=eq.00000000-0000-0000-0000-000000000011&select=*`, {
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

    function changePage(delta) {
      currentPage += delta;
      renderItems();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function goToPage(p) {
      currentPage = p;
      renderItems();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function goToLastPage() {
      const totalPages = Math.ceil(filteredTotalCount / itemsPerPage) || 1;
      currentPage = totalPages;
      renderItems();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    let allItems = [];
    let allArchiveLogs = [];
    let currentFilter = 'all';
    let postType = 'sell';
    let globalPinnedIds = [];
    let editingItemId = null;
    let tempEditPassword = "";

    function updateIdentityDisplay() {
      const display = document.getElementById('user-identity-display');
      if (display) {
        display.innerHTML = `<i class="fa-solid fa-user-secret text-indigo-400"></i> 您的代號：<strong class="text-indigo-300 font-bold">${nickname}</strong>`;
      }
    }

    async function loadSiteName() {
      const defaultName = localStorage.getItem('pega_site_name') || 'PEGAPEGA';
      let nameToUse = defaultName;

      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/messages?item_id=eq.00000000-0000-0000-0000-000000000008&select=*&order=created_at.desc&limit=1`, {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0 && data[0].content) {
            nameToUse = data[0].content;
            localStorage.setItem('pega_site_name', nameToUse);
          }
        }
      } catch(e) { console.error('Fetch sitename error:', e); }

      const titleSpan = document.getElementById('site-title-text');
      const input = document.getElementById('admin-sitename-input');
      const docTitle = document.getElementById('doc-site-title');
      if (titleSpan) titleSpan.innerText = nameToUse;
      if (input) input.value = nameToUse;
      if (docTitle) docTitle.innerText = nameToUse;
      document.title = nameToUse;
    }

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

    function refreshPageData() {
      const searchInput = document.getElementById('search-input');
      if (searchInput) searchInput.value = '';
      setFilter('all');
      loadItems();
      loadAnnouncement();
      showNotification('🔄 已重新整理資料與貼文！', 'info');
    }

    function changeGridLayout(cols) {
      const isMobile = window.innerWidth < 640;
      const storageKey = isMobile ? 'pega_grid_cols_mobile' : 'pega_grid_cols_pc';
      localStorage.setItem(storageKey, cols);
      localStorage.setItem('pega_grid_cols', cols); // Keep the general one as fallback
      applyGridLayout(cols);
      renderItems(); // Re-render to update divider line positions dynamically
    }

    function applyGridLayout(cols) {
      const container = document.getElementById('grid-container');
      const grid = document.getElementById('item-grid');
      if (!container || !grid) return;

      const maxWMap = {
        '1': 'max-w-xl',  // Wider for clean single column feed style
        '2': 'max-w-2xl',
        '3': 'max-w-4xl',
        '4': 'max-w-6xl',
        '5': 'max-w-7xl'
      };

      container.className = `mx-auto ${maxWMap[cols] || 'max-w-xl'}`;
      grid.className = `grid grid-cols-${cols} gap-6`;
    }

    // 原生 HTML5 Canvas 圖片壓縮與 Supabase Storage 上傳邏輯
    async function compressAndUploadImage(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function(event) {
          const img = new Image();
          img.src = event.target.result;
          img.onload = function() {
            const canvas = document.createElement('canvas');
            const maxDim = 1024;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > maxDim) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              }
            } else {
              if (height > maxDim) {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(async function(blob) {
              if (!blob) {
                reject(new Error('圖片壓縮失敗'));
                return;
              }

              const filename = `item_${Date.now()}_${Math.random().toString(36).substring(2,7)}.jpg`;
              try {
                const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/item-images/${filename}`, {
                  method: 'POST',
                  headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'image/jpeg'
                  },
                  body: blob
                });

                if (uploadRes.ok) {
                  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/item-images/${filename}`;
                  resolve(publicUrl);
                } else {
                  reject(new Error('上傳至 Supabase Storage 失敗'));
                }
              } catch(err) {
                reject(err);
              }
            }, 'image/jpeg', 0.85);
          };
          img.onerror = reject;
        };
        reader.onerror = reject;
      });
    }

    async function handleImageSelect(num, event) {
      const file = event.target.files[0];
      if (!file) return;

      const statusSpan = document.getElementById(`file${num}-status`);
      const previewBoxGrid = document.getElementById('upload-previews-grid');
      const previewBox = document.getElementById(`preview-box-${num}`);
      const previewImg = document.getElementById(`preview-img-${num}`);
      const hiddenUrlInput = document.getElementById(`post-img${num}-url`);

      if (statusSpan) statusSpan.innerText = '⏳ 壓縮上傳中...';

      try {
        const publicUrl = await compressAndUploadImage(file);
        if (hiddenUrlInput) hiddenUrlInput.value = publicUrl;
        if (statusSpan) statusSpan.innerText = '✅ 上傳成功！';
        
        if (previewImg) previewImg.src = publicUrl;
        if (previewBoxGrid) previewBoxGrid.classList.remove('hidden');
        if (previewBox) previewBox.classList.remove('hidden');

        showNotification(`🎉 照片 ${num} 已成功自動壓縮上傳資料庫！`, 'success');
      } catch(e) {
        console.error('Image upload error:', e);
        if (statusSpan) statusSpan.innerText = '❌ 上傳失敗';
        showNotification('⚠️ 照片上傳失敗：' + e.message, 'warning');
      }
    }

    async function loadGlobalPinnedIds() {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/messages?item_id=eq.00000000-0000-0000-0000-000000000013&select=*`, {
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

    async function togglePinItem(id) {
      if (!isAdmin) return showNotification('⚠️ 只有版主可以置頂商品', 'warning');
      let pinned = [...globalPinnedIds];
      
      const debugHash = localStorage.getItem('pega_admin_hash') || '';
      console.log('[DEBUG-PIN] Current admin hash in localStorage:', debugHash);
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
          showNotification(`⚠️ 儲存置頂失敗 (狀態碼: ${res.status})：${errMsg || '版主密碼失效'}`, 'warning');
        }
      } catch(e) {
        console.error('Save pinned error:', e);
      }
    }

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
          filterItems(); // 確保重新整理後獲取最新的 filtered 列表與排序
          refreshAnnouncementDisplay();

          // 刊登成功後自動跳轉與展開詳情
          if (itemIdToOpen) {
            const index = filtered.findIndex(item => item.id === itemIdToOpen);
            if (index !== -1) {
              const itemPage = Math.floor(index / itemsPerPage) + 1;
              currentPage = itemPage;
              renderItems(); // 重新渲染該分頁

              // 自動開啟詳情彈窗
              openDetailModal(itemIdToOpen);

              // 平滑滾動定位到該卡片並閃爍藍光提示
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

                    let filteredTotalCount = 0;

    function renderItems() {
      const grid = document.getElementById('item-grid');
      if (!grid) return;

      // Read itemsPerPage from localStorage dynamically
      itemsPerPage = parseInt(localStorage.getItem('pega_items_per_page') || '40', 10);
      if (isNaN(itemsPerPage) || itemsPerPage < 1) itemsPerPage = 40;

      const searchVal = (document.getElementById('search-input')?.value || '').toLowerCase().trim();

      const filtered = allItems.filter(item => {
        if (item.device_id === 'SYSTEM' || (item.title && item.title.startsWith('SYSTEM_')) || (item.id && item.id.startsWith('00000000-0000-0000-0000-'))) return false;

        // Auto-delete sold items after 2 days (48 hours)
        if (isItemSold(item)) {
          const soldTime = getItemSoldTime(item);
          if (soldTime) {
            const diffMs = new Date() - soldTime;
            if (diffMs > 2 * 24 * 60 * 60 * 1000) {
              deleteItemSilently(item.id);
              return false;
            }
          }
        }

        const itemExp = getItemExpiration(item);
        if (itemExp) {
          const expDate = new Date(itemExp);
          if (expDate < new Date()) {
            deleteItemSilently(item.id);
            return false; // Filter out expired items
          }
        }
        if (currentFilter !== 'all' && item.type !== currentFilter) return false;
        if (searchVal) {
          const matchTitle = (item.title || '').toLowerCase().includes(searchVal);
          const matchDesc = (item.description || '').toLowerCase().includes(searchVal);
          const matchContact = (item.contact_info || item.contact || '').toLowerCase().includes(searchVal);
          return matchTitle || matchDesc || matchContact;
        }
        return true;
      });

      // Sort items: Active pinned items first, then active regular items, and sold items placed at the bottom.
      filtered.sort((a, b) => {
        const aSold = isItemSold(a) ? 1 : 0;
        const bSold = isItemSold(b) ? 1 : 0;
        if (aSold !== bSold) {
          return aSold - bSold; // Sold items (1) go after active items (0)
        }

        const aPinned = globalPinnedIds.includes(a.id) ? 1 : 0;
        const bPinned = globalPinnedIds.includes(b.id) ? 1 : 0;
        if (aPinned !== bPinned) {
          return bPinned - aPinned; // Pinned (1) goes before unpinned (0)
        }

        const aTime = new Date(a.created_at || 0);
        const bTime = new Date(b.created_at || 0);
        return bTime - aTime;
      });

      filteredTotalCount = filtered.length;
      const totalPages = Math.ceil(filteredTotalCount / itemsPerPage) || 1;
      if (currentPage > totalPages) currentPage = totalPages;
      if (currentPage < 1) currentPage = 1;

      // Update Pagination UI Elements
      const pagContainer = document.getElementById('pagination-container');
      const curElem = document.getElementById('page-current');
      const totElem = document.getElementById('page-total');
      const cntElem = document.getElementById('items-total-count');
      const numSpan = document.getElementById('page-numbers-span');
      const btnFirst = document.getElementById('btn-page-first');
      const btnPrev = document.getElementById('btn-page-prev');
      const btnNext = document.getElementById('btn-page-next');
      const btnLast = document.getElementById('btn-page-last');

      if (pagContainer) pagContainer.classList.remove('hidden');
      if (curElem) curElem.innerText = currentPage;
      if (totElem) totElem.innerText = totalPages;
      if (cntElem) cntElem.innerText = filteredTotalCount;

      // Generate clickable page number buttons
      if (numSpan) {
        let btnHtml = '';
        for (let p = 1; p <= totalPages; p++) {
          if (p === currentPage) {
            btnHtml += `<button class="px-3.5 py-1.5 bg-indigo-600 text-white font-black rounded-xl text-xs sm:text-sm shadow-md">${p}</button>`;
          } else {
            btnHtml += `<button onclick="goToPage(${p})" class="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl text-xs sm:text-sm transition">${p}</button>`;
          }
        }
        numSpan.innerHTML = btnHtml;
      }

      if (btnFirst) btnFirst.disabled = (currentPage === 1);
      if (btnPrev) btnPrev.disabled = (currentPage === 1);
      if (btnNext) btnNext.disabled = (currentPage === totalPages);
      if (btnLast) btnLast.disabled = (currentPage === totalPages);

      if (filtered.length === 0) {
        grid.innerHTML = '<p class="col-span-full text-gray-400 text-center py-12 text-sm font-bold">尚無相符的刊登貼文</p>';
        return;
      }

      // Slice items for current page
      const startIndex = (currentPage - 1) * itemsPerPage;
      const pageItems = filtered.slice(startIndex, startIndex + itemsPerPage);

      grid.innerHTML = pageItems.map((item, idx) => {
        const isSold = isItemSold(item);
        const isPinned = globalPinnedIds.includes(item.id);
        const safeTitle = (item.title || '').replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const cleanDescText = getCleanDescription(item.description);
        const safeDesc = cleanDescText.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const contactStr = item.contact_info || item.contact || '';
        const safeContact = contactStr.replace(/</g, "&lt;").replace(/>/g, "&gt;");

        const typeBadge = item.type === 'free' ? '<span class="bg-emerald-500 text-gray-950 font-black px-3 py-1 rounded-lg text-xs sm:text-sm shadow-md">🎁 免費送</span>' :
                          item.type === 'buy' ? '<span class="bg-amber-500 text-gray-950 font-black px-3 py-1 rounded-lg text-xs sm:text-sm shadow-md">🔍 想買</span>' :
                          item.type === 'lucky' ? '<span class="bg-rose-500 text-white font-black px-3 py-1 rounded-lg text-xs sm:text-sm shadow-md">🎁 全新尾牙貨</span>' :
                          '<span class="bg-indigo-500 text-white font-black px-3 py-1 rounded-lg text-xs sm:text-sm shadow-md">💰 想賣</span>';
        let priceDisplay = '';
        if (item.price && String(item.price).startsWith('swap:')) {
          const swapVal = String(item.price).replace('swap:', '');
          priceDisplay = `<span class="text-rose-400 font-black flex items-center gap-1"><i class="fa-solid fa-arrows-rotate text-xs"></i> 以物易物 (想換：${swapVal || '未指定'})</span>`;
        } else if (item.type === 'free') {
          priceDisplay = 'NT$ 0 (免費親自取件)';
        } else {
          const numPrice = parseFloat(item.price);
          priceDisplay = isNaN(numPrice) ? `NT$ ${item.price}` : `NT$ ${numPrice.toLocaleString()}`;
        }

        let expCountdownHtml = '';
        if (isSold) {
          const soldTime = getItemSoldTime(item);
          if (soldTime) {
            const remainingMs = (2 * 24 * 60 * 60 * 1000) - (new Date() - soldTime);
            const remainingHours = Math.max(0, Math.floor(remainingMs / (1000 * 60 * 60)));
            if (remainingHours > 24) {
              const remainingDays = Math.floor(remainingHours / 24);
              const hours = remainingHours % 24;
              expCountdownHtml = `<span class="text-emerald-400 font-bold">⏳ 售出：剩 ${remainingDays} 天 ${hours} 小時下架</span>`;
            } else {
              expCountdownHtml = `<span class="text-red-400 font-bold animate-pulse">⏳ 售出：剩 ${remainingHours} 小時下架</span>`;
            }
          } else {
            expCountdownHtml = `<span class="text-emerald-400 font-bold">⏳ 已標記售出</span>`;
          }
        } else {
          expCountdownHtml = getExpirationCountdown(getItemExpiration(item));
        }

        // Calculate dynamic dividers based on current grid columns
        const isMobile = window.innerWidth < 640;
        const storageKey = isMobile ? 'pega_grid_cols_mobile' : 'pega_grid_cols_pc';
        const colsNum = parseInt(localStorage.getItem(storageKey) || localStorage.getItem('pega_grid_cols') || '2', 10);
        const isEndOfRow = ((idx + 1) % colsNum === 0);
        const dividerHtml = (isEndOfRow && idx < pageItems.length - 1) ? `<div class="border-b border-gray-800/80 my-5 col-span-full"></div>` : '';

        const isFloatLeft = ((idx % colsNum) >= (colsNum / 2));
        const bubbleClass = isFloatLeft ? 'right-full mr-4' : 'left-full ml-4';
        const arrowClass = isFloatLeft ? 
          'absolute top-6 -right-2 w-3.5 h-3.5 bg-indigo-950 border-r-2 border-t-2 border-indigo-500 rotate-45 z-10' : 
          'absolute top-6 -left-2 w-3.5 h-3.5 bg-indigo-950 border-l-2 border-b-2 border-indigo-500 rotate-45 z-10';

        const cardHtml = `
          <div onclick="openDetailModal('${item.id}')" class="bg-gray-900/95 border ${isSold ? 'grayscale opacity-60 border-gray-800' : isPinned ? 'border-amber-500/80 shadow-amber-500/10 shadow-lg' : 'border-gray-800'} rounded-2xl relative transition ${isSold ? '' : 'hover:border-indigo-500/60 group'} cursor-pointer">
            ${(isPinned && !isSold) ? '<div class="bg-amber-500 text-gray-950 text-xs sm:text-sm font-black px-3 py-1 text-center rounded-t-2xl">📌 官方置頂商品</div>' : ''}
            
            <!-- Cartoon Speech Bubble (卡通對話氣泡) for PC Hover Preview -->
            ${!isSold ? `
              <div class="absolute top-4 ${bubbleClass} w-72 hidden md:group-hover:block bg-indigo-950 border-2 border-indigo-500 p-4 rounded-2xl shadow-[0_15px_35px_rgba(0,0,0,0.9),0_0_20px_rgba(99,102,241,0.5)] pointer-events-none z-50 text-left animate-fadeIn">
                <!-- 氣泡小尾巴 -->
                <div class="${arrowClass}"></div>
                
                <div class="relative z-20 space-y-2">
                  <div class="font-black text-indigo-400 text-xs flex items-center gap-1.5"><i class="fa-solid fa-comment-dots text-indigo-300"></i> 物品詳細描述：</div>
                  <div class="text-xs text-gray-200 font-semibold leading-relaxed max-h-48 overflow-y-auto break-words whitespace-pre-wrap pr-1 scrollbar-thin scrollbar-thumb-indigo-500">${safeDesc || '同仁未提供詳細描述。'}</div>
                  
                  <div class="pt-2 border-t border-gray-800/80 text-xs text-gray-400 font-bold flex items-center justify-between">
                    <span>👤 刊登人：${item.nickname || '同仁'}</span>
                    <span class="text-indigo-400 font-black">點擊查看詳情 ➔</span>
                  </div>
                </div>
              </div>
            ` : ''}

            <div class="relative aspect-video bg-gray-950 overflow-hidden rounded-t-2xl flex items-center justify-center">
              <!-- w-full h-full object-cover 強迫橫顯示，防止圖片出現 1x1 變形與黑邊 -->
              <img id="card-img-${item.id}" src="${(item.image_url || '').split('|||')[0] || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop'}" class="w-full h-full object-cover ${isSold ? '' : 'group-hover:scale-105'} transition-transform duration-300">
              <div class="absolute top-2 left-2 flex gap-1">${typeBadge}</div>
              
              <!-- 已售出打勾按鈕 -->
              <div class="absolute top-2 right-2 z-20" onclick="event.stopPropagation()">
                <button onclick="toggleItemSoldState('${item.id}')" 
                        class="w-8 h-8 rounded-full border shadow-md flex items-center justify-center transition active:scale-90 font-bold text-xs 
                        ${isSold ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-black/60 border-white/30 text-gray-300 hover:text-white hover:bg-black/80'}"
                        title="${isSold ? '標記為未售出' : '標記為已售出'}">
                  <i class="fa-solid ${isSold ? 'fa-check-double' : 'fa-check'} text-sm"></i>
                </button>
              </div>

              ${((item.image_url || '').includes('|||') && !isSold) ? `
                <div class="absolute inset-x-1 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none px-1">
                  <button onclick="event.stopPropagation(); switchCardPhoto('${item.id}', 0)" class="pointer-events-auto bg-black/75 hover:bg-black text-white w-8 h-8 rounded-full text-xs sm:text-sm flex items-center justify-center border border-white/20 transition active:scale-90 shadow-md">
                    <i class="fa-solid fa-chevron-left"></i>
                  </button>
                  <button onclick="event.stopPropagation(); switchCardPhoto('${item.id}', 1)" class="pointer-events-auto bg-black/75 hover:bg-black text-white w-8 h-8 rounded-full text-xs sm:text-sm flex items-center justify-center border border-white/20 transition active:scale-90 shadow-md">
                    <i class="fa-solid fa-chevron-right"></i>
                  </button>
                </div>
                <div class="absolute bottom-2 right-2 bg-black/80 text-white text-xs sm:text-sm font-bold px-2 py-0.5 rounded-lg border border-white/20">
                  📷 雙圖
                </div>
              ` : ''}
            </div>

            <div class="p-4 flex-1 flex flex-col justify-between space-y-3 bg-gray-900/95 rounded-b-2xl">
              <div>
                <h3 class="font-black text-base sm:text-lg text-gray-100 mb-1.5 ${isSold ? '' : 'group-hover:text-indigo-300'} transition leading-snug break-words whitespace-normal">${isSold ? '<span class="text-emerald-400 font-black">【已售出】</span>' : ''}${safeTitle}</h3>
                <p class="text-base sm:text-lg text-indigo-400 font-black">${priceDisplay}</p>
              </div>

              <div class="space-y-2.5 pt-2.5 border-t border-gray-800/80">
                ${(safeContact && !isSold) ? `
                  <div onclick="event.stopPropagation(); handleContactClick('${safeContact}')" class="bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/40 p-2.5 rounded-xl text-xs sm:text-base text-indigo-200 font-bold flex items-center justify-between gap-2 transition active:scale-95 cursor-pointer shadow-sm" title="點擊一鍵複製聯絡方式">
                    <div class="flex items-center gap-1.5 min-w-0 flex-1 break-words">
                      <i class="fa-solid fa-phone text-indigo-400 text-xs sm:text-sm shrink-0 mt-0.5"></i>
                      <span class="break-words whitespace-normal text-left">聯絡：${safeContact}</span>
                    </div>
                    <span class="text-xs sm:text-sm bg-indigo-900 text-indigo-300 px-2 py-0.5 rounded-md shrink-0 font-bold">點擊複製</span>
                  </div>
                ` : ''}

                <div class="flex items-center justify-end text-xs sm:text-sm text-gray-400 font-medium">
                  <span class="font-bold">${expCountdownHtml}</span>
                </div>
              </div>
            </div>
          </div>
        `;
        
        return cardHtml + dividerHtml;
      }).join('');
    }

    // 100% 完整全照片展覽 (使用 object-contain + 黑色背景高質感，防任何圖片裁切)
    
        function switchCardPhoto(itemId, dir) {
      const item = allItems.find(i => i.id === itemId);
      if (!item || !item.image_url) return;
      const photos = (item.image_url || '').split('|||').filter(Boolean);
      if (photos.length <= 1) return;

      const imgElem = document.getElementById(`card-img-${itemId}`);
      if (!imgElem) return;

      let curIdx = parseInt(imgElem.getAttribute('data-photo-idx') || '0', 10);
      if (isNaN(curIdx) || curIdx < 0 || curIdx >= photos.length) curIdx = 0;

      // 無縫無限循環計算 (Looping)
      let nextIdx = (dir === 1) ? (curIdx + 1) % photos.length : (curIdx - 1 + photos.length) % photos.length;

      imgElem.src = photos[nextIdx];
      imgElem.setAttribute('data-photo-idx', nextIdx);
    }

    
    function handleContactClick(contactStr) {
      if (!contactStr) return;
      // Extract numbers for tel dialing if available
      const phoneMatch = contactStr.match(/(分機\s*\d+|\d{4,8})/);
      if (navigator.clipboard) {
        navigator.clipboard.writeText(contactStr);
        showNotification(`📋 已為您複製聯絡資訊：${contactStr}`, 'success');
      } else {
        showNotification(`📞 聯絡資訊：${contactStr}`, 'info');
      }
    }

    function openDetailModal(itemId) {
      const item = allItems.find(i => i.id === itemId);
      if (!item) return;

      const modal = document.getElementById('detail-modal');
      const typeBadge = document.getElementById('detail-type-badge');
      const titleElem = document.getElementById('detail-title');
      const priceElem = document.getElementById('detail-price');
      const timeElem = document.getElementById('detail-time');
      const contactText = document.getElementById('detail-contact-text');
      const descElem = document.getElementById('detail-desc');
      const nickElem = document.getElementById('detail-nickname');
      const photosContainer = document.getElementById('detail-photos-container');

      if (titleElem) titleElem.innerText = item.title || '無標題';
      if (priceElem) {
        let priceDisplay = '';
        if (item.price && String(item.price).startsWith('swap:')) {
          const swapVal = String(item.price).replace('swap:', '');
          priceDisplay = `🔄 以物易物 (想換：${swapVal || '未指定'})`;
          priceElem.className = "text-xl font-black text-rose-500 flex items-center gap-1";
        } else {
          priceElem.className = "text-xl font-black text-indigo-600";
          if (item.type === 'free') {
            priceDisplay = 'NT$ 0 (免費親自取件)';
          } else {
            const numPrice = parseFloat(item.price);
            priceDisplay = isNaN(numPrice) ? `NT$ ${item.price}` : `NT$ ${numPrice.toLocaleString()}`;
          }
        }
        priceElem.innerText = priceDisplay;
      }
      if (timeElem) timeElem.innerText = timeAgo(item.created_at);
      if (contactText) contactText.innerText = item.contact_info || item.contact || '刊登者未特別留言聯絡方式';
      if (descElem) descElem.innerText = getCleanDescription(item.description) || '無詳細補充描述';
      if (nickElem) nickElem.innerText = item.nickname || '匿名同仁';
      const expElem = document.getElementById('detail-expiration');
      if (expElem) expElem.innerHTML = getExpirationCountdown(getItemExpiration(item));

      if (typeBadge) {
        typeBadge.innerHTML = item.type === 'free' ? '<span class="bg-emerald-500 text-gray-950 font-black px-2 py-0.5 rounded-md text-[10px]">🎁 免費送</span>' :
                              item.type === 'buy' ? '<span class="bg-amber-500 text-gray-950 font-black px-2 py-0.5 rounded-md text-[10px]">🔍 想買</span>' :
                              item.type === 'lucky' ? '<span class="bg-rose-500 text-white font-black px-2 py-0.5 rounded-md text-[10px]">🎁 全新尾牙貨</span>' :
                              '<span class="bg-indigo-500 text-white font-black px-2 py-0.5 rounded-md text-[10px]">💰 想賣</span>';
      }

      // Render up to 2 photos with 100% complete view (object-contain)
      if (photosContainer) {
        const photos = (item.image_url || '').split('|||');
        const p1 = photos[0] || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop';
        const p2 = photos[1] || item.image_url2 || '';

        if (p2) {
          photosContainer.className = "grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-2xl overflow-hidden bg-gray-950/90 border border-gray-700/60 p-2";
          photosContainer.innerHTML = `
            <div class="bg-black/90 rounded-xl overflow-hidden flex items-center justify-center p-1 border border-gray-800">
              <img src="${p1}" class="max-h-72 w-full object-contain rounded-lg">
            </div>
            <div class="bg-black/90 rounded-xl overflow-hidden flex items-center justify-center p-1 border border-gray-800">
              <img src="${p2}" class="max-h-72 w-full object-contain rounded-lg">
            </div>
          `;
        } else {
          photosContainer.className = "grid grid-cols-1 gap-3 rounded-2xl overflow-hidden bg-gray-950/90 border border-gray-700/60 p-2";
          photosContainer.innerHTML = `
            <div class="bg-black/90 rounded-xl overflow-hidden flex items-center justify-center p-1 border border-gray-800">
              <img src="${p1}" class="max-h-80 w-full object-contain rounded-lg">
            </div>
          `;
        }
      }

      
      // Check if current device is owner (Option A & Password Auth)
      const ownerBox = document.getElementById('detail-owner-action-box');
      const ownerEditBtn = document.getElementById('detail-owner-edit-btn');
      const ownerDeleteBtn = document.getElementById('detail-owner-delete-btn');

      if (ownerBox) {
        ownerBox.classList.remove('hidden');
        
        const myItems = JSON.parse(localStorage.getItem('my_created_item_ids') || '[]');
        const myPasswords = JSON.parse(localStorage.getItem('pega_my_post_passwords') || '{}');
        const hasPasswordSaved = myPasswords[item.id] !== undefined;
        const isRealOwner = (item.device_id === deviceId) || myItems.includes(item.id) || hasPasswordSaved;

        if (ownerEditBtn) {
          if (isRealOwner || isAdmin) {
            ownerEditBtn.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> <span>修改貼文</span>';
          } else {
            ownerEditBtn.innerHTML = '<i class="fa-solid fa-lock"></i> <span>修改貼文 (輸入密碼)</span>';
          }
          ownerEditBtn.onclick = function() { editMyItem(item.id); };
        }

        if (ownerDeleteBtn) {
          if (isRealOwner || isAdmin) {
            ownerDeleteBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i> <span>下架貼文 (售出/結案)</span>';
          } else {
            ownerDeleteBtn.innerHTML = '<i class="fa-solid fa-lock"></i> <span>下架貼文 (輸入密碼)</span>';
          }
          ownerDeleteBtn.onclick = function() { deleteMyItem(item.id); };
        }
      }

      // Check if user is admin
      const adminBox = document.getElementById('detail-admin-action-box');
      const adminPinBtn = document.getElementById('detail-admin-pin-btn');
      const adminPinText = document.getElementById('detail-admin-pin-text');
      const adminDeleteBtn = document.getElementById('detail-admin-delete-btn');

      if (adminBox && adminPinBtn && adminDeleteBtn) {
        if (isAdmin) {
          adminBox.classList.remove('hidden');
          const isPinned = globalPinnedIds.includes(item.id);
          const isSold = isItemSold(item);
          
          if (adminPinText) adminPinText.innerText = isPinned ? '取消置頂' : '📌 置頂';
          if (isSold) {
            adminPinBtn.classList.add('hidden');
          } else {
            adminPinBtn.classList.remove('hidden');
          }

          adminPinBtn.onclick = function() {
            togglePinItem(item.id);
            const newPinned = globalPinnedIds.includes(item.id);
            if (adminPinText) adminPinText.innerText = newPinned ? '取消置頂' : '📌 置頂';
          };

          adminDeleteBtn.onclick = function() {
            deleteItemAdmin(item.id);
            closeDetailModal();
          };
        } else {
          adminBox.classList.add('hidden');
        }
      }

      if (modal) modal.classList.remove('hidden');
    }

    function closeDetailModal() {
      const modal = document.getElementById('detail-modal');
      if (modal) modal.classList.add('hidden');
    }

    
    
    function getItemExpiration(item) {
      if (item.expires_at) return item.expires_at;
      const match = (item.description || '').match(/\[EXP:(.*?)\]/);
      return match ? match[1] : null;
    }

    function getCleanDescription(desc) {
      if (!desc) return '';
      return desc.replace(/\[EXP:.*?\]/g, '').replace(/\[SOLD_AT:.*?\]/g, '').trim();
    }

    function isItemSold(item) {
      return (item.description || '').includes('[SOLD_AT:');
    }

    function getItemSoldTime(item) {
      const match = (item.description || '').match(/\[SOLD_AT:(.*?)\]/);
      return match ? new Date(match[1]) : null;
    }

    function getExpirationCountdown(expiresAt) {
      if (!expiresAt) return '<span class="text-gray-400">⏳ 永久展示</span>';
      const now = new Date();
      const exp = new Date(expiresAt);
      const diffMs = exp - now;
      if (diffMs <= 0) return '<span class="text-red-400 font-bold">⚠️ 已到期下架</span>';

      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);
      const remHours = diffHours % 24;

      if (diffDays > 0) {
        return `<span class="text-amber-400 font-bold">⏳ 剩餘 ${diffDays} 天 ${remHours} 小時下架</span>`;
      } else {
        return `<span class="text-red-400 font-bold animate-pulse">⏳ 剩餘 ${diffHours} 小時下架</span>`;
      }
    }

    function timeAgo(dateStr) {
      if (!dateStr) return '不久前';
      const d = new Date(dateStr);
      const diff = Math.floor((new Date() - d) / 1000);
      if (diff < 60) return '剛才';
      if (diff < 3600) return `${Math.floor(diff/60)} 分鐘前`;
      if (diff < 86400) return `${Math.floor(diff/3600)} 小時前`;
      return `${Math.floor(diff/86400)} 天前`;
    }

    function setFilter(f) {
      currentFilter = f;
      ['all', 'sell', 'buy', 'free', 'lucky'].forEach(type => {
        const btn = document.getElementById(`filter-${type}`);
        if (btn) {
          if (type === f) {
            btn.className = 'px-4 py-2 rounded-xl bg-indigo-600 text-white transition shadow active:scale-95 shrink-0 font-bold';
          } else {
            btn.className = 'px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 text-gray-300 hover:bg-gray-800 transition active:scale-95 shrink-0 font-bold';
          }
        }
      });
      renderItems();
    }

    function filterItems() { renderItems(); }

    function setPostType(t) {
      postType = t;
      ['sell', 'buy', 'free', 'lucky'].forEach(type => {
        const btn = document.getElementById(`post-type-${type}`);
        if (btn) {
          if (type === t) {
            btn.className = 'relative group py-2 rounded-xl border border-indigo-500 bg-indigo-600 text-white font-bold text-xs transition-all duration-300';
          } else {
            btn.className = 'relative group py-2 rounded-xl border border-gray-700 bg-gray-900 text-gray-300 font-bold text-xs transition-all duration-300';
          }
        }
      });
    }

    function showCreateError(msg) {
      const errorBox = document.getElementById('create-modal-error');
      const errorText = document.getElementById('create-modal-error-text');
      if (errorText) errorText.innerText = msg;
      if (errorBox) errorBox.classList.remove('hidden');
      showNotification(msg, 'warning');
    }

    function hideCreateError() {
      const errorBox = document.getElementById('create-modal-error');
      if (errorBox) errorBox.classList.add('hidden');
    }

    function openCreateModal() {
      editingItemId = null;
      tempEditPassword = "";

      // Reset text fields
      document.getElementById('post-title').value = "";
      document.getElementById('post-contact').value = "";
      document.getElementById('post-desc').value = "";
      document.getElementById('post-price').value = "";
      document.getElementById('post-swap-item').value = "";
      
      const swapCheckbox = document.getElementById('post-swap-check');
      if (swapCheckbox) {
        swapCheckbox.checked = false;
        toggleSwapMode(false);
      }

      document.getElementById('item-expiration').value = "none";
      
      // Reset image URLs
      document.getElementById('post-img1-url').value = "";
      document.getElementById('post-img2-url').value = "";
      
      // Reset image preview boxes
      const preview1 = document.getElementById('preview-box-1');
      const preview2 = document.getElementById('preview-box-2');
      const previewsGrid = document.getElementById('upload-previews-grid');
      if (preview1) preview1.classList.add('hidden');
      if (preview2) preview2.classList.add('hidden');
      if (previewsGrid) previewsGrid.classList.add('hidden');
      
      document.getElementById('file1-status').innerText = '點擊上傳圖檔';
      document.getElementById('file2-status').innerText = '點擊上傳第二張';

      // Reset type to sell
      setPostType('sell');

      // Generate random 4-digit code
      const randPwd = Math.floor(1000 + Math.random() * 9000).toString();
      document.getElementById('post-edit-password').value = randPwd;

      // Adjust Modal Title & Button
      document.querySelector('#create-modal h3').innerHTML = `<i class="fa-solid fa-plus-circle text-indigo-400"></i> 我要發布告示牌貼文`;
      document.getElementById('submit-create-btn').innerText = `🎉 發布貼文`;

      // Clear errors
      hideCreateError();

      document.getElementById('create-modal').classList.remove('hidden');
    }
    function closeCreateModal() { document.getElementById('create-modal').classList.add('hidden'); }

                            async function editMyItem(itemId) {
      const item = allItems.find(i => i.id === itemId);
      if (!item) return;

      // 1. Determine permission
      const myItems = JSON.parse(localStorage.getItem('my_created_item_ids') || '[]');
      const myPasswords = JSON.parse(localStorage.getItem('pega_my_post_passwords') || '{}');
      const cachedPwd = myPasswords[itemId] || "";
      
      const isOwner = (item.device_id === deviceId) || myItems.includes(itemId) || (cachedPwd !== "");
      
      let finalPwd = cachedPwd;

      // If they are on a different device and not admin, prompt and verify password
      if (!isOwner && !isAdmin) {
        const userPwd = prompt('本裝置無管理此貼文的憑證。\n請輸入該貼文的 4 位數密碼以進行修改：');
        if (!userPwd) return; // user cancelled
        
        const pwdTrim = userPwd.trim();
        
        // Show loading notification
        showNotification('🔑 正在驗證密碼...', 'info');
        
        try {
          const verifyRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/verify_post_password`, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              item_uuid: itemId,
              dev_id: deviceId,
              pwd_input: pwdTrim
            })
          });
          
          if (verifyRes.ok) {
            const isAuthorized = await verifyRes.json();
            if (isAuthorized) {
              finalPwd = pwdTrim;
              // Cache password locally since it's verified
              const myPasswords = JSON.parse(localStorage.getItem('pega_my_post_passwords') || '{}');
              myPasswords[itemId] = pwdTrim;
              localStorage.setItem('pega_my_post_passwords', JSON.stringify(myPasswords));
              showNotification('✅ 密碼驗證成功！已開啟編輯。', 'success');
            } else {
              showNotification('⚠️ 密碼錯誤，您無權修改此貼文！', 'warning');
              alert('⚠️ 密碼錯誤，您無權修改此貼文！');
              return;
            }
          } else {
            showNotification('⚠️ 驗證連線失敗，請稍後再試', 'warning');
            return;
          }
        } catch (e) {
          console.error('Verify password error:', e);
          showNotification('⚠️ 驗證發生錯誤：' + e.message, 'warning');
          return;
        }
      }

      // Open the Create Modal in editing mode
      editingItemId = itemId;
      tempEditPassword = finalPwd;

      // Pre-fill fields
      document.getElementById('post-title').value = item.title || "";
      document.getElementById('post-contact').value = item.contact_info || "";
      document.getElementById('post-desc').value = item.description || "";
      document.getElementById('post-edit-password').value = finalPwd;

      // Set transaction type
      setPostType(item.type);

      // Handle price / barter mode
      const isBarter = item.price && item.price.startsWith('swap:');
      const swapCheckbox = document.getElementById('post-swap-check');
      if (swapCheckbox) {
        swapCheckbox.checked = isBarter;
        toggleSwapMode(isBarter);
      }
      if (isBarter) {
        document.getElementById('post-swap-item').value = item.price.replace('swap:', '');
        document.getElementById('post-price').value = "";
      } else {
        document.getElementById('post-price').value = item.price || "";
        document.getElementById('post-swap-item').value = "";
      }

      // Handle Expiration
      document.getElementById('item-expiration').value = "none";

      // Pre-fill images
      document.getElementById('post-img1-url').value = "";
      document.getElementById('post-img2-url').value = "";
      
      const preview1 = document.getElementById('preview-box-1');
      const preview2 = document.getElementById('preview-box-2');
      const previewImg1 = document.getElementById('preview-img-1');
      const previewImg2 = document.getElementById('preview-img-2');
      const previewsGrid = document.getElementById('upload-previews-grid');

      if (preview1) preview1.classList.add('hidden');
      if (preview2) preview2.classList.add('hidden');
      if (previewsGrid) previewsGrid.classList.add('hidden');

      if (item.image_url) {
        const urls = item.image_url.split(',').filter(Boolean);
        if (urls[0]) {
          document.getElementById('post-img1-url').value = urls[0];
          if (previewImg1 && preview1) {
            previewImg1.src = urls[0];
            preview1.classList.remove('hidden');
            if (previewsGrid) previewsGrid.classList.remove('hidden');
          }
          document.getElementById('file1-status').innerText = "📷 已保留原有照片 1";
        }
        if (urls[1]) {
          document.getElementById('post-img2-url').value = urls[1];
          if (previewImg2 && preview2) {
            previewImg2.src = urls[1];
            preview2.classList.remove('hidden');
            if (previewsGrid) previewsGrid.classList.remove('hidden');
          }
          document.getElementById('file2-status').innerText = "📷 已保留原有照片 2";
        }
      }

      // Adjust UI Title and Buttons
      document.querySelector('#create-modal h3').innerHTML = `<i class="fa-solid fa-pen-to-square text-indigo-400"></i> 修改告示牌貼文`;
      document.getElementById('submit-create-btn').innerText = `💾 儲存修改`;

      // Open Modal
      document.getElementById('create-modal').classList.remove('hidden');
    }


    async function submitCreateItem() {
      const errorBox = document.getElementById('create-modal-error');
      const errorText = document.getElementById('create-modal-error-text');
      const submitBtn = document.getElementById('submit-create-btn');

      if (errorBox) errorBox.classList.add('hidden');

      const titleInput = document.getElementById('post-title');
      let title = (titleInput?.value || '').trim();
      const desc = (document.getElementById('post-desc')?.value || '').trim();
      const isSwap = document.getElementById('post-swap-check')?.checked;
      let finalPrice = '';
      if (isSwap) {
        const swapItem = (document.getElementById('post-swap-item')?.value || '').trim();
        finalPrice = `swap:${swapItem || '以物易物'}`;
      } else if (postType === 'free') {
        finalPrice = '0';
      } else {
        const pVal = (document.getElementById('post-price')?.value || '').trim();
        finalPrice = pVal || '0';
      }
      const contactInput = document.getElementById('post-contact');
      const contact = (contactInput?.value || '').trim();
      const imgUrl1 = (document.getElementById('post-img1-url')?.value || '').trim();
      const imgUrl2 = (document.getElementById('post-img2-url')?.value || '').trim();
      const expDays = document.getElementById('item-expiration')?.value || 'none';
      const editPasswordVal = (document.getElementById('post-edit-password')?.value || '').trim();

      // 1. 檢查物品標題
      if (!title) {
        if (titleInput) {
          titleInput.classList.add('border-red-500');
          titleInput.focus();
        }
        showCreateError('⚠️ 請填寫物品名稱/標題！');
        return;
      } else if (titleInput) {
        titleInput.classList.remove('border-red-500');
      }

      // 2. 檢查照片上傳 (至少 1 張)
      if (!imgUrl1) {
        showCreateError('⚠️ 請至少選擇並上傳 1 張物品照片才可以發布貼文！');
        return;
      }

      // 3. 檢查聯絡方式 (必填欄位)
      if (!contact) {
        if (contactInput) {
          contactInput.classList.add('border-red-500');
          contactInput.focus();
        }
        showCreateError('⚠️ 請填寫聯絡方式 (例如：分機 45555 / LINE / Teams)！');
        return;
      } else if (contactInput) {
        contactInput.classList.remove('border-red-500');
      }

      // 4. 檢查編輯密碼
      if (!editPasswordVal) {
        showCreateError('⚠️ 請輸入管理/編輯密碼，以便更換電腦時編輯或下架貼文！');
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 處理中...';
      }

      const finalImgUrl = imgUrl2 ? `${imgUrl1},${imgUrl2}` : imgUrl1;

      // 如果有設定下架天數，將到期時間戳標記編碼於說明中
      let finalDesc = desc;
      if (expDays !== 'none' && !editingItemId) {
        const d = new Date();
        d.setDate(d.getDate() + parseInt(expDays, 10));
        finalDesc = `${desc}\n[EXP:${d.toISOString()}]`;
      }

      try {
        if (editingItemId) {
          // UPDATE MODE
          const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/update_item_secured`, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              item_id: editingItemId,
              new_title: title,
              new_price: finalPrice,
              new_type: postType,
              new_contact_info: contact,
              new_description: finalDesc,
              new_image_url: finalImgUrl,
              device_id_input: deviceId,
              pwd_input: editPasswordVal,
              admin_pwd_input: localStorage.getItem('pega_admin_hash') || ''
            })
          });

          if (res.ok) {
            const success = await res.json();
            if (success) {
              // Cache password locally
              const myPasswords = JSON.parse(localStorage.getItem('pega_my_post_passwords') || '{}');
              myPasswords[editingItemId] = editPasswordVal;
              localStorage.setItem('pega_my_post_passwords', JSON.stringify(myPasswords));

              showNotification('✏️ 貼文已成功儲存更新！', 'success');
              closeCreateModal();
              closeDetailModal();
              await loadItems();
            } else {
              showCreateError('⚠️ 修改失敗：密碼驗證錯誤，您無權修改此貼文。');
            }
          } else {
            const err = await res.json();
            showCreateError('⚠️ 修改發生錯誤：' + (err.message || '伺服器拒絕更新'));
          }
        } else {
          // CREATE MODE
          const payload = {
            title: title,
            description: finalDesc,
            price: finalPrice,
            type: postType,
            image_url: finalImgUrl,
            nickname: nickname,
            device_id: deviceId,
            contact_info: contact,
            edit_password: editPasswordVal
          };

          const postRes = await fetch(`${SUPABASE_URL}/rest/v1/items?select=id`, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify(payload)
          });

          if (postRes.ok) {
            let newItemId = null;
            const createdItems = await postRes.json();
            if (createdItems && createdItems.length > 0) {
              newItemId = createdItems[0].id;
              let myItems = JSON.parse(localStorage.getItem('my_created_item_ids') || '[]');
              myItems.push(newItemId);
              localStorage.setItem('my_created_item_ids', JSON.stringify(myItems));

              const myPasswords = JSON.parse(localStorage.getItem('pega_my_post_passwords') || '{}');
              myPasswords[newItemId] = editPasswordVal;
              localStorage.setItem('pega_my_post_passwords', JSON.stringify(myPasswords));

              alert(`🎉 貼文發布成功！\n\n您的 4 位數「編輯與下架密碼」為：${editPasswordVal}\n\n（本機已自動為您記住此密碼。若日後更換電腦或手機，請憑此密碼修改或下架貼文，建議將其妥善保存喔！）`);
            }

            showNotification('🎉 刊登成功！貼文已即時發布。', 'success');
            closeCreateModal();
            
            // Reset form
            if (titleInput) titleInput.value = '';
            const descInput = document.getElementById('post-desc');
            if (descInput) descInput.value = '';
            const priceInput = document.getElementById('post-price');
            if (priceInput) priceInput.value = '';
            if (contactInput) contactInput.value = '';
            const swapCheck = document.getElementById('post-swap-check');
            if (swapCheck) {
              swapCheck.checked = false;
              toggleSwapMode(false);
            }
            const swapInput = document.getElementById('post-swap-item');
            if (swapInput) swapInput.value = '';
            
            const hidden1 = document.getElementById('post-img1-url');
            if (hidden1) hidden1.value = '';
            const hidden2 = document.getElementById('post-img2-url');
            if (hidden2) hidden2.value = '';

            const status1 = document.getElementById('file1-status');
            if (status1) status1.innerText = '點擊上傳圖檔';
            const status2 = document.getElementById('file2-status');
            if (status2) status2.innerText = '點擊上傳第二張';

            const previewsGrid = document.getElementById('upload-previews-grid');
            if (previewsGrid) previewsGrid.classList.add('hidden');

            await loadItems();
            window.scrollTo({ top: 0, behavior: 'smooth' });

            if (newItemId) {
              setTimeout(() => {
                const cardImg = document.getElementById(`card-img-${newItemId}`);
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
          } else {
            const err = await postRes.json();
            showCreateError('⚠️ 發布失敗：' + (err.message || '伺服器拒絕此貼文'));
          }
        }
      } catch(e) {
        console.error('Submit item error:', e);
        showCreateError('⚠️ 網路連線錯誤，請稍後再試：' + e.message);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerText = editingItemId ? '💾 儲存修改' : '🎉 發布貼文';
        }
      }
    }


    function openAdminModal() {
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

    function closeAdminModal() { document.getElementById('admin-modal').classList.add('hidden'); }

                
    function setFontSize(level, showToast = true) {
      const levels = ['sm', 'base', 'lg', 'xl'];
      if (!levels.includes(level)) level = 'base';

      // 移除舊字體等級，套用新字體等級
      document.documentElement.classList.remove('font-level-sm', 'font-level-base', 'font-level-lg', 'font-level-xl');
      document.documentElement.classList.add(`font-level-${level}`);

      // 更新按鈕高亮狀態
      levels.forEach(l => {
        const btn = document.getElementById(`font-btn-${l}`);
        if (btn) {
          if (l === level) {
            btn.className = 'px-2 py-1 rounded-lg text-xs font-black transition bg-indigo-600 text-white shadow';
          } else {
            btn.className = 'px-2 py-1 rounded-lg text-xs font-bold transition text-gray-400 hover:text-white hover:bg-gray-800';
          }
        }
      });

      // 儲存至本機設定
      localStorage.setItem('pega_user_font_size', level);
      if (showToast) {
        showNotification(`🔤 字體大小已切換為：${level === 'sm' ? '小 (A⁻)' : level === 'base' ? '標準 (A)' : level === 'lg' ? '大 (A⁺)' : '特大 (A⁺⁺)'}`, 'info');
      }
    }

    function initFontSize() {
      const savedLevel = localStorage.getItem('pega_user_font_size') || 'base';
      setFontSize(savedLevel, false);
    }

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

    async function sha256(str) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

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


    function logoutAdmin() {
      isAdmin = false;
      localStorage.setItem('pega_is_admin', 'false');
      localStorage.removeItem('pega_admin_hash');
      document.getElementById('admin-btn-text').innerText = '後台管理';
      closeAdminModal();
      showNotification('已登出版主權限', 'info');
      renderItems();
    }

    async function deleteMyItem(itemId) {
      const item = allItems.find(i => i.id === itemId);
      if (!item) return;

      const isSold = isItemSold(item);

      // Determine ownership/authorization
      const myItems = JSON.parse(localStorage.getItem('my_created_item_ids') || '[]');
      const myPasswords = JSON.parse(localStorage.getItem('pega_my_post_passwords') || '{}');
      const cachedPwd = myPasswords[itemId] || "";
      const isOwner = (item.device_id === deviceId) || myItems.includes(itemId) || (cachedPwd !== "");

      let finalPwd = cachedPwd;

      // Prompt if not owner and not admin
      if (!isOwner && !isAdmin) {
        const userPwd = prompt('本裝置無此貼文的下架憑證。\n請輸入該貼文的 4 位數密碼（或版主管理密碼）：');
        if (!userPwd) return; // user cancelled
        finalPwd = userPwd.trim();
      }

      // Check confirm
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
              dev_id: deviceId,
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
            dev_id: deviceId,
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

    async function toggleItemSoldState(itemId) {
      const item = allItems.find(i => i.id === itemId);
      if (!item) return;

      const myItems = JSON.parse(localStorage.getItem('my_created_item_ids') || '[]');
      const isOwner = (item.device_id === deviceId) || myItems.includes(item.id);
      const hasPermission = isOwner || isAdmin;

      if (!hasPermission) {
        return showNotification('⚠️ 只有該貼文的發布同仁或版主可以標記「已售出」喔！', 'warning');
      }

      const isSold = isItemSold(item);

      // ⚠️ Toggling Confirmation Prompt
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
            body: JSON.stringify({ item_uuid: itemId, dev_id: deviceId, new_desc: newDesc })
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

    async function saveTransactionLog(item, soldTimeStr) {
      // Automatic transaction logging is now handled by the database trigger: trigger_log_transaction
    }

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
          showNotification('🗑️ 貼文已成功下架', 'info');
          loadItems();
        } else {
          showNotification('⚠️ 刪除失敗，密碼已失效或過期，請重新登入版主', 'warning');
        }
      } catch(e) {
        console.error('Delete error:', e);
      }
    }

    function openArchiveModal() {
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
        showNotification('⚠️ 權限不足，僅限版主刪除紀錄', 'error');
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
        showNotification(`❌ 刪除失敗：${e.message}`, 'error');
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
        
        allArchiveLogs = rows.map(r => {
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

        renderArchive(allArchiveLogs);
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

      // Reset master checkbox and batch delete button
      const masterCb = document.getElementById('archive-select-all');
      if (masterCb) masterCb.checked = false;
      updateArchiveBatchDeleteUI();

      const colspan = isAdmin ? 7 : 5;
      if (logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${colspan}" class="px-4 py-8 text-center text-gray-400 font-bold">尚無成交或下架存檔紀錄</td></tr>`;
        document.getElementById('archive-stat-count').innerText = '0';
        
        document.getElementById('archive-stat-free').innerText = '0';
        return;
      }

      // Calculate stats
      let totalCount = logs.length;
      let totalSum = 0;
      let freeCount = 0;

      const html = logs.map(log => {
        const titleSafe = (log.title || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const price = log.type === 'free' ? 0 : parseInt(log.price || '0', 10);
        const nicknameSafe = (log.nickname || '匿名同仁').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        
        // Sum values
        if (log.type === 'free') {
          freeCount++;
        } else {
          totalSum += price;
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

      // Update statistics elements
      document.getElementById('archive-stat-count').innerText = totalCount;
      document.getElementById('archive-stat-sum').innerText = `NT$ ${totalSum.toLocaleString()}`;
      document.getElementById('archive-stat-free').innerText = freeCount;
    }

    function filterArchive() {
      const search = (document.getElementById('archive-search')?.value || '').toLowerCase().trim();
      if (!search) {
        renderArchive(allArchiveLogs);
        return;
      }

      const filtered = allArchiveLogs.filter(log => {
        const titleMatch = (log.title || '').toLowerCase().includes(search);
        const nicknameMatch = (log.nickname || '').toLowerCase().includes(search);
        const priceMatch = String(log.price || '').includes(search);
        return titleMatch || nicknameMatch || priceMatch;
      });

      renderArchive(filtered);
    }

    function exportArchiveToTxt() {
      if (allArchiveLogs.length === 0) {
        return showNotification('⚠️ 目前沒有任何成交紀錄可以匯出！', 'warning');
      }

      const searchVal = document.getElementById('archive-search')?.value || '';
      let logsToExport = allArchiveLogs;
      if (searchVal) {
        logsToExport = allArchiveLogs.filter(log => {
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
          totalSum += price;
        }

        const priceText = log.type === 'free' ? 'NT$ 0 (免費)' : `NT$ ${price.toLocaleString()}`;
        const soldDate = log.sold_at ? new Date(log.sold_at).toLocaleString('zh-TW', { hour12: false }) : '未知時間';
        const createDate = log.created_at ? new Date(log.created_at).toLocaleString('zh-TW', { hour12: false }) : '未知時間';

        text += `${index + 1}. 【${typeStr}】${log.title}\n`;
        text += `   - 交易金額：${priceText}\n`;
        text += `   - 刊登同仁：${log.nickname || '匿名同仁'}\n`;
        text += `   - 上架時間：${createDate}\n`;
        text += `   - 成交時間：${soldDate}\n`;
        text += `   - 商品 ID ：${log.id}\n`;
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

    // -------------------------------------------------------------------------
    // 🟢 在線人數與心跳計時服務 (Presence Heartbeat Service - 超精準即時離線與單一裝置去重)
    // -------------------------------------------------------------------------
    async function sendPresenceHeartbeat() {
      if (!deviceId) return;
      try {
        // 先刪除該裝置舊心跳，確保雲端資料庫該裝置永遠只有一筆最新紀錄
        await fetch(`${SUPABASE_URL}/rest/v1/messages?item_id=eq.00000000-0000-0000-0000-000000000012&sender_id=eq.${deviceId}`, {
          method: 'DELETE',
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });

        // 寫入當前最新心跳
        await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            item_id: '00000000-0000-0000-0000-000000000012',
            sender_id: deviceId,
            sender_name: nickname || '訪客',
            content: 'HEARTBEAT'
          })
        });
      } catch(e) {
        console.error('Heartbeat ping error:', e);
      }
      fetchOnlineUsers();
    }

    async function fetchOnlineUsers() {
      try {
        // 精準 35 秒內的活躍心跳判定 (過期即判定為離線)
        const thirtySecsAgo = new Date(Date.now() - 35 * 1000).toISOString();
        const res = await fetch(`${SUPABASE_URL}/rest/v1/messages?item_id=eq.00000000-0000-0000-0000-000000000012&created_at=gte.${thirtySecsAgo}&select=sender_id`, {
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

    // 分頁/視窗關閉時即時發送離線訊號，瞬間扣除人數
    window.addEventListener('beforeunload', () => {
      if (deviceId) {
        navigator.sendBeacon(
          `${SUPABASE_URL}/rest/v1/messages?item_id=eq.00000000-0000-0000-0000-000000000012&sender_id=eq.${deviceId}`,
          null
        );
      }
    });

    sendPresenceHeartbeat();
    setInterval(sendPresenceHeartbeat, 15000); // 每 15 秒同步心跳
    setInterval(fetchOnlineUsers, 10000);       // 每 10 秒刷新人數

    let currentRawNotice = '';

    function refreshAnnouncementDisplay() {
      const textSpan = document.getElementById('announcement-text');
      if (!textSpan) return;
      
      const count = typeof filteredTotalCount !== 'undefined' ? filteredTotalCount : 0;
      const countText = `\n📊 目前刊登物品共 ${count} 件`;
      
      let noticeToDisplay = currentRawNotice;
      if (noticeToDisplay) {
        // Robust cleanup: split by lines, remove lines that contain "目前刊登物品共"
        const lines = noticeToDisplay.split('\n');
        const filteredLines = lines.filter(line => !line.includes('目前刊登物品共'));
        noticeToDisplay = filteredLines.join('\n').trim();
        
        textSpan.innerText = noticeToDisplay + countText;
      }
    }

    async function loadAnnouncement() {
      // 預設的使用須知，帶有漂亮的斷行
      const defaultNotice = '歡迎使用 PEGA 告示牌！匿名二手與尾牙獎品交換平台：\n💡 免登入直接刊登：支援「想買、想賣、免費送」，全新推出「尾牙全新專區」與「以物易物」功能！\n📞 填寫正確聯絡管道：請務必提供分機 或 Teams，方便同仁一鍵複製快速聯繫。\n🤝 成交請及時下架：交易完成後，請務必點選卡片「已售出」或「下架貼文」，讓版面保持乾淨。';
      const textSpan = document.getElementById('announcement-text');
      const adminInput = document.getElementById('admin-announcement-input');
      const bar = document.getElementById('announcement-bar');

      // 優先讀取本機快取的自訂須知，極速反應
      const cachedNotice = localStorage.getItem('pega_custom_announcement');
      const initialNotice = cachedNotice || defaultNotice;

      currentRawNotice = initialNotice;
      refreshAnnouncementDisplay();

      if (adminInput && !adminInput.value) adminInput.value = initialNotice;
      if (bar) bar.classList.remove('hidden');

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

          // Save default template as well
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

    // 設為預設須知範本
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
        
        // 刪除本地快取
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

    function closeAnnouncementBar() { document.getElementById('announcement-bar').classList.add('hidden'); }

    
    function switchIssueTab(tab) {
      const formView = document.getElementById('issue-view-form');
      const listView = document.getElementById('issue-view-list');
      const formTabBtn = document.getElementById('issue-tab-form');
      const listTabBtn = document.getElementById('issue-tab-list');

      if (tab === 'form') {
        if (formView) formView.classList.remove('hidden');
        if (listView) listView.classList.add('hidden');
        if (formTabBtn) formTabBtn.className = 'px-4 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs transition shadow flex items-center gap-1.5';
        if (listTabBtn) listTabBtn.className = 'px-4 py-2 rounded-xl bg-gray-800 text-gray-300 hover:text-white border border-gray-700 font-bold text-xs transition flex items-center gap-1.5';
      } else {
        if (formView) formView.classList.add('hidden');
        if (listView) listView.classList.remove('hidden');
        if (formTabBtn) formTabBtn.className = 'px-4 py-2 rounded-xl bg-gray-800 text-gray-300 hover:text-white border border-gray-700 font-bold text-xs transition flex items-center gap-1.5';
        if (listTabBtn) listTabBtn.className = 'px-4 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs transition shadow flex items-center gap-1.5';
        loadAndRenderIssues();
      }
    }

        async function toggleResolveIssue(issueId, isCurrentlyResolved) {
      if (!isAdmin) return showNotification('⚠️ 只有版主可以變更處理狀態', 'warning');
      const pwdHash = localStorage.getItem('pega_admin_hash') || '';
      
      try {
        // Fetch original content
        const fetchRes = await fetch(`${SUPABASE_URL}/rest/v1/messages?id=eq.${issueId}&select=content`, {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        const msgData = await fetchRes.json();
        if (!msgData || msgData.length === 0) return;

        let content = msgData[0].content || '';
        if (isCurrentlyResolved) {
          content = content.replace(/\[RESOLVED\]/g, '').trim();
        } else {
          content = `${content.replace(/\[RESOLVED\]/g, '').trim()}\n[RESOLVED]`;
        }

        const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/resolve_issue_admin`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ issue_id: issueId, new_content: content, pwd_input: pwdHash })
        });

        if (res.ok) {
          showNotification(!isCurrentlyResolved ? '✅ 已標記為【已修復/已開發完成】並自動沉底！' : '⚡ 已標記為處理中', 'success');
          loadAndRenderIssues();
        }
      } catch(e) {
        console.error('Resolve issue error:', e);
      }
    }

    async function deleteIssueAdmin(issueId) {
      if (!isAdmin) return;
      if (!confirm('確定要刪除這筆留言紀錄嗎？')) return;
      try {
        const pwdHash = localStorage.getItem('pega_admin_hash') || '';
        const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/delete_issue_admin`, {
          method: 'POST',
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ issue_id: issueId, pwd_input: pwdHash })
        });
        if (res.ok) {
          showNotification('🗑️ 留言紀錄已刪除', 'info');
          loadAndRenderIssues();
        } else {
          showNotification('⚠️ 刪除留言失敗，密碼已失效，請重新登入版主', 'warning');
        }
      } catch(e) {
        console.error('Delete issue error:', e);
      }
    }

    function openIssueModal() {
      document.getElementById('issue-modal').classList.remove('hidden');
      loadAndRenderIssues();
    }

    function closeIssueModal() { document.getElementById('issue-modal').classList.add('hidden'); }

            async function loadAndRenderIssues() {
      const container = document.getElementById('issue-list-container');
      const badge = document.getElementById('issue-count-badge');
      if (!container) return;

      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/messages?item_id=eq.00000000-0000-0000-0000-000000000002&order=created_at.desc`, {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });

        if (res.ok) {
          const issues = await res.json();
          if (badge) badge.innerText = issues.length;

          if (issues.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-10 text-xs">💬 尚無任何留言歷史紀錄</p>';
            return;
          }

          // 自動清理：回覆並修復超過 1 個月 (30天) 的留言自動進入歷史封存 (隱藏)
          const activeIssues = issues.filter(iss => {
            const cnt = iss.content || '';
            if (cnt.includes('[RESOLVED_AT:')) {
              const m = cnt.match(/\[RESOLVED_AT:(.*?)\]/);
              if (m && m[1]) {
                const resTime = new Date(m[1]);
                const diffMs = new Date() - resTime;
                if (diffMs > 30 * 24 * 60 * 60 * 1000) {
                  return false; // 過期 1 個月自動封存過濾
                }
              }
            }
            return true;
          });

          if (badge) badge.innerText = activeIssues.length;

          if (activeIssues.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-10 text-xs">💬 尚無待處理的同仁留言反饋</p>';
            return;
          }

          // 處理中排在前面，已修復沉底在最後面
          activeIssues.sort((a, b) => {
            const aResolved = (a.content || '').includes('[RESOLVED]') ? 1 : 0;
            const bResolved = (b.content || '').includes('[RESOLVED]') ? 1 : 0;
            return aResolved - bResolved;
          });

          container.innerHTML = activeIssues.map(iss => {
            const isResolved = (iss.content || '').includes('[RESOLVED]');
            const fullContent = iss.content || '';
            
            // 提取版主回覆
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

            const safeUserText = cleanUserText.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            const safeReplyText = replyText.replace(/</g, "&lt;").replace(/>/g, "&gt;");

            return `
              <div class="p-3.5 ${isResolved ? 'bg-gray-950/60 opacity-80 border-gray-800/60' : 'bg-gray-900 border-gray-700/80'} border rounded-2xl space-y-2 transition">
                <div class="flex items-center justify-between text-xs">
                  <span class="font-bold text-gray-200 flex items-center gap-1.5">
                    <i class="fa-solid fa-circle-user text-amber-400"></i> ${iss.sender_name || '熱心同仁'} 
                    ${isResolved ? 
                      '<span class="bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 text-xs font-bold px-2 py-0.5 rounded-md">✅ 版主已回覆並處理完成 (滿1個月將自動歸檔)</span>' : 
                      '<span class="bg-amber-950/80 text-amber-400 border border-amber-500/40 text-xs font-bold px-2 py-0.5 rounded-md animate-pulse">⚡ 處理中 / 待版主回覆</span>'}
                  </span>
                  <span class="text-xs text-gray-500">${timeAgo(iss.created_at)}</span>
                </div>

                <div class="text-xs text-gray-200 leading-relaxed font-medium bg-black/30 p-3 rounded-xl border border-white/5 whitespace-pre-line">
                  ${safeUserText}
                </div>

                ${safeReplyText ? `
                  <div class="mt-2 p-2.5 bg-indigo-950/80 border border-indigo-500/40 rounded-xl text-xs text-indigo-200 space-y-1">
                    <div class="font-bold text-indigo-400 flex items-center gap-1.5"><i class="fa-solid fa-shield-halved"></i> 版主回覆與處理說明：</div>
                    <div class="whitespace-pre-line leading-relaxed font-medium text-gray-200">${safeReplyText}</div>
                  </div>
                ` : ''}

                ${isAdmin ? `
                  <div class="flex justify-end gap-1.5 pt-1">
                    <button onclick="toggleResolveIssue('${iss.id}', ${isResolved})" class="px-2.5 py-1 ${isResolved ? 'bg-amber-900/60 text-amber-300' : 'bg-emerald-900/60 text-emerald-300'} text-xs font-bold rounded-lg transition">
                      ${isResolved ? '↩️ 重新編輯回覆/恢復處理中' : '✍️ 版主回覆並標記已處理'}
                    </button>
                    <button onclick="deleteIssueAdmin('${iss.id}')" class="px-2 py-1 bg-red-900/60 text-red-300 text-xs font-bold rounded-lg transition">
                      🗑️ 刪除留言
                    </button>
                  </div>
                ` : ''}
              </div>
            `;
          }).join('');
        }
      } catch(e) {
        console.error('Load issues error:', e);
      }
    }

            async function submitNewIssue() {
      const errBox = document.getElementById('issue-form-error');
      const errText = document.getElementById('issue-form-error-text');
      const submitBtn = document.getElementById('submit-issue-btn');
      if (errBox) errBox.classList.add('hidden');

      const content = (document.getElementById('issue-content')?.value || '').trim();
      if (!content) {
        if (errBox && errText) {
          errText.innerText = '⚠️ 請填寫問題或建議內容！';
          errBox.classList.remove('hidden');
        }
        showNotification('⚠️ 請輸入問題或建議內容', 'warning');
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 送出中...';
      }

      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
          method: 'POST',
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            item_id: '00000000-0000-0000-0000-000000000002',
            sender_id: deviceId,
            sender_name: nickname,
            content: content
          })
        });

        if (res.ok) {
          showNotification('🎉 已收到您的問題單，感謝寶貴建議！', 'success');
          document.getElementById('issue-content').value = '';
          switchIssueTab('list');
        } else {
          const errData = await res.text();
          if (errBox && errText) {
            errText.innerText = '⚠️ 送出失敗：' + (errData || '連線異常');
            errBox.classList.remove('hidden');
          }
          showNotification('⚠️ 送出失敗，請檢查連線', 'warning');
        }
      } catch(e) {
        console.error('Submit issue error:', e);
        if (errBox && errText) {
          errText.innerText = '⚠️ 送出發生錯誤：' + e.message;
          errBox.classList.remove('hidden');
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> 送出問題單';
        }
      }
    }

    // 初始載入
    initFontSize();
    updateIdentityDisplay();
    loadSiteName();
    loadAnnouncement();
    
    // Apply saved grid columns
    const initialCols = localStorage.getItem('pega_grid_cols') || '2';

    function updateGridLayoutOptions() {
      const selectElem = document.getElementById('grid-layout-select');
      if (!selectElem) return;
      
      // 避免視窗初始寬度回報為 0 的 race condition
      const isMobile = window.innerWidth > 0 && window.innerWidth < 640;
      
      // 依裝置讀取對應的快取設定，若無才讀取 general 快取或預設
      const storageKey = isMobile ? 'pega_grid_cols_mobile' : 'pega_grid_cols_pc';
      const savedCols = localStorage.getItem(storageKey) || localStorage.getItem('pega_grid_cols');
      const curVal = savedCols || selectElem.value || initialCols || '2';

      const allOptions = [
        { value: '1', text: '單排 1 卡 (大圖)' },
        { value: '2', text: '雙排 2 卡 (預設)' },
        { value: '3', text: '三排 3 卡' },
        { value: '4', text: '四排 4 卡 (電腦)' },
        { value: '5', text: '五排 5 卡 (寬屏)' }
      ];

      // Mobile only gets 1 and 2
      const filteredOptions = isMobile 
        ? allOptions.filter(opt => parseInt(opt.value, 10) <= 2)
        : allOptions;

      // Rebuild options HTML to physically exclude options > 2 on mobile (fixes iOS Safari selection bug)
      selectElem.innerHTML = filteredOptions.map(opt => {
        return `<option value="${opt.value}">${opt.text}</option>`;
      }).join('');

      // Restore value if available in filtered options, otherwise default to '2' on mobile (but do NOT overwrite cache!)
      const hasVal = filteredOptions.some(opt => opt.value === curVal);
      if (hasVal) {
        selectElem.value = curVal;
        applyGridLayout(curVal); // 這裡必須執行，才能在載入時成功載入快取的排版！
      } else {
        const fallback = isMobile ? '2' : '2';
        selectElem.value = fallback;
        applyGridLayout(fallback);
      }
    }

    // Run layout option checks immediately
    updateGridLayoutOptions();
    window.addEventListener('resize', updateGridLayoutOptions);

    loadItems();
  