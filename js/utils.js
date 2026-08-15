/**
 * PEGA 二手匿名交易空間 - 通用工具與防護函式庫 (js/utils.js)
 */

/**
 * 嚴格 HTML 字符跳脫 (XSS 防護)
 * @param {string|any} str 原始字串
 * @returns {string} 跳脫後的安全字串
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * 關閉全站所有彈窗 (確保彈窗互斥，避免圖層遮擋或隱藏在下層)
 */
function closeAllModals() {
  const modalIds = [
    'admin-modal', 
    'archive-modal', 
    'issue-modal', 
    'detail-modal', 
    'create-modal', 
    'online-users-modal'
  ];
  modalIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
}

/**
 * 全站浮動 Toast 提示訊息
 * @param {string} msg 訊息內容
 * @param {'success'|'warning'|'info'} type 提示類型
 */
function showNotification(msg, type = 'info') {
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
  
  const iconClass = type === 'success' ? 'fa-circle-check' : (type === 'warning' ? 'fa-triangle-exclamation' : 'fa-circle-info');
  toast.innerHTML = `<i class="fa-solid ${iconClass} text-sm"></i><span>${escapeHtml(msg)}</span>`;
  
  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3500);
}

/**
 * 純 JS 備援 SHA-256 演算法 (確保在手機區網 HTTP 192.168.x.x 等非安全環境下 100% 正常運作)
 */
function jsSha256(ascii) {
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }
  var mathPow = Math.pow;
  var maxWord = mathPow(2, 32);
  var lengthProperty = 'length';
  var i, j;
  var result = '';
  var words = [];
  var asciiBitLength = ascii[lengthProperty] * 8;
  var hash = [];
  var k = [];
  var primeCounter = 0;
  var isComposite = {};
  for (var candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = candidate;
      }
      hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1/3) * maxWord) | 0;
    }
  }
  ascii += '\x80';
  while (ascii[lengthProperty] % 64 - 56) ascii += '\x00';
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return '';
    words[i >> 2] |= j << ((3 - i) % 4) * 8;
  }
  words[words[lengthProperty]] = ((asciiBitLength / maxWord) | 0);
  words[words[lengthProperty]] = (asciiBitLength) | 0;
  for (j = 0; j < words[lengthProperty];) {
    var w = words.slice(j, j += 16);
    var oldHash = hash;
    hash = hash.slice(0, 8);
    for (i = 0; i < 64; i++) {
      var w15 = w[i - 15], w2 = w[i - 2];
      var s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      var s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      w[i] = (i < 16) ? w[i] : (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      var s0_a = rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22);
      var maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      var t2 = (s0_a + maj) | 0;
      var s1_e = rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25);
      var ch = (hash[4] & hash[5]) ^ ((~hash[4]) & hash[6]);
      var t1 = (hash[7] + s1_e + ch + k[i] + w[i]) | 0;
      hash = [(t1 + t2) | 0].concat(hash);
      hash[4] = (hash[4] + t1) | 0;
    }
    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }
  for (i = 0; i < 8; i++) {
    for (j = 3; j + 1; j--) {
      var b = (hash[i] >> (j * 8)) & 255;
      result += ((b < 16) ? 0 : '') + b.toString(16);
    }
  }
  return result;
}

/**
 * SHA-256 密碼雜湊計算 (支援 WebCrypto 與 Pure JS 雙重備援)
 * @param {string} str 欲計算雜湊的字串
 * @returns {Promise<string>} 16 進位 SHA-256 雜湊值
 */
async function sha256(str) {
  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle && typeof window.crypto.subtle.digest === 'function') {
      const buf = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {
    console.warn('WebCrypto not available, using pure JS fallback', e);
  }
  return jsSha256(str);
}

/**
 * 格式化相對發布時間 (例如: 3分鐘前, 2小時前)
 * @param {string} dateStr ISO 時間字串
 * @returns {string} 相對時間描述
 */
