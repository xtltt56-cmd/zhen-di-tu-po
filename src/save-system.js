(function (global) {
  'use strict';

  const ROOT_KEY = 'position_breakout_save_bundle_v1';
  const BACKUP_KEY = `${ROOT_KEY}_backup`;
  const SCHEMA = 1;
  let lastRecovery = '';

  function hash(text) {
    let value = 2166136261;
    for (let index = 0; index < text.length; index++) {
      value ^= text.charCodeAt(index);
      value = Math.imul(value, 16777619);
    }
    return (value >>> 0).toString(16).padStart(8, '0');
  }

  function envelope(sections) {
    const payload = JSON.stringify({ schema: SCHEMA, savedAt: Date.now(), sections });
    return JSON.stringify({ payload, checksum: hash(payload) });
  }

  function decode(raw) {
    if (!raw) return null;
    const wrapper = JSON.parse(raw);
    if (!wrapper?.payload || hash(wrapper.payload) !== wrapper.checksum) throw new Error('存档校验失败');
    const data = JSON.parse(wrapper.payload);
    if (data.schema !== SCHEMA || !data.sections || typeof data.sections !== 'object') throw new Error('存档结构无效');
    return data;
  }

  function readBundle() {
    try {
      const primary = decode(localStorage.getItem(ROOT_KEY));
      if (primary) return primary;
    } catch (error) {
      lastRecovery = `主存档损坏：${error.message}`;
    }
    try {
      const backup = decode(localStorage.getItem(BACKUP_KEY));
      if (backup) {
        localStorage.setItem(ROOT_KEY, envelope(backup.sections));
        lastRecovery = '已自动从备份存档恢复';
        return backup;
      }
    } catch (error) {
      lastRecovery = `主存档与备份均不可用：${error.message}`;
    }
    return { schema: SCHEMA, savedAt: 0, sections: {} };
  }

  function sanitize(value, fallback) {
    const source = value === undefined || value === null ? fallback : value;
    if (typeof structuredClone === 'function') return structuredClone(source);
    return JSON.parse(JSON.stringify(source));
  }

  function loadSection(name, fallback = {}) {
    try {
      return sanitize(readBundle().sections[name], fallback);
    } catch {
      return sanitize(fallback, {});
    }
  }

  function saveSection(name, value) {
    try {
      const current = readBundle();
      const previousRaw = localStorage.getItem(ROOT_KEY);
      if (previousRaw) localStorage.setItem(BACKUP_KEY, previousRaw);
      current.sections[name] = sanitize(value, {});
      const raw = envelope(current.sections);
      localStorage.setItem(ROOT_KEY, raw);
      decode(raw);
      return true;
    } catch (error) {
      lastRecovery = `存档写入失败：${error.message}`;
      return false;
    }
  }

  function exportSave() {
    return btoa(unescape(encodeURIComponent(envelope(readBundle().sections))));
  }

  function importSave(text) {
    const raw = decodeURIComponent(escape(atob(String(text).trim())));
    const imported = decode(raw);
    const current = localStorage.getItem(ROOT_KEY);
    if (current) localStorage.setItem(BACKUP_KEY, current);
    localStorage.setItem(ROOT_KEY, envelope(imported.sections));
    lastRecovery = '已导入存档，原存档保留为备份';
    return true;
  }

  global.GameSaveSystem = Object.freeze({
    loadSection,
    saveSection,
    exportSave,
    importSave,
    status: () => {
      const data = readBundle();
      return {
        schema: data.schema,
        savedAt: data.savedAt,
        sections: Object.keys(data.sections),
        lastRecovery,
      };
    },
  });
})(window);
