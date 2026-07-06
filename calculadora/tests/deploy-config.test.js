const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

function assertRelativeFileExists(relativePath) {
  const normalized = relativePath.replace(/^\/+/, '');
  const fullPath = path.join(projectRoot, normalized);

  expect(fs.existsSync(fullPath)).toBe(true);
  expect(fs.statSync(fullPath).isFile()).toBe(true);
}

describe('Vercel deployment config', () => {
  test('function targets and rewrites point to existing files', () => {
    const vercelConfig = JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'vercel.json'), 'utf8')
    );

    for (const [functionPath, functionConfig] of Object.entries(vercelConfig.functions || {})) {
      assertRelativeFileExists(functionPath);

      if (functionConfig.includeFiles) {
        assertRelativeFileExists(functionConfig.includeFiles);
      }
    }

    for (const rewrite of vercelConfig.rewrites || []) {
      assertRelativeFileExists(rewrite.destination);
    }
  });
});
