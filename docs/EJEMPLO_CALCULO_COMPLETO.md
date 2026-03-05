# PRESUPUESTO COMPLETO — TRAZA PASO A PASO DE LA CALCULADORA
## Caso: Galpón Industrial — Techo + Fachada

---

Este documento muestra **cada acción interna que ejecuta la app**, en el orden exacto,
con los números reales del cálculo. Nada se omite: cada fórmula, cada decisión
condicional, cada lookup al catálogo, cada centavo acumulado.

---

## SOLICITUD ENTRANTE

```json
{
  "escenario":             "techo_fachada",
  "familia":               "ISOROOF_3G",
  "espesor_mm":            50,
  "ancho_m":               10.0,
  "largo_m":               6.0,
  "apoyos":                0,
  "estructura":            "metal",
  "tiene_cumbrera":        true,
  "tiene_canalon":         true,
  "tipo_gotero_frontal":   "liso",
  "lista_precios":         "venta",
  "color":                 "Terracota",
  "num_esq_ext":           2,
  "incl_k2":               true,
  "incl_5852":             false,
  "aberturas": [
    { "ancho": 1.0, "alto": 2.1, "cant": 1 },
    { "ancho": 1.2, "alto": 1.5, "cant": 2 }
  ]
}
```

---

## ═══════════════════════════════════════════
## MÓDULO bom.js — ORQUESTADOR
## ═══════════════════════════════════════════

---

### BLOQUE 1 — VALIDACIONES (4 controles en cadena)

---

**Control 1.1 — Escenario válido**

```
ESCENARIOS_VALIDOS = ["solo_techo", "solo_fachada", "techo_fachada", "camara_frigorifica"]
"techo_fachada" IN lista → ✅ OK
```

---

**Control 1.2 — Dimensión de ancho: un parámetro, no ambos**

```
ancho_m    = 10.0  → definido
cant_paneles = undefined → no definido

¿Hay exactamente uno? → ✅ OK
¿ancho_m > 0 y finito? → 10.0 > 0 → ✅ OK
¿largo_m > 0 y finito? → 6.0 > 0  → ✅ OK
```

---

**Control 1.3 — Largo mínimo / máximo para ISOROOF_3G**

```
Fuente: logic_config.json → panel_largos.ISOROOF_3G
  lmin = 3.5m
  lmax = 8.5m

Comparación: 3.5 ≤ 6.0 ≤ 8.5
→ ✅ OK — no se agrega ningún warning
```

---

**Control 1.4 — Color disponible para ISOROOF_3G**

```
Fuente: logic_config.json → colores.ISOROOF_3G
  "Terracota": {}   ← sin restricciones especiales

¿Color existe? → ✅ SÍ
¿Tiene colMax_mm? → NO
¿Tiene nota? → NO
→ ✅ OK — no se agrega warning
```

---

**Control 1.5 — Autoportancia (luz máxima)**

```
apoyos = 0 → luzReal = largo_m / (0 + 1) = 6.0 / 1 = 6.0m

Fuente: autoportancia.js → LUCES_MAXIMAS["ISOROOF_3G"][50]
  luzMax = 3.5m

Comparación: 6.0 > 3.5
→ ⚠️ WARNING: "ADVERTENCIA: luz 6.0m supera el máximo 3.5m para
               ISOROOF_3G 50mm. Verificar estructura."
```

**`warnings` array ahora contiene 1 elemento.**

---

### BLOQUE 2 — DESPACHO A MOTORES

```
escenario = "techo_fachada"
→ llama calcTechoCompleto(techoParams)
→ llama calcParedCompleto(paredParams)
```

---

## ═══════════════════════════════════════════
## MÓDULO techo.js — SECCIÓN TECHO
## ═══════════════════════════════════════════

---

### BLOQUE 3 — RESOLUCIÓN DEL PANEL (Acceso #1 al catálogo)

```
LLAMADA: getPanelInfo("ISOROOF_3G", 50, "venta")

Fuente: PANEL_DEFS (hardcoded en catalog.js — NO del CSV)
  PANEL_DEFS["ISOROOF_3G"][50] = { sku: "IROOF50", au_m: 1.10 }

Fuente CSV (catalog_real.csv): busca sku "IROOF50"
  row.name    = "Isoroof 50 mm Terracota o Gris"
  row.venta   = 43.9971  USD/m²
  row.web     = (distinto)

RESULTADO:
  panelSku    = "IROOF50"
  panelName   = "Isoroof 50 mm Terracota o Gris"
  au_m        = 1.10  m
  precio_m2   = 43.9971  USD/m²
```

---

### BLOQUE 4 — CÁLCULO DE CANTIDAD DE PANELES Y DIMENSIONES

