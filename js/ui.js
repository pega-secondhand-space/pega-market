/**
 * PEGA 二手匿名交易空間 - 前端畫面渲染與互動邏輯 (js/ui.js)
 */

var postType = 'sell';
var editingItemId = null;
var tempEditPassword = "";
var mobileDisplayLimit = 30;

/**
 * 渲染全站商品卡片網格與分頁控制
 */
function renderItems() {
  const grid = document.getElementById('item-grid');
  if (!grid) return;

  itemsPerPage = parseInt(localStorage.getItem('pega_items_per_page') || '40', 10);
  if (isNaN(itemsPerPage) || itemsPerPage < 1) itemsPerPage = 40;

  const searchVal = (document.getElementById('search-input')?.value || '').toLowerCase().trim();

  const filtered = allItems.filter(item => {
    if (item.device_id === 'SYSTEM' || (item.title && item.title.startsWith('SYSTEM_')) || (item.id && item.id.startsWith('00000000-0000-0000-0000-'))) return false;

    // 已售出逾 48 小時過期檢查 (僅前端過濾顯示)
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
        const remainingMs = (2 * 24 * 60 * 60 * 1000) - (new Date() - soldTime);
        const remainingHours = Math.max(0, Math.floor(remainingMs / (1000 * 60 * 60)));
        if (remainingHours > 24) {
          const remainingDays = Math.floor(remainingHours / 24);
          const hours = remainingHours % 24;
          expCountdownHtml = `<span class="text-emerald-400 font-bold text-[10px] sm:text-xs">⏳ 剩 ${remainingDays}天${hours}時下架</span>`;
        } else {
          expCountdownHtml = `<span class="text-red-400 font-bold animate-pulse text-[10px] sm:text-xs">⏳ 剩 ${remainingHours}時下架</span>`;
        }
      } else {
        expCountdownHtml = `<span class="text-emerald-400 font-bold text-[10px] sm:text-xs">⏳ 已標記售出</span>`;
      }
    } else {
      expCountdownHtml = getExpirationCountdown(getItemExpiration(item));
    }

    const isMobileDevice = window.innerWidth < 640 || ('ontouchstart' in window && window.innerWidth < 1024) || (window.innerWidth < 1024 && window.innerHeight < 600);
    const storageKey = isMobileDevice ? 'pega_grid_cols_mobile' : 'pega_grid_cols_pc';
    const colsNum = parseInt(localStorage.getItem(storageKey) || localStorage.getItem('pega_grid_cols') || '1', 10);
    const isEndOfRow = ((idx + 1) % colsNum === 0);
    const dividerHtml = (isEndOfRow && idx < pageItems.length - 1) ? `<div class="border-b border-gray-800/80 my-5 col-span-full"></div>` : '';

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

    const mobileCardHtml = (colsNum === 1) ? `
      <!-- 📱 手機端：100% 擬真 Threads 原生黑底串文資訊流 -->
      <div onclick="openDetailModal('${item.id}')" class="threads-card-item ${isMobileDevice ? 'block' : 'block sm:hidden'} border-b border-gray-800/80 pt-3.5 pb-4 px-1 cursor-pointer active:bg-gray-900/30 transition">
        <div class="flex gap-3 items-stretch">
          <!-- 左欄：Threads 圓形頭像 + 串文垂直連接軸線 (固定經典尺寸，不因文字縮放變形) -->
          <div class="w-10 flex flex-col items-center shrink-0">
            <div class="relative w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center text-white text-xs font-black shadow-md shrink-0">
              ${safeNickname.slice(0, 1) || '同'}
              <div class="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-gray-950 rounded-full flex items-center justify-center border border-gray-700 text-[8px] text-white">
                <i class="fa-solid fa-plus"></i>
              </div>
            </div>
            <!-- 垂直連接軸線 (Threads Vertical Rail) -->
            <div class="w-0.5 bg-gray-800/80 flex-1 my-2 rounded-full min-h-[40px]"></div>
          </div>

          <!-- 右欄：發布者資訊、內文、多圖並排、底部按鈕 -->
          <div class="flex-1 min-w-0 space-y-2.5">
            <!-- 頂部列：暱稱 › 分類 · 時間 + 售出打勾 -->
            <div class="flex items-center justify-between gap-1.5">
              <div class="flex items-center gap-2 min-w-0 threads-meta-font truncate">
                <span class="font-black text-gray-100 truncate">${safeNickname}</span>
                <i class="fa-solid fa-chevron-right text-[9px] text-gray-600"></i>
                <span class="font-black ${typeColorClass}">${typeShortText}</span>
                <span class="text-gray-500 font-medium text-[11px]">· ${timeAgo(item.created_at)}</span>
              </div>
              <div class="flex items-center gap-2 shrink-0" onclick="event.stopPropagation()">
                ${isPinned ? '<span class="text-[9px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-black border border-amber-500/30">📌置頂</span>' : ''}
                <button onclick="toggleItemSoldState('${item.id}')" 
                        class="w-7 h-7 rounded-full border shadow flex items-center justify-center transition active:scale-90 font-bold text-xs 
                        ${isSold ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-gray-900 border-gray-700 text-gray-400 hover:text-white'}"
                        title="${isSold ? '標記為未售出' : '標記為已售出'}">
                  <i class="fa-solid ${isSold ? 'fa-check-double' : 'fa-check'} text-xs"></i>
                </button>
              </div>
            </div>

            <!-- 標題與內文：100% 完整自然換行、無任何省略號！ -->
            <div class="space-y-1.5">
              <h3 class="font-black text-gray-100 threads-title-font break-words whitespace-normal" title="${safeTitle}">
                ${isSold ? '<span class="text-emerald-400 font-black">【已售出】</span>' : ''}${safeTitle}
              </h3>
              ${safeDesc ? `<p class="threads-desc-font text-gray-200 break-words whitespace-pre-line font-medium">${safeDesc}</p>` : ''}
              ${p2 ? '<div class="inline-block text-[11px] text-gray-300 bg-gray-900 px-2.5 py-0.5 rounded-full border border-gray-800 font-bold">1/2 多圖</div>' : ''}
            </div>

            <!-- 圖片區：若 2 張圖則並排（如截圖），若 1 張圖則全幅呈現 -->
            ${p2 ? `
              <div class="grid grid-cols-2 gap-2 aspect-[4/3] w-full rounded-2xl overflow-hidden bg-gray-950 border border-gray-800/80">
                <img src="${p1}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop';" class="w-full h-full object-cover">
                <img src="${p2}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop';" class="w-full h-full object-cover">
              </div>
            ` : `
              <div class="relative aspect-[16/10] w-full bg-gray-950 rounded-2xl overflow-hidden border border-gray-800/80">
                <img src="${p1}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop';" class="w-full h-full object-cover block">
              </div>
            `}

            <!-- 底部 Threads 互動操作列 (售價 / 聯絡一鍵複製) -->
            <div class="flex items-center justify-between text-gray-400 pt-2">
              <div class="flex items-center gap-3">
                <span class="font-black text-indigo-300 threads-price-font flex items-center gap-1.5">
                  <i class="fa-solid fa-tag text-xs text-indigo-400"></i> ${priceDisplay}
                </span>
                ${(safeContact && !isSold) ? `
                  <button onclick="event.stopPropagation(); copyContactForItem('${item.id}')" class="threads-meta-font flex items-center gap-1.5 text-indigo-200 hover:text-white font-black active:scale-95 transition bg-indigo-950/90 border border-indigo-500/50 px-3 py-1 rounded-xl shadow">
                    <i class="fa-regular fa-comment text-xs"></i> 聯絡複製
                  </button>
                ` : ''}
              </div>
              <span class="threads-meta-font text-gray-400 font-bold flex items-center gap-1">
                查看詳情 <i class="fa-solid fa-chevron-right text-[9px]"></i>
              </span>
            </div>
          </div>
        </div>
      </div>
    ` : `
      <!-- 📱 手機端 (雙排 IG 懸浮風格：支援 2 行標題完整可讀) -->
      <div onclick="openDetailModal('${item.id}')" class="threads-card-item ${isMobileDevice ? 'block' : 'block sm:hidden'} relative aspect-square bg-gray-950 rounded-2xl overflow-hidden shadow-lg border ${isSold ? 'grayscale opacity-60 border-gray-800' : isPinned ? 'border-amber-500 shadow-amber-500/10' : 'border-gray-800 active:scale-95'} transition cursor-pointer">
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

        <!-- 底部黑色漸層懸浮文字 (放寬為 line-clamp-2 讓標題更完整) -->
        <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-2.5 pt-10 flex flex-col justify-end pointer-events-none">
          <h3 class="font-black text-xs text-white line-clamp-2 leading-snug drop-shadow-md" title="${safeTitle}">${isSold ? '<span class="text-emerald-400">[已售出] </span>' : ''}${safeTitle}</h3>
          <div class="text-xs font-black text-indigo-300 drop-shadow-md mt-0.5">${priceDisplay}</div>
        </div>
      </div>
    `;

    const cardHtml = `
      ${mobileCardHtml}

      <!-- 💻 電腦端 (經典完整豐富卡片風格) -->
      <div onclick="openDetailModal('${item.id}')" class="${isMobileDevice ? 'hidden' : 'hidden sm:flex'} bg-gray-900 border ${isSold ? 'grayscale opacity-60 border-gray-800' : isPinned ? 'border-amber-500/80 shadow-amber-500/10 shadow-lg' : 'border-gray-800 hover:border-indigo-500/60'} rounded-2xl relative transition ${isSold ? '' : 'group'} cursor-pointer overflow-hidden flex-col justify-between shadow-md">
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
          <img data-card-img-id="${item.id}" src="${((item.image_url || '').split('|||')[0] || '').trim() || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop'}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop';" class="w-full h-full object-cover ${isSold ? '' : 'group-hover:scale-105'} transition-transform duration-300 block">
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
              <button onclick="event.stopPropagation(); switchCardPhoto('${item.id}', 0)" class="pointer-events-auto bg-black/75 hover:bg-black text-white w-8 h-8 rounded-full text-xs flex items-center justify-center border border-white/20 transition active:scale-90 shadow-md">
                <i class="fa-solid fa-chevron-left"></i>
              </button>
              <button onclick="event.stopPropagation(); switchCardPhoto('${item.id}', 1)" class="pointer-events-auto bg-black/75 hover:bg-black text-white w-8 h-8 rounded-full text-xs flex items-center justify-center border border-white/20 transition active:scale-90 shadow-md">
                <i class="fa-solid fa-chevron-right"></i>
              </button>
            </div>
            <div class="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-bold px-2 py-0.5 rounded border border-white/20">
              📷 雙圖
            </div>
          ` : ''}
        </div>

        <div class="p-4 flex-1 flex flex-col justify-between space-y-3 bg-gray-900/95">
          <div>
            <h3 class="font-black text-base lg:text-lg text-gray-100 mb-1.5 ${isSold ? '' : 'group-hover:text-indigo-300'} transition leading-snug break-words whitespace-normal" title="${safeTitle}">${isSold ? '<span class="text-emerald-400 font-black">【已售出】</span>' : ''}${safeTitle}</h3>
            <p class="text-base lg:text-lg text-indigo-400 font-black">${priceDisplay}</p>
          </div>

          <div class="space-y-2.5 pt-2.5 border-t border-gray-800/80">
            ${(safeContact && !isSold) ? `
              <div onclick="event.stopPropagation(); handleContactClick('${safeContact}')" class="bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/40 p-2.5 rounded-xl text-xs lg:text-sm text-indigo-200 font-bold flex items-center justify-between gap-2 transition active:scale-95 cursor-pointer shadow-sm" title="點擊一鍵複製聯絡方式">
                <div class="flex items-center gap-1.5 min-w-0 flex-1 truncate">
                  <i class="fa-solid fa-phone text-indigo-400 text-xs shrink-0"></i>
                  <span class="truncate">聯絡：${safeContact}</span>
                </div>
                <span class="text-xs bg-indigo-900 text-indigo-300 px-2 py-0.5 rounded shrink-0 font-bold">點擊複製</span>
              </div>
            ` : ''}

            <div class="flex items-center justify-between text-xs text-gray-400 font-medium">
              <span class="truncate">👤 ${safeNickname}</span>
              <span class="font-bold">${expCountdownHtml}</span>
            </div>
          </div>
        </div>
      </div>
    `;
    
    return cardHtml + dividerHtml;
  }).join('');
}

/**
 * 雙照片卡片無限循環切換 (Looping)
 */
function switchCardPhoto(itemId, dir) {
  const item = allItems.find(i => i.id === itemId);
  if (!item || !item.image_url) return;
  const photos = (item.image_url || '').split('|||').filter(Boolean);
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
}

/**
 * 點擊一鍵複製聯絡方式與商品名稱 (方便直接貼到 LINE / Teams)
 * @param {string} contactStr 聯絡資訊
 * @param {string} [titleStr] 商品標題
 */
function handleContactClick(contactStr, titleStr = '') {
  if (!contactStr) return;
  const cleanTitle = (titleStr || '').replace(/^【.*?】|^\[.*?\]|^\(.*?\)|\s*-\s*【.*?】/, '').trim();
  const textToCopy = cleanTitle ? `【二手商品】${cleanTitle}\n【聯絡方式】${contactStr}` : contactStr;
  copyTextToClipboard(textToCopy, `📋 已複製商品名稱與聯絡方式！可直接貼到 LINE / Teams`);
}

/**
 * 透過 Item ID 一鍵安全複製聯絡資訊與商品名稱
 * @param {string} itemId 商品 ID
 */
function copyContactForItem(itemId) {
  const item = allItems.find(i => i.id === itemId);
  if (!item) return;
  const rawContact = item.contact_info || item.contact || '';
  const rawTitle = item.title || '';
  const cleanTitle = rawTitle.replace(/^【.*?】|^\[.*?\]|^\(.*?\)|\s*-\s*【.*?】/, '').trim();
  const textToCopy = rawContact ? (cleanTitle ? `【二手商品】${cleanTitle}\n【聯絡方式】${rawContact}` : rawContact) : (cleanTitle ? `【二手商品】${cleanTitle}` : '暫無聯絡方式');
  copyTextToClipboard(textToCopy, `📋 已複製商品名稱與聯絡方式！可直接貼到 LINE / Teams`);
}

/**
 * 開啟貼文詳情彈窗 (Modal)
 */
function openDetailModal(itemId) {
  if (typeof closeAllModals === 'function') closeAllModals();
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
      priceElem.className = "detail-price-font font-black text-rose-400 flex items-center gap-1";
    } else {
      priceElem.className = "detail-price-font font-black text-indigo-400";
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
    typeBadge.innerHTML = item.type === 'free' ? '<span class="bg-emerald-500 text-gray-950 font-black px-2.5 py-1 rounded-lg badge-dynamic-font shadow">🎁 免費送</span>' :
                          item.type === 'buy' ? '<span class="bg-amber-500 text-gray-950 font-black px-2.5 py-1 rounded-lg badge-dynamic-font shadow">🔍 想買</span>' :
                          item.type === 'lucky' ? '<span class="bg-rose-500 text-white font-black px-2.5 py-1 rounded-lg badge-dynamic-font shadow">🎁 尾牙</span>' :
                          '<span class="bg-indigo-500 text-white font-black px-2.5 py-1 rounded-lg badge-dynamic-font shadow">💰 想賣</span>';
  }

  // 100% 完整照片不裁切呈現 (object-contain)
  if (photosContainer) {
    const photos = (item.image_url || '').split('|||');
    const p1 = photos[0] || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop';
    const p2 = photos[1] || item.image_url2 || '';

    if (p2) {
      photosContainer.className = "grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-2xl overflow-hidden bg-gray-950/90 border border-gray-700/60 p-2";
      photosContainer.innerHTML = `
        <div class="bg-black/90 rounded-xl overflow-hidden flex items-center justify-center p-1 border border-gray-800">
          <img src="${p1}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop';" class="max-h-72 w-full object-contain rounded-lg">
        </div>
        <div class="bg-black/90 rounded-xl overflow-hidden flex items-center justify-center p-1 border border-gray-800">
          <img src="${p2}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop';" class="max-h-72 w-full object-contain rounded-lg">
        </div>
      `;
    } else {
      photosContainer.className = "grid grid-cols-1 gap-3 rounded-2xl overflow-hidden bg-gray-950/90 border border-gray-700/60 p-2";
      photosContainer.innerHTML = `
        <div class="bg-black/90 rounded-xl overflow-hidden flex items-center justify-center p-1 border border-gray-800">
          <img src="${p1}" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop';" class="max-h-80 w-full object-contain rounded-lg">
        </div>
      `;
    }
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
 * - 📱 手機端 (直立與橫向)：統一維持極致清晰的「雙排 2 卡 (預設)」或「單排 1 卡」
 * - 💻 電腦寬屏：支援 1~5 排自由調整
 */
function changeGridLayout(cols) {
  const isMobile = window.innerWidth < 640 || ('ontouchstart' in window && window.innerWidth < 1024);
  const maxCols = isMobile ? 2 : 5;
  const validCols = Math.min(maxCols, Math.max(1, parseInt(cols, 10) || 2)).toString();
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
  grid.style.gridTemplateColumns = `repeat(${numCols}, minmax(0, 1fr))`;
  grid.style.gap = isMobile ? '0.65rem' : '1.5rem';
}

function updateGridLayoutOptions() {
  const select = document.getElementById('grid-layout-select');
  const isMobile = window.innerWidth < 640 || ('ontouchstart' in window && window.innerWidth < 1024);

  let activeCols = '2';

  if (isMobile) {
    // 📱 手機端 (直立/橫向)：預設【單排 1 卡 (Threads 流)】，標題 100% 完整呈現無省略號
    const storageKey = 'pega_grid_cols_mobile';
    activeCols = localStorage.getItem(storageKey) || '1';
    if (parseInt(activeCols, 10) > 2) activeCols = '1';
    if (select) {
      select.innerHTML = `
        <option value="1">📱 單排 1 卡 (Threads 流 / 預設)</option>
        <option value="2">📱 雙排 2 卡 (IG 方格)</option>
      `;
      select.value = activeCols;
    }
  } else {
    // 💻 電腦模式：支援 1~5 排
    const storageKey = 'pega_grid_cols_pc';
    activeCols = localStorage.getItem(storageKey) || '2';
    if (select) {
      select.innerHTML = `
        <option value="1">單排 1 卡</option>
        <option value="2">雙排 2 卡 (預設)</option>
        <option value="3">三排 3 卡</option>
        <option value="4">四排 4 卡 (電腦)</option>
        <option value="5">五排 5 卡 (寬屏)</option>
      `;
      select.value = activeCols;
    }
  }

  applyGridLayout(activeCols);
  renderItems();
}

/**
 * 刊登類型選擇
 */
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

/**
 * 開啟刊登貼文彈窗
 */
function openCreateModal() {
  if (typeof closeAllModals === 'function') closeAllModals();
  editingItemId = null;
  tempEditPassword = "";

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
  
  document.getElementById('post-img1-url').value = "";
  document.getElementById('post-img2-url').value = "";
  
  const preview1 = document.getElementById('preview-box-1');
  const preview2 = document.getElementById('preview-box-2');
  const previewsGrid = document.getElementById('upload-previews-grid');
  if (preview1) preview1.classList.add('hidden');
  if (preview2) preview2.classList.add('hidden');
  if (previewsGrid) previewsGrid.classList.add('hidden');
  
  document.getElementById('file1-status').innerText = '點擊上傳圖檔';
  document.getElementById('file2-status').innerText = '點擊上傳第二張';

  setPostType('sell');

  const randPwd = Math.floor(1000 + Math.random() * 9000).toString();
  document.getElementById('post-edit-password').value = randPwd;

  document.querySelector('#create-modal h3').innerHTML = `<i class="fa-solid fa-plus-circle text-indigo-400"></i> 我要發布告示牌貼文`;
  document.getElementById('submit-create-btn').innerText = `🎉 發布貼文`;

  hideCreateError();
  document.getElementById('create-modal').classList.remove('hidden');
}

function closeCreateModal() {
  document.getElementById('create-modal').classList.add('hidden');
}

/**
 * 編輯我的貼文
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

  document.getElementById('post-title').value = item.title || "";
  document.getElementById('post-contact').value = item.contact_info || "";
  document.getElementById('post-desc').value = item.description || "";
  document.getElementById('post-edit-password').value = finalPwd;

  setPostType(item.type);

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

  document.getElementById('item-expiration').value = "none";

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
    const urls = item.image_url.split('|||').filter(Boolean);
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

  document.querySelector('#create-modal h3').innerHTML = `<i class="fa-solid fa-pen-to-square text-indigo-400"></i> 修改告示牌貼文`;
  document.getElementById('submit-create-btn').innerText = `💾 儲存修改`;

  document.getElementById('create-modal').classList.remove('hidden');
}

/**
 * 提交發布或更新貼文
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

  const finalImgUrl = imgUrl2 ? `${imgUrl1}|||${imgUrl2}` : imgUrl1;

  let finalDesc = desc;
  if (expDays !== 'none' && !editingItemId) {
    const d = new Date();
    d.setDate(d.getDate() + parseInt(expDays, 10));
    finalDesc = `${desc}\n[EXP:${d.toISOString()}]`;
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
      // INSERT 模式
      const payload = {
        title: title,
        description: finalDesc,
        price: finalPrice,
        type: postType,
        image_url: finalImgUrl,
        nickname: myNickname,
        device_id: myDeviceId,
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

        await loadItems(newItemId);
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
 * 快速滾動至最上方第一筆資料
 */
function scrollToTopItem() {
  const visibleCards = getVisibleCards();
  if (visibleCards.length > 0) {
    visibleCards[0].scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  showNotification('⬆️ 已快速捲動至最上方的一筆資料！', 'info');
}

/**
 * 快速滾動至最下方最後一筆資料
 */
function scrollToBottomItem() {
  const visibleCards = getVisibleCards();
  if (visibleCards.length > 0) {
    visibleCards[visibleCards.length - 1].scrollIntoView({ behavior: 'smooth', block: 'end' });
  } else {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
  }
  showNotification('⬇️ 已快速捲動至最下方的一筆資料！', 'info');
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
window.scrollToTopItem = scrollToTopItem;
window.scrollToBottomItem = scrollToBottomItem;
window.toggleMobileSearch = toggleMobileSearch;
window.closeSearchOverlay = closeSearchOverlay;
window.syncOverlaySearch = syncOverlaySearch;
window.clearOverlaySearch = clearOverlaySearch;
window.applyQuickSearch = applyQuickSearch;
window.setupMobileInfiniteScroll = setupMobileInfiniteScroll;
window.initDetailModalGestures = initDetailModalGestures;



