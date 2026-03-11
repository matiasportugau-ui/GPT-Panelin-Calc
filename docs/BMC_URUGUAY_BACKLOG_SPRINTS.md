# BMC Uruguay — Backlog Ejecutable por Sprint

Documento operativo basado en el contexto consolidado de arquitectura y plan del proyecto **BMC Uruguay**.

## 1) Objetivo del programa

Diseñar e implementar un sistema unificado para gestionar clientes, interacciones, cotizaciones, PDFs/editables, seguimiento comercial y automatización operativa.

## 2) Definiciones base (congeladas)

- Empresa oficial: **BMC Uruguay**.
- Escenarios de cotización: `solo_techo`, `solo_fachada`, `techo_fachada`, `camara_frig`.
- Referencia de cotización (propuesta): `BMC-COT-YYYY-NNNN`.
- Versionado de revisiones: `BMC-COT-YYYY-NNNN-V1`, `V2`, etc.
- Regla documental: el PDF enviado al cliente es **inmutable**.
- Stack operativo objetivo:
  - Google Sheets (tracker comercial)
  - Google Drive (documentos y carpetas)
  - Google Apps Script (automatización)
  - Calculadora BMC/backend (cálculo técnico)
  - `pdf_generator.py` / pipeline PDF (emisión formal)
  - Cursor + GitHub (desarrollo y QA)

## 3) Estados estándar recomendados

Estados para cerrar en Sprint 1:

1. `nuevo_lead`
2. `relevamiento`
3. `cotizando`
4. `cotizada_enviada`
5. `negociacion`
6. `ganada`
7. `perdida`
8. `en_espera`

Prioridades:

- `alta`
- `media`
- `baja`
- `sin_prioridad`

## 4) Plan de sprints (6 sprints)

## Sprint 1 — Fundación funcional y contratos

**Objetivo:** congelar reglas de negocio, naming, estados y contratos técnicos.

### Tareas

| ID | Agente | Prioridad | Dependencias | Entregable | Criterio de aceptación |
|---|---|---|---|---|---|
| S1-A1-01 | A1 Arquitectura | Alta | — | Especificación de entidades (Clientes, Interacciones, Cotizaciones, Líneas, Seguimiento) | Documento versionado con campos obligatorios, tipos y claves únicas. |
| S1-A1-02 | A1 Arquitectura | Alta | S1-A1-01 | Contrato I/O de cotización y emisión documental | JSON schema para input técnico, output cálculo y metadatos de emisión. |
| S1-A1-03 | A1 Arquitectura | Alta | S1-A1-01 | Estados y transiciones comerciales | Matriz de estados + reglas de transición válidas/inválidas. |
| S1-A6-01 | A6 QA/DevOps | Media | S1-A1-02 | Set de casos de aceptación E2E | 10+ casos Given/When/Then (incluye revisiones V1/V2 e idempotencia). |

## Sprint 2 — Tracker productivo y automatización base (Sheets/Drive)

**Objetivo:** dejar operativo el tracker con correlativo, validaciones y estructura de carpetas.

### Tareas

| ID | Agente | Prioridad | Dependencias | Entregable | Criterio de aceptación |
|---|---|---|---|---|---|
| S2-A2-01 | A2 Apps Script | Alta | S1-A1-01 | Hoja tracker definitiva con columnas mínimas | Columnas: Fecha, Cliente, Teléfono, Origen, Pedido, Prioridad, Estado, Responsable, Próxima acción, Fecha próxima acción, Datos faltantes, Cotización enviada, Observaciones, Resultado final. |
| S2-A2-02 | A2 Apps Script | Alta | S2-A2-01 | Validaciones y listas desplegables | Celdas críticas con validación de estado/prioridad/escenario/familia. |
| S2-A2-03 | A2 Apps Script | Alta | S1-A1-02 | Correlativo único de cotización | Generación automática sin colisiones (`BMC-COT-YYYY-NNNN`). |
| S2-A2-04 | A2 Apps Script | Alta | S2-A2-03 | Creación de carpeta Drive por cotización | Estructura por fecha + referencia + cliente, con URL escrita en tracker. |
| S2-A2-05 | A2 Apps Script | Media | S2-A2-01 | Score de prioridad + semáforo operativo | Prioridad calculada y colorización según reglas acordadas. |

## Sprint 3 — Integración cálculo técnico y persistencia de cotización

**Objetivo:** conectar tracker -> motor de cálculo -> persistencia de resultados.

### Tareas

| ID | Agente | Prioridad | Dependencias | Entregable | Criterio de aceptación |
|---|---|---|---|---|---|
| S3-A3-01 | A3 Backend | Alta | S1-A1-02 | Endpoint de cotización unificado | Recibe escenario/familia/espesor/medidas y devuelve BOM + subtotal + IVA + total. |
| S3-A3-02 | A3 Backend | Alta | S3-A3-01 | Persistencia de cotización y versionado | Guarda cotización y versiones (V1, V2...) con historial auditable. |
| S3-A5-01 | A5 Frontend | Media | S3-A3-01 | Integración de formularios con API | Carga de datos técnicos desde UI o sheet con validaciones de cliente. |
| S3-A6-02 | A6 QA/DevOps | Alta | S3-A3-02 | Tests integración cálculo/versionado | Cobertura de casos nominales, errores de validación y reintentos. |

