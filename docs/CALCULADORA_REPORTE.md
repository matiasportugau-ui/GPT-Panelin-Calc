# CALCULADORA PANELIN — REPORTE COMPLETO DEL SISTEMA
**Versión:** 5.1.0 · **Fecha:** 2026-03-05 · **Moneda:** USD sin IVA

---

Este documento describe de forma exhaustiva y secuencial el protocolo completo de la
Calculadora Panelin. Está pensado para ser leído, dictado o escuchado de principio a
fin, siguiendo el mismo orden en que el sistema procesa cada solicitud. Cada paso
expone todas las variables involucradas, todos los valores posibles, todas las ramas
condicionales y todas las fórmulas aplicadas.

---

## PARTE 1 — ARQUITECTURA GENERAL DEL SISTEMA

La calculadora recibe una solicitud con parámetros, la valida, calcula las cantidades
de materiales (Fase 1 — sin precios), asigna precios (Fase 2 — accede al catálogo),
y devuelve una cotización completa con IVA incluido.

El sistema tiene cinco módulos principales:

- **bom.js** — Orquestador principal. Recibe la solicitud, valida, y despacha a los motores.
- **techo.js** — Motor de cálculo para secciones de techo.
- **pared.js** — Motor de cálculo para secciones de pared o fachada.
- **catalog.js** — Fuente de datos de paneles y accesorios. Lee el CSV y datos hardcodeados.
- **autoportancia.js** — Validador técnico de luces máximas por familia y espesor.

La configuración dinámica (precios de accesorios, parámetros de fórmulas, largos
válidos, colores) se lee de **logic_config.json** en tiempo real sin reiniciar el sistema.

---

## PARTE 2 — PASO 1: SELECCIÓN DE ESCENARIO

La primera decisión del sistema es el **escenario**. Define cuántas secciones se calculan
y cómo se arman.

Los cuatro escenarios posibles son:

**Escenario 1 — solo_techo:**
Se calcula únicamente una sección de techo. Se llama a calcTechoCompleto una vez.
Resultado: 1 sección de tipo "techo".

**Escenario 2 — solo_fachada:**
Se calcula únicamente una sección de pared. Se llama a calcParedCompleto una vez.
Resultado: 1 sección de tipo "pared".

**Escenario 3 — techo_fachada:**
Se calcula un techo y una fachada con los mismos parámetros de panel.
Se llama a calcTechoCompleto y luego a calcParedCompleto.
Resultado: 2 secciones: "techo" + "pared".

**Escenario 4 — camara_frigorifica:**
Se calcula la envolvente completa de una cámara frigorífica con altura fija de 3 metros.
El sistema genera:
- 1 sección de techo con los parámetros provistos (largo × ancho del recinto).
- 2 secciones de pared frontal/posterior (ancho del recinto × 3 metros de altura),
  agrupadas como "pared_frontal_posterior".
- 2 secciones de pared lateral (largo del recinto × 3 metros de altura),
  agrupadas como "pared_lateral".
Resultado: 3 secciones distintas en el objeto de salida.

Si el escenario enviado no coincide con ninguno de los cuatro válidos, el sistema
lanza un error y no continúa el cálculo.

---

## PARTE 3 — PASO 2: SELECCIÓN DE FAMILIA Y ESPESOR

La **familia** define el tipo de panel y determina:
- El ancho útil del panel (au_m), que es la dimensión real cubierta por cada panel.
- El sistema de fijación aplicable para techos.
- Si el panel tiene sistema de gotero o no.
- Los espesores disponibles.
- Los colores disponibles y sus restricciones.
- Los largos mínimo y máximo fabricables.
- La luz máxima autoportante admisible.

Estas son las ocho familias disponibles con todos sus parámetros dimensionales:

---

### FAMILIA: ISOROOF_3G
Uso principal: techo liviano.
Ancho útil (au_m): 1.10 metros por panel.
Espesores disponibles: 30, 40, 50, 80, 100 milímetros.
SKUs correspondientes: IROOF30, IROOF40, IROOF50, IROOF80, IROOF100.
Sistema de fijación: caballete_tornillo.
Tiene sistema de gotero: SÍ.
Largo mínimo fabricable: 3.5 metros. Largo máximo: 8.5 metros.
Colores disponibles: Terracota, Gris, Rojo (sin restricciones).
Color Blanco disponible solo para pedidos de 500 m² o más.
Luces máximas autoportantes: 30mm → 2.5m; 40mm → 3.0m; 50mm → 3.5m; 80mm → 4.5m; 100mm → 5.0m.

---

### FAMILIA: ISOROOF_FOIL
Uso principal: techo liviano con barrera de vapor.
Ancho útil (au_m): 1.10 metros por panel.
Espesores disponibles: 30, 50 milímetros.
SKUs correspondientes: IAGRO30, IAGRO50.
Sistema de fijación: caballete_tornillo.
Tiene sistema de gotero: SÍ.
Largo mínimo: 3.5 metros. Largo máximo: 8.5 metros.
Colores disponibles: Blanco únicamente.
Luces máximas: 30mm → 2.5m; 50mm → 3.5m.

---

### FAMILIA: ISOROOF_PLUS
Uso principal: techo liviano reforzado.
Ancho útil (au_m): 1.10 metros por panel.
Espesores disponibles: 50, 80 milímetros.
SKUs: IROOF50-PLS, IROOF80-PLS.
Sistema de fijación: caballete_tornillo.
Tiene sistema de gotero: SÍ.
Largo mínimo: 3.5 metros. Largo máximo: 8.5 metros.
Colores disponibles: Blanco, Gris.
Luces máximas: 50mm → 3.5m; 80mm → 4.5m.

---

### FAMILIA: ISODEC_PIR
Uso principal: techo pesado con aislación PIR.
Ancho útil (au_m): 1.12 metros por panel.
Espesores disponibles: 50, 80 milímetros.
SKUs: ISD50PIR, ISD80PIR.
Sistema de fijación: varilla_tuerca.
Tiene sistema de gotero: SÍ.
Largo mínimo: 3.5 metros. Largo máximo: 14 metros.
Colores disponibles: Blanco, Gris.
Luces máximas: 50mm → 3.5m; 80mm → 4.5m.

---

