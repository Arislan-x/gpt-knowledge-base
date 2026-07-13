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

const PREFS = window.CBV_PREFERENCES;

const elements = {
  appTitle: document.querySelector("#appTitle"),
  appKicker: document.querySelector("#appKicker"),
  statusText: document.querySelector("#statusText"),
  summaryText: document.querySelector("#summaryText"),
  languageLabel: document.querySelector("#languageLabel"),
  languageSelect: document.querySelector("#languageSelect"),
  fontLabel: document.querySelector("#fontLabel"),
  fontSelect: document.querySelector("#fontSelect"),
  themeLabel: document.querySelector("#themeLabel"),
  themeSelect: document.querySelector("#themeSelect"),
  backupSwitchLabel: document.querySelector("#backupSwitchLabel"),
  captureToggle: document.querySelector("#captureToggle"),
  captureStatus: document.querySelector("#captureStatus"),
  localPrivacyNote: document.querySelector("#localPrivacyNote"),
  openVaultButton: document.querySelector("#openVaultButton"),
  searchInput: document.querySelector("#searchInput"),
  exportJsonButton: document.querySelector("#exportJsonButton"),
  exportMarkdownButton: document.querySelector("#exportMarkdownButton"),
  clearButton: document.querySelector("#clearButton"),
  backupListTitle: document.querySelector("#backupListTitle"),
  listSummary: document.querySelector("#listSummary"),
  expandGroupsButton: document.querySelector("#expandGroupsButton"),
  collapseGroupsButton: document.querySelector("#collapseGroupsButton"),
  toggleListButton: document.querySelector("#toggleListButton"),
  conversationCount: document.querySelector("#conversationCount"),
  conversationCountLabel: document.querySelector("#conversationCountLabel"),
  messageCount: document.querySelector("#messageCount"),
  messageCountLabel: document.querySelector("#messageCountLabel"),
  conversationList: document.querySelector("#conversationList"),
  detailPanel: document.querySelector("#detailPanel"),
  emptyState: document.querySelector("#emptyState"),
  supportedPlatformsTitle: document.querySelector("#supportedPlatformsTitle"),
  trademarkNotice: document.querySelector("#trademarkNotice"),
  supportedIconList: document.querySelector("#supportedIconList")
};

let state = {
  index: [],
  conversations: [],
  selectedId: "",
  query: "",
  listCollapsed: false,
  detailCollapsed: false,
  collapsedGroups: new Set(),
  preferences: { ...PREFS.DEFAULT_PREFERENCES },
  settings: { ...DEFAULT_SETTINGS },
  activeTab: null
};

document.addEventListener("DOMContentLoaded", initialize);
elements.openVaultButton.addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("src/viewer.html") });
});
elements.searchInput.addEventListener("input", () => {
  state.query = elements.searchInput.value.trim().toLowerCase();
  render();
});
elements.exportJsonButton.addEventListener("click", () => exportAll("json"));
elements.exportMarkdownButton.addEventListener("click", () => exportAll("markdown"));
elements.clearButton.addEventListener("click", clearBackups);
elements.toggleListButton.addEventListener("click", () => {
  state.listCollapsed = !state.listCollapsed;
  render();
});
elements.expandGroupsButton.addEventListener("click", () => {
  state.listCollapsed = false;
  state.collapsedGroups.clear();
  render();
});
elements.collapseGroupsButton.addEventListener("click", () => {
  state.listCollapsed = false;
  for (const group of groupByFolder(getVisibleIndex())) {
    state.collapsedGroups.add(group.id);
  }
  render();
});
elements.languageSelect.addEventListener("change", () => updatePreferences({ language: elements.languageSelect.value }));
elements.fontSelect.addEventListener("change", () => updatePreferences({ font: elements.fontSelect.value }));
elements.themeSelect.addEventListener("change", () => updatePreferences({ theme: elements.themeSelect.value }));
elements.captureToggle.addEventListener("change", () => updateSettings({ autoCapture: elements.captureToggle.checked }));

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && (changes[INDEX_KEY] || hasConversationChange(changes))) {
    loadAndRender();
  }
  if (areaName === "local" && changes["cbv.preferences"]) {
    loadPreferencesAndRender();
  }
  if (areaName === "local" && changes[SETTINGS_KEY]) {
    loadSettingsAndRender();
  }
});

