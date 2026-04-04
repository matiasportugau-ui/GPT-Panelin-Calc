'use strict';

const fs = require('fs');
const path = require('path');

describe('vercel deployment config', () => {
  test('rewrites and function entrypoint point to existing server file', () => {
    const projectRoot = path.resolve(__dirname, '..');
    const vercelConfigPath = path.join(projectRoot, 'vercel.json');
    const vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));

    const functionEntries = Object.keys(vercelConfig.functions || {});
    expect(functionEntries.length).toBeGreaterThan(0);

    for (const entry of functionEntries) {
      expect(fs.existsSync(path.join(projectRoot, entry))).toBe(true);
    }

    const rewrites = vercelConfig.rewrites || [];
    expect(rewrites.length).toBeGreaterThan(0);

    for (const rewrite of rewrites) {
      const destination = (rewrite.destination || '').replace(/^\//, '');
      expect(fs.existsSync(path.join(projectRoot, destination))).toBe(true);
    }
  });
});
