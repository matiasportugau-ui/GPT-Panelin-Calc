const SHEET_TRACKER = "Tracker";
const SHEET_CONFIG = "Config";
const SHEET_DASHBOARD = "Dashboard";
const SHEET_FOLLOWUP_QUEUE = "FollowUpQueue";
const START_ROW = 2;
const MAX_ROWS = 2000;
const QUOTE_SEQ_PROP_PREFIX = "BMC_QUOTE_SEQ_";
const DRIVE_ROOT_FOLDER_ID_PROP = "BMC_DRIVE_ROOT_FOLDER_ID";
const DRIVE_QUOTES_ROOT_NAME = "Cotizaciones";
const EDITABLE_TEMPLATE_FILE_ID_PROP = "BMC_EDITABLE_TEMPLATE_FILE_ID";
const API_BASE_URL_PROP = "BMC_API_BASE_URL";
const NOTIFICATION_EMAIL_PROP = "BMC_NOTIFICATION_EMAIL";

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
    .addItem("Recrear dashboard", "setupBmcDashboard")
    .addItem("Asignar REF a fila actual", "assignQuoteRefToActiveRow")
    .addItem("Ver secuencia actual", "showSequenceStatus")
    .addSeparator()
    .addItem("Configurar carpeta raiz Drive (ID)", "promptDriveRootFolderId")
    .addItem("Ver carpeta raiz Drive", "showDriveRootFolderStatus")
    .addItem("Crear carpeta para fila actual", "createDriveFolderForActiveRow")
    .addItem("Completar carpetas faltantes", "createDriveFoldersForPendingRows")
    .addSeparator()
    .addItem("Configurar plantilla editable (ID)", "promptEditableTemplateFileId")
    .addItem("Ver plantilla editable", "showEditableTemplateStatus")
    .addItem("Crear editable para fila actual", "createEditableForActiveRow")
    .addItem("Completar editables faltantes", "createEditablesForPendingRows")
    .addSeparator()
    .addItem("Configurar API emision", "promptApiBaseUrl")
    .addItem("Emitir cotizacion por API (fila actual)", "issueQuoteForActiveRowViaApi")
    .addSeparator()
    .addItem("Configurar email de alertas", "promptNotificationEmail")
    .addItem("Enviar resumen diario ahora", "sendDailySummaryNow")
    .addItem("Alertar vencidos ahora", "alertOverdueLeadsNow")
    .addItem("Generar cola de follow-up", "generateFollowUpQueue")
    .addToUi();
}

function setupBmcTracker() {
  const ss = SpreadsheetApp.getActive();
  const tracker = ensureSheet(ss, SHEET_TRACKER);
  const config = ensureSheet(ss, SHEET_CONFIG);
  const dashboard = ensureSheet(ss, SHEET_DASHBOARD);

  setupConfigSheet(config);
  setupTrackerSheet(tracker);
  applyBmcValidations();
  applyBmcFormulas();
  applyTrackerFormatting(tracker);
  setupDashboardSheet(dashboard);
}

function setupBmcDashboard() {
  const sheet = ensureSheet(SpreadsheetApp.getActive(), SHEET_DASHBOARD);
  setupDashboardSheet(sheet);
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
  const quoteRefCell = sheet.getRange(row, 19);
  const versionCell = sheet.getRange(row, 20);
  const fechaEmisionCell = sheet.getRange(row, 21);
  const resultadoCell = sheet.getRange(row, 32);

  if (estado === "Emitida" || estado === "Enviada") {
    assignQuoteRefIfMissing_(sheet, row);
    if (!versionCell.getValue()) {
      versionCell.setValue(1);
    }
    if (!fechaEmisionCell.getValue()) {
      fechaEmisionCell.setValue(new Date());
    }
    if (hasDriveRootConfigured_()) {
      try {
        ensureDriveFolderLinkForRow_(sheet, row);
      } catch (err) {
        Logger.log("No se pudo crear carpeta automaticamente en fila %s: %s", row, err);
      }
    }
    if (hasEditableTemplateConfigured_() && hasDriveRootConfigured_()) {
      try {
        ensureEditableLinkForRow_(sheet, row);
      } catch (err) {
        Logger.log("No se pudo crear editable automaticamente en fila %s: %s", row, err);
      }
    }
  }

  if (quoteRefCell.getValue() && !versionCell.getValue()) {
    versionCell.setValue(1);
  }

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

function assignQuoteRefToActiveRow() {
  const sheet = SpreadsheetApp.getActiveSheet();
  if (sheet.getName() !== SHEET_TRACKER) {
    throw new Error("La hoja activa debe ser Tracker.");
  }

  const row = sheet.getActiveRange().getRow();
  if (row < START_ROW) {
    throw new Error("Selecciona una fila de datos valida (>= " + START_ROW + ").");
  }

  const ref = assignQuoteRefIfMissing_(sheet, row);
  const versionCell = sheet.getRange(row, 20);
  const updatedAtCell = sheet.getRange(row, 34);
  if (!versionCell.getValue()) {
    versionCell.setValue(1);
  }
  updatedAtCell.setValue(new Date());

  SpreadsheetApp.getUi().alert("REF asignada: " + ref + " (fila " + row + ")");
}

function assignQuoteRefIfMissing_(sheet, row) {
  const quoteRefCell = sheet.getRange(row, 19);
  const current = String(quoteRefCell.getValue()).trim();
  if (current) {
    return current;
  }

  const quoteRef = reserveNextQuoteRef_();
  quoteRefCell.setValue(quoteRef);
  return quoteRef;
}

function reserveNextQuoteRef_(forcedYear) {
  const year = forcedYear || new Date().getFullYear();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const props = PropertiesService.getScriptProperties();
    const key = getSequenceKey_(year);
    const current = parseInt(props.getProperty(key) || "0", 10);
    const safeCurrent = Number.isFinite(current) && current >= 0 ? current : 0;
    const next = safeCurrent + 1;
    props.setProperty(key, String(next));
    return formatQuoteRef_(year, next);
  } finally {
    lock.releaseLock();
  }
}

