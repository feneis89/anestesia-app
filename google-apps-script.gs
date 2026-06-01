// ============================================================
// REGISTRO ANESTESIA — Google Apps Script v4
// Soporta: insertar casos (action: 'insert') y eliminar (action: 'delete')
// Cada técnica regional va a su propia columna para análisis.
// ============================================================

const SHEET_NAME = 'Registros';

const HEADERS = [
  // General
  'Nº Caso', 'Fecha', 'Hora inicio', 'Hora fin', 'Duración (min)',
  // Paciente
  'Edad', 'Sexo', 'Peso (kg)', 'Talla (cm)', 'IMC', 'ASA',
  'Antecedentes', 'Alergias', 'Medicación especial / Dispositivos',
  // Intervención
  'Especialidad', 'Procedimiento', 'Urgencia', 'Posición',
  // Anestesia
  'Tipo anestesia',
  // AG
  'AG — Inducción', 'AG — Opioides', 'AG — Relajantes', 'AG — Mantenimiento', 'AG — Reversores',
  // Espinal
  'Espinal — Nivel', 'Espinal — Aguja', 'Espinal — Posición', 'Espinal — Fármacos',
  // Epidural
  'Epidural — Nivel', 'Epidural — Aguja', 'Epidural — Catéter', 'Epidural — Test dosis', 'Epidural — Fármacos',
  // Bloqueo 1
  'Bloqueo 1 — Nervio', 'Bloqueo 1 — Técnica', 'Bloqueo 1 — Catéter', 'Bloqueo 1 — Fármacos',
  // Bloqueo 2
  'Bloqueo 2 — Nervio', 'Bloqueo 2 — Técnica', 'Bloqueo 2 — Catéter', 'Bloqueo 2 — Fármacos',
  // Sedación
  'Sedación — Nivel', 'Sedación — Fármacos',
  // Otros
  'Analgesia & Coadyuvantes', 'Vasoactivos',
  // Vía aérea
  'Dispositivo vía aérea', 'Técnica intubación', 'Intentos', 'Cormack-Lehane', 'VAD',
  // Monitorización
  'Monitorización especial',
  // Evolución
  'Complicaciones', 'Destino', 'Rescates analgésicos postop.', 'Notas'
];

// ── ROUTER ────────────────────────────────────────────────
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.action === 'delete') return eliminarCaso(data.numCaso);
    return insertarCaso(data);
  } catch (err) {
    return respuesta({ ok: false, error: err.toString() });
  }
}

function doGet(e) {
  return respuesta({ status: 'API activa — Registro Anestesia v4' });
}

// ── INSERT ────────────────────────────────────────────────
function insertarCaso(d) {
  var sheet = getSheet();

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    var hr = sheet.getRange(1, 1, 1, HEADERS.length);
    hr.setFontWeight('bold').setBackground('#0f3460').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 60);
  }

  // Helper para convertir booleanos del JS a "Sí" / ""
  var si = function(b) { return b ? 'Sí' : ''; };

  sheet.appendRow([
    // General
    d.numCaso || '', d.fecha || '', d.horaInicio || '', d.horaFin || '', d.duracion || '',
    // Paciente
    d.edad || '', d.sexo || '', d.peso || '', d.talla || '', d.imc || '', d.asa || '',
    d.antecedentes || '', d.alergias || '', d.medicacion || '',
    // Intervención
    d.especialidad || '', d.procedimiento || '', d.urgencia || '', d.posicion || '',
    // Anestesia
    d.tipoAnestesia || '',
    // AG
    d.induccion || '', d.opioides || '', d.relajantes || '', d.mantenimiento || '', d.reversores || '',
    // Espinal
    d.espinalNivel || '', d.espinalAguja || '', d.espinalPos || '', d._espinalDrugs || '',
    // Epidural
    d.epiduralNivel || '', d.epiduralAguja || '', si(d.epiduralCateter), si(d.epiduralTest), d._epiduralDrugs || '',
    // Bloqueo 1
    d.bloqueoNervio || '', d.bloqueoTecnica || '', si(d.bloqueoCateter), d._bloqueoDrugs || '',
    // Bloqueo 2
    d.bloqueo2Nervio || '', d.bloqueo2Tecnica || '', si(d.bloqueo2Cateter), d._bloqueo2Drugs || '',
    // Sedación
    d.sedacionNivel || '', d.sedacion || '',
    // Otros
    d.analgesia || '', d.vasoactivos || '',
    // Vía aérea
    d.dispositivoVia || '', d.tecnicaIntubacion || '', d.intentos || '', d.cormack || '', d.vad || '',
    // Monitorización
    d.monitorizacion || '',
    // Evolución
    d.complicaciones || '', d.destino || '', d.rescates || '', d.notas || ''
  ]);

  return respuesta({ ok: true, fila: sheet.getLastRow() });
}

// ── DELETE ────────────────────────────────────────────────
function eliminarCaso(numCaso) {
  if (!numCaso) return respuesta({ ok: false, error: 'numCaso no proporcionado' });

  var sheet = getSheet();
  var lastRow = sheet.getLastRow();

  for (var i = lastRow; i >= 2; i--) {
    var celda = String(sheet.getRange(i, 1).getValue()).trim();
    if (celda === String(numCaso).trim()) {
      sheet.deleteRow(i);
      return respuesta({ ok: true, eliminado: numCaso, fila: i });
    }
  }
  return respuesta({ ok: false, error: 'Caso ' + numCaso + ' no encontrado' });
}

// ── HELPERS ───────────────────────────────────────────────
function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
}

function respuesta(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
