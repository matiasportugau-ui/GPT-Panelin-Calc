'use strict';

const path = require('path');
const fs = require('fs');
const request = require('supertest');
const app = require('../src/api/server');

const FIXTURE_DOCX = path.join(__dirname, 'fixtures', 'test.docx');

describe('POST /api/convert-docx', () => {
  test('400 when no file is attached', async () => {
    const res = await request(app).post('/api/convert-docx');
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  test('converts DOCX fixture to PDF', async () => {
    const res = await request(app)
      .post('/api/convert-docx')
      .attach('file', FIXTURE_DOCX);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/pdf/);
    expect(parseInt(res.headers['content-length'])).toBeGreaterThan(0);
    expect(res.headers['content-disposition']).toContain('test.pdf');

    const magicBytes = res.body.slice(0, 5).toString('ascii');
    expect(magicBytes).toBe('%PDF-');
  }, 30000);

  test('rejects non-DOCX file', async () => {
    const tmpTxt = path.join(__dirname, 'fixtures', '_temp.txt');
    fs.writeFileSync(tmpTxt, 'plain text');
    try {
      const res = await request(app)
        .post('/api/convert-docx')
        .attach('file', tmpTxt);
      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    } finally {
      fs.unlinkSync(tmpTxt);
    }
  });
});