function getSequenceKey_(year) {
  return QUOTE_SEQ_PROP_PREFIX + String(year);
}

function formatQuoteRef_(year, sequence) {
  return "BMC-COT-" + String(year) + "-" + String(sequence).padStart(4, "0");
}

function showSequenceStatus() {
  const year = new Date().getFullYear();
  const props = PropertiesService.getScriptProperties();
  const raw = props.getProperty(getSequenceKey_(year)) || "0";
  const current = Number.isFinite(parseInt(raw, 10)) ? parseInt(raw, 10) : 0;
  SpreadsheetApp.getUi().alert(
    "Secuencia actual " + year + ": " + String(current) + "\nSiguiente REF: " + formatQuoteRef_(year, current + 1)
  );
}

function setSequenceForYear(year, value) {
  const y = Number(year);
  const v = Number(value);
  if (!Number.isInteger(y) || y < 2000 || y > 2100) {
    throw new Error("Anio invalido.");
  }
  if (!Number.isInteger(v) || v < 0) {
    throw new Error("Valor de secuencia invalido.");
  }
  PropertiesService.getScriptProperties().setProperty(getSequenceKey_(y), String(v));
}

function promptDriveRootFolderId() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    "Configurar carpeta raiz de Drive",
    "Ingresa el ID de la carpeta raiz de BMC Uruguay (no URL completa).",
    ui.ButtonSet.OK_CANCEL
  );
  if (response.getSelectedButton() !== ui.Button.OK) {
    return;
  }

  const folderId = String(response.getResponseText() || "").trim();
  if (!folderId) {
    throw new Error("Debes ingresar un ID de carpeta valido.");
  }

  setDriveRootFolderId(folderId);
  showDriveRootFolderStatus();
}

function setDriveRootFolderId(folderId) {
  const root = DriveApp.getFolderById(folderId);
  if (!root) {
    throw new Error("No se pudo acceder a la carpeta raiz.");
  }
  PropertiesService.getScriptProperties().setProperty(DRIVE_ROOT_FOLDER_ID_PROP, folderId);
}

function showDriveRootFolderStatus() {
  const ui = SpreadsheetApp.getUi();
  const folderId = PropertiesService.getScriptProperties().getProperty(DRIVE_ROOT_FOLDER_ID_PROP);
  if (!folderId) {
    ui.alert("No hay carpeta raiz configurada. Usa 'Configurar carpeta raiz Drive (ID)'.");
    return;
  }
  const folder = DriveApp.getFolderById(folderId);
  ui.alert("Carpeta raiz configurada:\nNombre: " + folder.getName() + "\nID: " + folderId);
}

function createDriveFolderForActiveRow() {
  const sheet = SpreadsheetApp.getActiveSheet();
  if (sheet.getName() !== SHEET_TRACKER) {
    throw new Error("La hoja activa debe ser Tracker.");
  }
  if (!hasDriveRootConfigured_()) {
    throw new Error("Configura primero la carpeta raiz Drive desde el menu BMC Tracker.");
  }

  const row = sheet.getActiveRange().getRow();
  if (row < START_ROW) {
    throw new Error("Selecciona una fila de datos valida (>= " + START_ROW + ").");
  }

  assignQuoteRefIfMissing_(sheet, row);
  const url = ensureDriveFolderLinkForRow_(sheet, row);
  sheet.getRange(row, 34).setValue(new Date());
  SpreadsheetApp.getUi().alert("Carpeta creada/vinculada en fila " + row + ":\n" + url);
}