async function initialize() {
  await loadPreferencesAndRender({ skipRender: true });
  await loadSettingsAndRender({ skipRender: true });
  await loadAndRender();
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
  elements.openVaultButton.textContent = tr("openVault");
  elements.searchInput.placeholder = tr("searchConversations");
  elements.exportJsonButton.textContent = tr("exportJson");
  elements.exportMarkdownButton.textContent = tr("exportMarkdown");
  elements.clearButton.textContent = tr("clear");
  elements.backupListTitle.textContent = tr("searchResults");
  elements.expandGroupsButton.textContent = tr("expand");
  elements.collapseGroupsButton.textContent = tr("fold");
  elements.conversationCountLabel.textContent = tr("conversations");
  elements.messageCountLabel.textContent = tr("messages");
  elements.emptyState.textContent = tr("emptyPopup");
  elements.backupSwitchLabel.textContent = tr("backupSwitch");
  elements.localPrivacyNote.textContent = tr("localPrivacyNote");
  elements.supportedPlatformsTitle.textContent = tr("supportedPlatforms");
  elements.trademarkNotice.textContent = tr("trademarkNotice");
  syncCaptureToggle();
  renderSupportedPlatforms();
}

async function loadSettingsAndRender(options = {}) {
  const stored = await chrome.storage.local.get(SETTINGS_KEY);
  state.settings = { ...DEFAULT_SETTINGS, ...(stored[SETTINGS_KEY] || {}) };
  syncCaptureToggle();
  if (!options.skipRender) {
    render();
  }
}

async function updateSettings(patch) {
  const next = { ...DEFAULT_SETTINGS, ...state.settings, ...patch };
  state.settings = next;
  syncCaptureToggle();
  await chrome.storage.local.set({ [SETTINGS_KEY]: next });
}

function syncCaptureToggle() {
  const enabled = state.settings.autoCapture !== false;
  elements.captureToggle.checked = enabled;
  elements.captureStatus.textContent = enabled ? tr("captureOn") : tr("captureOff");
  elements.captureStatus.classList.toggle("is-paused", !enabled);
}

function renderSupportedPlatforms() {
  elements.supportedIconList.replaceChildren(...PREFS.SUPPORTED_PLATFORMS.map((platform) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `supported-platform platform-${platform.key}`;
    button.title = PREFS.platformTitle(state.preferences, platform);
    button.setAttribute("aria-label", PREFS.platformTitle(state.preferences, platform));
    button.addEventListener("click", () => {
      chrome.tabs.create({ url: platform.home });
    });

    const label = document.createElement("span");
    label.className = "platform-label";
    label.textContent = PREFS.platformLabel(state.preferences, platform);

    button.append(createPlatformIcon(platform), label);
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

async function refreshActiveTabContext() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs?.[0] || null;
    state.activeTab = tab?.id ? {
      id: tab.id,
      url: tab.url || "",
      title: tab.title || ""
    } : null;
  } catch {
    state.activeTab = null;
  }
}

async function loadAndRender() {
  await refreshActiveTabContext();
  const stored = await chrome.storage.local.get(INDEX_KEY);
  const index = Array.isArray(stored[INDEX_KEY]) ? stored[INDEX_KEY] : [];
  const keys = index.map((item) => CONVERSATION_PREFIX + item.id);
  const conversations = keys.length ? await chrome.storage.local.get(keys) : {};

  state.index = index;
  state.conversations = index.map((item) => {
    return normalizeConversationForPopup(conversations[CONVERSATION_PREFIX + item.id] || item, item);
  });

  if (state.selectedId && !state.conversations.some((item) => item.id === state.selectedId)) {
    state.selectedId = "";
  }
  render();
}

function render() {
  const hasQuery = Boolean(state.query);
  const visible = hasQuery ? getVisibleIndex() : [];
  const groups = groupByFolder(visible);
  const totalMessages = state.conversations.reduce((sum, item) => sum + Number(item.messageCount || 0), 0);
  const listSection = elements.conversationList.closest(".list-section");

  if (hasQuery && visible.length && !visible.some((item) => item.id === state.selectedId)) {
    state.selectedId = visible[0].id;
  }
  if (!hasQuery || !visible.length) {
    state.selectedId = "";
  }

  elements.conversationCount.textContent = String(state.conversations.length);
  elements.messageCount.textContent = String(totalMessages);
  elements.statusText.textContent = getStatusText(state.conversations);
  elements.summaryText.textContent = tr("popupSummary", {
    conversations: state.conversations.length,
    messages: totalMessages
  });
  elements.listSummary.textContent = tr("listSummary", { groups: groups.length, conversations: visible.length });
  elements.toggleListButton.textContent = state.listCollapsed ? tr("show") : tr("hide");
  elements.conversationList.classList.toggle("is-collapsed", state.listCollapsed);
  if (listSection) {
    listSection.hidden = !hasQuery;
  }
  elements.emptyState.textContent = hasQuery ? tr("noSearchResults") : tr("emptyPopup");
  elements.emptyState.hidden = !hasQuery || state.listCollapsed || visible.length > 0;

  elements.conversationList.replaceChildren(...renderGroupedConversationItems(groups));

  renderDetail();
}

function getVisibleIndex() {
  if (!state.query) {
    return [];
  }

  return state.conversations.filter((item) => {
    return [item.title, item.sourceHost, item.sourceUrl, getFolderLabel(item), getPlatformLabel(item), ...getMessageSearchText(item)]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(state.query));
  });
}

