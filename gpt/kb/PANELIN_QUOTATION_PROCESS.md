# Proceso de Cotización — GPT Panelin v4.1

## Arquitectura: Separación de Responsabilidades

```
Cliente (conversa en lenguaje natural)
       ↓
GPT Panelin (Cerebro Conversacional)
  ✅ Extrae parámetros del lenguaje natural
  ✅ Conversa y asesora al cliente
  ✅ Presenta resultados de la API fielmente
  ❌ NO calcula precios, cantidades ni BOM
  ❌ NO memoriza datos — siempre consulta la API
       ↓ GPT Action (REST API)
Calculadora BMC API (Motor Determinista)
  ✅ Cálculos deterministas de BOM
  ✅ Precios actualizados desde precios.json
  ✅ Autoportancia validada por tabla interna
  ✅ PDF generado con jsPDF
  ✅ IVA 22% calculado automáticamente
```

## Flujo Paso a Paso

### Paso 1: Extracción de Parámetros
El GPT identifica en la conversación los 5 campos obligatorios:
- **escenario**: solo_techo | solo_fachada | techo_fachada | camara_frigorifica
- **familia**: ISODEC_EPS | ISODEC_PIR | ISOROOF_3G | ISOPANEL_EPS | ISOWALL_PIR
- **espesor_mm**: debe existir en la familia (consultar GET /api/productos si hay duda)
- **ancho_m**: ancho del área en metros
- **largo_m**: largo del área en metros

Y los opcionales si el cliente los menciona:
- lista_precios (venta/web), apoyos, num_aberturas, estructura

### Paso 2: Validación Pre-Call
Antes de llamar la API, verificar que los 5 obligatorios estén presentes.
Si falta alguno, preguntar al cliente. NO asumir valores.

### Paso 3: Llamada a la API
Llamar POST /api/cotizar con todos los parámetros extraídos.

### Paso 4: Presentación del Resultado
La API devuelve un JSON con esta estructura:
- **cotizacion_id**: UUID único
- **secciones[]**: cada sección tiene tipo (techo/pared/pared_frontal_posterior/pared_lateral), items[] con descripción, cantidad, unidad, precio unitario y subtotal
- **resumen**: subtotal_sin_iva, iva_22, total_con_iva, moneda
- **warnings[]**: advertencias de autoportancia (mostrar SIEMPRE)
- **envio_referencia_usd**: costo referencial de envío
- **nota**: disclaimer estándar

**REGLA ABSOLUTA: Presentar los valores EXACTOS de la API.**
No redondear. No aproximar. No omitir items. No omitir warnings.

Formato sugerido de presentación:
> Listar items principales con cantidad y subtotal
> Subtotal sin IVA: USD [valor exacto de la API]
> IVA 22%: USD [valor exacto de la API]
> **Total: USD [valor exacto de la API]**
> Envío referencia: USD [valor exacto de la API]
> [Mostrar warnings si los hay]

### Paso 5: PDF (si el cliente lo pide)
Llamar POST /api/pdf con:
- cotizacion_data: el objeto cotización completo de la respuesta anterior
- cliente: {nombre, celular, direccion} si se capturaron

## Escenarios y qué genera cada uno

| Escenario | Secciones generadas | Nota |
|-----------|-------------------|------|
| solo_techo | 1 sección: techo | BOM incluye paneles, fijaciones (varilla o caballete según familia), perfil borde, sellador |
| solo_fachada | 1 sección: pared | BOM incluye paneles, perfil U, perfil K2, perfil G2, kit anclaje, tornillos T2, remaches, sellador |
| techo_fachada | 2 secciones: techo + pared | Usa misma familia para ambos. Si necesita familias distintas, cotizar por separado |
| camara_frigorifica | 3 secciones: techo + pared_frontal_posterior + pared_lateral | Altura fija 3m. Techo + 4 paredes. 2 frontales + 2 laterales |

## Listas de Precios

| Lista | Uso | Cuándo aplicar |
|-------|-----|---------------|
| venta | Precio distribuidor/directo | Default. Clientes directos, constructoras, instaladores |
| web | Precio publicado en web | Cuando el cliente viene de bmcuruguay.com.uy |

## Limitaciones Actuales de la Calculadora v4.0

1. **Cámara frigorífica**: la altura se fija en 3m internamente. No se puede especificar otro valor desde la API. Si el cliente necesita otra altura, informar que es una limitación y cotizar manualmente.
2. **Fachada simple** (solo_fachada): el BOM calcula perfilería de 4 esquinas (perfil G2) incluso para una sola pared. El presupuesto puede estar levemente sobreestimado en accesorios.
3. **Familia vs escenario**: la API no restringe qué familia se usa en qué escenario. ISODEC funciona técnicamente para pared y ISOPANEL para techo. El GPT debe guiar al cliente hacia la familia correcta.
4. **techo_fachada**: usa la misma familia y espesor para techo y pared. Si el cliente necesita diferentes, hacer dos cotizaciones separadas (solo_techo + solo_fachada).
5. **Aberturas**: el parámetro num_aberturas se acepta pero actualmente no descuenta m² del BOM de forma visible.
6. **Autoportancia**: las luces máximas están tabuladas internamente. SIEMPRE consultar GET /api/autoportancia para datos actualizados — no memorizar valores.