function createDriveFoldersForPendingRows() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_TRACKER);
  if (!sheet) {
    throw new Error("No existe hoja Tracker.");
  }
  if (!hasDriveRootConfigured_()) {
    throw new Error("Configura primero la carpeta raiz Drive desde el menu BMC Tracker.");
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < START_ROW) {
    SpreadsheetApp.getUi().alert("No hay filas para procesar.");
    return;
  }

  let createdOrLinked = 0;
  for (let row = START_ROW; row <= lastRow; row += 1) {
    const cliente = String(sheet.getRange(row, 2).getValue() || "").trim();
    if (!cliente) {
      continue;
    }

    const estado = String(sheet.getRange(row, 13).getValue() || "").trim();
    if (estado !== "Emitida" && estado !== "Enviada") {
      continue;
    }

    const currentLink = String(sheet.getRange(row, 27).getValue() || "").trim();
    if (currentLink) {
      continue;
    }

    assignQuoteRefIfMissing_(sheet, row);
    ensureDriveFolderLinkForRow_(sheet, row);
    sheet.getRange(row, 34).setValue(new Date());
    createdOrLinked += 1;
  }

  SpreadsheetApp.getUi().alert("Procesadas carpetas: " + String(createdOrLinked));
}

function promptEditableTemplateFileId() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    "Configurar plantilla editable",
    "Ingresa el ID del archivo plantilla editable (Google Sheets o archivo Drive).",
    ui.ButtonSet.OK_CANCEL
  );
  if (response.getSelectedButton() !== ui.Button.OK) {
    return;
  }
  const fileId = String(response.getResponseText() || "").trim();
  if (!fileId) {
    throw new Error("Debes ingresar un ID de archivo valido.");
  }
  setEditableTemplateFileId(fileId);
  showEditableTemplateStatus();
}

function setEditableTemplateFileId(fileId) {
  const file = DriveApp.getFileById(fileId);
  if (!file) {
    throw new Error("No se pudo acceder al archivo plantilla.");
  }
  PropertiesService.getScriptProperties().setProperty(EDITABLE_TEMPLATE_FILE_ID_PROP, fileId);
}

function showEditableTemplateStatus() {
  const ui = SpreadsheetApp.getUi();
  const fileId = PropertiesService.getScriptProperties().getProperty(EDITABLE_TEMPLATE_FILE_ID_PROP);
  if (!fileId) {
    ui.alert("No hay plantilla editable configurada.");
    return;
  }
  const file = DriveApp.getFileById(fileId);
  ui.alert("Plantilla editable configurada:\nNombre: " + file.getName() + "\nID: " + fileId);
}

function createEditableForActiveRow() {
  const sheet = SpreadsheetApp.getActiveSheet();
  if (sheet.getName() !== SHEET_TRACKER) {
    throw new Error("La hoja activa debe ser Tracker.");
  }
  if (!hasDriveRootConfigured_()) {
    throw new Error("Configura primero la carpeta raiz Drive.");
  }
  if (!hasEditableTemplateConfigured_()) {
    throw new Error("Configura primero la plantilla editable.");
  }
  const row = sheet.getActiveRange().getRow();
  if (row < START_ROW) {
    throw new Error("Selecciona una fila de datos valida (>= " + START_ROW + ").");
  }

  assignQuoteRefIfMissing_(sheet, row);
  if (!sheet.getRange(row, 20).getValue()) {
    sheet.getRange(row, 20).setValue(1);
  }
  const editableUrl = ensureEditableLinkForRow_(sheet, row);
  sheet.getRange(row, 34).setValue(new Date());
  SpreadsheetApp.getUi().alert("Editable creado/vinculado en fila " + row + ":\n" + editableUrl);
}

function createEditablesForPendingRows() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_TRACKER);
  if (!sheet) {
    throw new Error("No existe hoja Tracker.");
  }
  if (!hasDriveRootConfigured_()) {
    throw new Error("Configura primero la carpeta raiz Drive.");
  }
  if (!hasEditableTemplateConfigured_()) {
    throw new Error("Configura primero la plantilla editable.");
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < START_ROW) {
    SpreadsheetApp.getUi().alert("No hay filas para procesar.");
    return;
  }

  let processed = 0;
  for (let row = START_ROW; row <= lastRow; row += 1) {
    const cliente = String(sheet.getRange(row, 2).getValue() || "").trim();
    if (!cliente) {
      continue;
    }
    const estado = String(sheet.getRange(row, 13).getValue() || "").trim();
    if (estado !== "Emitida" && estado !== "Enviada") {
      continue;
    }
    const current = String(sheet.getRange(row, 25).getValue() || "").trim();
    if (current) {
      continue;
    }
    assignQuoteRefIfMissing_(sheet, row);
    if (!sheet.getRange(row, 20).getValue()) {
      sheet.getRange(row, 20).setValue(1);
    }
    ensureEditableLinkForRow_(sheet, row);
    sheet.getRange(row, 34).setValue(new Date());
    processed += 1;
  }

  SpreadsheetApp.getUi().alert("Editables procesados: " + String(processed));
}

