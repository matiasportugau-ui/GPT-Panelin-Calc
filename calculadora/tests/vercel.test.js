'use strict';

const fs = require('fs');
const path = require('path');

describe('Vercel deployment config', () => {
  test('rewrites all routes to an existing API entrypoint', () => {
    const projectRoot = path.join(__dirname, '..');
    const configPath = path.join(projectRoot, 'vercel.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    expect(Object.prototype.hasOwnProperty.call(config.functions, 'src/api/server.js')).toBe(true);
    expect(fs.existsSync(path.join(projectRoot, 'src/api/server.js'))).toBe(true);
    expect(config.rewrites).toContainEqual({
      source: '/(.*)',
      destination: '/src/api/server.js',
    });
  });
});
