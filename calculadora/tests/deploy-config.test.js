'use strict';

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const vercelConfig = require('../vercel.json');

function toProjectPath(configPath) {
  return configPath.replace(/^\/+/, '');
}

describe('Vercel deployment config', () => {
  test('function entries reference existing JavaScript files', () => {
    for (const functionPath of Object.keys(vercelConfig.functions || {})) {
      const resolvedPath = path.join(projectRoot, toProjectPath(functionPath));

      expect(functionPath).toMatch(/\.js$/);
      expect(fs.existsSync(resolvedPath)).toBe(true);
    }
  });

  test('rewrites route traffic to existing JavaScript handlers', () => {
    for (const rewrite of vercelConfig.rewrites || []) {
      const destination = toProjectPath(rewrite.destination);
      const resolvedPath = path.join(projectRoot, destination);

      expect(destination).toMatch(/\.js$/);
      expect(fs.existsSync(resolvedPath)).toBe(true);
    }
  });
});
