'use strict';

const fs = require('fs');
const path = require('path');

describe('Vercel deployment config', () => {
  const projectRoot = path.resolve(__dirname, '..');
  const config = require('../vercel.json');

  test('points all rewrites at an existing server entrypoint', () => {
    for (const rewrite of config.rewrites) {
      const destination = rewrite.destination.replace(/^\/+/, '');
      expect(fs.existsSync(path.join(projectRoot, destination))).toBe(true);
    }
  });

  test('declares functions only for existing files', () => {
    for (const functionPath of Object.keys(config.functions)) {
      expect(fs.existsSync(path.join(projectRoot, functionPath))).toBe(true);
    }
  });
});
