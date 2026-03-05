'use strict';

/**
 * Genera el HTML estético del Manual de Lógica de Cálculo.
 * Autocontenido (CSS inline). Listo para imprimir o mostrar en browser.
 */
function generarHTML(cfg) {
  const fp   = cfg.formula_params;
  const fpt  = fp.techo;
  const fpp  = fp.pared;
  const ver  = cfg._version || '—';
  const upd  = cfg._actualizado || '—';
  const iva  = (cfg.iva_rate * 100).toFixed(0);

  /* ── helpers ─────────────────────────────────────────────────────────── */
  const tr = (cells, head = false) => {
    const tag = head ? 'th' : 'td';
    return `<tr>${cells.map(c => `<${tag}>${c}</${tag}>`).join('')}</tr>`;
  };

  const badge = (text, color = '#2563eb') =>
    `<span style="background:${color};color:#fff;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600;letter-spacing:.4px">${text}</span>`;

  const formula = (label, expr) =>
    `<div class="formula"><span class="f-label">${label}</span><code>${expr}</code></div>`;

  const section = (icon, title, content) =>
    `<section><h2>${icon} ${title}</h2>${content}</section>`;

  const noteBox = (text) =>
    `<div class="note">💡 ${text}</div>`;

  const warnBox = (text) =>
    `<div class="warn">⚠️ ${text}</div>`;

  /* ── tabla accesorios ─────────────────────────────────────────────────── */
  const accRows = Object.entries(cfg.accesorios)
    .filter(([k]) => !k.startsWith('_'))
    .map(([sku, a]) => tr([
      `<code>${sku}</code>`,
      a.nombre,
      `<strong>$${a.precio_venta.toFixed(2)}</strong>`,
      `$${(a.precio_web ?? a.precio_venta).toFixed(2)}`,
      a.unidad,
      a.largo_m ? `${a.largo_m} m` : '—',
    ])).join('');

  /* ── tabla largos ─────────────────────────────────────────────────────── */
  const largosRows = Object.entries(cfg.panel_largos)
    .filter(([k]) => !k.startsWith('_'))
    .map(([fam, l]) => tr([fam, `${l.lmin} m`, `${l.lmax} m`])).join('');

  /* ── tabla colores ────────────────────────────────────────────────────── */
  const coloresRows = Object.entries(cfg.colores)
    .filter(([k]) => !k.startsWith('_'))
    .flatMap(([fam, cols]) =>
      Object.entries(cols).filter(([c]) => !c.startsWith('_')).map(([color, r]) => {
        const restr = [];
        if (r.colMax_mm)   restr.push(`máx. ${r.colMax_mm}mm`);
        if (r.minArea_m2)  restr.push(`mín. ${r.minArea_m2} m²`);
        if (r.nota)        restr.push(r.nota);
        return tr([fam, color, restr.join(' · ') || '—']);
      })
    ).join('');

  /* ── HTML ─────────────────────────────────────────────────────────────── */
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Manual de Lógica — Calculadora BMC Panelin v${ver}</title>
<style>
  /* ── Reset & base ───────────────────────────────────────────────────── */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --blue:   #1e40af;
    --blue2:  #3b82f6;
    --teal:   #0d9488;
    --amber:  #d97706;
    --red:    #dc2626;
    --slate:  #1e293b;
    --muted:  #64748b;
    --bg:     #f8fafc;
    --card:   #ffffff;
    --border: #e2e8f0;
    --code:   #f1f5f9;
    --radius: 10px;
  }
  body {
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    background: var(--bg);
    color: var(--slate);
    font-size: 14px;
    line-height: 1.6;
    padding: 24px 16px;
  }

  /* ── Layout ─────────────────────────────────────────────────────────── */
  .wrapper  { max-width: 900px; margin: 0 auto; }
  section   { background: var(--card); border-radius: var(--radius);
              border: 1px solid var(--border); padding: 28px 32px;
              margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,.05); }

  /* ── Header ─────────────────────────────────────────────────────────── */
  .hero {
    background: linear-gradient(135deg, #1e3a5f 0%, #1e40af 50%, #0d9488 100%);
    color: #fff; border-radius: 16px; padding: 40px 40px 36px;
    margin-bottom: 24px; position: relative; overflow: hidden;
  }
  .hero::before {
    content: ''; position: absolute; top: -60px; right: -60px;
    width: 240px; height: 240px; border-radius: 50%;
    background: rgba(255,255,255,.06);
  }
  .hero h1   { font-size: 26px; font-weight: 700; letter-spacing: -.3px; margin-bottom: 6px; }
  .hero p    { opacity: .85; font-size: 13px; }
  .hero .meta { display: flex; gap: 20px; margin-top: 20px; flex-wrap: wrap; }
  .hero .chip {
    background: rgba(255,255,255,.15); border-radius: 99px;
    padding: 4px 14px; font-size: 12px; font-weight: 600; letter-spacing: .3px;
  }

  /* ── Headings ────────────────────────────────────────────────────────── */
  h2 { font-size: 16px; font-weight: 700; color: var(--blue);
       margin-bottom: 18px; padding-bottom: 10px;
       border-bottom: 2px solid var(--border); }
  h3 { font-size: 13px; font-weight: 700; color: var(--teal);
       margin: 20px 0 10px; text-transform: uppercase; letter-spacing: .5px; }

  /* ── Tables ──────────────────────────────────────────────────────────── */
  table  { width: 100%; border-collapse: collapse; font-size: 13px; }
  th     { background: var(--blue); color: #fff; padding: 9px 12px;
           text-align: left; font-weight: 600; font-size: 11px;
           text-transform: uppercase; letter-spacing: .5px; }
  td     { padding: 8px 12px; border-bottom: 1px solid var(--border);
           vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  tr:nth-child(even) td { background: var(--bg); }
  code   { font-family: 'Fira Code', 'Cascadia Code', Consolas, monospace;
           font-size: 12px; background: var(--code);
           padding: 1px 5px; border-radius: 4px; color: var(--blue); }

  /* ── Formula boxes ───────────────────────────────────────────────────── */
  .formula {
    background: var(--code); border-left: 4px solid var(--teal);
    border-radius: 0 6px 6px 0; padding: 12px 16px; margin: 10px 0;
    display: flex; flex-direction: column; gap: 4px;
  }
  .formula .f-label { font-size: 11px; color: var(--muted); font-weight: 600;
                      text-transform: uppercase; letter-spacing: .4px; }
  .formula code { background: none; padding: 0; font-size: 13px; color: var(--slate); }

  /* ── System cards ────────────────────────────────────────────────────── */
  .systems { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px,1fr));
             gap: 14px; margin: 12px 0 20px; }
  .sys-card {
    border: 2px solid var(--border); border-radius: 8px; padding: 16px;
    position: relative;
  }
  .sys-card.vt  { border-color: #6366f1; }
  .sys-card.cab { border-color: var(--teal); }
  .sys-card.tmo { border-color: var(--amber); }
  .sys-card h4  { font-size: 12px; font-weight: 700; margin-bottom: 6px; }
  .sys-card.vt h4  { color: #6366f1; }
  .sys-card.cab h4 { color: var(--teal); }
  .sys-card.tmo h4 { color: var(--amber); }
  .sys-card ul  { list-style: none; padding: 0; font-size: 12px; color: var(--muted); }
  .sys-card ul li::before { content: '▸ '; }
  .sys-card .families { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 4px; }
  .sys-card .fam-tag  {
    background: var(--code); border-radius: 4px; padding: 2px 6px;
    font-size: 10px; font-weight: 600; font-family: monospace;
  }

  /* ── Flow diagram ────────────────────────────────────────────────────── */
  .flow {
    background: var(--code); border-radius: 8px; padding: 18px 20px;
    font-family: monospace; font-size: 12px; line-height: 1.8;
    color: var(--slate); margin: 14px 0; white-space: pre;
    overflow-x: auto;
  }

  /* ── Note / warn boxes ───────────────────────────────────────────────── */
  .note { background: #eff6ff; border-left: 4px solid var(--blue2);
          border-radius: 0 6px 6px 0; padding: 10px 14px; margin: 12px 0;
          font-size: 13px; color: #1e3a8a; }
  .warn { background: #fffbeb; border-left: 4px solid var(--amber);
          border-radius: 0 6px 6px 0; padding: 10px 14px; margin: 12px 0;
          font-size: 13px; color: #78350f; }

  /* ── Command block ───────────────────────────────────────────────────── */
  .cmd { background: #0f172a; border-radius: 8px; padding: 14px 18px;
         font-family: monospace; font-size: 12px; color: #94a3b8;
         margin: 10px 0; overflow-x: auto; }
  .cmd .prompt { color: #10b981; }
  .cmd .url    { color: #38bdf8; }
  .cmd .flag   { color: #a78bfa; }

  /* ── Footer ─────────────────────────────────────────────────────────── */
  footer { text-align: center; color: var(--muted); font-size: 12px;
           padding: 20px 0; }

  /* ── Print ───────────────────────────────────────────────────────────── */
  @media print {
    body { background: #fff; padding: 0; font-size: 12px; }
    .hero { background: #1e3a5f !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    th    { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    section { box-shadow: none; border: 1px solid #ccc; }
    .cmd  { background: #1e293b !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
<div class="wrapper">

<!-- ── HERO ─────────────────────────────────────────────────────────────── -->
<div class="hero">
  <h1>📐 Manual de Lógica de Cálculo<br>Calculadora BMC · Panelin Uruguay</h1>
  <p>Referencia completa de fórmulas, precios y parámetros del motor de presupuestación.</p>
  <div class="meta">
    <span class="chip">📦 Versión ${ver}</span>
    <span class="chip">🗓 Actualizado ${upd}</span>
    <span class="chip">🏷 IVA ${iva}%</span>
    <span class="chip">💵 Precios USD excl. IVA</span>
  </div>
</div>

<!-- ── FLUJO GENERAL ──────────────────────────────────────────────────────── -->
${section('🔄', 'Flujo General del Sistema', `
<div class="flow">  ENTRADA (POST /api/cotizar)
  ├─ escenario: solo_techo | solo_fachada | techo_fachada | camara_frigorifica
  ├─ familia + espesor_mm
  ├─ ancho_m (o cant_paneles) + largo_m
  └─ opciones: color, aberturas[], esquineros, gotero_frontal, canalon…

        ▼
  ┌─────────────────────────────────────────────────┐
  │  1. Validaciones                                │
  │     • lmin / lmax por familia                   │
  │     • restricción de color                      │
  │     • autoportancia (luz libre)                 │
  └─────────────────────────────────────────────────┘
        ▼
  ┌─────────────────────────────────────────────────┐
  │  2. Cálculo de secciones                        │
  │     [TECHO]  paneles + goteros + fijaciones     │
  │     [PARED]  paneles netos (−aberturas) + perf. │
  └─────────────────────────────────────────────────┘
        ▼
  ┌─────────────────────────────────────────────────┐
  │  3. Resumen financiero                          │
  │     subtotal_sin_iva + IVA ${iva}% = total_con_iva   │
  └─────────────────────────────────────────────────┘
        ▼
  SALIDA JSON: cotizacion_id, fecha, secciones[], resumen{}
</div>
${noteBox('Todos los precios y parámetros de fórmulas se leen en tiempo real desde <code>logic_config.json</code>. Un POST a <code>/api/logica</code> actualiza sin reiniciar el servidor.')}
`)}

<!-- ── SISTEMAS DE FIJACIÓN ──────────────────────────────────────────────── -->
${section('🔩', 'Sistemas de Fijación por Familia de Panel', `
<div class="systems">
  <div class="sys-card vt">
    <h4>⬡ Varilla-Tuerca 3/8"</h4>
    <ul>
      <li>Varilla roscada 3/8"</li>
      <li>Tuercas galv. × 2</li>
      <li>Arandelas carrocero × 2</li>
      <li>Tortuga PVC (PP) × 2</li>
      <li>+ Taco expansivo si hormigón</li>
    </ul>
    <div class="families">
      <span class="fam-tag">ISODEC_EPS</span>
      <span class="fam-tag">ISODEC_PIR</span>
    </div>
  </div>
  <div class="sys-card cab">
    <h4>🏔 Caballete + Tornillo Aguja</h4>
    <ul>
      <li>Caballetes (arandela trap.)</li>
      <li>Tornillos aguja 5" × caja 100u</li>
      <li>2 tornillos por caballete</li>
    </ul>
    <div class="families">
      <span class="fam-tag">ISOROOF_3G</span>
      <span class="fam-tag">ISOROOF_FOIL</span>
      <span class="fam-tag">ISOROOF_PLUS</span>
    </div>
  </div>
  <div class="sys-card tmo">
    <h4>🔧 TMOME + ARATRAP</h4>
    <ul>
      <li>Tornillos TMOME</li>
      <li>Arandelas trapezoidales</li>
      <li>${fpt.tornillos_por_m2_tmome} unidades por m²</li>
    </ul>
    <div class="families">
      <span class="fam-tag">ISOPANEL_EPS</span>
      <span class="fam-tag">ISOWALL_PIR</span>
      <span class="fam-tag">ISOFRIG_PIR</span>
    </div>
  </div>
</div>

<h3>Fórmulas de Fijación — TECHO</h3>
${formula(
  'Varilla-Tuerca · Puntos de fijación',
  `ptos = ⌈ (paneles × apoyos × ${fpt.varilla_tuerca.laterales_por_punto}) + (largo × 2 / ${fpt.varilla_tuerca.intervalo_largo_m}) ⌉`
)}
${formula(
  'Varilla-Tuerca · Varillas',
  `varillas = ⌈ ptos × ${fpt.varilla_tuerca.varillas_por_punto} ⌉   →   tuercas = arandelas_carrocero = arandelas_PP = varillas × 2`
)}
${formula(
  'Caballete-Tornillo · Caballetes',
  `caballetes = ⌈ paneles × ${fpt.caballete.tramos_por_panel} × (largo / ${fpt.caballete.paso_apoyo_m} + 1) + largo × 2 / ${fpt.caballete.intervalo_perimetro_m} ⌉`
)}
${formula(
  'Caballete-Tornillo · Cajas tornillo aguja ×100',
  `cajas = ⌈ caballetes × 2 / 100 ⌉`
)}
${formula(
  'TMOME · Tornillos',
  `tornillos = ⌈ area_m² × ${fpt.tornillos_por_m2_tmome} ⌉`
)}
`)}

<!-- ── TECHO: GOTEROS ─────────────────────────────────────────────────────── -->
${section('🏠', 'Techo — Goteros y Terminaciones', `
<table>
  ${tr(['Elemento','Fórmula cantidad','SKU ejemplo'], true)}
  ${tr(['Gotero frontal (liso)', `⌈ ancho_efectivo / ${ISOROOF_GOTERO_FRONTAL_LENGTH} ⌉`, 'GFS50, GFS80…'])}
  ${tr(['Gotero frontal (greca)', '⌈ ancho / 3.03 ⌉ · Solo ISOROOF', 'GFCGR30'])}
  ${tr(['Gotero superior / babeta', '⌈ ancho / 3.03 ⌉', 'GFSUP50…'])}
  ${tr(['Goteros laterales ×2', '⌈ largo / 3.0 ⌉ × 2', 'GL50, GL80…'])}
  ${tr(['Cumbrera (si aplica)', '⌈ ancho / 3.0 ⌉', 'CUMROOF3M'])}
  ${tr(['Canalón (si aplica)', '⌈ ancho / 3.03 ⌉', 'CD50, CD80…'])}
  ${tr(['Soporte canalón', `⌈ ancho / ${fpt.soporte_canalon_intervalo_m} ⌉`, 'SOPCAN3M'])}
</table>
${noteBox('Para ISOROOF: <code>tipo_gotero_frontal: "greca"</code> sustituye el gotero frontal estándar por GFCGR30.')}

<h3>Selladores — Techo</h3>
${formula('Cinta butilo (rollos)', `⌈ (paneles − 1) × largo / ${fpt.butilo_ml_por_rollo_m} ⌉   (mínimo 1)`)}
${formula('Silicona Bromplast (cartuchos)', `⌈ paneles × ${fpt.silicona_cartuchos_por_panel} ⌉`)}
`)}

<!-- ── PARED / FACHADA ────────────────────────────────────────────────────── -->
${section('🧱', 'Pared / Fachada — Perfilería y Fijaciones', `
<h3>Área de Paneles</h3>
${formula('Área bruta', `cantP × ancho_útil_panel × alto`)}
${formula('Descuento aberturas', `Σ (ancho_ab × alto_ab × cant_ab)   ← cada abertura con dimensiones reales`)}
${formula('Área neta (costo real)', `area_bruta − area_aberturas`)}
${noteBox('El precio de los paneles se calcula sobre el <strong>área neta</strong>. La cantidad de paneles sigue siendo sobre el área bruta.')}

<h3>Perfilería</h3>
<table>
  ${tr(['Elemento','Fórmula cantidad','Largo pieza'], true)}
  ${tr(['Perfil U (soleras sup+inf)', `⌈ ancho × 2 / ${fpp.perfil_u_largo_pieza_m} ⌉`, `${fpp.perfil_u_largo_pieza_m} m`])}
  ${tr(['Perfil K2 junta interior', `(paneles − 1) × ⌈ alto / ${fpp.k2_largo_pieza_m} ⌉`, `${fpp.k2_largo_pieza_m} m`])}
  ${tr(['Esquinero ext/int', `num_esq × ⌈ alto / ${fpp.esq_largo_pieza_m} ⌉`, `${fpp.esq_largo_pieza_m} m`])}
  ${tr(['Ángulo aluminio 5852', `⌈ ancho / ${fpp.angulo_5852_largo_pieza_m} ⌉`, `${fpp.angulo_5852_largo_pieza_m} m`])}
</table>

<h3>Fijaciones — Pared</h3>
${formula('TMOME (estr. metal/mixto)', `⌈ area_neta × ${fpp.tornillos_por_m2_tmome} ⌉   (TMOME + ARATRAP en igual cantidad)`)}
${formula('Anclajes H° (siempre)', `⌈ ancho_efectivo / ${fpp.anclaje_intervalo_m} ⌉   → 1 anclaje cada ${fpp.anclaje_intervalo_m * 100}cm`)}
${formula('Remaches POP', `⌈ (paneles × ${fpp.remaches_por_panel}) / ${fpp.remaches_por_caja} ⌉   cajas de ${fpp.remaches_por_caja} u`)}

<h3>Selladores — Pared</h3>
${formula('Cinta butilo (rollos)', `⌈ (paneles − 1) × alto / ${fpp.butilo_ml_por_rollo_m} ⌉   (mínimo 1)`)}
${formula('ML de juntas', `(paneles − 1) × alto + ancho × 2`)}
${formula('Silicona Bromplast (cartuchos)', `⌈ ml_juntas / ${fpp.silicona_ml_por_cartucho} ⌉   (1 cartucho cubre ${fpp.silicona_ml_por_cartucho} ml de junta)`)}
`)}

<!-- ── LARGOS MIN/MAX ───────────────────────────────────────────────────────── -->
${section('📏', 'Largos Mínimos y Máximos de Fabricación', `
<table>
  ${tr(['Familia','Mínimo (m)','Máximo (m)'], true)}
  ${largosRows}
</table>
${warnBox('Si el largo solicitado cae fuera del rango, la cotización se emite con un <strong>warning</strong> pero no se bloquea.')}
`)}

<!-- ── COLORES ─────────────────────────────────────────────────────────────── -->
${section('🎨', 'Disponibilidad de Colores por Familia', `
<table>
  ${tr(['Familia','Color','Restricciones'], true)}
  ${coloresRows}
</table>
`)}

<!-- ── PRECIOS ACCESORIOS ─────────────────────────────────────────────────── -->
${section('💰', 'Precios de Accesorios (USD excl. IVA)', `
<p style="color:var(--muted);font-size:12px;margin-bottom:12px">
  Estos precios están en <code>logic_config.json</code> → sección <code>accesorios</code>.
  Los paneles y algunos accesorios adicionales se leen desde <code>catalog_real.csv</code>.
</p>
<table>
  ${tr(['SKU','Descripción','$ Venta','$ Web','Unidad','Largo'], true)}
  ${accRows}
</table>
`)}

<!-- ── COMANDOS API ─────────────────────────────────────────────────────────── -->
${section('⌨️', 'Comandos de la API', `
<h3>Descargar lógica actual (JSON)</h3>
<div class="cmd"><span class="prompt">$</span> curl <span class="url">http://HOST/api/logica</span></div>

<h3>Ver manual imprimible (Markdown)</h3>
<div class="cmd"><span class="prompt">$</span> curl <span class="url">http://HOST/api/logica/md</span></div>

<h3>Ver manual visual (este documento)</h3>
<div class="cmd"><span class="prompt">$</span> curl <span class="url">http://HOST/api/logica/html</span> <span class="flag">-o manual.html</span> &amp;&amp; open manual.html</div>

<h3>Subir lógica actualizada (recarga en caliente)</h3>
<div class="cmd"><span class="prompt">$</span> curl <span class="flag">-X POST</span> <span class="url">http://HOST/api/logica</span> \\<br>
  &nbsp;&nbsp;<span class="flag">-H "Content-Type: application/json"</span> \\<br>
  &nbsp;&nbsp;<span class="flag">-d @logic_config.json</span></div>

<h3>Cotizar (ejemplo completo)</h3>
<div class="cmd"><span class="prompt">$</span> curl <span class="flag">-X POST</span> <span class="url">http://HOST/api/cotizar</span> \\<br>
  &nbsp;&nbsp;<span class="flag">-H "Content-Type: application/json"</span> \\<br>
  &nbsp;&nbsp;<span class="flag">-d</span> '{<br>
  &nbsp;&nbsp;&nbsp;&nbsp;"escenario": "techo_fachada",<br>
  &nbsp;&nbsp;&nbsp;&nbsp;"familia": "ISOROOF_3G", "espesor_mm": 50,<br>
  &nbsp;&nbsp;&nbsp;&nbsp;"ancho_m": 10, "largo_m": 6,<br>
  &nbsp;&nbsp;&nbsp;&nbsp;"tiene_canalon": true,<br>
  &nbsp;&nbsp;&nbsp;&nbsp;"tipo_gotero_frontal": "greca",<br>
  &nbsp;&nbsp;&nbsp;&nbsp;"aberturas": [{"ancho":0.9,"alto":2.1,"cant":1}],<br>
  &nbsp;&nbsp;&nbsp;&nbsp;"num_esq_ext": 2, "color": "Gris"<br>
  &nbsp;&nbsp;}'</div>

${noteBox(`<strong>Flujo de actualización de precios:</strong><br>
1. <code>GET /api/logica</code> → guardás el JSON<br>
2. Editás precios en cualquier editor (o me los pasás a mí en lenguaje natural)<br>
3. <code>POST /api/logica</code> con el JSON modificado → cambios activos inmediatamente`)}
`)}

<footer>
  Calculadora BMC Panelin Uruguay · v${ver} · Generado ${upd} · Todos los precios en USD excl. IVA ${iva}%
</footer>

</div>
</body>
</html>`;
}

// Placeholder usado en la tabla de goteros (valor real en techo.js)
const ISOROOF_GOTERO_FRONTAL_LENGTH = 3.03;

module.exports = { generarHTML };
