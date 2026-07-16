(() => {
  "use strict";

  const ROLE_CLASSES = new Set(["user", "assistant", "thinking", "tool", "system", "unknown"]);

  function conversationToHtml(conversation, options = {}) {
    const language = options.language === "en" ? "en" : "zh";
    const copy = language === "zh"
      ? {
          platform: "平台",
          folder: "分组",
          source: "来源",
          captured: "末次备份",
          messages: "条消息",
          user: "用户",
          assistant: "助手",
          thinking: "思考",
          attachment: "附件",
          tool: "工具",
          system: "系统",
          unknown: "消息",
          untitled: "未命名会话"
        }
      : {
          platform: "Platform",
          folder: "Folder",
          source: "Source",
          captured: "Last backup",
          messages: "messages",
          user: "User",
          assistant: "Assistant",
          thinking: "Thinking",
          attachment: "Attachment",
          tool: "Tool",
          system: "System",
          unknown: "Message",
          untitled: "Untitled conversation"
        };

    const title = String(conversation?.title || copy.untitled).trim() || copy.untitled;
    const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
    const platform = options.platformLabel || conversation?.platformLabel || conversation?.platform || "Unknown";
    const folder = options.folderLabel || conversation?.folderLabel || conversation?.folderId || platform;
    const captured = conversation?.updatedAt || conversation?.capturedAt || "Unknown";
    const sourceUrl = safeUrl(conversation?.sourceUrl);
    const roleLabels = { ...copy, ...(options.roleLabels || {}) };
    const messageHtml = messages.map((message, index) => renderMessage(message, index, roleLabels)).join("\n");
    const sourceValue = sourceUrl
      ? `<a href="${escapeAttribute(sourceUrl)}" target="_blank" rel="noreferrer noopener">${escapeHtml(sourceUrl)}</a>`
      : "Unknown";

    return `<!doctype html>
<html lang="${language === "zh" ? "zh-CN" : "en"}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>${exportStyles()}</style>
</head>
<body>
  <main class="conversation">
    <header class="conversation-header">
      <p class="eyebrow">GPT Knowledge Base</p>
      <h1>${escapeHtml(title)}</h1>
      <p class="summary">${messages.length} ${escapeHtml(copy.messages)}</p>
      <dl class="metadata">
        <div><dt>${escapeHtml(copy.platform)}</dt><dd>${escapeHtml(platform)}</dd></div>
        <div><dt>${escapeHtml(copy.folder)}</dt><dd>${escapeHtml(folder)}</dd></div>
        <div><dt>${escapeHtml(copy.captured)}</dt><dd>${escapeHtml(captured)}</dd></div>
        <div><dt>${escapeHtml(copy.source)}</dt><dd>${sourceValue}</dd></div>
      </dl>
    </header>
    <section class="messages" aria-label="Messages">
${messageHtml}
    </section>
  </main>
</body>
</html>`;
  }

  function conversationsToHtml(conversations, options = {}) {
    const language = options.language === "en" ? "en" : "zh";
    const copy = language === "zh"
      ? { title: "GPT 知识库导出", conversations: "个会话", messages: "条消息", platform: "平台", source: "来源", captured: "末次备份", unknown: "未知" }
      : { title: "GPT Knowledge Base Export", conversations: "conversations", messages: "messages", platform: "Platform", source: "Source", captured: "Last backup", unknown: "Unknown" };
    const items = Array.isArray(conversations) ? conversations : [];
    const totalMessages = items.reduce((sum, item) => sum + (Array.isArray(item?.messages) ? item.messages.length : 0), 0);
    const roleLabels = language === "zh"
      ? { user: "用户", assistant: "助手", thinking: "思考", attachment: "附件", tool: "工具", system: "系统", unknown: "消息" }
      : { user: "User", assistant: "Assistant", thinking: "Thinking", attachment: "Attachment", tool: "Tool", system: "System", unknown: "Message" };
    const index = items.map((conversation, itemIndex) => {
      const title = String(conversation?.title || `${copy.title} ${itemIndex + 1}`);
      return `<li><a href="#conversation-${itemIndex + 1}">${escapeHtml(title)}</a><span>${Array.isArray(conversation?.messages) ? conversation.messages.length : 0}</span></li>`;
    }).join("\n");
    const entries = items.map((conversation, itemIndex) => {
      const title = String(conversation?.title || `${copy.title} ${itemIndex + 1}`);
      const platform = conversation?.platformLabel || conversation?.platform || copy.unknown;
      const captured = conversation?.updatedAt || conversation?.capturedAt || copy.unknown;
      const source = safeUrl(conversation?.sourceUrl);
      const sourceValue = source
        ? `<a href="${escapeAttribute(source)}" target="_blank" rel="noreferrer noopener">${escapeHtml(source)}</a>`
        : escapeHtml(copy.unknown);
      const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
      return `<article class="archive-entry" id="conversation-${itemIndex + 1}">
        <header class="archive-entry-header">
          <p class="archive-number">${String(itemIndex + 1).padStart(2, "0")}</p>
          <h2>${escapeHtml(title)}</h2>
          <dl class="metadata compact-metadata">
            <div><dt>${escapeHtml(copy.platform)}</dt><dd>${escapeHtml(platform)}</dd></div>
            <div><dt>${escapeHtml(copy.captured)}</dt><dd>${escapeHtml(captured)}</dd></div>
            <div class="metadata-source"><dt>${escapeHtml(copy.source)}</dt><dd>${sourceValue}</dd></div>
          </dl>
        </header>
        <section class="messages">${messages.map((message, index) => renderMessage(message, index, roleLabels)).join("\n")}</section>
      </article>`;
    }).join("\n");

    return `<!doctype html>
<html lang="${language === "zh" ? "zh-CN" : "en"}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(copy.title)}</title>
  <style>${exportStyles()}</style>
</head>
<body>
  <main class="conversation archive">
    <header class="conversation-header">
      <p class="eyebrow">GPT Knowledge Base</p>
      <h1>${escapeHtml(copy.title)}</h1>
      <p class="summary">${items.length} ${escapeHtml(copy.conversations)} · ${totalMessages} ${escapeHtml(copy.messages)}</p>
      <ol class="archive-index">${index}</ol>
    </header>
    <section class="archive-list">${entries}</section>
  </main>
</body>
</html>`;
  }

  function renderMessage(message, index, roleLabels) {
    const role = normalizeRole(message?.role);
    const roleLabel = roleLabels[role] || roleLabels.unknown;
    const body = renderMarkdown(message?.text || "");
    const attachments = renderAttachments(message?.attachments, roleLabels.attachment || "Attachment");
    if (role === "thinking") {
      return `      <article class="message message-thinking" id="message-${index + 1}">
        <div class="role-label">${escapeHtml(roleLabel)}</div>
        <details class="thinking-block">
          <summary>${escapeHtml(roleLabel)}</summary>
          <div class="message-body">${body}${attachments}</div>
        </details>
      </article>`;
    }

    return `      <article class="message message-${role}" id="message-${index + 1}">
        <div class="role-label">${escapeHtml(roleLabel)}</div>
        <div class="message-body">${body}${attachments}</div>
      </article>`;
  }

  function renderAttachments(attachments, label) {
    const items = Array.isArray(attachments) ? attachments.filter(Boolean) : [];
    if (!items.length) {
      return "";
    }
    return `<div class="export-attachments" aria-label="${escapeAttribute(label)}">${items.map((attachment) => {
      const name = String(attachment?.name || label);
      const type = String(attachment?.mimeType || "");
      const size = Number(attachment?.size) > 0 ? formatBytes(Number(attachment.size)) : "";
      const meta = [type, size].filter(Boolean).join(" · ");
      return `<div class="export-attachment"><strong>${escapeHtml(name)}</strong>${meta ? `<small>${escapeHtml(meta)}</small>` : ""}</div>`;
    }).join("")}</div>`;
  }

  function formatBytes(bytes) {
    const units = ["B", "KB", "MB", "GB"];
    const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const size = bytes / (1024 ** exponent);
    return `${size >= 10 || exponent === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[exponent]}`;
  }

  function renderMarkdown(value) {
    const lines = String(value || "").replace(/\r\n?/g, "\n").split("\n");
    const output = [];
    let index = 0;

    while (index < lines.length) {
      const line = lines[index];
      if (!line.trim()) {
        index += 1;
        continue;
      }

      const fence = line.match(/^\s*```([^`]*)$/);
      if (fence) {
        const code = [];
        index += 1;
        while (index < lines.length && !/^\s*```\s*$/.test(lines[index])) {
          code.push(lines[index]);
          index += 1;
        }
        index += index < lines.length ? 1 : 0;
        const language = fence[1].trim();
        output.push(`<div class="code-block">${language ? `<div class="code-language">${escapeHtml(language)}</div>` : ""}<pre><code>${escapeHtml(code.join("\n"))}</code></pre></div>`);
        continue;
      }

      const displayMath = consumeDisplayMath(lines, index);
      if (displayMath) {
        output.push(`<pre class="math-block">${escapeHtml(displayMath.value)}</pre>`);
        index = displayMath.nextIndex;
        continue;
      }

      const heading = line.match(/^\s*(#{1,6})\s+(.+)$/);
      if (heading) {
        const level = Math.min(heading[1].length + 1, 6);
        output.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
        index += 1;
        continue;
      }

      if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
        output.push("<hr>");
        index += 1;
        continue;
      }

      if (isTableStart(lines, index)) {
        const headers = splitTableRow(lines[index]);
        const rows = [];
        index += 2;
        while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
          rows.push(splitTableRow(lines[index]));
          index += 1;
        }
        output.push(renderTable(headers, rows));
        continue;
      }

      if (/^\s*>\s?/.test(line)) {
        const quote = [];
        while (index < lines.length && /^\s*>\s?/.test(lines[index])) {
          quote.push(lines[index].replace(/^\s*>\s?/, ""));
          index += 1;
        }
        output.push(`<blockquote>${quote.map(renderInline).join("<br>")}</blockquote>`);
        continue;
      }

      const listMatch = line.match(/^\s*(?:([-+*])|(\d+)[.)])\s+(.+)$/);
      if (listMatch) {
        const ordered = Boolean(listMatch[2]);
        const items = [];
        while (index < lines.length) {
          const item = lines[index].match(/^\s*(?:([-+*])|(\d+)[.)])\s+(.+)$/);
          if (!item || Boolean(item[2]) !== ordered) {
            break;
          }
          items.push(`<li>${renderInline(item[3])}</li>`);
          index += 1;
        }
        const tag = ordered ? "ol" : "ul";
        output.push(`<${tag}>${items.join("")}</${tag}>`);
        continue;
      }

      const paragraph = [line.trim()];
      index += 1;
      while (index < lines.length && lines[index].trim() && !isBlockStart(lines, index)) {
        paragraph.push(lines[index].trim());
        index += 1;
      }
      output.push(`<p>${paragraph.map(renderInline).join("<br>")}</p>`);
    }

    return output.join("\n");
  }

  function renderInline(value) {
    const tokens = [];
    let source = String(value || "");
    source = source.replace(/`([^`\n]+)`/g, (_, code) => stash(tokens, `<code>${escapeHtml(code)}</code>`));
    source = source.replace(/\[([^\]]+)]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g, (match, label, url) => {
      const safe = safeUrl(url);
      return safe
        ? stash(tokens, `<a href="${escapeAttribute(safe)}" target="_blank" rel="noreferrer noopener">${escapeHtml(label)}</a>`)
        : match;
    });
    source = escapeHtml(source)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/__([^_]+)__/g, "<strong>$1</strong>")
      .replace(/~~([^~]+)~~/g, "<del>$1</del>")
      .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
    return restore(tokens, source);
  }

  function consumeDisplayMath(lines, startIndex) {
    const first = lines[startIndex].trim();
    const delimiter = first.startsWith("$$") ? "$$" : first.startsWith("\\[") ? "\\]" : "";
    if (!delimiter) {
      return null;
    }
    const closing = delimiter === "$$" ? "$$" : "\\]";
    const openingLength = delimiter === "$$" ? 2 : 2;
    const body = [first.slice(openingLength)];
    if (body[0].endsWith(closing) && body[0].length > closing.length) {
      body[0] = body[0].slice(0, -closing.length);
      return { value: body[0].trim(), nextIndex: startIndex + 1 };
    }
    for (let index = startIndex + 1; index < lines.length; index += 1) {
      if (lines[index].trim().endsWith(closing)) {
        body.push(lines[index].trim().slice(0, -closing.length));
        return { value: body.join("\n").trim(), nextIndex: index + 1 };
      }
      body.push(lines[index]);
    }
    return null;
  }

  function isBlockStart(lines, index) {
    const line = lines[index] || "";
    return /^\s*```/.test(line) ||
      /^\s*#{1,6}\s+/.test(line) ||
      /^\s*(?:[-+*]|\d+[.)])\s+/.test(line) ||
      /^\s*>\s?/.test(line) ||
      /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line) ||
      line.trim().startsWith("$$") ||
      line.trim().startsWith("\\[") ||
      isTableStart(lines, index);
  }

  function isTableStart(lines, index) {
    if (!String(lines[index] || "").includes("|") || index + 1 >= lines.length) {
      return false;
    }
    const separator = String(lines[index + 1] || "").trim().replace(/^\||\|$/g, "");
    const cells = separator.split("|").map((cell) => cell.trim());
    return cells.length >= 2 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
  }

  function splitTableRow(line) {
    return String(line || "").trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
  }

  function renderTable(headers, rows) {
    const head = headers.map((cell) => `<th>${renderInline(cell)}</th>`).join("");
    const body = rows.map((row) => `<tr>${headers.map((_, index) => `<td>${renderInline(row[index] || "")}</td>`).join("")}</tr>`).join("");
    return `<div class="table-scroll"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
  }

  function normalizeRole(value) {
    const role = String(value || "unknown").toLowerCase();
    return ROLE_CLASSES.has(role) ? role : "unknown";
  }

  function safeUrl(value) {
    const source = String(value || "").trim();
    if (!source) {
      return "";
    }
    try {
      const url = new URL(source);
      return ["http:", "https:", "mailto:"].includes(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  }

  function stash(tokens, html) {
    const token = `\u0000CBV${tokens.length}\u0000`;
    tokens.push(html);
    return token;
  }

  function restore(tokens, value) {
    return value.replace(/\u0000CBV(\d+)\u0000/g, (_, index) => tokens[Number(index)] || "");
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, "&#96;");
  }

  function exportStyles() {
    return `
    :root { color-scheme: light; --ink: #182126; --muted: #66737b; --line: #d8e1e5; --paper: #f3f7f8; --panel: #fff; --accent: #6f8b9a; --user: #e4eef2; }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--paper); color: var(--ink); font: 16px/1.72 Inter, "Noto Sans SC", "Microsoft YaHei", system-ui, sans-serif; }
    .conversation { width: min(1060px, calc(100% - 32px)); margin: 0 auto; padding: 48px 0 72px; }
    .conversation-header { padding: 0 0 28px; border-bottom: 1px solid var(--line); }
    .eyebrow { margin: 0 0 8px; color: var(--accent); font-size: 13px; font-weight: 700; text-transform: uppercase; }
    h1 { margin: 0; font: 700 clamp(30px, 5vw, 48px)/1.18 ui-serif, Georgia, "Noto Serif SC", serif; letter-spacing: 0; overflow-wrap: anywhere; }
    .summary { margin: 10px 0 0; color: var(--muted); }
    .metadata { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 24px; margin: 24px 0 0; }
    .metadata div { min-width: 0; }
    dt { color: var(--muted); font-size: 12px; font-weight: 700; text-transform: uppercase; }
    dd { margin: 3px 0 0; overflow-wrap: anywhere; }
    a { color: #315f78; text-underline-offset: 3px; }
    .messages { display: grid; gap: 28px; padding-top: 34px; }
    .archive-index { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1px 24px; margin: 28px 0 0; padding: 0; list-style: none; }
    .archive-index li { display: flex; min-width: 0; justify-content: space-between; gap: 12px; border-bottom: 1px solid var(--line); padding: 9px 0; }
    .archive-index a { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .archive-index span { flex: 0 0 auto; color: var(--muted); }
    .archive-list { display: grid; gap: 64px; padding-top: 48px; }
    .archive-entry { scroll-margin-top: 20px; }
    .archive-entry + .archive-entry { border-top: 2px solid var(--line); padding-top: 48px; }
    .archive-entry-header h2 { margin: 4px 0 0; font-size: 32px; overflow-wrap: anywhere; }
    .archive-number { margin: 0; color: var(--accent); font: 700 12px/1.2 ui-monospace, monospace; }
    .compact-metadata { margin-top: 18px; }
    .metadata-source { grid-column: 1 / -1; }
    .message { display: grid; grid-template-columns: 84px minmax(0, 1fr); gap: 18px; align-items: start; }
    .role-label { padding-top: 15px; color: var(--muted); font-size: 13px; font-weight: 700; }
    .message-body, .thinking-block { min-width: 0; border: 1px solid var(--line); border-radius: 8px; background: var(--panel); padding: 20px 22px; box-shadow: 0 8px 24px rgba(32, 54, 64, .055); overflow-wrap: anywhere; }
    .export-attachments { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 16px; }
    .export-attachment { display: grid; gap: 3px; min-width: 0; border: 1px solid var(--line); border-radius: 6px; background: var(--bg); padding: 10px 12px; }
    .export-attachment strong, .export-attachment small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .export-attachment small { color: var(--muted); font-size: 12px; }
    .message-user { grid-template-columns: minmax(0, 1fr) 84px; }
    .message-user .role-label { grid-column: 2; grid-row: 1; }
    .message-user .message-body { grid-column: 1; grid-row: 1; justify-self: end; width: min(78%, 760px); background: var(--user); border-color: #bdd0d9; }
    .message-thinking .thinking-block { border-style: dashed; background: #eef3f5; box-shadow: none; }
    summary { cursor: pointer; color: var(--muted); font-weight: 700; }
    .thinking-block .message-body { margin-top: 16px; padding: 0; border: 0; background: transparent; box-shadow: none; }
    .message-body > :first-child { margin-top: 0; }
    .message-body > :last-child { margin-bottom: 0; }
    p, ul, ol, blockquote, pre, .table-scroll { margin: 0 0 16px; }
    h2, h3, h4, h5, h6 { margin: 26px 0 12px; font-family: ui-serif, Georgia, "Noto Serif SC", serif; line-height: 1.35; }
    li + li { margin-top: 5px; }
    blockquote { border-left: 3px solid #b5c8d0; padding: 4px 0 4px 16px; color: #42535c; }
    hr { border: 0; border-top: 1px solid var(--line); margin: 24px 0; }
    code { border-radius: 4px; background: #e8eef0; padding: 2px 5px; font: .9em/1.5 "Cascadia Code", Consolas, monospace; }
    .code-block { position: relative; margin: 18px 0; overflow: hidden; border: 1px solid var(--line); border-radius: 7px; background: #edf2f4; }
    .code-language { border-bottom: 1px solid var(--line); padding: 6px 12px; color: var(--muted); font: 12px/1.4 "Cascadia Code", Consolas, monospace; }
    pre { overflow: auto; padding: 16px; white-space: pre; }
    pre code { padding: 0; background: transparent; }
    .math-block { border-left: 3px solid #b5c8d0; background: #f4f7f8; white-space: pre-wrap; }
    .table-scroll { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; background: #fff; }
    th, td { border: 1px solid var(--line); padding: 9px 11px; text-align: left; vertical-align: top; }
    th { background: #edf2f4; }
    @media (max-width: 680px) {
      .conversation { width: min(100% - 20px, 1060px); padding-top: 28px; }
      .metadata { grid-template-columns: 1fr; }
      .archive-index { grid-template-columns: 1fr; }
      .metadata-source { grid-column: auto; }
      .message, .message-user { grid-template-columns: 1fr; gap: 6px; }
      .message-user .role-label, .message-user .message-body { grid-column: 1; grid-row: auto; }
      .message-user .message-body { width: min(94%, 760px); }
      .role-label { padding-top: 0; }
      .message-body, .thinking-block { padding: 16px; }
      .export-attachments { grid-template-columns: 1fr; }
    }
    @media print { body { background: #fff; } .conversation { width: 100%; padding: 0; } .message-body, .thinking-block { box-shadow: none; break-inside: avoid; } }
  `;
  }

  window.CBV_HTML_EXPORT = Object.freeze({ conversationToHtml, conversationsToHtml });
})();