function getMessageSearchText(conversation) {
  return Array.isArray(conversation?.messages)
    ? conversation.messages.map((message) => message.text || message.content || "")
    : [];
}

function renderGroupedConversationItems(groups) {
  const nodes = [];

  for (const group of groups) {
    nodes.push(renderFolderHeader(group));
    nodes.push(renderFolderBody(group));
  }

  return nodes;
}

function renderFolderHeader(group) {
  const li = document.createElement("li");
  li.className = "folder-header";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "folder-toggle";
  button.setAttribute("aria-expanded", String(!state.collapsedGroups.has(group.id)));
  button.addEventListener("click", () => {
    if (state.collapsedGroups.has(group.id)) {
      state.collapsedGroups.delete(group.id);
    } else {
      state.collapsedGroups.add(group.id);
    }
    render();
  });

  const caret = document.createElement("span");
  caret.className = "folder-caret";
  caret.textContent = state.collapsedGroups.has(group.id) ? ">" : "v";

  const title = document.createElement("span");
  title.textContent = localizePlatformName(group.id, group.label);

  const count = document.createElement("small");
  count.textContent = tr("groupConversationCount", { count: group.items.length });

  button.append(caret, title, count);
  li.append(button);
  return li;
}

function renderFolderBody(group) {
  const li = document.createElement("li");
  li.className = "folder-group-body";
  if (state.collapsedGroups.has(group.id)) {
    li.classList.add("is-collapsed");
    return li;
  }

  const list = document.createElement("ul");
  list.className = "conversation-group-list";
  list.replaceChildren(...group.items.map(renderConversationItem));
  li.append(list);
  return li;
}

function renderConversationItem(item) {
  const li = document.createElement("li");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "conversation-item";
  if (item.id === state.selectedId) {
    button.classList.add("is-selected");
  }
  button.addEventListener("click", () => {
    state.selectedId = item.id;
    state.detailCollapsed = false;
    render();
  });
  button.addEventListener("dblclick", () => {
    if (item.sourceUrl) {
      chrome.tabs.create({ url: item.sourceUrl });
    }
  });

  const textWrap = document.createElement("span");
  const title = document.createElement("span");
  title.className = "conversation-title";
  title.textContent = item.title || tr("untitledConversation");

  const meta = document.createElement("span");
  meta.className = "conversation-meta";
  meta.textContent = `${formatDate(item.updatedAt)} - ${item.sourceHost || getFolderLabel(item)}`;

  const count = document.createElement("span");
  count.className = "count-pill";
  count.textContent = String(item.messageCount || 0);

  textWrap.append(title, meta);
  button.append(textWrap, count);
  li.append(button);
  return li;
}

function renderDetail() {
  const conversation = getCurrentPageConversation();

  const copy = document.createElement("div");
  copy.className = "current-backup-copy";

  const label = document.createElement("span");
  label.className = "current-backup-label";
  label.textContent = tr("currentPageBackup");

  const title = document.createElement("span");
  title.className = "current-backup-title";
  title.textContent = conversation?.title || tr("currentBackupNotFound");

  copy.append(label, title);

  if (conversation) {
    const meta = document.createElement("span");
    meta.className = "current-backup-meta";
    meta.textContent = tr("conversationMeta", {
      messages: conversation.messageCount || 0,
      date: formatDate(conversation.updatedAt),
      source: getPlatformLabel(conversation)
    });
    copy.append(meta);
  }

  const refreshButton = document.createElement("button");
  refreshButton.type = "button";
  refreshButton.className = "refresh-backup-button";
  refreshButton.title = tr("refreshBackup");
  refreshButton.setAttribute("aria-label", tr("refreshBackup"));
  refreshButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg>';
  refreshButton.addEventListener("click", () => refreshCurrentPageBackup(refreshButton));

  elements.detailPanel.className = "detail-panel";
  elements.detailPanel.replaceChildren(copy, refreshButton);
  elements.detailPanel.hidden = false;
}

