'use strict';

const fs = require('fs');
const path = require('path');

describe('GPT PDF flow config', () => {
  test('prefers stateless PDF payloads over cache-backed cotizacion_id', () => {
    const repoRoot = path.join(__dirname, '..', '..');
    const configPath = path.join(repoRoot, 'gpt', 'Panelin_GPT_config_v6.json');
    const schemaPath = path.join(repoRoot, 'gpt', 'gpt_action_schema.yaml');

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const schema = fs.readFileSync(schemaPath, 'utf8');

    expect(config.instrucciones.flujo_pdf.forma_recomendada_1).toContain('cotizacion_data');
    expect(config.instrucciones.flujo_pdf.forma_best_effort).toContain('cotizacion_id');
    expect(config.instrucciones.flujo_pdf.forma_best_effort).toContain('serverless');
    expect(schema).toContain('cotizacion_data completa');
    expect(schema).toContain('cotizacion_id es solo best-effort');
  });
});
