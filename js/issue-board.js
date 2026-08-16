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
 * 驗證版主權限 (若尚未登入則彈出密碼輸入框)
 */
async function ensureAdminAuth(actionDesc = '執行管理操作') {
  if (isAdmin && localStorage.getItem('pega_admin_hash')) return true;
  const pwd = prompt(`🔐 請輸入版主管理密碼以${actionDesc}：`);
  if (!pwd) return false;

  try {
    const inputHash = await sha256(pwd.trim());
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
        const btnText = document.getElementById('admin-btn-text');
        if (btnText) btnText.innerText = '管理面板 (已登入)';
        showNotification('🔑 版主身份驗證成功！', 'success');
        return true;
      }
    }
    showNotification('⚠️ 密碼不正確，操作已取消', 'warning');
    return false;
  } catch(e) {
    console.error('Admin auth check error:', e);
    showNotification('⚠️ 連線驗證失敗：' + e.message, 'warning');
    return false;
  }
}

/**
 * 版主標記留言已修復/重新打開
 */
async function toggleResolveIssue(issueId, isCurrentlyResolved) {
  const authed = await ensureAdminAuth(!isCurrentlyResolved ? '標記此留言為已處理' : '恢復此留言為處理中');
  if (!authed) return;
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
      showNotification(!isCurrentlyResolved ? '✅ 已標記為【已處理完成】並自動沉底！' : '⚡ 已標記為處理中', 'success');
      loadAndRenderIssues();
    }
  } catch(e) {
    console.error('Resolve issue error:', e);
  }
}

/**
 * 版主快速回覆同仁留言並標記處理
 */
async function replyIssueAdmin(issueId) {
  const authed = await ensureAdminAuth('回覆此筆同仁留言');
  if (!authed) return;

  const replyText = prompt('💬 請輸入要回覆給同仁的說明內容：');
  if (!replyText || !replyText.trim()) return;

  const pwdHash = localStorage.getItem('pega_admin_hash') || '';
  try {
    const fetchRes = await fetch(`${SUPABASE_URL}/rest/v1/messages?id=eq.${issueId}&select=content`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const msgData = await fetchRes.json();
    if (!msgData || msgData.length === 0) return;

    let content = msgData[0].content || '';
    content = content.replace(/\[ADMIN_REPLY:[\s\S]*?\]/g, '').replace(/\[RESOLVED\]/g, '').trim();
    content = `${content}\n[ADMIN_REPLY: ${replyText.trim()}]\n[RESOLVED]`;

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
      showNotification('💬 已成功送出版主回覆並標記為處理完成！', 'success');
      loadAndRenderIssues();
    }
  } catch (e) {
    console.error('Reply issue error:', e);
    showNotification('⚠️ 回覆留言失敗：' + e.message, 'warning');
  }
}

/**
 * 版主刪除單筆留言紀錄
 */
async function deleteIssueAdmin(issueId) {
  const authed = await ensureAdminAuth('刪除這筆留言紀錄');
  if (!authed) return;

  if (!confirm('⚠️ 確定要永久刪除這筆留言紀錄嗎？\n此操作無法復原！')) return;
  try {
    const pwdHash = localStorage.getItem('pega_admin_hash') || '';
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/delete_issue_admin`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ issue_id: issueId, pwd_input: pwdHash })
    });
    if (res.ok) {
      showNotification('🗑️ 留言紀錄已成功刪除', 'info');
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
        container.innerHTML = '<p class="text-gray-500 text-center py-10 text-xs font-bold">💬 尚無任何留言歷史紀錄</p>';
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
        container.innerHTML = '<p class="text-gray-500 text-center py-10 text-xs font-bold">💬 尚無待處理的同仁留言反饋</p>';
        return;
      }

      activeIssues.sort((a, b) => {
        const aResolved = (a.content || '').includes('[RESOLVED]') ? 1 : 0;
        const bResolved = (b.content || '').includes('[RESOLVED]') ? 1 : 0;
        return aResolved - bResolved;
      });

      const batchToolbar = document.getElementById('issue-admin-batch-toolbar');
      if (batchToolbar) {
        batchToolbar.classList.remove('hidden');
      }

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
          <div class="p-3.5 sm:p-4 ${isResolved ? 'bg-gray-950/70 opacity-80 border-gray-800' : 'bg-gray-900/90 border-gray-700/80 shadow-md'} border rounded-2xl space-y-2.5 transition">
            <div class="flex items-center justify-between text-xs">
              <div class="flex items-center gap-2">
                <input type="checkbox" class="issue-select-chk w-4 h-4 rounded border-gray-600 text-amber-500 focus:ring-amber-400 bg-gray-950 cursor-pointer" value="${iss.id}" onchange="updateIssueBatchUI()">
                <span class="font-bold text-gray-200 flex items-center gap-1.5">
                  <i class="fa-solid fa-circle-user text-amber-400"></i> ${safeSenderName} 
                  ${isResolved ? 
                    '<span class="bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 text-xs font-bold px-2 py-0.5 rounded-md">✅ 版主已回覆並處理完成</span>' : 
                    '<span class="bg-amber-950/80 text-amber-400 border border-amber-500/40 text-xs font-bold px-2 py-0.5 rounded-md animate-pulse">⚡ 處理中 / 待版主回覆</span>'}
                </span>
              </div>
              <span class="text-xs text-gray-500 font-bold">${timeAgo(iss.created_at)}</span>
            </div>

            <div class="text-xs sm:text-sm text-gray-200 leading-relaxed font-medium bg-black/40 p-3 rounded-xl border border-white/5 whitespace-pre-line shadow-inner">
              ${safeUserText}
            </div>

            ${safeReplyText ? `
              <div class="p-3 bg-indigo-950/80 border border-indigo-500/40 rounded-xl text-xs sm:text-sm text-indigo-200 space-y-1 shadow-inner">
                <div class="font-bold text-amber-300 flex items-center gap-1.5"><i class="fa-solid fa-shield-halved text-amber-400"></i> 版主回覆與處理說明：</div>
                <div class="whitespace-pre-line leading-relaxed font-medium text-gray-100">${safeReplyText}</div>
              </div>
            ` : ''}

            <div class="flex items-center justify-end gap-2 pt-1 border-t border-gray-800/80">
              <button onclick="replyIssueAdmin('${iss.id}')" class="px-2.5 py-1 bg-indigo-900/70 hover:bg-indigo-800 text-indigo-200 text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer">
                💬 版主回覆
              </button>
              <button onclick="toggleResolveIssue('${iss.id}', ${isResolved})" class="px-2.5 py-1 ${isResolved ? 'bg-amber-900/60 hover:bg-amber-800 text-amber-300' : 'bg-emerald-900/60 hover:bg-emerald-800 text-emerald-300'} text-xs font-bold rounded-lg transition cursor-pointer">
                ${isResolved ? '↩️ 恢復處理中' : '✍️ 標記已處理'}
              </button>
              <button onclick="deleteIssueAdmin('${iss.id}')" class="px-2.5 py-1 bg-rose-950/70 hover:bg-rose-900 border border-rose-700/50 text-rose-300 text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer">
                <i class="fa-solid fa-trash-can text-[10px]"></i> 刪除
              </button>
            </div>
          </div>
        `;
      }).join('');
      updateIssueBatchUI();
    }
  } catch(e) {
    console.error('Load issues error:', e);
  }
}