function ensureDriveFolderLinkForRow_(sheet, row) {
  const linkCell = sheet.getRange(row, 27);
  const current = String(linkCell.getValue() || "").trim();
  if (current) {
    return current;
  }

  const quoteRef = String(sheet.getRange(row, 19).getValue() || "").trim();
  if (!quoteRef) {
    throw new Error("La fila " + row + " no tiene REF_COTIZACION.");
  }

  const clientName = String(sheet.getRange(row, 2).getValue() || "").trim();
  const clientSlug = slugifyClientName_(clientName);

  const emision = sheet.getRange(row, 21).getValue();
  const ingreso = sheet.getRange(row, 1).getValue();
  const baseDate = coerceToDate_(emision) || coerceToDate_(ingreso) || new Date();

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const root = getDriveRootFolder_();
    const quotesRoot = getOrCreateChildFolder_(root, DRIVE_QUOTES_ROOT_NAME);
    const yearFolder = getOrCreateChildFolder_(quotesRoot, String(baseDate.getFullYear()));
    const monthFolder = getOrCreateChildFolder_(yearFolder, formatMonthFolderName_(baseDate));
    const dayFolder = getOrCreateChildFolder_(monthFolder, formatDayFolderName_(baseDate));
    const quoteFolderName = quoteRef + "_" + clientSlug;
    const quoteFolder = getOrCreateChildFolder_(dayFolder, quoteFolderName);
    const url = quoteFolder.getUrl();
    linkCell.setValue(url);
    return url;
  } finally {
    lock.releaseLock();
  }
}

function getDriveRootFolder_() {
  const folderId = PropertiesService.getScriptProperties().getProperty(DRIVE_ROOT_FOLDER_ID_PROP);
  if (!folderId) {
    throw new Error(
      "No hay carpeta raiz configurada. Usa menu: BMC Tracker -> Configurar carpeta raiz Drive (ID)."
    );
  }
  return DriveApp.getFolderById(folderId);
}

function hasDriveRootConfigured_() {
  return Boolean(PropertiesService.getScriptProperties().getProperty(DRIVE_ROOT_FOLDER_ID_PROP));
}

function hasEditableTemplateConfigured_() {
  return Boolean(PropertiesService.getScriptProperties().getProperty(EDITABLE_TEMPLATE_FILE_ID_PROP));
}

function ensureEditableLinkForRow_(sheet, row) {
  const linkCell = sheet.getRange(row, 25);
  const current = String(linkCell.getValue() || "").trim();
  if (current) {
    return current;
  }

  const folderUrl = ensureDriveFolderLinkForRow_(sheet, row);
  const folder = DriveApp.getFolderById(extractDriveIdFromUrl_(folderUrl));
  const templateId = PropertiesService.getScriptProperties().getProperty(EDITABLE_TEMPLATE_FILE_ID_PROP);
  if (!templateId) {
    throw new Error("No hay plantilla editable configurada.");
  }

  const templateFile = DriveApp.getFileById(templateId);
  const quoteRef = String(sheet.getRange(row, 19).getValue() || "").trim();
  const version = Number(sheet.getRange(row, 20).getValue() || 1);
  const clientSlug = slugifyClientName_(sheet.getRange(row, 2).getValue());
  const fileName = quoteRef + "-V" + String(version) + "_" + clientSlug + "_EDITABLE";

  const existing = findFileInFolderByName_(folder, fileName);
  const file = existing || templateFile.makeCopy(fileName, folder);
  const url = file.getUrl();
  linkCell.setValue(url);
  return url;
}

function findFileInFolderByName_(folder, filename) {
  const files = folder.getFilesByName(filename);
  return files.hasNext() ? files.next() : null;
}

function extractDriveIdFromUrl_(url) {
  const value = String(url || "");
  const idMatch = value.match(/[-\w]{25,}/);
  if (!idMatch) {
    throw new Error("No se pudo extraer ID de Drive desde URL: " + value);
  }
  return idMatch[0];
}

function promptApiBaseUrl() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    "Configurar API de emision",
    "Ingresa base URL (ejemplo: https://calculadora-bmc.vercel.app).",
    ui.ButtonSet.OK_CANCEL
  );
  if (response.getSelectedButton() !== ui.Button.OK) {
    return;
  }
  const baseUrl = sanitizeBaseUrl_(response.getResponseText());
  if (!baseUrl) {
    throw new Error("Base URL invalida.");
  }
  PropertiesService.getScriptProperties().setProperty(API_BASE_URL_PROP, baseUrl);
  SpreadsheetApp.getUi().alert("API configurada: " + baseUrl);
}

