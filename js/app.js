// ── GLOBAL STATE ──────────────────────────────────────────
let editingIndex = null; // null = new case, number = index in anestesia_cases

// ── INIT ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initAccordions();
  initTechniques();
  initDrugCheckboxes();
  initAirwayConditionals();
  initNamc();
  initCalcs();
  initNumericKeyboards();
  initCaseList();

  document.getElementById('btn-nuevo-caso').addEventListener('click', handleNuevoCaso);
  document.getElementById('btn-back').addEventListener('click', handleBack);
  document.getElementById('btn-registrar').addEventListener('click', handleSubmit);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
});

// ── SCREEN NAVIGATION ─────────────────────────────────────
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('screen-visible'));
  document.getElementById('screen-' + name).classList.add('screen-visible');
}

function handleBack() {
  editingIndex = null;
  document.getElementById('btn-registrar').textContent = '✓ Registrar caso';
  showScreen('home');
  renderCaseList(document.getElementById('case-search')?.value || '');
  checkPending();
}

// ── TABS ──────────────────────────────────────────────────
function initTabs() {
  initTabGroup('home-nav', 'home-main', tab => {
    if (tab === 'lista') renderCaseList(document.getElementById('case-search')?.value || '');
    if (tab === 'stats') renderStats();
  });
  initTabGroup('form-nav', 'form-main');
}

function initTabGroup(navId, mainId, onSwitch) {
  const nav  = document.getElementById(navId);
  const main = document.getElementById(mainId);
  if (!nav || !main) return;
  nav.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      nav.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      main.querySelectorAll(':scope > .tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      main.querySelector('#tab-' + btn.dataset.tab)?.classList.add('active');
      onSwitch?.(btn.dataset.tab);
    });
  });
}

// ── ACCORDIONS ────────────────────────────────────────────
function initAccordions() {
  document.querySelectorAll('.card-header.collapsible').forEach(h => {
    h.addEventListener('click', () => h.closest('.card').classList.toggle('collapsed'));
  });
}

// ── TECHNIQUE TOGGLES ────────────────────────────────────
function initTechniques() {
  document.querySelectorAll('.technique-toggle-cb').forEach(cb => {
    cb.addEventListener('change', function () {
      this.closest('.technique-card').classList.toggle('active', this.checked);
    });
  });
}

// ── DRUG CHECKBOXES ───────────────────────────────────────
function initDrugCheckboxes() {
  document.querySelectorAll('.drug-item input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', function () {
      const dose = this.closest('.drug-item').querySelector('.drug-dose');
      if (dose) { dose.hidden = !this.checked; if (this.checked) dose.focus(); }
    });
  });
}

// ── AIRWAY CONDITIONALS ───────────────────────────────────
function initAirwayConditionals() {
  document.getElementById('dispositivo-via')?.addEventListener('change', function () {
    const needs = ['TOT oral','TOT nasal','Tubo doble luz','Awake FOI','Traqueotomía'].includes(this.value);
    document.querySelectorAll('.intubation-conditional').forEach(el => el.classList.toggle('visible', needs));
  });
}

// ── NAMC ──────────────────────────────────────────────────
function initNamc() {
  document.getElementById('namc-check')?.addEventListener('change', function () {
    const a = document.getElementById('alergias');
    if (!a) return;
    a.disabled = this.checked;
    a.value = '';
    a.placeholder = this.checked ? 'NAMC' : 'Látex, penicilina, AINEs, contrastes…';
  });
}

// ── NUMERIC KEYBOARDS (móvil) ─────────────────────────────
// Hace que los campos de dosis y números abran el teclado decimal
// en lugar del teclado de texto en móviles.
function initNumericKeyboards() {
  // Todas las dosis de fármacos (input type="text" pero solo números)
  document.querySelectorAll('.drug-dose').forEach(el => el.setAttribute('inputmode', 'decimal'));
  // Campos numéricos clásicos — refuerza el comportamiento en iOS
  ['edad', 'peso', 'talla'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.setAttribute('inputmode', 'decimal');
  });
}

