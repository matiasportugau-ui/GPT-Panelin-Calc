'use strict';

const fs = require('fs');
const path = require('path');

const STORE_DIR = path.join(__dirname, '..', '..', 'storage');
const STORE_PATH = path.join(STORE_DIR, 'quote_store.json');

function defaultStore() {
  return {
    meta: { version: 1, updated_at: new Date().toISOString() },
    sequences: {},
    clients: [],
    quotes: [],
  };
}

function ensureStoreFile() {
  if (!fs.existsSync(STORE_DIR)) {
    fs.mkdirSync(STORE_DIR, { recursive: true });
  }
  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(STORE_PATH, JSON.stringify(defaultStore(), null, 2), 'utf8');
  }
}

function loadStore() {
  ensureStoreFile();
  const raw = fs.readFileSync(STORE_PATH, 'utf8');
  if (!raw.trim()) {
    return defaultStore();
  }
  try {
    const parsed = JSON.parse(raw);
    return {
      meta: parsed.meta || defaultStore().meta,
      sequences: parsed.sequences || {},
      clients: Array.isArray(parsed.clients) ? parsed.clients : [],
      quotes: Array.isArray(parsed.quotes) ? parsed.quotes : [],
    };
  } catch (_err) {
    // Si el store se corrompe, no reventar el servidor.
    return defaultStore();
  }
}

function saveStore(store) {
  const next = {
    ...store,
    meta: {
      ...(store.meta || {}),
      updated_at: new Date().toISOString(),
    },
  };
  ensureStoreFile();
  fs.writeFileSync(STORE_PATH, JSON.stringify(next, null, 2), 'utf8');
}

function getStorePath() {
  return STORE_PATH;
}

module.exports = {
  loadStore,
  saveStore,
  getStorePath,
};