function timeAgo(dateStr) {
  if (!dateStr) return '不久前';
  const d = new Date(dateStr);
  const diff = Math.floor((new Date() - d) / 1000);
  if (diff < 60) return '剛才';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分鐘前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小時前`;
  return `${Math.floor(diff / 86400)} 天前`;
}

/**
 * 取得商品到期時間字串
 */
function getItemExpiration(item) {
  if (!item) return null;
  if (item.expires_at) return item.expires_at;
  const match = (item.description || '').match(/\[EXP:(.*?)\]/);
  return match ? match[1] : null;
}

/**
 * 過濾掉內嵌標記的純文字描述
 */
function getCleanDescription(desc) {
  if (!desc) return '';
  return desc.replace(/\[EXP:.*?\]/g, '').replace(/\[SOLD_AT:.*?\]/g, '').trim();
}

/**
 * 判斷商品是否已標記為已售出
 */
function isItemSold(item) {
  return (item?.description || '').includes('[SOLD_AT:');
}

/**
 * 取得商品標記售出的時間
 */
function getItemSoldTime(item) {
  const match = (item?.description || '').match(/\[SOLD_AT:(.*?)\]/);
  return match ? new Date(match[1]) : null;
}

/**
 * 取得商品倒數計時 HTML
 */
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

/**
 * 原生 HTML5 Canvas 圖片前端等比壓縮並上傳 Supabase Storage
 * @param {File} file 圖片檔案
 * @returns {Promise<string>} 圖片公開網址
 */
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

          const filename = `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`;
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

/**
 * 處理檔案選取、壓縮與預覽展示
 */
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
    showNotification(`⚠️ 照片 ${num} 上傳失敗，請稍後再試`, 'warning');
  }
}

/**
 * 切換以物易物輸入模式
 */
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

/**
 * 快速禮券折扣試算 (9折 / 95折)
 */
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

/**
 * 快速滾動至商品網格頂部
 */
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

/**
 * 快速滾動至商品網格底部
 */
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

/**
 * 全站字體切換 (sm / base / lg / xl)
 */
/**
 * 全站動態字體大小控制器 (支援 5 級：A⁻, A, A⁺, A⁺⁺, A⁺⁺⁺)
 * @param {'sm'|'base'|'lg'|'xl'|'2xl'} level 字體級別
 * @param {boolean} [showToast] 是否彈出提示訊息
 */
function setFontSize(level, showToast = true) {
  const levels = ['sm', 'base', 'lg', 'xl', '2xl'];
  if (!levels.includes(level)) level = 'base';

  document.documentElement.classList.remove('font-level-sm', 'font-level-base', 'font-level-lg', 'font-level-xl', 'font-level-2xl');
  document.documentElement.classList.add(`font-level-${level}`);

  levels.forEach(l => {
    const btn = document.getElementById(`font-btn-${l}`);
    if (btn) {
      if (l === level) {
        btn.className = 'px-1.5 sm:px-2 py-1 rounded-lg text-xs font-black transition bg-amber-400 text-gray-950 shadow-md';
      } else {
        btn.className = 'px-1.5 sm:px-2 py-1 rounded-lg text-xs font-bold transition text-gray-400 hover:text-amber-300 hover:bg-gray-800';
      }
    }
  });

  localStorage.setItem('pega_user_font_size', level);
  if (showToast) {
    const levelNames = {
      'sm': '小 (A⁻)',
      'base': '標準 (A)',
      'lg': '大 (A⁺)',
      'xl': '特大 (A⁺⁺)',
      '2xl': '超大 (A⁺⁺⁺)'
    };
    showNotification(`🔤 字體大小已切換為：${levelNames[level] || level}`, 'info');
  }
}

/**
 * 初始化載入已儲存之字體設定
 */
function initFontSize() {
  const savedLevel = localStorage.getItem('pega_user_font_size') || 'base';
  setFontSize(savedLevel, false);
}

/**
 * 全平台無痛剪貼簿複製 (含非 HTTPS / 區域網路 HTTP 與舊版 Safari 專用 Fallback)
 * @param {string} textToCopy 欲複製的內容
 * @param {string} [successMsg] 成功提示文字
 */
function copyTextToClipboard(textToCopy, successMsg = '📋 已成功複製到剪貼簿！') {
  if (!textToCopy) return false;

  // 1. 優先嘗試標準 Clipboard API (僅在 HTTPS 或 Localhost 安全上下文可用)
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(textToCopy)
      .then(() => showNotification(successMsg, 'success'))
      .catch(() => fallbackCopy(textToCopy, successMsg));
    return true;
  }

  // 2. 局域網 HTTP (如 192.168.x.x) 或手機 Safari: 使用 textarea + execCommand
  fallbackCopy(textToCopy, successMsg);
  return true;
}

function fallbackCopy(text, successMsg) {
  let successful = false;
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    // iOS Safari 專用樣式 (不可 readonly、定位在可視視窗內)
    textarea.style.fontSize = '16px';
    textarea.style.position = 'fixed';
    textarea.style.left = '0';
    textarea.style.top = '0';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    textarea.style.zIndex = '-1';
    document.body.appendChild(textarea);
    
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, text.length);

    successful = document.execCommand('copy');
    document.body.removeChild(textarea);
  } catch (err) {
    console.warn('execCommand error:', err);
    successful = false;
  }

  if (successful) {
    showNotification(successMsg, 'success');
  } else {
    // 若手機瀏覽器完全阻擋自動剪貼簿 (如純 HTTP 局域網)，彈出精美複製視窗
    showCopyModal(text);
  }
}

/**
 * 針對嚴格受限環境的彈窗複製備援
 */
function showCopyModal(text) {
  let modal = document.getElementById('quick-copy-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'quick-copy-modal';
    modal.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn';
    document.body.appendChild(modal);
  }
  
  modal.innerHTML = `
    <div class="bg-gray-900 border border-indigo-500/50 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl text-left animate-fadeIn">
      <div class="flex items-center justify-between">
        <h4 class="font-black text-sm text-indigo-300 flex items-center gap-1.5">
          <i class="fa-solid fa-copy text-indigo-400"></i> 請長按全選複製內容
        </h4>
        <button onclick="document.getElementById('quick-copy-modal').classList.add('hidden')" class="w-7 h-7 rounded-full bg-gray-800 text-gray-400 hover:text-white flex items-center justify-center text-xs">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <textarea id="quick-copy-textarea" class="w-full bg-gray-950 border border-gray-700 rounded-xl p-3 text-xs text-gray-200 font-bold leading-relaxed focus:outline-none focus:border-indigo-500 h-28 resize-none select-all" readonly>${escapeHtml(text)}</textarea>
      <div class="flex gap-2">
        <button onclick="navigator.clipboard && navigator.clipboard.writeText('${escapeHtml(text).replace(/'/g, "\\'")}'); document.getElementById('quick-copy-textarea').select(); document.execCommand('copy'); showNotification('📋 複製成功！', 'success'); setTimeout(() => document.getElementById('quick-copy-modal').classList.add('hidden'), 500);" class="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-xs transition active:scale-95 shadow">
          一鍵全選複製
        </button>
        <button onclick="document.getElementById('quick-copy-modal').classList.add('hidden')" class="px-4 py-2.5 bg-gray-800 text-gray-300 rounded-xl font-bold text-xs">
          關閉
        </button>
      </div>
    </div>
  `;
  modal.classList.remove('hidden');
  setTimeout(() => {
    const ta = document.getElementById('quick-copy-textarea');
    if (ta) {
      ta.focus();
      ta.select();
    }
  }, 100);
}

// 綁定全域以供 HTML 呼叫
window.escapeHtml = escapeHtml;
window.showNotification = showNotification;
window.copyTextToClipboard = copyTextToClipboard;
window.sha256 = sha256;
window.timeAgo = timeAgo;
window.getItemExpiration = getItemExpiration;
window.getCleanDescription = getCleanDescription;
window.isItemSold = isItemSold;
window.getItemSoldTime = getItemSoldTime;
window.getExpirationCountdown = getExpirationCountdown;
window.compressAndUploadImage = compressAndUploadImage;
window.handleImageSelect = handleImageSelect;
window.toggleSwapMode = toggleSwapMode;
window.applyCouponDiscount = applyCouponDiscount;
window.scrollToTopItem = scrollToTopItem;
window.scrollToBottomItem = scrollToBottomItem;
window.setFontSize = setFontSize;
window.initFontSize = initFontSize;
window.closeAllModals = closeAllModals;


