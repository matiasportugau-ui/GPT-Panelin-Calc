const fs = require('fs');
const path = require('path');

const repositoryRoot = path.resolve(__dirname, '..', '..');

describe('GPT PDF flow configuration', () => {
  test('prefers recalculated PDF payloads and rejects raw cotizacion_data guidance', () => {
    const configPath = path.join(repositoryRoot, 'gpt', 'Panelin_GPT_config_v6.json');
    const actionSchemaPath = path.join(repositoryRoot, 'gpt', 'gpt_action_schema.yaml');

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const pdfFlow = config.instrucciones.flujo_pdf;
    const validForms = pdfFlow.formas_validas_de_llamar_pdf.join('\n');
    const actionSchema = fs.readFileSync(actionSchemaPath, 'utf8');

    expect(pdfFlow.regla_critica).toMatch(/NUNCA enviar cotizacion_data/);
    expect(pdfFlow.paso_2_con_params).toMatch(/recalcule la cotización/);
    expect(validForms.split('\n')[0]).toMatch(/recalcula/);
    expect(validForms).toMatch(/fallback cache[\s\S]*cotizacion_id/);

    expect(actionSchema).toMatch(/1\. Los mismos parámetros de \/api\/cotizar/);
    expect(actionSchema).toMatch(/2\. cotizacion_id \(fallback cache in-memory/);
    expect(actionSchema).toMatch(/Nunca enviar cotizacion_data/);
    expect(actionSchema).not.toMatch(/cotizacion_data:\n\s+type: object/);
    expect(actionSchema).not.toMatch(/cotizacion_id.*(FORMA PREFERIDA|más simple y confiable)/i);
  });
});
