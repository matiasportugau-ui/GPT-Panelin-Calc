'use strict';

const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');

function pathExistsFromRoot(relativePath) {
  return fs.existsSync(path.join(rootDir, relativePath));
}

describe('Vercel deployment config', () => {
  const vercelConfig = require('../vercel.json');

  test('function entrypoints point to existing JavaScript files', () => {
    for (const functionPath of Object.keys(vercelConfig.functions || {})) {
      expect(functionPath).toMatch(/\.js$/);
      expect(pathExistsFromRoot(functionPath)).toBe(true);
    }
  });

  test('rewrite destinations point to configured function files', () => {
    const functionPaths = new Set(Object.keys(vercelConfig.functions || {}));

    for (const rewrite of vercelConfig.rewrites || []) {
      if (!rewrite.destination.startsWith('/src/')) continue;

      const destinationPath = rewrite.destination.replace(/^\//, '');
      expect(functionPaths.has(destinationPath)).toBe(true);
      expect(pathExistsFromRoot(destinationPath)).toBe(true);
    }
  });

  test('included deployment files exist', () => {
    for (const functionConfig of Object.values(vercelConfig.functions || {})) {
      const includeFiles = functionConfig.includeFiles
        ? [functionConfig.includeFiles].flat()
        : [];

      for (const includeFile of includeFiles) {
        expect(pathExistsFromRoot(includeFile)).toBe(true);
      }
    }
  });
});
