'use strict';

const fs = require('fs');
const path = require('path');
const vercelConfig = require('../vercel.json');

const projectRoot = path.resolve(__dirname, '..');

describe('Vercel deployment configuration', () => {
  test('every configured function points to an existing file', () => {
    for (const functionPath of Object.keys(vercelConfig.functions || {})) {
      expect(fs.existsSync(path.join(projectRoot, functionPath))).toBe(true);
    }
  });

  test('every rewrite destination points to a configured function', () => {
    for (const rewrite of vercelConfig.rewrites || []) {
      const destination = rewrite.destination.replace(/^\/+/, '');
      expect(
        Object.prototype.hasOwnProperty.call(vercelConfig.functions, destination)
      ).toBe(true);
    }
  });
});
