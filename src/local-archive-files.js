(() => {
  const ARCHIVE_SOURCE = "gpt-knowledge-base";
  const CONVERSATIONS_DIRECTORY = "conversations";
  const INDEX_FILE = "index.json";

  async function deleteConversations(directoryHandle, storageIds) {
    const ids = new Set(
      Array.from(storageIds || [], (value) => cleanId(value)).filter(Boolean)
    );
    if (!ids.size) {
      return { deletedCount: 0, deletedIds: [], remainingCount: 0 };
    }
    return mutateArchive(directoryHandle, ids);
  }

  async function clearConversations(directoryHandle) {
    return mutateArchive(directoryHandle, null);
  }

  async function mutateArchive(directoryHandle, targetIds) {
    if (!directoryHandle) {
      throw new Error("A local archive directory is required.");
    }

    const result = {
      deletedCount: 0,
      deletedIds: new Set(),
      remaining: []
    };

    let conversationsRoot = null;
    try {
      conversationsRoot = await directoryHandle.getDirectoryHandle(CONVERSATIONS_DIRECTORY);
    } catch (error) {
      if (!isNotFoundError(error)) {
        throw error;
      }
    }

    if (conversationsRoot) {
      await pruneDirectory(
        conversationsRoot,
        CONVERSATIONS_DIRECTORY,
        targetIds,
        result
      );
      await removeDirectoryIfEmpty(directoryHandle, CONVERSATIONS_DIRECTORY);
    }

    const remainingEntries = dedupeIndexEntries(result.remaining);
    await writeArchiveIndex(directoryHandle, remainingEntries);

    return {
      deletedCount: result.deletedCount,
      deletedIds: Array.from(result.deletedIds),
      remainingCount: remainingEntries.length
    };
  }

  async function pruneDirectory(directoryHandle, relativePath, targetIds, result) {
    const entries = [];
    for await (const entry of directoryHandle.entries()) {
      entries.push(entry);
    }

    for (const [name, handle] of entries) {
      if (handle.kind === "directory") {
        await pruneDirectory(handle, `${relativePath}/${name}`, targetIds, result);
        await removeDirectoryIfEmpty(directoryHandle, name);
        continue;
      }

      if (handle.kind !== "file" || !/\.json$/i.test(name)) {
        continue;
      }

      const archiveRecord = await readArchiveRecord(handle);
      if (!archiveRecord) {
        continue;
      }

      const storageId = getConversationStorageId(archiveRecord.conversation);
      const shouldDelete = targetIds === null || targetIds.has(storageId);
      if (shouldDelete) {
        await directoryHandle.removeEntry(name);
        result.deletedCount += 1;
        if (storageId) {
          result.deletedIds.add(storageId);
        }
        continue;
      }

      result.remaining.push(
        buildIndexEntry(
          archiveRecord.conversation,
          `${relativePath}/${name}`
        )
      );
    }
  }

  async function readArchiveRecord(fileHandle) {
    try {
      const file = await fileHandle.getFile();
      const parsed = JSON.parse(await file.text());
      if (
        parsed?.archiveSource !== ARCHIVE_SOURCE ||
        !parsed.conversation ||
        typeof parsed.conversation !== "object"
      ) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  function buildIndexEntry(conversation, relativePath) {
    const storageId = getConversationStorageId(conversation);
    if (!storageId) {
      return null;
    }
    return {
      id: storageId,
      title: conversation.title || "Untitled conversation",
      platform: conversation.platform,
      platformLabel: conversation.platformLabel || conversation.platform || "Unknown",
      folder: conversation.folderId,
      folderLabel: conversation.folderLabel || conversation.platformLabel || "Other",
      updatedAt: conversation.updatedAt,
      messageCount: conversation.messageCount,
      path: relativePath
    };
  }

  function dedupeIndexEntries(entries) {
    const byId = new Map();
    for (const entry of entries.filter(Boolean)) {
      const current = byId.get(entry.id);
      if (!current || entryTimestamp(entry) >= entryTimestamp(current)) {
        byId.set(entry.id, entry);
      }
    }
    return Array.from(byId.values()).sort((left, right) => {
      return entryTimestamp(right) - entryTimestamp(left);
    });
  }

  function entryTimestamp(entry) {
    const date = new Date(entry?.updatedAt || "");
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }

  async function writeArchiveIndex(directoryHandle, entries) {
    const fileHandle = await directoryHandle.getFileHandle(INDEX_FILE, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(new Blob([
      JSON.stringify({
        archivedAt: new Date().toISOString(),
        source: ARCHIVE_SOURCE,
        conversations: entries
      }, null, 2)
    ], { type: "application/json;charset=utf-8" }));
    await writable.close();
  }

  async function removeDirectoryIfEmpty(parentHandle, name) {
    try {
      const directoryHandle = await parentHandle.getDirectoryHandle(name);
      for await (const unused of directoryHandle.entries()) {
        void unused;
        return false;
      }
      await parentHandle.removeEntry(name);
      return true;
    } catch (error) {
      if (isNotFoundError(error)) {
        return true;
      }
      throw error;
    }
  }

  function getConversationStorageId(conversation) {
    return cleanId(
      conversation?.originalId ||
      conversation?.id ||
      conversation?.localId ||
      conversation?.viewerId ||
      ""
    );
  }

  function cleanId(value) {
    return String(value || "").trim();
  }

  function isNotFoundError(error) {
    return error?.name === "NotFoundError";
  }

  window.CBV_LOCAL_ARCHIVE_FILES = Object.freeze({
    deleteConversations,
    clearConversations
  });
})();
