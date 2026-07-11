'use strict';

const fs = require('fs');
const path = require('path');
const vercelConfig = require('../vercel.json');

const repoRoot = path.join(__dirname, '..');

function stripLeadingSlash(filePath) {
  return filePath.replace(/^\/+/, '');
}

describe('vercel.json deployment config', () => {
  test('serverless function targets existing files', () => {
    const functionFiles = Object.keys(vercelConfig.functions || {});
    expect(functionFiles).toContain('src/api/server.js');
    for (const file of functionFiles) {
      expect(fs.existsSync(path.join(repoRoot, stripLeadingSlash(file)))).toBe(true);
    }
  });

  test('rewrite destinations target existing files', () => {
    for (const rewrite of vercelConfig.rewrites || []) {
      expect(fs.existsSync(path.join(repoRoot, stripLeadingSlash(rewrite.destination)))).toBe(true);
    }
  });

  test('included runtime data files exist', () => {
    for (const functionConfig of Object.values(vercelConfig.functions || {})) {
      const includeFiles = functionConfig.includeFiles;
      if (!includeFiles) continue;
      const files = Array.isArray(includeFiles) ? includeFiles : [includeFiles];
      for (const file of files) {
        expect(fs.existsSync(path.join(repoRoot, stripLeadingSlash(file)))).toBe(true);
      }
    }
  });
});