```
INPUT: ancho_m = 10.0m (el usuario lo proveyó)
       au_m    = 1.10m

FÓRMULA: cantP = ceil(ancho_m / au_m)
         cantP = ceil(10.0 / 1.10)
         cantP = ceil(9.0909...)
         cantP = 10  paneles

FÓRMULA: anchoEfectivo = cantP × au_m
         anchoEfectivo = 10 × 1.10
         anchoEfectivo = 11.00m

  → El techo cubre 11.00m de ancho real (10 paneles × 1.10m)
    aunque el usuario pidió 10.0m. El metro extra es el redondeo.

FÓRMULA: areaRaw = cantP × au_m × largo_m
         areaRaw = 10 × 1.10 × 6.0
         areaRaw = 66.00 m²

         area_m2 = round(66.00, 2) = 66.00 m²
```

---

### BLOQUE 5 — COSTO DEL PANEL DE TECHO

```
FÓRMULA: costo_paneles = round(areaRaw × precio_m2, 2)
         costo_paneles = round(66.00 × 43.9971, 2)
         costo_paneles = round(2903.81, 2)
         costo_paneles = 2903.81 USD

FÓRMULA: precio_unit_panel = round(precio_m2 × au_m × largo_m, 2)
         precio_unit_panel = round(43.9971 × 1.10 × 6.0, 2)
         precio_unit_panel = round(290.38, 2)
         precio_unit_panel = 290.38 USD/panel

ÍTEM AGREGADO:
  sku         = "IROOF50"
  descripcion = "Isoroof 50 mm Terracota o Gris"
  cantidad    = 10
  unidad      = "panel"
  precio_unit = 290.38
  subtotal    = 2903.81

─────────────────────────────────────────────
  subtotal_acumulado = 2903.81 USD
─────────────────────────────────────────────
```

---

### BLOQUE 6 — GOTERO (familia ISOROOF_3G tiene sistema de gotero)

```
resolverGoteroData("ISOROOF_3G", 50) → usa tabla ISOROOF_GOTERO
  frontal_sku    = GFS30[50]  → "GFS50"   (tabla: frontal.50 = 'GFS50')
  superior_sku   = GFSUP50
  lateral_sku    = GL50
  canalon_sku    = CD50
  cumbrera_sku   = CUMROOF3M
  soporte_sku    = SOPCAN3M
  frontal_length = 3.03m
  superior_length= 3.03m
  lateral_length = 3.00m
  canalon_length = 3.03m
  soporte_length = 3.00m
```

---

**ÍTEM 2 — Gotero Frontal**

```
tipo_gotero_frontal = "liso"  (no es "greca")
→ frontalSku = GFS50  (SKU estándar)

FÓRMULA: cantFrontal = ceil(anchoEfectivo / frontal_length)
         cantFrontal = ceil(11.00 / 3.03)
         cantFrontal = ceil(3.6303...)
         cantFrontal = 4 piezas

Acceso #2 al catálogo: getAccessoryInfo("GFS50", "venta")
  precio = 16.764 USD

subtotal = round(4 × 16.764, 2) = round(67.056, 2) = 67.06 USD

ÍTEM AGREGADO:
  sku="GFS50"  cantidad=4  precio_unit=16.764  subtotal=67.06

─────────────────────────────────────────────
  subtotal_acumulado = 2903.81 + 67.06 = 2970.87 USD
─────────────────────────────────────────────
```

---

**ÍTEM 3 — Gotero Superior**

```
FÓRMULA: cantSuperior = ceil(anchoEfectivo / superior_length)
         cantSuperior = ceil(11.00 / 3.03)
         cantSuperior = ceil(3.6303...)
         cantSuperior = 4 piezas

Acceso #3: getAccessoryInfo("GFSUP50", "venta")
  precio = 29.076 USD

subtotal = round(4 × 29.076, 2) = round(116.304, 2) = 116.30 USD

─────────────────────────────────────────────
  subtotal_acumulado = 2970.87 + 116.30 = 3087.17 USD
─────────────────────────────────────────────
```

---

**ÍTEM 4 — Gotero Lateral (izquierdo + derecho)**

```
FÓRMULA: cantLateral = ceil(largo_m / lateral_length) × 2
         cantLateral = ceil(6.0 / 3.00) × 2
         cantLateral = ceil(2.0) × 2
         cantLateral = 2 × 2
         cantLateral = 4 piezas  (2 por cada lado)

Acceso #4: getAccessoryInfo("GL50", "venta")
  precio = 23.568 USD

subtotal = round(4 × 23.568, 2) = round(94.272, 2) = 94.27 USD

─────────────────────────────────────────────
  subtotal_acumulado = 3087.17 + 94.27 = 3181.44 USD
─────────────────────────────────────────────
```

---

**ÍTEM 5 — Cumbrera** `tiene_cumbrera = true → SE INCLUYE`

```
FÓRMULA: cantCumbrera = ceil(anchoEfectivo / 3.00)
         cantCumbrera = ceil(11.00 / 3.00)
         cantCumbrera = ceil(3.6666...)
         cantCumbrera = 4 piezas

Acceso #5: getAccessoryInfo("CUMROOF3M", "venta")
  precio = 35.22 USD

subtotal = round(4 × 35.22, 2) = 140.88 USD

─────────────────────────────────────────────
  subtotal_acumulado = 3181.44 + 140.88 = 3322.32 USD
─────────────────────────────────────────────
```

