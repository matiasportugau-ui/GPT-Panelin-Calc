/* eslint-env jest */
'use strict';

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

function stripLeadingSlash(filePath) {
  return filePath.replace(/^\/+/, '');
}

describe('Vercel deploy config', () => {
  test('function handlers and rewrite destinations point to existing files', () => {
    const configPath = path.join(rootDir, 'vercel.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    for (const functionPath of Object.keys(config.functions || {})) {
      expect(fs.existsSync(path.join(rootDir, functionPath))).toBe(true);
    }

    for (const rewrite of config.rewrites || []) {
      expect(fs.existsSync(path.join(rootDir, stripLeadingSlash(rewrite.destination)))).toBe(true);
    }
  });

  test('configured includeFiles paths exist', () => {
    const configPath = path.join(rootDir, 'vercel.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    for (const options of Object.values(config.functions || {})) {
      if (!options.includeFiles) continue;
      expect(fs.existsSync(path.join(rootDir, options.includeFiles))).toBe(true);
    }
  });
});
