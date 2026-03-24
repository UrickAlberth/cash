/**
 * Returns the Google Spreadsheet (uses the active spreadsheet by default).
 * Override SPREADSHEET_ID with your own spreadsheet ID if needed.
 */
var SPREADSHEET_ID = '';

function getSheet(sheetName) {
  var ss = SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(sheetName) || ss.getSheets()[0];
}

/**
 * Returns the next available row index (1-based) for appending data.
 * Uses getLastRow() for efficiency instead of loading the entire data range.
 */
function getNextEmptyRow(sheet) {
  return sheet.getLastRow() + 1;
}

/**
 * Validates a transaction payload.  Throws an Error if required fields are missing.
 * @param {Object} payload
 */
function validatePayload(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('Payload inválido.');
  if (!payload.description || String(payload.description).trim() === '') throw new Error('Descrição obrigatória.');
  if (!payload.date || String(payload.date).trim() === '') throw new Error('Data obrigatória.');
  if (isNaN(Number(payload.value)) || Number(payload.value) <= 0) throw new Error('Valor inválido.');
}

/**
 * Returns a Date clamped to the last day of the target month when the
 * original day exceeds the month length (e.g., Jan 31 + 1 month → Feb 28).
 */
function addMonths(baseDate, monthsToAdd) {
  var d = new Date(baseDate.getFullYear(), baseDate.getMonth() + monthsToAdd, 1);
  var lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(baseDate.getDate(), lastDay));
  return d;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fast-response functions – called from the client, return immediately.
// The actual sheet writing is triggered by a subsequent fire-and-forget call.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Accepts a debit payload from the client and returns {ok: true} immediately
 * so the UI can update without waiting for the spreadsheet write.
 *
 * @param {Object} payload - { description, value, date, category, months }
 * @returns {{ ok: boolean }}
 */
function addDebit(payload) {
  validatePayload(payload);
  return { ok: true };
}

/**
 * Accepts a credit payload from the client and returns {ok: true} immediately
 * so the UI can update without waiting for the spreadsheet write.
 *
 * @param {Object} payload - { description, value, date, category, months }
 * @returns {{ ok: boolean }}
 */
function addCredit(payload) {
  validatePayload(payload);
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Background sheet-writing functions – called fire-and-forget from the client.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Writes one or more debit entries to the "Débitos" sheet.
 * Supports multi-month recurring entries via payload.months.
 *
 * @param {Object} payload - { description, value, date, category, months }
 */
function saveDebitToSheet(payload) {
  var sheet = getSheet('Débitos');
  var months = payload.months && payload.months > 1 ? payload.months : 1;
  var baseDate = new Date(payload.date);

  for (var i = 0; i < months; i++) {
    var entryDate = addMonths(baseDate, i);
    var row = getNextEmptyRow(sheet);
    sheet.getRange(row, 1, 1, 5).setValues([[
      Utilities.formatDate(entryDate, Session.getScriptTimeZone(), 'dd/MM/yyyy'),
      payload.description,
      payload.category || '',
      Number(payload.value),
      months > 1 ? (i + 1) + '/' + months : ''
    ]]);
  }
}

/**
 * Writes one or more credit entries to the "Créditos" sheet.
 * Supports multi-month recurring entries via payload.months.
 *
 * @param {Object} payload - { description, value, date, category, months }
 */
function saveCreditToSheet(payload) {
  var sheet = getSheet('Créditos');
  var months = payload.months && payload.months > 1 ? payload.months : 1;
  var baseDate = new Date(payload.date);

  for (var i = 0; i < months; i++) {
    var entryDate = addMonths(baseDate, i);
    var row = getNextEmptyRow(sheet);
    sheet.getRange(row, 1, 1, 5).setValues([[
      Utilities.formatDate(entryDate, Session.getScriptTimeZone(), 'dd/MM/yyyy'),
      payload.description,
      payload.category || '',
      Number(payload.value),
      months > 1 ? (i + 1) + '/' + months : ''
    ]]);
  }
}

/**
 * Entry point for GET requests (serves the web-app HTML).
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('RosaCash – Lançamentos')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