---

**ÍTEM 6 — Canalón** `tiene_canalon = true Y CD50 existe → SE INCLUYE`

```
FÓRMULA: cantCanalon = ceil(anchoEfectivo / canalon_length)
         cantCanalon = ceil(11.00 / 3.03)
         cantCanalon = ceil(3.6303...)
         cantCanalon = 4 piezas

Acceso #6: getAccessoryInfo("CD50", "venta")
  precio = 73.188 USD

subtotal = round(4 × 73.188, 2) = round(292.752, 2) = 292.75 USD

─────────────────────────────────────────────
  subtotal_acumulado = 3322.32 + 292.75 = 3615.07 USD
─────────────────────────────────────────────
```

---

**ÍTEM 7 — Soporte Canalón** `(misma condición que el canalón)`

```
FÓRMULA: cantSoporte = ceil(anchoEfectivo / 1.50)
         cantSoporte = ceil(11.00 / 1.50)
         cantSoporte = ceil(7.3333...)
         cantSoporte = 8 piezas

Acceso #7: getAccessoryInfo("SOPCAN3M", "venta")
  precio = 13.116 USD

subtotal = round(8 × 13.116, 2) = round(104.928, 2) = 104.93 USD

─────────────────────────────────────────────
  subtotal_acumulado = 3615.07 + 104.93 = 3720.00 USD
─────────────────────────────────────────────
```

---

### BLOQUE 7 — SISTEMA DE FIJACIÓN

```
SIST_FIJACION_TECHO["ISOROOF_3G"] = "caballete_tornillo"
→ Rama B activada

Fuente: getConfig() → logic_config.json → formula_params.techo.caballete
  tramos_por_panel    = 3
  paso_apoyo_m        = 2.9
  intervalo_perim_m   = 0.30
```

---

**ÍTEM 8 — Caballete (arandela trapezoidal)**

```
FÓRMULA: cantCaballetes = ceil(
           cantP × tramos_por_panel × (largo_m / paso_apoyo_m + 1) +
           largo_m × 2 / intervalo_perim_m
         )

Desglose paso a paso:
  Término A — apoyos de panel:
    cantP = 10
    tramos_por_panel = 3
    largo_m / paso_apoyo_m = 6.0 / 2.9 = 2.06896...
    2.06896 + 1 = 3.06896   ← tramos + borde final
    10 × 3 × 3.06896 = 92.069

  Término B — perímetro:
    largo_m × 2 = 12.0
    12.0 / 0.30 = 40.0

  Total: 92.069 + 40.0 = 132.069
  cantCaballetes = ceil(132.069) = 133 caballetes

Acceso #8: getAccessoryInfo("CABALLETE", "venta")
  precio = 0.50 USD

subtotal = round(133 × 0.50, 2) = 66.50 USD

─────────────────────────────────────────────
  subtotal_acumulado = 3720.00 + 66.50 = 3786.50 USD
─────────────────────────────────────────────
```

---

**ÍTEM 9 — Tornillo Aguja 5" (caja ×100)**

```
FÓRMULA: cajasAgujas = ceil(cantCaballetes × 2 / 100)
         cajasAgujas = ceil(133 × 2 / 100)
         cajasAgujas = ceil(266 / 100)
         cajasAgujas = ceil(2.66)
         cajasAgujas = 3 cajas

Acceso #9: getAccessoryInfo("TORN_AGUJA", "venta")
  precio = 17.00 USD

subtotal = round(3 × 17.00, 2) = 51.00 USD

─────────────────────────────────────────────
  subtotal_acumulado = 3786.50 + 51.00 = 3837.50 USD
─────────────────────────────────────────────
```

---

### BLOQUE 8 — SELLADORES DE TECHO

---

**ÍTEM 10 — Cinta Butilo**

```
FÓRMULA: cantButilo = max(1, ceil( (cantP - 1) × largo_m / 22.5 ))

  (cantP - 1) = 10 - 1 = 9 juntas longitudinales
  9 × 6.0 = 54.0 metros lineales de junta
  54.0 / 22.5 = 2.4 rollos necesarios
  ceil(2.4) = 3

  max(1, 3) = 3 rollos

Acceso #10: getAccessoryInfo("C.But.", "venta")
  precio = 14.8925 USD

subtotal = round(3 × 14.8925, 2) = round(44.6775, 2) = 44.68 USD

─────────────────────────────────────────────
  subtotal_acumulado = 3837.50 + 44.68 = 3882.18 USD
─────────────────────────────────────────────
```

---

**ÍTEM 11 — Silicona Bromplast 600ml**

```
FÓRMULA: cantSilicona = ceil(cantP × 0.5)
         cantSilicona = ceil(10 × 0.5)
         cantSilicona = ceil(5.0)
         cantSilicona = 5 cartuchos

Acceso #11: getAccessoryInfo("Bromplast", "venta")
  precio = 9.492 USD

subtotal = round(5 × 9.492, 2) = round(47.46, 2) = 47.46 USD

─────────────────────────────────────────────
  subtotal_acumulado = 3882.18 + 47.46 = 3929.64 USD
─────────────────────────────────────────────
```

