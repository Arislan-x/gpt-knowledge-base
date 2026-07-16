(() => {
  "use strict";

  const CONVERSATION_FILE_PATTERN = /^conversations(?:-\d+)?\.json$/i;
  const ASSET_NAME_FILE = "conversation_asset_file_names.json";
  const DAT_FILE_PATTERN = /\.dat$/i;

  async function parseExportFiles(files, options = {}) {
    const candidates = (Array.isArray(files) ? files : [])
      .filter((entry) => CONVERSATION_FILE_PATTERN.test(baseName(entry?.relativePath || entry?.file?.name)))
      .sort((left, right) => naturalCompare(left.relativePath, right.relativePath));

    if (!candidates.length) {
      return emptyResult();
    }

    const nameEntry = (Array.isArray(files) ? files : []).find((entry) => {
      return baseName(entry?.relativePath || entry?.file?.name).toLowerCase() === ASSET_NAME_FILE;
    });
    const assetNames = nameEntry ? await readAssetNames(nameEntry.file) : {};
    const assetUrls = [];
    const resolveAsset = createAssetResolver(files, assetNames, assetUrls);
    const entries = [];
    const consumedPaths = new Set();

    for (const entry of candidates) {
      let data;
      try {
        data = JSON.parse(await entry.file.text());
      } catch (error) {
        console.warn("Unable to parse ChatGPT export shard", entry.relativePath, error);
        continue;
      }

      const rawConversations = Array.isArray(data) ? data : [];
      let parsedCount = 0;
      rawConversations.forEach((raw, index) => {
        const conversation = parseConversation(raw, resolveAsset);
        if (!conversation) {
          return;
        }
        parsedCount += 1;
        entries.push({
          conversation,
          sourceMeta: {
            sourceType: "folder",
            sourceLabel: options.folderName || "ChatGPT export",
            externalPath: entry.relativePath,
            fileName: entry.file.name,
            externalIndex: index
          }
        });
      });

      if (parsedCount) {
        consumedPaths.add(entry.relativePath);
      }
      await yieldToBrowser();
    }

    if (!entries.length) {
      revokeUrls(assetUrls);
      return emptyResult();
    }

    if (nameEntry) {
      consumedPaths.add(nameEntry.relativePath);
    }
    for (const entry of files || []) {
      if (DAT_FILE_PATTERN.test(baseName(entry?.relativePath || entry?.file?.name))) {
        consumedPaths.add(entry.relativePath);
      }
    }

    return {
      entries,
      assetUrls,
      consumedPaths: Array.from(consumedPaths)
    };
  }

  function parseConversation(raw, resolveAsset = () => null) {
    if (!raw || typeof raw !== "object" || !raw.mapping || typeof raw.mapping !== "object") {
      return null;
    }

    const messages = activeConversationNodes(raw)
      .map((node, index) => parseMessage(node?.message, index, resolveAsset))
      .filter(Boolean);
    if (!messages.length) {
      return null;
    }

    const id = stringValue(raw.conversation_id || raw.id);
    return {
      id,
      title: stringValue(raw.title) || firstUserLine(messages) || "Untitled ChatGPT conversation",
      platform: "chatgpt",
      platformLabel: "ChatGPT",
      folderId: "chatgpt",
      folderLabel: "ChatGPT",
      sourceUrl: id ? `https://chatgpt.com/c/${encodeURIComponent(id)}` : "https://chatgpt.com/",
      sourceHost: "chatgpt.com",
      createdAt: normalizeExportDate(raw.create_time),
      updatedAt: normalizeExportDate(raw.update_time || raw.create_time),
      capturedAt: normalizeExportDate(raw.update_time || raw.create_time),
      messages
    };
  }

  function activeConversationNodes(raw) {
    const mapping = raw.mapping || {};
    const nodes = [];
    const visited = new Set();
    let nodeId = stringValue(raw.current_node);

    while (nodeId && !visited.has(nodeId)) {
      visited.add(nodeId);
      const node = mapping[nodeId];
      if (!node) {
        break;
      }
      nodes.push(node);
      nodeId = stringValue(node.parent);
    }

    if (nodes.length) {
      return nodes.reverse();
    }

    return Object.values(mapping)
      .filter(Boolean)
      .sort((left, right) => messageTime(left?.message) - messageTime(right?.message));
  }

  function parseMessage(message, index, resolveAsset) {
    if (!message || typeof message !== "object") {
      return null;
    }

    const contentType = stringValue(message.content?.content_type).toLowerCase();
    const extracted = extractContent(message.content, resolveAsset);
    const metadataAttachments = Array.isArray(message.metadata?.attachments)
      ? message.metadata.attachments
          .map((attachment) => resolveAsset(attachment?.id, attachment))
          .filter(Boolean)
      : [];
    const attachments = dedupeAttachments([...extracted.attachments, ...metadataAttachments]);
    const text = normalizeText(extracted.text);
    if (!text && !attachments.length) {
      return null;
    }

    return {
      id: stringValue(message.id) || `chatgpt-${index}`,
      role: normalizeExportRole(message.author?.role, contentType),
      text,
      attachments,
      index,
      createdAt: normalizeExportDate(message.create_time),
      model: stringValue(message.metadata?.model_slug)
    };
  }

  function extractContent(content, resolveAsset) {
    if (!content || typeof content !== "object") {
      return { text: "", attachments: [] };
    }

    const textParts = [];
    const attachments = [];
    for (const part of Array.isArray(content.parts) ? content.parts : []) {
      if (typeof part === "string") {
        textParts.push(part);
        continue;
      }
      if (!part || typeof part !== "object") {
        continue;
      }
      if (part.asset_pointer) {
        const resolved = resolveAsset(part.asset_pointer, {
          name: part.name,
          mime_type: contentTypeMime(part.content_type),
          size: part.size_bytes,
          width: part.width,
          height: part.height
        });
        if (resolved) {
          attachments.push(resolved);
        }
      }
      const nestedText = firstString(part.text, part.content, part.caption);
      if (nestedText) {
        textParts.push(nestedText);
      }
    }

    if (typeof content.content === "string") {
      textParts.push(content.content);
    }
    if (typeof content.text === "string") {
      textParts.push(content.text);
    }
    for (const thought of Array.isArray(content.thoughts) ? content.thoughts : []) {
      const thoughtText = typeof thought === "string"
        ? thought
        : firstString(thought?.summary, thought?.content, thought?.text);
      if (thoughtText) {
        textParts.push(thoughtText);
      }
    }

    return {
      text: textParts.map(normalizeText).filter(Boolean).join("\n\n"),
      attachments
    };
  }

  function createAssetResolver(files, assetNames = {}, assetUrls = []) {
    const assets = new Map();
    for (const entry of Array.isArray(files) ? files : []) {
      const datName = baseName(entry?.relativePath || entry?.file?.name);
      if (!DAT_FILE_PATTERN.test(datName)) {
        continue;
      }
      const record = {
        file: entry.file,
        datName,
        originalName: safeAssetName(assetNames[datName] || ""),
        url: ""
      };
      for (const key of assetKeyVariants(datName)) {
        assets.set(key, record);
      }
    }

    return (pointer, fallback = {}) => {
      const keys = assetKeyVariants(pointer);
      const record = keys.map((key) => assets.get(key)).find(Boolean);
      const fallbackName = safeAssetName(fallback.name || "");
      const fallbackMime = stringValue(fallback.mime_type || fallback.mimeType);
      const mimeType = (fallbackName ? fallbackMime : "") ||
        mimeTypeFromName(fallbackName || record?.originalName) ||
        fallbackMime ||
        "application/octet-stream";
      const id = keys[0] || stringValue(pointer);
      const name = fallbackName || record?.originalName || generatedAssetName(id, mimeType);
      if (!record && !name) {
        return null;
      }

      if (record && !record.url && typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
        const typedBlob = record.file?.type === mimeType
          ? record.file
          : new Blob([record.file], { type: mimeType });
        record.url = URL.createObjectURL(typedBlob);
        assetUrls.push(record.url);
      }

      return {
        id,
        name,
        mimeType,
        size: finiteNumber(fallback.size, record?.file?.size),
        width: finiteNumber(fallback.width),
        height: finiteNumber(fallback.height),
        kind: assetKind(mimeType),
        available: Boolean(record),
        localUrl: record?.url || ""
      };
    };
  }

  function assetKeyVariants(value) {
    const normalized = decodePointer(value);
    if (!normalized) {
      return [];
    }
    const base = baseName(normalized);
    const stem = base.replace(/\.dat$/i, "");
    return Array.from(new Set([base.toLowerCase(), stem.toLowerCase(), `${stem}.dat`.toLowerCase()]));
  }

  function decodePointer(value) {
    let normalized = stringValue(value).trim();
    if (!normalized) {
      return "";
    }
    normalized = normalized.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
    normalized = normalized.split(/[?#]/, 1)[0];
    try {
      return decodeURIComponent(normalized);
    } catch {
      return normalized;
    }
  }

  async function readAssetNames(file) {
    try {
      const data = JSON.parse(await file.text());
      return data && typeof data === "object" && !Array.isArray(data) ? data : {};
    } catch (error) {
      console.warn("Unable to parse ChatGPT asset filename map", error);
      return {};
    }
  }

  function normalizeExportRole(authorRole, contentType) {
    if (contentType === "thoughts" || contentType === "reasoning_recap") {
      return "thinking";
    }
    const role = stringValue(authorRole).toLowerCase();
    if (["user", "assistant", "system", "tool"].includes(role)) {
      return role;
    }
    return "unknown";
  }

  function dedupeAttachments(items) {
    const seen = new Set();
    return items.filter((item) => {
      const key = `${item?.id || ""}|${item?.name || ""}|${item?.size || ""}`;
      if (!item || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  function firstUserLine(messages) {
    const message = messages.find((item) => item.role === "user" && item.text);
    return message?.text?.split("\n", 1)[0]?.trim() || "";
  }

  function contentTypeMime(contentType) {
    const value = stringValue(contentType).toLowerCase();
    if (value.includes("image")) {
      return "image/png";
    }
    if (value.includes("audio")) {
      return "audio/mpeg";
    }
    if (value.includes("video")) {
      return "video/mp4";
    }
    return "";
  }

  function mimeTypeFromName(name) {
    const extension = String(name || "").toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || "";
    return {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
      webp: "image/webp",
      svg: "image/svg+xml",
      pdf: "application/pdf",
      txt: "text/plain",
      md: "text/markdown",
      json: "application/json",
      csv: "text/csv",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xls: "application/vnd.ms-excel",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ppt: "application/vnd.ms-powerpoint",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      mp3: "audio/mpeg",
      wav: "audio/wav",
      mp4: "video/mp4",
      webm: "video/webm",
      zip: "application/zip"
    }[extension] || "";
  }

  function generatedAssetName(id, mimeType) {
    const extension = {
      "image/png": ".png",
      "image/jpeg": ".jpg",
      "image/gif": ".gif",
      "image/webp": ".webp",
      "application/pdf": ".pdf",
      "audio/mpeg": ".mp3",
      "video/mp4": ".mp4"
    }[mimeType] || ".dat";
    return `${safeAssetName(id) || "attachment"}${extension}`;
  }

  function assetKind(mimeType) {
    const value = stringValue(mimeType).toLowerCase();
    if (value.startsWith("image/")) return "image";
    if (value.startsWith("audio/")) return "audio";
    if (value.startsWith("video/")) return "video";
    return "file";
  }

  function safeAssetName(value) {
    return baseName(stringValue(value)).replace(/[\u0000-\u001f]/g, "").trim();
  }

  function baseName(value) {
    return String(value || "").replace(/\\/g, "/").split("/").pop() || "";
  }

  function normalizeText(value) {
    return String(value || "")
      .replace(/\r/g, "")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/\n{4,}/g, "\n\n\n")
      .trim();
  }

  function normalizeExportDate(value) {
    const numeric = Number(value);
    const date = Number.isFinite(numeric) && numeric > 0
      ? new Date(numeric < 1e12 ? numeric * 1000 : numeric)
      : new Date(value || 0);
    return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
  }

  function messageTime(message) {
    const value = Number(message?.create_time);
    return Number.isFinite(value) ? value : 0;
  }

  function finiteNumber(...values) {
    const value = values.map(Number).find(Number.isFinite);
    return Number.isFinite(value) ? value : 0;
  }

  function firstString(...values) {
    return values.find((value) => typeof value === "string" && value.trim()) || "";
  }

  function stringValue(value) {
    return typeof value === "string" || typeof value === "number" ? String(value) : "";
  }

  function naturalCompare(left, right) {
    return String(left || "").localeCompare(String(right || ""), undefined, { numeric: true, sensitivity: "base" });
  }

  function revokeUrls(urls) {
    if (typeof URL === "undefined" || typeof URL.revokeObjectURL !== "function") {
      return;
    }
    for (const url of urls) {
      URL.revokeObjectURL(url);
    }
  }

  function yieldToBrowser() {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  function emptyResult() {
    return { entries: [], assetUrls: [], consumedPaths: [] };
  }

  window.CBV_CHATGPT_IMPORT = Object.freeze({
    parseExportFiles,
    parseConversation,
    createAssetResolver,
    normalizeExportDate
  });
})();