function getCurrentPageConversation() {
  const activeUrl = state.activeTab?.url || "";
  if (!activeUrl) {
    return null;
  }

  const exact = state.conversations.find((conversation) => sameConversationUrl(conversation.sourceUrl, activeUrl));
  if (exact) {
    return exact;
  }

  const active = parseUrl(activeUrl);
  if (!active) {
    return null;
  }

  return state.conversations.find((conversation) => {
    const source = parseUrl(conversation.sourceUrl || "");
    if (!source) {
      return false;
    }
    return normalizeHost(source.hostname) === normalizeHost(active.hostname) &&
      normalizePath(source.pathname) === normalizePath(active.pathname);
  }) || null;
}

async function refreshCurrentPageBackup(button) {
  await refreshActiveTabContext();
  if (!state.activeTab?.id) {
    setStatus(tr("manualBackupFailed"));
    return;
  }

  const originalDisabled = button?.disabled;
  if (button) {
    button.disabled = true;
  }
  setStatus(tr("refreshingBackup"));

  try {
    const response = await chrome.tabs.sendMessage(state.activeTab.id, { type: "cbv:force-capture" });
    if (response?.ok === false && response.reason === "capture-disabled") {
      setStatus(tr("manualBackupDisabled"));
    } else if (response?.result?.saved === false && response.result.reason === "unchanged") {
      setStatus(tr("currentBackupUnchanged"));
    } else if (response?.result?.saved === false && response.result.reason === "auto-capture-disabled") {
      setStatus(tr("manualBackupDisabled"));
    } else if (response?.result?.saved === false) {
      setStatus(tr("manualBackupFailed"));
    } else {
      setStatus(tr("currentBackupSaved"));
    }
    await delay(500);
    await loadAndRender();
  } catch {
    setStatus(tr("manualBackupFailed"));
  } finally {
    if (button) {
      button.disabled = Boolean(originalDisabled);
    }
  }
}

function sameConversationUrl(left, right) {
  const first = parseUrl(left);
  const second = parseUrl(right);
  if (!first || !second) {
    return false;
  }
  return normalizeHost(first.hostname) === normalizeHost(second.hostname) &&
    normalizePath(first.pathname) === normalizePath(second.pathname) &&
    first.search === second.search;
}

function parseUrl(value) {
  try {
    return new URL(String(value || ""));
  } catch {
    return null;
  }
}

function normalizeHost(value) {
  return String(value || "").toLowerCase().replace(/^www\./, "");
}

