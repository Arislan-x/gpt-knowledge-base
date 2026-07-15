(() => {
  "use strict";

  const END_SIGNATURE = 0x06054b50;
  const CENTRAL_SIGNATURE = 0x02014b50;
  const LOCAL_SIGNATURE = 0x04034b50;
  const MAX_COMMENT_LENGTH = 0xffff;
  const MAX_ENTRY_COUNT = 5000;
  const MAX_ENTRY_SIZE = 64 * 1024 * 1024;
  const MAX_TOTAL_SIZE = 256 * 1024 * 1024;

  async function readZip(file) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const endOffset = findEndRecord(view);
    const entryCount = view.getUint16(endOffset + 10, true);
    const centralSize = view.getUint32(endOffset + 12, true);
    const centralOffset = view.getUint32(endOffset + 16, true);

    if (entryCount === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) {
      throw new Error("ZIP64 archives are not supported");
    }
    if (entryCount > MAX_ENTRY_COUNT) {
      throw new Error(`ZIP contains too many entries (${entryCount})`);
    }
    ensureRange(bytes, centralOffset, centralSize);

    const entries = [];
    let totalSize = 0;
    let offset = centralOffset;
    for (let index = 0; index < entryCount; index += 1) {
      ensureRange(bytes, offset, 46);
      if (view.getUint32(offset, true) !== CENTRAL_SIGNATURE) {
        throw new Error("Invalid ZIP central directory");
      }

      const flags = view.getUint16(offset + 8, true);
      const method = view.getUint16(offset + 10, true);
      const compressedSize = view.getUint32(offset + 20, true);
      const uncompressedSize = view.getUint32(offset + 24, true);
      const nameLength = view.getUint16(offset + 28, true);
      const extraLength = view.getUint16(offset + 30, true);
      const commentLength = view.getUint16(offset + 32, true);
      const localOffset = view.getUint32(offset + 42, true);
      const recordLength = 46 + nameLength + extraLength + commentLength;
      ensureRange(bytes, offset, recordLength);

      if (flags & 0x0001) {
        throw new Error("Encrypted ZIP archives are not supported");
      }
      if (uncompressedSize > MAX_ENTRY_SIZE || totalSize + uncompressedSize > MAX_TOTAL_SIZE) {
        throw new Error("ZIP uncompressed data is too large");
      }

      const nameBytes = bytes.subarray(offset + 46, offset + 46 + nameLength);
      const name = decodeName(nameBytes, Boolean(flags & 0x0800)).replace(/\\/g, "/");
      offset += recordLength;

      if (!name || name.endsWith("/")) {
        continue;
      }

      const compressed = readLocalFile(bytes, view, localOffset, compressedSize);
      const content = await decompress(compressed, method, Math.min(MAX_ENTRY_SIZE, MAX_TOTAL_SIZE - totalSize));
      if (uncompressedSize !== content.length) {
        throw new Error(`Invalid uncompressed size for ${name}`);
      }
      totalSize += content.length;
      entries.push({ name, bytes: content });
    }

    return entries;
  }

  function findEndRecord(view) {
    const minimum = Math.max(0, view.byteLength - 22 - MAX_COMMENT_LENGTH);
    for (let offset = view.byteLength - 22; offset >= minimum; offset -= 1) {
      if (view.getUint32(offset, true) === END_SIGNATURE) {
        return offset;
      }
    }
    throw new Error("Invalid ZIP archive");
  }

  function readLocalFile(bytes, view, offset, compressedSize) {
    ensureRange(bytes, offset, 30);
    if (view.getUint32(offset, true) !== LOCAL_SIGNATURE) {
      throw new Error("Invalid ZIP local header");
    }
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const dataOffset = offset + 30 + nameLength + extraLength;
    ensureRange(bytes, dataOffset, compressedSize);
    return bytes.slice(dataOffset, dataOffset + compressedSize);
  }

  async function decompress(bytes, method, sizeLimit) {
    if (method === 0) {
      if (bytes.length > sizeLimit) {
        throw new Error("ZIP uncompressed data is too large");
      }
      return bytes;
    }
    if (method !== 8) {
      throw new Error(`Unsupported ZIP compression method: ${method}`);
    }
    if (typeof DecompressionStream !== "function") {
      throw new Error("Deflate ZIP archives are not supported by this browser");
    }

    const stream = new Blob([bytes])
      .stream()
      .pipeThrough(new DecompressionStream("deflate-raw"));
    return readStreamWithLimit(stream, sizeLimit);
  }

  async function readStreamWithLimit(stream, sizeLimit) {
    const reader = stream.getReader();
    const chunks = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      length += value.length;
      if (length > sizeLimit) {
        await reader.cancel();
        throw new Error("ZIP uncompressed data is too large");
      }
      chunks.push(value);
    }

    const output = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      output.set(chunk, offset);
      offset += chunk.length;
    }
    return output;
  }

  function decodeName(bytes, isUtf8) {
    if (isUtf8) {
      return new TextDecoder("utf-8").decode(bytes);
    }
    try {
      return new TextDecoder("gb18030").decode(bytes);
    } catch {
      return new TextDecoder("utf-8").decode(bytes);
    }
  }

  function ensureRange(bytes, offset, length) {
    if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length) || offset < 0 || length < 0 || offset + length > bytes.length) {
      throw new Error("Corrupt ZIP archive");
    }
  }

  window.CBV_ZIP_IMPORT = Object.freeze({ readZip });
})();
