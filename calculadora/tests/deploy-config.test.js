'use strict';

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

function resolveProjectPath(configPath) {
  return path.join(projectRoot, configPath.replace(/^\/+/, ''));
}

describe('Vercel deploy config', () => {
  test('routes production traffic to an existing server entrypoint', () => {
    const vercelConfig = require('../vercel.json');
    const functionEntries = Object.keys(vercelConfig.functions || {});

    expect(functionEntries).toContain('src/api/server.js');
    for (const entry of functionEntries) {
      expect(fs.existsSync(resolveProjectPath(entry))).toBe(true);
    }

    const destinations = (vercelConfig.rewrites || []).map(rewrite => rewrite.destination);
    expect(destinations).toContain('/src/api/server.js');
    for (const destination of destinations) {
      expect(fs.existsSync(resolveProjectPath(destination))).toBe(true);
    }
  });
});
