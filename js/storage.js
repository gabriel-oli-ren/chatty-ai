// ===========================
//  CHATTY — STORAGE MODULE
// ===========================

const Storage = (() => {
  const KEYS = {
    CONVERSATIONS: 'chatty_conversations',
    ACTIVE_CONV:   'chatty_active_conv',
    SETTINGS:      'chatty_settings',
    API_KEY:       'chatty_api_key',
  };

  const DEFAULT_SETTINGS = {
    model:        'anthropic/claude-3.5-sonnet',
    systemPrompt: 'You are Chatty, a helpful, accurate, and friendly AI assistant. Be concise but thorough. Use markdown formatting when it improves clarity.',
    temperature:  0.7,
    maxTokens:    2048,
    theme:        'dark',
    fontSize:     'md',
  };

  // ---- API KEY (separate for clarity) ----
  function getApiKey() {
    return localStorage.getItem(KEYS.API_KEY) || '';
  }
  function setApiKey(key) {
    localStorage.setItem(KEYS.API_KEY, key.trim());
  }

  // ---- SETTINGS ----
  function getSettings() {
    try {
      const raw = localStorage.getItem(KEYS.SETTINGS);
      return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
    } catch { return { ...DEFAULT_SETTINGS }; }
  }
  function saveSettings(partial) {
    const current = getSettings();
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify({ ...current, ...partial }));
  }

  // ---- CONVERSATIONS ----
  function getConversations() {
    try {
      const raw = localStorage.getItem(KEYS.CONVERSATIONS);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }
  function saveConversations(convs) {
    localStorage.setItem(KEYS.CONVERSATIONS, JSON.stringify(convs));
  }

  function getConversation(id) {
    return getConversations().find(c => c.id === id) || null;
  }

  function createConversation(title = 'New conversation') {
    const conv = {
      id:        'conv_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages:  [],
      model:     getSettings().model,
    };
    const convs = getConversations();
    convs.unshift(conv);
    saveConversations(convs);
    return conv;
  }

  function updateConversation(id, patch) {
    const convs = getConversations().map(c =>
      c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c
    );
    saveConversations(convs);
  }

  function deleteConversation(id) {
    const convs = getConversations().filter(c => c.id !== id);
    saveConversations(convs);
    if (getActiveConvId() === id) setActiveConvId(null);
  }

  function addMessage(convId, message) {
    const convs = getConversations().map(c => {
      if (c.id !== convId) return c;
      return { ...c, messages: [...c.messages, message], updatedAt: Date.now() };
    });
    saveConversations(convs);
  }

  function updateLastMessage(convId, patch) {
    const convs = getConversations().map(c => {
      if (c.id !== convId) return c;
      const messages = [...c.messages];
      if (messages.length === 0) return c;
      messages[messages.length - 1] = { ...messages[messages.length - 1], ...patch };
      return { ...c, messages, updatedAt: Date.now() };
    });
    saveConversations(convs);
  }

  function deleteAllConversations() {
    localStorage.removeItem(KEYS.CONVERSATIONS);
    localStorage.removeItem(KEYS.ACTIVE_CONV);
  }

  // ---- ACTIVE CONVERSATION ----
  function getActiveConvId() {
    return localStorage.getItem(KEYS.ACTIVE_CONV) || null;
  }
  function setActiveConvId(id) {
    if (id) localStorage.setItem(KEYS.ACTIVE_CONV, id);
    else localStorage.removeItem(KEYS.ACTIVE_CONV);
  }

  // ---- STORAGE SIZE ----
  function getStorageStats() {
    let totalBytes = 0;
    for (const key in localStorage) {
      if (!localStorage.hasOwnProperty(key)) continue;
      totalBytes += (localStorage[key].length + key.length) * 2; // UTF-16
    }
    const kb = totalBytes / 1024;
    const mb = kb / 1024;
    // localStorage typically ~5MB
    const pct = Math.min((kb / (5 * 1024)) * 100, 100);
    return {
      bytes: totalBytes,
      kb: kb.toFixed(1),
      mb: mb.toFixed(2),
      pct: pct.toFixed(1),
      label: kb < 1024 ? `${kb.toFixed(1)} KB used` : `${mb.toFixed(2)} MB used`,
    };
  }

  return {
    getApiKey, setApiKey,
    getSettings, saveSettings, DEFAULT_SETTINGS,
    getConversations, getConversation, createConversation,
    updateConversation, deleteConversation,
    addMessage, updateLastMessage, deleteAllConversations,
    getActiveConvId, setActiveConvId,
    getStorageStats,
  };
})();
