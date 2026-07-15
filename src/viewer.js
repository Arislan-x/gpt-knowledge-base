const INDEX_KEY = "cbv.index";
const CONVERSATION_PREFIX = "cbv.conversation.";

const PLATFORM_FOLDERS = [
  { key: "chatgpt", label: "ChatGPT", hosts: ["chatgpt.com", "chat.openai.com"] },
  { key: "claude", label: "Claude", hosts: ["claude.ai", "claude.com"] },
  { key: "grok", label: "Grok", hosts: ["grok.com", "x.com"] },
  { key: "deepseek", label: "DeepSeek", hosts: ["chat.deepseek.com", "deepseek.com"] },
  { key: "kimi", label: "Kimi", hosts: ["kimi.com", "www.kimi.com", "kimi.moonshot.cn"] },
  { key: "gemini", label: "Gemini", hosts: ["gemini.google.com"] },
  { key: "perplexity", label: "Perplexity", hosts: ["perplexity.ai", "www.perplexity.ai"] },
  { key: "poe", label: "Poe", hosts: ["poe.com", "www.poe.com"] },
  { key: "qwen", label: "千问", hosts: ["chat.qwen.ai", "qianwen.com", "www.qianwen.com"] },
  { key: "doubao", label: "豆包", hosts: ["doubao.com", "www.doubao.com"] },
  { key: "yuanbao", label: "腾讯元宝", hosts: ["yuanbao.tencent.com"] },
  { key: "wenxin", label: "文心一言", hosts: ["chat.baidu.com", "yiyan.baidu.com", "wenxin.baidu.com"] },
  { key: "zhipu", label: "智谱清言", hosts: ["chatglm.cn", "www.chatglm.cn", "z.ai", "chat.z.ai"] },
  { key: "huggingface", label: "Hugging Face", hosts: ["huggingface.co", "hf.co"] }
];

const ROLE_LABELS = {
  user: "User",
  assistant: "Assistant",
  thinking: "Thinking",
  system: "System",
  tool: "Tool",
  unknown: "Message"
};

let latexMacros = {};

const PREFS = window.CBV_PREFERENCES;

const elements = {
  appTitle: document.querySelector("#appTitle"),
  appKicker: document.querySelector("#appKicker"),
  statusText: document.querySelector("#statusText"),
  languageLabel: document.querySelector("#languageLabel"),
  languageSelect: document.querySelector("#languageSelect"),
  fontLabel: document.querySelector("#fontLabel"),
  fontSelect: document.querySelector("#fontSelect"),
  themeLabel: document.querySelector("#themeLabel"),
  themeSelect: document.querySelector("#themeSelect"),
  supportedPlatformsButton: document.querySelector("#supportedPlatformsButton"),
  importButton: document.querySelector("#importButton"),
  exportButton: document.querySelector("#exportButton"),
  clearWorkspaceButton: document.querySelector("#clearWorkspaceButton"),
  exportDialog: document.querySelector("#exportDialog"),
  exportForm: document.querySelector("#exportForm"),
  exportDialogTitle: document.querySelector("#exportDialogTitle"),
  exportFormatLabel: document.querySelector("#exportFormatLabel"),
  exportPackagingLabel: document.querySelector("#exportPackagingLabel"),
  exportSingleFileLabel: document.querySelector("#exportSingleFileLabel"),
  exportZipLabel: document.querySelector("#exportZipLabel"),
  closeExportDialogButton: document.querySelector("#closeExportDialogButton"),
  cancelExportButton: document.querySelector("#cancelExportButton"),
  confirmExportButton: document.querySelector("#confirmExportButton"),
  folderFallbackInput: document.querySelector("#folderFallbackInput"),
  searchInput: document.querySelector("#searchInput"),
  conversationCount: document.querySelector("#conversationCount"),
  conversationCountLabel: document.querySelector("#conversationCountLabel"),
  messageCount: document.querySelector("#messageCount"),
  messageCountLabel: document.querySelector("#messageCountLabel"),
  folderList: document.querySelector("#folderList"),
  conversationList: document.querySelector("#conversationList"),
  sourceBadge: document.querySelector("#sourceBadge"),
  folderBadge: document.querySelector("#folderBadge"),
  conversationTitle: document.querySelector("#conversationTitle"),
  conversationMeta: document.querySelector("#conversationMeta"),
  openSourceButton: document.querySelector("#openSourceButton"),
  exportMarkdownButton: document.querySelector("#exportMarkdownButton"),
  exportJsonButton: document.querySelector("#exportJsonButton"),
  exportHtmlButton: document.querySelector("#exportHtmlButton"),
  deleteConversationButton: document.querySelector("#deleteConversationButton"),
  messageList: document.querySelector("#messageList"),
  userProgress: document.querySelector("#userProgress"),
  emptyState: document.querySelector("#emptyState"),
  supportedPlatformsTitle: document.querySelector("#supportedPlatformsTitle"),
  trademarkNotice: document.querySelector("#trademarkNotice"),
  supportedPlatformList: document.querySelector("#supportedPlatformList")
};

const state = {
  localConversations: [],
  externalConversations: [],
  selectedKey: "",
  selectedFolder: "all",
  query: "",
  externalFolderName: "",
  externalDirectoryHandle: null,
  externalFileCount: 0,
  pendingConversationId: "",
  preferences: { ...PREFS.DEFAULT_PREFERENCES }
};

document.addEventListener("DOMContentLoaded", initialize);
elements.languageSelect.addEventListener("change", () => updatePreferences({ language: elements.languageSelect.value }));
elements.fontSelect.addEventListener("change", () => updatePreferences({ font: elements.fontSelect.value }));
elements.themeSelect.addEventListener("change", () => updatePreferences({ theme: elements.themeSelect.value }));
elements.importButton.addEventListener("click", chooseExternalFolder);
elements.exportButton.addEventListener("click", openExportDialog);
elements.clearWorkspaceButton.addEventListener("click", clearWorkspace);
elements.closeExportDialogButton.addEventListener("click", closeExportDialog);
elements.cancelExportButton.addEventListener("click", closeExportDialog);
elements.confirmExportButton.addEventListener("click", confirmExportAll);
elements.exportDialog.addEventListener("click", (event) => {
  if (event.target === elements.exportDialog) {
    closeExportDialog();
  }
});
elements.folderFallbackInput.addEventListener("change", handleFallbackFiles);
elements.searchInput.addEventListener("input", () => {
  state.query = elements.searchInput.value.trim().toLowerCase();
  render();
});
elements.openSourceButton.addEventListener("click", openSelectedSource);
elements.exportMarkdownButton.addEventListener("click", () => exportSelected("markdown"));
elements.exportJsonButton.addEventListener("click", () => exportSelected("json"));
elements.exportHtmlButton.addEventListener("click", () => exportSelected("html"));
elements.deleteConversationButton.addEventListener("click", deleteSelectedConversation);
elements.messageList.addEventListener("scroll", updateUserProgressActive);

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && (changes[INDEX_KEY] || hasConversationChange(changes))) {
    loadLocalConversations().then(() => render());
  }
  if (areaName === "local" && changes["cbv.preferences"]) {
    loadPreferencesAndRender();
  }
});

async function initialize() {
  state.pendingConversationId = new URLSearchParams(location.search).get("conversation") || "";
  await loadPreferencesAndRender({ skipRender: true });
  await loadLocalConversations();
  render();
}

async function loadPreferencesAndRender(options = {}) {
  state.preferences = await PREFS.loadPreferences();
  PREFS.applyPreferences(state.preferences);
  syncPreferenceControls();
  applyStaticText();
  if (!options.skipRender) {
    render();
  }
}

async function updatePreferences(patch) {
  state.preferences = await PREFS.savePreferences(patch);
  PREFS.applyPreferences(state.preferences);
  syncPreferenceControls();
  applyStaticText();
  render();
}

function syncPreferenceControls() {
  fillPreferenceSelect(elements.languageSelect, PREFS.LANGUAGE_OPTIONS, "language");
  fillPreferenceSelect(elements.fontSelect, PREFS.FONT_OPTIONS, "font");
  fillPreferenceSelect(elements.themeSelect, PREFS.THEME_OPTIONS, "theme");
}

function fillPreferenceSelect(select, options, key) {
  const selected = state.preferences[key];
  select.replaceChildren(...options.map((option) => {
    const node = document.createElement("option");
    node.value = option.key;
    node.textContent = PREFS.optionLabel(state.preferences, option);
    node.selected = option.key === selected;
    return node;
  }));
}

function applyStaticText() {
  elements.appTitle.textContent = tr("appTitle");
  elements.appKicker.textContent = tr("appKicker");
  elements.languageLabel.textContent = tr("language");
  elements.fontLabel.textContent = tr("font");
  elements.themeLabel.textContent = tr("theme");
  elements.languageLabel.closest(".icon-select").title = tr("language");
  elements.fontLabel.closest(".icon-select").title = tr("font");
  elements.themeLabel.closest(".icon-select").title = tr("theme");
  elements.languageLabel.closest(".icon-select").setAttribute("aria-label", tr("language"));
  elements.fontLabel.closest(".icon-select").setAttribute("aria-label", tr("font"));
  elements.themeLabel.closest(".icon-select").setAttribute("aria-label", tr("theme"));
  elements.supportedPlatformsButton.title = tr("supportedPlatforms");
  elements.supportedPlatformsButton.setAttribute("aria-label", tr("supportedPlatforms"));
  elements.supportedPlatformsButton.querySelector(".sr-only").textContent = tr("supportedPlatforms");
  elements.importButton.textContent = tr("importBackups");
  elements.exportButton.textContent = tr("exportBackups");
  elements.clearWorkspaceButton.textContent = tr("clearWorkspace");
  setTooltip(elements.importButton, tr("importBackupsTooltip"));
  setTooltip(elements.exportButton, tr("exportBackupsTooltip"));
  setTooltip(elements.clearWorkspaceButton, tr("clearWorkspaceTooltip"));
  elements.exportDialogTitle.textContent = tr("exportDialogTitle");
  elements.exportFormatLabel.textContent = tr("exportFormatLabel");
  elements.exportPackagingLabel.textContent = tr("exportPackagingLabel");
  elements.exportSingleFileLabel.textContent = tr("exportSingleFileLabel");
  elements.exportZipLabel.textContent = tr("exportZipLabel");
  elements.cancelExportButton.textContent = tr("cancel");
  elements.confirmExportButton.textContent = tr("confirmExport");
  elements.closeExportDialogButton.setAttribute("aria-label", tr("close"));
  elements.searchInput.placeholder = tr("searchBackups");
  elements.conversationCountLabel.textContent = tr("conversations");
  elements.messageCountLabel.textContent = tr("messages");
  setConversationActionLabel(elements.openSourceButton, tr("openSourceTooltip"));
  setConversationActionLabel(elements.exportMarkdownButton, tr("exportSingleMdTooltip"), "MD");
  setConversationActionLabel(elements.exportJsonButton, tr("exportSingleJsonTooltip"), "JSON");
  setConversationActionLabel(elements.exportHtmlButton, tr("exportSingleHtmlTooltip"), "HTML");
  setConversationActionLabel(elements.deleteConversationButton, tr("deleteSingleConversationTooltip"));
  elements.emptyState.querySelector("h3").textContent = tr("noBackupSelected");
  elements.emptyState.querySelector("p").textContent = tr("noBackupSelectedHint");
  elements.supportedPlatformsTitle.textContent = tr("supportedPlatforms");
  elements.trademarkNotice.textContent = tr("trademarkNotice");
  renderSupportedPlatforms();
}

