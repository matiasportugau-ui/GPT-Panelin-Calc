const SHEET_TRACKER = "Tracker";
const SHEET_CONFIG = "Config";
const START_ROW = 2;
const MAX_ROWS = 2000;

const HEADERS = [
  "Fecha",
  "Cliente",
  "Telefono",
  "Origen",
  "Pedido",
  "Escenario",
  "Familia",
  "Espesor_mm",
  "Ancho_m",
  "Largo_m",
  "Color",
  "Prioridad",
  "Estado_cotizacion",
  "Responsable",
  "Proxima_accion",
  "Fecha_proxima_accion",
  "Datos_faltantes",
  "Observaciones",
  "REF_COTIZACION",
  "VERSION",
  "FECHA_EMISION",
  "SUBTOTAL",
  "IVA_22",
  "TOTAL",
  "LINK_EDITABLE",
  "LINK_PDF",
  "LINK_CARPETA",
  "DIAS_ABIERTOS",
  "VENCIDO",
  "SCORE_PRIORIDAD",
  "SEMAFORO",
  "RESULTADO_FINAL",
  "CREATED_AT",
  "UPDATED_AT"
];

const LISTS = {
  origen: ["WA", "LL", "EM", "CL", "WEB", "OTRO"],
  escenario: ["solo_techo", "solo_fachada", "techo_fachada", "camara_frig"],
  prioridad: ["Alta", "Media", "Baja", "Sin prioridad"],
  estado: [
    "Borrador",
    "Falta informacion",
    "Calculada",
    "Emitida",
    "Enviada",
    "En seguimiento",
    "Ajustando",
    "Aprobada",
    "Rechazada",
    "Vencida"
  ],
  responsable: ["TIN", "RA", "AM", "LO", "IN", "SIN_ASIGNAR"],
  resultadoFinal: ["Abierto", "Ganado", "Perdido", "Descartado"]
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("BMC Tracker")
    .addItem("Inicializar estructura", "setupBmcTracker")
    .addItem("Reaplicar validaciones", "applyBmcValidations")
    .addItem("Reaplicar formulas", "applyBmcFormulas")
    .addToUi();
}

function setupBmcTracker() {
  const ss = SpreadsheetApp.getActive();
  const tracker = ensureSheet(ss, SHEET_TRACKER);
  const config = ensureSheet(ss, SHEET_CONFIG);

  setupConfigSheet(config);
  setupTrackerSheet(tracker);
  applyBmcValidations();
  applyBmcFormulas();
  applyTrackerFormatting(tracker);
}

function applyBmcValidations() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_TRACKER);
  if (!sheet) {
    throw new Error("No existe hoja Tracker");
  }

  applyListValidation(sheet, 4, LISTS.origen);
  applyListValidation(sheet, 6, LISTS.escenario);
  applyListValidation(sheet, 12, LISTS.prioridad);
  applyListValidation(sheet, 13, LISTS.estado);
  applyListValidation(sheet, 14, LISTS.responsable);
  applyListValidation(sheet, 32, LISTS.resultadoFinal);
}

function applyBmcFormulas() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_TRACKER);
  if (!sheet) {
    throw new Error("No existe hoja Tracker");
  }

  const numRows = MAX_ROWS - START_ROW + 1;

  sheet
    .getRange(START_ROW, 28, numRows, 1)
    .setFormulaR1C1('=IF(RC1="","",TODAY()-RC1)');
  sheet
    .getRange(START_ROW, 29, numRows, 1)
    .setFormulaR1C1('=IF(RC16="","No",IF(RC16<TODAY(),"Si","No"))');
  sheet
    .getRange(START_ROW, 30, numRows, 1)
    .setFormulaR1C1(
      '=IF(RC2="","",IF(RC12="Alta",50,IF(RC12="Media",30,IF(RC12="Baja",10,0)))+IF(RC13="En seguimiento",15,IF(RC13="Enviada",10,IF(RC13="Calculada",8,0)))+IF(RC29="Si",20,0)+IF(RC15<>"",5,0))'
    );
  sheet
    .getRange(START_ROW, 31, numRows, 1)
    .setFormulaR1C1(
      '=IF(RC30="","",IF(RC30>=70,"Rojo",IF(RC30>=40,"Amarillo","Verde")))'
    );
}

function onEdit(e) {
  if (!e || !e.range) {
    return;
  }

  const sheet = e.range.getSheet();
  if (sheet.getName() !== SHEET_TRACKER || e.range.getRow() < START_ROW) {
    return;
  }

  const row = e.range.getRow();
  const col = e.range.getColumn();
  const now = new Date();
  const cliente = sheet.getRange(row, 2).getValue();

  if (cliente) {
    if (!sheet.getRange(row, 33).getValue()) {
      sheet.getRange(row, 33).setValue(now);
    }
    sheet.getRange(row, 34).setValue(now);
  }

  if (col === 4) {
    autoAssignOwner(sheet, row);
  }

  if (col === 13) {
    autoSetStatusDerivedFields(sheet, row);
  }
}