---

### RESUMEN DE SECCIÓN TECHO — TABLA DE ÍTEMS

| # | SKU          | Descripción                         | Cant | Unidad   | Precio unit | Subtotal   |
|--:|:-------------|:------------------------------------|-----:|:---------|------------:|-----------:|
| 1 | IROOF50      | Isoroof 50mm Terracota o Gris       |   10 | panel    |      290.38 |   2 903.81 |
| 2 | GFS50        | Gotero Frontal (ISOROOF_3G 50mm)    |    4 | pieza    |       16.76 |      67.06 |
| 3 | GFSUP50      | Gotero Superior (ISOROOF_3G 50mm)   |    4 | pieza    |       29.08 |     116.30 |
| 4 | GL50         | Gotero Lateral ×2 (ISOROOF_3G 50mm) |    4 | pieza    |       23.57 |      94.27 |
| 5 | CUMROOF3M    | Cumbrera (ISOROOF_3G)               |    4 | pieza    |       35.22 |     140.88 |
| 6 | CD50         | Canalón (ISOROOF_3G 50mm)           |    4 | pieza    |       73.19 |     292.75 |
| 7 | SOPCAN3M     | Soporte Canalón                     |    8 | pieza    |       13.12 |     104.93 |
| 8 | CABALLETE    | Caballete trapezoidal               |  133 | unid     |        0.50 |      66.50 |
| 9 | TORN_AGUJA   | Tornillo aguja 5" (caja ×100)       |    3 | caja     |       17.00 |      51.00 |
|10 | C.But.       | Cinta Butilo (22.5m)                |    3 | rollo    |       14.89 |      44.68 |
|11 | Bromplast    | Silicona Bromplast 600ml            |    5 | cartucho |        9.49 |      47.46 |
|   |              |                                     |      |          | **SUBTOTAL**| **3 929.64**|

---

## ═══════════════════════════════════════════
## MÓDULO pared.js — SECCIÓN FACHADA
## ═══════════════════════════════════════════

---

### BLOQUE 9 — RESOLUCIÓN DEL PANEL (Acceso #12 al catálogo)

```
LLAMADA: getPanelInfo("ISOROOF_3G", 50, "venta")
  → Mismos datos que en techo (misma familia, mismo espesor)
  panelSku  = "IROOF50"
  au_m      = 1.10
  precio_m2 = 43.9971 USD/m²
```

---

### BLOQUE 10 — CÁLCULO DE DIMENSIONES DE PARED

```
INPUT: ancho_m = 10.0m (mismo parámetro del usuario)
       au_m    = 1.10m

  (misma lógica que techo)
  cantP         = ceil(10.0 / 1.10) = 10 paneles
  anchoEfectivo = 10 × 1.10 = 11.00m

FÓRMULA areaBruta:
  areaBruta = round(cantP × au_m × largo_m, 2)
  areaBruta = round(10 × 1.10 × 6.0, 2)
  areaBruta = round(66.00, 2)
  areaBruta = 66.00 m²
```

---

### BLOQUE 11 — DESCUENTO DE ABERTURAS

```
INPUT: aberturas = [
  { ancho: 1.0,  alto: 2.1, cant: 1 },   ← 1 puerta
  { ancho: 1.2,  alto: 1.5, cant: 2 }    ← 2 ventanas
]

Procesamiento de cada abertura:
  Puerta:    1.0 × 2.1 × 1 = 2.10 m²
  Ventanas:  1.2 × 1.5 × 2 = 3.60 m²

areaAberturas = 2.10 + 3.60 = 5.70 m²
areaAberturas = round(5.70, 2) = 5.70 m²

FÓRMULA areaNeta:
  areaNeta = max(0, areaBruta - areaAberturas)
  areaNeta = max(0, 66.00 - 5.70)
  areaNeta = max(0, 60.30)
  areaNeta = 60.30 m²   ← este es el área que se cobra
```

---

### BLOQUE 12 — COSTO DEL PANEL DE PARED

```
FÓRMULA: costo_paneles = round(areaNeta × precio_m2, 2)
         costo_paneles = round(60.30 × 43.9971, 2)

  60.30 × 43.9971:
    60   × 43.9971 = 2639.826
     0.3 × 43.9971 =   13.199
    Total           = 2653.025

  costo_paneles = round(2653.025, 2) = 2653.03 USD

NOTA: La pared cobra 2653.03 vs el techo 2903.81
      Diferencia = 250.78 USD ← el precio de las aberturas descontadas
      (5.70 m² × 43.9971 = 250.78 USD ahorrado)

FÓRMULA: precio_unit_panel = round(precio_m2 × au_m × largo_m, 2)
         precio_unit_panel = round(43.9971 × 1.10 × 6.0, 2) = 290.38 USD/panel

ÍTEM AGREGADO:
  sku         = "IROOF50"
  descripcion = "Isoroof 50 mm Terracota o Gris"
  cantidad    = 10
  unidad      = "panel"
  precio_unit = 290.38
  subtotal    = 2653.03
  area_bruta_m2     = 66.00
  area_aberturas_m2 = 5.70
  area_neta_m2      = 60.30

─────────────────────────────────────────────
  subtotal_acumulado = 2653.03 USD
─────────────────────────────────────────────
```