function issueQuoteForActiveRowViaApi() {
  const sheet = SpreadsheetApp.getActiveSheet();
  if (sheet.getName() !== SHEET_TRACKER) {
    throw new Error("La hoja activa debe ser Tracker.");
  }

  const row = sheet.getActiveRange().getRow();
  if (row < START_ROW) {
    throw new Error("Selecciona una fila de datos valida (>= " + START_ROW + ").");
  }

  const baseUrl = getApiBaseUrl_();
  const client = {
    nombre: String(sheet.getRange(row, 2).getValue() || "").trim(),
    telefono: String(sheet.getRange(row, 3).getValue() || "").trim(),
  };
  if (!client.nombre) {
    throw new Error("Cliente es obligatorio para emitir.");
  }

  const technicalInput = {
    escenario: String(sheet.getRange(row, 6).getValue() || "").trim(),
    familia: String(sheet.getRange(row, 7).getValue() || "").trim(),
    espesor_mm: Number(sheet.getRange(row, 8).getValue()),
    ancho_m: Number(sheet.getRange(row, 9).getValue()),
    largo_m: Number(sheet.getRange(row, 10).getValue()),
    color: String(sheet.getRange(row, 11).getValue() || "").trim(),
  };

  if (!technicalInput.escenario || !technicalInput.familia) {
    throw new Error("Escenario y familia son obligatorios para calculo API.");
  }
  if (!Number.isFinite(technicalInput.espesor_mm) || technicalInput.espesor_mm <= 0) {
    throw new Error("Espesor_mm invalido.");
  }
  if (!Number.isFinite(technicalInput.largo_m) || technicalInput.largo_m <= 0) {
    throw new Error("Largo_m invalido.");
  }
  if (!Number.isFinite(technicalInput.ancho_m) || technicalInput.ancho_m <= 0) {
    delete technicalInput.ancho_m;
  }

  const calcResp = postJson_(baseUrl + "/api/quotes/calculate", {
    client,
    technical_input: technicalInput,
  });
  if (!calcResp.ok) {
    throw new Error("Error calculate: " + (calcResp.error || "desconocido"));
  }

  const quoteRef = String(sheet.getRange(row, 19).getValue() || "").trim();
  const statusLabel = String(sheet.getRange(row, 13).getValue() || "Emitida").trim();
  const statusTarget = statusLabelToCanonical_(statusLabel);
  const payload = {
    client,
    calculation_result: calcResp.calculation_result,
    status_target: statusTarget,
    issued_by: Session.getActiveUser().getEmail() || "apps-script",
  };
  if (quoteRef) {
    payload.quote_ref = quoteRef;
  }

  const issueResp = postJson_(baseUrl + "/api/quotes/issue", payload);
  if (!issueResp.ok) {
    throw new Error("Error issue: " + (issueResp.error || "desconocido"));
  }

  writeIssueResponseToRow_(sheet, row, issueResp, baseUrl);
  SpreadsheetApp.getUi().alert(
    "Cotizacion emitida\nRef: " + issueResp.quote_ref + "\nVersion: V" + issueResp.version
  );
}

function writeIssueResponseToRow_(sheet, row, issueResp, baseUrl) {
  const now = new Date();
  const currentRef = String(sheet.getRange(row, 19).getValue() || "").trim();
  const currentVersion = Number(sheet.getRange(row, 20).getValue() || 0);

  sheet.getRange(row, 19).setValue(issueResp.quote_ref);
  sheet.getRange(row, 20).setValue(issueResp.version);
  sheet.getRange(row, 21).setValue(now);
  sheet.getRange(row, 22).setValue(issueResp.subtotal || 0);
  sheet.getRange(row, 23).setValue(issueResp.iva_22 || 0);
  sheet.getRange(row, 24).setValue(issueResp.total || 0);

  const pdfUrl = absolutizeApiUrl_(baseUrl, issueResp.links?.pdf_url || "");
  const pdfCell = sheet.getRange(row, 26);
  const currentPdf = String(pdfCell.getValue() || "").trim();
  const isSameVersion = currentRef === issueResp.quote_ref && currentVersion === Number(issueResp.version);
  if (!currentPdf || !isSameVersion) {
    pdfCell.setValue(pdfUrl);
  }

  const payloadUrl = absolutizeApiUrl_(baseUrl, issueResp.links?.payload_url || "");
  if (!sheet.getRange(row, 18).getValue() && payloadUrl) {
    sheet.getRange(row, 18).setValue("Payload: " + payloadUrl);
  }

  if (!sheet.getRange(row, 27).getValue() && hasDriveRootConfigured_()) {
    try {
      ensureDriveFolderLinkForRow_(sheet, row);
    } catch (_err) {
      // best effort
    }
  }
  if (!sheet.getRange(row, 25).getValue() && hasEditableTemplateConfigured_()) {
    try {
      ensureEditableLinkForRow_(sheet, row);
    } catch (_err) {
      // best effort
    }
  }

  sheet.getRange(row, 34).setValue(now);
}

function postJson_(url, body) {
  const response = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(body),
    muteHttpExceptions: true,
  });
  const text = response.getContentText() || "";
  let parsed = {};
  try {
    parsed = JSON.parse(text);
  } catch (_err) {
    parsed = { ok: false, error: text || "Respuesta no JSON" };
  }
  if (response.getResponseCode() >= 400) {
    return { ok: false, error: parsed.error || ("HTTP " + response.getResponseCode()) };
  }
  return parsed;
}

