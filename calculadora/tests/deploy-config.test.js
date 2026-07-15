'use strict';

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const vercelConfig = require('../vercel.json');

describe('Vercel deployment configuration', () => {
  test('every configured function entrypoint exists', () => {
    for (const entrypoint of Object.keys(vercelConfig.functions || {})) {
      expect(fs.existsSync(path.join(projectRoot, entrypoint))).toBe(true);
    }
  });

  test('rewrites target a configured function', () => {
    const configuredFunctions = new Set(Object.keys(vercelConfig.functions || {}));

    for (const rewrite of vercelConfig.rewrites || []) {
      expect(configuredFunctions.has(rewrite.destination.replace(/^\//, ''))).toBe(true);
    }
  });
});