---

### BLOQUE 13 — PERFIL U (soleras superior e inferior)

```
Fuente: PERFIL_U_SKU (hardcoded en pared.js)
  PERFIL_U_SKU[50] = "PU50MM"

FÓRMULA: mlPerfilU = 2 × anchoEfectivo
         mlPerfilU = 2 × 11.00 = 22.00m
         (2 soleras: una arriba, una abajo)

FÓRMULA: cantPU = ceil(mlPerfilU / 3.0)
         cantPU = ceil(22.00 / 3.0)
         cantPU = ceil(7.3333...)
         cantPU = 8 piezas

Acceso #13: getAccessoryInfo("PU50MM", "venta")
  precio = 11.34 USD

subtotal = round(8 × 11.34, 2) = 90.72 USD

─────────────────────────────────────────────
  subtotal_acumulado = 2653.03 + 90.72 = 2743.75 USD
─────────────────────────────────────────────
```

---

### BLOQUE 14 — PERFIL K2 `incl_k2 = true AND cantP(10) > 1 → SE INCLUYE`

```
Fuente: getConfig() → formula_params.pared.k2_largo_pieza_m = 3.0

FÓRMULA: juntasK2 = (cantP - 1) × ceil(largo_m / 3.0)
         juntasK2 = (10 - 1) × ceil(6.0 / 3.0)
         juntasK2 = 9 × ceil(2.0)
         juntasK2 = 9 × 2
         juntasK2 = 18 piezas
         (9 juntas verticales entre paneles, cada una necesita 2 piezas de 3m para los 6m de alto)

Acceso #14: getAccessoryInfo("K2", "venta")
  precio = 8.59 USD

subtotal = round(18 × 8.59, 2) = round(154.62, 2) = 154.62 USD

─────────────────────────────────────────────
  subtotal_acumulado = 2743.75 + 154.62 = 2898.37 USD
─────────────────────────────────────────────
```

---

### BLOQUE 15 — ESQUINEROS EXTERIORES `num_esq_ext = 2 > 0 → SE INCLUYE`

```
Fuente: getConfig() → formula_params.pared.esq_largo_pieza_m = 3.0

FÓRMULA: cantEsqExt = num_esq_ext × ceil(largo_m / 3.0)
         cantEsqExt = 2 × ceil(6.0 / 3.0)
         cantEsqExt = 2 × ceil(2.0)
         cantEsqExt = 2 × 2
         cantEsqExt = 4 piezas

Acceso #15: getAccessoryInfo("ESQ-EXT", "venta")
  precio = 8.59 USD

subtotal = round(4 × 8.59, 2) = 34.36 USD

─────────────────────────────────────────────
  subtotal_acumulado = 2898.37 + 34.36 = 2932.73 USD
─────────────────────────────────────────────
```

**Esquineros interiores:** `num_esq_int = 0 → condición falsa → SALTEADO`
**Ángulo 5852:** `incl_5852 = false → condición falsa → SALTEADO`

---

### BLOQUE 16 — FIJACIONES DE PARED

---

**ÍTEMS 16a y 16b — TMOME + ARATRAP** `estructura = "metal" → SE INCLUYE`

```
Fuente: getConfig() → formula_params.pared.tornillos_por_m2_tmome = 5.5

FÓRMULA: cantTornillos = ceil(areaNeta × 5.5)
         cantTornillos = ceil(60.30 × 5.5)
         cantTornillos = ceil(331.65)
         cantTornillos = 332 tornillos

NOTA: Se usa areaNeta (60.30 m²), no bruta (66.00 m²)
      → solo se fija el panel real instalado, no el área de ventanas/puertas

Acceso #16: getAccessoryInfo("TMOME", "venta")
  precio = 0.6557 USD
  subtotal = round(332 × 0.6557, 2) = round(217.69, 2) = 217.69 USD

Acceso #17: getAccessoryInfo("ARATRAP", "venta")
  precio = 0.7295 USD
  subtotal = round(332 × 0.7295, 2) = round(242.19, 2) = 242.19 USD

─────────────────────────────────────────────
  subtotal_acumulado = 2932.73 + 217.69 + 242.19 = 3392.61 USD
─────────────────────────────────────────────
```

---

**ÍTEM 17 — Kit Anclaje H°** `(siempre presente en pared)`

```
Fuente: getConfig() → formula_params.pared.anclaje_intervalo_m = 0.30

FÓRMULA: cantAnclajes = ceil(anchoEfectivo / 0.30)
         cantAnclajes = ceil(11.00 / 0.30)
         cantAnclajes = ceil(36.666...)
         cantAnclajes = 37 unidades

Acceso #18: getAccessoryInfo("ANCLAJE_H", "venta")
  precio = 0.09 USD

subtotal = round(37 × 0.09, 2) = 3.33 USD

─────────────────────────────────────────────
  subtotal_acumulado = 3392.61 + 3.33 = 3395.94 USD
─────────────────────────────────────────────
```

