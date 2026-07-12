'use strict';

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

describe('Vercel deployment config', () => {
  const configPath = path.join(projectRoot, 'vercel.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  test('function entrypoints and included files exist', () => {
    for (const [functionPath, options] of Object.entries(config.functions || {})) {
      expect(fs.existsSync(path.join(projectRoot, functionPath))).toBe(true);

      if (options.includeFiles) {
        const includeFiles = Array.isArray(options.includeFiles)
          ? options.includeFiles
          : [options.includeFiles];

        for (const includeFile of includeFiles) {
          expect(fs.existsSync(path.join(projectRoot, includeFile))).toBe(true);
        }
      }
    }
  });

  test('rewrites target existing server files', () => {
    for (const rewrite of config.rewrites || []) {
      const destination = rewrite.destination.replace(/^\/+/, '');
      expect(fs.existsSync(path.join(projectRoot, destination))).toBe(true);
    }
  });
});
