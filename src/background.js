const INDEX_KEY = "cbv.index";
const CONVERSATION_PREFIX = "cbv.conversation.";
const SETTINGS_KEY = "cbv.settings";

const DEFAULT_SETTINGS = {
  autoCapture: true,
  keepHtml: false
};

const PLATFORM_FOLDERS = [
  { key: "chatgpt", label: "ChatGPT", hosts: ["chatgpt.com", "chat.openai.com"] },
  { key: "claude", label: "Claude", hosts: ["claude.ai", "claude.com"] },
  { key: "grok", label: "Grok", hosts: ["grok.com", "x.com"] },
  { key: "deepseek", label: "DeepSeek", hosts: ["chat.deepseek.com", "deepseek.com"] },
  { key: "kimi", label: "Kimi", hosts: ["kimi.com", "www.kimi.com", "kimi.moonshot.cn"] },
  { key: "gemini", label: "Gemini", hosts: ["gemini.google.com"] },
  { key: "perplexity", label: "Perplexity", hosts: ["perplexity.ai", "www.perplexity.ai"] },
  { key: "poe", label: "Poe", hosts: ["poe.com"] },
  { key: "qwen", label: "千问", hosts: ["chat.qwen.ai", "qianwen.com", "www.qianwen.com"] },
  { key: "doubao", label: "豆包", hosts: ["doubao.com", "www.doubao.com"] },
  { key: "yuanbao", label: "腾讯元宝", hosts: ["yuanbao.tencent.com"] },
  { key: "wenxin", label: "文心一言", hosts: ["yiyan.baidu.com", "wenxin.baidu.com"] },
  { key: "zhipu", label: "智谱清言", hosts: ["chatglm.cn", "www.chatglm.cn", "z.ai", "chat.z.ai"] },
  { key: "huggingface", label: "Hugging Face", hosts: ["huggingface.co", "hf.co"] }
];

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get([INDEX_KEY, SETTINGS_KEY]);
  if (!Array.isArray(existing[INDEX_KEY])) {
    await chrome.storage.local.set({ [INDEX_KEY]: [] });
  }
  if (!existing[SETTINGS_KEY]) {
    await chrome.storage.local.set({ [SETTINGS_KEY]: DEFAULT_SETTINGS });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== "object") {
    return false;
  }

  if (message.type === "cbv:conversation-snapshot") {
    saveConversationSnapshot(message.payload, sender)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, error: String(error?.message || error) }));
    return true;
  }

  if (message.type === "cbv:get-settings") {
    getSettings()
      .then((settings) => sendResponse({ ok: true, settings }))
      .catch((error) => sendResponse({ ok: false, error: String(error?.message || error) }));
    return true;
  }

  return false;
});

async function getSettings() {
  const stored = await chrome.storage.local.get(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...(stored[SETTINGS_KEY] || {}) };
}

async function saveConversationSnapshot(payload, sender) {
  const settings = await getSettings();
  if (!settings.autoCapture) {
    return { saved: false, reason: "auto-capture-disabled" };
  }

  const normalized = normalizePayload(payload, sender, settings);
  if (!normalized.messages.length) {
    return { saved: false, reason: "empty-conversation" };
  }

  const key = CONVERSATION_PREFIX + normalized.id;
  const current = await chrome.storage.local.get([INDEX_KEY, key]);
  const existing = current[key];
  const nextSignature = fingerprintMessages(normalized.messages);

  if (existing && existing.fingerprint === nextSignature && existing.title === normalized.title) {
    return { saved: false, reason: "unchanged", id: normalized.id };
  }

  const now = new Date().toISOString();
  const conversation = {
    id: normalized.id,
    localId: normalized.localId,
    platform: normalized.platform,
    platformLabel: normalized.platformLabel,
    folderId: normalized.folderId,
    folderLabel: normalized.folderLabel,
    title: normalized.title,
    sourceUrl: normalized.sourceUrl,
    sourceHost: normalized.sourceHost,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    capturedAt: now,
    captureMethod: normalized.captureMethod,
    messageCount: normalized.messages.length,
    messages: normalized.messages,
    fingerprint: nextSignature,
    schemaVersion: 2
  };

  const metadata = {
    id: conversation.id,
    localId: conversation.localId,
    platform: conversation.platform,
    platformLabel: conversation.platformLabel,
    folderId: conversation.folderId,
    folderLabel: conversation.folderLabel,
    title: conversation.title,
    sourceUrl: conversation.sourceUrl,
    sourceHost: conversation.sourceHost,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    messageCount: conversation.messageCount,
    captureMethod: conversation.captureMethod
  };

  const nextIndex = upsertIndex(current[INDEX_KEY], metadata);
  await chrome.storage.local.set({
    [key]: conversation,
    [INDEX_KEY]: nextIndex
  });

  return {
    saved: true,
    id: conversation.id,
    platform: conversation.platform,
    folderId: conversation.folderId,
    messageCount: conversation.messageCount
  };
}