function getApiBaseUrl_() {
  const base = PropertiesService.getScriptProperties().getProperty(API_BASE_URL_PROP);
  if (!base) {
    throw new Error("No hay API configurada. Usa menu: Configurar API emision.");
  }
  return sanitizeBaseUrl_(base);
}

function sanitizeBaseUrl_(value) {
  const base = String(value || "").trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(base)) return "";
  return base;
}

function absolutizeApiUrl_(baseUrl, endpointPath) {
  const p = String(endpointPath || "").trim();
  if (!p) return "";
  if (/^https?:\/\//i.test(p)) return p;
  return baseUrl + (p.startsWith("/") ? p : "/" + p);
}

function statusLabelToCanonical_(label) {
  const key = String(label || "").trim().toLowerCase();
  const map = {
    "borrador": "BORRADOR",
    "falta informacion": "FALTA_INFORMACION",
    "calculada": "CALCULADA",
    "emitida": "EMITIDA",
    "enviada": "ENVIADA",
    "en seguimiento": "EN_SEGUIMIENTO",
    "ajustando": "AJUSTANDO",
    "aprobada": "APROBADA",
    "rechazada": "RECHAZADA",
    "vencida": "VENCIDA",
  };
  return map[key] || "EMITIDA";
}

function promptNotificationEmail() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    "Configurar email de alertas",
    "Ingresa email destino para resumenes y alertas.",
    ui.ButtonSet.OK_CANCEL
  );
  if (response.getSelectedButton() !== ui.Button.OK) {
    return;
  }
  const email = String(response.getResponseText() || "").trim();
  if (!isValidEmail_(email)) {
    throw new Error("Email invalido.");
  }
  PropertiesService.getScriptProperties().setProperty(NOTIFICATION_EMAIL_PROP, email);
  ui.alert("Email de alertas configurado: " + email);
}

function sendDailySummaryNow() {
  const email = getNotificationEmail_();
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_TRACKER);
  if (!sheet) throw new Error("No existe hoja Tracker.");

  const rows = getTrackerRows_(sheet);
  const openRows = rows.filter((r) => r.resultado_final === "Abierto");
  const highRows = openRows.filter((r) => r.prioridad === "Alta");
  const overdueRows = openRows.filter((r) => r.vencido === "Si");
  const pendingQuoteRows = openRows.filter((r) =>
    ["Borrador", "Falta informacion", "Calculada", "Ajustando"].includes(r.estado_cotizacion)
  );

  const byOwner = {};
  openRows.forEach((r) => {
    const key = r.responsable || "SIN_ASIGNAR";
    if (!byOwner[key]) byOwner[key] = { abiertos: 0, vencidos: 0 };
    byOwner[key].abiertos += 1;
    if (r.vencido === "Si") byOwner[key].vencidos += 1;
  });

  const lines = [
    "Resumen diario comercial - BMC Uruguay",
    "",
    "Leads abiertos: " + openRows.length,
    "Alta prioridad: " + highRows.length,
    "Vencidos: " + overdueRows.length,
    "Pendientes de cotizacion: " + pendingQuoteRows.length,
    "",
    "Resumen por responsable:",
  ];
  Object.keys(byOwner)
    .sort()
    .forEach((owner) => {
      lines.push(
        "- " +
          owner +
          ": abiertos=" +
          byOwner[owner].abiertos +
          ", vencidos=" +
          byOwner[owner].vencidos
      );
    });

  const top = openRows
    .slice()
    .sort((a, b) => Number(b.score_prioridad || 0) - Number(a.score_prioridad || 0))
    .slice(0, 5);
  lines.push("", "Top 5 prioridad:");
  top.forEach((r) => {
    lines.push(
      "- " +
        r.cliente +
        " | Estado: " +
        r.estado_cotizacion +
        " | Resp: " +
        (r.responsable || "SIN_ASIGNAR") +
        " | Score: " +
        Number(r.score_prioridad || 0)
    );
  });

  MailApp.sendEmail({
    to: email,
    subject: "BMC Uruguay - Resumen diario comercial",
    body: lines.join("\n"),
  });
}

function alertOverdueLeadsNow() {
  const email = getNotificationEmail_();
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_TRACKER);
  if (!sheet) throw new Error("No existe hoja Tracker.");
  const rows = getTrackerRows_(sheet).filter(
    (r) => r.resultado_final === "Abierto" && r.vencido === "Si"
  );

  if (rows.length === 0) {
    MailApp.sendEmail({
      to: email,
      subject: "BMC Uruguay - Alertas de vencidos",
      body: "Sin oportunidades vencidas al momento.",
    });
    return;
  }

  const grouped = {};
  rows.forEach((r) => {
    const owner = r.responsable || "SIN_ASIGNAR";
    if (!grouped[owner]) grouped[owner] = [];
    grouped[owner].push(r);
  });

  const lines = ["Alertas de oportunidades vencidas", ""];
  Object.keys(grouped)
    .sort()
    .forEach((owner) => {
      lines.push(owner + ":");
      grouped[owner].forEach((r) => {
        lines.push(
          "- " +
            r.cliente +
            " | Pedido: " +
            truncate_(r.pedido, 90) +
            " | Proxima accion: " +
            (r.proxima_accion || "sin definir")
        );
      });
      lines.push("");
    });

  MailApp.sendEmail({
    to: email,
    subject: "BMC Uruguay - Leads vencidos (" + rows.length + ")",
    body: lines.join("\n"),
  });
}