// ── CALCULATIONS ──────────────────────────────────────────
function initCalcs() {
  const peso = document.getElementById('peso');
  const talla = document.getElementById('talla');
  const imc = document.getElementById('imc');
  const hi = document.getElementById('hora-inicio');
  const hf = document.getElementById('hora-fin');
  const dur = document.getElementById('duracion');

  const calcIMC = () => {
    const p = parseFloat(peso?.value), t = parseFloat(talla?.value) / 100;
    if (imc) imc.value = (p && t) ? (p / (t * t)).toFixed(1) : '';
  };
  const calcDur = () => {
    if (hi?.value && hf?.value) {
      const [h1,m1] = hi.value.split(':').map(Number);
      const [h2,m2] = hf.value.split(':').map(Number);
      let m = (h2*60+m2) - (h1*60+m1);
      if (dur) dur.value = (m < 0 ? m + 1440 : m) + ' min';
    } else if (dur) { dur.value = ''; }
  };
  peso?.addEventListener('input', calcIMC);
  talla?.addEventListener('input', calcIMC);
  hi?.addEventListener('change', calcDur);
  hf?.addEventListener('change', calcDur);
}

// ── CASE LIST INIT ────────────────────────────────────────
function initCaseList() {
  renderCaseList();
  checkPending();

  // Search
  document.getElementById('case-search')?.addEventListener('input', function () {
    renderCaseList(this.value);
  });

  // Edit / Delete via event delegation
  document.getElementById('case-list')?.addEventListener('click', e => {
    const editBtn   = e.target.closest('.case-btn-edit');
    const deleteBtn = e.target.closest('.case-btn-delete');
    if (editBtn)   handleEditCase(parseInt(editBtn.dataset.idx));
    if (deleteBtn) handleDeleteCase(parseInt(deleteBtn.dataset.idx));
  });
}

// ── CASE LIST RENDER ──────────────────────────────────────
function renderCaseList(filter = '') {
  const allCases = getAllCases();
  // Pair with original index, then reverse (newest first)
  const withIdx = allCases.map((c, i) => ({ c, origIdx: i })).reverse();
  const q = filter.toLowerCase().trim();
  const filtered = q ? withIdx.filter(({ c }) => {
    const d = c.data;
    return [d.procedimiento, d.especialidad, d.tipoAnestesia, d.numCaso, d.asa]
      .some(v => (v || '').toLowerCase().includes(q));
  }) : withIdx;

  const el = document.getElementById('case-list');
  if (!el) return;

  if (!allCases.length) {
    el.innerHTML = `<div class="list-empty">
      <div class="list-empty-icon">📋</div>
      <div>Sin casos registrados aún</div>
      <div class="text-muted" style="font-size:13px;margin-top:6px">Pulsa "＋ Registrar nuevo caso"</div>
    </div>`;
    return;
  }
  if (!filtered.length) {
    el.innerHTML = `<div class="list-empty">
      <div class="list-empty-icon">🔍</div>
      <div>Sin resultados para "<em>${filter}</em>"</div>
    </div>`;
    return;
  }

  const espMap = {
    'Cirugía General y Digestivo':'CG','Traumatología y C.O.T.':'COT',
    'Ginecología y Obstetricia':'Gin.','Urología':'Uro.','ORL':'ORL',
    'Neurocirugía':'Neuro.','Cirugía Cardíaca':'Cardíaca','Cirugía Vascular':'Vascular',
    'Cirugía Torácica':'Torácica','Cirugía Maxilofacial':'Maxilo.',
    'Oftalmología':'Oftalmo.','Cirugía Plástica y Reparadora':'Plástica',
    'Cirugía Pediátrica':'Pediátrica','Endoscopia Digestiva':'Endoscopia',
    'Radiología Intervencionista':'RVI','Cardiología Intervencionista':'Cardio.I.',
    'Unidad de Dolor':'Dolor'
  };
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const fmtDate = s => { if (!s) return ''; const [,m,d] = s.split('-'); return `${+d} ${months[+m-1]}`; };

  el.innerHTML = filtered.map(({ c, origIdx }) => {
    const d = c.data;
    const tecnica   = (d.tipoAnestesia || '').split(',')[0].trim();
    const compl     = (d.complicaciones || '').trim();
    const hasCompl  = compl && compl !== 'Sin complicaciones';
    const firstCompl = hasCompl ? compl.split(',')[0].trim() : '';
    const meta = [
      fmtDate(d.fecha),
      espMap[d.especialidad] || d.especialidad,
      tecnica,
      d.asa ? 'ASA ' + d.asa : '',
      d.duracion
    ].filter(Boolean).join(' · ');

    return `<div class="case-item">
      <div class="case-num">#${d.numCaso || '—'}</div>
      <div class="case-info">
        <div class="case-procedure">${d.procedimiento || '—'}</div>
        <div class="case-meta">${meta}</div>
      </div>
      ${hasCompl ? `<span class="case-badge-danger">${firstCompl}</span>` : ''}
      <div class="case-actions">
        <button class="case-btn case-btn-edit"   data-idx="${origIdx}" title="Editar">✏️</button>
        <button class="case-btn case-btn-delete" data-idx="${origIdx}" title="Eliminar">🗑️</button>
      </div>
    </div>`;
  }).join('');
}

