const fs = require('fs');
const path = require('path');

const repositoryRoot = path.resolve(__dirname, '..', '..');

describe('GPT PDF flow configuration', () => {
  test('prefers serverless-safe PDF payloads over cotizacion_id cache lookups', () => {
    const configPath = path.join(repositoryRoot, 'gpt', 'Panelin_GPT_config_v6.json');
    const actionSchemaPath = path.join(repositoryRoot, 'gpt', 'gpt_action_schema.yaml');

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const pdfFlow = config.instrucciones.flujo_pdf;
    const validForms = pdfFlow.formas_validas_de_llamar_pdf.join('\n');
    const actionSchema = fs.readFileSync(actionSchemaPath, 'utf8');

    expect(pdfFlow.regla_critica).toMatch(/NUNCA depender exclusivamente de cotizacion_id/);
    expect(pdfFlow.paso_2_con_data).toMatch(/cotizacion_data/);
    expect(validForms.split('\n')[0]).toMatch(/cotizacion_data/);
    expect(validForms).toMatch(/cotizacion_id.*fallback cache/);

    expect(actionSchema).toMatch(/1\. cotizacion_data completa/);
    expect(actionSchema).toMatch(/3\. cotizacion_id \(fallback cache in-memory/);
    expect(actionSchema).not.toMatch(/cotizacion_id.*(FORMA PREFERIDA|más simple y confiable)/i);
  });
});
