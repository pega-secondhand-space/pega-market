/**
 * PEGA 二手匿名交易空間 - 前端畫面渲染與互動邏輯 (js/ui.js)
 */

var postType = 'sell';
var editingItemId = null;
var tempEditPassword = "";
var mobileDisplayLimit = 30;

/**
 * 判斷當前是否為本地 / 內網測試環境 (localhost, 127.0.0.1, 172.20.x, 192.168.x)
 */
function isLocalEnvironment() {
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h.startsWith('172.20.') || h.startsWith('192.168.') || h.startsWith('10.') || window.location.protocol === 'file:';
}

/**
 * 渲染全站商品卡片網格與分頁控制
 */
function renderItems() {
  const grid = document.getElementById('item-grid');
  if (!grid) return;

  itemsPerPage = parseInt(localStorage.getItem('pega_items_per_page') || '40', 10);
  if (isNaN(itemsPerPage) || itemsPerPage < 1) itemsPerPage = 40;

  const searchVal = (document.getElementById('search-input')?.value || '').toLowerCase().trim();
  const isLocalEnv = isLocalEnvironment();

  const filtered = allItems.filter(item => {
    if (item.device_id === 'SYSTEM' || (item.title && item.title.startsWith('SYSTEM_')) || (item.id && item.id.startsWith('00000000-0000-0000-0000-'))) return false;

    // 🛡️ 本地測試資料自動隔離：線上正式環境 (Netlify) 自動過濾並隱藏所有本地測試貼文！
    const isDevItem = (item.device_id && item.device_id.startsWith('DEV_')) || 
                      (item.description && item.description.includes('[DEV_TEST]')) || 
                      (item.title && item.title.includes('【測試】'));
    if (!isLocalEnv && isDevItem) {
      return false;
    }

    // 已售出逾 24 小時過期檢查 (僅前端過濾顯示)
    if (isItemSold(item)) {
      const soldTime = getItemSoldTime(item);
      if (soldTime) {
        const diffMs = new Date() - soldTime;
        if (diffMs > 24 * 60 * 60 * 1000) {
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
        return false;
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

  // 排序：未售出置頂 > 未售出一般 (最新優先) > 已售出 (沉底)
  filtered.sort((a, b) => {
    const aSold = isItemSold(a) ? 1 : 0;
    const bSold = isItemSold(b) ? 1 : 0;
    if (aSold !== bSold) {
      return aSold - bSold;
    }

    const aPinned = globalPinnedIds.includes(a.id) ? 1 : 0;
    const bPinned = globalPinnedIds.includes(b.id) ? 1 : 0;
    if (aPinned !== bPinned) {
      return bPinned - aPinned;
    }

    const aTime = new Date(a.created_at || 0);
    const bTime = new Date(b.created_at || 0);
    return bTime - aTime;
  });

  filteredTotalCount = filtered.length;
  const totalPages = Math.ceil(filteredTotalCount / itemsPerPage) || 1;
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  // 頂部導航列總筆數膠囊更新
  const headerTotalElem = document.getElementById('header-total-items-count');
  if (headerTotalElem) {
    headerTotalElem.innerText = filteredTotalCount;
  }

  // 分頁 UI 更新
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

  if (numSpan) {
    let btnHtml = '';
    for (let p = 1; p <= totalPages; p++) {
      if (p === currentPage) {
        btnHtml += `<button class="px-3.5 py-1.5 bg-indigo-600 text-white font-black rounded-xl text-xs sm:text-sm shadow-md">${p}</button>`;
      } else {
        btnHtml += `<button onclick="goToPage(${p})" class="px-3.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl text-xs sm:text-sm transition">${p}</button>`;
      }
    }
    numSpan.innerHTML = btnHtml;
  }

  if (btnFirst) btnFirst.disabled = (currentPage === 1);
  if (btnPrev) btnPrev.disabled = (currentPage === 1);
  if (btnNext) btnNext.disabled = (currentPage === totalPages);
  if (btnLast) btnLast.disabled = (currentPage === totalPages);

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full py-16 px-4 text-center space-y-4 animate-fadeIn">
        <div class="w-16 h-16 rounded-3xl bg-indigo-950/80 border border-indigo-500/30 flex items-center justify-center text-3xl mx-auto shadow-inner">
          🔍
        </div>
        <div class="space-y-1.5">
          <h4 class="text-base sm:text-lg font-black text-gray-200">找不到相符的好物貼文</h4>
          <p class="text-xs sm:text-sm text-gray-400 max-w-sm mx-auto">可以嘗試搜尋其他關鍵字、切換分類，或是成為第一位刊登此好物的同仁！</p>
        </div>
        <div class="flex items-center justify-center gap-3 pt-2">
          <button onclick="refreshPageData()" class="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 rounded-xl text-xs font-bold transition active:scale-95 flex items-center gap-1.5 shadow-sm">
            <i class="fa-solid fa-rotate-left"></i> 清除篩選重設
          </button>
          <button onclick="openCreateModal()" class="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition active:scale-95 flex items-center gap-1.5 shadow-lg">
            <i class="fa-solid fa-plus"></i> 我要立即刊登
          </button>
        </div>
      </div>
    `;
    const allLoaded = document.getElementById('mobile-all-loaded-text');
    if (allLoaded) allLoaded.classList.add('hidden');
    return;
  }

  const isLandscape = (window.orientation === 90 || window.orientation === -90) || (window.innerWidth > window.innerHeight && window.innerWidth < 1100);
  const isMobile = window.innerWidth < 640 || isLandscape;

  let pageItems = [];
  if (isMobile) {
    pageItems = filtered.slice(0, mobileDisplayLimit);
    const spinner = document.getElementById('mobile-loading-spinner');
    const allLoaded = document.getElementById('mobile-all-loaded-text');
    if (spinner) spinner.classList.add('hidden');
    if (allLoaded) {
      if (mobileDisplayLimit >= filtered.length) {
        allLoaded.innerText = `✨ 已顯示全部 ${filtered.length} 件好物 ✨`;
        allLoaded.classList.remove('hidden');
      } else {
        allLoaded.classList.add('hidden');
      }
    }
  } else {
    const startIndex = (currentPage - 1) * itemsPerPage;
    pageItems = filtered.slice(startIndex, startIndex + itemsPerPage);
  }

  grid.innerHTML = pageItems.map((item, idx) => {
    const isSold = isItemSold(item);
    const isPinned = globalPinnedIds.includes(item.id);
    
    // 淨化標題：自動剔除多餘重疊的【想賣】、【想買】、【免費送】、【尾牙】等字眼前綴
    const rawTitle = item.title || '無標題';
    const cleanTitle = rawTitle.replace(/^【.*?】|^\[.*?\]|^\(.*?\)|\s*-\s*【.*?】/, '').trim() || rawTitle;
    const safeTitle = escapeHtml(cleanTitle);
    
    const cleanDescText = getCleanDescription(item.description);
    const safeDesc = escapeHtml(cleanDescText);
    const contactStr = item.contact_info || item.contact || '';
    const safeContact = escapeHtml(contactStr);
    const safeNickname = escapeHtml(item.nickname || '同仁');

    const typeBadge = item.type === 'free' ? '<span class="bg-emerald-500 text-gray-950 font-black px-2 py-0.5 rounded-md shadow-md badge-dynamic-font">🎁 免費送</span>' :
                      item.type === 'buy' ? '<span class="bg-amber-500 text-gray-950 font-black px-2 py-0.5 rounded-md shadow-md badge-dynamic-font">🔍 想買</span>' :
                      item.type === 'lucky' ? '<span class="bg-rose-500 text-white font-black px-2 py-0.5 rounded-md shadow-md badge-dynamic-font">🎁 尾牙</span>' :
                      '<span class="bg-indigo-500 text-white font-black px-2 py-0.5 rounded-md shadow-md badge-dynamic-font">💰 想賣</span>';
    
    let priceDisplay = '';
    if (item.price && String(item.price).startsWith('swap:')) {
      const swapVal = String(item.price).replace('swap:', '');
      priceDisplay = `<span class="text-rose-400 font-black flex items-center gap-1 text-xs sm:text-base"><i class="fa-solid fa-arrows-rotate text-[10px]"></i> 換：${escapeHtml(swapVal) || '未指定'}</span>`;
    } else if (item.type === 'free') {
      priceDisplay = 'NT$ 0 (免費送)';
    } else {
      const numPrice = parseFloat(item.price);
      priceDisplay = isNaN(numPrice) ? `NT$ ${escapeHtml(item.price)}` : `NT$ ${numPrice.toLocaleString()}`;
    }

    let expCountdownHtml = '';
    if (isSold) {
      const soldTime = getItemSoldTime(item);
      if (soldTime) {
        const remainingMs = (24 * 60 * 60 * 1000) - (new Date() - soldTime);
        const remainingHours = Math.max(0, Math.floor(remainingMs / (1000 * 60 * 60)));
        const remainingMins = Math.max(0, Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60)));
        if (remainingMs <= 0) {
          expCountdownHtml = `<span class="text-rose-400 font-bold text-[10px] sm:text-xs">⏳ 即將自動移入成交庫</span>`;
        } else if (remainingHours > 0) {
          expCountdownHtml = `<span class="text-gray-400 font-bold text-[10px] sm:text-xs">⏳ 售出剩 ${remainingHours}小時${remainingMins}分 下架</span>`;
        } else {
          expCountdownHtml = `<span class="text-amber-400 font-bold animate-pulse text-[10px] sm:text-xs">⏳ 售出剩 ${remainingMins}分鐘 下架</span>`;
        }
      } else {
        expCountdownHtml = `<span class="text-gray-400 font-bold text-[10px] sm:text-xs">⏳ 已售出 (24小時下架)</span>`;
      }
    } else {
      expCountdownHtml = getExpirationCountdown(getItemExpiration(item));
    }

    const isMobileDevice = window.innerWidth < 768;
    const storageKey = isMobileDevice ? 'pega_grid_cols_mobile' : 'pega_grid_cols_pc';
    let activeLayout = localStorage.getItem(storageKey);
    if (isMobileDevice) {
      if (!activeLayout || activeLayout !== '2') {
        activeLayout = 'showcase';
        localStorage.setItem(storageKey, 'showcase');
      }
    } else {
      if (!activeLayout || !['2', '3', '4'].includes(activeLayout)) activeLayout = '3';
    }
    const isShowcase = (activeLayout === 'showcase');
    const colsNum = isShowcase ? 1 : (parseInt(activeLayout, 10) || (isMobileDevice ? 2 : 3));
    const dividerHtml = '';

    const isFloatLeft = ((idx % colsNum) >= (colsNum / 2));
    const bubbleClass = isFloatLeft ? 'right-full mr-4' : 'left-full ml-4';
    const arrowClass = isFloatLeft ? 
      'absolute top-6 -right-2 w-3.5 h-3.5 bg-indigo-950 border-r-2 border-t-2 border-indigo-500 rotate-45 z-10' : 
      'absolute top-6 -left-2 w-3.5 h-3.5 bg-indigo-950 border-l-2 border-b-2 border-indigo-500 rotate-45 z-10';

    const photos = (item.image_url || '').split('|||').map(s => s.trim()).filter(Boolean);
    const p1 = photos[0] || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop';
    const p2 = photos[1] || '';

    const typeShortText = item.type === 'free' ? '免費送' : item.type === 'buy' ? '想買' : item.type === 'lucky' ? '尾牙' : '想賣';
    const typeColorClass = item.type === 'free' ? 'text-emerald-400' : item.type === 'buy' ? 'text-amber-400' : item.type === 'lucky' ? 'text-rose-400' : 'text-indigo-400';

    let showcaseMediaHtml = '';
    if (photos.length <= 1) {
      showcaseMediaHtml = `
        <div onclick="event.stopPropagation(); openLightboxModal('${escapeJsStr(item.image_url)}', 0)" class="relative aspect-[16/10] w-full bg-gray-950 rounded-2xl overflow-hidden border border-gray-800 cursor-zoom-in group shadow-inner ${isSold ? 'grayscale contrast-90' : ''}" title="點擊放大照片">
          <img src="${p1}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop';" class="w-full h-full object-cover block group-hover:scale-105 transition-transform duration-300">
          <span class="absolute bottom-2 right-2 bg-black/75 text-amber-300 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-white/20 shadow flex items-center gap-1"><i class="fa-solid fa-expand text-[9px]"></i> 點擊放大全圖</span>
        </div>
      `;
    } else if (photos.length === 2) {
      showcaseMediaHtml = `
        <div class="grid grid-cols-2 gap-2 aspect-[16/10] w-full rounded-2xl overflow-hidden bg-gray-950 border border-gray-800 shadow-inner ${isSold ? 'grayscale contrast-90' : ''}">
          <div onclick="event.stopPropagation(); openLightboxModal('${escapeJsStr(item.image_url)}', 0)" class="w-full h-full cursor-zoom-in relative group overflow-hidden" title="點擊放大第 1 張照片">
            <img src="${p1}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop';" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
            <span class="absolute bottom-2 right-2 bg-black/75 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-lg border border-white/20 shadow"><i class="fa-solid fa-expand text-[9px]"></i> 1/2 放大</span>
          </div>
          <div onclick="event.stopPropagation(); openLightboxModal('${escapeJsStr(item.image_url)}', 1)" class="w-full h-full cursor-zoom-in relative group overflow-hidden" title="點擊放大第 2 張照片">
            <img src="${p2}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop';" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
            <span class="absolute bottom-2 right-2 bg-black/75 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-lg border border-white/20 shadow"><i class="fa-solid fa-expand text-[9px]"></i> 2/2 放大</span>
          </div>
        </div>
      `;
    } else {
      showcaseMediaHtml = `
        <div class="grid grid-cols-3 gap-2 aspect-[16/8] w-full rounded-2xl overflow-hidden bg-gray-950 border border-gray-800 shadow-inner ${isSold ? 'grayscale contrast-90' : ''}">
          <div onclick="event.stopPropagation(); openLightboxModal('${escapeJsStr(item.image_url)}', 0)" class="w-full h-full cursor-zoom-in relative group overflow-hidden" title="點擊放大第 1 張照片">
            <img src="${photos[0]}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
            <span class="absolute bottom-1.5 right-1.5 bg-black/75 text-amber-300 text-[9px] font-bold px-1.5 py-0.5 rounded border border-white/20 shadow">1/${photos.length}</span>
          </div>
          <div onclick="event.stopPropagation(); openLightboxModal('${escapeJsStr(item.image_url)}', 1)" class="w-full h-full cursor-zoom-in relative group overflow-hidden" title="點擊放大第 2 張照片">
            <img src="${photos[1]}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
            <span class="absolute bottom-1.5 right-1.5 bg-black/75 text-amber-300 text-[9px] font-bold px-1.5 py-0.5 rounded border border-white/20 shadow">2/${photos.length}</span>
          </div>
          <div onclick="event.stopPropagation(); openLightboxModal('${escapeJsStr(item.image_url)}', 2)" class="w-full h-full cursor-zoom-in relative group overflow-hidden" title="點擊放大照片">
            <img src="${photos[2]}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
            <span class="absolute bottom-1.5 right-1.5 bg-black/75 text-amber-300 text-[9px] font-bold px-1.5 py-0.5 rounded border border-white/20 shadow">${photos.length > 3 ? `+${photos.length - 2} 圖` : `3/${photos.length}`}</span>
          </div>
        </div>
      `;
    }

    // 🍎 Apple 官網階差式沉浸大卡 (Showcase Mode - 支援 5 級動態字級與售出黑白沈浸)
    const showcaseCardHtml = `
      <div onclick="openDetailModal('${item.id}')" class="apple-step-card p-4 sm:p-7 relative overflow-hidden transition-all duration-300 active:scale-[0.99] cursor-pointer shadow-2xl group text-left ${isSold ? 'grayscale opacity-75 contrast-90 border-2 border-gray-700 bg-gray-950/80' : 'border-2 border-amber-500/45 hover:border-amber-500/80'}">
        <div class="relative z-10 space-y-3.5">
          <!-- 頂部資訊列：階差編號徽章 + 頭像/暱稱 + 分類徽章 + 時間 + 售出打勾 -->
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <span class="px-2 py-0.5 rounded-md ${isSold ? 'bg-gray-800 text-gray-400 border border-gray-700' : 'bg-gradient-to-r from-amber-500 to-yellow-400 text-gray-950'} font-black text-[11px] shadow">
                ${isSold ? '已售出' : `NO. ${String(idx + 1).padStart(2, '0')}`}
              </span>
              <div class="w-7 h-7 rounded-full ${isSold ? 'bg-gray-800 text-gray-400' : 'bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white'} flex items-center justify-center text-xs font-black shadow-md shrink-0">
                ${safeNickname.slice(0, 1) || '同'}
              </div>
              <div class="flex items-center gap-1.5 min-w-0">
                <span class="font-black text-gray-100 truncate showcase-meta-font">${safeNickname}</span>
                ${typeBadge}
              </div>
              <div class="text-gray-400 font-medium showcase-meta-font text-[10px] hidden sm:inline">· ${timeAgo(item.created_at)}</div>
            </div>

            <div class="flex items-center gap-2 shrink-0" onclick="event.stopPropagation()">
              ${(isPinned && !isSold) ? '<span class="showcase-meta-font bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-lg font-black border border-amber-500/40 shadow-sm text-[10px]">📌 置頂</span>' : ''}
              <button onclick="toggleItemSoldState('${item.id}')" 
                      class="w-8 h-8 rounded-full border shadow flex items-center justify-center transition active:scale-90 font-bold text-xs 
                      ${isSold ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-gray-900 border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'}"
                      title="${isSold ? '標記為未售出' : '標記為已售出'}">
                <i class="fa-solid ${isSold ? 'fa-check-double' : 'fa-check'} text-xs"></i>
              </button>
            </div>
          </div>

          <!-- 標題與描述 (字體動態聯動) -->
          <div class="space-y-1">
            <h3 class="font-black text-gray-100 leading-snug break-words showcase-title-font" title="${safeTitle}">
              ${isSold ? '<span class="text-gray-400 font-black">【已售出】</span>' : ''}${safeTitle}
            </h3>
            ${safeDesc ? `<p class="text-gray-300 leading-relaxed font-medium line-clamp-3 showcase-desc-font">${safeDesc}</p>` : ''}
          </div>

          <!-- 滿版大圖 (點擊燈箱放大) -->
          ${showcaseMediaHtml}

          <!-- 底部階差標價 ＋ 一鍵複製直貼 / 售出下架倒數 (動態大字體) -->
          <div class="pt-2 border-t border-gray-800/80 flex items-center justify-between gap-3 relative z-10">
            <div>
              <span class="text-[9px] text-gray-500 font-bold uppercase tracking-wider block">${isSold ? 'STATUS' : 'PRICE'}</span>
              <div class="font-black ${isSold ? 'text-gray-400 line-through' : 'bg-gradient-to-r from-yellow-100 via-amber-300 to-yellow-500 bg-clip-text text-transparent'} showcase-price-font">${priceDisplay}</div>
              <div class="mt-0.5">${expCountdownHtml}</div>
            </div>

            <div class="flex items-center gap-2" onclick="event.stopPropagation()">
              ${(safeContact && !isSold) ? `
                <button onclick="copyContactForItem('${item.id}')" class="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-950 font-black rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 transition flex items-center gap-1.5 showcase-meta-font">
                  <i class="fa-regular fa-copy"></i> 聯絡複製
                </button>
              ` : ''}
              <button onclick="openDetailModal('${item.id}')" class="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-gray-300 font-bold rounded-xl border border-gray-700 active:scale-95 transition showcase-meta-font">
                詳情 <i class="fa-solid fa-chevron-right text-[9px]"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- 🌟 巨大沉浸金色/灰階數字 (01, 02, 03...) - 移至卡片右下底層，醒目大氣且 100% 絕不蓋到文字 -->
        <div class="step-watermark-num absolute right-2 -bottom-2 sm:-bottom-3 pointer-events-none z-0 select-none ${isSold ? 'opacity-20' : ''}">${String(idx + 1).padStart(2, '0')}</div>
      </div>
    `;

    const mobileCardHtml = `
      <!-- 📱 手機端 (雙排方格風格：支援 2 行標題完整可讀與點擊放大) -->
      <div onclick="openDetailModal('${item.id}')" class="threads-card-item block relative aspect-square bg-gray-950 rounded-2xl overflow-hidden shadow-lg border ${isSold ? 'grayscale opacity-60 border-gray-800' : isPinned ? 'border-amber-500 shadow-amber-500/10' : 'border-gray-800 active:scale-95'} transition cursor-pointer">
        ${(isPinned && !isSold) ? '<div class="absolute top-0 inset-x-0 bg-amber-500 text-gray-950 text-[9px] font-black py-0.5 text-center z-10">📌 官方置頂</div>' : ''}
        
        <img data-card-img-id="${item.id}" src="${p1}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop';" class="w-full h-full object-cover block">
        
        <!-- 左上角類型徽章 -->
        <div class="absolute top-2 left-2 flex gap-1 z-10">${typeBadge}</div>
        
        <!-- 右上角售出勾選按鈕 -->
        <div class="absolute top-2 right-2 z-20" onclick="event.stopPropagation()">
          <button onclick="toggleItemSoldState('${item.id}')" 
                  class="w-7 h-7 rounded-full border shadow-md flex items-center justify-center transition active:scale-90 font-bold text-xs 
                  ${isSold ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-black/60 border-white/30 text-gray-300 hover:text-white'}"
                  title="${isSold ? '標記為未售出' : '標記為已售出'}">
            <i class="fa-solid ${isSold ? 'fa-check-double' : 'fa-check'} text-xs"></i>
          </button>
        </div>

        ${photos.length > 1 ? `
          <div class="absolute top-2 right-11 bg-black/75 text-amber-300 text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-white/20 shadow z-10">
            📷 ${photos.length}
          </div>
        ` : ''}

        <!-- 底部黑色漸層懸浮文字 (放寬為 line-clamp-2 讓標題更完整) -->
        <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-2.5 pt-10 flex flex-col justify-end pointer-events-none">
          <h3 class="font-black text-white line-clamp-2 leading-snug drop-shadow-md mobile-grid-title-font" title="${safeTitle}">${isSold ? '<span class="text-emerald-400">[已售出] </span>' : ''}${safeTitle}</h3>
          <div class="font-black text-indigo-300 drop-shadow-md mt-0.5 mobile-grid-price-font">${priceDisplay}</div>
        </div>
      </div>
    `;

    const desktopCardHtml = `
      <!-- 💻 電腦端 (經典完整豐富卡片風格) -->
      <div onclick="openDetailModal('${item.id}')" class="flex bg-gray-900 border ${isSold ? 'grayscale opacity-60 border-gray-800' : isPinned ? 'border-amber-500/80 shadow-amber-500/10 shadow-lg' : 'border-gray-800 hover:border-indigo-500/60'} rounded-2xl relative transition ${isSold ? '' : 'group'} cursor-pointer overflow-hidden flex-col justify-between shadow-md">
        ${(isPinned && !isSold) ? '<div class="bg-amber-500 text-gray-950 text-xs font-black px-3 py-1 text-center">📌 官方置頂商品</div>' : ''}
        
        <!-- 卡通對話氣泡 PC Hover 快速預覽 -->
        ${!isSold ? `
          <div class="absolute top-4 ${bubbleClass} w-72 hidden md:group-hover:block bg-indigo-950 border-2 border-indigo-500 p-4 rounded-2xl shadow-[0_15px_35px_rgba(0,0,0,0.9),0_0_20px_rgba(99,102,241,0.5)] pointer-events-none z-50 text-left animate-fadeIn">
            <div class="${arrowClass}"></div>
            <div class="relative z-20 space-y-2">
              <div class="font-black text-indigo-400 text-xs flex items-center gap-1.5"><i class="fa-solid fa-comment-dots text-indigo-300"></i> 物品詳細描述：</div>
              <div class="text-xs text-gray-200 font-semibold leading-relaxed max-h-48 overflow-y-auto break-words whitespace-pre-wrap pr-1 scrollbar-thin scrollbar-thumb-indigo-500">${safeDesc || '同仁未提供詳細描述。'}</div>
              <div class="pt-2 border-t border-gray-800/80 text-xs text-gray-400 font-bold flex items-center justify-between">
                <span>👤 刊登人：${safeNickname}</span>
                <span class="text-indigo-400 font-black">點擊查看詳情 ➔</span>
              </div>
            </div>
          </div>
        ` : ''}

        <div class="relative aspect-video bg-gray-950 overflow-hidden flex items-center justify-center">
          <img data-card-img-id="${item.id}" src="${p1}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop';" class="w-full h-full object-cover ${isSold ? '' : 'group-hover:scale-105'} transition-transform duration-300 block">
          <div class="absolute top-2 left-2 flex gap-1 z-10">${typeBadge}</div>
          
          <!-- 已售出打勾按鈕 -->
          <div class="absolute top-2 right-2 z-20" onclick="event.stopPropagation()">
            <button onclick="toggleItemSoldState('${item.id}')" 
                    class="w-8 h-8 rounded-full border shadow-md flex items-center justify-center transition active:scale-90 font-bold text-xs 
                    ${isSold ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-black/60 border-white/30 text-gray-300 hover:text-white hover:bg-black/80'}"
                    title="${isSold ? '標記為未售出' : '標記為已售出'}">
              <i class="fa-solid ${isSold ? 'fa-check-double' : 'fa-check'} text-sm"></i>
            </button>
          </div>

          ${(photos.length > 1 && !isSold) ? `
            <div class="absolute inset-x-1 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none px-1 z-20">
              <button onclick="event.stopPropagation(); switchCardPhoto('${item.id}', -1)" class="pointer-events-auto bg-black/75 hover:bg-black text-white w-8 h-8 rounded-full text-xs flex items-center justify-center border border-white/20 transition active:scale-90 shadow-md">
                <i class="fa-solid fa-chevron-left"></i>
              </button>
              <button onclick="event.stopPropagation(); switchCardPhoto('${item.id}', 1)" class="pointer-events-auto bg-black/75 hover:bg-black text-white w-8 h-8 rounded-full text-xs flex items-center justify-center border border-white/20 transition active:scale-90 shadow-md">
                <i class="fa-solid fa-chevron-right"></i>
              </button>
            </div>
            <div data-card-photo-badge="${item.id}" class="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-bold px-2 py-0.5 rounded border border-white/20 z-10">
              📷 1/${photos.length}
            </div>
          ` : ''}
        </div>

        <div class="p-4 flex-1 flex flex-col justify-between space-y-3 bg-gray-900/95">
          <div>
            <h3 class="font-black text-gray-100 mb-1.5 ${isSold ? '' : 'group-hover:text-indigo-300'} transition leading-snug break-words whitespace-normal desktop-title-font" title="${safeTitle}">${isSold ? '<span class="text-emerald-400 font-black">【已售出】</span>' : ''}${safeTitle}</h3>
            <p class="desktop-price-font text-indigo-400 font-black">${priceDisplay}</p>
          </div>

          <div class="space-y-2.5 pt-2.5 border-t border-gray-800/80">
            ${(safeContact && !isSold) ? `
              <div onclick="event.stopPropagation(); copyContactForItem('${item.id}')" class="bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/40 p-2.5 rounded-xl text-indigo-200 font-bold flex items-center justify-between gap-2 transition active:scale-95 cursor-pointer shadow-sm desktop-contact-font" title="點擊一鍵複製好物名稱與聯絡方式">
                <div class="flex items-center gap-1.5 min-w-0 flex-1 truncate">
                  <i class="fa-solid fa-phone text-indigo-400 text-xs shrink-0"></i>
                  <span class="truncate">聯絡：${safeContact}</span>
                </div>
                <span class="text-xs bg-indigo-900 text-indigo-300 px-2 py-0.5 rounded shrink-0 font-bold">點擊複製</span>
              </div>
            ` : ''}

            <div class="flex items-center justify-between text-gray-400 font-medium desktop-meta-font">
              <span class="truncate">👤 ${safeNickname}</span>
              <span class="font-bold">${expCountdownHtml}</span>
            </div>
          </div>
        </div>
      </div>
    `;
    
    const cardHtml = isShowcase ? showcaseCardHtml : (isMobileDevice ? mobileCardHtml : desktopCardHtml);
    return cardHtml + dividerHtml;
  }).join('');
}

/**
 * 多照片卡片無限循環切換 (Looping)
 */
function switchCardPhoto(itemId, dir) {
  const item = allItems.find(i => i.id === itemId);
  if (!item || !item.image_url) return;
  const photos = (item.image_url || '').split('|||').map(s => s.trim()).filter(Boolean);
  if (photos.length <= 1) return;

  const imgElems = document.querySelectorAll(`[data-card-img-id="${itemId}"]`);
  if (!imgElems || imgElems.length === 0) return;

  let curIdx = parseInt(imgElems[0].getAttribute('data-photo-idx') || '0', 10);
  if (isNaN(curIdx) || curIdx < 0 || curIdx >= photos.length) curIdx = 0;

  let nextIdx = (dir === 1) ? (curIdx + 1) % photos.length : (curIdx - 1 + photos.length) % photos.length;

  imgElems.forEach(img => {
    img.src = photos[nextIdx];
    img.setAttribute('data-photo-idx', nextIdx);
  });

  const badgeEl = document.querySelector(`[data-card-photo-badge="${itemId}"]`);
  if (badgeEl) {
    badgeEl.innerText = `📷 ${nextIdx + 1}/${photos.length}`;
  }
}

/**
 * 點擊一鍵複製聯絡方式與商品名稱 (方便直接貼到 LINE / Teams)
 * @param {string} contactStr 聯絡資訊
 * @param {string} [titleStr] 商品標題
 * @param {string} [itemId] 商品 ID
 */
function handleContactClick(contactStr, titleStr = '', itemId = '') {
  if (itemId) {
    return copyContactForItem(itemId);
  }
  if (currentDetailItem) {
    return copyContactForItem(currentDetailItem.id);
  }
  const cleanTitle = (titleStr || '').trim();
  const textToCopy = cleanTitle ? `✨【好物洽詢】${cleanTitle}\n📞 聯絡方式：${contactStr}` : contactStr;
  copyTextToClipboard(textToCopy, `📋 已複製好物名稱與聯絡方式！可直接貼到 Teams / LINE`);
}

/**
 * 透過 Item ID 一鍵安全複製完整好物資訊與聯絡資訊 (包含名稱、價格、聯絡方式與專屬連結)
 * @param {string} itemId 商品 ID
 */
function copyContactForItem(itemId) {
  const item = allItems.find(i => i.id === itemId) || currentDetailItem;
  if (!item) return;

  const rawContact = item.contact_info || item.contact || '刊登同仁未留特定聯絡方式';
  const fullTitle = item.title || '好物';
  
  let priceText = '';
  if (item.price && String(item.price).startsWith('swap:')) {
    priceText = `以物易物 (想換：${String(item.price).replace('swap:', '') || '未指定'})`;
  } else if (item.type === 'free') {
    priceText = 'NT$ 0 (同仁愛心免費贈送)';
  } else {
    const numPrice = parseFloat(item.price);
    priceText = isNaN(numPrice) ? `NT$ ${item.price}` : `NT$ ${numPrice.toLocaleString()}`;
  }

  const siteOrigin = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
    ? 'https://pega-exchange.netlify.app'
    : window.location.origin;
  const directLink = `${siteOrigin}/?item_id=${item.id}`;

  const textToCopy = `✨【好物洽詢】${fullTitle}
💰 價格/交換：${priceText}
📞 聯絡方式：${rawContact}
🔗 專屬直達連結：${directLink}`;

  copyTextToClipboard(textToCopy, `📋 已複製【${fullTitle}】之完整洽詢資訊與聯絡方式！可直接貼到 Teams / LINE`);
}

/**
 * 渲染詳情彈窗多照片畫廊 (支援 1~5 張照片互動與燈箱放大)
 */
function renderDetailPhotos(photos) {
  if (!photos) return '';
  const photosArr = (typeof photos === 'string' ? photos.split('|||') : photos).map(s => s.trim()).filter(Boolean);
  if (photosArr.length === 0) return '';
  
  const photosJson = escapeJsStr(photosArr.join('|||'));
  window.currentDetailPhotoIdx = 0;

  if (photosArr.length === 1) {
    return `
      <div onclick="openLightboxModal('${photosJson}', 0)" class="bg-black/90 rounded-2xl overflow-hidden flex items-center justify-center p-1 border border-gray-800 cursor-zoom-in group relative active:scale-98 transition shadow">
        <img src="${photosArr[0]}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop';" class="max-h-80 w-full object-contain rounded-lg">
        <span class="absolute bottom-2 right-2 bg-black/75 text-amber-300 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-white/20 flex items-center gap-1 shadow"><i class="fa-solid fa-expand text-[9px]"></i> 點擊放大原圖</span>
      </div>
    `;
  }

  if (photosArr.length === 2) {
    return `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
        <div onclick="openLightboxModal('${photosJson}', 0)" class="bg-black/90 rounded-2xl overflow-hidden flex items-center justify-center p-1 border border-gray-800 cursor-zoom-in group relative active:scale-98 transition shadow">
          <img src="${photosArr[0]}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop';" class="max-h-72 w-full object-contain rounded-lg">
          <span class="absolute bottom-2 right-2 bg-black/75 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-lg border border-white/20 flex items-center gap-1 shadow"><i class="fa-solid fa-expand text-[9px]"></i> 點擊放大 (1/2)</span>
        </div>
        <div onclick="openLightboxModal('${photosJson}', 1)" class="bg-black/90 rounded-2xl overflow-hidden flex items-center justify-center p-1 border border-gray-800 cursor-zoom-in group relative active:scale-98 transition shadow">
          <img src="${photosArr[1]}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop';" class="max-h-72 w-full object-contain rounded-lg">
          <span class="absolute bottom-2 right-2 bg-black/75 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-lg border border-white/20 flex items-center gap-1 shadow"><i class="fa-solid fa-expand text-[9px]"></i> 點擊放大 (2/2)</span>
        </div>
      </div>
    `;
  }

  // 3~5 張照片：主預覽圖 + 底部縮圖選擇列
  const thumbsHtml = photosArr.map((url, idx) => `
    <div onclick="switchDetailMainPhoto(${idx}, '${photosJson}')" id="detail-thumb-${idx}" class="cursor-pointer aspect-video rounded-xl overflow-hidden border-2 ${idx === 0 ? 'border-amber-400 opacity-100 scale-105' : 'border-gray-700 opacity-60 hover:opacity-100'} transition-all flex-1 min-w-[50px] max-w-[80px] bg-black">
      <img src="${url}" class="w-full h-full object-cover">
    </div>
  `).join('');

  return `
    <div class="space-y-2.5 w-full">
      <div id="detail-main-photo-box" onclick="openLightboxModal('${photosJson}', window.currentDetailPhotoIdx || 0)" class="bg-black/90 rounded-2xl overflow-hidden flex items-center justify-center p-1 border border-gray-800 cursor-zoom-in group relative active:scale-98 transition shadow">
        <img id="detail-main-photo-img" src="${photosArr[0]}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop';" class="max-h-72 w-full object-contain rounded-lg">
        <span id="detail-main-photo-badge" class="absolute bottom-2 right-2 bg-black/75 text-amber-300 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-white/20 flex items-center gap-1 shadow">
          <i class="fa-solid fa-expand text-[9px]"></i> 點擊放大 (1/${photosArr.length})
        </span>
      </div>
      <div class="flex items-center justify-center gap-2 pt-1 overflow-x-auto">
        ${thumbsHtml}
      </div>
    </div>
  `;
}

function switchDetailMainPhoto(idx, photosStr) {
  window.currentDetailPhotoIdx = idx;
  const photos = photosStr.split('|||');
  const mainImg = document.getElementById('detail-main-photo-img');
  const badge = document.getElementById('detail-main-photo-badge');
  if (mainImg && photos[idx]) {
    mainImg.src = photos[idx];
  }
  if (badge) {
    badge.innerHTML = `<i class="fa-solid fa-expand text-[9px]"></i> 點擊放大 (${idx + 1}/${photos.length})`;
  }
  photos.forEach((_, i) => {
    const thumb = document.getElementById('detail-thumb-' + i);
    if (thumb) {
      if (i === idx) {
        thumb.className = "cursor-pointer aspect-video rounded-xl overflow-hidden border-2 border-amber-400 opacity-100 scale-105 transition-all flex-1 min-w-[50px] max-w-[80px] bg-black";
      } else {
        thumb.className = "cursor-pointer aspect-video rounded-xl overflow-hidden border-2 border-gray-700 opacity-60 hover:opacity-100 transition-all flex-1 min-w-[50px] max-w-[80px] bg-black";
      }
    }
  });
}

/**
 * 開啟貼文詳情彈窗 (Modal)
 */
function openDetailModal(itemId) {
  if (typeof closeAllModals === 'function') closeAllModals();
  const item = allItems.find(i => i.id === itemId);
  if (!item) return;

  currentDetailItem = item;

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
      priceDisplay = `🔄 換：${swapVal || '未指定'}`;
      priceElem.className = "font-black detail-price-font text-rose-400 flex items-center gap-1.5";
    } else if (item.type === 'free') {
      priceDisplay = 'NT$ 0 (免費贈送)';
      priceElem.className = "font-black detail-price-font text-emerald-400";
    } else {
      const numPrice = parseFloat(item.price);
      priceDisplay = isNaN(numPrice) ? `NT$ ${item.price}` : `NT$ ${numPrice.toLocaleString()}`;
      priceElem.className = "font-black detail-price-font bg-gradient-to-r from-yellow-100 via-amber-300 to-yellow-500 bg-clip-text text-transparent";
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
    typeBadge.innerHTML = item.type === 'free' ? '<span class="bg-emerald-500 text-gray-950 font-black px-2.5 py-1 rounded-lg badge-dynamic-font shadow">🎁 免費送</span>' :
                          item.type === 'buy' ? '<span class="bg-amber-500 text-gray-950 font-black px-2.5 py-1 rounded-lg badge-dynamic-font shadow">🔍 想買</span>' :
                          item.type === 'lucky' ? '<span class="bg-rose-500 text-white font-black px-2.5 py-1 rounded-lg badge-dynamic-font shadow">🎁 尾牙</span>' :
                          '<span class="bg-indigo-500 text-white font-black px-2.5 py-1 rounded-lg badge-dynamic-font shadow">💰 想賣</span>';
  }

  // 100% 完整照片不裁切呈現 (object-contain)
  if (photosContainer) {
    photosContainer.className = "rounded-2xl overflow-hidden bg-gray-950/90 border border-gray-700/60 p-2 shadow-inner";
    photosContainer.innerHTML = renderDetailPhotos(item.image_url);
  }

  // 發布者/版主管理區塊
  const ownerBox = document.getElementById('detail-owner-action-box');
  const ownerEditBtn = document.getElementById('detail-owner-edit-btn');
  const ownerDeleteBtn = document.getElementById('detail-owner-delete-btn');

  if (ownerBox) {
    ownerBox.classList.remove('hidden');
    
    const myItems = JSON.parse(localStorage.getItem('my_created_item_ids') || '[]');
    const myPasswords = JSON.parse(localStorage.getItem('pega_my_post_passwords') || '{}');
    const hasPasswordSaved = myPasswords[item.id] !== undefined;
    const isRealOwner = (item.device_id === myDeviceId) || myItems.includes(item.id) || hasPasswordSaved;

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

  // 版主專屬操作區塊
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

/**
 * 關閉貼文詳情彈窗
 */
function closeDetailModal() {
  const modal = document.getElementById('detail-modal');
  if (modal) modal.classList.add('hidden');
}

/**
 * 切換分類標籤篩選
 */
function setFilter(f) {
  currentFilter = f;
  ['all', 'sell', 'buy', 'free', 'lucky'].forEach(type => {
    const btn = document.getElementById(`filter-${type}`);
    if (btn) {
      if (type === f) {
        btn.className = 'px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-950 transition shadow-md shadow-amber-500/20 active:scale-95 shrink-0 font-black';
      } else {
        btn.className = 'px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 text-gray-300 hover:text-amber-300 hover:bg-gray-800 transition active:scale-95 shrink-0 font-bold';
      }
    }
  });
  renderItems();
}

function filterItems() {
  renderItems();
}

/**
 * 分頁翻頁控制
 */
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

/**
 * 切換網格排列佈局
 * - 🍎 階差沉浸大卡 (Showcase Mode)
 * - 📱 手機端 (直立與橫向)：單排 1 卡 (Threads 流 / 預設)、雙排 2 卡
 * - 💻 電腦寬屏：支援 1~5 排自由調整與 🍎 階差模式
 */
function changeGridLayout(cols) {
  const isMobile = window.innerWidth < 640 || ('ontouchstart' in window && window.innerWidth < 1024);
  let validCols = cols;
  if (cols !== 'showcase') {
    const maxCols = isMobile ? 2 : 5;
    validCols = Math.min(maxCols, Math.max(1, parseInt(cols, 10) || 2)).toString();
  }
  const storageKey = isMobile ? 'pega_grid_cols_mobile' : 'pega_grid_cols_pc';
  localStorage.setItem(storageKey, validCols);
  localStorage.setItem('pega_grid_cols', validCols);
  applyGridLayout(validCols);
  renderItems();
}

function applyGridLayout(cols) {
  const container = document.getElementById('grid-container');
  const grid = document.getElementById('item-grid');
  if (!container || !grid) return;

  const isMobile = window.innerWidth < 640 || ('ontouchstart' in window && window.innerWidth < 1024);

  // 同步手機膠囊按鈕 active 樣式 (階差大卡 / 雙排)
  const btnShowcase = document.getElementById('layout-btn-showcase');
  const btn2 = document.getElementById('layout-btn-2');

  const activeStyle = 'px-3 py-1.5 rounded-lg text-xs font-black bg-amber-400 text-gray-950 shadow transition flex items-center gap-1';
  const inactiveStyle = 'px-3 py-1.5 rounded-lg text-xs font-bold text-gray-400 hover:text-white transition flex items-center gap-1';

  if (btnShowcase) btnShowcase.className = (cols === 'showcase') ? activeStyle : inactiveStyle;
  if (btn2) btn2.className = (cols === '2') ? activeStyle : inactiveStyle;

  if (cols === 'showcase') {
    container.className = 'mx-auto max-w-xl sm:max-w-2xl';
    grid.style.display = 'flex';
    grid.style.flexDirection = 'column';
    grid.style.gap = isMobile ? '1.25rem' : '1.75rem';
    return;
  }

  const numCols = isMobile ? Math.min(2, parseInt(cols, 10) || 2) : (parseInt(cols, 10) || 2);

  const maxWMap = {
    '1': 'max-w-md sm:max-w-xl',
    '2': 'max-w-2xl sm:max-w-4xl',
    '3': 'max-w-5xl',
    '4': 'max-w-7xl',
    '5': 'max-w-full'
  };

  container.className = `mx-auto ${maxWMap[numCols] || 'max-w-2xl'}`;
  
  grid.style.display = 'grid';
  grid.style.flexDirection = '';
  grid.style.gridTemplateColumns = `repeat(${numCols}, minmax(0, 1fr))`;
  grid.style.gap = isMobile ? '0.65rem' : '1.5rem';
}

function updateGridLayoutOptions() {
  const select = document.getElementById('grid-layout-select');
  const isMobile = window.innerWidth < 640 || ('ontouchstart' in window && window.innerWidth < 1024);

  const storageKey = isMobile ? 'pega_grid_cols_mobile' : 'pega_grid_cols_pc';
  let activeCols = localStorage.getItem(storageKey);

  if (isMobile) {
    // 📱 手機端首次進入預設：🍎 階差大卡 (Showcase Mode)
    if (!activeCols || activeCols === '1') {
      activeCols = 'showcase';
      localStorage.setItem(storageKey, 'showcase');
    }
  } else {
    // 💻 PC 電腦端首次進入預設：三排 3 卡
    if (!activeCols || !['2', '3', '4'].includes(activeCols)) {
      activeCols = '3';
      localStorage.setItem(storageKey, '3');
    }
  }

  if (select) {
    select.innerHTML = `
      <option value="2">雙排 2 卡</option>
      <option value="3">三排 3 卡 (預設)</option>
      <option value="4">四排 4 卡 (寬螢幕)</option>
    `;
    select.value = activeCols;
  }

  applyGridLayout(activeCols);
  renderItems();
}

/**
 * 刊登類型選擇 (智慧連動價格與琥珀金主題)
 */
function setPostType(t) {
  postType = t;
  ['sell', 'buy', 'free', 'lucky'].forEach(type => {
    const btn = document.getElementById(`post-type-${type}`);
    if (btn) {
      if (type === t) {
        btn.className = 'py-2.5 px-3 rounded-xl border border-amber-500 bg-amber-500/20 text-amber-300 font-black text-xs sm:text-sm transition flex flex-col items-center gap-1 shadow';
      } else {
        btn.className = 'py-2.5 px-3 rounded-xl border border-gray-700 bg-gray-900 text-gray-300 font-bold text-xs sm:text-sm hover:border-amber-500/50 transition flex flex-col items-center gap-1';
      }
    }
  });

  const priceInput = document.getElementById('post-price');
  if (priceInput) {
    if (t === 'free') {
      priceInput.value = '0';
      priceInput.placeholder = '0 (免費分享贈送)';
    } else if (t === 'buy') {
      if (priceInput.value === '0') priceInput.value = '';
      priceInput.placeholder = '請輸入求購預算 (NT$)';
    } else {
      if (priceInput.value === '0') priceInput.value = '';
      priceInput.placeholder = '請輸入預售金額 (NT$)';
    }
  }
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

var wizardCurrentStep = 1;
var wizardPhotos = ['', '', '', '', ''];
var aiRegenCounter = 0;
const LUCKY_DEFAULT_COVER = 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800&auto=format&fit=crop';
const WIZARD_STEP_TITLES = [
  '好物資訊 ＆ 一句話 AI 擬稿',
  '照片上傳 ＆ 價格設定',
  '聯絡方式 ＆ 密碼確認 ➔ 立即發布'
];

/**
 * 設定並切換刊登精靈步驟 (Step 1~3 沉浸式零滾動)
 */
function setWizardStep(step) {
  if (step < 1) step = 1;
  if (step > 3) step = 3;
  wizardCurrentStep = step;

  const pct = (step / 3) * 100;
  const bar = document.getElementById('wizard-progress-bar');
  if (bar) bar.style.width = `${pct}%`;

  const stepBadge = document.getElementById('wizard-step-badge');
  if (stepBadge) stepBadge.innerText = `STEP ${step} / 3`;

  const stepTitle = document.getElementById('wizard-step-title');
  if (stepTitle) stepTitle.innerText = WIZARD_STEP_TITLES[step - 1];

  for (let i = 1; i <= 3; i++) {
    const stepEl = document.getElementById(`wizard-step-${i}`);
    if (stepEl) {
      if (i === step) stepEl.classList.remove('hidden');
      else stepEl.classList.add('hidden');
    }
  }

  const prevBtn = document.getElementById('wizard-prev-btn');
  const nextBtn = document.getElementById('wizard-next-btn');
  const submitBtn = document.getElementById('submit-create-btn');

  if (prevBtn) {
    if (step === 1) prevBtn.classList.add('hidden');
    else prevBtn.classList.remove('hidden');
  }

  if (nextBtn) {
    if (step < 3) nextBtn.classList.remove('hidden');
    else nextBtn.classList.add('hidden');
  }

  if (submitBtn) {
    if (step === 3) submitBtn.classList.remove('hidden');
    else submitBtn.classList.add('hidden');
  }

  hideCreateError();
}

/**
 * 刊登精靈下一步 (嚴格驗證當前步驟)
 */
function wizardNextStep() {
  if (wizardCurrentStep === 1) {
    const titleInput = document.getElementById('post-title');
    const title = (titleInput?.value || '').trim();
    if (!title) {
      if (titleInput) {
        titleInput.classList.add('border-rose-500');
        titleInput.focus();
      }
      showCreateError('⚠️ 步驟 1 未完成：請填寫物品名稱/標題 (或在上方輸入關鍵字點選 ✨ AI 擬稿)！');
      return;
    }
    if (titleInput) titleInput.classList.remove('border-rose-500');
    setWizardStep(2);
  } else if (wizardCurrentStep === 2) {
    const count = wizardPhotos.filter(Boolean).length;
    if (count === 0) {
      showCreateError('⚠️ 步驟 2 未完成：請至少上傳 1 張照片 (或勾選上方尾牙獎品預設封面)！');
      return;
    }
    const isSwap = document.getElementById('post-swap-check')?.checked;
    if (isSwap) {
      const swapItem = (document.getElementById('post-swap-item')?.value || '').trim();
      if (!swapItem) {
        showCreateError('⚠️ 步驟 2 未完成：請填寫您想換的物品清單！');
        return;
      }
    }
    setWizardStep(3);
  }
}

/**
 * 刊登精靈上一步
 */
function wizardPrevStep() {
  if (wizardCurrentStep > 1) {
    setWizardStep(wizardCurrentStep - 1);
  }
}

/**
 * ✨ AI 一句話快速解析生成草稿
 */
function runAiQuickDraft() {
  const inputEl = document.getElementById('ai-quick-input');
  const rawInput = (inputEl?.value || '').trim();

  if (!rawInput) {
    showNotification('💡 請在輸入框輸入關鍵字 (例如：黑色滑鼠 或 尾牙抽到AirPods 賣5500 分機45555)', 'warning');
    if (inputEl) inputEl.focus();
    return;
  }

  let text = rawInput;

  // 1. 智慧偵測交易類型
  let detectedType = 'sell';
  if (/尾牙|抽到|抽中|獎品|年會|中獎/i.test(text)) {
    detectedType = 'lucky';
  } else if (/送|免費|愛心|結緣|0元|贈送/i.test(text)) {
    detectedType = 'free';
  } else if (/徵|求購|想買|收|徵求/i.test(text)) {
    detectedType = 'buy';
  }
  setPostType(detectedType);

  // 2. 智慧偵測金額
  if (detectedType === 'free') {
    const priceInput = document.getElementById('post-price');
    if (priceInput) priceInput.value = '0';
  } else {
    const priceMatch = text.match(/(?:賣|售|預算|NT\$?|\$|價錢|價格)\s*[:：]?\s*([0-9,]+)/i) ||
                       text.match(/(?:^|\s)([0-9]{3,6})(?:元|\s|$)/);
    if (priceMatch) {
      const p = priceMatch[1].replace(/,/g, '');
      const priceInput = document.getElementById('post-price');
      if (priceInput) priceInput.value = p;
    }
  }

  // 3. 智慧偵測聯絡資訊
  const extMatch = text.match(/(?:分機|ext\.?)\s*[:：]?\s*([0-9]{4,6})/i);
  const teamsMatch = text.match(/(?:Teams|teams)\s*[:：]?\s*([a-zA-Z0-9_.-]+)/i);
  const phoneMatch = text.match(/(?:手機|電話|LINE|line)\s*[:：]?\s*([0-9a-zA-Z_-]+)/i);

  let detectedContact = '';
  if (extMatch) detectedContact = `分機: ${extMatch[1]}`;
  else if (teamsMatch) detectedContact = `Teams: ${teamsMatch[1]}`;
  else if (phoneMatch) detectedContact = `LINE/手機: ${phoneMatch[1]}`;

  if (detectedContact) {
    const contactInput = document.getElementById('post-contact');
    if (contactInput) contactInput.value = detectedContact;
  }

  // 4. 清理商品核心名稱
  let cleanName = text
    .replace(/(?:賣|售|預算|NT\$?|\$|價錢|價格)\s*[:：]?\s*[0-9,]+元?/gi, '')
    .replace(/(?:分機|ext\.?)\s*[:：]?\s*[0-9]{4,6}/gi, '')
    .replace(/(?:Teams|teams)\s*[:：]?\s*[a-zA-Z0-9_.-]+/gi, '')
    .replace(/(?:手機|電話|LINE|line)\s*[:：]?\s*[0-9a-zA-Z_-]+/gi, '')
    .replace(/尾牙抽到|尾牙抽中|抽中|抽到|全新|愛心|免費送|免費|我想買|想買|求購|徵求/g, '')
    .trim();

  if (!cleanName) cleanName = rawInput.trim();

  // 5. 智慧包裝標題與條列式規格描述
  let titlePrefix = detectedType === 'lucky' ? '【尾牙全新未拆】' :
                    detectedType === 'free' ? '【愛心結緣 0元免費】' :
                    detectedType === 'buy' ? '【誠意求購】' : '【優質出清】';

  let refinedTitle = `${titlePrefix}${cleanName}`;
  
  let descBullets = [];
  if (detectedType === 'lucky') {
    descBullets.push(`【物品狀態】公司尾牙抽中，全新原廠封膜完整未拆！`);
    descBullets.push(`【規格配件】附原廠完整盒裝與配件，未拆封新品。`);
    descBullets.push(`【面交地點】關渡園區 / 立德路同仁可當面點交。`);
  } else if (detectedType === 'free') {
    descBullets.push(`【物品狀態】外觀良好整潔，功能正常，免費分享結緣給有需要的同仁！`);
    descBullets.push(`【面交地點】立德路 / 關渡園區自取。`);
  } else if (detectedType === 'buy') {
    descBullets.push(`【徵求說明】誠徵「${cleanName}」，外觀功能良好無故障佳。`);
    descBullets.push(`【面交地點】關渡園區 / 立德路可配合面交點收。`);
  } else {
    descBullets.push(`【物品狀態】少用如新，功能完全正常，外觀乾淨。`);
    descBullets.push(`【規格特色】實用好物，適合居家或辦公使用。`);
    descBullets.push(`【面交地點】關渡園區 / 立德路同仁可當面測試點交。`);
  }

  const titleInput = document.getElementById('post-title');
  if (titleInput) titleInput.value = refinedTitle;

  const descInput = document.getElementById('post-desc');
  if (descInput) descInput.value = descBullets.join('\n');

  // 若為尾牙且尚未選照片，自動幫忙勾選預設尾牙禮盒封面
  if (detectedType === 'lucky' && wizardPhotos.filter(Boolean).length === 0) {
    toggleLuckyDefaultCover(true);
  }

  showNotification('✨ AI 已為您快速解析並生成草稿！', 'success');
}

/**
 * 🔄 換個寫法 (切換不同風格文案)
 */
function runAiRegenerate() {
  const titleInput = document.getElementById('post-title');
  const descInput = document.getElementById('post-desc');
  if (!titleInput || !descInput) return;

  const rawTitle = titleInput.value.replace(/^【.*?】\s*/, '').trim() || '好物';
  aiRegenCounter = (aiRegenCounter + 1) % 3;

  if (aiRegenCounter === 0) {
    titleInput.value = `【出清如新】${rawTitle}`;
    descInput.value = `【狀態】少用功能一切正常，外觀保養良好。\n【交貨】關渡園區 / 立德路可面交自取。`;
    showNotification('🔄 已切換為【極簡俐落風】文案！', 'info');
  } else if (aiRegenCounter === 1) {
    titleInput.value = `【超值推薦】${rawTitle} (附配件/功能完好)`;
    descInput.value = `【物品來源】個人升級換下，平時愛惜使用。\n【物品成色】外觀約 9 成新，功能按鍵測試皆正常。\n【配件說明】附完整盒裝與配件。\n【面交地點】關渡園區 / 立德路同仁可約面交點收。`;
    showNotification('🔄 已切換為【誠意詳盡風】文案！', 'info');
  } else {
    titleInput.value = `【優質良品】${rawTitle}`;
    descInput.value = `【規格特色】辦公/居家實用必備，隨插即用。\n【功能檢驗】功能 100% 正常無待修。\n【面交取件】立德路園區皆可當面交貨確認。`;
    showNotification('🔄 已切換為【規格條列風】文案！', 'info');
  }
}

/**
 * 🗑️ 一鍵清空標題與描述草稿
 */
function clearAiDraft() {
  const inputEl = document.getElementById('ai-quick-input');
  const titleInput = document.getElementById('post-title');
  const descInput = document.getElementById('post-desc');
  if (inputEl) inputEl.value = '';
  if (titleInput) titleInput.value = '';
  if (descInput) descInput.value = '';
  showNotification('🗑️ 已一鍵清空標題與描述草稿！', 'info');
}

/**
 * 快捷補充字樣至描述欄
 */
function appendTagToDesc(text) {
  const descEl = document.getElementById('post-desc');
  if (!descEl) return;
  const cur = descEl.value.trim();
  if (cur.includes(text)) {
    showNotification('💡 此標籤已在描述中', 'info');
    return;
  }
  if (cur) {
    descEl.value = cur + '\n' + text;
  } else {
    descEl.value = text;
  }
  showNotification(`➕ 已加入：${text}`, 'success');
}

/**
 * 聯絡方式前綴快捷填入
 */
function fillContactPrefix(prefix) {
  const input = document.getElementById('post-contact');
  if (!input) return;
  let cur = input.value.replace(/^(分機: |Teams: |LINE \/ 手機: )/, '').trim();
  input.value = prefix + cur;
  input.focus();
}

/**
 * 處理 5 格照片選取、壓縮與上傳
 */
async function handleWizardImageSelect(slotIdx, event) {
  const file = event.target.files[0];
  if (!file) return;

  showNotification(`⏳ 照片 ${slotIdx + 1} 壓縮上傳中...`, 'info');

  try {
    const publicUrl = await compressAndUploadImage(file);
    wizardPhotos[slotIdx] = publicUrl;
    updateWizardPhotoUI();
    showNotification(`🎉 照片 ${slotIdx + 1} 上傳成功！`, 'success');
  } catch (e) {
    console.error('Image upload error:', e);
    showNotification(`⚠️ 照片 ${slotIdx + 1} 上傳失敗，請稍後再試：` + e.message, 'warning');
  }
}

/**
 * 移除指定格數照片 (自動向前遞補)
 */
function removeWizardPhoto(slotIdx) {
  wizardPhotos[slotIdx] = '';
  const compacted = wizardPhotos.filter(Boolean);
  while (compacted.length < 5) compacted.push('');
  wizardPhotos = compacted;

  for (let i = 1; i <= 5; i++) {
    const fileInput = document.getElementById(`upload-file-slot-${i}`);
    if (fileInput) fileInput.value = '';
  }

  updateWizardPhotoUI();
  showNotification(`🗑️ 已移除照片！`, 'info');
}

/**
 * 尾牙大獎預設禮盒封面切換
 */
function toggleLuckyDefaultCover(checked) {
  if (checked) {
    if (!wizardPhotos[0] || wizardPhotos[0] !== LUCKY_DEFAULT_COVER) {
      wizardPhotos[0] = LUCKY_DEFAULT_COVER;
    }
    showNotification('🎁 已套用【尾牙大獎禮品盒】質感預設封面！', 'success');
  } else {
    if (wizardPhotos[0] === LUCKY_DEFAULT_COVER) {
      removeWizardPhoto(0);
    }
  }
  updateWizardPhotoUI();
}

/**
 * 同步更新 5 格照片預覽 UI
 */
function updateWizardPhotoUI() {
  for (let i = 0; i < 5; i++) {
    const slotEl = document.getElementById(`photo-slot-${i + 1}`);
    const imgEl = document.getElementById(`photo-img-${i}`);
    const delBtn = document.getElementById(`photo-del-${i}`);
    const url = wizardPhotos[i];

    if (url) {
      if (imgEl) {
        imgEl.src = url;
        imgEl.classList.remove('hidden');
      }
      if (delBtn) delBtn.classList.remove('hidden');
      if (slotEl) {
        slotEl.classList.remove('border-dashed', 'border-gray-700', 'border-amber-500/60');
        slotEl.classList.add('border-solid', 'border-amber-400');
      }
    } else {
      if (imgEl) {
        imgEl.src = '';
        imgEl.classList.add('hidden');
      }
      if (delBtn) delBtn.classList.add('hidden');
      if (slotEl) {
        slotEl.classList.remove('border-solid', 'border-amber-400');
        slotEl.classList.add('border-dashed', i === 0 ? 'border-amber-500/60' : 'border-gray-700');
      }
    }
  }

  const count = wizardPhotos.filter(Boolean).length;
  const badge = document.getElementById('photo-count-badge');
  if (badge) badge.innerText = `${count} / 5 張`;

  const luckyCheck = document.getElementById('lucky-gift-cover-check');
  if (luckyCheck) luckyCheck.checked = (wizardPhotos[0] === LUCKY_DEFAULT_COVER);
}

/**
 * 開啟刊登貼文彈窗 (初始化 4-Step 精靈)
 */
function openCreateModal() {
  if (typeof closeAllModals === 'function') closeAllModals();
  editingItemId = null;
  tempEditPassword = "";

  const titleInput = document.getElementById('post-title');
  if (titleInput) titleInput.value = "";
  
  const aiInput = document.getElementById('ai-quick-input');
  if (aiInput) aiInput.value = "";

  // 自動記憶並載入常用聯絡資訊與暱稱
  const savedContact = localStorage.getItem('pega_user_contact') || "";
  const contactInput = document.getElementById('post-contact');
  if (contactInput) contactInput.value = savedContact;

  const savedNickname = localStorage.getItem('pega_user_nickname') || "";
  const nickInput = document.getElementById('post-nickname');
  if (nickInput) nickInput.value = savedNickname;

  const descInput = document.getElementById('post-desc');
  if (descInput) descInput.value = "";

  const priceInput = document.getElementById('post-price');
  if (priceInput) priceInput.value = "";

  const swapItemInput = document.getElementById('post-swap-item');
  if (swapItemInput) swapItemInput.value = "";
  
  const swapCheckbox = document.getElementById('post-swap-check');
  if (swapCheckbox) {
    swapCheckbox.checked = false;
    toggleSwapMode(false);
  }

  const expSelect = document.getElementById('item-expiration');
  if (expSelect) expSelect.value = "none";
  
  wizardPhotos = ['', '', '', '', ''];
  for (let i = 1; i <= 5; i++) {
    const fileInput = document.getElementById(`upload-file-slot-${i}`);
    if (fileInput) fileInput.value = '';
  }

  const luckyCheck = document.getElementById('lucky-gift-cover-check');
  if (luckyCheck) luckyCheck.checked = false;

  updateWizardPhotoUI();
  setPostType('sell');

  const randPwd = Math.floor(1000 + Math.random() * 9000).toString();
  const pwdInput = document.getElementById('post-edit-password');
  if (pwdInput) pwdInput.value = randPwd;

  const titleEl = document.querySelector('#create-modal h3');
  if (titleEl) titleEl.innerHTML = `<span>刊登好物 / 尾牙獎品</span>`;
  const submitBtn = document.getElementById('submit-create-btn');
  if (submitBtn) submitBtn.innerHTML = `<span>🚀 立即發布好物</span>`;

  setWizardStep(1);
  hideCreateError();
  document.getElementById('create-modal').classList.remove('hidden');
}

function closeCreateModal() {
  document.getElementById('create-modal').classList.add('hidden');
}

/**
 * 編輯我的貼文 (帶入 4-Step 精靈與 5 格照片)
 */
async function editMyItem(itemId) {
  const item = allItems.find(i => i.id === itemId);
  if (!item) return;

  const myItems = JSON.parse(localStorage.getItem('my_created_item_ids') || '[]');
  const myPasswords = JSON.parse(localStorage.getItem('pega_my_post_passwords') || '{}');
  const cachedPwd = myPasswords[itemId] || "";
  
  const isOwner = (item.device_id === myDeviceId) || myItems.includes(itemId) || (cachedPwd !== "");
  let finalPwd = cachedPwd;

  if (!isOwner && !isAdmin) {
    const userPwd = prompt('本裝置無管理此貼文的憑證。\n請輸入該貼文的 4 位數密碼以進行修改：');
    if (!userPwd) return;
    
    const pwdTrim = userPwd.trim();
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
          dev_id: myDeviceId,
          pwd_input: pwdTrim
        })
      });
      
      if (verifyRes.ok) {
        const isAuthorized = await verifyRes.json();
        if (isAuthorized) {
          finalPwd = pwdTrim;
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

  editingItemId = itemId;
  tempEditPassword = finalPwd;

  const titleInput = document.getElementById('post-title');
  if (titleInput) titleInput.value = item.title || "";

  const contactInput = document.getElementById('post-contact');
  if (contactInput) contactInput.value = item.contact_info || "";

  const descInput = document.getElementById('post-desc');
  if (descInput) descInput.value = item.description || "";

  const pwdInput = document.getElementById('post-edit-password');
  if (pwdInput) pwdInput.value = finalPwd;

  setPostType(item.type);

  const isBarter = item.price && item.price.startsWith('swap:');
  const swapCheckbox = document.getElementById('post-swap-check');
  if (swapCheckbox) {
    swapCheckbox.checked = isBarter;
    toggleSwapMode(isBarter);
  }

  const swapItemInput = document.getElementById('post-swap-item');
  const priceInput = document.getElementById('post-price');
  if (isBarter) {
    if (swapItemInput) swapItemInput.value = item.price.replace('swap:', '');
    if (priceInput) priceInput.value = "";
  } else {
    if (priceInput) priceInput.value = item.price || "";
    if (swapItemInput) swapItemInput.value = "";
  }

  const expSelect = document.getElementById('item-expiration');
  if (expSelect) expSelect.value = "none";

  wizardPhotos = ['', '', '', '', ''];
  if (item.image_url) {
    const urls = item.image_url.split('|||').map(s => s.trim()).filter(Boolean);
    urls.slice(0, 5).forEach((u, idx) => {
      wizardPhotos[idx] = u;
    });
  }
  updateWizardPhotoUI();

  const modalTitle = document.querySelector('#create-modal h3');
  if (modalTitle) modalTitle.innerHTML = `<span>修改好物貼文</span>`;
  const submitBtnEl = document.getElementById('submit-create-btn');
  if (submitBtnEl) submitBtnEl.innerHTML = `<span>💾 儲存修改</span>`;

  setWizardStep(1);
  hideCreateError();
  document.getElementById('create-modal').classList.remove('hidden');
}

/**
 * 提交發布或更新貼文 (嚴格 4-Step 驗證 ＆ 5 張照片整合)
 */
async function submitCreateItem() {
  const errorBox = document.getElementById('create-modal-error');
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
  const nicknameInput = document.getElementById('post-nickname');
  const nicknameVal = (nicknameInput?.value || '').trim() || myNickname || '匿名同仁';
  const expDays = document.getElementById('item-expiration')?.value || 'none';
  const editPasswordVal = (document.getElementById('post-edit-password')?.value || '').trim();

  // 1. 檢查物品標題 (步驟 1)
  if (!title) {
    setWizardStep(1);
    if (titleInput) {
      titleInput.classList.add('border-rose-500');
      titleInput.focus();
    }
    showCreateError('⚠️ 步驟 1 未完成：請填寫物品名稱/標題！');
    return;
  } else if (titleInput) {
    titleInput.classList.remove('border-rose-500');
  }

  // 2. 檢查照片上傳 (步驟 2 至少 1 張)
  const validPhotos = wizardPhotos.filter(Boolean);
  if (validPhotos.length === 0) {
    setWizardStep(2);
    showCreateError('⚠️ 步驟 2 未完成：請至少選擇並上傳 1 張物品照片 (或勾選尾牙獎品預設圖)！');
    return;
  }

  // 3. 檢查聯絡方式 (步驟 3 必填)
  if (!contact) {
    setWizardStep(3);
    if (contactInput) {
      contactInput.classList.add('border-rose-500');
      contactInput.focus();
    }
    showCreateError('⚠️ 步驟 3 未完成：請填寫聯絡方式 (例如：Teams / 分機 8888 / LINE)！');
    return;
  } else if (contactInput) {
    contactInput.classList.remove('border-rose-500');
  }

  // 4. 檢查編輯密碼 (步驟 3 必填)
  if (!editPasswordVal) {
    setWizardStep(3);
    showCreateError('⚠️ 步驟 3 未完成：請輸入自刪管理密碼，以防未來更換裝置無法下架！');
    return;
  }

  // 記憶同仁常用的聯絡方式與暱稱
  localStorage.setItem('pega_user_contact', contact);
  if (nicknameVal) localStorage.setItem('pega_user_nickname', nicknameVal);

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 處理中...';
  }

  const finalImgUrl = validPhotos.join('|||');

  const isLocal = isLocalEnvironment();
  let finalDesc = desc;
  if (expDays !== 'none' && !editingItemId) {
    const d = new Date();
    d.setDate(d.getDate() + parseInt(expDays, 10));
    finalDesc = `${desc}\n[EXP:${d.toISOString()}]`;
  }
  if (isLocal && !editingItemId) {
    finalDesc = `${finalDesc}\n[DEV_TEST]`;
  }

  try {
    if (editingItemId) {
      // UPDATE 模式
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
          device_id_input: myDeviceId,
          pwd_input: editPasswordVal,
          admin_pwd_input: localStorage.getItem('pega_admin_hash') || ''
        })
      });

      if (res.ok) {
        const success = await res.json();
        if (success) {
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
      // INSERT 模式 (本地端自動標記 DEV_ 設備代號)
      const devIdToUse = isLocal ? (myDeviceId.startsWith('DEV_') ? myDeviceId : 'DEV_' + myDeviceId) : myDeviceId;
      const payload = {
        title: title,
        description: finalDesc,
        price: finalPrice,
        type: postType,
        image_url: finalImgUrl,
        nickname: nicknameVal,
        device_id: devIdToUse,
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
        let createdItemObj = null;
        const createdItems = await postRes.json();
        if (createdItems && createdItems.length > 0) {
          createdItemObj = createdItems[0];
          newItemId = createdItemObj.id;
          let myItems = JSON.parse(localStorage.getItem('my_created_item_ids') || '[]');
          myItems.push(newItemId);
          localStorage.setItem('my_created_item_ids', JSON.stringify(myItems));

          const myPasswords = JSON.parse(localStorage.getItem('pega_my_post_passwords') || '{}');
          myPasswords[newItemId] = editPasswordVal;
          localStorage.setItem('pega_my_post_passwords', JSON.stringify(myPasswords));
        }

        showNotification(isLocal ? '🎉 刊登成功！(🛡️ 本地隔離測試模式：公網已自動隱藏)' : '🎉 刊登成功！貼文已排在第一位展示。', 'success');
        closeCreateModal();

        // 自動切換至全部好物分類與第一頁，清除搜尋過濾
        currentFilter = 'all';
        currentPage = 1;
        mobileDisplayLimit = 30;
        const mainSearch = document.getElementById('search-input');
        if (mainSearch) mainSearch.value = '';
        const overlaySearch = document.getElementById('overlay-search-input');
        if (overlaySearch) overlaySearch.value = '';

        ['all', 'sell', 'buy', 'free', 'lucky'].forEach(type => {
          const btn = document.getElementById(`filter-${type}`);
          if (btn) {
            if (type === 'all') {
              btn.className = 'px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-950 transition shadow-md shadow-amber-500/20 active:scale-95 shrink-0 font-black';
            } else {
              btn.className = 'px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 text-gray-300 hover:text-amber-300 hover:bg-gray-800 transition active:scale-95 shrink-0 font-bold';
            }
          }
        });

        await loadItems(newItemId, false);
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // 彈出刊登成功與文案分享/密碼備忘 Modal
        if (newItemId) {
          openPostSuccessModal({
            id: newItemId,
            title: title,
            price: finalPrice,
            type: postType,
            nickname: nicknameVal,
            contact_info: contact,
            image_url: finalImgUrl
          }, editPasswordVal);
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
      submitBtn.innerText = editingItemId ? '💾 儲存修改' : '🚀 立即發布好物';
    }
  }
}

/**
 * 取得當前螢幕上實際可見（未被 hidden 隱藏）的卡片列表
 */
function getVisibleCards() {
  const grid = document.getElementById('item-grid');
  if (!grid) return [];
  return Array.from(grid.querySelectorAll('div[onclick*="openDetailModal"]')).filter(el => {
    return el.offsetParent !== null || window.getComputedStyle(el).display !== 'none';
  });
}

/**
 * 快速滾動至最上方 (搜尋列與頂部)
 */
function scrollToTopItem() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
  if (typeof showNotification === 'function') {
    showNotification('⬆️ 已快速捲動至頂端！', 'info');
  }
}

/**
 * 快速滾動至最下方 (最後一筆商品與頁尾)
 */
function scrollToBottomItem() {
  window.scrollTo({
    top: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight),
    behavior: 'smooth'
  });
  if (typeof showNotification === 'function') {
    showNotification('⬇️ 已快速捲動至最底端！', 'info');
  }
}

/**
 * 手機專屬極致流暢懸浮搜尋 (0 畫面劇烈滾動跳轉)
 */
function toggleMobileSearch() {
  const overlay = document.getElementById('sticky-search-overlay');
  const overlayInput = document.getElementById('overlay-search-input');
  const mainInput = document.getElementById('search-input');

  if (!overlay) {
    if (mainInput) {
      mainInput.focus();
    }
    return;
  }

  if (overlay.classList.contains('hidden')) {
    overlay.classList.remove('hidden');
    if (overlayInput) {
      overlayInput.value = mainInput ? mainInput.value : '';
      updateOverlayClearButton(overlayInput.value);
      setTimeout(() => {
        overlayInput.focus();
      }, 80);
    }
  } else {
    closeSearchOverlay();
  }
}

/**
 * 關閉頂部懸浮搜尋列
 */
function closeSearchOverlay() {
  const overlay = document.getElementById('sticky-search-overlay');
  if (overlay) overlay.classList.add('hidden');
}

/**
 * 同步懸浮搜尋與主搜尋輸入，即時觸發篩選
 */
function syncOverlaySearch(val) {
  const mainInput = document.getElementById('search-input');
  if (mainInput) {
    mainInput.value = val;
  }
  updateOverlayClearButton(val);
  filterItems();
}

/**
 * 清除懸浮搜尋內容
 */
function clearOverlaySearch() {
  const overlayInput = document.getElementById('overlay-search-input');
  if (overlayInput) overlayInput.value = '';
  syncOverlaySearch('');
  if (overlayInput) overlayInput.focus();
}

/**
 * 更新清除 X 按鈕狀態
 */
function updateOverlayClearButton(val) {
  const clearBtn = document.getElementById('overlay-search-clear');
  if (clearBtn) {
    if (val && val.trim().length > 0) {
      clearBtn.classList.remove('hidden');
    } else {
      clearBtn.classList.add('hidden');
    }
  }
}

/**
 * 點擊熱門關鍵字膠囊一鍵搜尋
 */
function applyQuickSearch(kw) {
  const overlayInput = document.getElementById('overlay-search-input');
  if (overlayInput) overlayInput.value = kw;
  syncOverlaySearch(kw);
}

/**
 * 啟動手機端滑到底自動加載下一頁 (無限滾動)
 */
function setupMobileInfiniteScroll() {
  window.addEventListener('scroll', () => {
    const isLandscape = (window.orientation === 90 || window.orientation === -90) || (window.innerWidth > window.innerHeight && window.innerWidth < 1100);
    const isMobile = window.innerWidth < 640 || isLandscape;
    if (!isMobile) return;

    // 當距離底部小於 350px 時觸發下一批加載
    if ((window.innerHeight + window.scrollY) >= (document.documentElement.scrollHeight - 350)) {
      const searchVal = (document.getElementById('search-input')?.value || '').toLowerCase().trim();
      const filtered = allItems.filter(item => {
        if (item.device_id === 'SYSTEM' || (item.title && item.title.startsWith('SYSTEM_'))) return false;
        if (currentFilter !== 'all' && item.type !== currentFilter) return false;
        if (searchVal) {
          const t = (item.title || '').toLowerCase();
          const d = (item.description || '').toLowerCase();
          const n = (item.nickname || '').toLowerCase();
          if (!t.includes(searchVal) && !d.includes(searchVal) && !n.includes(searchVal)) return false;
        }
        return true;
      });

      if (mobileDisplayLimit < filtered.length) {
        const spinner = document.getElementById('mobile-loading-spinner');
        if (spinner) spinner.classList.remove('hidden');

        setTimeout(() => {
          mobileDisplayLimit += 20;
          renderItems();
        }, 150);
      }
    }
  }, { passive: true });
}

/**
 * 手機詳情彈窗「下滑手勢關閉」功能 (Swipe Down to Dismiss)
 */
function initDetailModalGestures() {
  const modal = document.getElementById('detail-modal');
  const modalCard = document.getElementById('detail-modal-card');
  if (!modal || !modalCard) return;

  let startY = 0;
  let currentY = 0;
  let isDragging = false;

  modalCard.addEventListener('touchstart', (e) => {
    const scrollContainer = modalCard.querySelector('.overflow-y-auto');
    if (scrollContainer && scrollContainer.scrollTop > 5) return;
    startY = e.touches[0].clientY;
    isDragging = true;
    modalCard.style.transition = 'none';
  }, { passive: true });

  modalCard.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    currentY = e.touches[0].clientY;
    const diffY = currentY - startY;
    if (diffY > 0) {
      modalCard.style.transform = `translateY(${Math.min(diffY, 280)}px)`;
      modalCard.style.opacity = `${Math.max(0.3, 1 - diffY / 400)}`;
    }
  }, { passive: true });

  modalCard.addEventListener('touchend', () => {
    if (!isDragging) return;
    isDragging = false;
    const diffY = currentY - startY;
    modalCard.style.transition = 'all 0.2s ease-out';
    if (diffY > 80) {
      modalCard.style.transform = 'translateY(100%)';
      modalCard.style.opacity = '0';
      setTimeout(() => {
        closeDetailModal();
        modalCard.style.transform = 'none';
        modalCard.style.opacity = '1';
      }, 180);
    } else {
      modalCard.style.transform = 'none';
      modalCard.style.opacity = '1';
    }
    startY = 0;
    currentY = 0;
  });

  // 點擊 Modal 外部黑色半透明遮罩背景也能直接關閉
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeDetailModal();
    }
  });
}

/**
 * 📖 新手圖文使用指南彈窗邏輯 (互動式 5 步驟輪播彈窗)
 */
window.modalGuideCurrentStep = window.modalGuideCurrentStep || 1;
window.modalGuideTotalSteps = window.modalGuideTotalSteps || 5;

function openGuideModal() {
  if (typeof closeAllModals === 'function') {
    closeAllModals();
  }
  const modal = document.getElementById('guide-modal');
  if (modal) {
    window.modalGuideCurrentStep = 1;
    updateModalGuideUI();
    modal.classList.remove('hidden');
  } else {
    window.location.href = 'guide.html';
  }
}

function closeGuideModal() {
  const modal = document.getElementById('guide-modal');
  if (modal) modal.classList.add('hidden');
}

function updateModalGuideUI() {
  const curStep = window.modalGuideCurrentStep || 1;
  const totSteps = window.modalGuideTotalSteps || 5;

  document.querySelectorAll('.modal-guide-slide').forEach(slide => {
    const step = parseInt(slide.getAttribute('data-step'), 10);
    if (step === curStep) {
      slide.classList.remove('hidden');
      slide.classList.add('block');
    } else {
      slide.classList.remove('block');
      slide.classList.add('hidden');
    }
  });

  const stepText = document.getElementById('modal-guide-step-text');
  if (stepText) stepText.innerText = curStep;

  const progressBar = document.getElementById('modal-guide-progress');
  if (progressBar) {
    progressBar.style.width = `${(curStep / totSteps) * 100}%`;
  }

  const prevBtn = document.getElementById('modal-guide-btn-prev');
  if (prevBtn) {
    prevBtn.disabled = (curStep === 1);
  }

  const nextBtn = document.getElementById('modal-guide-btn-next');
  if (nextBtn) {
    if (curStep >= totSteps) {
      nextBtn.innerHTML = `<span>開始體驗</span> <i class="fa-solid fa-arrow-right text-[9px]"></i>`;
      nextBtn.onclick = finishModalGuide;
    } else {
      nextBtn.innerHTML = `<span>下一頁</span> <i class="fa-solid fa-chevron-right text-[9px]"></i>`;
      nextBtn.onclick = nextModalGuideStep;
    }
  }

  const dotsContainer = document.getElementById('modal-guide-dots');
  if (dotsContainer) {
    const dots = dotsContainer.querySelectorAll('span');
    dots.forEach((dot, idx) => {
      if (idx + 1 === curStep) {
        dot.className = 'w-3 h-2 rounded-full bg-amber-400 shadow-md shadow-amber-400/50 transition-all';
      } else {
        dot.className = 'w-1.5 h-1.5 rounded-full bg-gray-700 transition-all';
      }
    });
  }
}

function nextModalGuideStep() {
  const totSteps = window.modalGuideTotalSteps || 5;
  if ((window.modalGuideCurrentStep || 1) < totSteps) {
    window.modalGuideCurrentStep = (window.modalGuideCurrentStep || 1) + 1;
    updateModalGuideUI();
  }
}

function prevModalGuideStep() {
  if ((window.modalGuideCurrentStep || 1) > 1) {
    window.modalGuideCurrentStep = (window.modalGuideCurrentStep || 1) - 1;
    updateModalGuideUI();
  }
}

function finishModalGuide() {
  localStorage.setItem('pega_seen_guide', 'true');
  closeGuideModal();
}

/**
 * 📖 新手指南彈窗內互動體驗小函式
 */
function demoModalSwap(item) {
  const el = document.getElementById('demo-modal-swap-display');
  if (el) {
    el.innerHTML = `<i class="fa-solid fa-arrows-rotate text-xs animate-spin"></i> 換：${item}`;
    showNotification(`🔄 已切換易物標籤為：${item}`, 'info');
  }
}

function demoModalAiDraft() {
  const titleEl = document.getElementById('demo-modal-ai-title');
  const descEl = document.getElementById('demo-modal-ai-desc');
  if (titleEl) titleEl.innerText = '【出清】Logitech MX Master 3S 無線滑鼠 (95成新)';
  if (descEl) descEl.innerText = '【狀態】少用盒裝完整，微動靜音，功能測試完全正常。\n【面交】立德路園區可當面點交。';
  showNotification('✨ AI 已為您解析填入標題與規格描述！', 'success');
}

function demoModalCopy() {
  const sample = '【好物詢問】Logitech MX Master 3S - 聯絡人分機: 45555';
  copyTextToClipboard(sample, '🎉 已成功複製聯絡資訊！可直接貼到 LINE / Teams！');
}

/**
 * 🖼️ 全螢幕沉浸式圖片放大檢視 (Lightbox) 邏輯
 */
let currentLightboxImages = [];
let currentLightboxIndex = 0;

function openLightboxModal(images, startIndex = 0) {
  if (typeof images === 'string') {
    images = images.split('|||').map(s => s.trim()).filter(Boolean);
  }
  if (!images || images.length === 0) return;

  currentLightboxImages = images;
  currentLightboxIndex = (startIndex >= 0 && startIndex < images.length) ? startIndex : 0;
  
  const modal = document.getElementById('lightbox-modal');
  const img = document.getElementById('lightbox-img');
  const counter = document.getElementById('lightbox-counter');
  const prevBtn = document.getElementById('lightbox-btn-prev');
  const nextBtn = document.getElementById('lightbox-btn-next');

  if (modal && img) {
    img.src = currentLightboxImages[currentLightboxIndex];
    modal.classList.remove('hidden');

    if (currentLightboxImages.length > 1) {
      if (counter) {
        counter.classList.remove('hidden');
        counter.innerText = `${currentLightboxIndex + 1} / ${currentLightboxImages.length}`;
      }
      if (prevBtn) prevBtn.classList.remove('hidden');
      if (nextBtn) nextBtn.classList.remove('hidden');
    } else {
      if (counter) counter.classList.add('hidden');
      if (prevBtn) prevBtn.classList.add('hidden');
      if (nextBtn) nextBtn.classList.add('hidden');
    }
  }
}

function closeLightboxModal() {
  const modal = document.getElementById('lightbox-modal');
  if (modal) modal.classList.add('hidden');
}

function nextLightboxPhoto() {
  if (currentLightboxImages.length <= 1) return;
  currentLightboxIndex = (currentLightboxIndex + 1) % currentLightboxImages.length;
  const img = document.getElementById('lightbox-img');
  const counter = document.getElementById('lightbox-counter');
  if (img) img.src = currentLightboxImages[currentLightboxIndex];
  if (counter) counter.innerText = `${currentLightboxIndex + 1} / ${currentLightboxImages.length}`;
}

function prevLightboxPhoto() {
  if (currentLightboxImages.length <= 1) return;
  currentLightboxIndex = (currentLightboxIndex - 1 + currentLightboxImages.length) % currentLightboxImages.length;
  const img = document.getElementById('lightbox-img');
  const counter = document.getElementById('lightbox-counter');
  if (img) img.src = currentLightboxImages[currentLightboxIndex];
  if (counter) counter.innerText = `${currentLightboxIndex + 1} / ${currentLightboxImages.length}`;
}

// 綁定全螢幕大圖燈箱觸控滑動手勢與鍵盤切換
function initLightboxGestures() {
  const modal = document.getElementById('lightbox-modal');
  if (!modal) return;

  let touchStartX = 0;
  let touchEndX = 0;

  modal.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  modal.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    if (touchStartX - touchEndX > 45) {
      nextLightboxPhoto(); // 向左滑 -> 下一張
    } else if (touchEndX - touchStartX > 45) {
      prevLightboxPhoto(); // 向右滑 -> 上一張
    }
  }, { passive: true });

  window.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('hidden')) {
      if (e.key === 'Escape') closeLightboxModal();
      if (e.key === 'ArrowRight') nextLightboxPhoto();
      if (e.key === 'ArrowLeft') prevLightboxPhoto();
    }
  });
}

// ==========================================
// 🎉 刊登成功 ＆ 好物專屬文案分享 Modal 邏輯
// ==========================================

var currentSuccessItem = null;

/**
 * 開啟刊登成功 Modal 並填入商品資訊與 PIN 碼
 * @param {Object} itemData 商品物件
 * @param {string} pin 4 位數自刪密碼
 */
function openPostSuccessModal(itemData, pin) {
  currentSuccessItem = itemData;
  if (typeof closeAllModals === 'function') closeAllModals();

  const modal = document.getElementById('post-success-modal');
  if (!modal) return;

  const pinDisplay = document.getElementById('success-pin-display');
  if (pinDisplay) pinDisplay.innerText = pin || '----';

  const titleEl = document.getElementById('success-item-title');
  if (titleEl) titleEl.innerText = itemData.title || '';

  const priceEl = document.getElementById('success-item-price');
  if (priceEl) {
    if (itemData.price && itemData.price.startsWith('swap:')) {
      priceEl.innerText = '🔄 ' + itemData.price.replace('swap:', '');
    } else if (itemData.type === 'free' || itemData.price === '0') {
      priceEl.innerText = '🎁 免費贈送';
    } else {
      priceEl.innerText = '$ ' + itemData.price;
    }
  }

  const typeEl = document.getElementById('success-item-type');
  if (typeEl) {
    const typeNames = { sell: '💰 我想賣', buy: '🔍 我想買', free: '🎁 免費送', lucky: '🎉 尾牙全新' };
    typeEl.innerText = typeNames[itemData.type] || '💰 想賣';
  }

  const contactEl = document.getElementById('success-item-contact');
  if (contactEl) {
    contactEl.innerText = `👤 刊登人：${itemData.nickname || '同仁'} | 📞 聯絡：${itemData.contact_info || itemData.contact || ''}`;
  }

  const thumbImg = document.getElementById('success-item-thumb');
  if (thumbImg) {
    if (itemData.image_url) {
      const firstImg = itemData.image_url.split('|||')[0];
      thumbImg.src = firstImg;
      thumbImg.classList.remove('hidden');
    } else {
      thumbImg.classList.add('hidden');
    }
  }

  // 產生分享文案 (包含直達連結)
  const shareUrl = `https://pega-exchange.netlify.app/?item_id=${itemData.id}`;
  const priceDisplay = (itemData.price && itemData.price.startsWith('swap:'))
    ? `以物易物 (${itemData.price.replace('swap:', '')})`
    : ((itemData.type === 'free' || itemData.price === '0') ? '免費贈送 (0元)' : `$${itemData.price} 元`);
  
  const typeMap = { sell: '💰 我想賣', buy: '🔍 我想買', free: '🎁 免費送', lucky: '🎉 尾牙全新' };
  const shareText = `📢【PEGAPEGA 二手交流】好物刊登！\n🏷️ 類型：${typeMap[itemData.type] || '好物'}\n🎁 物品：${itemData.title}\n💰 價格：${priceDisplay}\n👤 刊登人：${itemData.nickname || '同仁'}\n📞 聯絡：${itemData.contact_info || itemData.contact || ''}\n\n👉 點擊查看照片與詳情：\n${shareUrl}`;

  const textarea = document.getElementById('success-share-textarea');
  if (textarea) textarea.value = shareText;

  modal.classList.remove('hidden');
}

/**
 * 關閉刊登成功 Modal
 */
function closePostSuccessModal() {
  const modal = document.getElementById('post-success-modal');
  if (modal) modal.classList.add('hidden');
}

/**
 * 一鍵複製好物專屬文案
 */
function copyPostSuccessText() {
  const textarea = document.getElementById('success-share-textarea');
  if (!textarea) return;

  const copyViaClipboard = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(textarea.value);
    }
    textarea.select();
    document.execCommand('copy');
    return Promise.resolve();
  };

  copyViaClipboard().then(() => {
    const label = document.getElementById('copy-success-text-label');
    const original = label ? label.innerText : '';
    if (label) label.innerText = '✅ 文案已複製！可隨時貼上分享';
    showNotification('✅ 好物分享文案已複製到剪貼簿！', 'success');
    setTimeout(() => {
      if (label) label.innerText = original || '一鍵複製好物分享文案';
    }, 2500);
  }).catch(e => {
    textarea.select();
    document.execCommand('copy');
    showNotification('✅ 已選取並複製文案！', 'success');
  });
}

/**
 * 僅複製商品專屬直達連結
 */
function copyPostSuccessUrl() {
  if (!currentSuccessItem) return;
  const shareUrl = `https://pega-exchange.netlify.app/?item_id=${currentSuccessItem.id}`;

  const copyViaClipboard = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(shareUrl);
    }
    const input = document.createElement('input');
    input.value = shareUrl;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    return Promise.resolve();
  };

  copyViaClipboard().then(() => {
    const label = document.getElementById('copy-success-url-label');
    if (label) label.innerText = '✅ 連結已複製！';
    showNotification('🔗 商品專屬連結已複製！', 'success');
    setTimeout(() => {
      if (label) label.innerText = '僅複製專屬連結';
    }, 2500);
  }).catch(e => {
    prompt('請手動複製商品連結：', shareUrl);
  });
}

// 綁定全域以供 HTML 呼叫
window.renderItems = renderItems;
window.switchCardPhoto = switchCardPhoto;
window.handleContactClick = handleContactClick;
window.copyContactForItem = copyContactForItem;
window.openDetailModal = openDetailModal;
window.closeDetailModal = closeDetailModal;
window.setFilter = setFilter;
window.filterItems = filterItems;
window.changePage = changePage;
window.goToPage = goToPage;
window.goToLastPage = goToLastPage;
window.changeGridLayout = changeGridLayout;
window.applyGridLayout = applyGridLayout;
window.updateGridLayoutOptions = updateGridLayoutOptions;
window.setPostType = setPostType;
window.showCreateError = showCreateError;
window.hideCreateError = hideCreateError;
window.openCreateModal = openCreateModal;
window.closeCreateModal = closeCreateModal;
window.editMyItem = editMyItem;
window.submitCreateItem = submitCreateItem;
window.openPostSuccessModal = openPostSuccessModal;
window.closePostSuccessModal = closePostSuccessModal;
window.copyPostSuccessText = copyPostSuccessText;
window.copyPostSuccessUrl = copyPostSuccessUrl;
window.scrollToTopItem = scrollToTopItem;
window.scrollToBottomItem = scrollToBottomItem;
window.toggleMobileSearch = toggleMobileSearch;
window.closeSearchOverlay = closeSearchOverlay;
window.syncOverlaySearch = syncOverlaySearch;
window.clearOverlaySearch = clearOverlaySearch;
window.applyQuickSearch = applyQuickSearch;
window.openGuideModal = openGuideModal;
window.closeGuideModal = closeGuideModal;
window.nextModalGuideStep = nextModalGuideStep;
window.prevModalGuideStep = prevModalGuideStep;
window.finishModalGuide = finishModalGuide;
window.openLightboxModal = openLightboxModal;
window.closeLightboxModal = closeLightboxModal;
window.nextLightboxPhoto = nextLightboxPhoto;
window.prevLightboxPhoto = prevLightboxPhoto;
window.initLightboxGestures = initLightboxGestures;
window.setupMobileInfiniteScroll = setupMobileInfiniteScroll;
window.initDetailModalGestures = initDetailModalGestures;
window.setWizardStep = setWizardStep;
window.wizardNextStep = wizardNextStep;
window.wizardPrevStep = wizardPrevStep;
window.runAiQuickDraft = runAiQuickDraft;
window.runAiRegenerate = runAiRegenerate;
window.clearAiDraft = clearAiDraft;
window.appendTagToDesc = appendTagToDesc;
window.handleWizardImageSelect = handleWizardImageSelect;
window.removeWizardPhoto = removeWizardPhoto;
window.toggleLuckyDefaultCover = toggleLuckyDefaultCover;
window.fillContactPrefix = fillContactPrefix;
window.switchDetailMainPhoto = switchDetailMainPhoto;
window.demoModalSwap = demoModalSwap;
window.demoModalAiDraft = demoModalAiDraft;
window.demoModalCopy = demoModalCopy;
window.updateModalGuideUI = updateModalGuideUI;

