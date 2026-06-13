/* eslint-env jest */
'use strict';

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

function assertProjectFileExists(relativePath) {
  const normalizedPath = relativePath.replace(/^\/+/, '');
  const absolutePath = path.join(projectRoot, normalizedPath);
  expect(fs.existsSync(absolutePath)).toBe(true);
}

describe('Vercel deploy configuration', () => {
  const vercelConfig = require('../vercel.json');

  test('serverless function entries point to existing files', () => {
    const functions = vercelConfig.functions || {};

    for (const functionPath of Object.keys(functions)) {
      assertProjectFileExists(functionPath);
    }
  });

  test('rewrite destinations that target local JavaScript files exist', () => {
    const rewrites = vercelConfig.rewrites || [];

    for (const rewrite of rewrites) {
      const destination = rewrite.destination || '';

      if (destination.endsWith('.js')) {
        assertProjectFileExists(destination);
      }
    }
  });
});
