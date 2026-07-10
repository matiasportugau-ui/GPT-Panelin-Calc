'use strict';

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

function normalizeVercelDestination(destination) {
  return destination.replace(/^\/+/, '');
}

describe('Vercel deployment config', () => {
  const configPath = path.join(rootDir, 'vercel.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  test('function entries point to existing JavaScript files', () => {
    for (const functionPath of Object.keys(config.functions || {})) {
      const absolutePath = path.join(rootDir, functionPath);

      expect(functionPath).toMatch(/\.js$/);
      expect(fs.existsSync(absolutePath)).toBe(true);
    }
  });

  test('rewrites point to existing local JavaScript files', () => {
    for (const rewrite of config.rewrites || []) {
      const destination = normalizeVercelDestination(rewrite.destination || '');
      const absolutePath = path.join(rootDir, destination);

      expect(destination).toMatch(/\.js$/);
      expect(fs.existsSync(absolutePath)).toBe(true);
    }
  });
});