// ── EDIT CASE ─────────────────────────────────────────────
function handleEditCase(origIdx) {
  const cases = getAllCases();
  const c = cases[origIdx];
  if (!c) return;

  editingIndex = origIdx;
  resetForm();
  fillForm(c.data);

  const btn = document.getElementById('btn-registrar');
  if (btn) btn.textContent = '✏️ Guardar cambios';

  showScreen('form');
  document.querySelector('#form-nav .tab-btn')?.click();
}

// ── DELETE CASE ───────────────────────────────────────────
function handleDeleteCase(origIdx) {
  const cases = getAllCases();
  const c = cases[origIdx];
  if (!c) return;

  const proc     = c.data.procedimiento || 'sin procedimiento';
  const numCaso  = c.data.numCaso;
  const tieneURL = !!CONFIG.SHEETS_URL;

  const msg = tieneURL
    ? `¿Eliminar el caso #${numCaso} (${proc})?\n\nSe borrará del móvil y también de Google Sheets.`
    : `¿Eliminar el caso #${numCaso} (${proc})?\n\nSolo se borrará del móvil (no hay URL de Sheets configurada).`;

  if (!confirm(msg)) return;

  // 1 — Borrar localmente
  cases.splice(origIdx, 1);
  localStorage.setItem('anestesia_cases', JSON.stringify(cases));
  renderCaseList(document.getElementById('case-search')?.value || '');

  // 2 — Borrar de Google Sheets (si hay URL configurada)
  if (tieneURL && numCaso) {
    fetch(CONFIG.SHEETS_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'delete', numCaso }),
    }).catch(() => {});
    showToast(`Caso #${numCaso} eliminado`, 'success');
  } else {
    showToast('Caso eliminado del móvil', '');
  }
}

