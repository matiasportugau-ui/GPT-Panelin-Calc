'use strict';

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const vercelConfig = require('../vercel.json');

describe('Vercel deployment configuration', () => {
  test('every configured function and rewrite destination exists', () => {
    const configuredPaths = [
      ...Object.keys(vercelConfig.functions || {}),
      ...(vercelConfig.rewrites || []).map(({ destination }) =>
        destination.replace(/^\/+/, '')
      ),
    ];

    expect(configuredPaths.length).toBeGreaterThan(0);

    for (const configuredPath of configuredPaths) {
      expect(fs.existsSync(path.join(projectRoot, configuredPath))).toBe(true);
    }
  });
});