function normalizePayload(payload, sender, settings) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Missing snapshot payload.");
  }

  const sourceUrl = asString(payload.sourceUrl || sender?.tab?.url || "");
  const sourceHost = safeHost(sourceUrl) || asString(payload.sourceHost);
  const platform = normalizePlatform(payload, sourceHost);
  const folderId = sanitizeIdentifier(asString(payload.folderId) || platform.key || "web");
  const folderLabel = cleanLabel(payload.folderLabel) || platform.label;
  const title = cleanTitle(payload.title) || "Untitled conversation";
  const rawLocalId = stripPlatformPrefix(asString(payload.id), platform.key) ||
    hashString(`${platform.key}\n${sourceUrl}\n${title}`);
  const localId = sanitizeIdentifier(rawLocalId).slice(0, 160) || hashString(`${sourceUrl}\n${title}`);
  const id = `${platform.key}:${localId}`;
  const rawMessages = Array.isArray(payload.messages) ? payload.messages : [];

  const messages = rawMessages
    .map((message, index) => normalizeMessage(message, index, settings))
    .filter((message) => message.text.length > 0);

  return {
    id,
    localId,
    platform: platform.key,
    platformLabel: platform.label,
    folderId,
    folderLabel,
    title,
    sourceUrl,
    sourceHost,
    captureMethod: asString(payload.captureMethod) || "dom",
    messages
  };
}

function normalizeMessage(message, index, settings) {
  const role = normalizeRole(message?.role);
  const text = normalizeText(asString(message?.text));
  const id = asString(message?.id) || `${role}-${index}-${hashString(text.slice(0, 400))}`;
  const normalized = {
    id,
    role,
    text,
    index
  };

  if (typeof message?.createdAt === "string") {
    normalized.createdAt = message.createdAt;
  }
  if (typeof message?.model === "string" && message.model) {
    normalized.model = message.model;
  }

  if (settings.keepHtml && typeof message?.html === "string") {
    normalized.html = message.html;
  }

  return normalized;
}