// ── FILL FORM (para edición) ──────────────────────────────
function fillForm(data) {
  const setVal  = (id, val)   => { const el = document.getElementById(id); if (el && val != null && val !== '') el.value = val; };
  const setRadio = (name, val) => {
    if (!val) return;
    const el = document.querySelector(`input[name="${name}"][value="${CSS.escape ? CSS.escape(val) : val}"]`);
    // CSS.escape may not work; try brute force
    document.querySelectorAll(`input[name="${name}"]`).forEach(r => { if (r.value === val) r.checked = true; });
  };
  const setChecks = (selector, csvStr) => {
    if (!csvStr) return;
    const vals = csvStr.split(', ').map(v => v.trim());
    document.querySelectorAll(selector).forEach(cb => { if (vals.includes(cb.value)) cb.checked = true; });
  };

  // ─ Datos generales
  setVal('fecha',      data.fecha);
  setVal('hora-inicio', data.horaInicio);
  setVal('hora-fin',   data.horaFin);

  // ─ Paciente
  setVal('edad',   data.edad);
  setVal('peso',   data.peso);
  setVal('talla',  data.talla);
  setRadio('sexo', data.sexo);
  setRadio('asa',  data.asa);

  // Antecedentes checkboxes + otros
  const antecParts = (data.antecedentes || '').split(' | ');
  setChecks('.antec-check', antecParts[0]);
  setVal('antec-otros', data.antecOtros || antecParts[1] || '');

  // Alergias / NAMC
  if (data.alergias === 'NAMC') {
    const namc = document.getElementById('namc-check');
    if (namc) { namc.checked = true; namc.dispatchEvent(new Event('change')); }
  } else {
    setVal('alergias', data.alergias);
  }

  // Medicación & dispositivos
  const medicParts = (data.medicacion || '').split(' | ');
  setChecks('.medic-check', medicParts[0]);
  setVal('medic-otros', data.medicOtros || medicParts[1] || '');

  // ─ Intervención
  setVal('especialidad',  data.especialidad);
  setVal('procedimiento', data.procedimiento);
  setVal('urgencia',      data.urgencia);
  setVal('posicion',      data.posicion);

  // ─ Técnica toggles
  const tecnicas = (data.tipoAnestesia || '').split(', ').map(t => t.trim());
  [
    ['toggle-general',  'Anestesia General'],
    ['toggle-espinal',  'Anestesia Espinal'],
    ['toggle-epidural', 'Anestesia Epidural'],
    ['toggle-bloqueo',  'Bloqueo periférico/pared'],
    ['toggle-bloqueo2', 'Bloqueo periférico/pared 2'],
    ['toggle-sedacion', 'Sedación'],
  ].forEach(([id, kw]) => {
    if (tecnicas.some(t => t === kw || t.startsWith(kw))) {
      const cb = document.getElementById(id);
      if (cb) { cb.checked = true; cb.closest('.technique-card').classList.add('active'); }
    }
  });

  // ─ AG drugs (inducción ahora incluye opioides y relajantes — para casos viejos
  //   también buscamos en la sección unificada)
  fillDrugs(data.induccion,     'ag-induccion');
  fillDrugs(data.opioides,      'ag-induccion');
  fillDrugs(data.relajantes,    'ag-induccion');
  fillDrugs(data.mantenimiento, 'ag-mantenimiento');
  fillDrugs(data.reversores,    'ag-reversores');

  // ─ Espinal
  setVal('espinal-nivel', data.espinalNivel);
  setVal('espinal-aguja', data.espinalAguja);
  setRadio('espinal-posicion', data.espinalPos);
  fillDrugs(data._espinalDrugs, 'espinal-farmacos');

  // ─ Epidural
  setVal('epidural-nivel', data.epiduralNivel);
  setVal('epidural-aguja', data.epiduralAguja);
  if (data.epiduralCateter) document.getElementById('epidural-cateter')?.setAttribute('checked', true) || (document.getElementById('epidural-cateter') && (document.getElementById('epidural-cateter').checked = true));
  if (data.epiduralTest)    { const el = document.getElementById('epidural-test');    if (el) el.checked = true; }
  fillDrugs(data._epiduralDrugs, 'epidural-farmacos');

  // ─ Bloqueo 1
  setVal('bloqueo-nervio', data.bloqueoNervio);
  setRadio('bloqueo-tecnica', data.bloqueoTecnica);
  if (data.bloqueoCateter) { const el = document.getElementById('bloqueo-cateter'); if (el) el.checked = true; }
  fillDrugs(data._bloqueoDrugs, 'bloqueo-farmacos');

  // ─ Bloqueo 2
  setVal('bloqueo2-nervio', data.bloqueo2Nervio);
  setRadio('bloqueo2-tecnica', data.bloqueo2Tecnica);
  if (data.bloqueo2Cateter) { const el = document.getElementById('bloqueo2-cateter'); if (el) el.checked = true; }
  fillDrugs(data._bloqueo2Drugs, 'bloqueo2-farmacos');

  // ─ Sedación
  setRadio('sedacion-nivel', data.sedacionNivel);
  fillDrugs(data.sedacion,   'sedacion-farmacos');

  // ─ Analgesia / Vasoactivos
  fillDrugs(data.analgesia,   'otros-analgesia');
  fillDrugs(data.vasoactivos, 'otros-vasoactivos');

  // ─ Vía aérea
  setVal('dispositivo-via',     data.dispositivoVia);
  setVal('tecnica-intubacion',  data.tecnicaIntubacion);
  setRadio('intentos', data.intentos);
  setRadio('cormack',  data.cormack);
  setChecks('input[name="vad"]', data.vad);
  // Trigger airway conditional visibility
  if (['TOT oral','TOT nasal','Tubo doble luz','Awake FOI','Traqueotomía'].includes(data.dispositivoVia)) {
    document.querySelectorAll('.intubation-conditional').forEach(el => el.classList.add('visible'));
  }

  // ─ Monitorización
  setChecks('.monit-check', data.monitorizacion);

  // ─ Complicaciones
  setChecks('.comp-check', data.complicaciones);

  // ─ Destino / Rescates / Notas
  setRadio('destino', data.destino);
  fillDrugs(data.rescates, 'rescates-farmacos');
  setVal('notas', data.notas);

  // Recalculate IMC
  document.getElementById('peso')?.dispatchEvent(new Event('input'));
}

