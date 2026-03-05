'use strict';

const fs   = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'logic_config.json');

let _config = null;

/**
 * Load (or return cached) logic_config.json.
 * Call reloadConfig() after a POST /api/logica to invalidate the cache.
 */
function getConfig() {
  if (!_config) {
    _config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  }
  return _config;
}

/**
 * Validate that an incoming config object has the required top-level keys.
 * Throws if invalid.
 */
function validateConfig(data) {
  const required = ['iva_rate', 'formula_params', 'panel_largos', 'colores', 'accesorios'];
  for (const key of required) {
    if (data[key] === undefined) {
      throw new Error(`Campo requerido faltante en config: "${key}"`);
    }
  }
  if (typeof data.iva_rate !== 'number' || data.iva_rate <= 0 || data.iva_rate >= 1) {
    throw new Error('iva_rate debe ser un número entre 0 y 1 (ej. 0.22 para 22%)');
  }
  if (typeof data.accesorios !== 'object' || Array.isArray(data.accesorios)) {
    throw new Error('"accesorios" debe ser un objeto { SKU: { precio_venta, precio_web, ... } }');
  }
  for (const [sku, acc] of Object.entries(data.accesorios)) {
    if (sku.startsWith('_')) continue; // skip _nota fields
    if (typeof acc.precio_venta !== 'number') {
      throw new Error(`accesorios.${sku}.precio_venta debe ser un número`);
    }
  }
}

/**
 * Save new config to disk and invalidate the in-memory cache.
 * The new config takes effect immediately for all subsequent requests.
 * @param {Object} newData - Parsed config object (already validated)
 */
function reloadConfig(newData) {
  validateConfig(newData);
  // Stamp the update date
  newData._actualizado = new Date().toISOString().split('T')[0];
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(newData, null, 2), 'utf8');
  _config = newData;
}

/**
 * Force re-read from disk (useful in tests).
 */
function forceReload() {
  _config = null;
  return getConfig();
}

module.exports = { getConfig, validateConfig, reloadConfig, forceReload, CONFIG_PATH };
