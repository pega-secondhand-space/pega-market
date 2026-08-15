/**
 * PEGA 二手匿名交易空間 - 問題回報與建議留言板 (js/issue-board.js)
 */

/**
 * 切換問題回報分頁 (填寫表單 / 查看留言紀錄)
 * @param {'form'|'list'} tab 分頁名稱
 */
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

/**
 * 開啟問題回報彈窗
 */
function openIssueModal() {
  if (typeof closeAllModals === 'function') closeAllModals();
  document.getElementById('issue-modal').classList.remove('hidden');
  loadAndRenderIssues();
}

/**
 * 關閉問題回報彈窗
 */
function closeIssueModal() {
  document.getElementById('issue-modal').classList.add('hidden');
}

/**
 * 版主標記留言已修復/重新打開
 */
async function toggleResolveIssue(issueId, isCurrentlyResolved) {
  if (!isAdmin) return showNotification('⚠️ 只有版主可以變更處理狀態', 'warning');
  const pwdHash = localStorage.getItem('pega_admin_hash') || '';
  
  try {
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

/**
 * 版主刪除留言紀錄
 */
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

/**
 * 載入並渲染所有問題與建議留言
 */
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

      // 自動過濾已解決超過 30 天的歷史留言
      const activeIssues = issues.filter(iss => {
        const cnt = iss.content || '';
        if (cnt.includes('[RESOLVED_AT:')) {
          const m = cnt.match(/\[RESOLVED_AT:(.*?)\]/);
          if (m && m[1]) {
            const resTime = new Date(m[1]);
            const diffMs = new Date() - resTime;
            if (diffMs > 30 * 24 * 60 * 60 * 1000) {
              return false;
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

      activeIssues.sort((a, b) => {
        const aResolved = (a.content || '').includes('[RESOLVED]') ? 1 : 0;
        const bResolved = (b.content || '').includes('[RESOLVED]') ? 1 : 0;
        return aResolved - bResolved;
      });

      container.innerHTML = activeIssues.map(iss => {
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
          <div class="p-3.5 ${isResolved ? 'bg-gray-950/60 opacity-80 border-gray-800/60' : 'bg-gray-900 border-gray-700/80'} border rounded-2xl space-y-2 transition">
            <div class="flex items-center justify-between text-xs">
              <span class="font-bold text-gray-200 flex items-center gap-1.5">
                <i class="fa-solid fa-circle-user text-amber-400"></i> ${safeSenderName} 
                ${isResolved ? 
                  '<span class="bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 text-xs font-bold px-2 py-0.5 rounded-md">✅ 版主已回覆並處理完成</span>' : 
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
                  ${isResolved ? '↩️ 恢復處理中' : '✍️ 標記已處理'}
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

/**
 * 提交新的問題或建議
 */
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
        sender_id: myDeviceId,
        sender_name: myNickname,
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

// 綁定全域以供呼叫
window.switchIssueTab = switchIssueTab;
window.openIssueModal = openIssueModal;
window.closeIssueModal = closeIssueModal;
window.toggleResolveIssue = toggleResolveIssue;
window.deleteIssueAdmin = deleteIssueAdmin;
window.loadAndRenderIssues = loadAndRenderIssues;
window.submitNewIssue = submitNewIssue;