// ── FILL DRUGS helper ─────────────────────────────────────
// Matches "DrugName dose" entries from a semicolon-separated string
// to checkboxes in a drug group, longest label first to avoid prefix issues.
function fillDrugs(drugStr, groupClass) {
  if (!drugStr) return;
  const entries = drugStr.split('; ').map(e => e.trim()).filter(Boolean);
  if (!entries.length) return;

  // Sort items longest label first to avoid "Propofol" matching "Propofol TIVA"
  const items = Array.from(document.querySelectorAll(`.${groupClass} .drug-item`))
    .map(item => ({ item, label: item.querySelector('label')?.textContent?.trim() || '' }))
    .sort((a, b) => b.label.length - a.label.length);

  entries.forEach(entry => {
    for (const { item, label } of items) {
      if (!label) continue;
      if (entry === label || entry.startsWith(label + ' ')) {
        const cb = item.querySelector('input[type="checkbox"]');
        const di = item.querySelector('.drug-dose');
        if (cb) cb.checked = true;
        if (di) { di.value = entry.slice(label.length).trim(); di.hidden = false; }
        break;
      }
    }
  });
}

// ── NEW CASE ──────────────────────────────────────────────
function handleNuevoCaso() {
  const hasData = document.getElementById('edad')?.value
    || document.getElementById('procedimiento')?.value;
  if (hasData && !confirm('Hay un caso en progreso. ¿Empezar uno nuevo?')) {
    showScreen('form');
    return;
  }
  editingIndex = null;
  document.getElementById('btn-registrar').textContent = '✓ Registrar caso';
  resetForm();
  updateCaseDisplay();
  showScreen('form');
  document.querySelector('#form-nav .tab-btn')?.click();
}

function resetForm() {
  document.querySelectorAll('#form-main input:not([type="radio"]):not([type="checkbox"]):not([readonly]), #form-main select, #form-main textarea')
    .forEach(el => { el.value = ''; });
  document.querySelectorAll('#form-main input[type="radio"], #form-main input[type="checkbox"]')
    .forEach(el => { el.checked = false; });
  document.querySelectorAll('#form-main .drug-dose').forEach(el => { el.hidden = true; el.value = ''; });
  document.querySelectorAll('#form-main .technique-toggle-cb').forEach(cb => {
    cb.closest('.technique-card').classList.remove('active');
  });
  document.querySelectorAll('#form-main .intubation-conditional').forEach(el => el.classList.remove('visible'));

  const a = document.getElementById('alergias');
  if (a) { a.disabled = false; a.placeholder = 'Látex, penicilina, AINEs, contrastes…'; }

  const now = new Date();
  const f = document.getElementById('fecha');
  const h = document.getElementById('hora-inicio');
  if (f) f.value = now.toISOString().slice(0, 10);
  if (h) h.value = now.toTimeString().slice(0, 5);
}

function updateCaseDisplay() {
  const num = parseInt(localStorage.getItem('anestesia_case_count') || '0') + 1;
  const badge = document.getElementById('case-number');
  if (badge) badge.textContent = '#' + String(num).padStart(3, '0');
}