function generateFollowUpQueue() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_TRACKER);
  if (!sheet) throw new Error("No existe hoja Tracker.");

  const rows = getTrackerRows_(sheet).filter(
    (r) =>
      r.resultado_final === "Abierto" &&
      (r.estado_cotizacion === "Enviada" || r.estado_cotizacion === "En seguimiento")
  );

  const queue = ensureSheet(SpreadsheetApp.getActive(), SHEET_FOLLOWUP_QUEUE);
  queue.clear();
  queue
    .getRange(1, 1, 1, 8)
    .setValues([[
      "Cliente",
      "Telefono",
      "Responsable",
      "Estado",
      "Score",
      "DiasAbiertos",
      "MensajeSugerido",
      "RefCotizacion",
    ]]);

  const ordered = rows
    .slice()
    .sort((a, b) => Number(b.score_prioridad || 0) - Number(a.score_prioridad || 0));

  const values = ordered.map((r) => [
    r.cliente,
    r.telefono,
    r.responsable || "SIN_ASIGNAR",
    r.estado_cotizacion,
    Number(r.score_prioridad || 0),
    Number(r.dias_abiertos || 0),
    buildFollowUpMessage_(r.cliente),
    r.ref_cotizacion || "",
  ]);
  if (values.length > 0) {
    queue.getRange(2, 1, values.length, 8).setValues(values);
  }

  queue.setFrozenRows(1);
  queue.getRange("A1:H1").setBackground("#111827").setFontColor("#ffffff").setFontWeight("bold");
  queue.autoResizeColumns(1, 8);

  SpreadsheetApp.getUi().alert("Follow-up queue generada: " + values.length + " filas.");
}

function getNotificationEmail_() {
  const email = PropertiesService.getScriptProperties().getProperty(NOTIFICATION_EMAIL_PROP);
  if (!email || !isValidEmail_(email)) {
    throw new Error("Configura email de alertas desde el menu BMC Tracker.");
  }
  return email;
}

function isValidEmail_(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function buildFollowUpMessage_(name) {
  const safeName = String(name || "cliente").trim();
  return (
    "Hola " +
    safeName +
    ", te escribo por la cotizacion enviada. Quedo atento para ayudarte a avanzar o ajustar medidas/cantidades."
  );
}

function truncate_(value, maxLen) {
  const text = String(value || "");
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + "...";
}

function getTrackerRows_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < START_ROW) return [];

  const data = sheet.getRange(START_ROW, 1, lastRow - START_ROW + 1, HEADERS.length).getValues();
  return data
    .map((row) => ({
      fecha: row[0],
      cliente: String(row[1] || "").trim(),
      telefono: String(row[2] || "").trim(),
      origen: String(row[3] || "").trim(),
      pedido: String(row[4] || "").trim(),
      prioridad: String(row[11] || "").trim(),
      estado_cotizacion: String(row[12] || "").trim(),
      responsable: String(row[13] || "").trim(),
      proxima_accion: String(row[14] || "").trim(),
      ref_cotizacion: String(row[18] || "").trim(),
      dias_abiertos: row[27],
      vencido: String(row[28] || "").trim(),
      score_prioridad: row[29],
      resultado_final: String(row[31] || "").trim(),
    }))
    .filter((r) => Boolean(r.cliente));
}

function getOrCreateChildFolder_(parentFolder, folderName) {
  const existing = parentFolder.getFoldersByName(folderName);
  if (existing.hasNext()) {
    return existing.next();
  }
  return parentFolder.createFolder(folderName);
}

function formatMonthFolderName_(dateValue) {
  const monthNames = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre"
  ];
  const month = dateValue.getMonth();
  const monthNum = String(month + 1).padStart(2, "0");
  return monthNum + "-" + monthNames[month];
}

function formatDayFolderName_(dateValue) {
  const tz = Session.getScriptTimeZone() || "America/Montevideo";
  return Utilities.formatDate(dateValue, tz, "yyyy-MM-dd");
}