---

**ÍTEM 18 — Remaches POP RPOP** `(siempre presente en pared)`

```
Fuente: getConfig() → remaches_por_panel = 2, remaches_por_caja = 1000

FÓRMULA: cantRemaches = cantP × 2
         cantRemaches = 10 × 2 = 20 remaches

FÓRMULA: cantCajasRPOP = max(1, ceil(20 / 1000))
         cantCajasRPOP = max(1, ceil(0.02))
         cantCajasRPOP = max(1, 1)
         cantCajasRPOP = 1 caja

Acceso #19: getAccessoryInfo("RPOP", "venta")
  precio = 49.1803 USD

subtotal = round(1 × 49.1803, 2) = 49.18 USD

─────────────────────────────────────────────
  subtotal_acumulado = 3395.94 + 49.18 = 3445.12 USD
─────────────────────────────────────────────
```

---

### BLOQUE 17 — SELLADORES DE PARED

---

**ÍTEM 19 — Cinta Butilo** `(misma fórmula que techo)`

```
cantButilo = max(1, ceil((10 - 1) × 6.0 / 22.5))
           = max(1, ceil(54.0 / 22.5))
           = max(1, ceil(2.4))
           = max(1, 3)
           = 3 rollos

Acceso #20: getAccessoryInfo("C.But.", "venta")
  precio = 14.8925 USD

subtotal = round(3 × 14.8925, 2) = 44.68 USD

─────────────────────────────────────────────
  subtotal_acumulado = 3445.12 + 44.68 = 3489.80 USD
─────────────────────────────────────────────
```

---

**ÍTEM 20 — Silicona Bromplast** `(fórmula POR ML — más precisa que en techo)`

```
FÓRMULA mlJuntas:
  Juntas verticales = (cantP - 1) × largo_m = 9 × 6.0 = 54.0m
  Perímetro sup+inf = anchoEfectivo × 2     = 11.0 × 2 = 22.0m
  ─────────────────────────────────────────────────────────────
  mlJuntas = 54.0 + 22.0 = 76.0m

Fuente: getConfig() → silicona_ml_por_cartucho = 8 metros/cartucho

FÓRMULA: cantSilicona = ceil(mlJuntas / 8)
         cantSilicona = ceil(76.0 / 8)
         cantSilicona = ceil(9.5)
         cantSilicona = 10 cartuchos

COMPARACIÓN CON TECHO: techo usó cantP × 0.5 = 5 cartuchos
                       pared usa ml/8 = 10 cartuchos
  → Pared calcula más por el perímetro de soleras (22m adicionales)

Acceso #21: getAccessoryInfo("Bromplast", "venta")
  precio = 9.492 USD

subtotal = round(10 × 9.492, 2) = 94.92 USD

─────────────────────────────────────────────
  subtotal_acumulado = 3489.80 + 94.92 = 3584.72 USD
─────────────────────────────────────────────
```

---

### RESUMEN DE SECCIÓN PARED — TABLA DE ÍTEMS

| # | SKU        | Descripción                              | Cant | Unidad   | Precio unit | Subtotal   |
|--:|:-----------|:-----------------------------------------|-----:|:---------|------------:|-----------:|
| 1 | IROOF50    | Panel (área neta 60.30 m²)               |   10 | panel    |      290.38 |   2 653.03 |
| 2 | PU50MM     | Perfil U 50mm (soleras sup+inf)          |    8 | pieza    |       11.34 |      90.72 |
| 3 | K2         | Perfil K2 junta interior (9 juntas)      |   18 | pieza    |        8.59 |     154.62 |
| 4 | ESQ-EXT    | Esquinero exterior (2 esq.)              |    4 | pieza    |        8.59 |      34.36 |
| 5 | TMOME      | Tornillo TMOME (madera/metal)            |  332 | und      |       0.656 |     217.69 |
| 6 | ARATRAP    | Arandela Trapezoidal ARATRAP             |  332 | und      |       0.730 |     242.19 |
| 7 | ANCLAJE_H  | Kit anclaje H° (1 c/30cm)               |   37 | unid     |        0.09 |       3.33 |
| 8 | RPOP       | Remaches POP (caja 1000u)                |    1 | caja     |       49.18 |      49.18 |
| 9 | C.But.     | Cinta Butilo (22.5m)                     |    3 | rollo    |       14.89 |      44.68 |
|10 | Bromplast  | Silicona Bromplast 600ml (76.0m juntas)  |   10 | cartucho |        9.49 |      94.92 |
|   |            |                                          |      |          | **SUBTOTAL**| **3 584.72**|

---

## ═══════════════════════════════════════════
## MÓDULO bom.js — ENSAMBLADO FINAL
## ═══════════════════════════════════════════

---

