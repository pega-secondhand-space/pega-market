

    window.onerror = function(msg, url, lineNo, columnNo, error) {
      var errBox = document.getElementById('debug-error-box');
      if (errBox) {
        errBox.classList.remove('hidden');
        errBox.innerHTML = '<strong>⚠️ 系統載入提示：</strong> ' + msg + ' (Line: ' + lineNo + ')';
      }
      return false;
    };
  

    const SUPABASE_URL = 'https://llnnbanqtmnccfvtwooo.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxsbm5iYW5xdG1uY2NmdnR3b29vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTI5MTkyNiwiZXhwIjoyMTAwODY3OTI2fQ.RTdMtKEw9tD3N2KSO3mY7M2Z4ZVB1ZY24SPv-yzL0Hk';

    var db = null;
    try {
      if (typeof supabase !== 'undefined' && supabase.createClient) {
        db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      } else {
        console.warn('Supabase SDK CDN failed to load properly.');
      }
    } catch(e) {
      console.error('Supabase init error:', e);
    }

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

    var userDisp = document.getElementById('user-display');
    if (userDisp) userDisp.innerText = '你的代號：' + nickname;

    if (isAdmin) {
      var adminBtnText = document.getElementById('admin-btn-text');
      if (adminBtnText) adminBtnText.innerText = '後台管理 (已登入)';
    }

    const savedBg = localStorage.getItem('pega_bg_url');
    if (savedBg) {
      var mainBody = document.getElementById('main-body');
      if (mainBody) mainBody.style.backgroundImage = `url('${savedBg}')`;
      var bgInput = document.getElementById('bg-url-input');
      if (bgInput) bgInput.value = savedBg;
    }

    const isMobile = window.innerWidth < 640;
    let savedCols = localStorage.getItem('pega_grid_cols');
    if (!savedCols) {
      savedCols = isMobile ? '2' : '4';
      localStorage.setItem('pega_grid_cols', savedCols);
    }
    
    var gridSelect = document.getElementById('grid-layout-select');
    if (gridSelect) gridSelect.value = savedCols;
    applyGridLayout(savedCols);

    function changeGridLayout(cols) {
      localStorage.setItem('pega_grid_cols', cols);
      applyGridLayout(cols);
    }

    function applyGridLayout(cols) {
      const container = document.getElementById('grid-container');
      const grid = document.getElementById('item-grid');
      if (!container || !grid) return;
      
      container.className = container.className.replace(/max-w-[^\s]+/g, '').trim();
      grid.className = grid.className.replace(/grid-cols-\d+/g, '').trim();

      const maxWMap = {
        '1': 'max-w-xs',
        '2': 'max-w-xl',
        '3': 'max-w-3xl',
        '4': 'max-w-5xl',
        '5': 'max-w-7xl'
      };

      const containerWidth = maxWMap[cols] || 'max-w-5xl';
      container.classList.add(containerWidth);
      grid.classList.add(`grid-cols-${cols}`);
    }

    
    // 🔄 點擊頂部標題一鍵刷新
    function refreshPageData() {
      const searchInput = document.getElementById('search-input');
      if (searchInput) searchInput.value = '';
      setFilter('all');
      const grid = document.getElementById('item-grid');
      if (grid) grid.innerHTML = '<p class="col-span-full text-gray-400 text-center py-12 text-sm">正在重新載入刊登項目中...</p>';
  