### FAMILIA: ISODEC_EPS
Uso principal: techo pesado con aislación EPS.
Ancho útil (au_m): 1.12 metros por panel.
Espesores disponibles: 100, 150, 200, 250 milímetros.
SKUs: ISODEC_EPS_100, ISODEC_EPS_150, ISODEC_EPS_200, ISODEC_EPS_250.
NOTA: Esta familia tiene precios hardcodeados en PANEL_DEFS (no están en el CSV).
Precios de venta (USD/m²): 100mm → 46.07; 150mm → 51.50; 200mm → 57.00; 250mm → 62.50.
Sistema de fijación: varilla_tuerca.
Tiene sistema de gotero: SÍ.
Largo mínimo: 2.3 metros. Largo máximo: 14 metros.
Colores disponibles: Blanco (sin restricciones).
Color Gris y Rojo: disponibles solo hasta 150mm, con plazo adicional de 20 días hábiles.
Luces máximas: 100mm → 4.5m; 150mm → 5.5m; 200mm → 6.5m; 250mm → 7.5m.

---

### FAMILIA: ISOPANEL_EPS
Uso principal: pared y fachada con aislación EPS.
Ancho útil (au_m): 1.00 metro por panel.
Espesores disponibles: 50, 100, 150, 200, 250 milímetros.
SKUs: ISD50EPS, ISD100EPS, ISD150EPS, ISD200EPS, ISD250EPS.
Sistema de fijación: tmome.
No tiene sistema de gotero (uso en pared).
Largo mínimo: 2.3 metros. Largo máximo: 14 metros.
Colores disponibles: Blanco, Gris, Rojo.
Alturas máximas recomendadas: 50mm → 3.0m; 100mm → 5.0m; 150mm → 6.0m; 200mm → 7.0m; 250mm → 7.5m.

---

### FAMILIA: ISOWALL_PIR
Uso principal: pared y fachada con aislación PIR.
Ancho útil (au_m): 1.00 metro por panel.
Espesores disponibles: 50, 80, 100 milímetros.
SKUs: IW50, IW80, IW100.
Sistema de fijación: tmome.
No tiene sistema de gotero.
Largo mínimo: 3.5 metros. Largo máximo: 14 metros.
Colores disponibles: Blanco, Gris.
Alturas máximas recomendadas: 50mm → 3.5m; 80mm → 4.5m; 100mm → 5.5m.

---

### FAMILIA: ISOFRIG_PIR
Uso principal: cámara frigorífica (techo y pared) con aislación PIR.
Ancho útil (au_m): 1.00 metro por panel.
Espesores disponibles: 40, 60, 80, 100, 150 milímetros.
SKUs: IF40, IF60-IFSL60, IF80-IFSL80, IF100-IFSL100, IF150-IFSL150.
Sistema de fijación: tmome.
No tiene sistema de gotero.
Largo mínimo: 2.3 metros. Largo máximo: 14 metros.
Color disponible: Blanco únicamente.
Alturas máximas recomendadas: 40mm → 3.0m; 60mm → 3.5m; 80mm → 4.5m; 100mm → 5.0m; 150mm → 6.0m.

---

## PARTE 4 — PASO 3: PARÁMETROS DE ENTRADA COMPLETOS

La solicitud puede contener los siguientes parámetros. Se listan todos con su tipo,
valor por defecto, si son obligatorios o alternativos, y las restricciones aplicables.

**escenario** — Tipo: texto. Obligatorio. Valores válidos: solo_techo, solo_fachada,
techo_fachada, camara_frigorifica.

**familia** — Tipo: texto. Obligatorio. Valores válidos: las ocho familias descritas
en la Parte 3.

**espesor_mm** — Tipo: número entero. Obligatorio. Debe ser un espesor válido para
la familia seleccionada según la tabla de la Parte 3.

**ancho_m** — Tipo: número decimal positivo. ALTERNATIVO a cant_paneles. Si se provee
este parámetro, el sistema calcula la cantidad de paneles necesaria. No se puede
enviar junto con cant_paneles. Ejemplo: 5.5 metros de ancho.

**cant_paneles** — Tipo: número entero positivo. ALTERNATIVO a ancho_m. Si se provee,
el sistema usa ese número directamente como cantidad de paneles. No se puede enviar
junto con ancho_m.

**largo_m** — Tipo: número decimal positivo. Obligatorio. Representa el largo del
techo (dirección perpendicular al ancho) o la altura de la pared. Se compara contra
los límites lmin/lmax de la familia y contra la luz máxima autoportante.

**lista_precios** — Tipo: texto. Valores: "venta" o "web". Valor por defecto: "venta".
Define cuál columna de precio se usa en el catálogo para todos los ítems.

**apoyos** — Tipo: número entero no negativo. Valor por defecto: 0. Cantidad de apoyos
intermedios. Solo afecta el cálculo de fijaciones para el sistema varilla_tuerca y
la validación de autoportancia. Con apoyos > 0, la luz real es largo_m / (apoyos + 1).

**estructura** — Tipo: texto. Valores: "metal", "hormigon", "mixto". Valor por defecto:
"metal". En el sistema varilla_tuerca, estructura "hormigon" agrega tacos expansivos.
En pared, determina si se incluyen tornillos TMOME y arandelas.

**tiene_cumbrera** — Tipo: booleano. Valor por defecto: false. Solo aplica en techo.
Si es true, se agrega el accesorio de cumbrera (pieza de remate de caballete).

**tiene_canalon** — Tipo: booleano. Valor por defecto: false. Solo aplica en techo.
Si es true, se agregan el canalón y el soporte de canalón.

**tipo_gotero_frontal** — Tipo: texto. Valores: "liso" o "greca". Valor por defecto:
"liso". Solo aplica para familias ISOROOF_3G, ISOROOF_FOIL e ISOROOF_PLUS. Con valor
"greca", el SKU del gotero frontal se reemplaza por GFCGR30 (gotero frontal greca
universal, 3.03m). Con valor "liso", se usa el SKU estándar por espesor.

**color** — Tipo: texto. Opcional. Valor para validación de restricciones de color.
Si se provee, el sistema verifica disponibilidad y genera advertencias. Valores típicos:
Blanco, Gris, Rojo, Terracota.

**envio_usd** — Tipo: número decimal. Opcional. Si se provee, se incluye en el objeto
de cotización como campo separado. No afecta el cálculo de materiales ni el IVA.

**aberturas** — Tipo: arreglo de objetos. Cada elemento: {ancho, alto, cant}. Opcional.
Solo aplica en pared. Representa puertas y ventanas. El área total de aberturas se
descuenta del área neta de paneles para calcular el costo. Ejemplo: una puerta de 2m
de ancho × 2.5m de alto con cant = 1.

**num_aberturas** — Tipo: número entero. Opcional. Parámetro de compatibilidad legado.
Solo registra la cantidad de aberturas sin descontar área. Se prefiere usar "aberturas"
con dimensiones reales.

