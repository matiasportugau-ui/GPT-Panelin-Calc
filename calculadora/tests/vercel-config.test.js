'use strict';

const fs = require('fs');
const path = require('path');

describe('vercel config', () => {
  test('rewrites destination points to an existing server entrypoint', () => {
    const projectRoot = path.join(__dirname, '..');
    const vercelConfigPath = path.join(projectRoot, 'vercel.json');
    const vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));

    expect(Array.isArray(vercelConfig.rewrites)).toBe(true);
    expect(vercelConfig.rewrites.length).toBeGreaterThan(0);

    const rewriteDestination = vercelConfig.rewrites[0].destination;
    expect(typeof rewriteDestination).toBe('string');

    const relativeEntrypoint = rewriteDestination.replace(/^\//, '');
    const entrypointPath = path.join(projectRoot, relativeEntrypoint);

    expect(fs.existsSync(entrypointPath)).toBe(true);
  });
});
