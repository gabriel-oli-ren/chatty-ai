# Chatty 🤖

A sleek, fully static AI chatbot powered by [OpenRouter](https://openrouter.ai). No backend required — deploy anywhere.

## ✨ Features

- **Multi-model support** — Claude, GPT-4o, Gemini, Llama, Mistral, DeepSeek and more
- **Streaming responses** — real-time token-by-token output
- **Conversation history** — stored entirely in `localStorage`, no server needed
- **Full Markdown rendering** — code blocks with copy button, tables, lists, headings, blockquotes
- **File attachment** — attach text, JSON, CSV, images via button, drag & drop, or paste
- **Animated logo** — hover the sidebar logo to reveal the full branding
- **Settings panel** — configure API key, system prompt, temperature, max tokens, theme, font size
- **Import / Export** — export single chats as Markdown, or all conversations as JSON
- **Keyboard shortcuts** — `⌘K` search, `⌘⇧N` new chat, `Esc` close modals
- **Light / Dark / System** themes
- **Responsive** — works on mobile and desktop
- **Vercel-ready** — single static deploy, no build step

## 🚀 Deploy

### Vercel (recommended)
1. Fork / clone this repo
2. Import into [vercel.com](https://vercel.com) → **Add New Project**
3. Framework: **Other** (no build command needed)
4. Deploy — done!

### GitHub Pages
1. Push to a public repo
2. Settings → Pages → Source: `main` / `root`
3. Done — live at `https://<user>.github.io/<repo>/`

### Local
Just open `index.html` in any browser.

## 🔑 API Key Setup

1. Get a free key at [openrouter.ai/keys](https://openrouter.ai/keys)
2. Open Chatty → click **Settings** (bottom-left)
3. Paste your key in the **API Key** field
4. Click **Save settings**

Your key is stored only in your browser's `localStorage`. It is never sent anywhere except directly to OpenRouter.

## 📁 Project Structure

```
chatty/
├── index.html          # Main HTML shell
├── vercel.json         # Vercel deployment config
├── .gitignore
├── assets/
│   ├── logo.png        # Full logo (shown on hover)
│   └── hided.png       # Icon logo (shown by default in sidebar)
├── css/
│   └── style.css       # All styles + CSS variables
└── js/
    ├── storage.js      # localStorage CRUD
    ├── models.js       # OpenRouter model registry
    ├── api.js          # OpenRouter streaming API
    ├── markdown.js     # Markdown → HTML renderer
    ├── ui.js           # DOM rendering helpers
    └── app.js          # Main controller & event wiring
```

## 🖼 Logo Setup

Place two image files in the `assets/` folder:

| File | Purpose |
|------|---------|
| `hided.png` | Small icon — shown by default in the sidebar header |
| `logo.png`  | Full logo — fades in when you hover over the sidebar icon |

Recommended sizes: `hided.png` 64×64px · `logo.png` any (object-fit: contain).

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Send message |
| `Shift + Enter` | New line |
| `⌘/Ctrl + K` | Focus search |
| `⌘/Ctrl + Shift + N` | New conversation |
| `Esc` | Close dropdowns / modal |

## 🎨 Customisation

All colours and spacing use CSS custom properties in `css/style.css` under `:root`. Change `--accent` to retheme the entire app in one line.

## License

MIT
