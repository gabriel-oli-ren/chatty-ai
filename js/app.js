// ===========================
//  CHATTY — APP CONTROLLER
// ===========================

(function () {
  'use strict';

  // ---- STATE ----
  let activeConvId    = null;
  let currentModel    = null;
  let isStreaming     = false;
  let abortController = null;
  let pendingAttachment = null;

  // ---- INIT ----
  function init() {
    applySettings();
    loadActiveConversation();
    bindEvents();
    UI.updateStorageBar();
  }

  // ---- SETTINGS APPLICATION ----
  function applySettings() {
    const s = Storage.getSettings();
    currentModel = s.model;

    // Theme
    const theme = s.theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
      : s.theme;
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-font', s.fontSize);

    UI.setModelPill(currentModel);
    UI.buildModelDropdown(currentModel);
  }

  // ---- LOAD CONVERSATION ----
  function loadActiveConversation() {
    const convs = Storage.getConversations();
    const savedId = Storage.getActiveConvId();
    activeConvId = (savedId && convs.find(c => c.id === savedId)) ? savedId : null;

    renderSidebar();

    if (activeConvId) {
      openConversation(activeConvId, false);
    } else {
      UI.showWelcome(true);
      UI.setChatTitle('New conversation');
    }
  }

  // ---- SIDEBAR ----
  function renderSidebar() {
    const convs = Storage.getConversations();
    UI.renderConversationList(convs, activeConvId, openConversation, deleteConversation);
    UI.updateStorageBar();
  }

  // ---- OPEN CONVERSATION ----
  function openConversation(id, scroll = true) {
    activeConvId = id;
    Storage.setActiveConvId(id);

    const conv = Storage.getConversation(id);
    if (!conv) { startNewConversation(); return; }

    currentModel = conv.model || Storage.getSettings().model;
    UI.setModelPill(currentModel);
    UI.buildModelDropdown(currentModel);
    UI.setChatTitle(conv.title);
    UI.clearMessages();
    UI.showWelcome(false);

    const messages = document.getElementById('messages');
    for (const msg of conv.messages) {
      messages.appendChild(UI.renderMessage(msg));
    }

    if (scroll) UI.scrollToBottom(false);
    renderSidebar();

    // Close sidebar on mobile after selection
    if (window.innerWidth <= 680) {
      document.getElementById('sidebar').classList.remove('mobile-open');
    }
  }

  // ---- NEW CONVERSATION ----
  function startNewConversation() {
    activeConvId = null;
    Storage.setActiveConvId(null);
    UI.showWelcome(true);
    UI.clearMessages();
    UI.setChatTitle('New conversation');
    currentModel = Storage.getSettings().model;
    UI.setModelPill(currentModel);
    UI.buildModelDropdown(currentModel);
    renderSidebar();

    if (window.innerWidth <= 680) {
      document.getElementById('sidebar').classList.remove('mobile-open');
    }
  }

  // ---- DELETE CONVERSATION ----
  function deleteConversation(id) {
    Storage.deleteConversation(id);
    if (activeConvId === id) startNewConversation();
    else renderSidebar();
    UI.showToast('Conversation deleted', '');
  }

  // ---- SEND MESSAGE ----
  async function sendMessage() {
    if (isStreaming) {
      // Stop streaming
      if (abortController) abortController.abort();
      return;
    }

    const input = document.getElementById('messageInput');
    const text  = input.value.trim();
    if (!text && !pendingAttachment) return;

    const apiKey = Storage.getApiKey();
    if (!apiKey) {
      UI.openSettings();
      UI.showToast('Please add your OpenRouter API key first', 'error');
      return;
    }

    // Create conversation if needed
    if (!activeConvId) {
      const title = text.length > 48 ? text.slice(0, 48) + '…' : text;
      const conv  = Storage.createConversation(title);
      activeConvId = conv.id;
      Storage.setActiveConvId(activeConvId);
      Storage.updateConversation(activeConvId, { model: currentModel });
    }

    // User message object
    const userMsg = {
      id:        'msg_' + Date.now(),
      role:      'user',
      content:   text,
      createdAt: Date.now(),
      attachment: pendingAttachment || null,
    };

    // Clear input
    input.value = '';
    input.style.height = 'auto';
    document.getElementById('charCount').textContent = '';
    pendingAttachment = null;
    updateAttachmentPreview();

    // Save & render user message
    Storage.addMessage(activeConvId, userMsg);
    const messages = document.getElementById('messages');
    UI.showWelcome(false);
    messages.appendChild(UI.renderMessage(userMsg));
    UI.scrollToBottom();

    // Update sidebar title on first message
    const conv = Storage.getConversation(activeConvId);
    if (conv && conv.messages.length === 1) {
      renderSidebar();
    }
    UI.setChatTitle(conv?.title || 'Conversation');

    // Typing indicator
    const typingEl = UI.renderTypingIndicator();
    messages.appendChild(typingEl);
    UI.scrollToBottom();

    // Build API payload
    const settings    = Storage.getSettings();
    const history     = Storage.getConversation(activeConvId)?.messages || [];
    const apiMessages = API.buildMessages(history);

    // Stream response
    isStreaming = true;
    UI.setSendBtnState(true);
    let accumulated = '';

    abortController = await API.sendMessage({
      apiKey:       apiKey,
      model:        currentModel,
      messages:     apiMessages,
      systemPrompt: settings.systemPrompt,
      temperature:  settings.temperature,
      maxTokens:    settings.maxTokens,

      onChunk(chunk) {
        accumulated += chunk;
        UI.updateTypingMessage(typingEl, accumulated, false);
        UI.scrollToBottom(false);
      },

      onDone() {
        // Replace typing indicator with final message
        const assistantMsg = {
          id:        'msg_' + Date.now(),
          role:      'assistant',
          content:   accumulated || '*(no response)*',
          createdAt: Date.now(),
        };
        Storage.addMessage(activeConvId, assistantMsg);

        typingEl.replaceWith(UI.renderMessage(assistantMsg));

        // Wire regenerate button
        const newEl = messages.querySelector(`[data-id="${assistantMsg.id}"]`);
        newEl?.querySelector('.regen-msg')?.addEventListener('click', () => regenerate(assistantMsg.id));

        UI.scrollToBottom();
        isStreaming = false;
        UI.setSendBtnState(false);
        UI.updateStorageBar();
        renderSidebar();
      },

      onError(err) {
        typingEl.remove();
        UI.showToast('Error: ' + err, 'error', 4000);
        isStreaming = false;
        UI.setSendBtnState(false);
      },
    });
  }

  // ---- REGENERATE ----
  function regenerate(msgId) {
    if (isStreaming) return;
    const conv = Storage.getConversation(activeConvId);
    if (!conv) return;

    // Find the assistant message and remove it + everything after
    const idx = conv.messages.findIndex(m => m.id === msgId);
    if (idx === -1) return;

    const trimmedMessages = conv.messages.slice(0, idx);
    Storage.updateConversation(activeConvId, { messages: trimmedMessages });

    // Re-render
    openConversation(activeConvId, false);

    // Re-send the last user message
    setTimeout(() => {
      const lastUser = trimmedMessages.filter(m => m.role === 'user').pop();
      if (!lastUser) return;
      const input = document.getElementById('messageInput');
      input.value = lastUser.content;
      // Remove last user message from storage too so it doesn't duplicate
      Storage.updateConversation(activeConvId, { messages: trimmedMessages.slice(0, -1) });
      openConversation(activeConvId, false);
      sendMessage();
    }, 50);
  }

  // ---- EXPORT CHAT ----
  function exportChat() {
    if (!activeConvId) { UI.showToast('No active conversation', ''); return; }
    const conv = Storage.getConversation(activeConvId);
    if (!conv) return;

    const lines = [`# ${conv.title}`, `*Exported from Chatty — ${new Date().toLocaleString()}*`, ''];
    for (const msg of conv.messages) {
      lines.push(`## ${msg.role === 'user' ? 'You' : 'Chatty'}`);
      lines.push(msg.content);
      lines.push('');
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `chatty-${conv.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    UI.showToast('Chat exported', 'success');
  }

  function exportAll() {
    const convs = Storage.getConversations();
    const data  = JSON.stringify(convs, null, 2);
    const blob  = new Blob([data], { type: 'application/json' });
    const url   = URL.createObjectURL(blob);
    const a     = document.createElement('a');
    a.href      = url;
    a.download  = `chatty-all-conversations-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    UI.showToast('All conversations exported', 'success');
  }

  // ---- FILE ATTACHMENT ----
  function handleFile(file) {
    if (!file) return;
    const maxMb = 5;
    if (file.size > maxMb * 1024 * 1024) {
      UI.showToast(`File too large (max ${maxMb}MB)`, 'error'); return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      pendingAttachment = { name: file.name, type: file.type, data: e.target.result };
      updateAttachmentPreview();
    };
    if (file.type.startsWith('text') || file.type === 'application/json') {
      reader.readAsText(file);
    } else {
      reader.readAsDataURL(file);
    }
  }

  function updateAttachmentPreview() {
    const wrap = document.getElementById('attachPreview');
    if (!pendingAttachment) { if (wrap) wrap.remove(); return; }

    let preview = document.getElementById('attachPreview');
    if (!preview) {
      preview = document.createElement('div');
      preview.id = 'attachPreview';
      preview.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--bg-tertiary);border-top:1px solid var(--border);font-size:12px;color:var(--text-secondary);';
      document.querySelector('.input-area').prepend(preview);
    }
    preview.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      ${UI.escHtml(pendingAttachment.name)}
      <button onclick="document.getElementById('attachPreview').remove();pendingAttachment=null;" style="margin-left:auto;color:var(--text-muted);font-size:18px;line-height:1;padding:0 4px;background:none;border:none;cursor:pointer;">×</button>`;
  }

  // ---- BIND EVENTS ----
  function bindEvents() {
    // New chat
    document.getElementById('newChatBtn').addEventListener('click', startNewConversation);

    // Send
    document.getElementById('sendBtn').addEventListener('click', sendMessage);

    // Input — Enter to send, Shift+Enter for newline
    const input = document.getElementById('messageInput');
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    input.addEventListener('input', () => {
      UI.autoResize(input);
      const len = input.value.length;
      const counter = document.getElementById('charCount');
      counter.textContent = len > 28000 ? `${len}/32000` : '';
    });

    // Sidebar toggle
    document.getElementById('sidebarToggle').addEventListener('click', () => {
      const sidebar = document.getElementById('sidebar');
      if (window.innerWidth <= 680) {
        sidebar.classList.toggle('mobile-open');
      } else {
        sidebar.classList.toggle('collapsed');
      }
    });

    // Model dropdown
    const modelPill = document.getElementById('modelPill');
    const modelDd   = document.getElementById('modelDropdown');
    modelPill.addEventListener('click', (e) => {
      e.stopPropagation();
      modelDd.classList.toggle('open');
    });
    modelDd.addEventListener('click', (e) => {
      const opt = e.target.closest('.model-option');
      if (!opt) return;
      currentModel = opt.dataset.id;
      UI.setModelPill(currentModel);
      UI.buildModelDropdown(currentModel);
      modelDd.classList.remove('open');
      // Save to settings and active conversation
      Storage.saveSettings({ model: currentModel });
      if (activeConvId) Storage.updateConversation(activeConvId, { model: currentModel });
      UI.showToast(`Model: ${Models.getDisplayName(currentModel)}`, 'success');
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.model-selector-wrap')) modelDd.classList.remove('open');
    });

    // Capability cards
    document.querySelectorAll('.cap-card').forEach(card => {
      card.addEventListener('click', () => {
        const prompt = card.dataset.prompt;
        const input  = document.getElementById('messageInput');
        input.value  = prompt;
        UI.autoResize(input);
        input.focus();
      });
    });

    // Search conversations
    document.getElementById('searchInput').addEventListener('input', (e) => {
      UI.filterConversations(e.target.value);
    });

    // Export
    document.getElementById('exportBtn').addEventListener('click', exportChat);

    // Clear chat
    document.getElementById('clearBtn').addEventListener('click', () => {
      if (!activeConvId) return;
      if (!confirm('Clear all messages in this conversation?')) return;
      Storage.updateConversation(activeConvId, { messages: [] });
      openConversation(activeConvId, false);
      UI.showToast('Chat cleared', '');
    });

    // File attach
    document.getElementById('attachBtn').addEventListener('click', () => {
      document.getElementById('fileInput').click();
    });
    document.getElementById('fileInput').addEventListener('change', (e) => {
      handleFile(e.target.files[0]);
      e.target.value = ''; // reset so same file can be re-selected
    });

    // Drag & drop
    const chatArea = document.getElementById('chatArea');
    chatArea.addEventListener('dragover', (e) => { e.preventDefault(); chatArea.style.outline = '2px dashed var(--accent)'; });
    chatArea.addEventListener('dragleave', () => { chatArea.style.outline = ''; });
    chatArea.addEventListener('drop', (e) => {
      e.preventDefault();
      chatArea.style.outline = '';
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    });

    // Settings
    document.getElementById('settingsBtn').addEventListener('click', UI.openSettings);
    document.getElementById('settingsClose').addEventListener('click', UI.closeSettings);
    document.getElementById('cancelSettings').addEventListener('click', UI.closeSettings);
    document.getElementById('settingsOverlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) UI.closeSettings();
    });

    // Settings — temp slider
    document.getElementById('tempSlider').addEventListener('input', (e) => {
      document.getElementById('tempVal').textContent = e.target.value;
    });

    // Settings — theme pills
    document.querySelectorAll('.theme-pill[data-theme]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.theme-pill[data-theme]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
    document.querySelectorAll('.theme-pill[data-size]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.theme-pill[data-size]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // API key visibility toggle
    document.getElementById('toggleApiVis').addEventListener('click', () => {
      const inp = document.getElementById('apiKeyInput');
      inp.type = inp.type === 'password' ? 'text' : 'password';
    });

    // Save settings
    document.getElementById('saveSettings').addEventListener('click', () => {
      const apiKey = document.getElementById('apiKeyInput').value.trim();
      Storage.setApiKey(apiKey);

      const activeTheme = document.querySelector('.theme-pill[data-theme].active')?.dataset.theme || 'dark';
      const activeSize  = document.querySelector('.theme-pill[data-size].active')?.dataset.size  || 'md';

      Storage.saveSettings({
        systemPrompt: document.getElementById('systemPromptInput').value,
        temperature:  parseFloat(document.getElementById('tempSlider').value),
        maxTokens:    parseInt(document.getElementById('maxTokensInput').value) || 2048,
        theme:        activeTheme,
        fontSize:     activeSize,
      });

      applySettings();
      UI.closeSettings();
      UI.showToast('Settings saved', 'success');
    });

    // Clear all / export all
    document.getElementById('clearAllBtn').addEventListener('click', () => {
      if (!confirm('Delete ALL conversations permanently? This cannot be undone.')) return;
      Storage.deleteAllConversations();
      startNewConversation();
      UI.showToast('All conversations deleted', '');
    });
    document.getElementById('exportAllBtn').addEventListener('click', exportAll);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('searchInput').focus();
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'n') {
        e.preventDefault();
        startNewConversation();
      }
      if (e.key === 'Escape') {
        document.getElementById('modelDropdown').classList.remove('open');
        UI.closeSettings();
      }
    });

    // Paste image directly into input
    document.addEventListener('paste', (e) => {
      const item = Array.from(e.clipboardData?.items || []).find(i => i.type.startsWith('image/'));
      if (item) {
        const file = item.getAsFile();
        if (file) handleFile(file);
      }
    });
  }

  // ---- BOOT ----
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
