'use strict';

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');

function stripLeadingSlash(filePath) {
  return filePath.replace(/^\/+/, '');
}

describe('vercel.json', () => {
  test('routes requests to an existing serverless entrypoint', () => {
    const config = JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'vercel.json'), 'utf8'),
    );

    expect(config.rewrites).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: '/(.*)',
          destination: expect.any(String),
        }),
      ]),
    );

    for (const rewrite of config.rewrites) {
      const destination = stripLeadingSlash(rewrite.destination);
      const entrypoint = path.join(projectRoot, destination);

      expect(fs.existsSync(entrypoint)).toBe(true);
      expect(config.functions).toHaveProperty(destination);
    }
  });

  test('bundles existing files required by the serverless function', () => {
    const config = JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'vercel.json'), 'utf8'),
    );

    for (const functionConfig of Object.values(config.functions)) {
      const includeFiles = functionConfig.includeFiles
        ? [functionConfig.includeFiles].flat()
        : [];

      for (const includeFile of includeFiles) {
        expect(fs.existsSync(path.join(projectRoot, includeFile))).toBe(true);
      }
    }
  });
});
