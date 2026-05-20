// ===========================
//  CHATTY — MARKDOWN RENDERER
// ===========================

const Markdown = (() => {

  function escape(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function render(text) {
    if (!text) return '';

    let html = text;

    // ---- Code blocks (``` ... ```) — process first to avoid inner-parsing ----
    const codeBlocks = [];
    html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
      const idx = codeBlocks.length;
      codeBlocks.push({ lang: lang || 'text', code: code.trim() });
      return `\x00CODE_BLOCK_${idx}\x00`;
    });

    // ---- Inline code ----
    const inlineCodes = [];
    html = html.replace(/`([^`\n]+)`/g, (_, code) => {
      const idx = inlineCodes.length;
      inlineCodes.push(escape(code));
      return `\x00INLINE_${idx}\x00`;
    });

    // ---- Headings ----
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm,  '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm,   '<h1>$1</h1>');

    // ---- Bold & Italic ----
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g,      '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g,           '<em>$1</em>');
    html = html.replace(/__(.+?)__/g,           '<strong>$1</strong>');
    html = html.replace(/_(.+?)_/g,             '<em>$1</em>');

    // ---- Strikethrough ----
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

    // ---- Blockquotes ----
    html = html.replace(/^> (.+)/gm, '<blockquote>$1</blockquote>');
    // Merge consecutive blockquotes
    html = html.replace(/<\/blockquote>\n<blockquote>/g, '\n');

    // ---- Horizontal rule ----
    html = html.replace(/^(-{3,}|\*{3,}|_{3,})$/gm, '<hr>');

    // ---- Links ----
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // ---- Images ----
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g,
      '<img src="$2" alt="$1" style="max-width:100%;border-radius:8px;margin:8px 0;" />');

    // ---- Tables ----
    html = renderTables(html);

    // ---- Unordered lists ----
    html = renderLists(html);

    // ---- Ordered lists ----
    html = renderOrderedLists(html);

    // ---- Paragraphs ---- (wrap non-tagged lines)
    html = html.split('\n\n').map(block => {
      block = block.trim();
      if (!block) return '';
      if (/^<(h[1-6]|ul|ol|li|blockquote|pre|hr|table|div)/.test(block)) return block;
      if (block.startsWith('\x00CODE_BLOCK')) return block;
      // Convert single newlines within paragraph to <br>
      return `<p>${block.replace(/\n/g, '<br>')}</p>`;
    }).join('\n');

    // ---- Restore inline codes ----
    html = html.replace(/\x00INLINE_(\d+)\x00/g, (_, i) =>
      `<code>${inlineCodes[i]}</code>`
    );

    // ---- Restore code blocks ----
    html = html.replace(/\x00CODE_BLOCK_(\d+)\x00/g, (_, i) => {
      const { lang, code } = codeBlocks[i];
      const escapedCode = escape(code);
      return `<pre><div class="code-header"><span class="code-lang">${escape(lang)}</span><button class="copy-code-btn" onclick="Markdown.copyCode(this)">Copy</button></div><code>${escapedCode}</code></pre>`;
    });

    return html;
  }

  function renderTables(html) {
    return html.replace(/(\|.+\|\n?)+/g, match => {
      const rows = match.trim().split('\n').filter(r => r.trim());
      if (rows.length < 2) return match;

      const isHeader = rows[1] && /^\|[-:| ]+\|$/.test(rows[1].trim());
      if (!isHeader) return match;

      const headerRow = rows[0];
      const dataRows  = rows.slice(2);

      const parseRow = (row, tag) => {
        const cells = row.split('|').slice(1, -1);
        return `<tr>${cells.map(c => `<${tag}>${c.trim()}</${tag}>`).join('')}</tr>`;
      };

      return `<table><thead>${parseRow(headerRow, 'th')}</thead><tbody>${
        dataRows.map(r => parseRow(r, 'td')).join('')
      }</tbody></table>`;
    });
  }

  function renderLists(html) {
    // Find blocks of lines starting with - or *
    return html.replace(/(^|\n)([ ]*[-*] .+(\n|$))+/g, match => {
      const items = match.trim().split('\n').filter(l => /^\s*[-*] /.test(l));
      return `<ul>${items.map(i => `<li>${i.replace(/^\s*[-*] /, '')}</li>`).join('')}</ul>`;
    });
  }

  function renderOrderedLists(html) {
    return html.replace(/(^|\n)([ ]*\d+\. .+(\n|$))+/g, match => {
      const items = match.trim().split('\n').filter(l => /^\s*\d+\. /.test(l));
      return `<ol>${items.map(i => `<li>${i.replace(/^\s*\d+\. /, '')}</li>`).join('')}</ol>`;
    });
  }

  function copyCode(btn) {
    const code = btn.closest('pre').querySelector('code').innerText;
    navigator.clipboard.writeText(code).then(() => {
      const orig = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = orig; }, 1500);
    }).catch(() => {
      btn.textContent = 'Failed';
      setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
    });
  }

  return { render, copyCode };
})();