function setConversationActionLabel(button, tooltip, visibleLabel = "") {
  button.title = tooltip;
  button.setAttribute("aria-label", tooltip);
  const screenReaderLabel = button.querySelector(".sr-only");
  if (screenReaderLabel) {
    screenReaderLabel.textContent = tooltip;
  }
  const actionLabel = button.querySelector(".action-label");
  if (actionLabel) {
    actionLabel.textContent = visibleLabel;
  }
}

function setTooltip(element, tooltip) {
  element.title = tooltip;
  element.setAttribute("aria-label", tooltip);
}

function openExportDialog() {
  if (!getCombinedConversations().length) {
    return;
  }
  elements.exportDialog.showModal();
}

function closeExportDialog() {
  if (elements.exportDialog.open) {
    elements.exportDialog.close();
  }
}

function confirmExportAll() {
  const data = new FormData(elements.exportForm);
  exportAll(data.get("exportFormat") || "json", data.get("exportPackaging") || "single");
  closeExportDialog();
}

function renderSupportedPlatforms() {
  elements.supportedPlatformList.replaceChildren(...PREFS.SUPPORTED_PLATFORMS.map((platform) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `supported-platform platform-${platform.key}`;
    button.title = PREFS.platformTitle(state.preferences, platform);
    button.setAttribute("aria-label", PREFS.platformTitle(state.preferences, platform));
    button.addEventListener("click", () => {
      chrome.tabs.create({ url: platform.home });
    });

    const text = document.createElement("span");
    text.className = "platform-text";

    const label = document.createElement("strong");
    label.textContent = PREFS.platformLabel(state.preferences, platform);

    const owner = document.createElement("small");
    owner.textContent = platform.owner;

    text.append(label, owner);
    button.append(createPlatformIcon(platform), text);
    return button;
  }));
}

function createPlatformIcon(platform) {
  if (platform.logo) {
    const image = document.createElement("img");
    image.className = "platform-logo";
    image.src = platform.logo;
    image.alt = "";
    image.setAttribute("aria-hidden", "true");
    return image;
  }

  const icon = document.createElement("span");
  icon.className = "platform-icon";
  icon.textContent = platform.icon;
  return icon;
}

async function refreshAll() {
  await loadLocalConversations();
  if (state.externalDirectoryHandle) {
    await scanDirectoryHandle(state.externalDirectoryHandle);
  }
  render();
}

async function loadLocalConversations() {
  const stored = await chrome.storage.local.get(INDEX_KEY);
  const index = Array.isArray(stored[INDEX_KEY]) ? stored[INDEX_KEY] : [];
  const keys = index.map((item) => CONVERSATION_PREFIX + item.id);
  const conversations = keys.length ? await chrome.storage.local.get(keys) : {};

  state.localConversations = index
    .map((item) => conversations[CONVERSATION_PREFIX + item.id])
    .filter(Boolean)
    .map((conversation) => normalizeConversation(conversation, {
      sourceType: "browser",
      sourceLabel: tr("browserStorage"),
      externalPath: ""
    }))
    .filter(Boolean);
}

async function chooseExternalFolder() {
  if ("showDirectoryPicker" in window) {
    try {
      const handle = await window.showDirectoryPicker({ mode: "read" });
      state.externalDirectoryHandle = handle;
      await scanDirectoryHandle(handle);
      render();
    } catch (error) {
      if (error?.name !== "AbortError") {
        setStatus(tr("folderReadFailed", { message: error?.message || error }));
      }
    }
    return;
  }

  elements.folderFallbackInput.click();
}

async function scanDirectoryHandle(handle) {
  const files = [];
  await walkDirectory(handle, "", files);
  state.externalFolderName = handle.name || tr("folder");
  state.externalFileCount = files.length;
  state.externalConversations = await parseExternalFiles(files, state.externalFolderName);
}

async function walkDirectory(directoryHandle, basePath, files) {
  for await (const [name, handle] of directoryHandle.entries()) {
    const relativePath = basePath ? `${basePath}/${name}` : name;
    if (handle.kind === "directory") {
      await walkDirectory(handle, relativePath, files);
      continue;
    }

    if (handle.kind === "file" && isSupportedBackupFile(name)) {
      const file = await handle.getFile();
      files.push({ file, relativePath });
    }
  }
}

async function handleFallbackFiles(event) {
  const files = Array.from(event.target.files || [])
    .filter((file) => isSupportedBackupFile(file.name))
    .map((file) => ({
      file,
      relativePath: file.webkitRelativePath || file.name
    }));

  state.externalFolderName = inferRootFolderName(files) || tr("folder");
  state.externalFileCount = files.length;
  state.externalDirectoryHandle = null;
  state.externalConversations = await parseExternalFiles(files, state.externalFolderName);
  event.target.value = "";
  render();
}

