(() => {
  "use strict";

  const CRC_TABLE = buildCrcTable();

  function createZip(entries) {
    const encoder = new TextEncoder();
    const now = new Date();
    const { time, date } = toDosDateTime(now);
    const localParts = [];
    const centralParts = [];
    let offset = 0;

    for (const entry of entries || []) {
      const name = encoder.encode(String(entry?.name || "file.txt").replace(/\\/g, "/"));
      const content = entry?.content instanceof Uint8Array
        ? entry.content
        : encoder.encode(String(entry?.content ?? ""));
      const checksum = crc32(content);

      const localHeader = new Uint8Array(30 + name.length);
      const localView = new DataView(localHeader.buffer);
      localView.setUint32(0, 0x04034b50, true);
      localView.setUint16(4, 20, true);
      localView.setUint16(6, 0x0800, true);
      localView.setUint16(8, 0, true);
      localView.setUint16(10, time, true);
      localView.setUint16(12, date, true);
      localView.setUint32(14, checksum, true);
      localView.setUint32(18, content.length, true);
      localView.setUint32(22, content.length, true);
      localView.setUint16(26, name.length, true);
      localView.setUint16(28, 0, true);
      localHeader.set(name, 30);
      localParts.push(localHeader, content);

      const centralHeader = new Uint8Array(46 + name.length);
      const centralView = new DataView(centralHeader.buffer);
      centralView.setUint32(0, 0x02014b50, true);
      centralView.setUint16(4, 20, true);
      centralView.setUint16(6, 20, true);
      centralView.setUint16(8, 0x0800, true);
      centralView.setUint16(10, 0, true);
      centralView.setUint16(12, time, true);
      centralView.setUint16(14, date, true);
      centralView.setUint32(16, checksum, true);
      centralView.setUint32(20, content.length, true);
      centralView.setUint32(24, content.length, true);
      centralView.setUint16(28, name.length, true);
      centralView.setUint16(30, 0, true);
      centralView.setUint16(32, 0, true);
      centralView.setUint16(34, 0, true);
      centralView.setUint16(36, 0, true);
      centralView.setUint32(38, 0, true);
      centralView.setUint32(42, offset, true);
      centralHeader.set(name, 46);
      centralParts.push(centralHeader);

      offset += localHeader.length + content.length;
    }

    const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
    const end = new Uint8Array(22);
    const endView = new DataView(end.buffer);
    endView.setUint32(0, 0x06054b50, true);
    endView.setUint16(4, 0, true);
    endView.setUint16(6, 0, true);
    endView.setUint16(8, centralParts.length, true);
    endView.setUint16(10, centralParts.length, true);
    endView.setUint32(12, centralSize, true);
    endView.setUint32(16, offset, true);
    endView.setUint16(20, 0, true);

    return new Blob([...localParts, ...centralParts, end], { type: "application/zip" });
  }

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function buildCrcTable() {
    const table = new Uint32Array(256);
    for (let value = 0; value < 256; value += 1) {
      let crc = value;
      for (let bit = 0; bit < 8; bit += 1) {
        crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1);
      }
      table[value] = crc >>> 0;
    }
    return table;
  }

  function toDosDateTime(value) {
    const year = Math.max(1980, value.getFullYear());
    return {
      time: (value.getHours() << 11) | (value.getMinutes() << 5) | Math.floor(value.getSeconds() / 2),
      date: ((year - 1980) << 9) | ((value.getMonth() + 1) << 5) | value.getDate()
    };
  }

  window.CBV_ZIP_EXPORT = Object.freeze({ createZip });
})();
