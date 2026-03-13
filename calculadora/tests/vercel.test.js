'use strict';

const fs = require('fs');
const path = require('path');

function readVercelConfig() {
  const configPath = path.join(__dirname, '..', 'vercel.json');
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function toRepoRelativePath(p) {
  return String(p || '').replace(/^\/+/, '');
}

describe('vercel deployment config', () => {
  test('all function entrypoints exist', () => {
    const cfg = readVercelConfig();
    const functionEntrypoints = Object.keys(cfg.functions || {});

    for (const entrypoint of functionEntrypoints) {
      const absolutePath = path.join(__dirname, '..', entrypoint);
      expect(fs.existsSync(absolutePath)).toBe(true);
    }
  });

  test('all js rewrite destinations exist', () => {
    const cfg = readVercelConfig();
    const rewrites = cfg.rewrites || [];

    for (const rewrite of rewrites) {
      const destination = toRepoRelativePath(rewrite.destination);
      if (!destination.endsWith('.js')) continue;
      const absolutePath = path.join(__dirname, '..', destination);
      expect(fs.existsSync(absolutePath)).toBe(true);
    }
  });
});