// ── DATA COLLECTION ───────────────────────────────────────
const get    = id   => document.getElementById(id)?.value?.trim() || '';
const radio  = name => { let v=''; document.querySelectorAll(`input[name="${name}"]`).forEach(r => { if(r.checked) v=r.value; }); return v; };
const checks = name => Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(c => c.value).join(', ');

function drugs(groupClass) {
  return Array.from(document.querySelectorAll(`.${groupClass} .drug-item`))
    .filter(item => item.querySelector('input[type="checkbox"]')?.checked)
    .map(item => {
      const name = item.querySelector('label')?.textContent?.trim() || '';
      const dose = item.querySelector('.drug-dose')?.value?.trim() || '';
      return dose ? `${name} ${dose}` : name;
    }).join('; ');
}

function collectRegional() {
  const parts = [];
  const addBloqueo = (id, nervioId, tecnicaName, cateterId, farmacosClass, label) => {
    if (!document.getElementById(id)?.checked) return;
    const nervio  = get(nervioId);
    const tecnica = radio(tecnicaName);
    const cateter = document.getElementById(cateterId)?.checked ? 'con catéter' : '';
    const farmacos = drugs(farmacosClass);
    let s = label;
    const det = [nervio, tecnica, cateter].filter(Boolean).join(', ');
    if (det) s += ` (${det})`; if (farmacos) s += `: ${farmacos}`;
    parts.push(s);
  };

  if (document.getElementById('toggle-espinal')?.checked) {
    const nivel = get('espinal-nivel'), aguja = get('espinal-aguja');
    const pos = radio('espinal-posicion'), farmacos = drugs('espinal-farmacos');
    let s = 'Espinal';
    const det = [nivel, aguja, pos].filter(Boolean).join(', ');
    if (det) s += ` (${det})`; if (farmacos) s += `: ${farmacos}`;
    parts.push(s);
  }
  if (document.getElementById('toggle-epidural')?.checked) {
    const nivel = get('epidural-nivel'), aguja = get('epidural-aguja');
    const cat  = document.getElementById('epidural-cateter')?.checked ? 'con catéter' : '';
    const test = document.getElementById('epidural-test')?.checked ? 'test dosis +' : '';
    const farmacos = drugs('epidural-farmacos');
    let s = 'Epidural';
    const det = [nivel, aguja, cat, test].filter(Boolean).join(', ');
    if (det) s += ` (${det})`; if (farmacos) s += `: ${farmacos}`;
    parts.push(s);
  }
  addBloqueo('toggle-bloqueo',  'bloqueo-nervio',  'bloqueo-tecnica',  'bloqueo-cateter',  'bloqueo-farmacos',  'Bloqueo 1');
  addBloqueo('toggle-bloqueo2', 'bloqueo2-nervio', 'bloqueo2-tecnica', 'bloqueo2-cateter', 'bloqueo2-farmacos', 'Bloqueo 2');
  return parts.join(' | ');
}

