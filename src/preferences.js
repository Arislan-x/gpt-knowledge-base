(() => {
  const PREF_KEY = "cbv.preferences";

  const DEFAULT_PREFERENCES = {
    language: "zh",
    theme: "mist",
    font: "serif"
  };

  const LANGUAGE_OPTIONS = [
    { key: "zh", label: "中文", labelEn: "Chinese" },
    { key: "en", label: "English", labelEn: "English" }
  ];

  const THEME_OPTIONS = [
    { key: "mist", label: "雾蓝", labelEn: "Mist" },
    { key: "sage", label: "鼠尾草", labelEn: "Sage" },
    { key: "clay", label: "陶土", labelEn: "Clay" },
    { key: "mauve", label: "藕紫", labelEn: "Mauve" },
    { key: "graphite", label: "石墨", labelEn: "Graphite" }
  ];

  const FONT_OPTIONS = [
    { key: "serif", label: "书卷", labelEn: "Literary" },
    { key: "sans", label: "清爽", labelEn: "Clean" },
    { key: "manuscript", label: "手札", labelEn: "Manuscript" },
    { key: "structured", label: "秩序", labelEn: "Structured" }
  ];

  const SUPPORTED_PLATFORMS = [
    { key: "chatgpt", label: "ChatGPT", owner: "OpenAI", home: "https://chatgpt.com/", icon: "CG", logo: "../assets/brand/chatgpt.png" },
    { key: "claude", label: "Claude", owner: "Anthropic", home: "https://claude.ai/", icon: "Cl", logo: "../assets/brand/claude.png" },
    { key: "grok", label: "Grok", owner: "xAI", home: "https://grok.com/", icon: "G", logo: "../assets/brand/grok.png" },
    { key: "deepseek", label: "DeepSeek", owner: "DeepSeek", home: "https://chat.deepseek.com/", icon: "DS", logo: "../assets/brand/deepseek.ico" },
    { key: "kimi", label: "Kimi", owner: "Moonshot AI", home: "https://www.kimi.com/", icon: "K", logo: "../assets/brand/kimi.ico" },
    { key: "gemini", label: "Gemini", owner: "Google", home: "https://gemini.google.com/", icon: "Ge", logo: "../assets/brand/gemini.svg" },
    { key: "perplexity", label: "Perplexity", owner: "Perplexity AI", home: "https://www.perplexity.ai/", icon: "Px", logo: "../assets/brand/perplexity.ico" },
    { key: "poe", label: "Poe", owner: "Quora", home: "https://poe.com/", icon: "Po", logo: "../assets/brand/poe.ico" },
    { key: "qwen", label: "千问", labelEn: "Qwen", labelZh: "千问", pinyin: "Qianwen", owner: "Alibaba Cloud", home: "https://www.qianwen.com/chat/", icon: "Q", logo: "../assets/brand/qwen.png" },
    { key: "doubao", label: "豆包", labelEn: "Doubao", labelZh: "豆包", pinyin: "Doubao", owner: "ByteDance", home: "https://www.doubao.com/", icon: "豆", logo: "../assets/brand/doubao.png" },
    { key: "yuanbao", label: "腾讯元宝", labelEn: "Yuanbao", labelZh: "腾讯元宝", pinyin: "Yuanbao", owner: "Tencent", home: "https://yuanbao.tencent.com/", icon: "元", logo: "../assets/brand/yuanbao.ico" },
    { key: "wenxin", label: "文心一言", labelEn: "Yiyan", labelZh: "文心一言", pinyin: "Yiyan", owner: "Baidu", home: "https://chat.baidu.com/?enter_type=wenxin_logo", icon: "文", logo: "../assets/brand/wenxin.png" },
    { key: "zhipu", label: "智谱清言", labelEn: "Qingyan", labelZh: "智谱清言", pinyin: "Qingyan", owner: "Zhipu AI", home: "https://chatglm.cn/", icon: "智", logo: "../assets/brand/zhipu.png" },
    { key: "huggingface", label: "Hugging Face", owner: "Hugging Face", home: "https://huggingface.co/chat/", icon: "HF", logo: "../assets/brand/huggingface.svg" }
  ];

  const TEXT = {
    zh: {
      appTitle: "GPT 知识库",
      appKicker: "跨平台汇聚对话，构建 RAG 知识库",
      loadingBackups: "正在读取备份",
      waitingForChat: "等待打开支持的 AI 对话页",
      backupsReady: "备份已就绪",
      lastBackup: "最近备份 {date}",
      popupSummary: "共 {conversations} 个会话，{messages} 条消息",
      openVault: "打开工作站",
      importBackups: "导入",
      exportBackups: "导出",
      clearWorkspace: "清空",
      importBackupsTooltip: "导入文件夹",
      exportBackupsTooltip: "导出知识库",
      clearWorkspaceTooltip: "清空知识库",
      exportDialogTitle: "导出会话",
      exportFormatLabel: "导出格式",
      exportPackagingLabel: "文件组织方式",
      exportSingleFileLabel: "合并为单个文件",
      exportZipLabel: "导出 ZIP",
      cancel: "取消",
      close: "关闭",
      confirmExport: "开始导出",
      clearWorkspaceConfirm: "确定清空浏览器内备份并解除当前外部文件夹吗？电脑上的外部文件不会被删除。",
      chooseFolder: "选择文件夹",
      clearFolder: "清除文件夹",
      searchConversations: "搜索备份",
      searchBackups: "搜索备份",
      exportJson: "JSON",
      exportMarkdown: "Markdown",
      exportAllJson: "全部导出 JSON",
      exportAllMarkdown: "全部导出 Markdown",
      exportMd: "导出 MD",
      exportCurrentMdTooltip: "将本会话导出MD",
      exportCurrentJsonTooltip: "将本会话导出JSON",
      exportCurrentHtmlTooltip: "将本会话导出HTML",
      clear: "清空",
      clearLocalBackups: "清空本地备份",
      conversations: "会话",
      messages: "消息",
      backups: "会话备份",
      searchResults: "搜索结果",
      groups: "分组",
      expand: "展开",
      fold: "折叠",
      hide: "隐藏",
      show: "显示",
      operationSection: "操作区",
      listSection: "列表区",
      detailSection: "详情区",
      settingsSection: "界面",
      language: "语言",
      font: "字体",
      theme: "主题",
      listSummary: "{groups} 组 · {conversations} 个会话",
      groupConversationCount: "{count} 个会话",
      emptyPopup: "打开支持的 AI 对话页后会自动开始本地备份。",
      noSearchResults: "没有匹配的备份正文。",
      untitledConversation: "未命名会话",
      unknown: "未知",
      open: "打开",
      export: "导出",
      delete: "删除",
      details: "详情",
      browserStorage: "浏览器储存",
      folder: "文件夹",
      allBackups: "全部备份",
      noBackupsLoaded: "尚未加载备份",
      backupStatus: "{local} 个浏览器备份{external}",
      externalStatus: "，{count} 个来自 {folder}",
      noSource: "无来源",
      noFolder: "无文件夹",
      selectBackup: "选择一个备份",
      selectBackupHint: "从左侧选择会话备份，后续可作为 RAG 知识库材料。",
      noBackupSelected: "未选择备份",
      noBackupSelectedHint: "打开支持的 AI 对话页，或选择包含 JSON / Markdown 的本地备份文件夹，汇总后可用于生成 RAG 知识库。",
      openSource: "打开来源",
      openSourceTooltip: "打开原网站",
      exportSingleMdTooltip: "单个会话导出MD",
      exportSingleJsonTooltip: "单个会话导出JSON",
      exportSingleHtmlTooltip: "单个会话导出HTML",
      deleteSingleConversationTooltip: "删除单个会话",
      sourceFolder: "文件夹：{name}",
      folderReadFailed: "文件夹读取失败：{message}",
      conversationMeta: "{messages} 条消息 · 更新于 {date} · {source}",
      questions: "问题",
      questionAria: "问题 {index}：{title}",
      untitledQuestion: "未命名问题",
      roleUser: "用户",
      roleAssistant: "助手",
      roleThinking: "思考",
      roleSystem: "系统",
      roleTool: "工具",
      roleUnknown: "消息",
      thinking: "思考",
      code: "代码",
      copy: "复制",
      copied: "已复制",
      deleteAllConfirm: "删除全部本地备份？",
      deleteOneConfirm: "删除“{title}”？",
      supportedPlatforms: "支持的 GPT / 聊天机器人",
      supportedPlatformsTooltip: "这些是我们支持的 GPT",
      trademarkNotice: "名称和图标仅作指示性链接，商标归各自所有；本工具非官方产品或合作伙伴。",
      backupSwitch: "实时备份",
      captureOn: "已开启",
      captureOff: "已停止",
      localPrivacyNote: "仅备份当前打开会话中的对话信息，不会主动抓取历史会话列表；数据保存在本机浏览器储存中，不上传到任何云端接口。",
      currentPageBackup: "当前页面备份",
      currentBackupNotFound: "当前页面暂无备份",
      refreshBackup: "重新备份当前页",
      refreshingBackup: "正在重新备份当前页",
      currentBackupSaved: "当前页备份已更新",
      currentBackupUnchanged: "当前页备份无变化",
      manualBackupDisabled: "实时备份已停止，未重新备份",
      manualBackupFailed: "当前页面无法重新备份"
    },
    en: {
      appTitle: "GPT Knowledge Base",
      appKicker: "Unify AI conversations into a RAG knowledge base",
      loadingBackups: "Loading backups",
      waitingForChat: "Waiting for a supported AI chat page",
      backupsReady: "Backups ready",
      lastBackup: "Last backup {date}",
      popupSummary: "{conversations} conversations, {messages} messages",
      openVault: "Open Workstation",
      importBackups: "Import",
      exportBackups: "Export",
      clearWorkspace: "Clear",
      importBackupsTooltip: "Import folder",
      exportBackupsTooltip: "Export knowledge base",
      clearWorkspaceTooltip: "Clear knowledge base",
      exportDialogTitle: "Export conversations",
      exportFormatLabel: "Export format",
      exportPackagingLabel: "File organization",
      exportSingleFileLabel: "Merge into one file",
      exportZipLabel: "Export ZIP",
      cancel: "Cancel",
      close: "Close",
      confirmExport: "Export",
      clearWorkspaceConfirm: "Clear browser backups and disconnect the current external folder? Files on your computer will not be deleted.",
      chooseFolder: "Choose Folder",
      clearFolder: "Clear Folder",
      searchConversations: "Search backups",
      searchBackups: "Search backups",
      exportJson: "JSON",
      exportMarkdown: "Markdown",
      exportAllJson: "Export all JSON",
      exportAllMarkdown: "Export all Markdown",
      exportMd: "Export MD",
      exportCurrentMdTooltip: "Export this conversation as MD",
      exportCurrentJsonTooltip: "Export this conversation as JSON",
      exportCurrentHtmlTooltip: "Export this conversation as HTML",
      clear: "Clear",
      clearLocalBackups: "Clear local backups",
      conversations: "conversations",
      messages: "messages",
      backups: "Chat backups",
      searchResults: "Search results",
      groups: "groups",
      expand: "Expand",
      fold: "Fold",
      hide: "Hide",
      show: "Show",
      operationSection: "Controls",
      listSection: "List",
      detailSection: "Details",
      settingsSection: "Interface",
      language: "Language",
      font: "Font",
      theme: "Theme",
      listSummary: "{groups} groups · {conversations} conversations",
      groupConversationCount: "{count} conversations",
      emptyPopup: "Open a supported AI chat page to start local backups.",
      noSearchResults: "No backup text matches your search.",
      untitledConversation: "Untitled conversation",
      unknown: "unknown",
      open: "Open",
      export: "Export",
      delete: "Delete",
      details: "Details",
      browserStorage: "Browser storage",
      folder: "Folder",
      allBackups: "All backups",
      noBackupsLoaded: "No backups loaded",
      backupStatus: "{local} browser backups{external}",
      externalStatus: ", {count} from {folder}",
      noSource: "No source",
      noFolder: "No folder",
      selectBackup: "Select a backup",
      selectBackupHint: "Choose chat backups from the left; selected conversations can become RAG knowledge-base material.",
      noBackupSelected: "No backup selected",
      noBackupSelectedHint: "Open a supported AI chat page, or choose a local backup folder containing JSON or Markdown files for RAG knowledge-base preparation.",
      openSource: "Open Source",
      openSourceTooltip: "Open original website",
      exportSingleMdTooltip: "Export this conversation as MD",
      exportSingleJsonTooltip: "Export this conversation as JSON",
      exportSingleHtmlTooltip: "Export this conversation as HTML",
      deleteSingleConversationTooltip: "Delete this conversation",
      sourceFolder: "Folder: {name}",
      folderReadFailed: "Folder read failed: {message}",
      conversationMeta: "{messages} messages · updated {date} · {source}",
      questions: "Questions",
      questionAria: "Question {index}: {title}",
      untitledQuestion: "Untitled question",
      roleUser: "User",
      roleAssistant: "Assistant",
      roleThinking: "Thinking",
      roleSystem: "System",
      roleTool: "Tool",
      roleUnknown: "Message",
      thinking: "Thinking",
      code: "Code",
      copy: "Copy",
      copied: "Copied",
      deleteAllConfirm: "Delete all local backups?",
      deleteOneConfirm: "Delete \"{title}\"?",
      supportedPlatforms: "Supported GPTs / chatbots",
      supportedPlatformsTooltip: "These are the GPTs and chatbots we support",
      trademarkNotice: "Names and logos are used only as nominative links; trademarks belong to their owners. This tool is not official or affiliated.",
      backupSwitch: "Live backup",
      captureOn: "On",
      captureOff: "Paused",
      localPrivacyNote: "Only the currently open conversation is backed up. Historical conversation lists are not fetched proactively; data stays in local browser storage and is not uploaded to any cloud endpoint.",
      currentPageBackup: "Current page backup",
      currentBackupNotFound: "No backup for this page yet",
      refreshBackup: "Back up this page again",
      refreshingBackup: "Backing up this page again",
      currentBackupSaved: "Current page backup updated",
      currentBackupUnchanged: "Current page backup unchanged",
      manualBackupDisabled: "Live backup is paused; no backup was created",
      manualBackupFailed: "Unable to back up the current page"
    }
  };

  function normalizePreferences(raw) {
    const language = LANGUAGE_OPTIONS.some((item) => item.key === raw?.language) ? raw.language : DEFAULT_PREFERENCES.language;
    const theme = THEME_OPTIONS.some((item) => item.key === raw?.theme) ? raw.theme : DEFAULT_PREFERENCES.theme;
    const font = FONT_OPTIONS.some((item) => item.key === raw?.font) ? raw.font : DEFAULT_PREFERENCES.font;
    return { language, theme, font };
  }

  async function loadPreferences() {
    const stored = await chrome.storage.local.get(PREF_KEY);
    return normalizePreferences(stored[PREF_KEY]);
  }

  async function savePreferences(patch) {
    const current = await loadPreferences();
    const next = normalizePreferences({ ...current, ...patch });
    await chrome.storage.local.set({ [PREF_KEY]: next });
    return next;
  }

  function applyPreferences(preferences) {
    const normalized = normalizePreferences(preferences);
    document.documentElement.lang = normalized.language === "zh" ? "zh-CN" : "en";
    document.body.dataset.language = normalized.language;
    document.body.dataset.theme = normalized.theme;
    document.body.dataset.font = normalized.font;
  }

  function translate(preferences, key, values = {}) {
    const language = normalizePreferences(preferences).language;
    const text = TEXT[language]?.[key] || TEXT.en[key] || key;
    return text.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, name) => {
      return Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : "";
    });
  }

  function optionLabel(preferences, option) {
    return normalizePreferences(preferences).language === "zh" ? option.label : option.labelEn;
  }

  function platformLabel(preferences, platform) {
    const normalized = normalizePreferences(preferences);
    if (normalized.language === "zh") {
      return platform.labelZh || platform.label;
    }
    return platform.labelEn || platform.label;
  }

  function platformTitle(preferences, platform) {
    const names = [
      platform.labelZh,
      platform.labelEn,
      platform.pinyin
    ].filter(Boolean);
    const uniqueNames = [...new Set(names)];
    const label = uniqueNames.length ? uniqueNames.join(" / ") : platform.label;
    return `${label} - ${platform.owner}`;
  }

  function platformByKey(key) {
    const lookup = normalizePlatformLookup(key);
    return SUPPORTED_PLATFORMS.find((platform) => {
      return [
        platform.key,
        platform.label,
        platform.labelZh,
        platform.labelEn,
        platform.pinyin
      ].some((value) => normalizePlatformLookup(value) === lookup);
    }) || null;
  }

  function normalizePlatformLookup(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");
  }

  function locale(preferences) {
    return normalizePreferences(preferences).language === "zh" ? "zh-CN" : "en";
  }

  window.CBV_PREFERENCES = {
    DEFAULT_PREFERENCES,
    LANGUAGE_OPTIONS,
    THEME_OPTIONS,
    FONT_OPTIONS,
    SUPPORTED_PLATFORMS,
    loadPreferences,
    savePreferences,
    applyPreferences,
    translate,
    optionLabel,
    platformLabel,
    platformTitle,
    platformByKey,
    locale
  };
})();