### BLOQUE 18 — SUMA DE SECCIONES Y CÁLCULO DE IVA

```
secciones = [
  { tipo: "techo", subtotal: 3929.64 },
  { tipo: "pared", subtotal: 3584.72 }
]

FÓRMULA: subtotal_sin_iva = sum(secciones.map(s => s.subtotal))
         subtotal_sin_iva = 3929.64 + 3584.72
         subtotal_sin_iva = 7514.36 USD

FÓRMULA: iva = subtotal_sin_iva × ivaRate()
         ivaRate() → lee logic_config.json → iva_rate = 0.22
         iva = 7514.36 × 0.22
         iva = 1653.1592
         iva = round(1653.16, 2) = 1653.16 USD

FÓRMULA: total_con_iva = subtotal_sin_iva + iva
         total_con_iva = 7514.36 + 1653.16
         total_con_iva = 9167.52 USD
```

---

## ═══════════════════════════════════════════
## COTIZACIÓN FINAL — OBJETO DE RESPUESTA
## ═══════════════════════════════════════════

```json
{
  "cotizacion_id": "a4f7c2e1-8b3d-4e9a-b156-3f2c8d7e1a09",
  "fecha": "2026-03-05",
  "escenario": "techo_fachada",
  "familia": "ISOROOF_3G",
  "espesor_mm": 50,
  "color": "Terracota",
  "lista_precios": "venta",

  "secciones": [
    {
      "tipo": "techo",
      "familia": "ISOROOF_3G",
      "espesor_mm": 50,
      "ancho_m": 11.00,
      "largo_m": 6.0,
      "area_m2": 66.00,
      "cant_paneles": 10,
      "sist_fijacion": "caballete_tornillo",
      "items": [
        { "sku": "IROOF50",    "cantidad": 10,  "unidad": "panel",    "precio_unit": 290.38,  "subtotal": 2903.81 },
        { "sku": "GFS50",      "cantidad": 4,   "unidad": "pieza",    "precio_unit": 16.764,  "subtotal": 67.06   },
        { "sku": "GFSUP50",    "cantidad": 4,   "unidad": "pieza",    "precio_unit": 29.076,  "subtotal": 116.30  },
        { "sku": "GL50",       "cantidad": 4,   "unidad": "pieza",    "precio_unit": 23.568,  "subtotal": 94.27   },
        { "sku": "CUMROOF3M",  "cantidad": 4,   "unidad": "pieza",    "precio_unit": 35.22,   "subtotal": 140.88  },
        { "sku": "CD50",       "cantidad": 4,   "unidad": "pieza",    "precio_unit": 73.188,  "subtotal": 292.75  },
        { "sku": "SOPCAN3M",   "cantidad": 8,   "unidad": "pieza",    "precio_unit": 13.116,  "subtotal": 104.93  },
        { "sku": "CABALLETE",  "cantidad": 133, "unidad": "unid",     "precio_unit": 0.50,    "subtotal": 66.50   },
        { "sku": "TORN_AGUJA", "cantidad": 3,   "unidad": "caja",     "precio_unit": 17.00,   "subtotal": 51.00   },
        { "sku": "C.But.",     "cantidad": 3,   "unidad": "rollo",    "precio_unit": 14.8925, "subtotal": 44.68   },
        { "sku": "Bromplast",  "cantidad": 5,   "unidad": "cartucho", "precio_unit": 9.492,   "subtotal": 47.46   }
      ],
      "subtotal": 3929.64
    },
    {
      "tipo": "pared",
      "familia": "ISOROOF_3G",
      "espesor_mm": 50,
      "ancho_m": 11.00,
      "largo_m": 6.0,
      "area_bruta_m2": 66.00,
      "area_aberturas_m2": 5.70,
      "area_neta_m2": 60.30,
      "cant_paneles": 10,
      "items": [
        { "sku": "IROOF50",   "cantidad": 10,  "unidad": "panel",    "precio_unit": 290.38,  "subtotal": 2653.03 },
        { "sku": "PU50MM",    "cantidad": 8,   "unidad": "pieza",    "precio_unit": 11.34,   "subtotal": 90.72   },
        { "sku": "K2",        "cantidad": 18,  "unidad": "pieza",    "precio_unit": 8.59,    "subtotal": 154.62  },
        { "sku": "ESQ-EXT",   "cantidad": 4,   "unidad": "pieza",    "precio_unit": 8.59,    "subtotal": 34.36   },
        { "sku": "TMOME",     "cantidad": 332, "unidad": "und",      "precio_unit": 0.6557,  "subtotal": 217.69  },
        { "sku": "ARATRAP",   "cantidad": 332, "unidad": "und",      "precio_unit": 0.7295,  "subtotal": 242.19  },
        { "sku": "ANCLAJE_H", "cantidad": 37,  "unidad": "unid",     "precio_unit": 0.09,    "subtotal": 3.33    },
        { "sku": "RPOP",      "cantidad": 1,   "unidad": "caja",     "precio_unit": 49.1803, "subtotal": 49.18   },
        { "sku": "C.But.",    "cantidad": 3,   "unidad": "rollo",    "precio_unit": 14.8925, "subtotal": 44.68   },
        { "sku": "Bromplast", "cantidad": 10,  "unidad": "cartucho", "precio_unit": 9.492,   "subtotal": 94.92   }
      ],
      "subtotal": 3584.72
    }
  ],

  "resumen": {
    "subtotal_sin_iva": 7514.36,
    "iva_22":           1653.16,
    "total_con_iva":    9167.52,
    "moneda":           "USD"
  },

  "warnings": [
    "ADVERTENCIA: luz 6.0m supera el máximo 3.5m para ISOROOF_3G 50mm. Verificar estructura."
  ],

  "nota": "Precios sin IVA. IVA 22% aplicado al total final. Consultar disponibilidad de stock."
}
```

