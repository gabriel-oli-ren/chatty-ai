// ===========================
//  CHATTY — MODELS REGISTRY
// ===========================

const Models = (() => {
  const MODELS = [
    {
      group: 'Anthropic',
      items: [
        { id: 'anthropic/claude-3.5-sonnet',      name: 'Claude 3.5 Sonnet',   desc: 'Best balance of speed & intelligence', badge: 'smart' },
        { id: 'anthropic/claude-3.5-haiku',        name: 'Claude 3.5 Haiku',    desc: 'Fast and efficient',                  badge: 'fast'  },
        { id: 'anthropic/claude-3-opus',           name: 'Claude 3 Opus',       desc: 'Most powerful Claude model',          badge: 'smart' },
      ],
    },
    {
      group: 'OpenAI',
      items: [
        { id: 'openai/gpt-4o',                    name: 'GPT-4o',              desc: 'OpenAI flagship model',               badge: 'smart' },
        { id: 'openai/gpt-4o-mini',               name: 'GPT-4o Mini',         desc: 'Fast, affordable GPT-4 quality',      badge: 'fast'  },
        { id: 'openai/o1-mini',                   name: 'o1 Mini',             desc: 'Reasoning model, complex tasks',      badge: 'smart' },
      ],
    },
    {
      group: 'Google',
      items: [
        { id: 'google/gemini-2.0-flash-001',      name: 'Gemini 2.0 Flash',    desc: 'Fast multimodal model',               badge: 'fast'  },
        { id: 'google/gemini-pro-1.5',            name: 'Gemini 1.5 Pro',      desc: '1M token context window',             badge: 'smart' },
      ],
    },
    {
      group: 'Meta',
      items: [
        { id: 'meta-llama/llama-3.3-70b-instruct',name: 'Llama 3.3 70B',       desc: 'Open-source, high quality',           badge: 'free'  },
        { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B',        desc: 'Lightweight, very fast',              badge: 'free'  },
      ],
    },
    {
      group: 'Mistral',
      items: [
        { id: 'mistralai/mistral-large',          name: 'Mistral Large',       desc: 'Frontier French AI model',            badge: 'smart' },
        { id: 'mistralai/mistral-nemo',           name: 'Mistral Nemo',        desc: 'Compact, multilingual',               badge: 'fast'  },
      ],
    },
    {
      group: 'DeepSeek',
      items: [
        { id: 'deepseek/deepseek-chat',           name: 'DeepSeek V3',         desc: 'Powerful Chinese AI model',           badge: 'free'  },
        { id: 'deepseek/deepseek-r1',             name: 'DeepSeek R1',         desc: 'Strong reasoning model',              badge: 'smart' },
      ],
    },
  ];

  function getAll() { return MODELS; }

  function findById(id) {
    for (const group of MODELS) {
      const m = group.items.find(i => i.id === id);
      if (m) return m;
    }
    return null;
  }

  function getDisplayName(id) {
    return findById(id)?.name || id.split('/').pop();
  }

  return { getAll, findById, getDisplayName };
})();
