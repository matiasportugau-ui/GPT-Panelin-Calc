/* eslint-env jest */
'use strict';

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const vercelConfig = require('../vercel.json');

function stripLeadingSlash(filePath) {
  return filePath.replace(/^\/+/, '');
}

describe('Vercel deploy config', () => {
  test('API entrypoint is the real Express server at src/api/server.js', () => {
    expect(Object.keys(vercelConfig.functions || {})).toContain('src/api/server.js');
    expect(fs.existsSync(path.join(rootDir, 'src/api/server.js'))).toBe(true);
    expect(fs.existsSync(path.join(rootDir, 'src/server.js'))).toBe(false);
  });

  test('function handlers and rewrite destinations point to existing files', () => {
    for (const functionPath of Object.keys(vercelConfig.functions || {})) {
      expect(fs.existsSync(path.join(rootDir, functionPath))).toBe(true);
    }

    for (const rewrite of vercelConfig.rewrites || []) {
      const destination = stripLeadingSlash(rewrite.destination);
      expect(fs.existsSync(path.join(rootDir, destination))).toBe(true);
      expect(
        Object.prototype.hasOwnProperty.call(vercelConfig.functions, destination)
      ).toBe(true);
    }
  });

  test('configured includeFiles paths exist', () => {
    for (const options of Object.values(vercelConfig.functions || {})) {
      if (!options.includeFiles) continue;
      expect(fs.existsSync(path.join(rootDir, options.includeFiles))).toBe(true);
    }
  });
});