**num_esq_ext** — Tipo: número entero. Valor por defecto: 0. Solo aplica en pared.
Cantidad de esquinas exteriores a terminar con esquinero metálico.

**num_esq_int** — Tipo: número entero. Valor por defecto: 0. Solo aplica en pared.
Cantidad de esquinas interiores a terminar con esquinero metálico.

**incl_k2** — Tipo: booleano. Valor por defecto: true. Solo aplica en pared. Si es
true, se incluyen los perfiles K2 de junta vertical entre paneles.

**incl_5852** — Tipo: booleano. Valor por defecto: false. Solo aplica en pared. Si es
true, se incluye el ángulo de aluminio 5852 (piezas de 6.8 metros).

---

## PARTE 5 — PASO 4: VALIDACIONES SECUENCIALES

Antes de iniciar cualquier cálculo, el sistema ejecuta cuatro validaciones en orden.
Ninguna de ellas accede al catálogo de precios. Producen errores fatales o advertencias.

### Validación 1 — Parámetros numéricos básicos

El sistema verifica:
- Que escenario sea uno de los cuatro valores válidos. Si no: error fatal.
- Que se provea exactamente uno entre ancho_m y cant_paneles. Si no hay ninguno: error
  fatal "Se requiere ancho_m o cant_paneles". Si hay ambos: error fatal "No se pueden
  enviar simultáneamente".
- Que ancho_m (si se provee) sea un número finito y positivo. Si no: error fatal.
- Que cant_paneles (si se provee) sea un número finito y positivo. Si no: error fatal.
- Que largo_m sea un número finito y positivo. Si no: error fatal.

### Validación 2 — Largo mínimo y máximo por familia

Se consulta logic_config.json, sección "panel_largos". Para cada familia está definido
un lmin y un lmax. Si largo_m es menor que lmin, se agrega una advertencia al arreglo
de warnings. Si largo_m es mayor que lmax, también se agrega una advertencia. Estos
no son errores fatales; la cotización continúa pero se informa al usuario.

Tabla de límites por familia:
- ISODEC_EPS: mínimo 2.3m, máximo 14m
- ISODEC_PIR: mínimo 3.5m, máximo 14m
- ISOROOF_3G: mínimo 3.5m, máximo 8.5m
- ISOROOF_FOIL: mínimo 3.5m, máximo 8.5m
- ISOROOF_PLUS: mínimo 3.5m, máximo 8.5m
- ISOPANEL_EPS: mínimo 2.3m, máximo 14m
- ISOWALL_PIR: mínimo 3.5m, máximo 14m
- ISOFRIG_PIR: mínimo 2.3m, máximo 14m

### Validación 3 — Restricciones de color

Solo se ejecuta si el parámetro "color" fue enviado en la solicitud. El sistema
consulta logic_config.json, sección "colores". Las reglas son:

Si el color no existe en la lista de la familia: advertencia "Color no disponible para
esta familia".

Si el color tiene restricción de espesor máximo (colMax_mm): se verifica que
espesor_mm no supere ese valor. Ejemplo: Gris para ISODEC_EPS solo disponible hasta
150mm. Si se pide 200mm Gris: advertencia con el espesor máximo.