async function parseExternalFiles(files, folderName) {
  const parsed = [];
  for (const entry of files) {
    try {
      const text = await entry.file.text();
      const sourceMeta = {
        sourceType: "folder",
        sourceLabel: folderName,
        externalPath: entry.relativePath,
        fileName: entry.file.name
      };

      const conversations = entry.file.name.toLowerCase().endsWith(".json")
        ? parseJsonBackup(text, sourceMeta)
        : parseMarkdownBackup(text, sourceMeta);

      parsed.push(...conversations);
    } catch (error) {
      console.warn("Unable to parse backup file", entry.relativePath, error);
    }
  }

  return parsed.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

function parseJsonBackup(text, sourceMeta) {
  const data = JSON.parse(text);
  let rawConversations = [];

  if (Array.isArray(data)) {
    rawConversations = data;
  } else if (Array.isArray(data?.conversations)) {
    rawConversations = data.conversations;
  } else if (looksLikeConversation(data)) {
    rawConversations = [data];
  }

  return rawConversations
    .map((conversation, index) => normalizeConversation(conversation, {
      ...sourceMeta,
      externalIndex: index
    }))
    .filter(Boolean);
}

function parseMarkdownBackup(text, sourceMeta) {
  return splitMarkdownConversations(text)
    .map((segment, index) => parseMarkdownConversation(segment, {
      ...sourceMeta,
      externalIndex: index
    }))
    .filter(Boolean);
}

function splitMarkdownConversations(text) {
  const normalized = String(text || "").replace(/\r/g, "");
  const parts = normalized.split(/\n\s*---\s*\n/g)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length ? parts : [normalized.trim()].filter(Boolean);
}

function parseMarkdownConversation(segment, sourceMeta) {
  const title = segment.match(/^#\s+(.+)$/m)?.[1]?.trim() || sourceMeta.fileName || tr("untitledConversation");
  const platformLabel = segment.match(/^Platform:\s*(.+)$/mi)?.[1]?.trim() || inferPlatformFromText(title, sourceMeta.externalPath)?.label || tr("folder");
  const folderLabel = segment.match(/^Folder:\s*(.+)$/mi)?.[1]?.trim() || platformLabel;
  const sourceUrl = segment.match(/^Source:\s*(.+)$/mi)?.[1]?.trim() || "";
  const captured = segment.match(/^Captured:\s*(.+)$/mi)?.[1]?.trim() || "";
  const messageMatches = Array.from(segment.matchAll(/^##\s+(User|Assistant|Thinking|System|Tool|Unknown|Message)\s*$/gim));
  const messages = [];

  if (messageMatches.length) {
    for (let index = 0; index < messageMatches.length; index += 1) {
      const match = messageMatches[index];
      const next = messageMatches[index + 1];
      const role = normalizeRole(match[1]);
      const start = match.index + match[0].length;
      const end = next ? next.index : segment.length;
      const messageText = segment.slice(start, end).trim();
      if (messageText) {
        messages.push({
          id: `${role}-${index}-${hashString(messageText.slice(0, 400))}`,
          role,
          text: messageText,
          index
        });
      }
    }
  } else {
    const body = segment
      .replace(/^#\s+.+$/m, "")
      .replace(/^Platform:\s*.+$/gim, "")
      .replace(/^Folder:\s*.+$/gim, "")
      .replace(/^Source:\s*.+$/gim, "")
      .replace(/^Captured:\s*.+$/gim, "")
      .trim();
    if (body) {
      messages.push({
        id: `message-0-${hashString(body.slice(0, 400))}`,
        role: "unknown",
        text: body,
        index: 0
      });
    }
  }

  if (!messages.length) {
    return null;
  }

  return normalizeConversation({
    id: `${sourceMeta.externalPath}:${sourceMeta.externalIndex || 0}`,
    title,
    platform: normalizeKey(platformLabel),
    platformLabel,
    folderId: normalizeKey(folderLabel || platformLabel),
    folderLabel,
    sourceUrl,
    updatedAt: captured,
    capturedAt: captured,
    messages
  }, sourceMeta);
}

function normalizeConversation(raw, sourceMeta) {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const sourceHost = raw.sourceHost || safeHost(raw.sourceUrl || "");
  const inferred = inferPlatform(sourceHost) || inferPlatformFromText(raw.title, sourceMeta.externalPath);
  const platformMatch = PREFS.platformByKey?.(raw.platform) ||
    PREFS.platformByKey?.(raw.platformLabel) ||
    PREFS.platformByKey?.(raw.folderLabel) ||
    inferred;
  const platform = platformMatch?.key || normalizeKey(raw.platform || inferred?.key || raw.platformLabel || raw.folderLabel || "external");
  const platformLabel = cleanText(raw.platformLabel || platformMatch?.label || inferred?.label || titleCase(platform));
  const messages = Array.isArray(raw.messages)
    ? normalizeConversationMessages(raw.messages, platform, raw.title)
    : [];
  if (!messages.length) {
    return null;
  }
  const doubaoTitle = platform === "doubao" ? extractDoubaoTitleFromMessages(raw.messages) : "";

  const folderMatch = PREFS.platformByKey?.(raw.folderId) ||
    PREFS.platformByKey?.(raw.folderLabel) ||
    platformMatch;
  const folderId = folderMatch?.key || normalizeKey(raw.folderId || platform);
  const folderLabel = cleanText(raw.folderLabel || folderMatch?.label || platformLabel);
  const originalId = cleanText(raw.id || raw.localId || "");
  const basis = [
    sourceMeta.sourceType,
    sourceMeta.externalPath || "",
    platform,
    originalId,
    raw.title || "",
    messages.map((message) => `${message.role}:${hashString(message.text)}`).join("|")
  ].join("\n");

  const updatedAt = normalizeDate(raw.updatedAt || raw.capturedAt || raw.createdAt || "");
  const title = cleanText(doubaoTitle || raw.title || messages.find((message) => message.role === "user")?.text?.split("\n")?.[0] || tr("untitledConversation"));

  return {
    viewerId: `${sourceMeta.sourceType}:${hashString(basis)}`,
    id: originalId || hashString(basis),
    originalId,
    title: trimToLength(title, 180),
    platform,
    platformLabel,
    folderId,
    folderLabel,
    sourceType: sourceMeta.sourceType,
    sourceLabel: sourceMeta.sourceLabel,
    externalPath: sourceMeta.externalPath || "",
    sourceUrl: raw.sourceUrl || "",
    sourceHost,
    createdAt: normalizeDate(raw.createdAt || updatedAt),
    updatedAt,
    capturedAt: normalizeDate(raw.capturedAt || updatedAt),
    messageCount: messages.length,
    messages
  };
}

function normalizeConversationMessages(rawMessages, platform, title = "") {
  const normalized = rawMessages.map(normalizeMessage).filter(Boolean);
  let messages = normalized;
  if (platform === "kimi") {
    messages = repairKimiMessagesForDisplay(messages);
  }
  if (platform === "doubao") {
    messages = repairDoubaoMessagesForDisplay(messages);
  }
  if (platform === "gemini") {
    messages = repairGeminiMessagesForDisplay(messages);
  }
  if (platform === "qwen") {
    messages = repairQwenMessagesForDisplay(messages);
  }
  if (platform === "wenxin") {
    messages = repairWenxinMessagesForDisplay(messages);
  }
  if (platform === "perplexity") {
    messages = repairPerplexityMessagesForDisplay(messages, title);
  }
  if (platform === "chatgpt") {
    messages = repairChatGptThinkingMessages(messages);
  }

  return messages.map((message, index) => ({
    ...message,
    index
  }));
}

function repairPerplexityMessagesForDisplay(messages, title) {
  if (messages.length !== 1 || messages[0]?.role === "user") {
    return messages;
  }

  const text = cleanText(messages[0]?.text);
  const paragraphs = text.split(/\n{2,}/).map(cleanText).filter(Boolean);
  if (paragraphs.length < 2) {
    return messages;
  }

  const userText = paragraphs[0];
  if (!isPerplexityDisplayTitleMatch(userText, title)) {
    return messages;
  }

  let answerParagraphs = paragraphs.slice(1);
  if (answerParagraphs.length && isPerplexityDisplayTitleMatch(answerParagraphs[0], userText)) {
    answerParagraphs = answerParagraphs.slice(1);
  }
  const assistantText = cleanText(answerParagraphs.join("\n\n"));
  if (!assistantText) {
    return messages;
  }

  return [
    {
      ...messages[0],
      id: `perplexity-user-${hashString(userText.slice(0, 400))}`,
      role: "user",
      text: userText
    },
    {
      ...messages[0],
      id: `perplexity-assistant-${hashString(assistantText.slice(0, 400))}`,
      role: "assistant",
      text: assistantText
    }
  ];
}

function isPerplexityDisplayTitleMatch(value, title) {
  const left = normalizePerplexityDisplayComparable(value);
  const right = normalizePerplexityDisplayComparable(title);
  if (left.length < 6 || right.length < 6) {
    return false;
  }
  if (left === right || left.startsWith(right) || right.startsWith(left)) {
    return true;
  }

  let prefixLength = 0;
  while (prefixLength < left.length && prefixLength < right.length && left[prefixLength] === right[prefixLength]) {
    prefixLength += 1;
  }
  return prefixLength >= 18 && prefixLength >= Math.min(left.length, right.length) * 0.72;
}

function normalizePerplexityDisplayComparable(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/\s+-\s+perplexity\s*$/i, "")
    .replace(/[\s\p{P}\p{S}]+/gu, "");
}

function normalizeMessage(raw, index) {
  const text = cleanText(raw?.text || raw?.content || "");
  if (!text) {
    return null;
  }

  const role = normalizeRole(raw?.role);
  return {
    id: cleanText(raw?.id || `${role}-${index}-${hashString(text.slice(0, 400))}`),
    role,
    text,
    index: Number.isFinite(raw?.index) ? raw.index : index
  };
}

function repairWenxinMessagesForDisplay(messages) {
  const repaired = [];
  let turn = [];

  const flushTurn = () => {
    if (!turn.length) {
      return;
    }
    repaired.push(...collapseWenxinTurnForDisplay(turn));
    turn = [];
  };

  for (const message of messages || []) {
    if (message?.role === "user") {
      flushTurn();
      turn = [message];
      continue;
    }
    if (turn.length) {
      turn.push(message);
    } else if (message) {
      repaired.push({ ...message });
    }
  }
  flushTurn();

  return repaired;
}

function collapseWenxinTurnForDisplay(turnMessages) {
  const [userMessage, ...steps] = turnMessages;
  if (!userMessage || !steps.length) {
    return userMessage ? [{ ...userMessage }] : [];
  }

  const firstFinalIndex = steps.findIndex((message) => message?.role === "unknown");
  if (firstFinalIndex < 0) {
    return collapseWenxinAssistantOnlyTurnForDisplay(userMessage, steps);
  }

  const result = [{ ...userMessage }];
  const thinkingMessages = [];
  const finalMessages = [];

  for (let index = 0; index < steps.length; index += 1) {
    const message = steps[index];
    if (!message) {
      continue;
    }
    if (index < firstFinalIndex && (message.role === "assistant" || message.role === "thinking")) {
      thinkingMessages.push(message);
      continue;
    }
    if (index >= firstFinalIndex && (message.role === "unknown" || message.role === "assistant")) {
      finalMessages.push(message);
      continue;
    }
    result.push({ ...message });
  }

  const thinking = mergeWenxinPartsForDisplay(thinkingMessages, "thinking");
  if (thinking) {
    result.push(thinking);
  }
  const finalAssistant = mergeWenxinPartsForDisplay(finalMessages, "assistant");
  if (finalAssistant) {
    result.push(finalAssistant);
  }
  return result;
}

function collapseWenxinAssistantOnlyTurnForDisplay(userMessage, steps) {
  const result = [{ ...userMessage }];
  const assistantIndexes = steps
    .map((message, index) => message?.role === "assistant" ? index : -1)
    .filter((index) => index >= 0);
  const finalAssistantIndex = assistantIndexes.at(-1) ?? -1;
  const thinkingMessages = [];

  for (let index = 0; index < steps.length; index += 1) {
    const message = steps[index];
    if (!message) {
      continue;
    }
    if ((message.role === "assistant" || message.role === "thinking") && index !== finalAssistantIndex) {
      thinkingMessages.push(message);
      continue;
    }
    result.push({ ...message });
  }

  const thinking = mergeWenxinPartsForDisplay(thinkingMessages, "thinking");
  if (thinking) {
    result.splice(1, 0, thinking);
  }
  return result;
}

function mergeWenxinPartsForDisplay(messages, role) {
  const parts = [];
  for (const message of messages || []) {
    const text = cleanText(message?.text);
    if (!text || parts.some((part) => part === text || part.includes(text))) {
      continue;
    }
    const coveredIndex = parts.findIndex((part) => text.includes(part));
    if (coveredIndex >= 0) {
      parts[coveredIndex] = text;
    } else {
      parts.push(text);
    }
  }

  if (!parts.length) {
    return null;
  }

  const text = parts.join("\n\n");
  const first = messages[0] || {};
  return {
    ...first,
    id: `${role}-${hashString(text.slice(0, 1000))}`,
    role,
    text
  };
}

function repairChatGptThinkingMessages(messages) {
  const repaired = [];
  let userIndex = -1;

  for (let index = 0; index <= messages.length; index += 1) {
    const message = messages[index];
    if (index === messages.length || message?.role === "user") {
      if (userIndex >= 0) {
        repaired.push(...collapseChatGptTurnMessages(messages.slice(userIndex, index)));
      }
      userIndex = index;
    }
  }

  return repaired;
}

function collapseChatGptTurnMessages(turnMessages) {
  if (!turnMessages.length) {
    return [];
  }

  const [userMessage, ...steps] = turnMessages;
  const result = [{ ...userMessage }];
  let lastAssistantIndex = -1;

  for (let index = 0; index < steps.length; index += 1) {
    if (steps[index]?.role === "assistant") {
      lastAssistantIndex = index;
    }
  }

  const thinkingMessages = [];
  let finalAssistant = null;

  for (let index = 0; index < steps.length; index += 1) {
    const message = steps[index];
    if (!message) {
      continue;
    }

    if (message.role === "assistant" && index === lastAssistantIndex) {
      finalAssistant = { ...message };
      continue;
    }

    if (message.role === "assistant" || message.role === "tool" || message.role === "thinking") {
      thinkingMessages.push(message);
      continue;
    }

    result.push({ ...message });
  }

  const thinking = mergeChatGptThinkingMessages(thinkingMessages);
  if (thinking) {
    result.push(thinking);
  }
  if (finalAssistant) {
    result.push(finalAssistant);
  }

  return result;
}

function mergeChatGptThinkingMessages(messages) {
  const parts = messages
    .map((message) => cleanText(message.text))
    .filter(Boolean);
  if (!parts.length) {
    return null;
  }

  const text = parts.join("\n\n---\n\n");
  const first = messages[0] || {};
  return {
    ...first,
    id: `thinking-${hashString(text.slice(0, 1000))}`,
    role: "thinking",
    text,
    createdAt: first.createdAt || "",
    model: first.model || ""
  };
}

function repairGeminiMessagesForDisplay(messages) {
  const repaired = [];

  for (const message of messages) {
    const text = stripGeminiSpeakerText(message.text, message.role);
    if (!text) {
      continue;
    }

    const duplicate = repaired.some((existing) => {
      return existing.role === message.role &&
        areGeminiDuplicateTexts(existing.text, text);
    });
    if (duplicate) {
      continue;
    }

    repaired.push({
      ...message,
      text
    });
  }

  return mergeAdjacentGeminiUserMessages(repaired);
}

function mergeAdjacentGeminiUserMessages(messages) {
  const merged = [];
  for (const message of messages || []) {
    const previous = merged[merged.length - 1];
    if (previous && previous.role === "user" && message.role === "user") {
      previous.text = cleanText(`${previous.text}\n${message.text}`);
      continue;
    }
    merged.push({ ...message });
  }
  return merged.map((message, index) => ({ ...message, index }));
}

function stripGeminiSpeakerText(text, role) {
  const lines = cleanText(text).split("\n");
  while (lines.length && isGeminiSpeakerLine(lines[0], role)) {
    lines.shift();
  }
  return cleanText(lines.join("\n"));
}

function isGeminiSpeakerLine(line, role) {
  const value = normalizeInlineText(line)
    .replace(/[：:]+$/g, "")
    .trim();
  if (!value) {
    return false;
  }

  if (role === "user") {
    return /^(你说|您说|you said|you)$/i.test(value);
  }
  if (role === "assistant") {
    return /^(gemini\s*说|gemini said|gemini)$/i.test(value);
  }

  return /^(你说|您说|you said|gemini\s*说|gemini said)$/i.test(value);
}

function areGeminiDuplicateTexts(first, second) {
  const a = normalizeInlineText(first);
  const b = normalizeInlineText(second);
  if (!a || !b) {
    return false;
  }
  if (a === b) {
    return true;
  }

  const shorter = a.length <= b.length ? a : b;
  const longer = shorter === a ? b : a;
  return shorter.length >= 8 && longer.includes(shorter);
}

function repairQwenMessagesForDisplay(messages) {
  const repaired = [];

  for (const message of messages) {
    const text = cleanQwenText(message.text);
    if (!isViableQwenDisplayText(text)) {
      continue;
    }

    let role = normalizeRole(message.role);
    if (role === "unknown") {
      role = inferQwenRoleFromText(text);
    }
    if (role === "unknown" || (role !== "user" && isQwenSuggestionText(text))) {
      continue;
    }

    const duplicate = repaired.some((existing) => {
      return existing.role === role && areQwenDuplicateTexts(existing.text, text);
    });
    if (duplicate) {
      continue;
    }

    repaired.push({
      ...message,
      role,
      text
    });
  }

  return mergeAdjacentQwenMessages(repaired);
}

function cleanQwenText(text) {
  const lines = cleanText(text)
    .split("\n")
    .map((line) => cleanText(line))
    .filter((line) => line && !isQwenChromeLine(line) && !isMessageControlLine(line));
  return cleanText(lines.join("\n"));
}

function mergeAdjacentQwenMessages(messages) {
  const merged = [];
  for (const message of messages || []) {
    const previous = merged[merged.length - 1];
    if (previous && previous.role === "assistant" && message.role === "assistant") {
      previous.text = cleanText(`${previous.text}\n\n${message.text}`);
      previous.id = `${previous.id}-${hashString(message.text.slice(0, 120))}`;
      continue;
    }
    merged.push({ ...message, index: merged.length });
  }
  return merged.map((message, index) => ({ ...message, index }));
}

function isViableQwenDisplayText(text) {
  const value = cleanText(text);
  return Boolean(value && /[\p{L}\p{N}]/u.test(value) && !isQwenSidebarText(value) && !isQwenModelLabelText(value));
}

function isQwenSidebarText(text) {
  const lines = cleanText(text)
    .split("\n")
    .map((line) => normalizeInlineText(line))
    .filter(Boolean);
  const markers = ["我的空间智能体", "对话分组", "新分组", "最近对话", "阿里 AI 助手", "阿里AI助手"];
  const markerCount = lines.filter((line) => markers.includes(line)).length;
  return markerCount >= 2 || (markerCount >= 1 && lines.length > 8);
}

function isQwenChromeLine(line) {
  const value = normalizeInlineText(line);
  return !value ||
    /^(我的空间智能体|对话分组|新分组|最近对话|阿里\s*AI\s*助手)$/.test(value) ||
    isQwenModelLabelText(value) ||
    isQwenReferenceChromeLine(value) ||
    /^(复制|分享|删除|编辑|重新生成|换一换|展开|收起|赞|踩|更多)$/.test(value) ||
    /^内容由\s*AI\s*生成/i.test(value);
}

function isQwenReferenceChromeLine(line) {
  const value = normalizeInlineText(line)
    .replace(/[·|｜/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return /^\d+\s*篇参考来源\s*[>›]?$/.test(value) ||
    /^(参考来源|来源|引用|相关来源|相关网页|相关视频|视频来源|网页来源|搜索结果)$/.test(value) ||
    /^(展开|收起|打开|播放|查看更多|更多来源)$/.test(value) ||
    /^(du\s*){2,}$/i.test(value);
}

function isQwenModelLabelText(text) {
  const value = normalizeInlineText(text)
    .replace(/\s+/g, "")
    .replace(/[：:]+$/g, "");
  return /^(?:Qwen|QwQ|通义千问|千问)(?:[\d.]+)?(?:[-_–—]?(?:Max|Plus|Turbo|Coder|VL|Omni|Thinking|Instruct|Preview|Chat|Math))*$/i.test(value);
}

function isQwenSuggestionText(text) {
  const lines = cleanText(text)
    .split("\n")
    .map((line) => normalizeInlineText(line))
    .filter(Boolean);
  return lines.length >= 2 && lines.length <= 6 && lines.every((line) => {
    return line.length <= 80 && /[?？]\s*$/.test(line);
  });
}

function inferQwenRoleFromText(text) {
  const value = cleanText(text);
  if (isQwenSuggestionText(value) || isQwenSidebarText(value)) {
    return "unknown";
  }
  if (value.length > 120 || /(^|\n)#{1,6}\s+|^\s*[-*+]\s+|^\s*\d+\.\s+|\|.+\||```/m.test(value)) {
    return "assistant";
  }
  if (/[?？]\s*$/.test(value) || /(帮我|请|如何|怎么|为什么|什么|哪些|能否|可否|对比|分析|推荐)/.test(value)) {
    return "user";
  }
  return "assistant";
}

function areQwenDuplicateTexts(first, second) {
  const a = normalizeInlineText(first);
  const b = normalizeInlineText(second);
  if (!a || !b) {
    return false;
  }
  if (a === b) {
    return true;
  }

  const shorter = a.length <= b.length ? a : b;
  const longer = shorter === a ? b : a;
  return shorter.length >= 12 && longer.includes(shorter);
}

function repairKimiMessagesForDisplay(messages) {
  const repaired = [];

  for (const message of messages) {
    const sourceText = stripKimiUiChrome(message.text);
    const splitParts = message.role !== "user"
      ? splitKimiCombinedText(sourceText, { allowPromptAnswer: true })
      : [];
    if (splitParts.length) {
      splitParts.forEach((part, partIndex) => {
        repaired.push({
          ...message,
          id: `${message.id}-${part.role}-${partIndex}`,
          role: part.role,
          text: part.text
        });
      });
      continue;
    }

    const text = stripKimiActionLines(sourceText);
    if (!text) {
      continue;
    }

    repaired.push({
      ...message,
      role: message.role === "unknown" && hasKimiUserActionText(sourceText) ? "user" : message.role,
      text
    });
  }

  return repairFirstKimiMultilinePrompt(repaired);
}

function repairFirstKimiMultilinePrompt(messages) {
  if (messages.length < 3 ||
      messages[0].role !== "assistant" ||
      messages[1].role !== "user" ||
      messages[2].role !== "assistant") {
    return messages;
  }

  const firstUserMessage = {
    ...messages[1],
    id: `${messages[0].id || "kimi-first-prompt"}-${messages[1].id || "continued"}`,
    text: cleanText(`${messages[0].text}\n${messages[1].text}`)
  };
  return [firstUserMessage, ...messages.slice(2)]
    .map((message, index) => ({ ...message, index }));
}

function repairDoubaoMessagesForDisplay(messages) {
  const repaired = [];

  for (const message of messages) {
    const splitParts = message.role !== "user" ? splitDoubaoTranscriptText(message.text) : [];
    if (splitParts.length) {
      splitParts.forEach((part, partIndex) => {
        repaired.push({
          ...message,
          id: `${message.id}-${part.role}-${partIndex}`,
          role: part.role,
          text: part.text
        });
      });
      continue;
    }

    const text = stripDoubaoChromeLines(message.text);
    if (!text) {
      continue;
    }

    repaired.push({
      ...message,
      text
    });
  }

  return repaired;
}

function splitDoubaoTranscriptText(text) {
  const value = cleanText(text);
  const warning = findDoubaoWarning(value);
  if (!warning) {
    return [];
  }

  const body = stripDoubaoChromeLines(value.slice(warning.index + warning.text.length));
  const lines = body
    .split("\n")
    .map((line) => cleanText(line))
    .filter(Boolean);
  if (lines.length < 2) {
    return [];
  }

  const assistantStart = lines.findIndex((line) => isDoubaoAssistantDividerLine(line));
  if (assistantStart <= 0 || assistantStart >= lines.length - 1) {
    return [];
  }

  const userText = cleanText(lines.slice(0, assistantStart).join("\n"));
  const assistantText = cleanText(lines.slice(assistantStart + 1).join("\n"));
  if (!userText || !assistantText) {
    return [];
  }

  return [
    { role: "user", text: userText },
    { role: "assistant", text: assistantText }
  ];
}

function extractDoubaoTitleFromMessages(rawMessages) {
  for (const message of rawMessages || []) {
    const title = extractDoubaoTitleFromText(message?.text || message?.content || "");
    if (title) {
      return title;
    }
  }
  return "";
}

function extractDoubaoTitleFromText(text) {
  const value = cleanText(text);
  const warning = findDoubaoWarning(value);
  if (!warning || warning.index <= 0) {
    return "";
  }

  const lines = value.slice(0, warning.index)
    .split("\n")
    .map((line) => normalizeInlineText(line))
    .filter((line) => line && !isDoubaoChromeLine(line));
  return lines.length ? lines[lines.length - 1].slice(0, 120) : "";
}

function findDoubaoWarning(text) {
  const match = String(text || "").match(/AI\s*生成可能有误\s*注意核实/);
  return match ? { index: match.index, text: match[0] } : null;
}

function stripDoubaoChromeLines(text) {
  const filtered = String(text || "")
    .replace(/\r/g, "")
    .split("\n")
    .filter((line) => !isDoubaoChromeLine(line))
    .join("\n");
  return stripDoubaoTrailingUiChrome(filtered);
}

function stripDoubaoTrailingUiChrome(text) {
  const lines = String(text || "").replace(/\r/g, "").split("\n");
  let end = lines.length;
  while (end > 0 && !lines[end - 1].trim()) {
    end -= 1;
  }
  if (!end) {
    return "";
  }

  const scanStart = Math.max(0, end - 60);
  const tail = lines.slice(scanStart, end);
  const markers = tail
    .map((line, index) => isDoubaoTrailingUiLine(line) ? scanStart + index : -1)
    .filter((index) => index >= 0);
  const modeMarkers = tail
    .map((line, index) => isDoubaoModeUiLine(line) ? scanStart + index : -1)
    .filter((index) => index >= 0);
  const strongMarkers = tail
    .map((line, index) => isStrongDoubaoTrailingUiLine(line) ? scanStart + index : -1)
    .filter((index) => index >= 0);

  let cutAt = -1;
  if (modeMarkers.length >= 6 || (modeMarkers.length >= 4 && strongMarkers.length)) {
    cutAt = modeMarkers[0];
  } else if (strongMarkers.length && markers.length >= 2) {
    cutAt = markers[0];
  }
  if (cutAt < 0) {
    return cleanText(lines.join("\n"));
  }

  while (cutAt > 0 && !lines[cutAt - 1].trim()) {
    cutAt -= 1;
  }
  return cleanText(lines.slice(0, cutAt).join("\n"));
}

function isDoubaoModeUiLine(line) {
  const value = normalizeInlineText(line);
  return /^(快速|PPT\s*生成|图像生成|帮我写作|音乐生成|翻译|视频生成|录音转写)$/i.test(value);
}

function isStrongDoubaoTrailingUiLine(line) {
  const value = normalizeInlineText(line);
  return /^在此处拖放文件\s*文件数量[：:]?\s*最多\s*\d+\s*个.*文件类型[：:]/.test(value) ||
    /^Timeline(?:$|关于|[\s:：])/i.test(value) ||
    /^v\d+(?:\.\d+){1,3}$/i.test(value) ||
    /^(Panel|闪记|保存到文件夹)$/i.test(value) ||
    /^[✓✔]?\s*已复制$/i.test(value);
}

function isDoubaoTrailingUiLine(line) {
  const value = normalizeInlineText(line);
  return isDoubaoModeUiLine(value) ||
    isStrongDoubaoTrailingUiLine(value) ||
    /^追问$/.test(value);
}

function isDoubaoChromeLine(line) {
  const value = normalizeInlineText(line);
  return !value ||
    /^AI\s*生成可能有误\s*注意核实$/.test(value) ||
    /^参考\s*\d+\s*篇(?:资料|来源|网页|文献)\s*[>›]?$/.test(value) ||
    /^(重新生成|复制|分享|删除|编辑|赞|踩|更多)$/.test(value);
}

function isDoubaoAssistantDividerLine(line) {
  const value = normalizeInlineText(line);
  return /^已完成(?:深度)?思考(?:\s*[（(][^）)]{0,40}[）)])?\s*$/i.test(value) ||
    /^搜索\s*\d+\s*个关键词(?:\s*[，,]?\s*参考\s*\d+\s*篇(?:资料|来源|网页|文献))?\s*[>›]?$/.test(value) ||
    /^已完成[^，,。.!?]{0,30}生成\s*[（(]\s*\d+\s*(?:h|小时|m|min|分钟|分)?\s*\d*\s*(?:s|秒)?\s*[）)]\s*$/i.test(value) ||
    /^已完成\s*[，,]\s*参考.{0,24}篇参考\s*$/.test(value) ||
    /^已完成\s*[，,]\s*.{0,36}(参考|资料|网页|文献)\s*$/.test(value);
}

function splitKimiCombinedText(text, options = {}) {
  const lines = String(text || "").replace(/\r/g, "").split("\n");
  const markerIndexes = lines
    .map((line, index) => isKimiUserActionLine(line) ? index : -1)
    .filter((index) => index >= 0);

  if (markerIndexes.length) {
    return splitKimiByActionMarkers(lines, markerIndexes);
  }

  if (options.allowPromptAnswer) {
    return splitKimiPromptAnswerText(text);
  }

  return [];
}

function splitKimiByActionMarkers(lines, markerIndexes) {
  const parts = [];
  let start = 0;

  for (const markerIndex of markerIndexes) {
    const segment = cleanText(lines.slice(start, markerIndex).join("\n"));
    if (start === 0 && parts.length === 0) {
      addKimiPart(parts, "user", segment);
    } else {
      const split = splitKimiSegmentBeforeAction(segment);
      addKimiPart(parts, "assistant", split.assistant);
      addKimiPart(parts, "user", split.user);
    }
    start = markerIndex + 1;
  }

  addKimiPart(parts, "assistant", lines.slice(start).filter((line) => !isKimiUserActionLine(line)).join("\n"));
  return parts;
}

function splitKimiSegmentBeforeAction(segment) {
  const normalized = cleanText(segment);
  const lines = normalized
    .split("\n")
    .map((line) => cleanText(line))
    .filter(Boolean);
  const blocks = normalized
    .split(/\n{2,}/)
    .map((block) => cleanText(block))
    .filter(Boolean);
  if (!blocks.length) {
    return { assistant: "", user: "" };
  }

  let user = blocks[blocks.length - 1];
  let assistant = blocks.slice(0, -1).join("\n\n");
  if (blocks.length === 1 && lines.length > 1) {
    user = lines[lines.length - 1];
    assistant = lines.slice(0, -1).join("\n");
  } else if (!looksLikeKimiPromptBeforeControls(user) && lines.length > 1) {
    user = lines[lines.length - 1];
    assistant = lines.slice(0, -1).join("\n");
  }

  if (!looksLikeKimiPromptBeforeControls(user)) {
    return { assistant: segment, user: "" };
  }

  return { assistant, user };
}

function addKimiPart(parts, role, text) {
  const value = cleanText(stripKimiUiChrome(text));
  if (value) {
    parts.push({ role, text: value });
  }
}

function stripKimiUiChrome(text) {
  const lines = String(text || "").replace(/\r/g, "").split("\n");
  let end = lines.length;
  while (end > 0 && !lines[end - 1].trim()) {
    end -= 1;
  }
  if (!end) {
    return "";
  }

  const scanStart = Math.max(0, end - 30);
  const tail = lines.slice(scanStart, end);
  const markers = tail
    .map((line, index) => isKimiUiChromeLine(line) ? scanStart + index : -1)
    .filter((index) => index >= 0);
  const hasStrongMarker = tail.some((line) => isStrongKimiUiChromeLine(line));
  if (!markers.length || (!hasStrongMarker && markers.length < 2)) {
    return cleanText(lines.join("\n"));
  }

  let cutAt = markers[0];
  while (cutAt > 0 && !lines[cutAt - 1].trim()) {
    cutAt -= 1;
  }
  return cleanText(lines.slice(0, cutAt).join("\n"));
}

function isStrongKimiUiChromeLine(line) {
  const value = normalizeInlineText(line);
  return /^(保存到文件夹|闪记|Panel|Timeline)$/i.test(value) ||
    /^K\d+(?:\.\d+)*\s*\S*$/i.test(value) ||
    /^v\d+(?:\.\d+){1,3}$/i.test(value) ||
    /^复制\s*LaTeX\s*公式/i.test(value);
}

function isKimiUiChromeLine(line) {
  const value = normalizeInlineText(line);
  if (!value) {
    return false;
  }

  return /^K\d+(?:\.\d+)*\s*\S*$/i.test(value) ||
    /^Timeline$/i.test(value) ||
    /^v\d+(?:\.\d+){1,3}$/i.test(value) ||
    /^Panel$/i.test(value) ||
    /^闪记$/.test(value) ||
    /^保存到文件夹$/.test(value) ||
    /^复制\s*LaTeX\s*公式.*$/i.test(value) ||
    /^✓?\s*已复制$/.test(value) ||
    /^复制成功$/.test(value);
}

function looksLikeKimiPromptBeforeControls(prompt) {
  const value = normalizeInlineText(prompt);
  if (!value || value.length > 1200) {
    return false;
  }

  return !/```|^\s*#{1,6}\s+|\|.+\|\n\|/m.test(prompt);
}

function splitKimiPromptAnswerText(text) {
  const blocks = cleanText(text)
    .split(/\n{2,}/)
    .map((block) => cleanText(block))
    .filter(Boolean);
  if (blocks.length < 2) {
    return [];
  }

  const prompt = blocks[0];
  const answer = blocks.slice(1).join("\n\n");
  if (!looksLikeKimiQuestionPrompt(prompt, answer)) {
    return [];
  }

  return [
    { role: "user", text: prompt },
    { role: "assistant", text: answer }
  ];
}

function looksLikeKimiQuestionPrompt(prompt, answer) {
  const value = normalizeInlineText(prompt);
  if (!value || value.length > 120 || normalizeInlineText(answer).length < 8) {
    return false;
  }

  if (/```|^\s*#{1,6}\s+|^\s*[-*+]\s+|^\s*\d+\.\s+|\|.+\|/m.test(prompt)) {
    return false;
  }

  return /[?？]\s*$/.test(value) ||
    /(吗|么|呢|是否|是不是|有没有|能不能|会不会|为什么|为何|怎么|咋|如何|多少|哪个|哪些|什么|可否|能否)/.test(value);
}

function stripKimiActionLines(text) {
  return cleanText(String(text || "")
    .replace(/\r/g, "")
    .split("\n")
    .filter((line) => !isKimiUserActionLine(line))
    .join("\n"));
}

function hasKimiUserActionText(text) {
  const lines = String(text || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => normalizeInlineText(line))
    .filter(Boolean);
  const tail = lines.slice(-3).join(" ");
  return /(^|\s)(编辑|Edit)(\s|$)/i.test(tail) &&
    /(^|\s)(复制|Copy)(\s|$)/i.test(tail) &&
    /(^|\s)(分享|Share)(\s|$)/i.test(tail);
}

function isKimiUserActionLine(line) {
  const value = normalizeInlineText(line);
  return /(^|\s)(编辑|Edit)(\s|$)/i.test(value) &&
    /(^|\s)(复制|Copy)(\s|$)/i.test(value) &&
    /(^|\s)(分享|Share)(\s|$)/i.test(value) &&
    isMessageControlLine(value);
}

function isMessageControlLine(line) {
  const value = normalizeInlineText(line);
  if (!value) {
    return false;
  }

  const labels = [
    "编辑",
    "复制",
    "分享",
    "删除",
    "重试",
    "重新生成",
    "赞",
    "踩",
    "更多",
    "Edit",
    "Copy",
    "Share",
    "Delete",
    "Retry",
    "Regenerate",
    "More"
  ];

  const pattern = new RegExp(`^(?:${labels.join("|")})(?:\\s+(?:${labels.join("|")}))*$`, "i");
  return pattern.test(value);
}

function render() {
  const conversations = getCombinedConversations();
  const filtered = filterConversations(conversations);
  const selected = getSelectedConversation(filtered, conversations);
  const totalMessages = conversations.reduce((sum, item) => sum + Number(item.messageCount || 0), 0);

  elements.conversationCount.textContent = String(conversations.length);
  elements.messageCount.textContent = String(totalMessages);
  elements.statusText.textContent = buildStatusText(conversations);
  elements.exportButton.disabled = !conversations.length;
  elements.clearWorkspaceButton.disabled = !conversations.length;
  elements.folderList.replaceChildren(...renderFolderButtons(conversations));
  elements.conversationList.replaceChildren(...renderConversationList(filtered));

  renderSelectedConversation(selected);
}

function getCombinedConversations() {
  return [...state.localConversations, ...state.externalConversations]
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

function filterConversations(conversations) {
  return conversations.filter((conversation) => {
    if (state.selectedFolder !== "all" && conversation.folderId !== state.selectedFolder) {
      return false;
    }

    if (!state.query) {
      return true;
    }

    return [
      conversation.title,
      conversation.folderLabel,
      conversation.platformLabel,
      conversation.sourceLabel,
      conversation.externalPath,
      conversation.sourceHost,
      conversation.sourceUrl,
      ...getMessageSearchText(conversation)
    ].filter(Boolean).some((value) => String(value).toLowerCase().includes(state.query));
  });
}

function getMessageSearchText(conversation) {
  return Array.isArray(conversation?.messages)
    ? conversation.messages.map((message) => message.text || message.content || "")
    : [];
}

function getSelectedConversation(filtered, all) {
  if (state.pendingConversationId) {
    const requested = all.find((conversation) => {
      return conversation.id === state.pendingConversationId ||
        conversation.originalId === state.pendingConversationId ||
        conversation.viewerId === state.pendingConversationId;
    });
    if (requested) {
      state.selectedKey = requested.viewerId;
      state.selectedFolder = "all";
      state.pendingConversationId = "";
      if (!filtered.some((conversation) => conversation.viewerId === requested.viewerId)) {
        filtered = all;
      }
    }
  }

  let selected = filtered.find((conversation) => conversation.viewerId === state.selectedKey);
  if (!selected) {
    selected = filtered[0] || null;
    state.selectedKey = selected?.viewerId || "";
  }

  return selected;
}

function renderFolderButtons(conversations) {
  const groups = groupByFolder(conversations);
  return groups.map(renderFolderButton);
}

function renderFolderButton(folder) {
  const li = document.createElement("li");
  const button = document.createElement("button");
  button.type = "button";
  button.className = `folder-button platform-${folder.id}`;
  if (folder.id === state.selectedFolder) {
    button.classList.add("is-selected");
  }

  const label = localizePlatformName(folder.id, folder.label);
  const platform = PREFS.platformByKey?.(folder.id) || PREFS.platformByKey?.(folder.label);
  const icon = platform ? createPlatformIcon(platform) : createFolderFallbackIcon(label);
  icon.classList.add("folder-platform-icon");
  button.title = label;
  button.setAttribute("aria-label", label);

  button.append(icon);
  button.addEventListener("click", () => {
    state.selectedFolder = state.selectedFolder === folder.id ? "all" : folder.id;
    state.selectedKey = "";
    render();
  });
  li.append(button);
  return li;
}

function createFolderFallbackIcon(label) {
  const icon = document.createElement("span");
  icon.className = "platform-icon";
  icon.textContent = String(label || "AI").trim().slice(0, 2);
  return icon;
}

function renderConversationList(conversations) {
  const groups = groupByFolder(conversations);
  const nodes = [];

  for (const group of groups) {
    const divider = document.createElement("li");
    divider.className = "folder-divider";
    divider.textContent = localizePlatformName(group.id, group.label);
    nodes.push(divider);
    nodes.push(...group.items.map(renderConversationItem));
  }

  return nodes;
}

function renderConversationItem(conversation) {
  const li = document.createElement("li");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "conversation-item";
  if (conversation.viewerId === state.selectedKey) {
    button.classList.add("is-selected");
  }

  const textWrap = document.createElement("span");
  textWrap.className = "conversation-copy";
  const title = document.createElement("span");
  title.className = "conversation-title";
  title.textContent = conversation.title;

  const meta = document.createElement("span");
  meta.className = "conversation-meta";
  meta.textContent = [
    formatDate(conversation.updatedAt),
    conversation.sourceType === "folder" ? conversation.externalPath : conversation.sourceHost || tr("browserStorage")
  ].filter(Boolean).join(" - ");

  const chip = document.createElement("span");
  chip.className = `source-chip ${conversation.sourceType}`;
  chip.textContent = conversation.sourceType === "folder" ? tr("folder") : tr("browserStorage");

  textWrap.append(title, meta);
  button.append(textWrap, chip);
  button.addEventListener("click", () => {
    state.selectedKey = conversation.viewerId;
    render();
  });
  li.append(button);
  return li;
}

function renderSelectedConversation(conversation) {
  const hasSelection = Boolean(conversation);
  elements.emptyState.hidden = hasSelection;
  elements.messageList.hidden = !hasSelection;
  elements.userProgress.hidden = !hasSelection;
  elements.openSourceButton.disabled = !conversation?.sourceUrl;
  elements.exportMarkdownButton.disabled = !hasSelection;
  elements.exportJsonButton.disabled = !hasSelection;
  elements.exportHtmlButton.disabled = !hasSelection;
  elements.deleteConversationButton.disabled = !hasSelection || conversation?.sourceType !== "browser";
  elements.deleteConversationButton.hidden = hasSelection && conversation?.sourceType !== "browser";

  if (!conversation) {
    elements.sourceBadge.className = "source-badge";
    elements.sourceBadge.textContent = tr("noSource");
    elements.folderBadge.textContent = tr("noFolder");
    elements.conversationTitle.textContent = tr("selectBackup");
    elements.conversationMeta.textContent = tr("selectBackupHint");
    elements.messageList.replaceChildren();
    elements.userProgress.replaceChildren();
    return;
  }

  elements.sourceBadge.className = `source-badge ${conversation.sourceType}`;
  elements.sourceBadge.textContent = conversation.sourceType === "folder"
    ? tr("sourceFolder", { name: conversation.sourceLabel })
    : tr("browserStorage");
  elements.folderBadge.textContent = localizePlatformName(conversation.folderId || conversation.platform, conversation.folderLabel);
  elements.conversationTitle.textContent = conversation.title;
  elements.conversationMeta.textContent = buildConversationMeta(conversation);
  latexMacros = {};
  elements.messageList.replaceChildren(...conversation.messages.map(renderMessage));
  elements.userProgress.replaceChildren(...renderUserProgress(conversation.messages));
  window.setTimeout(updateUserProgressActive, 0);
}

function renderMessage(message) {
  const article = document.createElement("article");
  article.className = `message ${message.role}`;
  article.id = getMessageAnchorId(message);
  article.dataset.role = message.role || "unknown";

  const role = document.createElement("div");
  role.className = "role-label";
  role.textContent = getRoleLabel(message.role);

  if (message.role === "thinking") {
    const thinking = createThinkingBlock(message.text);
    thinking.classList.add("message-body", "thinking-message-body");
    renderLatexInElement(thinking);
    article.append(role, thinking);
    return article;
  }

  const body = document.createElement("div");
  body.className = "message-body";
  body.append(...renderMessageSegments(message.text));
  renderLatexInElement(body);

  article.append(role, body);
  return article;
}

function renderMessageSegments(text) {
  return splitThinkingSegments(text).flatMap((segment) => {
    if (segment.type === "thinking") {
      return [createThinkingBlock(segment.text)];
    }
    return renderMessageText(segment.text);
  });
}

function renderMessageText(text) {
  const lines = String(text || "").replace(/\r/g, "").split("\n");
  const nodes = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fence = line.match(/^```([a-zA-Z0-9_+.-]*)?\s*$/);
    if (fence) {
      const parsed = consumeCodeBlock(lines, index, fence[1] || "");
      nodes.push(createCodeBlock(parsed.code, parsed.language));
      index = parsed.nextIndex;
      continue;
    }

    const displayMath = consumeDisplayMath(lines, index);
    if (displayMath) {
      nodes.push(createLatexBlock(displayMath.tex, displayMath.raw));
      index = displayMath.nextIndex;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      nodes.push(createHeadingBlock(heading[1].length, heading[2]));
      index += 1;
      continue;
    }

    if (isTableStart(lines, index)) {
      const parsed = consumeTable(lines, index);
      nodes.push(createTableBlock(parsed.headers, parsed.rows));
      index = parsed.nextIndex;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const parsed = consumeQuote(lines, index);
      nodes.push(createQuoteBlock(parsed.lines));
      index = parsed.nextIndex;
      continue;
    }

    if (isListLine(line)) {
      const parsed = consumeList(lines, index);
      nodes.push(createListBlock(parsed.items, parsed.ordered));
      index = parsed.nextIndex;
      continue;
    }

    const parsed = consumeParagraph(lines, index);
    nodes.push(createParagraphBlock(parsed.lines));
    index = parsed.nextIndex;
  }

  return nodes.length ? nodes : [createParagraphBlock([""])];
}

function splitThinkingSegments(text) {
  const source = String(text || "");
  const tagPattern = /<think(?:ing)?>([\s\S]*?)<\/think(?:ing)?>/gi;
  const segments = [];
  let lastIndex = 0;
  let match;

  while ((match = tagPattern.exec(source)) !== null) {
    const before = source.slice(lastIndex, match.index);
    if (before.trim()) {
      segments.push({ type: "text", text: before.trim() });
    }
    if (match[1]?.trim()) {
      segments.push({ type: "thinking", text: match[1].trim() });
    }
    lastIndex = match.index + match[0].length;
  }

  const after = source.slice(lastIndex);
  if (segments.length) {
    if (after.trim()) {
      segments.push({ type: "text", text: after.trim() });
    }
    return segments;
  }

  const labelled = splitLabelledThinking(source);
  return labelled || [{ type: "text", text: source }];
}

function splitLabelledThinking(text) {
  const pattern = /^(?:#{1,6}\s*)?(思考过程|思考|推理过程|Thinking|Reasoning)\s*[:：]\s*\n([\s\S]*?)(?=\n{2,}(?:#{1,6}\s*)?(回答|最终答案|答案|Answer|Final)\s*[:：]?|\n{3,}|$)/i;
  const match = String(text || "").match(pattern);
  if (!match || !match[2]?.trim()) {
    return null;
  }

  const before = text.slice(0, match.index).trim();
  const thinking = match[2].trim();
  const after = text.slice(match.index + match[0].length)
    .replace(/^\s*(?:#{1,6}\s*)?(回答|最终答案|答案|Answer|Final)\s*[:：]?\s*/i, "")
    .trim();

  return [
    before ? { type: "text", text: before } : null,
    { type: "thinking", text: thinking },
    after ? { type: "text", text: after } : null
  ].filter(Boolean);
}

function createThinkingBlock(text) {
  const details = document.createElement("details");
  details.className = "thinking-block";

  const summary = document.createElement("summary");
  summary.textContent = tr("thinking");

  const body = document.createElement("div");
  body.className = "thinking-body";
  body.append(...renderMessageText(text));

  details.append(summary, body);
  return details;
}

function renderUserProgress(messages) {
  const userMessages = messages
    .filter((message) => message.role === "user")
    .map((message, index) => ({ message, index }));

  if (!userMessages.length) {
    return [];
  }

  const rail = document.createElement("div");
  rail.className = "user-progress-rail";

  const list = document.createElement("ol");
  list.className = "user-progress-list";

  userMessages.forEach(({ message, index }) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "user-progress-dot";
    button.dataset.target = getMessageAnchorId(message);
    button.title = trimToLength(cleanProgressTitle(message.text), 90);
    button.setAttribute("aria-label", tr("questionAria", { index: index + 1, title: button.title }));

    const number = document.createElement("span");
    number.className = "user-progress-number";
    number.textContent = String(index + 1);

    const preview = document.createElement("span");
    preview.className = "user-progress-preview";
    preview.textContent = trimToLength(cleanProgressTitle(message.text), 240);

    button.append(number, preview);
    button.addEventListener("click", () => {
      const target = document.getElementById(button.dataset.target || "");
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    item.append(button);
    list.append(item);
  });

  rail.append(list);
  return [rail];
}

function updateUserProgressActive() {
  const buttons = Array.from(elements.userProgress.querySelectorAll(".user-progress-dot"));
  if (!buttons.length || elements.messageList.hidden) {
    return;
  }

  const containerTop = elements.messageList.getBoundingClientRect().top;
  let activeButton = buttons[0];
  let bestDistance = Number.POSITIVE_INFINITY;

  buttons.forEach((button) => {
    const target = document.getElementById(button.dataset.target || "");
    if (!target) {
      return;
    }

    const distance = Math.abs(target.getBoundingClientRect().top - containerTop - 24);
    if (distance < bestDistance) {
      bestDistance = distance;
      activeButton = button;
    }
  });

  buttons.forEach((button) => {
    button.classList.toggle("is-active", button === activeButton);
  });
}

function getMessageAnchorId(message) {
  const base = `${message.role || "message"}-${Number.isFinite(message.index) ? message.index : 0}-${hashString(message.id || message.text || "")}`;
  return `msg-${base.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

function cleanProgressTitle(text) {
  return normalizeCitationArtifacts(String(text || ""))
    .replace(/```[\s\S]*?```/g, " code ")
    .replace(/\s+/g, " ")
    .trim() || tr("untitledQuestion");
}

function consumeCodeBlock(lines, startIndex, language) {
  const codeLines = [];
  let index = startIndex + 1;
  while (index < lines.length && !/^```\s*$/.test(lines[index])) {
    codeLines.push(lines[index]);
    index += 1;
  }

  return {
    language,
    code: codeLines.join("\n"),
    nextIndex: index < lines.length ? index + 1 : index
  };
}

function consumeTable(lines, startIndex) {
  const headers = splitTableLine(lines[startIndex]);
  const rows = [];
  let index = startIndex + 2;

  while (index < lines.length && isTableRow(lines[index])) {
    rows.push(splitTableLine(lines[index]));
    index += 1;
  }

  return { headers, rows, nextIndex: index };
}

function consumeQuote(lines, startIndex) {
  const quoteLines = [];
  let index = startIndex;
  while (index < lines.length && /^>\s?/.test(lines[index])) {
    quoteLines.push(lines[index].replace(/^>\s?/, ""));
    index += 1;
  }

  return { lines: quoteLines, nextIndex: index };
}

function consumeList(lines, startIndex) {
  const ordered = /^\s*\d+\.\s+/.test(lines[startIndex]);
  const items = [];
  let index = startIndex;

  while (index < lines.length && isListLine(lines[index]) && (/^\s*\d+\.\s+/.test(lines[index]) === ordered)) {
    items.push(lines[index].replace(/^\s*(?:[-*+]|\d+\.)\s+/, ""));
    index += 1;
  }

  return { items, ordered, nextIndex: index };
}

function consumeParagraph(lines, startIndex) {
  const paragraphLines = [];
  let index = startIndex;

  while (index < lines.length && lines[index].trim() && !isSpecialMarkdownLine(lines, index)) {
    paragraphLines.push(lines[index]);
    index += 1;
  }

  return { lines: paragraphLines, nextIndex: index };
}

function createHeadingBlock(level, text) {
  const tagName = `h${Math.min(6, Math.max(3, level + 2))}`;
  const heading = document.createElement(tagName);
  heading.className = "markdown-heading";
  appendInlineMarkdown(heading, text);
  return heading;
}

function createParagraphBlock(lines) {
  const block = document.createElement("p");
  block.className = "markdown-paragraph";
  appendInlineMarkdown(block, lines.join("\n"));
  return block;
}

function createCodeBlock(code, language) {
  const wrapper = document.createElement("pre");
  wrapper.className = "code-block";

  const toolbar = document.createElement("div");
  toolbar.className = "code-toolbar";

  if (language) {
    const label = document.createElement("div");
    label.className = "code-language";
    label.textContent = language;
    toolbar.append(label);
  } else {
    const spacer = document.createElement("span");
    spacer.className = "code-language";
    spacer.textContent = tr("code");
    toolbar.append(spacer);
  }

  const copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.className = "copy-code-button";
  copyButton.textContent = tr("copy");
  copyButton.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    await copyTextToClipboard(code);
    copyButton.textContent = tr("copied");
    window.setTimeout(() => {
      copyButton.textContent = tr("copy");
    }, 1200);
  });

  toolbar.append(copyButton);

  const codeNode = document.createElement("code");
  codeNode.textContent = code;
  wrapper.append(toolbar, codeNode);
  return wrapper;
}

function consumeDisplayMath(lines, startIndex) {
  const firstLine = String(lines[startIndex] || "");
  const trimmed = firstLine.trim();
  const delimiter = trimmed.startsWith("$$")
    ? { left: "$$", right: "$$" }
    : trimmed.startsWith("\\[")
      ? { left: "\\[", right: "\\]" }
      : null;

  if (delimiter) {
    const afterOpen = trimmed.slice(delimiter.left.length);
    const sameLineEnd = afterOpen.indexOf(delimiter.right);
    if (sameLineEnd >= 0) {
      const trailing = afterOpen.slice(sameLineEnd + delimiter.right.length).trim();
      if (!trailing) {
        return {
          tex: afterOpen.slice(0, sameLineEnd).trim(),
          raw: trimmed,
          nextIndex: startIndex + 1
        };
      }
    }

    const body = afterOpen ? [afterOpen] : [];
    for (let index = startIndex + 1; index < lines.length; index += 1) {
      const current = String(lines[index] || "");
      const endIndex = current.indexOf(delimiter.right);
      if (endIndex >= 0 && !current.slice(endIndex + delimiter.right.length).trim()) {
        body.push(current.slice(0, endIndex));
        return {
          tex: body.join("\n").trim(),
          raw: lines.slice(startIndex, index + 1).join("\n"),
          nextIndex: index + 1
        };
      }
      body.push(current);
    }
    return null;
  }

  const environment = trimmed.match(/^\\begin\{(equation\*?|align\*?|alignat\*?|gather\*?|multline\*?|CD)\}/);
  if (!environment) {
    return null;
  }

  const endPattern = new RegExp(`\\\\end\\{${escapeRegExp(environment[1])}\\}`);
  for (let index = startIndex; index < lines.length; index += 1) {
    if (endPattern.test(lines[index])) {
      const raw = lines.slice(startIndex, index + 1).join("\n");
      return { tex: raw.trim(), raw, nextIndex: index + 1 };
    }
  }
  return null;
}

function createLatexBlock(tex, raw) {
  const block = document.createElement("div");
  block.className = "latex-block";
  if (!renderKatex(tex, block, true)) {
    block.classList.add("latex-fallback");
    block.textContent = raw;
  }
  return block;
}

function renderLatexInElement(element) {
  if (!element || typeof window.renderMathInElement !== "function") {
    return;
  }

  try {
    window.renderMathInElement(element, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "\\(", right: "\\)", display: false },
        { left: "\\[", right: "\\]", display: true },
        { left: "\\begin{equation}", right: "\\end{equation}", display: true },
        { left: "\\begin{equation*}", right: "\\end{equation*}", display: true },
        { left: "\\begin{align}", right: "\\end{align}", display: true },
        { left: "\\begin{align*}", right: "\\end{align*}", display: true },
        { left: "\\begin{gather}", right: "\\end{gather}", display: true },
        { left: "\\begin{gather*}", right: "\\end{gather*}", display: true }
      ],
      ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code", "option"],
      ignoredClasses: ["katex", "code-block", "inline-code", "latex-fallback"],
      macros: latexMacros,
      strict: "ignore",
      trust: false,
      throwOnError: false,
      errorCallback: () => {}
    });
  } catch {
    // Invalid or unsupported formulas remain as source text.
  }

  renderSingleDollarMath(element);
}

function renderSingleDollarMath(root) {
  if (!root || !window.katex) {
    return;
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return node.parentElement?.closest(".katex, pre, code, .code-block, .inline-code, .latex-fallback")
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT;
    }
  });
  const textNodes = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }

  const pattern = /(?<!\\)\$(?!\$)([^$\n]+?)(?<!\\)\$(?!\$)/g;
  for (const textNode of textNodes) {
    const source = textNode.nodeValue || "";
    const matches = Array.from(source.matchAll(pattern));
    if (!matches.some((match) => isLikelyInlineLatex(match[1]))) {
      continue;
    }

    const fragment = document.createDocumentFragment();
    let cursor = 0;
    for (const match of matches) {
      const start = match.index || 0;
      fragment.append(document.createTextNode(source.slice(cursor, start)));
      if (isLikelyInlineLatex(match[1])) {
        const formula = document.createElement("span");
        formula.className = "latex-inline";
        if (renderKatex(match[1].trim(), formula, false)) {
          fragment.append(formula);
        } else {
          fragment.append(document.createTextNode(match[0]));
        }
      } else {
        fragment.append(document.createTextNode(match[0]));
      }
      cursor = start + match[0].length;
    }
    fragment.append(document.createTextNode(source.slice(cursor)));
    textNode.replaceWith(fragment);
  }
}

function isLikelyInlineLatex(value) {
  const tex = String(value || "").trim();
  if (!tex || /^\d+(?:[.,]\d+)?(?:\s*(?:usd|cny|rmb|eur|gbp))?$/i.test(tex)) {
    return false;
  }
  if (/\\[a-zA-Z]+|[_^{}]|[=<>≈≠≤≥±×÷]|(?:^|\s)[+*/](?:\s|$)/.test(tex)) {
    return true;
  }
  return /^[a-zA-Z]{1,3}\d?$/.test(tex);
}

function renderKatex(tex, target, displayMode) {
  if (!window.katex || !String(tex || "").trim()) {
    return false;
  }
  try {
    window.katex.render(tex, target, {
      displayMode,
      macros: latexMacros,
      output: "htmlAndMathml",
      strict: "ignore",
      trust: false,
      throwOnError: true
    });
    return true;
  } catch {
    return false;
  }
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createTableBlock(headers, rows) {
  const wrapper = document.createElement("div");
  wrapper.className = "table-scroll";

  const table = document.createElement("table");
  table.className = "markdown-table";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  headers.forEach((header) => {
    const th = document.createElement("th");
    appendInlineMarkdown(th, header);
    headerRow.append(th);
  });
  thead.append(headerRow);

  const tbody = document.createElement("tbody");
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    headers.forEach((_, cellIndex) => {
      const td = document.createElement("td");
      appendInlineMarkdown(td, row[cellIndex] || "");
      tr.append(td);
    });
    tbody.append(tr);
  });

  table.append(thead, tbody);
  wrapper.append(table);
  return wrapper;
}

function createQuoteBlock(lines) {
  const quote = document.createElement("blockquote");
  quote.className = "quote-block";
  appendInlineMarkdown(quote, lines.join("\n"));
  return quote;
}

function createListBlock(items, ordered) {
  const list = document.createElement(ordered ? "ol" : "ul");
  list.className = "markdown-list";
  items.forEach((item) => {
    const li = document.createElement("li");
    appendInlineMarkdown(li, item);
    list.append(li);
  });
  return list;
}

function appendInlineMarkdown(parent, value) {
  const text = normalizeCitationArtifacts(String(value || ""));
  const tokenPattern = /(`([^`]+)`|\*\*([^*]+)\*\*|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\))/g;
  let lastIndex = 0;
  let match;

  while ((match = tokenPattern.exec(text)) !== null) {
    appendTextWithLineBreaks(parent, text.slice(lastIndex, match.index));

    if (match[2]) {
      const code = document.createElement("code");
      code.className = "inline-code";
      code.textContent = match[2];
      parent.append(code);
    } else if (match[3]) {
      const strong = document.createElement("strong");
      strong.textContent = match[3];
      parent.append(strong);
    } else if (match[4] && match[5]) {
      const link = document.createElement("a");
      link.href = match[5];
      link.textContent = match[4];
      link.target = "_blank";
      link.rel = "noreferrer";
      parent.append(link);
    }

    lastIndex = match.index + match[0].length;
  }

  appendTextWithLineBreaks(parent, text.slice(lastIndex));
}

function appendTextWithLineBreaks(parent, text) {
  const parts = String(text || "").split("\n");
  parts.forEach((part, index) => {
    if (index > 0) {
      parent.append(document.createElement("br"));
    }
    if (part) {
      parent.append(document.createTextNode(part));
    }
  });
}

function normalizeCitationArtifacts(text) {
  return String(text || "")
    .replace(/\uE200cite\uE202[^\uE201]{1,200}\uE201/g, " [citation] ")
    .replace(/\uE200[^\uE201]{0,200}\uE201/g, (match) => {
      return /cite|turn\d|source|ref/i.test(match) ? " [citation] " : match;
    })
    .replace(/【\s*†[^】]{1,80}】/g, " [citation] ");
}

function isSpecialMarkdownLine(lines, index) {
  const line = lines[index];
  return /^```/.test(line) ||
    Boolean(consumeDisplayMath(lines, index)) ||
    /^(#{1,6})\s+/.test(line) ||
    isTableStart(lines, index) ||
    /^>\s?/.test(line) ||
    isListLine(line);
}

function isTableStart(lines, index) {
  return isTableRow(lines[index]) && isTableSeparator(lines[index + 1] || "");
}

function isTableRow(line) {
  const value = String(line || "").trim();
  return value.includes("|") && /^\|?.+\|.+\|?$/.test(value);
}

function isTableSeparator(line) {
  const value = String(line || "").trim();
  return /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(value);
}

function splitTableLine(line) {
  const value = String(line || "").trim().replace(/^\|/, "").replace(/\|$/, "");
  return value.split(/(?<!\\)\|/).map((cell) => cell.replace(/\\\|/g, "|").trim());
}

function isListLine(line) {
  return /^\s*(?:[-*+]|\d+\.)\s+/.test(line || "");
}

function openSelectedSource() {
  const conversation = getCombinedConversations().find((item) => item.viewerId === state.selectedKey);
  if (conversation?.sourceUrl) {
    chrome.tabs.create({ url: conversation.sourceUrl });
  }
}

function exportAll(format, packaging = "single") {
  const conversations = getCombinedConversations();
  if (!conversations.length) {
    return;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  if (packaging === "zip") {
    const archive = window.CBV_ZIP_EXPORT.createZip(buildZipEntries(conversations, format));
    downloadBlob(`gpt-knowledge-base-${stamp}-${format}.zip`, archive);
    return;
  }

  if (format === "json") {
    downloadFile(
      `gpt-knowledge-base-${stamp}.json`,
      JSON.stringify({
        exportedAt: new Date().toISOString(),
        conversations
      }, null, 2),
      "application/json"
    );
    return;
  }

  if (format === "html") {
    downloadFile(
      `gpt-knowledge-base-${stamp}.html`,
      window.CBV_HTML_EXPORT.conversationsToHtml(conversations, {
        language: state.preferences.language
      }),
      "text/html"
    );
    return;
  }

  downloadFile(
    `gpt-knowledge-base-${stamp}.md`,
    conversations.map(conversationToMarkdown).join("\n\n---\n\n"),
    "text/markdown"
  );
}

function buildZipEntries(conversations, format) {
  const extension = format === "markdown" ? "md" : format;
  const usedNames = new Map();

  return conversations.map((conversation, index) => {
    const folder = safeFileName(localizePlatformName(
      conversation.folderId || conversation.platform,
      conversation.folderLabel || conversation.platformLabel || "Other"
    )) || "Other";
    const baseName = safeFileName(conversation.title) || `conversation-${index + 1}`;
    const nameKey = `${folder}/${baseName}`.toLowerCase();
    const duplicateIndex = (usedNames.get(nameKey) || 0) + 1;
    usedNames.set(nameKey, duplicateIndex);
    const uniqueName = duplicateIndex === 1 ? baseName : `${baseName}-${duplicateIndex}`;

    return {
      name: `${folder}/${uniqueName}.${extension}`,
      content: conversationToExportContent(conversation, format)
    };
  });
}

function conversationToExportContent(conversation, format) {
  if (format === "json") {
    return JSON.stringify(conversation, null, 2);
  }
  if (format === "html") {
    return window.CBV_HTML_EXPORT.conversationToHtml(conversation, {
      language: state.preferences.language,
      platformLabel: localizePlatformName(conversation.platform, conversation.platformLabel || "Unknown"),
      folderLabel: localizePlatformName(conversation.folderId, conversation.folderLabel || "Unknown")
    });
  }
  return conversationToMarkdown(conversation);
}

function exportSelected(format) {
  const conversation = getCombinedConversations().find((item) => item.viewerId === state.selectedKey);
  if (!conversation) {
    return;
  }

  if (format === "json") {
    downloadFile(
      `${safeFileName(conversation.title)}.json`,
      JSON.stringify(conversation, null, 2),
      "application/json"
    );
    return;
  }

  if (format === "html") {
    downloadFile(
      `${safeFileName(conversation.title)}.html`,
      window.CBV_HTML_EXPORT.conversationToHtml(conversation, {
        language: state.preferences.language,
        platformLabel: localizePlatformName(conversation.platform, conversation.platformLabel || "Unknown"),
        folderLabel: localizePlatformName(conversation.folderId, conversation.folderLabel || "Unknown")
      }),
      "text/html"
    );
    return;
  }

  downloadFile(
    `${safeFileName(conversation.title)}.md`,
    conversationToMarkdown(conversation),
    "text/markdown"
  );
}

async function clearWorkspace() {
  if (!getCombinedConversations().length) {
    return;
  }
  if (!confirm(tr("clearWorkspaceConfirm"))) {
    return;
  }

  if (state.localConversations.length) {
    const storageIds = state.localConversations
      .map((conversation) => conversation.originalId || conversation.id)
      .filter(Boolean);
    const keys = storageIds.map((id) => CONVERSATION_PREFIX + id);
    keys.push(INDEX_KEY);
    await chrome.storage.local.remove(keys);
    await chrome.storage.local.set({ [INDEX_KEY]: [] });
  }

  state.localConversations = [];
  state.externalConversations = [];
  state.externalFolderName = "";
  state.externalDirectoryHandle = null;
  state.externalFileCount = 0;
  state.selectedKey = "";
  state.selectedFolder = "all";
  render();
}

async function deleteSelectedConversation() {
  const conversation = getCombinedConversations().find((item) => item.viewerId === state.selectedKey);
  if (!conversation || conversation.sourceType !== "browser") {
    return;
  }

  if (!confirm(tr("deleteOneConfirm", { title: conversation.title || tr("untitledConversation") }))) {
    return;
  }

  const storageId = conversation.originalId || conversation.id;
  if (!storageId) {
    return;
  }

  await chrome.storage.local.remove(CONVERSATION_PREFIX + storageId);
  const stored = await chrome.storage.local.get(INDEX_KEY);
  const index = Array.isArray(stored[INDEX_KEY]) ? stored[INDEX_KEY] : [];
  const nextIndex = index.filter((item) => item.id !== storageId);
  await chrome.storage.local.set({ [INDEX_KEY]: nextIndex });
  state.localConversations = state.localConversations.filter((item) => {
    return item.id !== conversation.id &&
      item.originalId !== conversation.originalId &&
      item.viewerId !== conversation.viewerId;
  });
  state.selectedKey = "";
  render();
}

function clearExternalFolder() {
  state.externalConversations = [];
  state.externalFolderName = "";
  state.externalDirectoryHandle = null;
  state.externalFileCount = 0;
  render();
}

function conversationToMarkdown(conversation) {
  const lines = [
    `# ${conversation.title || "Untitled conversation"}`,
    "",
    `Platform: ${localizePlatformName(conversation.platform, conversation.platformLabel || "Unknown")}`,
    `Folder: ${localizePlatformName(conversation.folderId, conversation.folderLabel || "Unknown")}`,
    `Source: ${conversation.sourceUrl || "unknown"}`,
    `Captured: ${conversation.updatedAt || conversation.capturedAt || "unknown"}`,
    `Backup Source: ${conversation.sourceType === "folder" ? conversation.externalPath || conversation.sourceLabel : "Browser storage"}`,
    ""
  ];

  for (const message of conversation.messages || []) {
    lines.push(`## ${ROLE_LABELS[message.role] || "Message"}`);
    lines.push("");
    lines.push(message.text || "");
    lines.push("");
  }

  return lines.join("\n").trim() + "\n";
}

function groupByFolder(conversations) {
  const groups = new Map();
  for (const conversation of conversations) {
    if (!groups.has(conversation.folderId)) {
      groups.set(conversation.folderId, {
        id: conversation.folderId,
        label: conversation.folderLabel,
        latest: conversation.updatedAt || "",
        count: 0,
        items: []
      });
    }

    const group = groups.get(conversation.folderId);
    group.items.push(conversation);
    group.count += 1;
    if (String(conversation.updatedAt || "").localeCompare(String(group.latest || "")) > 0) {
      group.latest = conversation.updatedAt || "";
    }
  }

  return Array.from(groups.values())
    .sort((a, b) => String(b.latest).localeCompare(String(a.latest)));
}

function buildStatusText(conversations) {
  if (!conversations.length) {
    return tr("noBackupsLoaded");
  }

  const externalText = state.externalConversations.length
    ? tr("externalStatus", { count: state.externalConversations.length, folder: state.externalFolderName })
    : "";
  return tr("backupStatus", { local: state.localConversations.length, external: externalText });
}

function buildConversationMeta(conversation) {
  return tr("conversationMeta", {
    messages: conversation.messageCount,
    date: formatDate(conversation.updatedAt),
    source: conversation.sourceType === "folder" ? conversation.externalPath : conversation.sourceHost
  });
}

function localizePlatformName(key, fallback) {
  const platform = PREFS.platformByKey?.(String(key || "").toLowerCase()) || PREFS.platformByKey?.(fallback);
  return platform ? PREFS.platformLabel(state.preferences, platform) : String(fallback || "");
}

function looksLikeConversation(data) {
  return data && typeof data === "object" && Array.isArray(data.messages);
}

function isSupportedBackupFile(fileName) {
  return /\.(json|md|markdown)$/i.test(fileName || "");
}

function inferRootFolderName(files) {
  const firstPath = files[0]?.relativePath || "";
  return firstPath.includes("/") ? firstPath.split("/")[0] : "";
}

function inferPlatform(sourceHost) {
  const host = String(sourceHost || "").toLowerCase().replace(/^www\./, "");
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

function inferPlatformFromText(...values) {
  const text = values.filter(Boolean).join(" ").toLowerCase();
  return PLATFORM_FOLDERS.find((platform) => {
    return [platform.key, platform.label].filter(Boolean).some((value) => {
      return text.includes(String(value).toLowerCase());
    });
  }) || null;
}

function normalizeRole(role) {
  const value = String(role || "").toLowerCase();
  if (value === "user" || value === "assistant" || value === "thinking" || value === "system" || value === "tool" || value === "unknown") {
    return value;
  }
  if (value === "message") {
    return "unknown";
  }
  return "unknown";
}

function normalizeKey(value) {
  return String(value || "unknown")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._:-]+/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_+|_+$/g, "") || "unknown";
}

function cleanText(value) {
  return String(value || "")
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function normalizeInlineText(value) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/[·|｜/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function trimToLength(value, limit) {
  const text = String(value || "");
  if (text.length <= limit) {
    return text;
  }
  return `${text.slice(0, Math.max(0, limit - 3)).trim()}...`;
}

function normalizeDate(value) {
  if (!value) {
    return new Date(0).toISOString();
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date(0).toISOString();
  }

  return date.toISOString();
}

function formatDate(value) {
  if (!value) {
    return tr("unknown");
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getTime() === 0) {
    return tr("unknown");
  }

  return new Intl.DateTimeFormat(PREFS.locale(state.preferences), {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function safeHost(url) {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}

function safeFileName(value) {
  return String(value || "ai-chat-conversation")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120) || "ai-chat-conversation";
}

function titleCase(value) {
  return String(value || tr("unknown"))
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  downloadBlob(filename, blob);
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function createSmallText(text) {
  const node = document.createElement("small");
  node.textContent = text;
  return node;
}

function setStatus(text) {
  elements.statusText.textContent = text;
}

function getRoleLabel(role) {
  const normalized = normalizeRole(role);
  const key = `role${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`;
  return tr(key);
}

function tr(key, values = {}) {
  return PREFS.translate(state.preferences, key, values);
}

function hasConversationChange(changes) {
  return Object.keys(changes).some((key) => key.startsWith(CONVERSATION_PREFIX));
}

function hashString(input) {
  const value = String(input || "");
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}
