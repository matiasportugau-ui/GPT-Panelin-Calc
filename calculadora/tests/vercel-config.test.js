'use strict';

const fs = require('fs');
const path = require('path');
const vercelConfig = require('../vercel.json');

function normalizeVercelPath(value) {
  return value.replace(/^\//, '');
}

describe('vercel.json', () => {
  test('function entries point to existing server files', () => {
    for (const functionPath of Object.keys(vercelConfig.functions || {})) {
      const fullPath = path.join(__dirname, '..', normalizeVercelPath(functionPath));
      expect(fs.existsSync(fullPath)).toBe(true);
    }
  });

  test('rewrite destinations point to existing server files', () => {
    for (const rewrite of vercelConfig.rewrites || []) {
      const fullPath = path.join(__dirname, '..', normalizeVercelPath(rewrite.destination));
      expect(fs.existsSync(fullPath)).toBe(true);
    }
  });
});