Si el color tiene una nota informativa (por ejemplo "mínimo 500 m²" o "+20 días
hábiles"): esa nota se agrega al arreglo de warnings siempre.

### Validación 4 — Autoportancia (luz máxima admisible)

Siempre se ejecuta, independientemente del escenario. El sistema calcula la luz real:
- Si apoyos = 0: luz real = largo_m (la luz libre es el largo total).
- Si apoyos > 0: luz real = largo_m / (apoyos + 1) (los apoyos dividen el largo).

Luego consulta la tabla LUCES_MAXIMAS del módulo autoportancia.js y verifica que la
luz real sea menor o igual a la luz máxima tabulada para la combinación familia +
espesor. Si supera: advertencia indicando el valor máximo recomendado. No es un error
fatal; la cotización continúa.

---

## PARTE 6 — PASO 5: RESOLUCIÓN DE DIMENSIONES (FASE 1 — SIN PRECIOS)

Este es el primer paso de cálculo real. Se ejecuta al inicio de calcTechoCompleto y
calcParedCompleto. No accede al CSV; solo usa PANEL_DEFS (hardcodeado en catalog.js).

El sistema llama a getPanelInfo(familia, espesor_mm, lista_precios). Esta función
devuelve cuatro campos: sku del panel, nombre del panel, au_m (ancho útil, dimensional)
y precio_m2 (precio, solo relevante en Fase 2).

Para el cálculo de cantidades, solo se usa au_m. Los valores de au_m por familia:
- Familias ISOROOF (3G, FOIL, PLUS): au_m = 1.10 metros
- Familias ISODEC (PIR, EPS): au_m = 1.12 metros
- Familias ISOPANEL_EPS, ISOWALL_PIR, ISOFRIG_PIR: au_m = 1.00 metro

**Cálculo de cant_paneles y anchoEfectivo:**

Rama A — Si el usuario proveyó cant_paneles:
  cantP = redondear hacia arriba(cant_paneles)
  anchoEfectivo = cantP × au_m

Rama B — Si el usuario proveyó ancho_m:
  cantP = redondear hacia arriba(ancho_m / au_m)
  anchoEfectivo = cantP × au_m

En ambos casos, anchoEfectivo es el ancho real cubierto por los paneles, que puede
ser igual o ligeramente mayor que el ancho solicitado (por el redondeo hacia arriba).

---

## PARTE 7 — PASO 6: CÁLCULO DE TECHO — SECUENCIA COMPLETA DE ÍTEMS

Esta sección describe cada ítem del BOM de techo, en el orden exacto en que se calcula.
Para cada ítem: condición de inclusión, fórmula de cantidad, SKU, unidad y precio.

### ÍTEM 1 — Panel de Techo

**Condición:** siempre presente.
**Fórmula de cantidad:** cantP (ya calculado en Paso 5). Se mide en paneles.
**Fórmula de área:** areaRaw = cantP × au_m × largo_m (en m²).
**Fórmula de costo:** costo_paneles = redondear(areaRaw × precio_m2, 2 decimales).
**Precio unitario por panel:** precio_m2 × au_m × largo_m.
**SKU:** determinado por familia y espesor (ver tabla de Parte 3).
**Unidad:** panel.

---

### ÍTEMS 2 al 7 — Sistema de Gotero

El sistema de gotero solo existe para tres familias: ISOROOF_3G, ISOROOF_FOIL,
ISOROOF_PLUS, ISODEC_PIR e ISODEC_EPS. Para las demás familias (ISOPANEL_EPS,
ISOWALL_PIR, ISOFRIG_PIR) no se calcula ningún ítem de gotero.

Las longitudes de pieza de todos los goteros están hardcodeadas en el motor:
- Gotero frontal: 3.03 metros por pieza
- Gotero superior: 3.03 metros por pieza (ISODEC_EPS usa 3.00 metros)
- Gotero lateral: 3.00 metros por pieza
- Canalón: 3.03 metros por pieza
- Soporte canalón: 3.00 metros por pieza

**ÍTEM 2 — Gotero Frontal** (borde inferior, por donde escurre el agua)

**Condición:** familia tiene sistema de gotero.
**Rama liso vs greca:**
  Si tipo_gotero_frontal = "greca" Y familia es ISOROOF_3G, ISOROOF_FOIL o ISOROOF_PLUS:
    SKU = GFCGR30 (gotero frontal greca universal, precio venta: 17.99 USD).
  En cualquier otro caso:
    SKU según familia y espesor:
    - ISOROOF_3G/FOIL/PLUS: GFS30 (30-40mm), GFS50 (50mm), GFS80 (80-100mm)
    - ISODEC_PIR: GF80DC (50mm), GF120DC (80mm)
    - ISODEC_EPS: 6838 (100mm), 6839 (150mm), 6840 (200mm), 6841 (250mm)
**Fórmula de cantidad:** redondear hacia arriba(anchoEfectivo / 3.03)
**Unidad:** pieza.

**ÍTEM 3 — Gotero Superior** (borde contra muro o cumbrera)

**Condición:** familia tiene sistema de gotero.
**SKU según familia y espesor:**
- ISOROOF_3G/FOIL/PLUS: GFSUP30 (30mm), GFSUP40 (40mm), GFSUP50 (50mm), GFSUP80 (80-100mm)
- ISODEC_PIR: GSDECAM50 (50mm), GSDECAM80 (80mm)
- ISODEC_EPS: 6828 (universal para todos los espesores — babeta de adosar)
**Fórmula de cantidad:**
  ISOROOF y ISODEC_PIR: redondear hacia arriba(anchoEfectivo / 3.03)
  ISODEC_EPS: redondear hacia arriba(anchoEfectivo / 3.00)
**Unidad:** pieza.

**ÍTEM 4 — Gotero Lateral** (dos bordes: izquierdo y derecho)

**Condición:** familia tiene sistema de gotero.
**SKU según familia y espesor:**
- ISOROOF_3G/FOIL/PLUS: GL30, GL40, GL50, GL80 (100mm → GL80)
- ISODEC_PIR: GL80DC (50mm), GL120DC (80mm)
- ISODEC_EPS: 6842 (100mm), 6843 (150mm), 6844 (200mm), 6845 (250mm)
**Fórmula de cantidad:** redondear hacia arriba(largo_m / 3.00) × 2
(el ×2 cubre ambos lados izquierdo y derecho)
**Unidad:** pieza.

**ÍTEM 5 — Cumbrera** (remate de caballete, solo si tiene_cumbrera = true)

**Condición:** tiene_cumbrera = true Y familia tiene sistema de gotero.
**SKU:**
- ISOROOF_3G/FOIL/PLUS: CUMROOF3M
- ISODEC_PIR e ISODEC_EPS: 6847
**Fórmula de cantidad:** redondear hacia arriba(anchoEfectivo / 3.00)
**Unidad:** pieza.

**ÍTEM 6 — Canalón** (solo si tiene_canalon = true)

**Condición:** tiene_canalon = true Y familia tiene sistema de gotero Y familia tiene
SKU de canalón para el espesor solicitado.
**SKU según familia y espesor:**
- ISOROOF_3G/FOIL/PLUS: CD30 (30-40mm), CD50 (50mm), CD80 (80-100mm)
- ISODEC_PIR: CAN.ISDC120 (solo para 50mm; 80mm no tiene SKU definido)
- ISODEC_EPS: 6801 (100mm), 6802 (150mm), 6803 (200mm), 6804 (250mm)
**Fórmula de cantidad:** redondear hacia arriba(anchoEfectivo / 3.03)
**Unidad:** pieza.

**ÍTEM 7 — Soporte de Canalón** (1 cada 1.5m del ancho)

**Condición:** misma condición que el canalón (ítem 6).
**SKU:**
- ISOROOF_3G/FOIL/PLUS: SOPCAN3M
- ISODEC_PIR e ISODEC_EPS: 6805
**Fórmula de cantidad:** redondear hacia arriba(anchoEfectivo / 1.50)
**Unidad:** pieza.

---

### ÍTEMS 8 al 12 — Sistema de Fijación (tres ramas excluyentes)

El sistema de fijación se determina por la familia. Solo una de las tres ramas
siguientes se activa en cada cálculo.

**Mapa de familias a sistema:**
- varilla_tuerca: ISODEC_EPS, ISODEC_PIR
- caballete_tornillo: ISOROOF_3G, ISOROOF_FOIL, ISOROOF_PLUS
- tmome: ISOPANEL_EPS, ISOWALL_PIR, ISOFRIG_PIR

---

#### RAMA A — varilla_tuerca (paneles pesados ISODEC)

Los parámetros de configuración usados son:
- laterales_por_punto = 2
- intervalo_largo_m = 2.5 metros
- varillas_por_punto = 0.25
- apoyos_minimos_default = 2 (se usa cuando apoyos = 0)

**Paso 1: calcular apoyosReales.**
Si apoyos > 0: apoyosReales = apoyos.
Si apoyos = 0: apoyosReales = 2 (mínimo por defecto).

**Paso 2: calcular puntos de fijación.**
ptosFij = redondear hacia arriba(
  cantP × apoyosReales × laterales_por_punto +
  largo_m × 2 / intervalo_largo_m
)

**Paso 3: calcular cantidades de accesorios.**
cantVarillas = redondear hacia arriba(ptosFij × 0.25)
cantTuercas = cantVarillas × 2
cantArcCarr = cantVarillas × 2
cantArPP = cantVarillas × 2

**ÍTEM 8 — Varilla roscada 3/8"** — SKU: VARILLA38 — cantidad: cantVarillas — unidad: unid.
Precio venta: 3.12 USD. Precio web: 3.64 USD.

**ÍTEM 9 — Tuerca 3/8" galvanizada** — SKU: TUERCA38 — cantidad: cantTuercas — unidad: unid.
Precio venta: 0.12 USD. Precio web: 0.07 USD.

**ÍTEM 10 — Arandela carrocero 3/8"** — SKU: ARCA38 — cantidad: cantArcCarr — unidad: unid.
Precio venta: 1.68 USD. Precio web: 0.64 USD.

**ÍTEM 11 — Tortuga PVC (arandela PP)** — SKU: ARAPP — cantidad: cantArPP — unidad: unid.
Precio venta: 1.27 USD. Precio web: 1.48 USD.

**ÍTEM 12 — Taco expansivo 3/8"** (solo si estructura = "hormigon")
SKU: TACEXP38 — cantidad: ptosFij — unidad: unid.
Precio venta: 0.96 USD. Precio web: 1.12 USD.
**Condición adicional:** solo se incluye cuando estructura es exactamente "hormigon".
Para estructura "metal" o "mixto": este ítem NO se agrega.

---

#### RAMA B — caballete_tornillo (paneles livianos ISOROOF)

Los parámetros de configuración usados son:
- tramos_por_panel = 3
- paso_apoyo_m = 2.9 metros
- intervalo_perimetro_m = 0.30 metros

**Fórmula de caballetes:**
cantCaballetes = redondear hacia arriba(
  cantP × 3 × (largo_m / 2.9 + 1) +
  largo_m × 2 / 0.30
)

Esta fórmula tiene dos términos:
- Primer término: caballetes de apoyo de los paneles (largo/paso + 1 tramos por panel × 3 hileras).
- Segundo término: caballetes de perímetro a cada 30cm en ambos lados del largo.

**cajasAgujas = redondear hacia arriba(cantCaballetes × 2 / 100)**
(cada caja contiene 100 agujas; se necesitan 2 agujas por caballete)

**ÍTEM 8 — Caballete (arandela trapezoidal)** — SKU: CABALLETE — cantidad: cantCaballetes — unidad: unid.
Precio venta: 0.50 USD. Precio web: 0.46 USD.

**ÍTEM 9 — Tornillo aguja 5" (caja ×100)** — SKU: TORN_AGUJA — cantidad: cajasAgujas — unidad: caja.
Precio venta: 17.00 USD. Precio web: 17.00 USD.

---

#### RAMA C — tmome (familias de pared usadas en techo)

Los parámetros de configuración usados son:
- tornillos_por_m2_tmome = 6 (para techo)

**cantTornillos = redondear hacia arriba(areaRaw × 6)**

**ÍTEM 8 — Tornillo TMOME** — SKU: TMOME — cantidad: cantTornillos — unidad: und.
Precio leído del CSV (catalog_real.csv).

**ÍTEM 9 — Arandela Trapezoidal ARATRAP** — SKU: ARATRAP — cantidad: cantTornillos — unidad: und.
Precio leído del CSV.

---

### ÍTEMS 13 y 14 — Selladores de Techo

Los selladores siempre se incluyen, independientemente del sistema de fijación y la
presencia o ausencia de gotero.

Los parámetros de configuración usados son:
- butilo_ml_por_rollo_m = 22.5 metros por rollo
- silicona_cartuchos_por_panel = 0.5 cartuchos por panel

**ÍTEM 13 — Cinta Butilo C.But.**

**Fórmula de cantidad:**
cantButilo = máximo(1, redondear hacia arriba((cantP − 1) × largo_m / 22.5))
(cubre las juntas longitudinales entre paneles; hay cantP − 1 juntas; mínimo 1 rollo)

**SKU:** C.But.
**Unidad:** rollo.
Precio leído del CSV.

**ÍTEM 14 — Silicona Bromplast 600ml**

**Fórmula de cantidad:**
cantSilicona = redondear hacia arriba(cantP × 0.5)
(0.5 cartuchos por panel como cobertura estándar de juntas y perímetros)

**SKU:** Bromplast.
**Unidad:** cartucho.
Precio leído del CSV.

---

### RESUMEN DE CONTEO DE ÍTEMS EN UN CÁLCULO DE TECHO

Para una solicitud completa (con gotero, cumbrera, canalón, varilla_tuerca, hormigón):
14 ítems: panel + frontal + superior + lateral + cumbrera + canalón + soporte +
varilla + tuerca + arandela_carr + arandela_PP + taco + butilo + silicona.

Para el caso mínimo (sin gotero, sin cumbrera, sin canalón, caballete_tornillo, metal):
6 ítems: panel + caballete + tornillo_aguja + butilo + silicona.
(Las familias sin gotero son ISOPANEL_EPS, ISOWALL_PIR, ISOFRIG_PIR, pero estas usan
tmome no caballete. El caso mínimo realista para caballete es 6 ítems.)

---

## PARTE 8 — PASO 7: CÁLCULO DE PARED — SECUENCIA COMPLETA DE ÍTEMS

Esta sección describe cada ítem del BOM de pared/fachada, en el orden exacto en que
se calcula.

### ÍTEM 1 — Panel de Pared

**Condición:** siempre presente.
**Fórmula de cantidad:** cantP (calculado en Paso 5).

**Cálculo de áreas (tres valores):**
areaBruta = redondear(cantP × au_m × largo_m, 2 decimales) — área total instalada.
areaAberturas = suma de (ancho × alto × cant) para cada abertura en el arreglo.
  Si no hay aberturas o el arreglo está vacío: areaAberturas = 0.
areaNeta = máximo(0, areaBruta − areaAberturas) — área que efectivamente tiene panel.

**Fórmula de costo:** costo_paneles = redondear(areaNeta × precio_m2, 2 decimales).
NOTA IMPORTANTE: En pared se cobra el área neta (descontando aberturas). En techo
se cobra el área bruta completa.

**Precio unitario por panel:** precio_m2 × au_m × largo_m.
**SKU:** determinado por familia y espesor (ver tabla de Parte 3).
**Unidad:** panel.

---

### ÍTEM 2 — Perfil U (soleras superior e inferior)

**Condición:** el espesor tiene un SKU de Perfil U definido (tabla PERFIL_U_SKU).
Espesores cubiertos: 40, 50, 60, 80, 100, 150, 200, 250 mm.
Para espesores no listados: este ítem no se incluye.

**SKUs por espesor:**
40-60mm → PU50MM. 80-100mm → PU100MM. 150mm → PU150MM. 200mm → PU200MM. 250mm → PU250MM.

**Parámetro de configuración:** perfil_u_largo_pieza_m = 3.0 metros.

**Fórmula:**
mlPerfilU = 2 × anchoEfectivo (dos soleras: superior + inferior).
cantPU = redondear hacia arriba(mlPerfilU / 3.0).

**Unidad:** pieza.

---

### ÍTEM 3 — Perfil K2 (juntas verticales entre paneles)

**Condición:** incl_k2 = true Y cantP > 1 (se necesita al menos 1 junta, es decir
al menos 2 paneles).

**Parámetro de configuración:** k2_largo_pieza_m = 3.0 metros.

**Fórmula:**
juntasK2 = (cantP − 1) × redondear hacia arriba(largo_m / 3.0)
(hay cantP − 1 juntas verticales; cada junta requiere piezas de 3m para cubrir la altura)

**SKU:** K2. Precio venta: 8.59 USD. Precio web: 10.48 USD.
**Unidad:** pieza.

---

### ÍTEM 4 — Esquineros Exteriores

**Condición:** num_esq_ext > 0.

**Parámetro de configuración:** esq_largo_pieza_m = 3.0 metros.

**Fórmula:**
cantEsqExt = num_esq_ext × redondear hacia arriba(largo_m / 3.0)

**SKU:** ESQ-EXT. Precio venta: 8.59 USD. Precio web: 10.48 USD.
**Unidad:** pieza.

---

### ÍTEM 5 — Esquineros Interiores

**Condición:** num_esq_int > 0.

**Fórmula:**
cantEsqInt = num_esq_int × redondear hacia arriba(largo_m / 3.0)

**SKU:** ESQ-INT. Precio venta: 8.59 USD. Precio web: 10.48 USD.
**Unidad:** pieza.

---

### ÍTEM 6 — Ángulo Aluminio 5852

**Condición:** incl_5852 = true.

**Parámetro de configuración:** angulo_5852_largo_pieza_m = 6.8 metros.

**Fórmula:**
cant5852 = redondear hacia arriba(anchoEfectivo / 6.8)

**SKU:** PLECHU98. Precio venta: 51.84 USD. Precio web: 63.24 USD.
**Unidad:** pieza.

---

### ÍTEMS 7 y 8 — Tornillos y Arandelas (estructura metálica)

**Condición:** estructura = "metal" O estructura = "mixto".
(Si estructura = "hormigon": estos ítems NO se incluyen en pared.)

**Parámetro de configuración:** tornillos_por_m2_tmome = 5.5 (para pared).

**Fórmula:**
cantTornillos = redondear hacia arriba(areaNeta × 5.5)
(se basa en área neta, no bruta, coherente con el costo del panel)

**ÍTEM 7 — Tornillo TMOME** — SKU: TMOME — cantidad: cantTornillos — unidad: und.
**ÍTEM 8 — Arandela Trapezoidal ARATRAP** — SKU: ARATRAP — cantidad: cantTornillos — unidad: und.
Ambos precios leídos del CSV.

---

### ÍTEM 9 — Kit Anclaje H°

**Condición:** siempre presente en pared (independientemente de la estructura).

**Parámetro de configuración:** anclaje_intervalo_m = 0.30 metros (1 cada 30cm).

**Fórmula:**
cantAnclajes = redondear hacia arriba(anchoEfectivo / 0.30)

**SKU:** ANCLAJE_H. Precio venta: 0.09 USD. Precio web: 0.03 USD.
**Unidad:** unid.

---

### ÍTEM 10 — Remaches POP RPOP (cajas de 1000 unidades)

**Condición:** siempre presente en pared.

**Parámetros de configuración:**
remaches_por_panel = 2.
remaches_por_caja = 1000.

**Fórmula:**
cantRemaches = cantP × 2
cantCajasRPOP = máximo(1, redondear hacia arriba(cantRemaches / 1000))
(mínimo 1 caja, aunque el total de remaches sea inferior a 1000)

**SKU:** RPOP. Precio leído del CSV.
**Unidad:** caja.

---

### ÍTEM 11 — Cinta Butilo C.But.

**Condición:** siempre presente en pared.

**Parámetro de configuración:** butilo_ml_por_rollo_m = 22.5 metros.

**Fórmula:**
cantButilo = máximo(1, redondear hacia arriba((cantP − 1) × largo_m / 22.5))
(cubre las juntas verticales; hay cantP − 1 juntas; mínimo 1 rollo)

**SKU:** C.But. **Unidad:** rollo. Precio leído del CSV.

---

### ÍTEM 12 — Silicona Bromplast 600ml

**Condición:** siempre presente en pared.

**Parámetro de configuración:** silicona_ml_por_cartucho = 8 metros lineales por cartucho.

**Fórmula:**
mlJuntas = (cantP − 1) × largo_m + anchoEfectivo × 2
(juntas verticales entre paneles + perímetro superior e inferior)
cantSilicona = redondear hacia arriba(mlJuntas / 8)

NOTA: La fórmula de silicona en pared es más precisa que en techo. En pared se calcula
por metros lineales de junta; en techo se usa una proporción fija por panel.

**SKU:** Bromplast. **Unidad:** cartucho. Precio leído del CSV.

---

### RESUMEN DE CONTEO DE ÍTEMS EN UN CÁLCULO DE PARED

Máximo (con K2, esquineros ext e int, ángulo 5852, estructura metal):
12 ítems: panel + perfil_U + K2 + esq_ext + esq_int + angulo_5852 + TMOME + ARATRAP
+ anclaje_H + RPOP + butilo + silicona.

Mínimo (sin K2, sin esquineros, sin 5852, estructura hormigón, 1 panel):
5 ítems: panel + perfil_U + anclaje_H + RPOP + butilo + silicona.
(K2 no aplica si cantP ≤ 1; TMOME/ARATRAP no aplican para hormigón)

---

## PARTE 9 — PASO 8: ENSAMBLADO POR ESCENARIO

Una vez calculadas las secciones, el orquestador bom.js las agrupa según el escenario.

**solo_techo:** secciones = [ techo ]
**solo_fachada:** secciones = [ pared ]
**techo_fachada:** secciones = [ techo, pared ]

**camara_frigorifica** (caso especial con geometría propia):

El sistema usa los parámetros provistos (ancho_m o cant_paneles y largo_m) para
construir el recinto como una caja cerrada. La altura está fijada en 3 metros.

Sección 1 — Techo: largo × ancho del recinto, con todos los parámetros normales.
Sección 2 — Pared frontal/posterior: ancho del recinto × 3m de altura.
  Se llama a calcParedCompleto con los mismos ancho_m/cant_paneles pero largo_m = 3.
  Esta sección recibe tipo = "pared_frontal_posterior". Representa ambos frentes
  (el costo de una pared; si se quieren 2 paredes frontales independientes se duplica).
Sección 3 — Pared lateral: largo del recinto como ancho × 3m de altura.
  Se llama a calcParedCompleto con ancho_m = largo_m del recinto, largo_m = 3.
  Esta sección recibe tipo = "pared_lateral". Representa una de las paredes laterales.

NOTA IMPORTANTE: En el escenario camara_frigorifica, la pared lateral usa ancho_m =
largo_m del recinto, ignorando cant_paneles si se hubiera provisto. El sistema siempre
usa el largo numérico para construir la pared lateral.

---

## PARTE 10 — PASO 9: CÁLCULO FINAL — IVA Y RESUMEN

Una vez generadas todas las secciones, el sistema calcula el resumen financiero.

**subtotal_sin_iva** = suma de los subtotales de todas las secciones.
**iva_22** = subtotal_sin_iva × ivaRate() donde ivaRate() = 0.22 (22%).
**total_con_iva** = subtotal_sin_iva + iva_22.
**moneda** = "USD" (todos los valores en dólares estadounidenses sin IVA, con IVA indicado).

La tasa de IVA se lee de logic_config.json en tiempo real. Si se actualiza el archivo
vía la API, el cambio aplica de inmediato en la siguiente solicitud.

---

## PARTE 11 — PASO 10: ESTRUCTURA DE SALIDA COMPLETA

El objeto de respuesta tiene la siguiente estructura:

**cotizacion_id:** UUID único generado para esta cotización.
**fecha:** Fecha del día en formato YYYY-MM-DD.
**escenario:** El escenario solicitado.
**familia:** La familia del panel usado.
**espesor_mm:** El espesor solicitado.
**color:** (solo si se proveyó en la solicitud) El color solicitado.
**lista_precios:** "venta" o "web".
**secciones:** Arreglo con cada sección calculada. Cada sección contiene:
  - tipo: "techo", "pared", "pared_frontal_posterior" o "pared_lateral".
  - familia, espesor_mm, ancho_m (efectivo), largo_m.
  - Para techo: area_m2, cant_paneles, sist_fijacion.
  - Para pared: area_bruta_m2, area_aberturas_m2, area_neta_m2, cant_paneles.
  - items: arreglo de objetos, uno por accesorio, con campos:
    · sku: código del artículo.
    · descripcion: texto descriptivo.
    · cantidad: cantidad numérica calculada.
    · unidad: "panel", "pieza", "unid", "und", "caja", "rollo", "cartucho".
    · precio_unit: precio unitario en USD sin IVA.
    · subtotal: cantidad × precio_unit, redondeado a 2 decimales.
  - subtotal: suma de todos los subtotales de ítems de esta sección.
**resumen:** Objeto con subtotal_sin_iva, iva_22, total_con_iva, moneda.
**warnings:** Arreglo de textos con advertencias. Puede estar vacío.
**nota:** Texto fijo informativo sobre la cotización.
**envio_usd:** (solo si se proveyó) Costo de envío en USD.

---

## PARTE 12 — FLUJO COMPLETO DE ACCESOS AL CATÁLOGO

Este es el mapa exacto de cuándo y cómo se accede a los datos de catálogo y configuración.

**Acceso 1 — Siempre, al inicio de cada motor (techo o pared):**
getPanelInfo(familia, espesor_mm, lista_precios)
  → Lee PANEL_DEFS (hardcodeado en catalog.js, NO del CSV).
  → Devuelve: sku, name, au_m (dimensional), precio_m2 (precio).

**Accesos 2 a N — Dentro de addItem(), una vez por accesorio:**
getAccessoryInfo(sku, lista_precios)
  → Primero busca en skuMap (construido desde catalog_real.csv al cargar el módulo).
  → Si no encuentra, busca en logic_config.json sección "accesorios" (hardcoded).
  → Devuelve: sku, name, precio, length_m, unit_base.
  → Solo el campo "precio" se usa. length_m y unit_base no se usan en las fórmulas.

**Acceso de configuración — getConfig():**
  → Se llama una vez por ejecución en cada motor para leer formula_params.
  → Retorna el objeto completo de logic_config.json (cacheado en memoria).

**Resumen de accesos por cálculo completo:**
- techo solo: 1 panel + hasta 14 accesorios = hasta 15 lecturas.
- pared sola: 1 panel + hasta 11 accesorios = hasta 12 lecturas.
- techo + fachada: hasta 27 lecturas.
- camara_frigorifica: 1 techo + 1 pared frontal + 1 pared lateral = hasta 39 lecturas.

---

## APÉNDICE A — TABLA COMPLETA DE PRECIOS DE ACCESORIOS

Los siguientes precios corresponden a la versión 5.1.0 de logic_config.json.

| SKU          | Nombre                              | Venta USD | Web USD  | Unidad  | Largo (m) |
|:-------------|:------------------------------------|----------:|---------:|:--------|----------:|
| VARILLA38    | Varilla roscada 3/8"                |      3.12 |     3.64 | unid    |         — |
| TUERCA38     | Tuerca 3/8" galv.                   |      0.12 |     0.07 | unid    |         — |
| ARCA38       | Arandela carrocero 3/8"             |      1.68 |     0.64 | unid    |         — |
| ARAPP        | Tortuga PVC (arandela PP)           |      1.27 |     1.48 | unid    |         — |
| TACEXP38     | Taco expansivo 3/8"                 |      0.96 |     1.12 | unid    |         — |
| CABALLETE    | Caballete (arandela trapezoidal)    |      0.50 |     0.46 | unid    |         — |
| TORN_AGUJA   | Tornillo aguja 5"                   |     17.00 |    17.00 | x100    |         — |
| ANCLAJE_H    | Kit anclaje H°                      |      0.09 |     0.03 | unid    |         — |
| K2           | Perfil K2 (junta interior)          |      8.59 |    10.48 | pieza   |       3.0 |
| ESQ-EXT      | Esquinero exterior                  |      8.59 |    10.48 | pieza   |       3.0 |
| ESQ-INT      | Esquinero interior                  |      8.59 |    10.48 | pieza   |       3.0 |
| G2-100       | Perfil G2 100mm                     |     15.34 |    18.72 | pieza   |       3.0 |
| G2-150       | Perfil G2 150mm                     |     17.61 |    21.49 | pieza   |       3.0 |
| G2-200       | Perfil G2 200mm                     |     21.13 |    25.78 | pieza   |       3.0 |
| G2-250       | Perfil G2 250mm                     |     21.30 |    25.99 | pieza   |       3.0 |
| PLECHU98     | Ángulo aluminio 5852 (6.8m)         |     51.84 |    63.24 | pieza   |       6.8 |
| GFCGR30      | Gotero frontal greca ISOROOF        |     17.99 |    19.38 | pieza   |      3.03 |
| MEMBRANA     | Membrana autoadhesiva 30cm×10m      |     16.62 |    20.28 | rollo   |         — |
| ESPUMA_PU    | Espuma poliuretano 750cm³           |     25.46 |    31.06 | unid    |         — |
| GLDCAM50     | Gotero lateral cámara 50mm          |     22.32 |    27.23 | pieza   |       3.0 |
| GLDCAM80     | Gotero lateral cámara 80mm          |     25.11 |    30.63 | pieza   |       3.0 |

Los restantes accesorios (TMOME, ARATRAP, C.But., Bromplast, RPOP, PU50MM, PU100MM,
GFS30, GFS50, GFS80, etc.) tienen sus precios en catalog_real.csv.

---

## APÉNDICE B — TABLA COMPLETA DE LUCES MÁXIMAS AUTOPORTANTES

| Familia       | 30mm | 40mm | 50mm | 60mm | 80mm | 100mm | 120mm | 150mm | 200mm | 250mm |
|:--------------|-----:|-----:|-----:|-----:|-----:|------:|------:|------:|------:|------:|
| ISODEC_EPS    |      |      |      |      |      |  4.5m |       |  5.5m |  6.5m |  7.5m |
| ISODEC_PIR    |      |      | 3.5m |      | 4.5m |       |  5.5m |       |       |       |
| ISOROOF_3G    | 2.5m | 3.0m | 3.5m |      | 4.5m |  5.0m |       |       |       |       |
| ISOROOF_FOIL  | 2.5m |      | 3.5m |      |      |       |       |       |       |       |
| ISOROOF_PLUS  |      |      | 3.5m |      | 4.5m |       |       |       |       |       |
| ISOPANEL_EPS  |      |      | 3.0m |      |      |  5.0m |       |  6.0m |  7.0m |  7.5m |
| ISOWALL_PIR   |      |      | 3.5m |      | 4.5m |  5.5m |       |       |       |       |
| ISOFRIG_PIR   |      | 3.0m |      | 3.5m | 4.5m |  5.0m |       |  6.0m |       |       |

---

## APÉNDICE C — TABLA COMPLETA DE DISPONIBILIDAD DE COLORES

| Familia       | Blanco              | Gris                        | Rojo                        | Terracota |
|:--------------|:--------------------|:----------------------------|:----------------------------|:----------|
| ISODEC_EPS    | Todos espesores     | Solo ≤150mm, +20 días       | Solo ≤150mm, +20 días       | —         |
| ISODEC_PIR    | Todos espesores     | Todos espesores             | —                           | —         |
| ISOROOF_3G    | Mínimo 500 m²       | Todos espesores             | Todos espesores             | Todos     |
| ISOROOF_FOIL  | Todos espesores     | —                           | —                           | —         |
| ISOROOF_PLUS  | Todos espesores     | Todos espesores             | —                           | —         |
| ISOPANEL_EPS  | Todos espesores     | Todos espesores             | Todos espesores             | —         |
| ISOWALL_PIR   | Todos espesores     | Todos espesores             | —                           | —         |
| ISOFRIG_PIR   | Todos espesores     | —                           | —                           | —         |

---

## APÉNDICE D — TABLA DE GOTEROS POR FAMILIA

| Familia      | Gotero Frontal | Gotero Superior       | Gotero Lateral | Canalón     | Cumbrera    | Sop. Canalón |
|:-------------|:---------------|:----------------------|:---------------|:------------|:------------|:-------------|
| ISOROOF_3G   | GFS30/50/80    | GFSUP30/40/50/80      | GL30/40/50/80  | CD30/50/80  | CUMROOF3M   | SOPCAN3M     |
| ISOROOF_FOIL | GFS30/50       | GFSUP30/50            | GL30/50        | CD30/50     | CUMROOF3M   | SOPCAN3M     |
| ISOROOF_PLUS | GFS50/80       | GFSUP50/80            | GL50/80        | CD50/80     | CUMROOF3M   | SOPCAN3M     |
| ISODEC_PIR   | GF80DC/GF120DC | GSDECAM50/80          | GL80DC/GL120DC | CAN.ISDC120 | 6847        | 6805         |
| ISODEC_EPS   | 6838/39/40/41  | 6828 (universal)      | 6842/43/44/45  | 6801/02/03/04 | 6847      | 6805         |
| ISOPANEL_EPS | —              | —                     | —              | —           | —           | —            |
| ISOWALL_PIR  | —              | —                     | —              | —           | —           | —            |
| ISOFRIG_PIR  | —              | —                     | —              | —           | —           | —            |

Longitudes de pieza (idénticas para todas las familias que tienen gotero):
- Gotero frontal: 3.03 metros
- Gotero superior: 3.03m (ISODEC_EPS usa 3.00m para la babeta)
- Gotero lateral: 3.00 metros
- Canalón: 3.03 metros
- Soporte canalón: 3.00 metros

---

## APÉNDICE E — MAPA DE DEPENDENCIAS DE VARIABLES

Este apéndice muestra qué variables de entrada afectan qué ítems del BOM.

| Variable de entrada    | Afecta cantidad         | Afecta precio           | Genera warning           |
|:-----------------------|:------------------------|:------------------------|:-------------------------|
| familia                | TODOS los ítems (via au_m y sistema fijación) | TODOS (via sku del panel) | autoportancia |
| espesor_mm             | Ninguna directamente    | panel (via precio_m2)   | autoportancia, color     |
| ancho_m                | cantP, anchoEfectivo    | costo_paneles           | —                        |
| cant_paneles           | cantP, anchoEfectivo    | costo_paneles           | —                        |
| largo_m                | lateral, varilla, caballete, selladores | todas las cantidades-precio | lmin/lmax, autoportancia |
| apoyos                 | varillas (techo)        | varillas (techo)        | autoportancia            |
| estructura             | tacos (hormigón), tornillos pared | ídem        | —                        |
| tiene_cumbrera         | cumbrera (techo)        | cumbrera                | —                        |
| tiene_canalon          | canalón + soporte       | canalón + soporte       | —                        |
| tipo_gotero_frontal    | SKU frontal (greca)     | gotero_frontal          | —                        |
| aberturas              | Ninguna (solo área neta pared) | panel pared      | —                        |
| num_esq_ext            | esquineros exteriores   | esquineros ext          | —                        |
| num_esq_int            | esquineros interiores   | esquineros int          | —                        |
| incl_k2                | perfil K2               | perfil K2               | —                        |
| incl_5852              | ángulo 5852             | ángulo 5852             | —                        |
| lista_precios          | Ninguna                 | TODOS los ítems         | —                        |
| color                  | Ninguna                 | Ninguna                 | disponibilidad y notas   |
| envio_usd              | Ninguna                 | Ninguna (campo separado)| —                        |

---

*Fin del reporte. Versión 5.1.0 — Calculadora Panelin BMC Uruguay.*
