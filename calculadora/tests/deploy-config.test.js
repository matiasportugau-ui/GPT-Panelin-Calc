'use strict';

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const vercelConfig = require('../vercel.json');

function assertExistingProjectFile(configPath) {
  const normalizedPath = configPath.replace(/^\/+/, '');
  const absolutePath = path.join(projectRoot, normalizedPath);

  expect(fs.existsSync(absolutePath)).toBe(true);
  expect(fs.statSync(absolutePath).isFile()).toBe(true);
}

describe('Vercel deployment config', () => {
  test('all configured function handlers exist', () => {
    for (const functionPath of Object.keys(vercelConfig.functions || {})) {
      assertExistingProjectFile(functionPath);
    }
  });

  test('all JS rewrite destinations point to existing files', () => {
    for (const rewrite of vercelConfig.rewrites || []) {
      if (typeof rewrite.destination !== 'string' || !rewrite.destination.endsWith('.js')) {
        continue;
      }

      assertExistingProjectFile(rewrite.destination);
    }
  });
});
