'use strict';

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const vercelConfig = require('../vercel.json');

function assertProjectFileExists(configPath) {
  const normalizedPath = configPath.replace(/^\/+/, '');
  const absolutePath = path.join(projectRoot, normalizedPath);
  expect(fs.existsSync(absolutePath)).toBe(true);
}

describe('Vercel deployment config', () => {
  test('all configured function entrypoints exist', () => {
    for (const functionPath of Object.keys(vercelConfig.functions || {})) {
      assertProjectFileExists(functionPath);
    }
  });

  test('all rewrite destinations point to existing files', () => {
    for (const rewrite of vercelConfig.rewrites || []) {
      assertProjectFileExists(rewrite.destination);
    }
  });
});
