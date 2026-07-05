'use strict';

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');

function assertRelativeFileExists(relativePath) {
  const normalized = relativePath.replace(/^\/+/, '');
  const absolutePath = path.join(projectRoot, normalized);
  expect(fs.existsSync(absolutePath)).toBe(true);
}

describe('Vercel deployment config', () => {
  const vercelConfig = JSON.parse(
    fs.readFileSync(path.join(projectRoot, 'vercel.json'), 'utf8'),
  );

  test('all configured serverless function entrypoints exist', () => {
    expect(vercelConfig.functions).toBeDefined();

    for (const [functionPath, functionConfig] of Object.entries(vercelConfig.functions)) {
      assertRelativeFileExists(functionPath);

      if (functionConfig.includeFiles) {
        assertRelativeFileExists(functionConfig.includeFiles);
      }
    }
  });

  test('all rewrites point to configured function entrypoints', () => {
    const functionPaths = new Set(Object.keys(vercelConfig.functions));

    for (const rewrite of vercelConfig.rewrites || []) {
      const destination = rewrite.destination.replace(/^\/+/, '');
      expect(functionPaths.has(destination)).toBe(true);
      assertRelativeFileExists(destination);
    }
  });
});
