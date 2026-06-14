'use strict';

const fs = require('fs');
const path = require('path');

describe('vercel deployment config', () => {
  const projectRoot = path.resolve(__dirname, '..');
  const config = require('../vercel.json');

  test('rewrites all routes to an existing server entrypoint', () => {
    expect(config.rewrites).toEqual([
      { source: '/(.*)', destination: '/src/api/server.js' },
    ]);

    const destination = config.rewrites[0].destination.replace(/^\//, '');
    expect(fs.existsSync(path.join(projectRoot, destination))).toBe(true);
  });

  test('function settings target the same existing server entrypoint', () => {
    expect(Object.keys(config.functions)).toEqual(['src/api/server.js']);
    expect(fs.existsSync(path.join(projectRoot, 'src/api/server.js'))).toBe(true);
  });
});