## Sprint 4 — Pipeline documental (editable + PDF estable + links)

**Objetivo:** emitir documentos formales y registrar links en la fila del tracker.

### Tareas

| ID | Agente | Prioridad | Dependencias | Entregable | Criterio de aceptación |
|---|---|---|---|---|---|
| S4-A4-01 | A4 PDF | Alta | S1-A1-02 | Contrato final de `pdf_generator.py` | Input/Output definido con payload JSON versionado. |
| S4-A4-02 | A4 PDF | Alta | S4-A4-01, S3-A3-02 | Generación PDF formal inmutable | PDF incluye referencia + versión + cliente + totales, y no se sobreescribe. |
| S4-A2-06 | A2 Apps Script | Alta | S4-A4-02, S2-A2-04 | Escritura de links en tracker | Se guardan URL de editable, PDF y carpeta en la fila correcta. |
| S4-A3-03 | A3 Backend | Media | S4-A4-02 | Endpoint emisión documental | Un request orquesta generación editable/PDF y retorna links. |

## Sprint 5 — Seguimiento comercial automatizado y tablero gerencial

**Objetivo:** automatizar seguimiento y visibilidad de cartera comercial.

### Tareas

| ID | Agente | Prioridad | Dependencias | Entregable | Criterio de aceptación |
|---|---|---|---|---|---|
| S5-A2-07 | A2 Apps Script | Alta | S2-A2-01 | Alertas de leads vencidos | Trigger diario notifica oportunidades vencidas por responsable. |
| S5-A2-08 | A2 Apps Script | Media | S5-A2-07 | Resumen diario por mail | Envío automático con pendientes, vencidas y próximas acciones. |
| S5-A2-09 | A2 Apps Script | Media | S2-A2-05 | Dashboard gerencial | KPIs mínimos: pendientes por prioridad, conversión, aging, responsables. |
| S5-A5-02 | A5 Frontend | Baja | S5-A2-09 | Vista comercial opcional | Tablero web simple conectado a datos consolidados. |

## Sprint 6 — Hardening, QA E2E y release

**Objetivo:** estabilizar, probar end-to-end y liberar versión productiva.

### Tareas

| ID | Agente | Prioridad | Dependencias | Entregable | Criterio de aceptación |
|---|---|---|---|---|---|
| S6-A6-03 | A6 QA/DevOps | Alta | S1..S5 | Suite E2E completa | Cobertura de flujo: consulta -> cotización -> emisión -> seguimiento. |
| S6-A6-04 | A6 QA/DevOps | Alta | S6-A6-03 | Checklist release + rollback | Procedimiento de release y contingencia documentado y probado. |
| S6-A1-04 | A1 Arquitectura | Media | S6-A6-03 | ADR final de arquitectura | Registro de decisiones finales y deudas técnicas remanentes. |

## 5) Backlog transversal (siempre activo)

| ID | Tipo | Prioridad | Descripción | Dueño sugerido |
|---|---|---|---|---|
| BL-01 | Naming | Alta | Cerrar naming oficial de referencias y estados. | A1 + Líder funcional |
| BL-02 | Datos | Alta | Congelar estructura definitiva del tracker. | A1 + A2 |
| BL-03 | Documental | Alta | Definir input/output exacto de `pdf_generator.py`. | A4 + A3 |
| BL-04 | Integración | Alta | Conectar carpetas, PDF y links con planilla productiva. | A2 + A3 + A4 |
| BL-05 | Integración | Alta | Integrar Calculadora BMC con persistencia y emisión documental. | A3 + A5 |
| BL-06 | Gestión | Media | Planificar backlog por sprint con capacity real del equipo. | Líder funcional + A6 |

## 6) Criterios de aceptación globales (Definition of Done)

Una historia/tarea se considera terminada si:

1. Tiene evidencia funcional (demo o prueba reproducible).
2. Tiene validación de negocio (Líder funcional).
3. Tiene trazabilidad (ID de cotización, versión y links de documentos).
4. Incluye tests mínimos (unit/integración/E2E según criticidad).
5. Está documentada (qué cambia, cómo usar, límites conocidos).

## 7) Riesgos principales y mitigaciones

- Riesgo: ambigüedad en estados/naming.  
  Mitigación: cierre formal en Sprint 1 (BL-01).
- Riesgo: generación documental no idempotente.  
  Mitigación: versionado explícito + pruebas de reintento.
- Riesgo: desalineación entre Sheets, backend y PDF.  
  Mitigación: contrato I/O único y pruebas E2E obligatorias.
- Riesgo: sobrecarga operativa sin automatización.  
  Mitigación: alertas, semáforo y resumen diario desde Sprint 5.

## 8) Orden recomendado de ejecución inmediata (próximos 7 días)

1. Cerrar BL-01 y BL-02 (naming + tracker definitivo).
2. Completar contrato S1-A1-02 (I/O cotización y documental).
3. Ejecutar S2-A2-03 y S2-A2-04 (correlativo + carpetas Drive).
4. Definir contrato de `pdf_generator.py` (S4-A4-01) antes de integración dura.
