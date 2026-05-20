// ===========================
//  CHATTY — UI MODULE
// ===========================

const UI = (() => {

  // ---- TOAST ----
  let toastTimer = null;
  function showToast(msg, type = '', duration = 2800) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = `toast show ${type}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.className = 'toast'; }, duration);
  }

  // ---- STORAGE BAR ----
  function updateStorageBar() {
    const stats = Storage.getStorageStats();
    const fill  = document.getElementById('storageFill');
    const label = document.getElementById('storageLabel');
    if (fill)  fill.style.width  = stats.pct + '%';
    if (label) label.textContent = stats.label;
  }

  // ---- MODEL DROPDOWN ----
  function buildModelDropdown(currentModel) {
    const dd = document.getElementById('modelDropdown');
    dd.innerHTML = '';
    for (const group of Models.getAll()) {
      const gl = document.createElement('div');
      gl.className = 'model-group-label';
      gl.textContent = group.group;
      dd.appendChild(gl);
      for (const m of group.items) {
        const opt = document.createElement('div');
        opt.className = 'model-option' + (m.id === currentModel ? ' active' : '');
        opt.dataset.id = m.id;
        opt.innerHTML = `
          <div class="model-option-info">
            <div class="model-option-name">${m.name}</div>
            <div class="model-option-desc">${m.desc}</div>
          </div>
          <span class="model-badge ${m.badge}">${m.badge}</span>`;
        dd.appendChild(opt);
      }
    }
  }

  function setModelPill(modelId) {
    const name = document.getElementById('modelName');
    if (name) name.textContent = Models.getDisplayName(modelId);
  }

  // ---- CONVERSATION LIST ----
  function renderConversationList(conversations, activeId, onSelect, onDelete) {
    const list = document.getElementById('conversationList');
    if (!list) return;
    list.innerHTML = '';

    if (!conversations.length) {
      list.innerHTML = '<div class="no-convs">No conversations yet.<br>Start a new chat!</div>';
      return;
    }

    // Group by date
    const now   = Date.now();
    const DAY   = 86400000;
    const groups = { Today: [], Yesterday: [], 'This week': [], Older: [] };

    for (const c of conversations) {
      const diff = now - c.updatedAt;
      if (diff < DAY)         groups['Today'].push(c);
      else if (diff < 2*DAY)  groups['Yesterday'].push(c);
      else if (diff < 7*DAY)  groups['This week'].push(c);
      else                    groups['Older'].push(c);
    }

    for (const [label, items] of Object.entries(groups)) {
      if (!items.length) continue;
      const gl = document.createElement('div');
      gl.className = 'conv-group-label';
      gl.textContent = label;
      list.appendChild(gl);

      for (const c of items) {
        const el = document.createElement('div');
        el.className = 'conv-item' + (c.id === activeId ? ' active' : '');
        el.dataset.id = c.id;
        el.innerHTML = `
          <span class="conv-title" title="${escHtml(c.title)}">${escHtml(c.title)}</span>
          <button class="conv-delete" data-id="${c.id}" title="Delete">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>`;
        el.addEventListener('click', (e) => {
          if (e.target.closest('.conv-delete')) {
            e.stopPropagation();
            onDelete(c.id);
          } else {
            onSelect(c.id);
          }
        });
        list.appendChild(el);
      }
    }
  }

  // ---- SEARCH FILTER ----
  function filterConversations(query) {
    const items = document.querySelectorAll('.conv-item');
    const q = query.toLowerCase();
    items.forEach(el => {
      const title = el.querySelector('.conv-title')?.textContent.toLowerCase() || '';
      el.style.display = title.includes(q) ? '' : 'none';
    });
    document.querySelectorAll('.conv-group-label').forEach(label => {
      const next = label.nextElementSibling;
      let hasVisible = false;
      let sib = label.nextElementSibling;
      while (sib && !sib.classList.contains('conv-group-label')) {
        if (sib.style.display !== 'none') hasVisible = true;
        sib = sib.nextElementSibling;
      }
      label.style.display = hasVisible ? '' : 'none';
    });
  }

  // ---- MESSAGES ----
  function renderMessage(msg, convAvatarUrl) {
    const isUser = msg.role === 'user';
    const el = document.createElement('div');
    el.className = `message ${msg.role}`;
    el.dataset.id = msg.id;

    const time = new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const avatar = isUser
      ? `<div class="message-avatar">U</div>`
      : `<div class="message-avatar"><img src="assets/logo.png" alt="Chatty" onerror="this.parentElement.textContent='C'" /></div>`;

    const attachmentHtml = msg.attachment
      ? `<div class="attachment-preview"><div class="attachment-chip">📎 ${escHtml(msg.attachment.name)}</div></div>`
      : '';

    el.innerHTML = `
      <div class="message-meta">
        ${avatar}
        <span class="message-role">${isUser ? 'You' : 'Chatty'}</span>
        <span class="message-time">${time}</span>
      </div>
      ${attachmentHtml}
      <div class="message-content">${isUser ? escHtmlPreserveCode(msg.content) : Markdown.render(msg.content)}</div>
      <div class="message-actions">
        <button class="msg-action-btn copy-msg" title="Copy">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Copy
        </button>
        ${!isUser ? `<button class="msg-action-btn regen-msg" title="Regenerate">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.71"/></svg>
          Regenerate
        </button>` : ''}
      </div>`;

    el.querySelector('.copy-msg').addEventListener('click', () => {
      navigator.clipboard.writeText(msg.content).then(() => showToast('Copied!', 'success'));
    });

    return el;
  }

  function renderTypingIndicator() {
    const el = document.createElement('div');
    el.className = 'message assistant';
    el.id = 'typingMsg';
    el.innerHTML = `
      <div class="message-meta">
        <div class="message-avatar"><img src="assets/logo.png" alt="Chatty" onerror="this.parentElement.textContent='C'" /></div>
        <span class="message-role">Chatty</span>
      </div>
      <div class="message-content">
        <div class="typing-dots"><span></span><span></span><span></span></div>
      </div>`;
    return el;
  }

  function updateTypingMessage(el, content, done = false) {
    const contentDiv = el.querySelector('.message-content');
    if (!contentDiv) return;
    if (done) {
      contentDiv.innerHTML = Markdown.render(content);
    } else {
      // Streaming — show raw text with cursor
      contentDiv.innerHTML = `<p>${escHtmlPreserveCode(content)}<span class="cursor">▋</span></p>`;
    }
  }

  function scrollToBottom(smooth = true) {
    const area = document.getElementById('chatArea');
    if (!area) return;
    area.scrollTo({ top: area.scrollHeight, behavior: smooth ? 'smooth' : 'instant' });
  }

  function showWelcome(show) {
    const w = document.getElementById('welcome');
    const m = document.getElementById('messages');
    if (w) w.style.display = show ? '' : 'none';
    if (m) m.style.display = show ? 'none' : '';
  }

  function clearMessages() {
    const m = document.getElementById('messages');
    if (m) m.innerHTML = '';
  }

  function setChatTitle(title) {
    const el = document.getElementById('chatTitle');
    if (el) el.textContent = title;
  }

  function setSendBtnState(loading) {
    const btn = document.getElementById('sendBtn');
    if (!btn) return;
    btn.disabled = loading;
    btn.innerHTML = loading
      ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>`
      : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;
    btn.title = loading ? 'Stop (click)' : 'Send (Enter)';
  }

  // ---- SETTINGS MODAL ----
  function openSettings() {
    const s   = Storage.getSettings();
    const key = Storage.getApiKey();

    document.getElementById('apiKeyInput').value      = key;
    document.getElementById('systemPromptInput').value = s.systemPrompt;
    document.getElementById('tempSlider').value        = s.temperature;
    document.getElementById('tempVal').textContent     = s.temperature;
    document.getElementById('maxTokensInput').value    = s.maxTokens;

    // Theme pills
    document.querySelectorAll('.theme-pill[data-theme]').forEach(el => {
      el.classList.toggle('active', el.dataset.theme === s.theme);
    });
    document.querySelectorAll('.theme-pill[data-size]').forEach(el => {
      el.classList.toggle('active', el.dataset.size === s.fontSize);
    });

    document.getElementById('settingsOverlay').classList.add('open');
  }

  function closeSettings() {
    document.getElementById('settingsOverlay').classList.remove('open');
  }

  // ---- HELPERS ----
  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // For user messages — preserve line breaks, escape HTML, but don't parse markdown
  function escHtmlPreserveCode(str) {
    return escHtml(str).replace(/\n/g, '<br>');
  }

  // Textarea auto-resize
  function autoResize(ta) {
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  }

  return {
    showToast, updateStorageBar,
    buildModelDropdown, setModelPill,
    renderConversationList, filterConversations,
    renderMessage, renderTypingIndicator, updateTypingMessage,
    scrollToBottom, showWelcome, clearMessages, setChatTitle,
    setSendBtnState,
    openSettings, closeSettings,
    escHtml, autoResize,
  };
})();
