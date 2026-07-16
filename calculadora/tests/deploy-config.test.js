'use strict';

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const vercelConfig = require('../vercel.json');

describe('Vercel deployment configuration', () => {
  test('all configured function entrypoints exist', () => {
    const entrypoints = Object.keys(vercelConfig.functions || {});

    expect(entrypoints.length).toBeGreaterThan(0);
    for (const entrypoint of entrypoints) {
      expect(fs.existsSync(path.join(projectRoot, entrypoint))).toBe(true);
    }
  });

  test('rewrites target a configured function entrypoint', () => {
    const entrypoints = new Set(Object.keys(vercelConfig.functions || {}));

    for (const rewrite of vercelConfig.rewrites || []) {
      expect(entrypoints.has(rewrite.destination.replace(/^\//, ''))).toBe(true);
    }
  });
});