/**
 * 全選或取消全選留言
 */
function toggleSelectAllIssues(checked) {
  const chks = document.querySelectorAll('.issue-select-chk');
  chks.forEach(c => c.checked = checked);
  updateIssueBatchUI();
}

/**
 * 更新批次選取狀態與按鈕可用度
 */
function updateIssueBatchUI() {
  const chks = document.querySelectorAll('.issue-select-chk:checked');
  const count = chks.length;
  const badge = document.getElementById('issue-selected-count-badge');
  const btn = document.getElementById('issue-batch-delete-btn');
  const selectAll = document.getElementById('issue-select-all-checkbox');

  if (badge) badge.innerText = `已選 ${count} 則`;
  if (btn) {
    if (count > 0) {
      btn.disabled = false;
      btn.classList.remove('opacity-50', 'cursor-not-allowed');
    } else {
      btn.disabled = true;
      btn.classList.add('opacity-50', 'cursor-not-allowed');
    }
  }

  const allChks = document.querySelectorAll('.issue-select-chk');
  if (selectAll && allChks.length > 0) {
    selectAll.checked = (count === allChks.length);
  }
}

/**
 * 版主執行批次刪除留言
 */
async function deleteSelectedIssuesAdmin() {
  const checkedBoxes = Array.from(document.querySelectorAll('.issue-select-chk:checked'));
  const ids = checkedBoxes.map(c => c.value);

  if (ids.length === 0) {
    showNotification('⚠️ 請先勾選要刪除的留言紀錄！', 'warning');
    return;
  }

  const authed = await ensureAdminAuth(`批次刪除選取的 ${ids.length} 則留言紀錄`);
  if (!authed) return;

  if (!confirm(`⚠️ 確定要批次永久刪除選取的 ${ids.length} 則留言紀錄嗎？\n此操作無法復原！`)) return;

  const pwdHash = localStorage.getItem('pega_admin_hash') || '';
  const btn = document.getElementById('issue-batch-delete-btn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 批次刪除中...';
  }

  try {
    const results = await Promise.all(ids.map(id => {
      return fetch(`${SUPABASE_URL}/rest/v1/rpc/delete_issue_admin`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ issue_id: id, pwd_input: pwdHash })
      });
    }));

    const successCount = results.filter(r => r.ok).length;
    showNotification(`🗑️ 已成功批次刪除 ${successCount} 則留言紀錄！`, 'success');
    await loadAndRenderIssues();
  } catch(e) {
    console.error('Batch delete issues error:', e);
    showNotification('⚠️ 批次刪除發生異常：' + e.message, 'warning');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-trash-can"></i> 批次刪除選取';
    }
    const selectAll = document.getElementById('issue-select-all-checkbox');
    if (selectAll) selectAll.checked = false;
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
window.replyIssueAdmin = replyIssueAdmin;
window.ensureAdminAuth = ensureAdminAuth;
window.switchIssueTab = switchIssueTab;
window.openIssueModal = openIssueModal;
window.closeIssueModal = closeIssueModal;
window.toggleResolveIssue = toggleResolveIssue;
window.deleteIssueAdmin = deleteIssueAdmin;
window.loadAndRenderIssues = loadAndRenderIssues;
window.submitNewIssue = submitNewIssue;
window.toggleSelectAllIssues = toggleSelectAllIssues;
window.updateIssueBatchUI = updateIssueBatchUI;
window.deleteSelectedIssuesAdmin = deleteSelectedIssuesAdmin;