function coerceToDate_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value;
  }
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function slugifyClientName_(name) {
  const safe = String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
  return safe || "Cliente";
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
    .getRange(START_ROW, 19, MAX_ROWS - START_ROW + 1, 1)
    .setNumberFormat("@");
  sheet
    .getRange(START_ROW, 20, MAX_ROWS - START_ROW + 1, 1)
    .setNumberFormat("0");
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

function setupDashboardSheet(sheet) {
  sheet.clear();

  sheet.getRange("A1:H1").merge();
  sheet.getRange("A1").setValue("BMC Uruguay - Dashboard comercial");
  sheet.getRange("A2:H2").merge();
  sheet
    .getRange("A2")
    .setValue("KPIs minimos (BMC-006) conectados al Tracker");

  const kpiHeaders = [
    "Leads abiertos",
    "Alta prioridad abiertas",
    "Vencidos abiertos",
    "Pendientes de cotizacion"
  ];
  sheet.getRange(4, 1, 1, 4).setValues([kpiHeaders]);
  sheet
    .getRange(5, 1)
    .setFormula('=COUNTIFS(Tracker!AF2:AF,"Abierto",Tracker!B2:B,"<>")');
  sheet
    .getRange(5, 2)
    .setFormula(
      '=COUNTIFS(Tracker!L2:L,"Alta",Tracker!AF2:AF,"Abierto",Tracker!B2:B,"<>")'
    );
  sheet
    .getRange(5, 3)
    .setFormula(
      '=COUNTIFS(Tracker!AC2:AC,"Si",Tracker!AF2:AF,"Abierto",Tracker!B2:B,"<>")'
    );
  sheet
    .getRange(5, 4)
    .setFormula(
      '=COUNTIFS(Tracker!M2:M,"Borrador",Tracker!AF2:AF,"Abierto")+COUNTIFS(Tracker!M2:M,"Falta informacion",Tracker!AF2:AF,"Abierto")+COUNTIFS(Tracker!M2:M,"Calculada",Tracker!AF2:AF,"Abierto")+COUNTIFS(Tracker!M2:M,"Ajustando",Tracker!AF2:AF,"Abierto")'
    );

  sheet.getRange("A8:C8").setValues([["Responsable", "Abiertos", "Vencidos"]]);
  for (let i = 0; i < LISTS.responsable.length; i += 1) {
    const row = 9 + i;
    sheet.getRange(row, 1).setValue(LISTS.responsable[i]);
    sheet
      .getRange(row, 2)
      .setFormula(
        `=COUNTIFS(Tracker!N2:N,A${row},Tracker!AF2:AF,"Abierto",Tracker!B2:B,"<>")`
      );
    sheet
      .getRange(row, 3)
      .setFormula(
        `=COUNTIFS(Tracker!N2:N,A${row},Tracker!AC2:AC,"Si",Tracker!AF2:AF,"Abierto",Tracker!B2:B,"<>")`
      );
  }

  sheet.getRange("E8:F8").setValues([["Estado", "Cantidad"]]);
  for (let i = 0; i < LISTS.estado.length; i += 1) {
    const row = 9 + i;
    sheet.getRange(row, 5).setValue(LISTS.estado[i]);
    sheet
      .getRange(row, 6)
      .setFormula(`=COUNTIFS(Tracker!M2:M,E${row},Tracker!B2:B,"<>")`);
  }

  applyDashboardFormatting(sheet);
}

function applyDashboardFormatting(sheet) {
  sheet.setColumnWidth(1, 220);
  sheet.setColumnWidth(2, 160);
  sheet.setColumnWidth(3, 130);
  sheet.setColumnWidth(4, 210);
  sheet.setColumnWidth(5, 170);
  sheet.setColumnWidth(6, 120);
  sheet.setColumnWidth(7, 60);
  sheet.setColumnWidth(8, 60);

  sheet.getRange("A1:H1").setBackground("#111827").setFontColor("#ffffff");
  sheet.getRange("A1").setFontSize(13).setFontWeight("bold");
  sheet.getRange("A2:H2").setBackground("#f3f4f6").setFontColor("#111827");
  sheet.getRange("A2").setFontStyle("italic");

  sheet
    .getRange("A4:D4")
    .setBackground("#111827")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setHorizontalAlignment("center");
  sheet
    .getRange("A5:D5")
    .setBackground("#ecfeff")
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setNumberFormat("0");

  sheet
    .getRange("A8:C8")
    .setBackground("#111827")
    .setFontColor("#ffffff")
    .setFontWeight("bold");
  sheet
    .getRange("E8:F8")
    .setBackground("#111827")
    .setFontColor("#ffffff")
    .setFontWeight("bold");

  const respRows = LISTS.responsable.length;
  const stateRows = LISTS.estado.length;

  sheet
    .getRange(9, 1, respRows, 3)
    .setBorder(true, true, true, true, true, true, "#d1d5db", SpreadsheetApp.BorderStyle.SOLID);
  sheet
    .getRange(9, 5, stateRows, 2)
    .setBorder(true, true, true, true, true, true, "#d1d5db", SpreadsheetApp.BorderStyle.SOLID);

  sheet.getRange("A1:F25").setVerticalAlignment("middle");
  sheet.setFrozenRows(2);
}