function upsertIndex(index, metadata) {
  const list = Array.isArray(index) ? index.filter((item) => item && item.id !== metadata.id) : [];
  list.unshift(metadata);
  return list.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

function fingerprintMessages(messages) {
  return hashString(messages.map((message) => {
    return [message.role, message.text.length, hashString(message.text)].join(":");
  }).join("|"));
}

function normalizeRole(role) {
  const value = asString(role).toLowerCase();
  if (value === "user" || value === "assistant" || value === "system" || value === "tool" || value === "thinking" || value === "unknown") {
    return value;
  }
  return "unknown";
}

function cleanTitle(value) {
  return normalizeText(asString(value))
    .replace(/\s+-\s+ChatGPT$/i, "")
    .replace(/^ChatGPT\s*[-:]\s*/i, "")
    .replace(/\s+-\s+Claude$/i, "")
    .replace(/^Claude\s*[-:]\s*/i, "")
    .replace(/\s+-\s+Grok$/i, "")
    .replace(/^Grok\s*[-:]\s*/i, "")
    .replace(/\s+-\s+DeepSeek$/i, "")
    .replace(/^DeepSeek\s*[-:]\s*/i, "")
    .replace(/\s+-\s+Kimi$/i, "")
    .replace(/^Kimi\s*[-:]\s*/i, "")
    .replace(/\s+-\s+Gemini$/i, "")
    .replace(/^Gemini\s*[-:]\s*/i, "")
    .replace(/\s+-\s+Perplexity$/i, "")
    .replace(/^Perplexity\s*[-:]\s*/i, "")
    .replace(/\s+-\s+Poe$/i, "")
    .replace(/^Poe\s*[-:]\s*/i, "")
    .replace(/\s+-\s+Qwen$/i, "")
    .replace(/^Qwen\s*[-:]\s*/i, "")
    .replace(/\s+-\s+千问$/i, "")
    .replace(/^千问\s*[-:：]\s*/i, "")
    .replace(/\s+-\s+豆包$/i, "")
    .replace(/^豆包\s*[-:：]\s*/i, "")
    .replace(/\s+-\s+腾讯元宝$/i, "")
    .replace(/^腾讯元宝\s*[-:：]\s*/i, "")
    .replace(/\s+-\s+文心一言$/i, "")
    .replace(/^文心一言\s*[-:：]\s*/i, "")
    .replace(/\s+-\s+文小言$/i, "")
    .replace(/^文小言\s*[-:：]\s*/i, "")
    .replace(/\s+-\s+智谱清言$/i, "")
    .replace(/^智谱清言\s*[-:：]\s*/i, "")
    .replace(/\s+-\s+ChatGLM$/i, "")
    .replace(/^ChatGLM\s*[-:]\s*/i, "")
    .replace(/\s+-\s+Z\.ai$/i, "")
    .replace(/^Z\.ai\s*[-:]\s*/i, "")
    .replace(/\s+-\s+Hugging Face$/i, "")
    .replace(/^Hugging Face\s*[-:]\s*/i, "")
    .replace(/\s+-\s+HuggingChat$/i, "")
    .replace(/^HuggingChat\s*[-:]\s*/i, "")
    .slice(0, 180)
    .trim();
}

function normalizePlatform(payload, sourceHost) {
  const declaredKey = sanitizeIdentifier(asString(payload.platform)).toLowerCase();
  const inferred = inferPlatformFromHost(sourceHost);
  const key = declaredKey || inferred?.key || "web";
  const label = cleanLabel(payload.platformLabel) || inferred?.label || titleCase(key);
  return { key, label };
}

function inferPlatformFromHost(sourceHost) {
  const host = asString(sourceHost).toLowerCase().replace(/^www\./, "");
  if (!host) {
    return null;
  }

  return PLATFORM_FOLDERS.find((platform) => {
    return platform.hosts.some((candidate) => {
      const normalized = candidate.toLowerCase().replace(/^www\./, "");
      return host === normalized || host.endsWith(`.${normalized}`);
    });
  }) || null;
}

function stripPlatformPrefix(rawId, platformKey) {
  const value = asString(rawId);
  const prefix = `${platformKey}:`;
  return value.startsWith(prefix) ? value.slice(prefix.length) : value;
}

function sanitizeIdentifier(value) {
  return asString(value)
    .trim()
    .replace(/[^a-zA-Z0-9._:-]/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_+|_+$/g, "");
}

function cleanLabel(value) {
  return normalizeText(asString(value)).slice(0, 80);
}

function titleCase(value) {
  const text = asString(value).replace(/[-_]+/g, " ");
  return text.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeText(value) {
  return value
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function safeHost(url) {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}

function asString(value) {
  return typeof value === "string" ? value : "";
}

function hashString(input) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}