function autoAssignOwner(sheet, row) {
  const ownerCell = sheet.getRange(row, 14);
  if (ownerCell.getValue()) {
    return;
  }
  const origin = String(sheet.getRange(row, 4).getValue()).trim();
  const map = {
    WA: "TIN",
    LL: "RA",
    EM: "AM",
    WEB: "IN",
    CL: "RA"
  };
  ownerCell.setValue(map[origin] || "SIN_ASIGNAR");
}

function autoSetStatusDerivedFields(sheet, row) {
  const estado = String(sheet.getRange(row, 13).getValue()).trim();
  const fechaEmisionCell = sheet.getRange(row, 21);
  const resultadoCell = sheet.getRange(row, 32);

  if (estado === "Enviada" && !fechaEmisionCell.getValue()) {
    fechaEmisionCell.setValue(new Date());
  }

  if (!resultadoCell.getValue()) {
    resultadoCell.setValue("Abierto");
  }

  if (estado === "Aprobada") {
    resultadoCell.setValue("Ganado");
  } else if (estado === "Rechazada") {
    resultadoCell.setValue("Perdido");
  } else if (estado === "Vencida") {
    resultadoCell.setValue("Descartado");
  }
}

function setupTrackerSheet(sheet) {
  sheet.clear();
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  sheet.setFrozenRows(1);

  if (sheet.getFilter()) {
    sheet.getFilter().remove();
  }
  sheet.getRange(1, 1, MAX_ROWS, HEADERS.length).createFilter();

  const widths = [
    110, 200, 130, 95, 300, 130, 120, 110, 90, 90, 110, 110, 150, 120, 220,
    150, 220, 240, 170, 90, 155, 110, 100, 110, 180, 170, 180, 120, 95, 150,
    110, 130, 145, 145
  ];

  for (let i = 0; i < widths.length; i += 1) {
    sheet.setColumnWidth(i + 1, widths[i]);
  }

  sheet
    .getRange(START_ROW, 32, MAX_ROWS - START_ROW + 1, 1)
    .setValue("Abierto");
}

function setupConfigSheet(sheet) {
  sheet.clear();
  sheet.getRange(1, 1, 1, 2).setValues([["Lista", "Valor"]]);

  let row = 2;
  Object.keys(LISTS).forEach(function (key) {
    const values = LISTS[key];
    for (let i = 0; i < values.length; i += 1) {
      sheet.getRange(row, 1).setValue(i === 0 ? key : "");
      sheet.getRange(row, 2).setValue(values[i]);
      row += 1;
    }
    row += 1;
  });

  sheet.setColumnWidth(1, 180);
  sheet.setColumnWidth(2, 180);
  sheet.setFrozenRows(1);
}

function applyTrackerFormatting(sheet) {
  const header = sheet.getRange(1, 1, 1, HEADERS.length);
  header
    .setFontWeight("bold")
    .setFontColor("#ffffff")
    .setBackground("#111827")
    .setHorizontalAlignment("center");

  sheet
    .getRange(START_ROW, 1, MAX_ROWS - START_ROW + 1, HEADERS.length)
    .setWrap(true)
    .setVerticalAlignment("top");

  sheet.getRange(START_ROW, 1, MAX_ROWS - START_ROW + 1, 1).setNumberFormat("yyyy-mm-dd");
  sheet
    .getRange(START_ROW, 16, MAX_ROWS - START_ROW + 1, 1)
    .setNumberFormat("yyyy-mm-dd");
  sheet
    .getRange(START_ROW, 21, MAX_ROWS - START_ROW + 1, 1)
    .setNumberFormat("yyyy-mm-dd hh:mm");
  sheet
    .getRange(START_ROW, 22, MAX_ROWS - START_ROW + 1, 3)
    .setNumberFormat("$#,##0.00");
  sheet
    .getRange(START_ROW, 33, MAX_ROWS - START_ROW + 1, 2)
    .setNumberFormat("yyyy-mm-dd hh:mm");

  const semaforoRange = sheet.getRange(START_ROW, 31, MAX_ROWS - START_ROW + 1, 1);
  const vencidoRange = sheet.getRange(START_ROW, 29, MAX_ROWS - START_ROW + 1, 1);
  const prioridadRange = sheet.getRange(START_ROW, 12, MAX_ROWS - START_ROW + 1, 1);

  const rules = [
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo("Rojo")
      .setBackground("#fecaca")
      .setRanges([semaforoRange])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo("Amarillo")
      .setBackground("#fde68a")
      .setRanges([semaforoRange])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo("Verde")
      .setBackground("#bbf7d0")
      .setRanges([semaforoRange])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo("Si")
      .setBackground("#fecaca")
      .setRanges([vencidoRange])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo("Alta")
      .setBackground("#fecaca")
      .setRanges([prioridadRange])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo("Media")
      .setBackground("#fde68a")
      .setRanges([prioridadRange])
      .build()
  ];

  sheet.setConditionalFormatRules(rules);
}

function applyListValidation(sheet, col, values) {
  const range = sheet.getRange(START_ROW, col, MAX_ROWS - START_ROW + 1, 1);
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(values, true)
    .setAllowInvalid(false)
    .build();
  range.setDataValidation(rule);
}

function ensureSheet(ss, name) {
  const existing = ss.getSheetByName(name);
  if (existing) {
    return existing;
  }
  return ss.insertSheet(name);
}
