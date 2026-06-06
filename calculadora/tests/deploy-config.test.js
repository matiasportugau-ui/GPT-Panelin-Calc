'use strict';

const fs = require('fs');
const path = require('path');

const appRoot = path.resolve(__dirname, '..');
const vercelConfig = JSON.parse(fs.readFileSync(path.join(appRoot, 'vercel.json'), 'utf8'));

function assertPathExists(relativePath) {
  expect(fs.existsSync(path.join(appRoot, relativePath))).toBe(true);
}

describe('vercel.json', () => {
  test('configured serverless function files exist', () => {
    for (const functionPath of Object.keys(vercelConfig.functions || {})) {
      assertPathExists(functionPath);
    }
  });

  test('rewrite destinations point to existing handlers', () => {
    for (const rewrite of vercelConfig.rewrites || []) {
      const destination = rewrite.destination.replace(/^\//, '');
      assertPathExists(destination);
    }
  });

  test('included files exist for each function', () => {
    for (const functionConfig of Object.values(vercelConfig.functions || {})) {
      if (functionConfig.includeFiles) {
        assertPathExists(functionConfig.includeFiles);
      }
    }
  });
});
