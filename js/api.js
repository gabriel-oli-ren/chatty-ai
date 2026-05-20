// ===========================
//  CHATTY — API MODULE
// ===========================

const API = (() => {
  const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

  /**
   * Send messages to OpenRouter with streaming.
   * @param {object} opts
   * @param {string} opts.apiKey
   * @param {string} opts.model
   * @param {Array}  opts.messages   - [{role, content}]
   * @param {string} opts.systemPrompt
   * @param {number} opts.temperature
   * @param {number} opts.maxTokens
   * @param {function} opts.onChunk  - called with each text chunk
   * @param {function} opts.onDone   - called when stream ends
   * @param {function} opts.onError  - called on error
   * @returns {AbortController} - call .abort() to cancel
   */
  async function sendMessage(opts) {
    const {
      apiKey, model, messages, systemPrompt,
      temperature = 0.7, maxTokens = 2048,
      onChunk, onDone, onError,
    } = opts;

    if (!apiKey) {
      onError('No API key set. Open Settings and add your OpenRouter key.');
      return null;
    }

    const controller = new AbortController();

    const payload = {
      model,
      max_tokens: maxTokens,
      temperature,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ],
    };

    try {
      const res = await fetch(ENDPOINT, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer':  window.location.origin,
          'X-Title':       'Chatty AI',
        },
        body:   JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        let errMsg = `Error ${res.status}`;
        try {
          const errBody = await res.json();
          errMsg = errBody?.error?.message || errMsg;
        } catch {}
        onError(errMsg);
        return controller;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete last line

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (!trimmed.startsWith('data: ')) continue;

          try {
            const json = JSON.parse(trimmed.slice(6));
            const delta = json?.choices?.[0]?.delta?.content;
            if (delta) onChunk(delta);
          } catch {}
        }
      }

      onDone();
    } catch (err) {
      if (err.name === 'AbortError') {
        onDone(); // stream was cancelled — still finalise
      } else {
        onError(err.message || 'Network error. Check your connection.');
      }
    }

    return controller;
  }

  /**
   * Build messages array for API — last N turns for context
   */
  function buildMessages(history, maxTurns = 20) {
    const recent = history.slice(-maxTurns * 2);
    return recent.map(m => ({
      role:    m.role,
      content: m.content,
    }));
  }

  return { sendMessage, buildMessages };
})();
