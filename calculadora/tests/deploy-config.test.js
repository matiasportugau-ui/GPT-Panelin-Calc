'use strict';

const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');

describe('Vercel deployment config', () => {
  test('routes all traffic to the existing API server entrypoint', () => {
    const vercelConfig = JSON.parse(fs.readFileSync(path.join(repoRoot, 'vercel.json'), 'utf8'));
    const apiEntrypoint = 'src/api/server.js';
    const absoluteEntrypoint = path.join(repoRoot, apiEntrypoint);

    expect(fs.existsSync(absoluteEntrypoint)).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(vercelConfig.functions, apiEntrypoint)).toBe(true);
    expect(vercelConfig.functions[apiEntrypoint].includeFiles).toBe('src/data/catalog_real.csv');
    expect(vercelConfig.rewrites).toContainEqual({
      source: '/(.*)',
      destination: `/${apiEntrypoint}`,
    });
  });
});
