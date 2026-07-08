'use strict';

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

function stripLeadingSlash(filePath) {
  return filePath.replace(/^\/+/, '');
}

describe('vercel.json deployment config', () => {
  const vercelConfig = JSON.parse(fs.readFileSync(path.join(rootDir, 'vercel.json'), 'utf8'));

  test('function entrypoints exist in the deployed project', () => {
    for (const functionPath of Object.keys(vercelConfig.functions || {})) {
      expect(fs.existsSync(path.join(rootDir, functionPath))).toBe(true);
    }
  });

  test('rewrites target an existing serverless function', () => {
    const functionPaths = new Set(Object.keys(vercelConfig.functions || {}));

    for (const rewrite of vercelConfig.rewrites || []) {
      const destination = stripLeadingSlash(rewrite.destination || '');
      expect(functionPaths.has(destination)).toBe(true);
      expect(fs.existsSync(path.join(rootDir, destination))).toBe(true);
    }
  });

  test('included files required by the API exist', () => {
    for (const functionConfig of Object.values(vercelConfig.functions || {})) {
      if (!functionConfig.includeFiles) continue;

      for (const includePath of [].concat(functionConfig.includeFiles)) {
        expect(fs.existsSync(path.join(rootDir, includePath))).toBe(true);
      }
    }
  });
});