function collectData() {
  const tipoAnestesia = Array.from(document.querySelectorAll('.technique-toggle-cb:checked'))
    .map(cb => cb.id === 'toggle-sedacion'
      ? 'Sedación ' + (radio('sedacion-nivel') || '')
      : cb.value)
    .filter(Boolean).join(', ');

  const caseNum = editingIndex !== null
    ? (getAllCases()[editingIndex]?.data?.numCaso || '—')
    : String(parseInt(localStorage.getItem('anestesia_case_count') || '0') + 1).padStart(3, '0');

  return {
    numCaso: caseNum,
    fecha: get('fecha'), horaInicio: get('hora-inicio'),
    horaFin: get('hora-fin'), duracion: get('duracion'),
    edad: get('edad'), sexo: radio('sexo'),
    peso: get('peso'), talla: get('talla'), imc: get('imc'),
    asa: radio('asa'),
    antecedentes: (() => {
      const ch = Array.from(document.querySelectorAll('.antec-check:checked')).map(c => c.value).join(', ');
      const ot = get('antec-otros');
      return [ch, ot].filter(Boolean).join(' | ');
    })(),
    antecOtros: get('antec-otros'),
    alergias: document.getElementById('namc-check')?.checked ? 'NAMC' : get('alergias'),
    medicacion: (() => {
      const ch = Array.from(document.querySelectorAll('.medic-check:checked')).map(c => c.value).join(', ');
      const ot = get('medic-otros');
      return [ch, ot].filter(Boolean).join(' | ');
    })(),
    medicOtros: get('medic-otros'),
    especialidad: get('especialidad'), procedimiento: get('procedimiento'),
    urgencia: get('urgencia'), posicion: get('posicion'),
    tipoAnestesia,
    // AG drugs — opioides y relajantes ahora se recogen dentro de 'ag-induccion'
    induccion:     drugs('ag-induccion'),
    opioides:      '',
    relajantes:    '',
    mantenimiento: drugs('ag-mantenimiento'),
    reversores:    drugs('ag-reversores'),
    // Regional (combined text for Sheets)
    tecnicaRegional: collectRegional(),
    // Regional sub-fields for local edit restoration
    espinalNivel:   get('espinal-nivel'),
    espinalAguja:   get('espinal-aguja'),
    espinalPos:     radio('espinal-posicion'),
    _espinalDrugs:  drugs('espinal-farmacos'),
    epiduralNivel:  get('epidural-nivel'),
    epiduralAguja:  get('epidural-aguja'),
    epiduralCateter: document.getElementById('epidural-cateter')?.checked || false,
    epiduralTest:   document.getElementById('epidural-test')?.checked || false,
    _epiduralDrugs: drugs('epidural-farmacos'),
    bloqueoNervio:  get('bloqueo-nervio'),
    bloqueoTecnica: radio('bloqueo-tecnica'),
    bloqueoCateter: document.getElementById('bloqueo-cateter')?.checked || false,
    _bloqueoDrugs:  drugs('bloqueo-farmacos'),
    bloqueo2Nervio: get('bloqueo2-nervio'),
    bloqueo2Tecnica: radio('bloqueo2-tecnica'),
    bloqueo2Cateter: document.getElementById('bloqueo2-cateter')?.checked || false,
    _bloqueo2Drugs: drugs('bloqueo2-farmacos'),
    sedacionNivel:  radio('sedacion-nivel'),
    // Other drugs
    sedacion:    drugs('sedacion-farmacos'),
    analgesia:   drugs('otros-analgesia'),
    vasoactivos: drugs('otros-vasoactivos'),
    // Airway
    dispositivoVia:    get('dispositivo-via'),
    tecnicaIntubacion: get('tecnica-intubacion'),
    intentos: radio('intentos'), cormack: radio('cormack'),
    vad: checks('vad'),
    monitorizacion: Array.from(document.querySelectorAll('.monit-check:checked')).map(c => c.value).join(', '),
    complicaciones: Array.from(document.querySelectorAll('.comp-check:checked')).map(c => c.value).join(', '),
    destino: radio('destino'),
    rescates: drugs('rescates-farmacos'),
    notas: get('notas'),
  };
}

// ── VALIDATION ────────────────────────────────────────────
function validate(data) {
  if (!data.fecha)         return 'Falta la fecha';
  if (!data.edad)          return 'Falta la edad del paciente';
  if (!data.asa)           return 'Selecciona el ASA';
  if (!data.especialidad)  return 'Selecciona la especialidad';
  if (!data.procedimiento) return 'Indica el procedimiento';
  return null;
}