function normalizePath(value) {
  return String(value || "/").replace(/\/+$/, "") || "/";
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function createButton(label, onClick, className = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  if (className) {
    button.className = className;
  }
  button.addEventListener("click", onClick);
  return button;
}

async function getConversation(id) {
  return state.conversations.find((conversation) => conversation.id === id) || null;
}

async function getAllConversations() {
  return state.conversations.slice();
}

function normalizeConversationForPopup(raw, metadata = {}) {
  const sourceHost = String(raw?.sourceHost || metadata.sourceHost || "");
  const inferred = inferPlatform(sourceHost);
  const platform = String(raw?.platform || metadata.platform || inferred?.key || "").toLowerCase();
  const messages = Array.isArray(raw?.messages)
    ? normalizeConversationMessages(raw.messages, platform)
    : [];
  const doubaoTitle = platform === "doubao" ? extractDoubaoTitleFromMessages(raw?.messages) : "";

  return {
    ...metadata,
    ...raw,
    id: metadata.id || raw?.id || "",
    localId: metadata.localId || raw?.localId || "",
    platform: raw?.platform || metadata.platform || inferred?.key || "web",
    platformLabel: raw?.platformLabel || metadata.platformLabel || inferred?.label || "Web",
    folderId: raw?.folderId || metadata.folderId || raw?.platform || metadata.platform || "web",
    folderLabel: raw?.folderLabel || metadata.folderLabel || raw?.platformLabel || metadata.platformLabel || "Web",
    title: doubaoTitle || raw?.title || metadata.title || tr("untitledConversation"),
    sourceUrl: raw?.sourceUrl || metadata.sourceUrl || "",
    sourceHost,
    updatedAt: raw?.updatedAt || metadata.updatedAt || "",
    capturedAt: raw?.capturedAt || metadata.capturedAt || "",
    messageCount: messages.length || Number(raw?.messageCount || metadata.messageCount || 0),
    messages
  };
}

function normalizeConversationMessages(rawMessages, platform) {
  const normalized = rawMessages.map(normalizeMessage).filter(Boolean);
  if (platform === "kimi") {
    return repairKimiMessagesForDisplay(normalized).map(reindexMessage);
  }
  if (platform === "doubao") {
    return repairDoubaoMessagesForDisplay(normalized).map(reindexMessage);
  }
  if (platform === "gemini") {
    return repairGeminiMessagesForDisplay(normalized).map(reindexMessage);
  }
  if (platform === "qwen") {
    return repairQwenMessagesForDisplay(normalized).map(reindexMessage);
  }
  if (platform === "chatgpt") {
    return repairChatGptThinkingMessages(normalized).map(reindexMessage);
  }
  return normalized.map(reindexMessage);
}

function reindexMessage(message, index) {
  return {
    ...message,
    index
  };
}

function normalizeMessage(raw, index) {
  const text = cleanText(raw?.text || raw?.content || "");
  if (!text) {
    return null;
  }

  const role = normalizeRole(raw?.role);
  return {
    id: cleanText(raw?.id || `${role}-${index}`),
    role,
    text,
    index: Number.isFinite(raw?.index) ? raw.index : index
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
  const parts = messages.map((message) => cleanText(message.text)).filter(Boolean);
  if (!parts.length) {
    return null;
  }

  const text = parts.join("\n\n---\n\n");
  return {
    id: `thinking-${hashString(text.slice(0, 1000))}`,
    role: "thinking",
    text
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

  return repaired;
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
  return merged.map(reindexMessage);
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

  return repaired;
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
  return cleanText(String(text || "")
    .replace(/\r/g, "")
    .split("\n")
    .filter((line) => !isDoubaoChromeLine(line))
    .join("\n"));
}

function isDoubaoChromeLine(line) {
  const value = normalizeInlineText(line);
  return !value ||
    /^AI\s*生成可能有误\s*注意核实$/.test(value) ||
    /^(重新生成|复制|分享|删除|编辑|赞|踩|更多)$/.test(value);
}

function isDoubaoAssistantDividerLine(line) {
  const value = normalizeInlineText(line);
  return /^已完成[^，,。.!?]{0,30}生成\s*[（(]\s*\d+\s*(?:h|小时|m|min|分钟|分)?\s*\d*\s*(?:s|秒)?\s*[）)]\s*$/i.test(value) ||
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
    const split = splitKimiSegmentBeforeAction(segment);
    addKimiPart(parts, "assistant", split.assistant);
    addKimiPart(parts, "user", split.user);
    start = markerIndex + 1;
  }

  addKimiPart(parts, "assistant", lines.slice(start).filter((line) => !isKimiUserActionLine(line)).join("\n"));
  return parts;
}

function splitKimiSegmentBeforeAction(segment) {
  const normalized = cleanText(segment);
  const lines = normalized.split("\n").map((line) => cleanText(line)).filter(Boolean);
  const blocks = normalized.split(/\n{2,}/).map((block) => cleanText(block)).filter(Boolean);
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

async function exportAll(format) {
  const conversations = await getAllConversations();
  if (!conversations.length) {
    return;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  if (format === "json") {
    downloadFile(
      `gpt-knowledge-base-${stamp}.json`,
      JSON.stringify({
        exportedAt: new Date().toISOString(),
        folders: summarizeFolders(conversations),
        conversations
      }, null, 2),
      "application/json"
    );
    return;
  }

  downloadFile(
    `gpt-knowledge-base-${stamp}.md`,
    conversations.map(conversationToMarkdown).join("\n\n---\n\n"),
    "text/markdown"
  );
}

async function clearBackups() {
  if (!state.index.length) {
    return;
  }
  if (!confirm(tr("deleteAllConfirm"))) {
    return;
  }

  const keys = state.index.map((item) => CONVERSATION_PREFIX + item.id);
  keys.push(INDEX_KEY);
  await chrome.storage.local.remove(keys);
  await chrome.storage.local.set({ [INDEX_KEY]: [] });
  state.index = [];
  state.conversations = [];
  state.selectedId = "";
  state.collapsedGroups.clear();
  state.detailCollapsed = false;
  render();
}

async function deleteConversation(id) {
  const item = state.conversations.find((entry) => entry.id === id);
  if (!item) {
    return;
  }
  if (!confirm(tr("deleteOneConfirm", { title: item.title || tr("untitledConversation") }))) {
    return;
  }

  await chrome.storage.local.remove(CONVERSATION_PREFIX + id);
  state.index = state.index.filter((entry) => entry.id !== id);
  state.conversations = state.conversations.filter((entry) => entry.id !== id);
  await chrome.storage.local.set({ [INDEX_KEY]: state.index });
  state.selectedId = "";
  state.detailCollapsed = false;
  render();
}

function conversationToMarkdown(conversation) {
  const lines = [
    `# ${conversation.title || "Untitled conversation"}`,
    "",
    `Platform: ${getPlatformLabel(conversation)}`,
    `Folder: ${getFolderLabel(conversation)}`,
    `Source: ${conversation.sourceUrl || "unknown"}`,
    `Captured: ${conversation.updatedAt || conversation.capturedAt || "unknown"}`,
    ""
  ];

  for (const message of conversation.messages || []) {
    lines.push(`## ${capitalize(message.role || "message")}`);
    lines.push("");
    lines.push(message.text || "");
    lines.push("");
  }

  return lines.join("\n").trim() + "\n";
}

function buildPreview(conversation) {
  const messages = Array.isArray(conversation.messages) ? conversation.messages : [];
  const lastMessages = messages.slice(-2);
  return lastMessages.map((message) => {
    return `${getRoleLabel(message.role)}: ${message.text}`;
  }).join("\n\n").slice(0, 1200);
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function getStatusText(index) {
  if (!index.length) {
    return tr("waitingForChat");
  }
  const latest = index[0]?.updatedAt;
  return latest ? tr("lastBackup", { date: formatDate(latest) }) : tr("backupsReady");
}

function formatDate(value) {
  if (!value) {
    return tr("unknown");
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return tr("unknown");
  }

  return new Intl.DateTimeFormat(PREFS.locale(state.preferences), {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function safeFileName(value) {
  return String(value || "ai-chat-conversation")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120) || "ai-chat-conversation";
}

function capitalize(value) {
  const text = String(value || "message");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function getRoleLabel(role) {
  const key = `role${capitalize(role || "unknown")}`;
  return tr(key) || tr("roleUnknown");
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

function hashString(input) {
  const value = String(input || "");
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function hasConversationChange(changes) {
  return Object.keys(changes).some((key) => key.startsWith(CONVERSATION_PREFIX));
}

function groupByFolder(items) {
  const groups = new Map();
  for (const item of items) {
    const id = getFolderId(item);
    if (!groups.has(id)) {
      groups.set(id, {
        id,
        label: getFolderLabel(item),
        latest: item.updatedAt || "",
        items: []
      });
    }

    const group = groups.get(id);
    group.items.push(item);
    if (String(item.updatedAt || "").localeCompare(String(group.latest || "")) > 0) {
      group.latest = item.updatedAt || "";
    }
  }

  return Array.from(groups.values()).sort((a, b) => String(b.latest).localeCompare(String(a.latest)));
}

function summarizeFolders(conversations) {
  return groupByFolder(conversations).map((group) => ({
    id: group.id,
    label: group.label,
    conversationCount: group.items.length,
    messageCount: group.items.reduce((sum, item) => sum + Number(item.messageCount || 0), 0),
    updatedAt: group.latest || null
  }));
}

function getFolderId(item) {
  return String(item?.folderId || item?.platform || inferPlatform(item?.sourceHost)?.key || "web");
}

function getFolderLabel(item) {
  const key = getFolderId(item);
  return localizePlatformName(key, item?.folderLabel || item?.platformLabel || inferPlatform(item?.sourceHost)?.label || "Web");
}

function getPlatformLabel(item) {
  const key = String(item?.platform || inferPlatform(item?.sourceHost)?.key || getFolderId(item));
  return localizePlatformName(key, item?.platformLabel || inferPlatform(item?.sourceHost)?.label || getFolderLabel(item));
}

function localizePlatformName(key, fallback) {
  const platform = PREFS.platformByKey?.(String(key || "").toLowerCase()) || PREFS.platformByKey?.(fallback);
  return platform ? PREFS.platformLabel(state.preferences, platform) : String(fallback || "");
}

function tr(key, values = {}) {
  return PREFS.translate(state.preferences, key, values);
}

function setStatus(text) {
  elements.statusText.textContent = text;
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
