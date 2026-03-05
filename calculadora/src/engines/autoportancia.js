'use strict';

/**
 * Tabla de luces máximas (m) por familia y espesor.
 * Basada en especificaciones técnicas Panelin BMC Uruguay.
 */
const LUCES_MAXIMAS = {
  ISODEC_EPS: { 100: 4.5, 150: 5.5, 200: 6.5, 250: 7.5 },
  ISODEC_PIR: { 50: 3.5, 80: 4.5 },
  ISOROOF_3G: { 30: 2.5, 40: 3.0, 50: 3.5, 80: 4.5, 100: 5.0 },
  ISOROOF_FOIL: { 30: 2.5, 50: 3.5 },
  ISOROOF_PLUS: { 50: 3.5, 80: 4.5 },
  ISOPANEL_EPS: { 50: 3.0, 100: 5.0, 150: 5.5, 200: 6.5, 250: 7.5 },
  ISOWALL_PIR: { 50: 3.5, 80: 4.5, 100: 5.5 },
  ISOFRIG_PIR: { 40: 3.0, 60: 3.5, 80: 4.5, 100: 5.5, 150: 6.5 },
};

/**
 * Valida si la luz real es admisible para la familia y espesor dados.
 * @param {string} familia
 * @param {number} espesor_mm
 * @param {number} luzReal - Luz real en metros
 * @returns {{ valido: boolean, luz_max: number|null, mensaje: string }}
 */
function validarAutoportancia(familia, espesor_mm, luzReal) {
  const familiaData = LUCES_MAXIMAS[familia];
  if (!familiaData) {
    return { valido: false, luz_max: null, mensaje: `Familia ${familia} no encontrada en tabla de autoportancia.` };
  }
  const luzMax = familiaData[Number(espesor_mm)];
  if (luzMax === undefined) {
    return { valido: false, luz_max: null, mensaje: `Espesor ${espesor_mm}mm no tabulado para ${familia}.` };
  }
  const valido = luzReal <= luzMax;
  return {
    valido,
    luz_max: luzMax,
    mensaje: valido
      ? `OK: luz ${luzReal}m ≤ máximo ${luzMax}m para ${familia} ${espesor_mm}mm.`
      : `ADVERTENCIA: luz ${luzReal}m supera el máximo ${luzMax}m para ${familia} ${espesor_mm}mm. Verificar estructura.`,
  };
}

/**
 * Devuelve la tabla completa de luces máximas.
 */
function tablaAutoportancia() {
  return LUCES_MAXIMAS;
}

module.exports = { validarAutoportancia, tablaAutoportancia };
