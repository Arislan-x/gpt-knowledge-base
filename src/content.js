(() => {
  if (window.__chatBackupVaultLoaded) {
    return;
  }
  window.__chatBackupVaultLoaded = true;

  const CAPTURE_DEBOUNCE_MS = 900;
  const URL_CHECK_MS = 1200;
  const CHATGPT_BACKEND_MIN_INTERVAL_MS = 4000;
  const MIN_GENERIC_MESSAGE_LENGTH = 8;
  const MIN_FALLBACK_TRANSCRIPT_LENGTH = 80;
  const SETTINGS_KEY = "cbv.settings";
  const DEEPSEEK_NETWORK_SOURCE = "cbv:deepseek-network";
  const DEEPSEEK_NETWORK_BUFFER_REQUEST_SOURCE = "cbv:deepseek-network-buffer-request";

  const DEFAULT_SETTINGS = {
    autoCapture: true
  };

  const REMOVE_SELECTOR = [
    "script",
    "style",
    "svg",
    "button",
    "form",
    "nav",
    "aside",
    "header",
    "footer",
    "textarea",
    "input",
    "select",
    "[aria-hidden='true']",
    "[hidden]",
    "[contenteditable='true']",
    "[data-testid*='copy' i]",
    "[data-testid*='feedback' i]",
    "[data-testid*='share' i]",
    "[data-testid*='toolbar' i]",
    ".sr-only",
    ".visually-hidden"
  ].join(",");

  const REMOVE_KEEPING_CONTROLS_SELECTOR = [
    "script",
    "style",
    "svg",
    "form",
    "nav",
    "aside",
    "header",
    "footer",
    "textarea",
    "input",
    "select",
    "[aria-hidden='true']",
    "[hidden]",
    "[contenteditable='true']",
    ".sr-only",
    ".visually-hidden"
  ].join(",");

  const PLATFORM_CONFIGS = [
    {
      key: "chatgpt",
      label: "ChatGPT",
      hosts: ["chatgpt.com", "chat.openai.com"],
      titlePatterns: [/^\s*ChatGPT\s*[-:]\s*/i, /\s+-\s+ChatGPT\s*$/i],
      conversationPatterns: [/\/c\/([^/?#]+)/],
      messageSources: [
        { selector: "[data-message-author-role]", roleAttr: "data-message-author-role", idAttr: "data-message-id", minLength: 1 }
      ]
    },
    {
      key: "claude",
      label: "Claude",
      hosts: ["claude.ai", "claude.com"],
      titlePatterns: [/\s+-\s+Claude\s*$/i, /^\s*Claude\s*[-:]\s*/i],
      conversationPatterns: [/\/chat\/([^/?#]+)/, /\/project\/[^/]+\/chat\/([^/?#]+)/],
      messageSources: [
        { selector: "[data-testid='user-message']", role: "user", minLength: 1 },
        { selector: "[data-testid='assistant-message']", role: "assistant", minLength: 1 },
        { selector: "[data-testid*='user-message' i]", role: "user", minLength: 1 },
        { selector: "[data-testid*='assistant-message' i]", role: "assistant", minLength: 1 },
        { selector: "[data-testid*='assistant' i]", inferRole: true, minLength: 1 },
        { selector: "[data-is-streaming]", role: "assistant", minLength: 1 },
        { selector: "[class*='font-user-message' i]", role: "user", minLength: 1 },
        { selector: "[class*='font-claude-message' i]", role: "assistant", minLength: 1 },
        { selector: "[class*='prose' i]", role: "assistant", minLength: MIN_GENERIC_MESSAGE_LENGTH }
      ]
    },
    {
      key: "grok",
      label: "Grok",
      hosts: ["grok.com"],
      hostPaths: [{ host: "x.com", pathPattern: /^\/i\/grok(?:\/|$)/ }],
      titlePatterns: [/\s+-\s+Grok\s*$/i, /^\s*Grok\s*[-:]\s*/i],
      conversationPatterns: [/\/chat\/([^/?#]+)/, /\/c\/([^/?#]+)/, /\/i\/grok\/([^/?#]+)/],
      messageSources: [
        { selector: "[data-testid*='message' i]", inferRole: true, minLength: 1 },
        { selector: "[data-testid*='conversation-turn' i]", inferRole: true, minLength: 1 },
        { selector: "[class*='message' i]", inferRole: true, minLength: MIN_GENERIC_MESSAGE_LENGTH }
      ]
    },
    {
      key: "deepseek",
      label: "DeepSeek",
      hosts: ["chat.deepseek.com", "deepseek.com"],
      titlePatterns: [/\s+-\s+DeepSeek\s*$/i, /^\s*DeepSeek\s*[-:]\s*/i],
      conversationPatterns: [/\/a\/chat\/s\/([^/?#]+)/, /\/chat\/([^/?#]+)/, /\/c\/([^/?#]+)/],
      messageSources: [
        { selector: "[data-role='user'], [data-message-author-role='user']", role: "user", minLength: 1 },
        { selector: "[data-role='assistant'], [data-message-author-role='assistant']", role: "assistant", minLength: 1 },
        { selector: "[class*='user' i][class*='message' i], [class*='user' i][class*='bubble' i], [class*='question' i], [class*='query' i], [class*='prompt' i]", role: "user", minLength: 1 },
        { selector: ".ds-markdown", role: "assistant", minLength: 1 },
        { selector: "[class*='markdown' i]", inferRole: true, minLength: MIN_GENERIC_MESSAGE_LENGTH },
        { selector: "[data-testid*='message' i]", inferRole: true, minLength: 1 },
        { selector: "[data-role]", roleAttr: "data-role", minLength: 1 }
      ]
    },
    {
      key: "kimi",
      label: "Kimi",
      hosts: ["kimi.com", "www.kimi.com", "kimi.moonshot.cn"],
      titlePatterns: [/\s+-\s+Kimi\s*$/i, /^\s*Kimi\s*[-:]\s*/i],
      conversationPatterns: [/\/chat\/([^/?#]+)/, /\/conversation\/([^/?#]+)/, /\/c\/([^/?#]+)/],
      messageSources: [
        { selector: "[data-role='user'], [data-role='assistant']", roleAttr: "data-role", minLength: 1 },
        { selector: "[class*='user' i][class*='message' i], [class*='assistant' i][class*='message' i]", inferRole: true, minLength: 1 },
        { selector: "[class*='chat-item' i], [class*='message-item' i], [class*='conversation-item' i]", inferRole: true, minLength: 1 },
        { selector: "[data-testid*='message' i]", inferRole: true, minLength: 1 },
        { selector: "[data-role]", roleAttr: "data-role", minLength: 1 }
      ]
    },
    {
      key: "gemini",
      label: "Gemini",
      hosts: ["gemini.google.com"],
      titlePatterns: [/\s+-\s+Gemini\s*$/i, /^\s*Gemini\s*[-:]\s*/i],
      conversationPatterns: [/\/app\/([^/?#]+)/],
      messageSources: [
        { selector: "user-query", role: "user", minLength: 1 },
        { selector: "model-response", role: "assistant", minLength: 1 },
        { selector: "[data-response-index]", role: "assistant", minLength: 1 },
        { selector: "[class*='query-text' i]", role: "user", minLength: 1 },
        { selector: "[class*='model-response' i]", role: "assistant", minLength: 1 }
      ]
    },
    {
      key: "perplexity",
      label: "Perplexity",
      hosts: ["perplexity.ai", "www.perplexity.ai"],
      titlePatterns: [/\s+-\s+Perplexity\s*$/i, /^\s*Perplexity\s*[-:]\s*/i],
      conversationPatterns: [/\/search\/([^/?#]+)/, /\/spaces\/[^/]+\/[^/]+\/([^/?#]+)/],
      messageSources: [
        { selector: "[data-testid='user-message-bubble']", role: "user", minLength: 1 },
        { selector: "[data-testid*='query' i]", role: "user", minLength: 1 },
        { selector: "[data-testid*='answer' i]", role: "assistant", minLength: 1 },
        { selector: "[class*='AnswerBody' i], [class*='AssistantMessage' i], .answer-text", role: "assistant", minLength: 1 },
        { selector: "[data-testid*='message' i]", inferRole: true, minLength: 1 },
        { selector: "article", inferRole: true, minLength: MIN_GENERIC_MESSAGE_LENGTH }
      ]
    },
    {
      key: "poe",
      label: "Poe",
      hosts: ["poe.com", "www.poe.com"],
      titlePatterns: [/\s+-\s+Poe\s*$/i, /^\s*Poe\s*[-:]\s*/i],
      conversationPatterns: [/\/chat\/([^/?#]+)/, /\/([^/?#]+)$/],
      messageSources: [
        { selector: "[class*='ChatMessage_rightSide' i]", role: "user", minLength: 1 },
        { selector: "[class*='ChatMessage_messageWrapper' i], [class*='ChatMessage_wrapper' i]", inferRole: true, minLength: 1 },
        { selector: "[class*='Markdown_markdown' i], [class*='Prose_prose' i]", inferRole: true, minLength: 1 },
        { selector: "[data-testid*='ChatMessage' i]", inferRole: true, minLength: 1 },
        { selector: "[data-testid*='message' i]", inferRole: true, minLength: 1 },
        { selector: "[class*='Message' i]", inferRole: true, minLength: MIN_GENERIC_MESSAGE_LENGTH }
      ]
    },
    {
      key: "qwen",
      label: "千问",
      hosts: ["chat.qwen.ai", "qianwen.com", "www.qianwen.com"],
      titlePatterns: [/\s+-\s+Qwen\s*$/i, /^\s*Qwen\s*[-:]\s*/i, /\s+-\s+千问\s*$/i, /^\s*千问\s*[-:：]\s*/i],
      conversationPatterns: [/\/c\/([^/?#]+)/, /\/chat\/([^/?#]+)/, /\/chat(?:\/|$)/],
      messageSources: [
        { selector: "[data-testid*='message' i]", inferRole: true, minLength: 1 },
        { selector: "[data-role]", roleAttr: "data-role", minLength: 1 },
        { selector: "[class*='markdown' i]", inferRole: true, minLength: MIN_GENERIC_MESSAGE_LENGTH }
      ]
    },
    {
      key: "doubao",
      label: "豆包",
      hosts: ["doubao.com", "www.doubao.com"],
      titlePatterns: [/\s+-\s+豆包\s*$/i, /^\s*豆包\s*[-:：]\s*/i, /\s+-\s+Doubao\s*$/i, /^\s*Doubao\s*[-:]\s*/i],
      conversationPatterns: [/\/chat\/([^/?#]+)/, /\/conversation\/([^/?#]+)/, /\/c\/([^/?#]+)/],
      messageSources: [
        { selector: "[data-testid*='message' i]", inferRole: true, minLength: 1 },
        { selector: "[data-role]", roleAttr: "data-role", minLength: 1 },
        { selector: "[class*='message' i]", inferRole: true, minLength: MIN_GENERIC_MESSAGE_LENGTH },
        { selector: "[class*='markdown' i]", inferRole: true, minLength: MIN_GENERIC_MESSAGE_LENGTH }
      ]
    },
    {
      key: "yuanbao",
      label: "腾讯元宝",
      hosts: ["yuanbao.tencent.com"],
      titlePatterns: [/\s+-\s+腾讯元宝\s*$/i, /^\s*腾讯元宝\s*[-:：]\s*/i, /\s+-\s+元宝\s*$/i, /^\s*元宝\s*[-:：]\s*/i],
      conversationPatterns: [/\/chat\/[^/?#]+\/([^/?#]+)/, /\/chat\/([^/?#]+)/, /\/conversation\/([^/?#]+)/, /\/c\/([^/?#]+)/],
      messageSources: [
        { selector: ".agent-chat__bubble--human", role: "user", minLength: 1 },
        { selector: ".agent-chat__conv--human", role: "user", minLength: 1 },
        { selector: ".agent-chat__bubble--ai", role: "assistant", minLength: 1 },
        { selector: ".hyc-common-markdown", role: "assistant", minLength: 1 },
        { selector: "[data-testid*='message' i]", inferRole: true, minLength: 1 },
        { selector: "[data-role]", roleAttr: "data-role", minLength: 1 },
        { selector: "[class*='message' i]", inferRole: true, minLength: MIN_GENERIC_MESSAGE_LENGTH },
        { selector: "[class*='markdown' i]", inferRole: true, minLength: MIN_GENERIC_MESSAGE_LENGTH }
      ]
    },
    {
      key: "wenxin",
      label: "文心一言",
      hosts: ["chat.baidu.com", "yiyan.baidu.com", "wenxin.baidu.com"],
      titlePatterns: [/\s+-\s+文心一言\s*$/i, /^\s*文心一言\s*[-:：]\s*/i, /\s+-\s+文小言\s*$/i, /^\s*文小言\s*[-:：]\s*/i],
      conversationPatterns: [/\/chat\/([^/?#]+)/, /\/conversation\/([^/?#]+)/, /\/c\/([^/?#]+)/, /\/search(?:\/|$)/],
      messageSources: [
        { selector: "[data-role='user'], [data-message-author-role='user']", role: "user", minLength: 1 },
        { selector: "[data-role='assistant'], [data-message-author-role='assistant']", role: "assistant", minLength: 1 },
        { selector: "[class*='user' i][class*='message' i], [class*='question' i], [class*='query' i]", role: "user", minLength: 1 },
        { selector: "[class*='assistant' i][class*='message' i], [class*='answer' i], [class*='response' i]", role: "assistant", minLength: MIN_GENERIC_MESSAGE_LENGTH },
        { selector: "[data-testid*='message' i]", inferRole: true, minLength: 1 },
        { selector: "[data-role]", roleAttr: "data-role", minLength: 1 },
        { selector: "[class*='message' i]", inferRole: true, minLength: MIN_GENERIC_MESSAGE_LENGTH },
        { selector: "[class*='markdown' i]", inferRole: true, minLength: MIN_GENERIC_MESSAGE_LENGTH }
      ]
    },
    {
      key: "zhipu",
      label: "智谱清言",
      hosts: ["chatglm.cn", "www.chatglm.cn", "z.ai", "chat.z.ai"],
      titlePatterns: [/\s+-\s+智谱清言\s*$/i, /^\s*智谱清言\s*[-:：]\s*/i, /\s+-\s+清言\s*$/i, /^\s*清言\s*[-:：]\s*/i, /\s+-\s+ChatGLM\s*$/i, /^\s*ChatGLM\s*[-:]\s*/i, /\s+-\s+Z\.ai\s*$/i, /^\s*Z\.ai\s*[-:]\s*/i],
      conversationPatterns: [/\/main\/[^/?#]+\/([^/?#]+)/, /\/chat\/([^/?#]+)/, /\/conversation\/([^/?#]+)/, /\/c\/([^/?#]+)/, /\/chat(?:\/|$)/],
      messageSources: [
        { selector: ".conversation.question .question-txt, .question-txt", role: "user", minLength: 1 },
        { selector: "[class*='answer-content-wrap' i]", role: "assistant", minLength: 1 },
        { selector: "[data-testid*='message' i]", inferRole: true, minLength: 1 },
        { selector: "[data-role]", roleAttr: "data-role", minLength: 1 },
        { selector: "[class*='message' i]", inferRole: true, minLength: MIN_GENERIC_MESSAGE_LENGTH },
        { selector: "[class*='markdown' i]", inferRole: true, minLength: MIN_GENERIC_MESSAGE_LENGTH }
      ]
    },
    {
      key: "huggingface",
      label: "Hugging Face",
      hosts: ["huggingface.co", "hf.co"],
      hostPaths: [
        { host: "huggingface.co", pathPattern: /^\/chat(?:\/|$)/ },
        { host: "hf.co", pathPattern: /^\/chat(?:\/|$)/ }
      ],
      titlePatterns: [/\s+-\s+Hugging Face\s*$/i, /^\s*Hugging Face\s*[-:]\s*/i, /\s+-\s+HuggingChat\s*$/i, /^\s*HuggingChat\s*[-:]\s*/i],
      conversationPatterns: [/\/chat\/conversation\/([^/?#]+)/, /\/chat\/([^/?#]+)/],
      messageSources: [
        { selector: "[data-message-type='user']", role: "user", idAttr: "data-message-id", minLength: 1 },
        { selector: "[data-message-role='assistant']", role: "assistant", idAttr: "data-message-id", minLength: 1 },
        { selector: "[data-testid*='message' i]", inferRole: true, minLength: 1 },
        { selector: "[data-role]", roleAttr: "data-role", minLength: 1 },
        { selector: "[class*='message' i]", inferRole: true, minLength: MIN_GENERIC_MESSAGE_LENGTH },
        { selector: ".prose", role: "assistant", minLength: MIN_GENERIC_MESSAGE_LENGTH },
        { selector: "article", inferRole: true, minLength: MIN_GENERIC_MESSAGE_LENGTH }
      ]
    }
  ];

  const GENERIC_MESSAGE_SOURCES = [
    { selector: "[data-author]", roleAttr: "data-author", minLength: 1 },
    { selector: "[data-sender]", roleAttr: "data-sender", minLength: 1 },
    { selector: "[data-role]", roleAttr: "data-role", minLength: 1 },
    { selector: "[data-testid*='message' i]", inferRole: true, minLength: MIN_GENERIC_MESSAGE_LENGTH },
    { selector: "[data-testid*='chat' i][data-testid*='item' i]", inferRole: true, minLength: MIN_GENERIC_MESSAGE_LENGTH },
    { selector: "[class*='message' i]", inferRole: true, minLength: 24 },
    { selector: "article", inferRole: true, minLength: MIN_GENERIC_MESSAGE_LENGTH }
  ];

  const platform = detectPlatform();
  if (!platform) {
    return;
  }

  let lastUrl = location.href;
  let lastFingerprint = "";
  let captureTimer = 0;
  let captureEnabled = true;
  let deepSeekNetworkMessages = [];
  let deepSeekNetworkTitle = "";
  let chatGptBackendCache = {
    id: "",
    at: 0,
    snapshot: null
  };

  initializeCapture();
  observePage();
  observeUrlChanges();
  observeCaptureSettings();
  observeRuntimeCommands();
  observeDeepSeekNetwork();

  async function initializeCapture() {
    await loadCaptureSettings();
    if (captureEnabled) {
      scheduleCapture("initial");
    }
  }

  async function loadCaptureSettings() {
    try {
      const stored = await globalThis.chrome?.storage?.local?.get(SETTINGS_KEY);
      const settings = { ...DEFAULT_SETTINGS, ...(stored?.[SETTINGS_KEY] || {}) };
      captureEnabled = settings.autoCapture !== false;
    } catch {
      captureEnabled = true;
    }
  }

  function observeCaptureSettings() {
    const storage = globalThis.chrome?.storage?.onChanged;
    if (!storage || typeof storage.addListener !== "function") {
      return;
    }

    storage.addListener((changes, areaName) => {
      if (areaName !== "local" || !changes[SETTINGS_KEY]) {
        return;
      }

      const settings = { ...DEFAULT_SETTINGS, ...(changes[SETTINGS_KEY].newValue || {}) };
      captureEnabled = settings.autoCapture !== false;
      if (captureEnabled) {
        lastFingerprint = "";
        scheduleCapture("settings-enabled");
      } else {
        window.clearTimeout(captureTimer);
      }
    });
  }

  function observeDeepSeekNetwork() {
    if (platform.key !== "deepseek") {
      return;
    }

    window.addEventListener("message", (event) => {
      if (event.source !== window || event.origin !== location.origin) {
        return;
      }
      const packet = event.data;
      if (!packet || packet.source !== DEEPSEEK_NETWORK_SOURCE) {
        return;
      }

      const structured = parseDeepSeekStructuredConversationText(packet.responseText);
      const messages = structured.messages.length ? structured.messages : parseDeepSeekNetworkPacket(packet);
      if (!messages.length) {
        return;
      }

      if (structured.messages.length) {
        deepSeekNetworkMessages = structured.messages;
        deepSeekNetworkTitle = structured.title || deepSeekNetworkTitle;
      } else {
        deepSeekNetworkMessages = mergeDeepSeekMessageSets(deepSeekNetworkMessages, messages);
      }
      scheduleCapture("deepseek-network");
    });

    window.postMessage({ source: DEEPSEEK_NETWORK_BUFFER_REQUEST_SOURCE }, location.origin);
  }

  function observeRuntimeCommands() {
    const runtime = globalThis.chrome?.runtime;
    if (!runtime?.onMessage || typeof runtime.onMessage.addListener !== "function") {
      return;
    }

    runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (!message || message.type !== "cbv:force-capture") {
        return false;
      }

      if (!captureEnabled) {
        sendResponse({ ok: false, reason: "capture-disabled" });
        return false;
      }

      lastFingerprint = "";
      capture("manual-refresh")
        .then((result) => sendResponse({ ok: true, result }))
        .catch((error) => sendResponse({ ok: false, reason: String(error?.message || error) }));
      return true;
    });
  }

  function observePage() {
    const observer = new MutationObserver(() => {
      scheduleCapture("mutation");
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  function observeUrlChanges() {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function pushState(...args) {
      const result = originalPushState.apply(this, args);
      handlePossibleUrlChange();
      return result;
    };

    history.replaceState = function replaceState(...args) {
      const result = originalReplaceState.apply(this, args);
      handlePossibleUrlChange();
      return result;
    };

    window.addEventListener("popstate", handlePossibleUrlChange);
    window.setInterval(handlePossibleUrlChange, URL_CHECK_MS);
  }

  function handlePossibleUrlChange() {
    if (location.href === lastUrl) {
      return;
    }
    lastUrl = location.href;
    lastFingerprint = "";
    if (platform.key === "deepseek") {
      deepSeekNetworkMessages = [];
      deepSeekNetworkTitle = "";
    }
    scheduleCapture("url-change");
  }

  function scheduleCapture(reason) {
    if (!captureEnabled) {
      return;
    }
    window.clearTimeout(captureTimer);
    captureTimer = window.setTimeout(() => {
      capture(reason);
    }, CAPTURE_DEBOUNCE_MS);
  }

  async function capture(reason) {
    if (!captureEnabled) {
      return { saved: false, reason: "capture-disabled" };
    }

    const snapshot = await buildSnapshot(reason);
    if (!snapshot || !snapshot.messages.length) {
      return { saved: false, reason: "empty-conversation" };
    }

    const nextFingerprint = hashString(JSON.stringify({
      platform: snapshot.platform,
      id: snapshot.id,
      title: snapshot.title,
      messages: snapshot.messages.map((message) => [
        message.role,
        message.text.length,
        hashString(message.text)
      ])
    }));

    if (nextFingerprint === lastFingerprint) {
      return { saved: false, reason: "unchanged" };
    }

    lastFingerprint = nextFingerprint;
    return sendRuntimeMessage({
      type: "cbv:conversation-snapshot",
      payload: snapshot
    }).then((response) => {
      if (response?.result?.reason === "auto-capture-disabled") {
        lastFingerprint = "";
      }
      return response?.result || { saved: false, reason: "unknown" };
    }).catch(() => {
      lastFingerprint = "";
      return { saved: false, reason: "runtime-unavailable" };
    });
  }

  function sendRuntimeMessage(message) {
    const runtime = globalThis.chrome?.runtime;
    if (!runtime || typeof runtime.sendMessage !== "function") {
      return Promise.reject(new Error("Extension runtime is unavailable."));
    }

    try {
      const result = runtime.sendMessage(message);
      return result && typeof result.then === "function"
        ? result
        : Promise.resolve(result);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  async function buildSnapshot(reason) {
    const structured = await buildStructuredSnapshot(reason);
    if (structured) {
      return structured;
    }

    return buildDomSnapshot(reason);
  }

  async function buildStructuredSnapshot(reason) {
    if (platform.key !== "chatgpt") {
      return null;
    }

    const id = getConversationIdFromUrl();
    if (!id) {
      return null;
    }

    if (chatGptBackendCache.id === id &&
      chatGptBackendCache.snapshot &&
      Date.now() - chatGptBackendCache.at < CHATGPT_BACKEND_MIN_INTERVAL_MS) {
      return {
        ...chatGptBackendCache.snapshot,
        capturedReason: reason,
        sourceUrl: location.href,
        sourceHost: location.host
      };
    }

    try {
      const raw = await fetchChatGptConversation(id);
      const snapshot = chatGptConversationToSnapshot(raw, reason);
      if (snapshot?.messages?.length) {
        chatGptBackendCache = {
          id,
          at: Date.now(),
          snapshot
        };
        return snapshot;
      }
    } catch {
      if (chatGptBackendCache.id === id && chatGptBackendCache.snapshot) {
        return {
          ...chatGptBackendCache.snapshot,
          capturedReason: reason,
          sourceUrl: location.href,
          sourceHost: location.host
        };
      }
    }

    return null;
  }

  function buildDomSnapshot(reason) {
    const extractedMessages = extractMessages();
    const messages = platform.key === "chatgpt"
      ? normalizeChatGptTurnMessages(extractedMessages)
      : extractedMessages;
    if (!messages.length) {
      return null;
    }

    const id = getConversationId(messages);
    const title = getConversationTitle(id, messages);

    return {
      id,
      platform: platform.key,
      platformLabel: platform.label,
      folderId: platform.key,
      folderLabel: platform.label,
      title,
      sourceUrl: location.href,
      sourceHost: location.host,
      capturedBy: "GPT Knowledge Base",
      capturedReason: reason,
      captureMethod: "dom",
      messages
    };
  }

  async function fetchChatGptConversation(id) {
    const token = await getChatGptAccessToken();
    const response = await fetch(`/backend-api/conversation/${encodeURIComponent(id)}`, {
      credentials: "include",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`ChatGPT conversation fetch failed: ${response.status}`);
    }

    return response.json();
  }

  async function getChatGptAccessToken() {
    const response = await fetch("/api/auth/session", {
      credentials: "include",
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`ChatGPT session fetch failed: ${response.status}`);
    }

    const session = await response.json();
    if (!session?.accessToken) {
      throw new Error("ChatGPT session did not include an access token.");
    }

    return session.accessToken;
  }

  function chatGptConversationToSnapshot(raw, reason) {
    if (!raw || typeof raw !== "object" || !raw.mapping || typeof raw.mapping !== "object") {
      return null;
    }

    const orderedNodes = orderChatGptNodes(raw.mapping, raw.current_node);
    const messages = [];

    for (const node of orderedNodes) {
      const message = node.message;
      if (!message || typeof message !== "object") {
        continue;
      }

      const role = normalizeRole(message.author?.role);
      if (role === "system" || role === "unknown" || message.metadata?.is_visually_hidden_from_conversation === true) {
        continue;
      }

      const text = chatGptContentToMarkdown(message.content, message);
      if (!text) {
        continue;
      }

      messages.push({
        id: message.id || node.id || `${role}-${messages.length}-${hashString(text.slice(0, 400))}`,
        role,
        text,
        index: messages.length,
        createdAt: epochToIso(message.create_time),
        model: readChatGptModel(message)
      });
    }

    const normalizedMessages = normalizeChatGptTurnMessages(messages);
    if (!normalizedMessages.length) {
      return null;
    }

    const id = raw.conversation_id || getConversationIdFromUrl() || `chatgpt-${hashString(location.href)}`;
    const title = normalizeText(raw.title || getCleanDocumentTitle()) || getConversationTitle(id, normalizedMessages);

    return {
      id,
      platform: platform.key,
      platformLabel: platform.label,
      folderId: platform.key,
      folderLabel: platform.label,
      title,
      sourceUrl: location.href,
      sourceHost: location.host,
      capturedBy: "GPT Knowledge Base",
      capturedReason: reason,
      captureMethod: "chatgpt-backend",
      messages: normalizedMessages
    };
  }

  function normalizeChatGptTurnMessages(messages) {
    const result = [];
    let userIndex = -1;

    for (let index = 0; index <= messages.length; index += 1) {
      const message = messages[index];
      if (index === messages.length || message?.role === "user") {
        if (userIndex >= 0) {
          result.push(...collapseChatGptTurnMessages(messages.slice(userIndex, index)));
        }
        userIndex = index;
      }
    }

    return result.map((message, index) => ({
      ...message,
      index
    }));
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
      .map((message) => normalizeText(message.text))
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

  function orderChatGptNodes(mapping, currentNodeId) {
    const chain = [];
    const seen = new Set();
    let nodeId = typeof currentNodeId === "string" ? currentNodeId : "";

    while (nodeId && !seen.has(nodeId)) {
      seen.add(nodeId);
      const node = mapping[nodeId];
      if (!node || typeof node !== "object") {
        break;
      }
      chain.push({ ...node, id: node.id || nodeId });
      nodeId = typeof node.parent === "string" ? node.parent : "";
    }

    if (chain.length) {
      return chain.reverse();
    }

    return Object.entries(mapping)
      .map(([id, node]) => ({ ...node, id: node?.id || id }))
      .filter((node) => node.message)
      .sort((a, b) => {
        const aTime = Number(a.message?.create_time || 0);
        const bTime = Number(b.message?.create_time || 0);
        if (aTime !== bTime) {
          return aTime - bTime;
        }
        return String(a.id || "").localeCompare(String(b.id || ""));
      });
  }

  function chatGptContentToMarkdown(content, message) {
    if (!content || typeof content !== "object") {
      return "";
    }

    const contentType = content.content_type;
    if (contentType === "model_editable_context" || contentType === "thoughts" || contentType === "reasoning_recap") {
      return "";
    }

    if (contentType === "code") {
      const code = firstString(content.text) || partsToMarkdown(content.parts);
      if (!code) {
        return "";
      }
      const language = firstString(content.language);
      return `\`\`\`${language || ""}\n${code}\n\`\`\``;
    }

    if (Array.isArray(content.parts)) {
      const text = partsToMarkdown(content.parts);
      if (text) {
        return text;
      }
    }

    const text = firstString(content.text);
    if (text) {
      return normalizeText(text);
    }

    const attachments = Array.isArray(message.metadata?.attachments) ? message.metadata.attachments : [];
    if (attachments.length) {
      return attachments
        .map((attachment) => `[File: ${firstString(attachment?.name) || firstString(attachment?.id) || "attachment"}]`)
        .join("\n");
    }

    return "";
  }

  function partsToMarkdown(parts) {
    const values = [];
    for (const part of parts || []) {
      if (typeof part === "string") {
        if (part.trim()) {
          values.push(part.trim());
        }
        continue;
      }

      if (!part || typeof part !== "object") {
        continue;
      }

      if (typeof part.text === "string" && part.text.trim()) {
        values.push(part.text.trim());
        continue;
      }

      const contentType = firstString(part.content_type);
      if (contentType === "image_asset_pointer") {
        values.push(`[Image: ${firstString(part.asset_pointer) || "image"}]`);
      }
    }

    return normalizeText(values.join("\n\n"));
  }

  function readChatGptModel(message) {
    return firstString(message.metadata?.model_slug) || firstString(message.metadata?.default_model_slug) || "";
  }

  function epochToIso(value) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return "";
    }
    return new Date(value * 1000).toISOString();
  }

  function firstString(value) {
    return typeof value === "string" && value.length > 0 ? value : "";
  }

  function extractMessages() {
    if (platform.key === "kimi") {
      const kimiMessages = collectKimiMessages();
      if (kimiMessages.length) {
        return kimiMessages;
      }
    }

    if (platform.key === "deepseek") {
      const deepSeekMessages = collectDeepSeekMessages();
      if (deepSeekMessages.length) {
        return deepSeekMessages;
      }
    }

    if (platform.key === "doubao") {
      const doubaoMessages = collectDoubaoMessages();
      if (isUsefulMessageSet(doubaoMessages)) {
        return doubaoMessages;
      }
    }

    if (platform.key === "yuanbao") {
      const yuanbaoMessages = collectYuanbaoMessages();
      if (isUsefulMessageSet(yuanbaoMessages)) {
        return yuanbaoMessages;
      }
    }

    if (platform.key === "qwen") {
      const qwenMessages = collectQwenMessages();
      if (qwenMessages.length && hasUsefulQwenMessageSet(qwenMessages)) {
        return qwenMessages;
      }
    }

    if (platform.key === "perplexity") {
      const perplexityMessages = collectPerplexityMessages();
      if (isUsefulMessageSet(perplexityMessages)) {
        return perplexityMessages;
      }
    }

    if (platform.key === "poe") {
      const poeMessages = collectPoeMessages();
      if (isUsefulMessageSet(poeMessages)) {
        return poeMessages;
      }
    }

    if (platform.key === "zhipu") {
      const zhipuMessages = collectZhipuMessages();
      if (isUsefulMessageSet(zhipuMessages)) {
        return zhipuMessages;
      }
    }

    if (platform.key === "huggingface") {
      const huggingFaceMessages = collectHuggingFaceMessages();
      if (isUsefulMessageSet(huggingFaceMessages)) {
        return huggingFaceMessages;
      }
    }

    const configured = collectMessages(platform.messageSources || []);
    if (platform.key === "qwen") {
      const qwenConfigured = repairQwenMessages(configured);
      if (qwenConfigured.length && hasUsefulQwenMessageSet(qwenConfigured)) {
        return qwenConfigured;
      }
    }

    if (platform.key === "gemini") {
      const geminiMessages = repairGeminiMessages(configured);
      if (isUsefulMessageSet(geminiMessages)) {
        return geminiMessages;
      }
    }

    if (platform.key === "claude") {
      const claudeMessages = collectClaudeMessages(configured);
      if (isUsefulMessageSet(claudeMessages)) {
        return claudeMessages;
      }
    }

    if (isUsefulMessageSet(configured)) {
      return configured;
    }

    const generic = collectMessages(GENERIC_MESSAGE_SOURCES);
    if (platform.key === "qwen") {
      const qwenGeneric = repairQwenMessages(generic);
      if (qwenGeneric.length && hasUsefulQwenMessageSet(qwenGeneric)) {
        return qwenGeneric;
      }
      return qwenGeneric.length ? qwenGeneric : repairQwenMessages(configured).length ? repairQwenMessages(configured) : collectQwenMessages();
    }

    if (isUsefulMessageSet(generic)) {
      return generic;
    }

    if (hasKnownRoles(configured) || hasKnownRoles(generic)) {
      return configured.length >= generic.length ? configured : generic;
    }

    return collectFallbackTranscript();
  }

  function isUsefulMessageSet(messages) {
    if (!messages.length) {
      return false;
    }

    const knownRoleCount = messages.filter((message) => message.role === "user" || message.role === "assistant").length;
    const hasUser = messages.some((message) => message.role === "user");
    const hasAssistant = messages.some((message) => message.role === "assistant");
    if (hasUser && hasAssistant) {
      return true;
    }

    if (messages.length === 1 && knownRoleCount === 1) {
      return true;
    }

    return false;
  }

  function hasKnownRoles(messages) {
    return messages.some((message) => message.role === "user" || message.role === "assistant");
  }

  function parseDeepSeekStructuredConversationText(text) {
    const result = { messages: [], title: "" };
    for (const parsed of parsePossibleJsonValues(String(text || ""))) {
      const payload = findDeepSeekConversationPayload(parsed);
      if (!payload) {
        continue;
      }

      const branch = getDeepSeekCurrentBranch(payload);
      const messages = deepSeekBranchToMessages(branch);
      if (messages.length) {
        result.messages = messages;
        result.title = normalizeText(payload.chat_session?.title || "");
        return result;
      }
    }
    return result;
  }

  function findDeepSeekConversationPayload(value, depth = 0) {
    if (!value || typeof value !== "object" || depth > 10) {
      return null;
    }
    if (Array.isArray(value.chat_messages) && value.chat_session && typeof value.chat_session === "object") {
      return value;
    }
    for (const child of Object.values(value)) {
      if (!child || typeof child !== "object") {
        continue;
      }
      const payload = findDeepSeekConversationPayload(child, depth + 1);
      if (payload) {
        return payload;
      }
    }
    return null;
  }

  function getDeepSeekCurrentBranch(payload) {
    const messages = Array.isArray(payload?.chat_messages) ? payload.chat_messages : [];
    const byId = new Map();
    for (const message of messages) {
      const id = String(message?.message_id || message?.id || "");
      if (id) {
        byId.set(id, message);
      }
    }

    const branch = [];
    const seen = new Set();
    let currentId = String(payload?.chat_session?.current_message_id || "");
    while (currentId && byId.has(currentId) && !seen.has(currentId)) {
      seen.add(currentId);
      const message = byId.get(currentId);
      branch.unshift(message);
      currentId = String(message?.parent_id || "");
    }

    if (branch.length) {
      return branch;
    }

    return [...messages].sort((a, b) => {
      const aTime = Number(a?.inserted_at || a?.created_at || 0);
      const bTime = Number(b?.inserted_at || b?.created_at || 0);
      return aTime - bTime;
    });
  }

  function deepSeekBranchToMessages(branch) {
    const result = [];
    for (const source of branch || []) {
      const role = normalizeNetworkRole(source?.role || source?.message_role || source?.type);
      if (role !== "user" && role !== "assistant") {
        continue;
      }

      const sourceId = String(source?.message_id || source?.id || hashString(JSON.stringify(source).slice(0, 800)));
      const thinking = role === "assistant"
        ? firstNetworkText(source?.thinking_content, source?.reasoning_content, source?.reasoningContent)
        : "";
      if (thinking) {
        result.push({
          id: `thinking-${sourceId}`,
          role: "thinking",
          text: normalizeText(thinking),
          index: result.length
        });
      }

      const text = normalizeText(stripDeepSeekVolatileText(readDeepSeekNetworkContent(source)));
      if (!text || isDeepSeekControlLine(text)) {
        continue;
      }
      result.push({
        id: sourceId,
        role,
        text,
        index: result.length
      });
    }
    return result;
  }

  function parseDeepSeekNetworkPacket(packet) {
    const requestMessages = parseDeepSeekNetworkText(packet.requestText, "request");
    const responseMessages = parseDeepSeekNetworkText(packet.responseText, "response");
    const streamAssistant = parseDeepSeekStreamAssistant(packet.responseText);

    const messages = [...requestMessages, ...responseMessages];
    if (streamAssistant) {
      messages.push({
        id: `deepseek-stream-${hashString(streamAssistant.slice(0, 600))}`,
        role: "assistant",
        text: streamAssistant,
        index: messages.length
      });
    }

    return normalizeDeepSeekNetworkMessages(messages);
  }

  function parseDeepSeekNetworkText(text, context) {
    const value = String(text || "").trim();
    if (!value) {
      return [];
    }

    const parsedValues = parsePossibleJsonValues(value);
    const messages = [];
    for (const parsed of parsedValues) {
      collectDeepSeekMessagesFromJson(parsed, context, messages);
    }

    return normalizeDeepSeekNetworkMessages(messages);
  }

  function parsePossibleJsonValues(text) {
    const values = [];
    const addJson = (candidate) => {
      const value = String(candidate || "").trim();
      if (!value || !/^[\[{]/.test(value)) {
        return;
      }
      try {
        values.push(JSON.parse(value));
      } catch {
        // Ignore partial streaming fragments here; SSE parsing handles those separately.
      }
    };

    addJson(text);

    if (/=/.test(text) && !values.length) {
      try {
        const params = new URLSearchParams(text);
        for (const [, value] of params.entries()) {
          addJson(value);
        }
      } catch {
        // Ignore malformed form bodies.
      }
    }

    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) {
        continue;
      }
      const payload = trimmed.replace(/^data:\s*/, "");
      if (payload && payload !== "[DONE]") {
        addJson(payload);
      }
    }

    return values;
  }

  function collectDeepSeekMessagesFromJson(value, context, out, depth = 0) {
    if (depth > 8 || value == null) {
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        collectDeepSeekMessagesFromJson(item, context, out, depth + 1);
      }
      return;
    }

    if (typeof value !== "object") {
      return;
    }

    const role = normalizeNetworkRole(
      value.role ||
      value.sender ||
      value.author?.role ||
      value.message_role ||
      value.messageRole ||
      value.type
    );
    const content = readDeepSeekNetworkContent(value);
    if (role !== "unknown" && content) {
      out.push({
        id: asDeepSeekNetworkId(value, role, content),
        role,
        text: content,
        index: out.length
      });
    } else {
      const inferred = inferDeepSeekNetworkPair(value, context);
      if (inferred) {
        out.push({
          id: asDeepSeekNetworkId(value, inferred.role, inferred.text),
          role: inferred.role,
          text: inferred.text,
          index: out.length
        });
      }
    }

    for (const [key, child] of Object.entries(value)) {
      if (key === "reasoning_content" || key === "reasoningContent" || key === "thinking" || key === "thought") {
        continue;
      }
      collectDeepSeekMessagesFromJson(child, context, out, depth + 1);
    }
  }

  function inferDeepSeekNetworkPair(value, context) {
    if (!value || typeof value !== "object") {
      return null;
    }

    const userText = firstNetworkText(value.prompt, value.query, value.question, value.user_input, value.userInput, value.input);
    if (userText && context === "request") {
      return { role: "user", text: userText };
    }

    const assistantText = firstNetworkText(value.answer, value.response, value.output, value.completion, value.result);
    if (assistantText && context === "response") {
      return { role: "assistant", text: assistantText };
    }

    const choiceText = readDeepSeekChoiceContent(value);
    if (choiceText && context === "response") {
      return { role: "assistant", text: choiceText };
    }

    return null;
  }

  function readDeepSeekNetworkContent(value) {
    const direct = firstNetworkText(value.content, value.text, value.message, value.body);
    if (direct) {
      return direct;
    }

    if (Array.isArray(value.content)) {
      const parts = value.content
        .map((part) => typeof part === "string" ? part : firstNetworkText(part?.text, part?.content))
        .filter(Boolean);
      return normalizeText(parts.join("\n\n"));
    }

    return readDeepSeekChoiceContent(value);
  }

  function readDeepSeekChoiceContent(value) {
    const choices = Array.isArray(value?.choices) ? value.choices : [];
    const chunks = [];
    for (const choice of choices) {
      const delta = choice?.delta || choice?.message || choice;
      const text = firstNetworkText(delta?.content, delta?.text, delta?.answer);
      if (text) {
        chunks.push(text);
      }
    }
    return normalizeText(chunks.join(""));
  }

  function parseDeepSeekStreamAssistant(text) {
    const lines = String(text || "").split("\n");
    const chunks = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) {
        continue;
      }
      const payload = trimmed.replace(/^data:\s*/, "");
      if (!payload || payload === "[DONE]") {
        continue;
      }
      try {
        const parsed = JSON.parse(payload);
        const content = readDeepSeekChoiceContent(parsed);
        if (content) {
          chunks.push(content);
        }
      } catch {
        // Skip non-JSON events.
      }
    }
    return normalizeText(chunks.join(""));
  }

  function normalizeDeepSeekNetworkMessages(messages) {
    const seen = new Set();
    return (messages || [])
      .map((message) => ({
        ...message,
        role: normalizeRole(message.role),
        text: normalizeText(stripDeepSeekVolatileText(message.text))
      }))
      .filter((message) => {
        if (!message.text || message.role === "unknown" || isDeepSeekControlLine(message.text)) {
          return false;
        }
        const signature = `${message.role}:${hashString(message.text)}`;
        if (seen.has(signature)) {
          return false;
        }
        seen.add(signature);
        return true;
      })
      .map((message, index) => ({
        id: message.id || `${message.role}-${index}-${hashString(message.text.slice(0, 400))}`,
        role: message.role,
        text: message.text,
        index
      }));
  }

  function normalizeNetworkRole(role) {
    const value = String(role || "").toLowerCase();
    if (/\b(user|human|prompt|question|query)\b/.test(value) || /(用户|提问|问题)/.test(value)) {
      return "user";
    }
    if (/\b(assistant|answer|response|model|bot|ai)\b/.test(value) || /(助手|回答|回复|模型)/.test(value)) {
      return "assistant";
    }
    if (/\b(system|developer|tool)\b/.test(value)) {
      return normalizeRole(value);
    }
    return "unknown";
  }

  function firstNetworkText(...values) {
    for (const value of values) {
      if (typeof value === "string" && normalizeText(value)) {
        return normalizeText(value);
      }
    }
    return "";
  }

  function asDeepSeekNetworkId(value, role, text) {
    return String(value?.id || value?.message_id || value?.messageId || value?.uuid || "") ||
      `${role}-${hashString(text.slice(0, 600))}`;
  }

  function collectDeepSeekMessages() {
    const networkMessages = deepSeekNetworkMessages;
    if (hasBothConversationRoles(networkMessages)) {
      return networkMessages;
    }

    const directMessages = collectMessages([
      { selector: "[data-role='user'], [data-message-author-role='user']", role: "user", minLength: 1 },
      { selector: "[data-role='assistant'], [data-message-author-role='assistant']", role: "assistant", minLength: 1 },
      { selector: ".ds-markdown", role: "assistant", minLength: 1 }
    ]);
    const bubbleMessages = collectDeepSeekUserBubbles();
    const stableDomMessages = mergeDeepSeekMessageSets(bubbleMessages, directMessages);
    if (hasBothConversationRoles(stableDomMessages)) {
      return mergeDeepSeekMessageSets(networkMessages, stableDomMessages);
    }

    const layoutMessages = collectDeepSeekMessagesFromLayout();
    return mergeDeepSeekMessageSets(networkMessages, stableDomMessages, layoutMessages);
  }

  function collectDeepSeekUserBubbles() {
    const root = findConversationRoot();
    if (!root) {
      return [];
    }

    const leaves = Array.from(root.querySelectorAll("p, span, div"))
      .filter((node) => isVisible(node) && !node.querySelector("p, span, div, table, pre, ul, ol"))
      .filter((node) => {
        const text = extractText(node);
        return isViableDeepSeekUserText(text);
      });

    const entries = [];
    const seenContainers = new Set();
    for (const leaf of leaves) {
      const container = findDeepSeekUserBubbleContainer(leaf, root);
      if (!container || seenContainers.has(container)) {
        continue;
      }
      seenContainers.add(container);

      const text = cleanDeepSeekUserText(extractText(container, { keepControls: true }));
      if (!isViableDeepSeekUserText(text)) {
        continue;
      }

      entries.push({
        node: container,
        role: "user",
        text,
        rawId: readAttribute(container, "data-message-id") ||
          readAttribute(container, "data-testid") ||
          readAttribute(container, "id") ||
          `deepseek-user-${hashString(text.slice(0, 500))}`,
        source: { selector: "deepseek-user-bubble" }
      });
    }

    return dedupeAndOrderEntries(entries).map((entry, index) => ({
      id: entry.rawId || `user-${index}-${hashString(entry.text.slice(0, 400))}`,
      role: "user",
      text: entry.text,
      index
    }));
  }

  function findDeepSeekUserBubbleContainer(seed, root) {
    let current = seed;
    let best = null;
    const seedText = extractText(seed);

    while (current && current !== root && current !== document.body) {
      if (!(current instanceof Element) || current.matches("nav, aside, header, footer, form")) {
        break;
      }

      const text = cleanDeepSeekUserText(extractText(current, { keepControls: true }));
      if (!text || !text.includes(seedText)) {
        current = current.parentElement;
        continue;
      }

      const rect = current.getBoundingClientRect();
      const rightAligned = isRightAlignedDeepSeekBubble(rect);
      const hasAssistantStructure = Boolean(current.querySelector(".ds-markdown, table, pre, ul, ol, h1, h2, h3, h4"));
      const tooBroad = rect.width > Math.max(760, window.innerWidth * 0.72) || text.length > 3000;
      if (rightAligned && !hasAssistantStructure && !tooBroad) {
        best = current;
      }

      if (tooBroad || hasAssistantStructure) {
        break;
      }
      current = current.parentElement;
    }

    return best;
  }

  function isRightAlignedDeepSeekBubble(rect) {
    if (!rect || rect.width <= 0) {
      return false;
    }
    const center = rect.left + rect.width / 2;
    return rect.left > window.innerWidth * 0.28 &&
      center > window.innerWidth * 0.5 &&
      rect.right > window.innerWidth * 0.58;
  }

  function isViableDeepSeekUserText(text) {
    const value = cleanDeepSeekUserText(text);
    if (!value || value.length < 2 || value.length > 3000) {
      return false;
    }
    if (isPlatformChromeText(value) || isMessageControlLine(value) || isDeepSeekControlLine(value)) {
      return false;
    }
    return /[\p{L}\p{N}]/u.test(value);
  }

  function cleanDeepSeekUserText(text) {
    const lines = stripDeepSeekVolatileText(text)
      .split("\n")
      .map((line) => normalizeInlineMarkdown(line))
      .filter((line) => line && !isMessageControlLine(line) && !isDeepSeekControlLine(line));
    return normalizeText(lines.join("\n"));
  }

  function mergeDeepSeekMessageSets(...sets) {
    const root = findConversationRoot();
    const transcript = root ? normalizeText(extractText(root)) : "";
    const entries = [];
    let fallbackOrder = 0;

    for (const message of sets.flat()) {
      if (!message?.text) {
        continue;
      }
      const signature = `${message.role}:${hashString(message.text)}`;
      if (entries.some((entry) => entry.signature === signature || isNearDuplicateMessage(entry, message))) {
        continue;
      }
      const position = transcript ? transcript.indexOf(message.text) : -1;
      entries.push({
        ...message,
        signature,
        position,
        fallbackOrder
      });
      fallbackOrder += 1;
    }

    return entries
      .sort((a, b) => {
        if (a.position >= 0 && b.position >= 0 && a.position !== b.position) {
          return a.position - b.position;
        }
        return a.fallbackOrder - b.fallbackOrder;
      })
      .map((entry, index) => ({
        id: entry.id || `${entry.role}-${index}-${hashString(entry.text.slice(0, 400))}`,
        role: entry.role,
        text: entry.text,
        index
      }));
  }

  function isNearDuplicateMessage(existing, message) {
    if (existing.role !== message.role) {
      return false;
    }
    const first = normalizeText(existing.text);
    const second = normalizeText(message.text);
    if (!first || !second) {
      return false;
    }
    const shorter = first.length < second.length ? first : second;
    const longer = shorter === first ? second : first;
    return shorter.length > 24 && longer.includes(shorter);
  }

  function collectDeepSeekMessagesFromLayout() {
    const root = findConversationRoot();
    if (!root) {
      return [];
    }

    const selectors = [
      "article",
      "section",
      "div",
      "[data-role]",
      "[data-message-author-role]",
      "[data-testid]",
      ".ds-markdown"
    ].join(",");
    const entries = [];
    const nodes = queryAllSafe(selectors)
      .filter((node) => root.contains(node) && node !== root && isVisible(node));

    for (const node of nodes) {
      if (node.matches("nav, aside, header, footer, form") ||
        node.querySelector("textarea, input, [contenteditable='true']")) {
        continue;
      }

      const rect = node.getBoundingClientRect();
      if (rect.width < 24 || rect.height < 14 || rect.height > window.innerHeight * 0.92) {
        continue;
      }

      const text = extractText(node);
      if (!isViableMessageText(text, 1) || isPlatformChromeText(text)) {
        continue;
      }

      if (text.length > 24000 || (inferDeepSeekRole(node, text) !== "user" && hasDeepSeekChildWithSameText(node, text))) {
        continue;
      }

      const role = inferDeepSeekRole(node, text);
      if (role === "unknown") {
        continue;
      }

      entries.push({
        node,
        role,
        text,
        rawId: readAttribute(node, "data-message-id") ||
          readAttribute(node, "data-testid") ||
          readAttribute(node, "id") ||
          `${role}-${hashString(text.slice(0, 500))}`,
        source: { selector: "deepseek-layout" }
      });
    }

    return dedupeAndOrderEntries(pruneContainerEntries(entries)).map((entry, index) => ({
      id: entry.rawId || `${entry.role}-${index}-${hashString(entry.text.slice(0, 400))}`,
      role: entry.role,
      text: entry.text,
      index
    }));
  }

  function hasDeepSeekChildWithSameText(node, text) {
    return Array.from(node.children).some((child) => {
      if (!isVisible(child)) {
        return false;
      }
      const childText = extractText(child);
      if (!childText) {
        return false;
      }
      if (text.length < 40) {
        return childText === text;
      }
      return childText.length >= text.length * 0.86;
    });
  }

  function inferDeepSeekRole(node, text) {
    const explicitRole = normalizeRole(
      node.getAttribute("data-role") ||
      node.getAttribute("data-message-author-role") ||
      node.getAttribute("data-author") ||
      node.getAttribute("data-sender")
    );
    if (explicitRole !== "unknown") {
      return explicitRole;
    }

    const marker = [
      node.getAttribute("aria-label") || "",
      node.getAttribute("data-testid") || "",
      node.className || "",
      node.parentElement?.className || ""
    ].join(" ").toLowerCase();

    if (/\b(user|human|question|query|prompt|mine|self)\b/.test(marker) || /(用户|提问|问题)/.test(marker)) {
      return "user";
    }
    if (/\b(assistant|answer|response|markdown|model|bot|deepseek)\b/.test(marker) || /(助手|回答|回复|模型)/.test(marker)) {
      return "assistant";
    }

    const rect = node.getBoundingClientRect();
    const center = rect.left + rect.width / 2;
    const rightAligned = rect.left > window.innerWidth * 0.38 && center > window.innerWidth * 0.56;
    const hasAnswerStructure = Boolean(node.matches(".ds-markdown") || node.querySelector(".ds-markdown, table, pre, ul, ol, h1, h2, h3, h4")) ||
      /(^|\n)#{1,6}\s+|^\s*[-*+]\s+|^\s*\d+\.\s+|\|.+\||```/m.test(text);

    if (rightAligned && text.length <= 2400 && !hasAnswerStructure) {
      return "user";
    }
    if (hasAnswerStructure || text.length > 140) {
      return "assistant";
    }

    return "unknown";
  }

  function mergeMessageSets(primary, secondary) {
    const entries = [];
    let order = 0;
    for (const message of [...(primary || []), ...(secondary || [])]) {
      if (!message?.text) {
        continue;
      }
      entries.push({
        role: message.role,
        text: message.text,
        id: message.id || `${message.role}-${order}-${hashString(message.text.slice(0, 400))}`,
        order
      });
      order += 1;
    }

    const seen = new Set();
    return entries
      .filter((entry) => {
        const signature = `${entry.role}:${hashString(entry.text)}`;
        if (seen.has(signature)) {
          return false;
        }
        seen.add(signature);
        return true;
      })
      .sort((a, b) => a.order - b.order)
      .map((entry, index) => ({
        id: entry.id,
        role: entry.role,
        text: entry.text,
        index
      }));
  }

  function collectClaudeMessages(configuredMessages) {
    const directMessages = collectMessages([
      { selector: "[data-testid='user-message'], [data-testid*='user-message' i]", role: "user", minLength: 1 },
      { selector: "[data-testid='assistant-message'], [data-testid*='assistant-message' i]", role: "assistant", minLength: 1 },
      { selector: "[data-is-streaming]", role: "assistant", minLength: 1 },
      { selector: "[class*='font-user-message' i]", role: "user", minLength: 1 },
      { selector: "[class*='font-claude-message' i]", role: "assistant", minLength: 1 },
      { selector: "[class*='prose' i]", role: "assistant", minLength: MIN_GENERIC_MESSAGE_LENGTH },
      { selector: "[data-testid*='message' i]", inferRole: true, minLength: 1 },
      { selector: "article", inferRole: true, minLength: MIN_GENERIC_MESSAGE_LENGTH }
    ]);

    const ranged = collectClaudeMessagesFromDomGaps();
    if (hasBothConversationRoles(ranged)) {
      return ranged;
    }

    const anchorMessages = configuredMessages?.length ? configuredMessages : directMessages;
    const anchored = collectClaudeMessagesFromUserAnchors(anchorMessages);
    if (hasBothConversationRoles(anchored)) {
      return anchored;
    }

    if (hasBothConversationRoles(directMessages)) {
      return directMessages;
    }

    const candidates = [ranged, anchored, directMessages, anchorMessages].filter((messages) => messages?.length);
    return candidates.sort((a, b) => scoreMessageSet(b) - scoreMessageSet(a))[0] || [];
  }

  function collectClaudeMessagesFromDomGaps() {
    const root = findClaudeConversationRoot();
    if (!root) {
      return [];
    }

    const users = collectClaudeUserNodes(root);
    if (!users.length) {
      return [];
    }

    const result = [];
    for (let index = 0; index < users.length; index += 1) {
      const user = users[index];
      const nextUser = users[index + 1]?.node || null;
      const assistantText = cleanClaudeAssistantText(extractRangeText(root, user.node, nextUser));

      result.push({
        id: user.rawId || `user-${index}-${hashString(user.text.slice(0, 400))}`,
        role: "user",
        text: user.text,
        index: result.length
      });

      if (isViableMessageText(assistantText, MIN_GENERIC_MESSAGE_LENGTH)) {
        result.push({
          id: `assistant-${hashString(`${user.rawId || user.text}\n${assistantText.slice(0, 400)}`)}`,
          role: "assistant",
          text: assistantText,
          index: result.length
        });
      }
    }

    return result;
  }

  function collectClaudeUserNodes(root) {
    const entries = [];
    const selectors = [
      "[data-testid='user-message']",
      "[data-testid*='user-message' i]",
      "[class*='font-user-message' i]"
    ];

    for (const node of queryAllSafe(selectors.join(","))) {
      if (!root.contains(node) || !isVisible(node)) {
        continue;
      }

      const text = extractText(node);
      if (!isViableMessageText(text, 1)) {
        continue;
      }

      entries.push({
        node,
        role: "user",
        text,
        rawId: readAttribute(node, "data-message-id") ||
          readAttribute(node, "data-testid") ||
          readAttribute(node, "id"),
        source: { selector: "claude-user-anchor" }
      });
    }

    return dedupeAndOrderEntries(pruneContainerEntries(entries));
  }

  function findClaudeConversationRoot() {
    const users = queryAllSafe("[data-testid='user-message'], [data-testid*='user-message' i], [class*='font-user-message' i]")
      .filter((node) => isVisible(node));
    if (!users.length) {
      return findConversationRoot();
    }

    const userTextLength = users.reduce((total, node) => total + extractText(node).length, 0);
    let current = users[0].parentElement;
    while (current?.parentElement && current !== document.body) {
      if (users.every((node) => current.contains(node)) && !current.matches("nav, aside, header, footer, form")) {
        const text = extractText(current);
        if (text.length >= MIN_FALLBACK_TRANSCRIPT_LENGTH || text.length >= userTextLength + MIN_GENERIC_MESSAGE_LENGTH) {
          return current;
        }
      }
      current = current.parentElement;
    }

    return findConversationRoot();
  }

  function extractRangeText(root, startNode, endNode) {
    if (!root?.contains(startNode) || (endNode && !root.contains(endNode))) {
      return "";
    }

    try {
      const range = document.createRange();
      range.setStartAfter(startNode);
      if (endNode) {
        range.setEndBefore(endNode);
      } else {
        range.setEnd(root, root.childNodes.length);
      }

      const fragment = range.cloneContents();
      const text = extractFragmentText(fragment);
      range.detach?.();
      return text;
    } catch {
      return "";
    }
  }

  function extractFragmentText(fragment, options = {}) {
    const clone = fragment.cloneNode(true);
    const removeSelector = options.keepControls ? REMOVE_KEEPING_CONTROLS_SELECTOR : REMOVE_SELECTOR;
    clone.querySelectorAll(removeSelector).forEach((element) => element.remove());
    const text = normalizeText(Array.from(clone.childNodes).map(nodeToMarkdown).join(""));
    return options.keepControls ? text : stripMessageControls(text);
  }

  function scoreMessageSet(messages) {
    if (!messages?.length) {
      return 0;
    }

    const roleScore = hasBothConversationRoles(messages) ? 100000 : 0;
    const knownRoleCount = messages.filter((message) => message.role === "user" || message.role === "assistant").length;
    const assistantLength = messages
      .filter((message) => message.role === "assistant")
      .reduce((total, message) => total + normalizeText(message.text).length, 0);
    return roleScore + knownRoleCount * 1000 + Math.min(assistantLength, 50000);
  }

  function collectClaudeMessagesFromUserAnchors(messages) {
    const users = (messages || []).filter((message) => message.role === "user" && message.text);
    if (!users.length) {
      return [];
    }

    const root = findConversationRoot();
    if (!root) {
      return [];
    }

    const transcript = normalizeText(extractText(root));
    if (!transcript) {
      return [];
    }

    const result = [];
    let cursor = 0;
    for (let index = 0; index < users.length; index += 1) {
      const user = users[index];
      const start = transcript.indexOf(user.text, cursor);
      if (start < 0) {
        continue;
      }

      const userEnd = start + user.text.length;
      const nextUser = users[index + 1];
      const nextStart = nextUser ? transcript.indexOf(nextUser.text, userEnd) : -1;
      const assistantEnd = nextStart >= 0 ? nextStart : transcript.length;
      const assistantText = cleanClaudeAssistantText(transcript.slice(userEnd, assistantEnd));

      result.push({
        ...user,
        index: result.length
      });

      if (isViableMessageText(assistantText, MIN_GENERIC_MESSAGE_LENGTH)) {
        result.push({
          id: `assistant-${hashString(`${user.id || user.text}\n${assistantText.slice(0, 400)}`)}`,
          role: "assistant",
          text: assistantText,
          index: result.length
        });
      }

      cursor = userEnd;
    }

    return result;
  }

  function cleanClaudeAssistantText(text) {
    const lines = normalizeText(text)
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => {
        return line &&
          !/^Thought for (?:\d+\s*s|a few seconds)$/i.test(line) &&
          !/^Claude can make mistakes/i.test(line) &&
          !/^Please double-check/i.test(line) &&
          !isMessageControlLine(line);
      });
    return normalizeText(lines.join("\n"));
  }

  function hasBothConversationRoles(messages) {
    return Array.isArray(messages) &&
      messages.some((message) => message.role === "user") &&
      messages.some((message) => message.role === "assistant");
  }

  function collectQwenMessages() {
    const root = findConversationRoot();
    if (!root) {
      return [];
    }

    const selectors = [
      "[data-testid*='message' i]",
      "[data-role]",
      "[class*='message' i]",
      "[class*='bubble' i]",
      "[class*='chat' i][class*='item' i]",
      "[class*='markdown' i]",
      "[class*='answer' i]",
      "[class*='response' i]",
      "[class*='content' i]",
      "[class*='text' i]",
      "[class*='question' i]",
      "[class*='query' i]",
      "p",
      "li",
      "blockquote",
      "pre",
      "table",
      "h1",
      "h2",
      "h3",
      "h4",
      "article",
      "section"
    ].join(",");

    const entries = [];
    const seenNodes = new Set();
    const seeds = queryAllSafe(selectors)
      .filter((node) => root.contains(node) && node !== root && isVisible(node));

    for (const seed of seeds) {
      const node = findQwenMessageContainer(seed, root);
      if (!node || seenNodes.has(node) || !isVisible(node)) {
        continue;
      }
      seenNodes.add(node);

      if (node.matches("nav, aside, header, footer, form") ||
        node.closest("nav, aside, header, footer, form") ||
        node.querySelector("textarea, input, [contenteditable='true']")) {
        continue;
      }

      const rect = node.getBoundingClientRect();
      // Qwen source cards and embedded videos can make a single answer taller
      // than the viewport. Height is therefore not a reliable breadth signal.
      if (rect.width < 32 || rect.height < 18) {
        continue;
      }

      const text = cleanQwenText(extractText(node, { keepControls: true }));
      if (!isViableQwenMessageText(text)) {
        continue;
      }

      const role = inferQwenRole(node, text);
      if (role === "unknown" || (role !== "user" && isQwenSuggestionText(text))) {
        continue;
      }

      if (text.length > 26000 || (role !== "user" && hasQwenChildWithSameText(node, text))) {
        continue;
      }

      entries.push({
        node,
        role,
        text,
        rawId: readAttribute(node, "data-message-id") ||
          readAttribute(node, "data-testid") ||
          readAttribute(node, "id") ||
          `qwen-${role}-${hashString(text.slice(0, 500))}`,
        source: { selector: "qwen-layout" }
      });
    }

    const domMessages = repairQwenMessages(dedupeAndOrderEntries(pruneQwenContainerEntries(entries)).map((entry, index) => ({
      id: entry.rawId || `${entry.role}-${index}-${hashString(entry.text.slice(0, 400))}`,
      role: entry.role,
      text: entry.text,
      index
    })));
    const transcriptMessages = collectQwenMessagesFromUserAnchors(entries, root);
    return chooseMoreCompleteQwenMessages(domMessages, transcriptMessages);
  }

  function findQwenMessageContainer(seed, root) {
    const seedText = cleanQwenText(extractText(seed, { keepControls: true }));
    if (!seedText) {
      return seed;
    }

    let current = seed;
    let best = seed;
    const maxWidth = Math.max(520, window.innerWidth * 0.88);

    while (current.parentElement && current.parentElement !== root && current.parentElement !== document.body) {
      const parent = current.parentElement;
      if (parent.matches("nav, aside, header, footer, form") ||
        parent.querySelector("textarea, input, [contenteditable='true']")) {
        break;
      }

      const parentText = cleanQwenText(extractText(parent, { keepControls: true }));
      if (!parentText || !parentText.includes(seedText) || isQwenSidebarText(parentText)) {
        break;
      }

      const rect = parent.getBoundingClientRect();
      if (rect.width < 32 || rect.height < 18 || parentText.length > 60000) {
        break;
      }

      if (hasQwenOtherUserMessage(parent, current)) {
        break;
      }

      const blockCount = countContentBlocks(parent);
      const tooBroad = rect.width > maxWidth && blockCount > 80 && parentText.length > Math.max(seedText.length * 2, 1200);
      if (tooBroad) {
        break;
      }

      if (parentText.length >= seedText.length && blockCount <= 96) {
        best = parent;
      }

      current = parent;
    }

    return best;
  }

  function hasQwenOtherUserMessage(container, current) {
    const candidates = Array.from(container.querySelectorAll([
      "[data-role='user']",
      "[data-message-author-role='user']",
      "[class*='question' i]",
      "[class*='query' i]",
      "[class*='prompt' i]",
      "[class*='bubble' i]",
      "[class*='message' i]"
    ].join(",")));

    return candidates.some((candidate) => {
      if (!isVisible(candidate) || candidate === current || candidate.contains(current) || current.contains(candidate)) {
        return false;
      }
      const text = cleanQwenText(extractText(candidate, { keepControls: true }));
      return text.length >= 2 && text.length <= 4000 && inferQwenRole(candidate, text) === "user";
    });
  }

  function pruneQwenContainerEntries(entries) {
    const completeAssistantContainers = entries.filter((entry) => {
      return entry.role === "assistant" && isCompleteQwenAssistantContainer(entry, entries);
    });

    const withoutCoveredAssistantPieces = entries.filter((entry) => {
      if (completeAssistantContainers.includes(entry)) {
        return true;
      }
      return !completeAssistantContainers.some((container) => {
        return container !== entry &&
          container.node.contains(entry.node) &&
          entry.role === "assistant" &&
          entry.text.length > 0 &&
          container.text.includes(entry.text);
      });
    });

    return pruneContainerEntries(withoutCoveredAssistantPieces);
  }

  function collectQwenMessagesFromUserAnchors(entries, root) {
    const users = dedupeAndOrderEntries(entries.filter((entry) => entry.role === "user" && entry.text))
      .filter((entry) => isViableQwenMessageText(entry.text));
    if (!users.length) {
      return [];
    }

    const transcript = cleanQwenText(extractText(root, { keepControls: true }));
    if (!transcript) {
      return [];
    }

    const result = [];
    let cursor = 0;
    for (let index = 0; index < users.length; index += 1) {
      const user = users[index];
      const start = transcript.indexOf(user.text, cursor);
      if (start < 0) {
        continue;
      }

      const userEnd = start + user.text.length;
      const nextUser = users[index + 1];
      const nextStart = nextUser ? transcript.indexOf(nextUser.text, userEnd) : -1;
      const assistantEnd = nextStart >= 0 ? nextStart : transcript.length;
      const assistantText = cleanQwenAssistantTranscriptText(transcript.slice(userEnd, assistantEnd));

      result.push({
        id: user.rawId || `qwen-user-${index}-${hashString(user.text.slice(0, 300))}`,
        role: "user",
        text: user.text,
        index: result.length
      });

      if (isUsefulQwenAssistantText(assistantText)) {
        result.push({
          id: `qwen-assistant-${index}-${hashString(assistantText.slice(0, 400))}`,
          role: "assistant",
          text: assistantText,
          index: result.length
        });
      }

      cursor = userEnd;
    }

    return repairQwenMessages(result);
  }

  function cleanQwenAssistantTranscriptText(text) {
    const lines = cleanQwenText(text)
      .split("\n")
      .map((line) => normalizeText(line))
      .filter(Boolean);

    while (lines.length && (isQwenModelLabelText(lines[0]) || isQwenReferenceChromeLine(lines[0]))) {
      lines.shift();
    }
    while (lines.length && isQwenReferenceChromeLine(lines[lines.length - 1])) {
      lines.pop();
    }

    return normalizeText(lines.join("\n"));
  }

  function isCompleteQwenAssistantContainer(entry, entries) {
    const coveredAssistantParts = entries.filter((other) => {
      return other !== entry &&
        other.role === "assistant" &&
        entry.node.contains(other.node) &&
        other.text.length > 0 &&
        entry.text.includes(other.text);
    });
    if (!coveredAssistantParts.length) {
      return false;
    }

    const longestPartLength = Math.max(...coveredAssistantParts.map((part) => part.text.length));
    const hasExtraSummaryText = entry.text.length > longestPartLength + 40;
    const blockCount = countContentBlocks(entry.node);
    return hasExtraSummaryText || (coveredAssistantParts.length >= 2 && blockCount >= 3);
  }

  function chooseMoreCompleteQwenMessages(domMessages, transcriptMessages) {
    const domUseful = hasUsefulQwenMessageSet(domMessages);
    const transcriptUseful = hasUsefulQwenMessageSet(transcriptMessages);
    if (!domUseful) {
      return transcriptUseful ? transcriptMessages : domMessages;
    }
    if (!transcriptUseful) {
      return domMessages;
    }

    const domScore = scoreQwenMessageCompleteness(domMessages);
    const transcriptScore = scoreQwenMessageCompleteness(transcriptMessages);
    return transcriptScore > domScore ? transcriptMessages : domMessages;
  }

  function scoreQwenMessageCompleteness(messages) {
    const users = messages.filter((message) => message.role === "user");
    const assistants = messages.filter((message) => message.role === "assistant");
    const assistantChars = assistants.reduce((sum, message) => sum + cleanQwenText(message.text).length, 0);
    const userChars = users.reduce((sum, message) => sum + cleanQwenText(message.text).length, 0);
    return users.length * 1000000 +
      assistants.length * 100000 +
      Math.min(assistantChars, 500000) +
      Math.min(userChars, 50000);
  }

  function repairQwenMessages(messages) {
    const repaired = [];
    for (const message of messages || []) {
      const text = cleanQwenText(message.text);
      if (!isViableQwenMessageText(text)) {
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
        return existing.role === role && isNearDuplicateMessage(existing, { ...message, role, text });
      });
      if (duplicate) {
        continue;
      }

      repaired.push({
        ...message,
        role,
        text,
        index: repaired.length
      });
    }
    return mergeAdjacentQwenMessages(repaired);
  }

  function cleanQwenText(text) {
    const lines = normalizeText(text)
      .split("\n")
      .map((line) => normalizeText(line))
      .filter((line) => line && !isQwenChromeLine(line) && !isMessageControlLine(line));
    return normalizeText(lines.join("\n"));
  }

  function mergeAdjacentQwenMessages(messages) {
    const merged = [];
    for (const message of messages || []) {
      const previous = merged[merged.length - 1];
      if (previous && previous.role === "assistant" && message.role === "assistant") {
        previous.text = normalizeText(`${previous.text}\n\n${message.text}`);
        previous.id = `${previous.id}-${hashString(message.text.slice(0, 120))}`;
        continue;
      }
      merged.push({ ...message, index: merged.length });
    }
    return merged.map((message, index) => ({ ...message, index }));
  }

  function hasUsefulQwenMessageSet(messages) {
    return Array.isArray(messages) &&
      messages.some((message) => message.role === "user") &&
      messages.some((message) => message.role === "assistant" && isUsefulQwenAssistantText(message.text));
  }

  function isUsefulQwenAssistantText(text) {
    const value = cleanQwenText(text);
    return value.length >= 24 && !isQwenModelLabelText(value) && !isQwenSuggestionText(value);
  }

  function isViableQwenMessageText(text) {
    const value = normalizeText(text);
    if (!value || value.length < 2 || isPlatformChromeText(value) || isQwenSidebarText(value) || isQwenModelLabelText(value)) {
      return false;
    }
    if (value.length > 60000) {
      return false;
    }
    return /[\p{L}\p{N}]/u.test(value);
  }

  function isQwenSidebarText(text) {
    const lines = normalizeText(text)
      .split("\n")
      .map((line) => normalizeInlineMarkdown(line))
      .filter(Boolean);
    const markers = [
      "我的空间智能体",
      "对话分组",
      "新分组",
      "最近对话",
      "阿里 AI 助手",
      "阿里AI助手"
    ];
    const markerCount = lines.filter((line) => markers.includes(line)).length;
    return markerCount >= 2 || (markerCount >= 1 && lines.length > 8);
  }

  function isQwenChromeLine(line) {
    const value = normalizeInlineMarkdown(line)
      .replace(/[·|｜/]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!value) {
      return true;
    }
    return /^(我的空间智能体|对话分组|新分组|最近对话|阿里\s*AI\s*助手)$/.test(value) ||
      isQwenModelLabelText(value) ||
      isQwenReferenceChromeLine(value) ||
      /^(复制|分享|删除|编辑|重新生成|换一换|展开|收起|赞|踩|更多)$/.test(value) ||
      /^内容由\s*AI\s*生成/i.test(value);
  }

  function isQwenReferenceChromeLine(line) {
    const value = normalizeInlineMarkdown(line)
      .replace(/[·|｜/]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!value) {
      return false;
    }
    return /^\d+\s*篇参考来源\s*[>›]?$/.test(value) ||
      /^(参考来源|来源|引用|相关来源|相关网页|相关视频|视频来源|网页来源|搜索结果)$/.test(value) ||
      /^(展开|收起|打开|播放|查看更多|更多来源)$/.test(value) ||
      /^(du\s*){2,}$/i.test(value);
  }

  function isQwenModelLabelText(text) {
    const value = normalizeInlineMarkdown(text)
      .replace(/\s+/g, "")
      .replace(/[：:]+$/g, "");
    return /^(?:Qwen|QwQ|通义千问|千问)(?:[\d.]+)?(?:[-_–—]?(?:Max|Plus|Turbo|Coder|VL|Omni|Thinking|Instruct|Preview|Chat|Coder|Math))*$/i.test(value);
  }

  function isQwenSuggestionText(text) {
    const lines = normalizeText(text)
      .split("\n")
      .map((line) => normalizeInlineMarkdown(line))
      .filter(Boolean);
    if (lines.length < 2 || lines.length > 6) {
      return false;
    }
    return lines.every((line) => {
      return line.length <= 80 &&
        /[?？]\s*$/.test(line) &&
        !/^\s*(#{1,6}|[-*+]|\d+\.)\s+/.test(line);
    });
  }

  function inferQwenRole(node, text) {
    const explicitRole = normalizeRole(
      node.getAttribute("data-role") ||
      node.getAttribute("data-message-author-role") ||
      node.getAttribute("data-author") ||
      node.getAttribute("data-sender")
    );
    if (explicitRole !== "unknown") {
      return explicitRole;
    }

    const marker = [
      node.getAttribute("aria-label") || "",
      node.getAttribute("data-testid") || "",
      node.className || "",
      node.parentElement?.className || ""
    ].join(" ").toLowerCase();

    if (/\b(user|human|question|query|prompt|mine|self)\b/.test(marker) || /(用户|提问|问题|我说|你说)/.test(marker)) {
      return "user";
    }
    if (/\b(assistant|answer|response|markdown|model|bot|qwen|tongyi)\b/.test(marker) || /(助手|回答|回复|千问|通义|模型)/.test(marker)) {
      return "assistant";
    }

    const rect = node.getBoundingClientRect();
    const center = rect.left + rect.width / 2;
    const rightAligned = rect.left > window.innerWidth * 0.36 &&
      center > window.innerWidth * 0.55 &&
      rect.right > window.innerWidth * 0.62;
    const hasAnswerStructure = Boolean(node.querySelector("table, pre, ul, ol, h1, h2, h3, h4, [class*='markdown' i]")) ||
      /(^|\n)#{1,6}\s+|^\s*[-*+]\s+|^\s*\d+\.\s+|\|.+\||```/m.test(text);

    if (rightAligned && text.length <= 2600 && !hasAnswerStructure) {
      return "user";
    }
    if (hasAnswerStructure || text.length > 120) {
      return "assistant";
    }

    return inferQwenRoleFromText(text);
  }

  function inferQwenRoleFromText(text) {
    const value = normalizeText(text);
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

  function hasQwenChildWithSameText(node, text) {
    return Array.from(node.children).some((child) => {
      if (!isVisible(child)) {
        return false;
      }
      const childText = cleanQwenText(extractText(child, { keepControls: true }));
      if (!childText) {
        return false;
      }
      if (text.length < 40) {
        return childText === text;
      }
      const extraLength = Math.max(0, text.length - childText.length);
      return childText === text || extraLength <= Math.max(20, text.length * 0.03);
    });
  }

  function repairGeminiMessages(messages) {
    const cleaned = (messages || [])
      .map((message) => ({
        ...message,
        text: stripGeminiSpeakerText(message.text, message.role)
      }))
      .filter((message) => isViableMessageText(message.text, 1));

    return dedupeGeminiMessages(cleaned).map((message, index) => ({
      ...message,
      index
    }));
  }

  function stripGeminiSpeakerText(text, role) {
    const lines = normalizeText(text).split("\n");
    while (lines.length && isGeminiSpeakerLine(lines[0], role)) {
      lines.shift();
    }
    return normalizeText(lines.join("\n"));
  }

  function isGeminiSpeakerLine(line, role) {
    const value = normalizeInlineMarkdown(line)
      .replace(/[：:]+$/g, "")
      .replace(/\s+/g, " ")
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

  function dedupeGeminiMessages(messages) {
    const result = [];
    for (const message of messages) {
      const duplicate = result.some((existing) => {
        return existing.role === message.role &&
          areGeminiDuplicateTexts(existing.text, message.text);
      });
      if (!duplicate) {
        result.push(message);
      }
    }
    return result;
  }

  function areGeminiDuplicateTexts(first, second) {
    const a = normalizeInlineMarkdown(first);
    const b = normalizeInlineMarkdown(second);
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

  function collectDoubaoMessages() {
    const transcript = getDoubaoTranscriptText();
    const parts = splitDoubaoTranscriptText(transcript);
    return parts.map((part, index) => ({
      id: `${part.role}-${index}-${hashString(part.text.slice(0, 400))}`,
      role: part.role,
      text: part.text,
      index
    }));
  }

  function getDoubaoTranscriptText() {
    const roots = uniqueElements([
      findConversationRoot(),
      document.querySelector("main"),
      document.querySelector("[role='main']"),
      document.querySelector("[class*='conversation' i]"),
      document.querySelector("[class*='chat' i]"),
      document.querySelector("#root"),
      document.body
    ].filter(Boolean));

    const candidates = roots
      .map((node) => extractDoubaoText(node))
      .filter((text) => findDoubaoWarning(text))
      .map((text) => {
        const parts = splitDoubaoTranscriptText(text);
        const assistantText = parts.find((part) => part.role === "assistant")?.text || "";
        return {
          text,
          hasCompletePair: parts.length === 2,
          hasDivider: text.split("\n").some((line) => isDoubaoAssistantDividerLine(line)),
          assistantLength: assistantText.length,
          length: text.length
        };
      });

    if (!candidates.length) {
      return roots[0] ? extractDoubaoText(roots[0]) : "";
    }

    return candidates
      .sort((a, b) => {
        if (a.hasCompletePair !== b.hasCompletePair) {
          return a.hasCompletePair ? -1 : 1;
        }
        if (a.hasCompletePair && b.hasCompletePair && a.assistantLength !== b.assistantLength) {
          return b.assistantLength - a.assistantLength;
        }
        if (a.hasDivider !== b.hasDivider) {
          return a.hasDivider ? -1 : 1;
        }
        return a.length - b.length;
      })[0].text;
  }

  function extractDoubaoText(node) {
    const clone = node.cloneNode(true);
    const removeSelector = [
      "script",
      "style",
      "svg",
      "form",
      "nav",
      "aside",
      "footer",
      "textarea",
      "input",
      "select",
      "[aria-hidden='true']",
      "[hidden]",
      "[contenteditable='true']",
      ".sr-only",
      ".visually-hidden"
    ].join(",");

    clone.querySelectorAll(removeSelector).forEach((element) => element.remove());
    return normalizeText(Array.from(clone.childNodes).map(nodeToMarkdown).join(""));
  }

  function uniqueElements(elements) {
    return elements.filter((element, index) => {
      return element && elements.indexOf(element) === index;
    });
  }

  function splitDoubaoTranscriptText(text) {
    const value = normalizeText(text);
    const warning = findDoubaoWarning(value);
    if (!warning) {
      return [];
    }

    const body = stripDoubaoChromeLines(value.slice(warning.index + warning.text.length));
    const lines = body
      .split("\n")
      .map((line) => normalizeText(line))
      .filter(Boolean);
    if (lines.length < 2) {
      return [];
    }

    const assistantStart = lines.findIndex((line) => isDoubaoAssistantDividerLine(line));
    if (assistantStart <= 0 || assistantStart >= lines.length - 1) {
      return [];
    }

    const userText = normalizeText(lines.slice(0, assistantStart).join("\n"));
    const assistantText = normalizeText(lines.slice(assistantStart + 1).join("\n"));
    if (!userText || !assistantText) {
      return [];
    }

    return [
      { role: "user", text: userText },
      { role: "assistant", text: assistantText }
    ];
  }

  function extractDoubaoTitleFromText(text) {
    const value = normalizeText(text);
    const warning = findDoubaoWarning(value);
    if (!warning || warning.index <= 0) {
      return "";
    }

    const lines = value.slice(0, warning.index)
      .split("\n")
      .map((line) => normalizeInlineMarkdown(line))
      .filter((line) => line && !isDoubaoChromeLine(line));
    return lines.length ? lines[lines.length - 1].slice(0, 120) : "";
  }

  function getDoubaoPageTitle() {
    const warningNodes = queryAllSafe([
      "header",
      "[class*='header' i]",
      "[class*='title' i]",
      "[class*='warning' i]",
      "h1",
      "h2",
      "h3",
      "p",
      "span"
    ].join(","))
      .filter((node) => isVisible(node) && findDoubaoWarning(node.textContent || ""));

    for (const warningNode of warningNodes) {
      let current = warningNode;
      for (let depth = 0; current && depth < 6; depth += 1) {
        const title = extractDoubaoTitleFromText(current.textContent || "");
        if (isUsefulDoubaoTitle(title)) {
          return title;
        }
        current = current.parentElement;
      }
    }

    const topCandidates = queryAllSafe([
      "header h1",
      "header h2",
      "header h3",
      "header [class*='title' i]",
      "[class*='chat-title' i]",
      "[class*='conversation-title' i]",
      "h1",
      "h2"
    ].join(","))
      .filter((node) => isVisible(node))
      .map((node) => {
        const rect = node.getBoundingClientRect();
        const text = normalizeText(node.textContent || "");
        const marker = `${node.tagName} ${node.className || ""}`.toLowerCase();
        const score = (rect.top >= 0 && rect.top < 180 ? 400 : 0) +
          (/h1|h2|title/.test(marker) ? 250 : 0) +
          (rect.left + rect.width / 2 > window.innerWidth * 0.35 && rect.left + rect.width / 2 < window.innerWidth * 0.65 ? 120 : 0) -
          Math.min(text.length, 180);
        return { text, score };
      })
      .filter((candidate) => isUsefulDoubaoTitle(candidate.text))
      .sort((a, b) => b.score - a.score);

    return topCandidates[0]?.text || "";
  }

  function isUsefulDoubaoTitle(text) {
    const value = normalizeInlineMarkdown(text);
    return Boolean(value &&
      value.length >= 2 &&
      value.length <= 120 &&
      !findDoubaoWarning(value) &&
      !isDoubaoChromeLine(value) &&
      !/^(豆包|Doubao)$/i.test(value));
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
      return normalizeText(lines.join("\n"));
    }

    while (cutAt > 0 && !lines[cutAt - 1].trim()) {
      cutAt -= 1;
    }
    return normalizeText(lines.slice(0, cutAt).join("\n"));
  }

  function isDoubaoModeUiLine(line) {
    const value = normalizeInlineMarkdown(line).replace(/\s+/g, " ").trim();
    return /^(快速|PPT\s*生成|图像生成|帮我写作|音乐生成|翻译|视频生成|录音转写)$/i.test(value);
  }

  function isStrongDoubaoTrailingUiLine(line) {
    const value = normalizeInlineMarkdown(line).replace(/\s+/g, " ").trim();
    return /^在此处拖放文件\s*文件数量[：:]?\s*最多\s*\d+\s*个.*文件类型[：:]/.test(value) ||
      /^Timeline(?:$|关于|[\s:：])/i.test(value) ||
      /^v\d+(?:\.\d+){1,3}$/i.test(value) ||
      /^(Panel|闪记|保存到文件夹)$/i.test(value) ||
      /^[✓✔]?\s*已复制$/i.test(value);
  }

  function isDoubaoTrailingUiLine(line) {
    const value = normalizeInlineMarkdown(line).replace(/\s+/g, " ").trim();
    return isDoubaoModeUiLine(value) ||
      isStrongDoubaoTrailingUiLine(value) ||
      /^追问$/.test(value);
  }

  function isDoubaoChromeLine(line) {
    const value = normalizeInlineMarkdown(line)
      .replace(/[·|｜/]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return !value ||
      /^AI\s*生成可能有误\s*注意核实$/.test(value) ||
      /^参考\s*\d+\s*篇(?:资料|来源|网页|文献)\s*[>›]?$/.test(value) ||
      /^(重新生成|复制|分享|删除|编辑|赞|踩|更多)$/.test(value);
  }

  function isDoubaoAssistantDividerLine(line) {
    const value = normalizeInlineMarkdown(line)
      .replace(/\s+/g, " ")
      .trim();
    return /^已完成(?:深度)?思考(?:\s*[（(][^）)]{0,40}[）)])?\s*$/i.test(value) ||
      /^搜索\s*\d+\s*个关键词(?:\s*[，,]?\s*参考\s*\d+\s*篇(?:资料|来源|网页|文献))?\s*[>›]?$/.test(value) ||
      /^已完成[^，,。.!?]{0,30}生成\s*[（(]\s*\d+\s*(?:h|小时|m|min|分钟|分)?\s*\d*\s*(?:s|秒)?\s*[）)]\s*$/i.test(value) ||
      /^已完成\s*[，,]\s*参考.{0,24}篇参考\s*$/.test(value) ||
      /^已完成\s*[，,]\s*.{0,36}(参考|资料|网页|文献)\s*$/.test(value);
  }

  function collectKimiMessages() {
    const root = findConversationRoot();
    if (!root) {
      return [];
    }

    const seedSelectors = [
      "[data-role]",
      "[data-testid*='message' i]",
      "[class*='message' i]",
      "[class*='chat-item' i]",
      "[class*='conversation-item' i]",
      "[class*='bubble' i]",
      "[class*='markdown' i]",
      "article",
      "table",
      "pre",
      "h1",
      "h2",
      "h3",
      "h4",
      "ul",
      "ol"
    ];

    const seeds = Array.from(root.querySelectorAll(seedSelectors.join(",")))
      .filter((node) => isVisible(node) && !isPlatformChromeText(node.textContent || ""));

    const entries = [];
    const seenNodes = new Set();

    for (const seed of seeds) {
      const node = findKimiMessageContainer(seed, root);
      if (!node || seenNodes.has(node) || !isVisible(node)) {
        continue;
      }
      seenNodes.add(node);

      const rawText = stripKimiUiChrome(extractText(node, { keepControls: true }));
      const splitParts = splitKimiCombinedText(rawText, { allowPromptAnswer: false });
      if (splitParts.length) {
        splitParts.forEach((part, partIndex) => {
          entries.push({
            node,
            role: part.role,
            text: part.text,
            rawId: `${readAttribute(node, "data-message-id") ||
              readAttribute(node, "data-testid") ||
              readAttribute(node, "id") ||
              hashString(rawText.slice(0, 500))}-${part.role}-${partIndex}`,
            source: { selector: "kimi-split-turn" }
          });
        });
        continue;
      }

      const text = stripKimiUiChrome(stripMessageControls(rawText));
      if (!isViableMessageText(text, 1)) {
        continue;
      }

      const role = inferKimiRole(node, rawText);
      if (role === "unknown" && looksLikeMarkdownFragmentOnly(node, text)) {
        continue;
      }

      const promptAnswerParts = role !== "user"
        ? splitKimiCombinedText(text, { allowPromptAnswer: true })
        : [];
      if (promptAnswerParts.length) {
        promptAnswerParts.forEach((part, partIndex) => {
          entries.push({
            node,
            role: part.role,
            text: part.text,
            rawId: `${readAttribute(node, "data-message-id") ||
              readAttribute(node, "data-testid") ||
              readAttribute(node, "id") ||
              hashString(text.slice(0, 500))}-${part.role}-${partIndex}`,
            source: { selector: "kimi-prompt-answer" }
          });
        });
        continue;
      }

      entries.push({
        node,
        role,
        text,
        rawId: readAttribute(node, "data-message-id") ||
          readAttribute(node, "data-testid") ||
          readAttribute(node, "id") ||
          `${role}-${hashString(text.slice(0, 500))}`,
        source: { selector: "kimi-turn" }
      });
    }

    return dedupeAndOrderEntries(pruneContainerEntries(entries)).map((entry, index) => ({
      id: entry.rawId || `${entry.role}-${index}-${hashString(entry.text.slice(0, 400))}`,
      role: entry.role,
      text: entry.text,
      index
    }));
  }

  function findConversationRoot() {
    return document.querySelector("main") ||
      document.querySelector("[role='main']") ||
      document.querySelector("[class*='conversation' i]") ||
      document.querySelector("[class*='chat' i]") ||
      document.body;
  }

  function findKimiMessageContainer(seed, root) {
    let current = seed;
    let best = seed;
    const seedText = extractText(seed);
    const maxWidth = Math.max(480, window.innerWidth * 0.86);

    while (current.parentElement && current.parentElement !== root && current.parentElement !== document.body) {
      const parent = current.parentElement;
      if (parent.matches("nav, aside, header, footer, form") || parent.querySelector("textarea, input, [contenteditable='true']")) {
        break;
      }

      const rect = parent.getBoundingClientRect();
      const rawText = stripKimiUiChrome(extractText(parent, { keepControls: true }));
      const text = stripKimiUiChrome(stripMessageControls(rawText));
      if (!text || !text.includes(seedText)) {
        break;
      }

      if (hasEmbeddedKimiUserActionText(rawText)) {
        break;
      }

      if (rect.width > maxWidth && countContentBlocks(parent) > 8) {
        break;
      }

      if ((text.length > seedText.length || hasKimiUserActionText(rawText)) && text.length <= 16000) {
        best = parent;
      }

      current = parent;
    }

    return best;
  }

  function inferKimiRole(node, text) {
    const explicitRole = normalizeRole(
      node.getAttribute("data-role") ||
      node.getAttribute("data-message-author-role") ||
      node.getAttribute("data-author") ||
      node.getAttribute("data-sender")
    );
    if (explicitRole !== "unknown") {
      return explicitRole;
    }

    if (hasKimiUserActionText(text)) {
      return "user";
    }

    const marker = [
      node.getAttribute("data-role") || "",
      node.getAttribute("aria-label") || "",
      node.getAttribute("data-testid") || "",
      node.className || "",
      node.parentElement?.className || ""
    ].join(" ").toLowerCase();

    if (/\b(user|human|mine|question|query|prompt)\b/.test(marker)) {
      return "user";
    }
    if (/\b(assistant|answer|response|model|bot)\b/.test(marker)) {
      return "assistant";
    }

    const rect = node.getBoundingClientRect();
    const rightAligned = rect.left > window.innerWidth * 0.48 && rect.right > window.innerWidth * 0.68;
    const hasAnswerStructure = /(^|\n)#{1,6}\s+|^\s*[-*+]\s+|^\s*\d+\.\s+|\|.+\||```/m.test(text) ||
      Boolean(node.querySelector("table, pre, ul, ol, h1, h2, h3, h4, [class*='markdown' i]"));

    if (rightAligned && text.length <= 1000 && !hasAnswerStructure) {
      return "user";
    }

    if (hasAnswerStructure || text.length > 120) {
      return "assistant";
    }

    return "unknown";
  }

  function looksLikeMarkdownFragmentOnly(node, text) {
    const blockCount = countContentBlocks(node);
    const hasTable = Boolean(node.querySelector("table")) || /^\|.+\|\n\|/.test(text);
    return blockCount <= 2 && hasTable && !/[。！？.!?]\s*$/.test(text);
  }

  function countContentBlocks(node) {
    return node.querySelectorAll("p, li, table, pre, h1, h2, h3, h4, ul, ol, [class*='markdown' i]").length;
  }

  function splitKimiCombinedText(text, options = {}) {
    const lines = String(text || "").split("\n");
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
      const segment = normalizeText(lines.slice(start, markerIndex).join("\n"));
      const split = splitKimiSegmentBeforeAction(segment);
      addKimiPart(parts, "assistant", split.assistant);
      addKimiPart(parts, "user", split.user);
      start = markerIndex + 1;
    }

    addKimiPart(parts, "assistant", lines.slice(start).filter((line) => !isKimiUserActionLine(line)).join("\n"));
    return parts;
  }

  function splitKimiSegmentBeforeAction(segment) {
    const normalized = normalizeText(segment);
    const lines = normalized
      .split("\n")
      .map((line) => normalizeText(line))
      .filter(Boolean);
    const blocks = normalized
      .split(/\n{2,}/)
      .map((block) => normalizeText(block))
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
    const value = normalizeText(stripKimiUiChrome(text));
    if (isViableMessageText(value, 1)) {
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
      return normalizeText(lines.join("\n"));
    }

    let cutAt = markers[0];
    while (cutAt > 0 && !lines[cutAt - 1].trim()) {
      cutAt -= 1;
    }
    return normalizeText(lines.slice(0, cutAt).join("\n"));
  }

  function isStrongKimiUiChromeLine(line) {
    const value = normalizeInlineMarkdown(line);
    return /^(保存到文件夹|闪记|Panel|Timeline)$/i.test(value) ||
      /^K\d+(?:\.\d+)*\s*\S*$/i.test(value) ||
      /^v\d+(?:\.\d+){1,3}$/i.test(value) ||
      /^复制\s*LaTeX\s*公式/i.test(value);
  }

  function isKimiUiChromeLine(line) {
    const value = normalizeInlineMarkdown(line)
      .replace(/\s+/g, " ")
      .trim();
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
    const value = normalizeInlineMarkdown(prompt);
    if (!value || value.length > 1200) {
      return false;
    }

    return !/```|^\s*#{1,6}\s+|\|.+\|\n\|/m.test(prompt);
  }

  function splitKimiPromptAnswerText(text) {
    const blocks = normalizeText(text)
      .split(/\n{2,}/)
      .map((block) => normalizeText(block))
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
    const value = normalizeInlineMarkdown(prompt);
    if (!value || value.length > 120 || normalizeInlineMarkdown(answer).length < 8) {
      return false;
    }

    if (/```|^\s*#{1,6}\s+|^\s*[-*+]\s+|^\s*\d+\.\s+|\|.+\|/m.test(prompt)) {
      return false;
    }

    return /[?？]\s*$/.test(value) ||
      /(吗|么|呢|是否|是不是|有没有|能不能|会不会|为什么|为何|怎么|咋|如何|多少|哪个|哪些|什么|可否|能否)/.test(value);
  }

  function hasEmbeddedKimiUserActionText(text) {
    const lines = String(text || "").split("\n");
    const markerIndex = lines.findIndex((line) => isKimiUserActionLine(line));
    if (markerIndex < 0) {
      return false;
    }

    const before = normalizeText(lines.slice(0, markerIndex).join("\n"));
    const after = normalizeText(lines.slice(markerIndex + 1).join("\n"));
    return Boolean(before && after);
  }

  function hasKimiUserActionText(text) {
    const lines = String(text || "")
      .split("\n")
      .map((line) => normalizeInlineMarkdown(line))
      .filter(Boolean);
    const tail = lines.slice(-3).join(" ");
    return /(^|\s)(编辑|Edit)(\s|$)/i.test(tail) &&
      /(^|\s)(复制|Copy)(\s|$)/i.test(tail) &&
      /(^|\s)(分享|Share)(\s|$)/i.test(tail);
  }

  function collectYuanbaoMessages() {
    const primaryUserNodes = queryAllSafe(".agent-chat__bubble--human");
    const primaryAssistantNodes = queryAllSafe(".agent-chat__bubble--ai");
    const userNodes = primaryUserNodes.length
      ? primaryUserNodes
      : queryAllSafe(".agent-chat__conv--human");
    const assistantNodes = primaryAssistantNodes.length
      ? primaryAssistantNodes
      : queryAllSafe(".hyc-common-markdown");

    const entries = [
      ...userNodes.map((node) => ({ node, role: "user" })),
      ...assistantNodes.map((node) => ({ node, role: "assistant" }))
    ]
      .filter((entry) => isVisible(entry.node))
      .map((entry) => ({
        ...entry,
        text: extractText(entry.node),
        rawId: readAttribute(entry.node, "data-message-id") ||
          readAttribute(entry.node, "data-msg-id") ||
          readAttribute(entry.node, "data-id") ||
          readAttribute(entry.node, "id")
      }))
      .filter((entry) => isViableMessageText(entry.text, 1))
      .filter((entry, index, allEntries) => {
        return !allEntries.some((other, otherIndex) => {
          return otherIndex !== index &&
            other.role === entry.role &&
            entry.node.contains(other.node) &&
            entry.text.includes(other.text);
        });
      })
      .sort((a, b) => compareNodeOrder(a.node, b.node));

    return entries.map((entry, index) => ({
      id: entry.rawId || `${entry.role}-${index}-${hashString(entry.text.slice(0, 400))}`,
      role: entry.role,
      text: entry.text,
      index
    }));
  }

  function collectPerplexityMessages() {
    const userNodes = queryFirstVisibleSelector([
      "[data-testid='user-message-bubble']",
      "[data-testid*='user-message' i]",
      "[class*='UserMessage' i]",
      ".my-md"
    ]);
    const assistantNodes = queryFirstVisibleSelector([
      "[data-testid*='assistant-message' i]",
      "[class*='AssistantMessage' i]",
      "[class*='AnswerBody' i]",
      ".answer-text",
      ".prose",
      "article",
      "[data-testid*='answer' i]"
    ], (node) => !isPerplexityChromeNode(node));

    return finalizeExplicitRoleMessages([
      ...userNodes.map((node) => ({ node, role: "user" })),
      ...assistantNodes.map((node) => ({ node, role: "assistant" }))
    ], "perplexity");
  }

  function isPerplexityChromeNode(node) {
    const chromeAncestor = node.closest("nav, aside, header, footer, form");
    if (chromeAncestor) {
      return true;
    }

    let current = node;
    for (let depth = 0; current && depth < 5; depth += 1) {
      const marker = `${current.className || ""} ${current.getAttribute?.("data-testid") || ""}`.toLowerCase();
      if (/\b(source|citation|related|followup|suggestion|toolbar|composer)\b/.test(marker)) {
        return true;
      }
      current = current.parentElement;
    }
    return false;
  }

  function collectPoeMessages() {
    const rightSideSelector = [
      "[class*='ChatMessage_rightSide' i]",
      "[class*='humanMessageBubble' i]",
      "[class*='HumanMessage' i]:not([class*='Header' i])",
      "[class*='human_message_bubble' i]"
    ];
    const userNodes = queryFirstVisibleSelector(rightSideSelector);
    const assistantNodes = queryFirstVisibleSelector([
      "[class*='ChatMessage_messageWrapper' i]",
      "[class*='ChatMessage_wrapper' i]",
      "[class*='botMessageBubble' i]",
      "[class*='BotMessage' i]:not([class*='Header' i])",
      "[class*='bot_message_bubble' i]"
    ], (node) => !node.closest(rightSideSelector.join(",")));

    const entries = [
      ...userNodes.map((node) => ({ node, role: "user" })),
      ...assistantNodes.map((node) => ({ node, role: "assistant" }))
    ];
    if (!entries.length || !entries.some((entry) => entry.role === "user") || !entries.some((entry) => entry.role === "assistant")) {
      appendPoeMarkdownEntries(entries, rightSideSelector);
    }

    return finalizeExplicitRoleMessages(entries, "poe", { preferMarkdownChild: true });
  }

  function collectHuggingFaceMessages() {
    const userNodes = queryAllSafe("[data-message-type='user']");
    const assistantNodes = queryAllSafe("[data-message-role='assistant']");
    return finalizeExplicitRoleMessages([
      ...userNodes.map((node) => ({ node, role: "user" })),
      ...assistantNodes.map((node) => ({ node, role: "assistant" }))
    ], "huggingface");
  }

  function collectZhipuMessages() {
    const items = queryAllSafe(".item.conversation-item");
    const messages = [];

    for (const [itemIndex, item] of items.entries()) {
      const userNode = item.querySelector(".conversation.question .question-txt, .question-txt");
      const userText = cleanZhipuUserText(userNode ? extractText(userNode, { keepControls: true }) : "");
      if (isViableMessageText(userText, 1)) {
        messages.push({
          id: readAttribute(item, "data-message-id") ||
            readAttribute(item, "data-id") ||
            `zhipu-user-${itemIndex}-${hashString(userText.slice(0, 400))}`,
          role: "user",
          text: userText,
          index: messages.length
        });
      }

      const answerNodes = Array.from(item.querySelectorAll("[class*='answer-content-wrap' i]"))
        .filter((node) => !node.closest("[class*='text-advance-thinking' i]"));
      const answerNode = answerNodes[answerNodes.length - 1];
      const assistantText = answerNode ? extractText(answerNode) : "";
      if (isViableMessageText(assistantText, 1)) {
        messages.push({
          id: readAttribute(answerNode, "data-message-id") ||
            readAttribute(answerNode, "data-id") ||
            `zhipu-assistant-${itemIndex}-${hashString(assistantText.slice(0, 400))}`,
          role: "assistant",
          text: assistantText,
          index: messages.length
        });
      }
    }

    if (messages.length) {
      return messages;
    }

    const userNodes = queryAllSafe(".conversation.question .question-txt, .question-txt");
    const assistantNodes = queryAllSafe("[class*='answer-content-wrap' i]")
      .filter((node) => !node.closest("[class*='text-advance-thinking' i]"));
    const fallback = finalizeExplicitRoleMessages([
      ...userNodes.map((node) => ({ node, role: "user" })),
      ...assistantNodes.map((node) => ({ node, role: "assistant" }))
    ], "zhipu");

    return fallback.map((message, index) => ({
      ...message,
      text: message.role === "user" ? cleanZhipuUserText(message.text) : message.text,
      index
    })).filter((message) => isViableMessageText(message.text, 1));
  }

  function cleanZhipuUserText(text) {
    return normalizeText(String(text || "")
      .replace(/复制入框/g, "")
      .split("\n")
      .filter((line) => !isMessageControlLine(line))
      .join("\n"));
  }

  function appendPoeMarkdownEntries(entries, rightSideSelectors) {
    const seenContainers = new Set(entries.map((entry) => entry.node));
    const contentNodes = queryAllSafe([
      "[class*='Markdown_markdownContainer' i]",
      "[class*='Markdown_markdown' i]",
      "[class*='Prose_prose' i]"
    ].join(","));

    for (const contentNode of contentNodes) {
      if (!isVisible(contentNode)) {
        continue;
      }
      const container = findPoeMessageContainer(contentNode);
      if (!container || seenContainers.has(container)) {
        continue;
      }
      const role = container.closest(rightSideSelectors.join(",")) ? "user" : inferPoeRole(container);
      if (role === "unknown") {
        continue;
      }
      seenContainers.add(container);
      entries.push({ node: container, contentNode, role });
    }
  }

  function findPoeMessageContainer(node) {
    let current = node;
    for (let depth = 0; current && depth < 9; depth += 1) {
      const marker = `${current.className || ""} ${current.getAttribute?.("data-testid") || ""}`.toLowerCase();
      if (/(chatmessage|messagebubble|messagewrapper|humanmessage|botmessage)/.test(marker)) {
        return current;
      }
      current = current.parentElement;
    }
    return node;
  }

  function inferPoeRole(node) {
    let current = node;
    for (let depth = 0; current && depth < 6; depth += 1) {
      const marker = `${current.className || ""} ${current.getAttribute?.("data-testid") || ""}`.toLowerCase();
      if (/(rightside|human|user)/.test(marker)) {
        return "user";
      }
      if (/(leftside|botmessage|assistant)/.test(marker)) {
        return "assistant";
      }
      current = current.parentElement;
    }

    const rect = node.getBoundingClientRect();
    if (rect.width > 0 && rect.right > window.innerWidth * 0.72 && rect.left > window.innerWidth * 0.42) {
      return "user";
    }
    return rect.width > 0 ? "assistant" : "unknown";
  }

  function queryFirstVisibleSelector(selectors, predicate = () => true) {
    for (const selector of selectors) {
      const nodes = queryAllSafe(selector).filter((node) => isVisible(node) && predicate(node));
      if (nodes.length) {
        return nodes;
      }
    }
    return [];
  }

  function finalizeExplicitRoleMessages(entries, sourceName, options = {}) {
    const prepared = entries
      .filter((entry) => entry.node && isVisible(entry.node))
      .map((entry) => {
        const preferredContent = options.preferMarkdownChild
          ? entry.contentNode || entry.node.querySelector("[class*='Markdown_markdown' i], [class*='Prose_prose' i], [class*='markup' i], [class*='messageContent' i], .break-words")
          : null;
        const text = extractText(preferredContent || entry.node);
        return {
          ...entry,
          text,
          rawId: readAttribute(entry.node, "data-message-id") ||
            readAttribute(entry.node, "data-testid") ||
            readAttribute(entry.node, "data-id") ||
            readAttribute(entry.node, "id")
        };
      })
      .filter((entry) => isViableMessageText(entry.text, 1));

    const pruned = prepared.filter((entry, index) => {
      return !prepared.some((other, otherIndex) => {
        if (index === otherIndex || entry.role !== other.role || !entry.node.contains(other.node)) {
          return false;
        }
        return other.text === entry.text ||
          (entry.text.includes(other.text) && other.text.length >= entry.text.length * 0.72);
      });
    }).sort((a, b) => compareNodeOrder(a.node, b.node));

    const seenNodes = new Set();
    return pruned.filter((entry) => {
      if (seenNodes.has(entry.node)) {
        return false;
      }
      seenNodes.add(entry.node);
      return true;
    }).map((entry, index) => ({
      id: entry.rawId || `${sourceName}-${entry.role}-${index}-${hashString(entry.text.slice(0, 400))}`,
      role: entry.role,
      text: entry.text,
      index
    }));
  }

  function isKimiUserActionLine(line) {
    const value = normalizeInlineMarkdown(line)
      .replace(/[·|｜/]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return /(^|\s)(编辑|Edit)(\s|$)/i.test(value) &&
      /(^|\s)(复制|Copy)(\s|$)/i.test(value) &&
      /(^|\s)(分享|Share)(\s|$)/i.test(value) &&
      isMessageControlLine(value);
  }


  function collectMessages(sources) {
    const entries = [];
    const seenNodes = new Set();

    for (const source of sources) {
      const nodes = queryAllSafe(source.selector);
      for (const node of nodes) {
        if (seenNodes.has(node) || !isVisible(node)) {
          continue;
        }
        seenNodes.add(node);

        const text = extractText(node);
        if (!isViableMessageText(text, source.minLength)) {
          continue;
        }

        const role = inferRole(node, source);
        const rawId = readAttribute(node, source.idAttr) ||
          readAttribute(node, "data-message-id") ||
          readAttribute(node, "data-testid") ||
          readAttribute(node, "id");

        entries.push({
          node,
          role,
          text,
          rawId,
          source
        });
      }
    }

    return dedupeAndOrderEntries(pruneContainerEntries(entries)).map((entry, index) => ({
      id: entry.rawId || `${entry.role}-${index}-${hashString(entry.text.slice(0, 400))}`,
      role: entry.role,
      text: entry.text,
      index
    }));
  }

  function pruneContainerEntries(entries) {
    return entries.filter((entry) => {
      const covered = entries.filter((other) => {
        return other !== entry &&
          entry.node.contains(other.node) &&
          other.text.length > 0 &&
          entry.text.includes(other.text);
      });

      if (!covered.length) {
        return true;
      }

      if (entry.role === "unknown") {
        return false;
      }

      if (covered.length >= 2) {
        return false;
      }

      return !covered.some((other) => {
        const sameRole = other.role === entry.role;
        const nearDuplicate = other.text.length > 30 &&
          (entry.text === other.text || entry.text.length <= other.text.length * 1.2);
        return sameRole && nearDuplicate;
      });
    });
  }

  function dedupeAndOrderEntries(entries) {
    const ordered = entries.sort((a, b) => compareNodeOrder(a.node, b.node));
    const seen = new Set();
    const result = [];

    for (const entry of ordered) {
      const signature = [
        entry.role,
        hashString(entry.text),
        entry.rawId || ""
      ].join(":");

      if (seen.has(signature) || isCoveredByExistingEntry(entry, result)) {
        continue;
      }

      seen.add(signature);
      result.push(entry);
    }

    return result;
  }

  function isCoveredByExistingEntry(entry, existingEntries) {
    return existingEntries.some((existing) => {
      if (existing.role !== entry.role) {
        return false;
      }

      if (existing.text === entry.text) {
        return true;
      }

      const shorter = existing.text.length < entry.text.length ? existing : entry;
      const longer = shorter === existing ? entry : existing;
      return shorter.text.length > 30 && longer.text.includes(shorter.text);
    });
  }

  function collectFallbackTranscript() {
    if (!isConversationLikePage()) {
      return [];
    }

    const root = findTranscriptRoot();
    if (!root) {
      return [];
    }

    const text = extractText(root);
    if (text.length < MIN_FALLBACK_TRANSCRIPT_LENGTH) {
      return [];
    }

    return [{
      id: `page-${hashString(location.href)}`,
      role: "unknown",
      text,
      index: 0
    }];
  }

  function findTranscriptRoot() {
    const candidates = [
      document.querySelector("main"),
      document.querySelector("[role='main']"),
      document.querySelector("[data-testid*='conversation' i]"),
      document.querySelector("[class*='conversation' i]"),
      document.querySelector("#root"),
      document.body
    ].filter(Boolean);

    return candidates
      .map((node) => ({ node, textLength: extractText(node).length }))
      .filter((candidate) => candidate.textLength >= MIN_FALLBACK_TRANSCRIPT_LENGTH)
      .sort((a, b) => a.textLength - b.textLength)[0]?.node || null;
  }

  function getConversationIdFromUrl() {
    for (const pattern of platform.conversationPatterns || []) {
      const match = location.pathname.match(pattern);
      if (match?.[1]) {
        return match[1];
      }
    }

    if (platform.key === "yuanbao" || platform.key === "zhipu") {
      const params = new URLSearchParams(location.search);
      for (const key of ["conversationId", "conversation_id", "chatId", "chat_id", "cid", "id"]) {
        const value = params.get(key);
        if (value) {
          return value;
        }
      }
    }
    return "";
  }

  function getConversationId(messages) {
    const urlId = getConversationIdFromUrl();
    if (urlId) {
      return urlId;
    }

    const firstUserText = messages.find((message) => message.role === "user")?.text || "";
    const firstMessageText = messages[0]?.text || "";
    const basis = [
      platform.key,
      location.host,
      location.pathname,
      getCleanDocumentTitle(),
      firstUserText.slice(0, 240) || firstMessageText.slice(0, 240)
    ].join("\n");

    return `draft-${hashString(basis)}`;
  }

  function getConversationTitle(id, messages) {
    if (platform.key === "deepseek" && deepSeekNetworkTitle) {
      return trimToLength(deepSeekNetworkTitle, 90);
    }

    const sidebarTitle = getSidebarTitle(id);
    if (sidebarTitle) {
      return sidebarTitle;
    }

    if (platform.key === "doubao") {
      const doubaoTitle = getDoubaoPageTitle() || extractDoubaoTitleFromText(getDoubaoTranscriptText());
      if (doubaoTitle) {
        return trimToLength(doubaoTitle, 90);
      }
    }

    const documentTitle = getCleanDocumentTitle();
    if (documentTitle && documentTitle.toLowerCase() !== platform.label.toLowerCase()) {
      return documentTitle;
    }

    const firstUserText = messages.find((message) => message.role === "user")?.text || "";
    const firstMessageText = messages[0]?.text || "";
    const firstLine = (firstUserText || firstMessageText).split("\n").find(Boolean) || "";
    return trimToLength(firstLine, 90) || "Untitled conversation";
  }

  function getSidebarTitle(id) {
    if (!id) {
      return "";
    }

    const escaped = cssEscape(id);
    const candidates = [
      ...queryAllSafe(`a[href*="${escaped}"]`),
      ...queryAllSafe(`[data-href*="${escaped}"]`),
      ...queryAllSafe(`[data-testid*='conversation' i]`)
    ];

    for (const candidate of candidates) {
      const text = normalizeText(candidate.textContent || "");
      if (text && text.length <= 180 && !isPlatformChromeText(text)) {
        return text;
      }
    }

    return "";
  }

  function getCleanDocumentTitle() {
    let title = normalizeText(document.title || "");
    for (const pattern of platform.titlePatterns || []) {
      title = title.replace(pattern, "");
    }
    return title.trim();
  }

  function inferRole(node, source) {
    if (source.role) {
      return normalizeRole(source.role);
    }

    const attrRole = readAttribute(node, source.roleAttr) ||
      readAttribute(node, "data-message-author-role") ||
      readAttribute(node, "data-author") ||
      readAttribute(node, "data-sender") ||
      readAttribute(node, "data-role") ||
      readAttribute(node, "aria-label") ||
      readAttribute(node, "data-testid");

    const text = [
      attrRole,
      node.className || "",
      node.id || "",
      node.closest("[data-testid]")?.getAttribute("data-testid") || "",
      node.closest("[class]")?.className || ""
    ].join(" ").toLowerCase();

    if (/\b(user|human|prompt|question|query|you|me|mine|self)\b/.test(text) ||
      /(用户|提问|问题|本人)/.test(text)) {
      return "user";
    }

    if (/\b(assistant|answer|response|model|bot|ai|claude|grok|deepseek|kimi|gemini|qwen|poe|doubao|yuanbao|wenxin|ernie|zhipu|chatglm|huggingface|huggingchat)\b/.test(text) ||
      /(助手|回答|回复|豆包|千问|通义|元宝|文心|文小言|智谱|清言|模型)/.test(text)) {
      return "assistant";
    }

    if (/\b(system|developer)\b/.test(text)) {
      return "system";
    }

    return "unknown";
  }

  function normalizeRole(role) {
    const value = String(role || "").toLowerCase();
    if (value === "user" || value === "assistant" || value === "system" || value === "tool" || value === "thinking") {
      return value;
    }
    return "unknown";
  }

  function extractText(node, options = {}) {
    const clone = node.cloneNode(true);
    if (platform.key === "deepseek") {
      stripDeepSeekVolatileBlocks(clone);
    }
    if (platform.key === "qwen") {
      stripQwenReferenceBlocks(clone);
    }
    const removeSelector = options.keepControls ? REMOVE_KEEPING_CONTROLS_SELECTOR : REMOVE_SELECTOR;
    clone.querySelectorAll(removeSelector).forEach((element) => element.remove());
    let text = normalizeText(nodeToMarkdown(clone));
    if (platform.key === "deepseek") {
      text = stripDeepSeekVolatileText(text);
    }
    return options.keepControls ? text : stripMessageControls(text);
  }

  function stripQwenReferenceBlocks(root) {
    root.querySelectorAll("video, iframe, canvas, picture, source, img").forEach((element) => element.remove());
    const candidates = Array.from(root.querySelectorAll([
      "button",
      "[role='button']",
      "summary",
      "[aria-label*='参考' i]",
      "[aria-label*='来源' i]",
      "[aria-label*='引用' i]",
      "[aria-label*='视频' i]"
    ].join(","))).sort((a, b) => compareNodeDepth(b, a));

    for (const element of candidates) {
      if (!root.contains(element)) {
        continue;
      }
      const text = normalizeText(element.textContent || "");
      const marker = [
        element.getAttribute("class") || "",
        element.getAttribute("data-testid") || "",
        element.getAttribute("aria-label") || ""
      ].join(" ");
      if (isQwenReferenceControl(text, marker)) {
        element.remove();
      }
    }
  }

  function isQwenReferenceControl(text, marker) {
    const value = normalizeInlineMarkdown(text);
    const markerText = String(marker || "").toLowerCase();
    const hasReferenceMarker = /(reference|citation|source|video|参考|来源|引用|视频|网页)/i.test(markerText);
    if (!value) {
      return hasReferenceMarker;
    }
    return isQwenReferenceChromeLine(value) ||
      isMessageControlLine(value) ||
      (hasReferenceMarker && value.length <= 48 && /(参考|来源|引用|视频|展开|收起|查看|播放)/.test(value));
  }

  function compareNodeDepth(a, b) {
    return getNodeDepth(a) - getNodeDepth(b);
  }

  function getNodeDepth(node) {
    let depth = 0;
    let current = node;
    while (current?.parentElement) {
      depth += 1;
      current = current.parentElement;
    }
    return depth;
  }

  function stripDeepSeekVolatileBlocks(root) {
    const selectors = [
      "[class*='think' i]",
      "[class*='reason' i]",
      "[class*='thought' i]",
      "[class*='cot' i]",
      "[class*='chain' i][class*='thought' i]",
      "[data-testid*='think' i]",
      "[data-testid*='reason' i]",
      "[data-testid*='thought' i]",
      "[data-role*='think' i]",
      "[data-role*='reason' i]",
      "[aria-label*='思考' i]",
      "[aria-label*='reason' i]",
      "[aria-label*='think' i]"
    ].join(",");

    root.querySelectorAll(selectors).forEach((element) => {
      if (!element.matches(".ds-markdown") && !element.querySelector(".ds-markdown")) {
        element.remove();
      }
    });

    Array.from(root.querySelectorAll("button, summary, details")).forEach((element) => {
      const text = normalizeText(element.textContent || "");
      if (isDeepSeekThinkingChromeLine(text)) {
        element.remove();
      }
    });
  }

  function stripDeepSeekVolatileText(text) {
    const withoutTags = String(text || "")
      .replace(/<think(?:ing)?>([\s\S]*?)<\/think(?:ing)?>/gi, "")
      .replace(/\r/g, "");
    const lines = withoutTags.split("\n").filter((line) => !isDeepSeekThinkingChromeLine(line));
    return normalizeText(lines.join("\n"));
  }

  function isDeepSeekThinkingChromeLine(line) {
    const value = normalizeInlineMarkdown(line)
      .replace(/\s+/g, " ")
      .trim();
    if (!value) {
      return false;
    }
    return /^(已)?(深度)?思考(过程)?([（(].*?[）)])?$/i.test(value) ||
      /^已深度思考\s*[（(]?.*?(秒|s|sec|second).*?[）)]?$/i.test(value) ||
      /^Thought\s+for\s+.*?(s|sec|second|seconds)$/i.test(value) ||
      /^(展开|收起|折叠)?\s*(深度)?思考(过程)?$/i.test(value);
  }

  function isDeepSeekControlLine(line) {
    const value = normalizeInlineMarkdown(line)
      .replace(/[·|｜/]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!value) {
      return true;
    }
    return /^(快捷模式|深度思考|联网搜索|搜索|附件|上传文件)$/i.test(value) ||
      /^(复制|编辑|删除|分享|重新生成|换一个回答|停止生成)$/i.test(value) ||
      /^[‹<]?\s*\d+\s*\/\s*\d+\s*[›>]?$/.test(value) ||
      /^[✓✔]?\s*(已复制|Copied)$/i.test(value);
  }

  function nodeToMarkdown(node) {
    if (!node) {
      return "";
    }

    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || "";
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return "";
    }

    const element = node;
    const tag = element.tagName.toLowerCase();

    if (tag === "br") {
      return "\n";
    }

    if (tag === "table") {
      return tableToMarkdown(element);
    }

    if (tag === "pre") {
      return codeBlockToMarkdown(element);
    }

    if (tag === "code" && element.closest("pre")) {
      return element.textContent || "";
    }

    if (tag === "code") {
      return `\`${normalizeInlineMarkdown(element.textContent || "")}\``;
    }

    if (/^h[1-6]$/.test(tag)) {
      const level = Number(tag.slice(1));
      const text = normalizeInlineMarkdown(childrenToMarkdown(element));
      return text ? `\n\n${"#".repeat(level)} ${text}\n\n` : "";
    }

    if (tag === "blockquote") {
      const text = normalizeText(childrenToMarkdown(element));
      return text ? `\n\n${text.split("\n").map((line) => `> ${line}`).join("\n")}\n\n` : "";
    }

    if (tag === "ul" || tag === "ol") {
      return listToMarkdown(element, tag === "ol");
    }

    if (tag === "li") {
      return normalizeText(childrenToMarkdown(element));
    }

    if (tag === "a") {
      const label = normalizeInlineMarkdown(childrenToMarkdown(element)) || normalizeInlineMarkdown(element.textContent || "");
      const href = element.getAttribute("href") || "";
      if (label && /^https?:\/\//i.test(href)) {
        return `[${label}](${href})`;
      }
      return label;
    }

    if (tag === "strong" || tag === "b") {
      const text = normalizeInlineMarkdown(childrenToMarkdown(element));
      return text ? `**${text}**` : "";
    }

    if (tag === "em" || tag === "i") {
      const text = normalizeInlineMarkdown(childrenToMarkdown(element));
      return text ? `*${text}*` : "";
    }

    const body = childrenToMarkdown(element);
    if (["p", "article", "section"].includes(tag)) {
      return body.trim() ? `\n\n${body.trim()}\n\n` : "";
    }

    if (tag === "div" && hasBlockChildren(element)) {
      return body.trim() ? `\n${body.trim()}\n` : "";
    }

    return body;
  }

  function childrenToMarkdown(element) {
    return Array.from(element.childNodes).map(nodeToMarkdown).join("");
  }

  function tableToMarkdown(table) {
    const rows = Array.from(table.querySelectorAll("tr"))
      .map((row) => Array.from(row.children)
        .filter((cell) => ["TH", "TD"].includes(cell.tagName))
        .map((cell) => normalizeInlineMarkdown(childrenToMarkdown(cell).replace(/\n+/g, " "))))
      .filter((cells) => cells.length > 0);

    if (!rows.length) {
      return normalizeText(table.textContent || "");
    }

    const width = Math.max(...rows.map((row) => row.length));
    const paddedRows = rows.map((row) => {
      const next = [...row];
      while (next.length < width) {
        next.push("");
      }
      return next;
    });

    const header = paddedRows[0];
    const body = paddedRows.slice(1);
    const lines = [
      markdownTableRow(header),
      markdownTableRow(header.map(() => "---")),
      ...body.map(markdownTableRow)
    ];

    return `\n\n${lines.join("\n")}\n\n`;
  }

  function markdownTableRow(cells) {
    return `| ${cells.map((cell) => String(cell || "").replace(/\|/g, "\\|")).join(" | ")} |`;
  }

  function listToMarkdown(list, ordered) {
    const items = Array.from(list.children).filter((child) => child.tagName === "LI");
    const lines = items.map((item, index) => {
      const marker = ordered ? `${index + 1}.` : "-";
      const text = normalizeText(childrenToMarkdown(item)).replace(/\n/g, "\n  ");
      return text ? `${marker} ${text}` : "";
    }).filter(Boolean);

    return lines.length ? `\n\n${lines.join("\n")}\n\n` : "";
  }

  function codeBlockToMarkdown(pre) {
    const code = pre.querySelector("code") || pre;
    const language = inferCodeLanguage(code);
    const text = (code.textContent || "").replace(/\n$/, "");
    return text ? `\n\n\`\`\`${language}\n${text}\n\`\`\`\n\n` : "";
  }

  function inferCodeLanguage(element) {
    const className = String(element.className || "");
    const match = className.match(/language-([a-zA-Z0-9_+.-]+)/) || className.match(/lang-([a-zA-Z0-9_+.-]+)/);
    return match?.[1] || "";
  }

  function hasBlockChildren(element) {
    return Array.from(element.children).some((child) => {
      return /^(DIV|P|PRE|TABLE|UL|OL|LI|BLOCKQUOTE|ARTICLE|SECTION|H[1-6])$/.test(child.tagName);
    });
  }

  function normalizeInlineMarkdown(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isViableMessageText(text, minLength) {
    if (!text) {
      return false;
    }

    const minimum = Number.isFinite(minLength) ? minLength : MIN_GENERIC_MESSAGE_LENGTH;
    if (text.length < minimum) {
      return false;
    }

    return !isPlatformChromeText(text);
  }

  function isPlatformChromeText(text) {
    const value = normalizeText(text).toLowerCase();
    if (!value) {
      return true;
    }

    const chromeLabels = [
      "new chat",
      "search chats",
      "upgrade plan",
      "terms of service",
      "privacy policy",
      "send message",
      "regenerate",
      "stop generating",
      "try again",
      "sign in",
      "log in",
      "登录",
      "注册",
      "新建聊天",
      "发送",
      "停止生成"
    ];

    return chromeLabels.includes(value);
  }

  function isConversationLikePage() {
    if ((platform.conversationPatterns || []).some((pattern) => pattern.test(location.pathname))) {
      return true;
    }

    const path = location.pathname.toLowerCase();
    return /\/(chat|c|conversation|app|search)\b/.test(path);
  }

  function isVisible(node) {
    if (!(node instanceof Element)) {
      return false;
    }

    const rect = node.getBoundingClientRect();
    const style = window.getComputedStyle(node);
    return rect.width > 0 &&
      rect.height > 0 &&
      style.visibility !== "hidden" &&
      style.display !== "none" &&
      Number(style.opacity || 1) !== 0;
  }

  function compareNodeOrder(a, b) {
    if (a === b) {
      return 0;
    }
    return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
  }

  function queryAllSafe(selector) {
    try {
      return Array.from(document.querySelectorAll(selector));
    } catch {
      return [];
    }
  }

  function readAttribute(node, name) {
    if (!name || typeof node.getAttribute !== "function") {
      return "";
    }
    return node.getAttribute(name) || "";
  }

  function normalizeText(value) {
    return String(value || "")
      .replace(/\u00a0/g, " ")
      .replace(/\r/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/\n{4,}/g, "\n\n\n")
      .trim();
  }

  function stripMessageControls(value) {
    const lines = String(value || "").split("\n");
    while (lines.length && isMessageControlLine(lines[lines.length - 1])) {
      lines.pop();
    }
    return lines.join("\n").trim();
  }

  function isMessageControlLine(line) {
    const value = normalizeInlineMarkdown(line)
      .replace(/[·|｜/]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
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

  function trimToLength(value, limit) {
    if (value.length <= limit) {
      return value;
    }
    return `${value.slice(0, Math.max(0, limit - 3)).trim()}...`;
  }

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === "function") {
      return window.CSS.escape(value);
    }
    return String(value).replace(/["\\]/g, "\\$&");
  }

  function detectPlatform() {
    const hostname = location.hostname.toLowerCase();
    for (const config of PLATFORM_CONFIGS) {
      if ((config.hosts || []).some((host) => hostname === host || hostname.endsWith(`.${host}`))) {
        return config;
      }

      if ((config.hostPaths || []).some((entry) => {
        return hostname === entry.host && entry.pathPattern.test(location.pathname);
      })) {
        return config;
      }
    }
    return null;
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
})();
