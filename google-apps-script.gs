// ============================================================
// REGISTRO ANESTESIA — Google Apps Script v5
// Soporta: insertar casos (action: 'insert') y eliminar (action: 'delete')
// AG: una sola columna "AG — Inducción" (incluye hipnóticos, opioides y relajantes).
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
  // AG (inducción incluye hipnóticos, opioides y relajantes)
  'AG — Inducción', 'AG — Mantenimiento', 'AG — Reversores',
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
  return respuesta({ status: 'API activa — Registro Anestesia v5' });
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
    // Forzar columna A (Nº Caso) como texto para preservar ceros iniciales (001, 002…)
    sheet.getRange('A:A').setNumberFormat('@');
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
    // AG (inducción combina todo lo enviado en induccion/opioides/relajantes)
    [d.induccion, d.opioides, d.relajantes].filter(Boolean).join('; '),
    d.mantenimiento || '', d.reversores || '',
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

  // Normaliza ambos lados para comparar: "001" == 1 == "1"
  function norm(v) {
    var s = String(v).trim();
    return /^\d+$/.test(s) ? String(parseInt(s, 10)) : s;
  }
  var buscado = norm(numCaso);

  for (var i = lastRow; i >= 2; i--) {
    if (norm(sheet.getRange(i, 1).getValue()) === buscado) {
      sheet.deleteRow(i);
      return respuesta({ ok: true, eliminado: numCaso, fila: i });
    }
  }
  return respuesta({ ok: false, error: 'Caso ' + numCaso + ' no encontrado' });
}

// ── MIGRACIÓN (ejecutar UNA VEZ desde el editor) ──────────
// Combina las columnas "AG — Inducción", "AG — Opioides" y "AG — Relajantes"
// en una sola columna "AG — Inducción" y elimina las otras dos.
function migrarAG() {
  var sheet = getSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 1) {
    SpreadsheetApp.getUi().alert('La hoja está vacía. No hay nada que migrar.');
    return;
  }

  // 1. Localiza columnas por su cabecera
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var idxInduccion  = headers.indexOf('AG — Inducción')   + 1;
  var idxOpioides   = headers.indexOf('AG — Opioides')    + 1;
  var idxRelajantes = headers.indexOf('AG — Relajantes')  + 1;

  if (!idxInduccion) {
    SpreadsheetApp.getUi().alert('No se encuentra la columna "AG — Inducción". Revisa la cabecera.');
    return;
  }
  if (!idxOpioides && !idxRelajantes) {
    SpreadsheetApp.getUi().alert('Las columnas "AG — Opioides" y "AG — Relajantes" ya no existen. Migración no necesaria.');
    return;
  }

  // 2. Para cada fila de datos, combina los 3 valores en la columna Inducción
  if (lastRow >= 2) {
    for (var r = 2; r <= lastRow; r++) {
      var ind = idxInduccion ? String(sheet.getRange(r, idxInduccion).getValue() || '').trim() : '';
      var opi = idxOpioides  ? String(sheet.getRange(r, idxOpioides).getValue()  || '').trim() : '';
      var rel = idxRelajantes? String(sheet.getRange(r, idxRelajantes).getValue()|| '').trim() : '';

      var combinado = [ind, opi, rel].filter(function(x){ return x; }).join('; ');
      sheet.getRange(r, idxInduccion).setValue(combinado);
    }
  }

  // 3. Elimina las columnas, empezando por la de mayor índice para no descuadrar
  var aEliminar = [];
  if (idxRelajantes) aEliminar.push(idxRelajantes);
  if (idxOpioides)   aEliminar.push(idxOpioides);
  aEliminar.sort(function(a, b){ return b - a; }); // descendente

  aEliminar.forEach(function(idx){
    sheet.deleteColumn(idx);
  });

  SpreadsheetApp.getUi().alert(
    '✓ Migración completada\n\n' +
    '• ' + (lastRow - 1) + ' fila(s) procesada(s)\n' +
    '• Columnas eliminadas: ' + aEliminar.length + '\n\n' +
    'Ya puedes desplegar el script como nueva versión.'
  );
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