---

## CUADRO RESUMEN FINANCIERO

```
╔══════════════════════════════════════════════════════════════╗
║         GALPÓN INDUSTRIAL — TECHO + FACHADA                 ║
║         ISOROOF_3G 50mm · 10m ancho · 6m largo              ║
╠══════════════════════════════════════════════════════════════╣
║  TECHO (66.00 m²)                                            ║
║    Panel (10 und × 290.38)          $  2 903.81              ║
║    Sistema gotero (frontal/sup/lat)  $    277.63              ║
║    Cumbrera + Canalón + Soporte      $    538.56              ║
║    Fijación (133 cab + 3 caj agujas) $    117.50              ║
║    Selladores (butilo + silicona)    $     92.14              ║
║                              ────────────────                ║
║    SUBTOTAL TECHO                   $  3 929.64              ║
╠══════════════════════════════════════════════════════════════╣
║  FACHADA (66.00 bruta · −5.70 abert. = 60.30 m² neta)       ║
║    Panel (10 und × 290.38 por área neta) $ 2 653.03          ║
║    Perfiles U + K2 + Esquineros     $    279.70              ║
║    Fijaciones (TMOME + ARATRAP + H) $    463.21              ║
║    Remaches RPOP                    $     49.18              ║
║    Selladores (butilo + silicona)   $    139.60              ║
║                              ────────────────                ║
║    SUBTOTAL FACHADA                 $  3 584.72              ║
╠══════════════════════════════════════════════════════════════╣
║  SUBTOTAL SIN IVA                   $  7 514.36              ║
║  IVA 22%                            $  1 653.16              ║
║  ─────────────────────────────────────────────               ║
║  TOTAL CON IVA                      $  9 167.52  USD         ║
╠══════════════════════════════════════════════════════════════╣
║  ⚠ WARNING: luz libre 6.0m > máx 3.5m. Verificar estructura ║
╚══════════════════════════════════════════════════════════════╝
```

---

## DIAGRAMA DE FLUJO DE ACCESOS AL CATÁLOGO

```
Solicitud entrante
      │
      ▼
 bom.js — 5 validaciones
  (sin acceso a catálogo)
      │
      ├────────────────────────────────────────────┐
      ▼                                            ▼
 techo.js                                   pared.js
      │                                            │
  [#1] getPanelInfo → PANEL_DEFS              [#12] getPanelInfo → PANEL_DEFS
       (au_m + precio_m2)                          (au_m + precio_m2)
      │                                            │
  [#2]  GFS50 → CSV                           [#13] PU50MM → CSV
  [#3]  GFSUP50 → CSV                         [#14] K2 → logic_config
  [#4]  GL50 → CSV                            [#15] ESQ-EXT → logic_config
  [#5]  CUMROOF3M → CSV                       [#16] TMOME → CSV
  [#6]  CD50 → CSV                            [#17] ARATRAP → CSV
  [#7]  SOPCAN3M → CSV                        [#18] ANCLAJE_H → logic_config
  [#8]  CABALLETE → logic_config              [#19] RPOP → CSV
  [#9]  TORN_AGUJA → logic_config             [#20] C.But. → CSV
  [#10] C.But. → CSV                          [#21] Bromplast → CSV
  [#11] Bromplast → CSV
      │                                            │
      └──────────────┬─────────────────────────────┘
                     ▼
              bom.js — sum + IVA
                     │
                     ▼
            cotizacion final
         21 accesos totales al catálogo
```

---

## CONTADORES FINALES DE ESTE CÁLCULO

| Concepto                       | Techo | Pared | Total |
|:-------------------------------|------:|------:|------:|
| Ítems en BOM                   |    11 |    10 |    21 |
| Accesos al catálogo CSV        |     7 |     7 |    14 |
| Accesos a logic_config         |     3 |     2 |     5 |
| Accesos a PANEL_DEFS           |     1 |     1 |     2 |
| Validaciones ejecutadas        |     5 |     0 |     5 |
| Warnings generados             |     1 |     0 |     1 |
| Condiciones evaluadas (if/else)|     8 |     6 |    14 |

---

*Versión 5.1.0 — Calculadora Panelin BMC Uruguay — Traza generada 2026-03-05*
