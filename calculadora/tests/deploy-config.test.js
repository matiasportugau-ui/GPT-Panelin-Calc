'use strict';

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const vercelConfig = require('../vercel.json');

function stripLeadingSlash(filePath) {
  return filePath.replace(/^\/+/, '');
}

describe('Vercel deployment config', () => {
  test('routes all traffic to the existing API server entrypoint', () => {
    expect(Object.keys(vercelConfig.functions)).toEqual(['src/api/server.js']);
    expect(vercelConfig.rewrites).toEqual([
      { source: '/(.*)', destination: '/src/api/server.js' },
    ]);
  });

  test('function and rewrite entrypoints exist in the repository', () => {
    const configuredEntrypoints = [
      ...Object.keys(vercelConfig.functions),
      ...vercelConfig.rewrites
        .map((rewrite) => stripLeadingSlash(rewrite.destination))
        .filter((destination) => destination.endsWith('.js')),
    ];

    for (const entrypoint of configuredEntrypoints) {
      expect(fs.existsSync(path.join(repoRoot, entrypoint))).toBe(true);
    }
  });
});