// ── SUBMIT ────────────────────────────────────────────────
async function handleSubmit() {
  const data = collectData();
  const err  = validate(data);
  if (err) { showToast(err, 'warning'); return; }

  const btn = document.getElementById('btn-registrar');
  btn.disabled = true;
  btn.textContent = 'Guardando…';
  setSyncStatus('pending');

  // ── EDIT MODE ─────────────────────────
  if (editingIndex !== null) {
    const cases = getAllCases();
    if (cases[editingIndex]) {
      cases[editingIndex].data = { ...data, numCaso: cases[editingIndex].data.numCaso };
      cases[editingIndex].editedAt = Date.now();
      localStorage.setItem('anestesia_cases', JSON.stringify(cases));
    }
    editingIndex = null;
    setSyncStatus('ok');
    showToast('✓ Caso #' + data.numCaso + ' actualizado', 'success');
    btn.disabled = false;
    btn.textContent = '✓ Registrar caso';
    handleBack();
    return;
  }

  // ── NEW CASE ──────────────────────────
  saveCasePermanently(data);

  try {
    if (!CONFIG.SHEETS_URL) {
      savePending(data);
      showToast('Sin URL configurada — guardado localmente', 'warning');
    } else {
      await fetch(CONFIG.SHEETS_URL, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(data),
      });
      setSyncStatus('ok');
      showToast('✓ Caso #' + data.numCaso + ' registrado', 'success');
    }
  } catch {
    savePending(data);
    setSyncStatus('error');
    showToast('Sin conexión — guardado localmente', 'warning');
  }

  btn.disabled = false;
  btn.textContent = '✓ Registrar caso';
  handleBack();
}

// ── STORAGE ───────────────────────────────────────────────
function saveCasePermanently(data) {
  const cases = JSON.parse(localStorage.getItem('anestesia_cases') || '[]');
  cases.push({ data, ts: Date.now() });
  localStorage.setItem('anestesia_cases', JSON.stringify(cases));
  // Increment counter
  const n = parseInt(localStorage.getItem('anestesia_case_count') || '0') + 1;
  localStorage.setItem('anestesia_case_count', String(n));
}

function getAllCases() {
  return JSON.parse(localStorage.getItem('anestesia_cases') || '[]');
}

function savePending(data) {
  const p = JSON.parse(localStorage.getItem('anestesia_pending') || '[]');
  p.push({ data, ts: Date.now() });
  localStorage.setItem('anestesia_pending', JSON.stringify(p));
}

// ── PENDING SYNC ──────────────────────────────────────────
function checkPending() {
  const p = JSON.parse(localStorage.getItem('anestesia_pending') || '[]');
  const banner = document.getElementById('pending-banner');
  if (!banner) return;
  if (p.length > 0) {
    banner.textContent = `⚠ ${p.length} caso(s) pendiente(s) de sincronizar — toca para sincronizar`;
    banner.classList.add('visible');
    banner.onclick = retryPending;
  } else {
    banner.classList.remove('visible');
    banner.onclick = null;
  }
}

async function retryPending() {
  if (!CONFIG.SHEETS_URL) { showToast('Configura la URL primero', 'warning'); return; }
  const p = JSON.parse(localStorage.getItem('anestesia_pending') || '[]');
  if (!p.length) return;
  showToast('Sincronizando…', '');
  let sent = 0;
  for (const item of p) {
    try {
      await fetch(CONFIG.SHEETS_URL, { method:'POST', mode:'no-cors', headers:{'Content-Type':'text/plain'}, body: JSON.stringify(item.data) });
      sent++;
    } catch { break; }
  }
  if (sent === p.length) {
    localStorage.removeItem('anestesia_pending');
    setSyncStatus('ok');
    showToast(`✓ ${sent} caso(s) sincronizados`, 'success');
  } else {
    localStorage.setItem('anestesia_pending', JSON.stringify(p.slice(sent)));
    showToast(`Sincronizados ${sent}/${p.length}`, 'warning');
  }
  checkPending();
}

// ── SYNC STATUS ───────────────────────────────────────────
function setSyncStatus(state) {
  document.querySelectorAll('.sync-dot').forEach(dot => {
    dot.classList.remove('pending', 'error');
    if (state === 'pending') dot.classList.add('pending');
    if (state === 'error')   dot.classList.add('error');
  });
  document.querySelectorAll('.sync-label').forEach(lbl => {
    lbl.textContent = state === 'pending' ? 'Guardando…'
      : state === 'error' ? 'Sin conexión' : 'Sincronizado';
  });
}

// ── TOAST ─────────────────────────────────────────────────
let _toastTimer;
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'show ' + type;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { t.className = ''; }, 3000);
}
