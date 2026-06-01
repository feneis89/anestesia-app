// ── STATS ─────────────────────────────────────────────────
// Reads all locally-stored cases and renders CSS bar charts.

function getAllCases() {
  return JSON.parse(localStorage.getItem('anestesia_cases') || '[]');
}

function renderStats() {
  const cases = getAllCases();
  const empty   = document.getElementById('stats-empty');
  const content = document.getElementById('stats-content');

  if (!cases.length) {
    if (empty)   empty.style.display   = 'block';
    if (content) content.style.display = 'none';
    return;
  }
  if (empty)   empty.style.display   = 'none';
  if (content) content.style.display = 'block';

  renderSummaryCards(cases);
  renderMonthlyChart(cases);
  renderTechniquesChart(cases);
  renderProceduresChart(cases);
  renderBlocksChart(cases);
  renderAirwayChart(cases);
  renderTOTChart(cases);
  renderInvasiveMonChart(cases);
  renderVADChart(cases);
  renderComplicationsChart(cases);
}

// ── SUMMARY CARDS ─────────────────────────────────────────
function renderSummaryCards(cases) {
  const now = new Date();
  const ym  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const total      = cases.length;
  const thisMes    = cases.filter(c => c.data.fecha?.startsWith(ym)).length;
  const withCompl  = cases.filter(c => {
    const v = c.data.complicaciones || '';
    return v && v !== 'Sin complicaciones';
  }).length;
  const withRegional = cases.filter(c =>
    /espinal|epidural|bloqueo/i.test(c.data.tipoAnestesia || '')
  ).length;

  setText('stat-total',    total);
  setText('stat-mes',      thisMes);
  setText('stat-compl',    total ? Math.round(withCompl   / total * 100) + '%' : '—');
  setText('stat-regional', total ? Math.round(withRegional / total * 100) + '%' : '—');
}

// ── MONTHLY CHART ─────────────────────────────────────────
function renderMonthlyChart(cases) {
  const months = getLast6Months();
  const items  = months.map(m => [
    formatMonth(m),
    cases.filter(c => c.data.fecha?.startsWith(m)).length
  ]);
  renderBar('chart-meses', items, 'var(--primary)');
}

// ── TECHNIQUES CHART ──────────────────────────────────────
function renderTechniquesChart(cases) {
  const defs = [
    ['AG',         'Anestesia General'],
    ['Espinal',    'Espinal'],
    ['Epidural',   'Epidural'],
    ['Bloqueo',    'Bloqueo'],
    ['Sedación',   'Sedaci'],
  ];
  const items = defs
    .map(([label, kw]) => [label, cases.filter(c =>
      (c.data.tipoAnestesia || '').toLowerCase().includes(kw.toLowerCase())
    ).length])
    .filter(([, n]) => n > 0);
  renderBar('chart-tecnicas', items, '#1976d2');
}

// ── COMPLICATIONS CHART ───────────────────────────────────
function renderComplicationsChart(cases) {
  const count = {};
  cases.forEach(c => {
    const comps = (c.data.complicaciones || '').trim();
    if (comps && comps !== 'Sin complicaciones') {
      comps.split(', ').forEach(v => { v = v.trim(); if (v) count[v] = (count[v] || 0) + 1; });
    }
  });
  const items = topN(count, 7);
  renderBar('chart-complicaciones', items, '#e53935');
}

// ── BLOCKS CHART ──────────────────────────────────────────
function renderBlocksChart(cases) {
  const count = {};
  cases.forEach(c => {
    const regional = c.data.tecnicaRegional || '';
    // Matches "Bloqueo N (NombreNervio," or "Bloqueo N (NombreNervio)"
    [...regional.matchAll(/Bloqueo \d+ \(([^,)]+)/g)].forEach(m => {
      const nerve = m[1].trim();
      if (nerve) count[nerve] = (count[nerve] || 0) + 1;
    });
  });
  const items = topN(count, 7);
  renderBar('chart-bloqueos', items, '#2e7d32');
}

// ── PROCEDURES CHART ──────────────────────────────────────
function renderProceduresChart(cases) {
  const count = {};
  cases.forEach(c => {
    const proc = (c.data.procedimiento || '').trim();
    if (proc) count[proc] = (count[proc] || 0) + 1;
  });
  const items = topN(count, 8);
  renderBar('chart-procedimientos', items, '#7b1fa2');
}

// ── AIRWAY DEVICES (grupos) ───────────────────────────────
function renderAirwayChart(cases) {
  const groups = {
    'Mascarilla facial': 0,
    'LMA (AuraGain / i-gel)': 0,
    'TOT / Intubación': 0,
    'No precisa (AR/Sedación)': 0,
  };
  cases.forEach(c => {
    const v = (c.data.dispositivoVia || '').trim();
    if (!v) return;
    if (v === 'Mascarilla facial') groups['Mascarilla facial']++;
    else if (v.startsWith('LMA')) groups['LMA (AuraGain / i-gel)']++;
    else if (v.startsWith('TOT') || v.includes('doble luz') || v === 'Awake FOI' || v === 'Traqueotomía') {
      groups['TOT / Intubación']++;
    }
    else if (v.startsWith('No precisa')) groups['No precisa (AR/Sedación)']++;
  });
  const items = Object.entries(groups).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  renderBar('chart-via-aerea', items, '#0277bd');
}

// ── DETALLE DE TUBOS / INTUBACIÓN ─────────────────────────
function renderTOTChart(cases) {
  const count = {};
  cases.forEach(c => {
    const v = (c.data.dispositivoVia || '').trim();
    if (v.startsWith('TOT') || v.includes('doble luz') || v === 'Awake FOI' || v === 'Traqueotomía') {
      count[v] = (count[v] || 0) + 1;
    }
  });
  const items = topN(count, 6);
  renderBar('chart-tot', items, '#01579b');
}

// ── MONITORIZACIÓN INVASIVA ───────────────────────────────
function renderInvasiveMonChart(cases) {
  const counters = {
    'Línea arterial': 0,
    'Vía central (CVC)': 0,
    'PVC': 0,
    'BIS / Entropía': 0,
    'TOF cuantitativo': 0,
    'Ecocardiografía ETE': 0,
  };
  cases.forEach(c => {
    const m = (c.data.monitorizacion || '');
    if (m.includes('Arterial invasiva')) counters['Línea arterial']++;
    if (m.includes('CVC'))               counters['Vía central (CVC)']++;
    if (m.includes('PVC'))               counters['PVC']++;
    if (m.includes('BIS'))               counters['BIS / Entropía']++;
    if (m.includes('TOF'))               counters['TOF cuantitativo']++;
    if (m.includes('ETE'))               counters['Ecocardiografía ETE']++;
  });
  const items = Object.entries(counters).filter(([, n]) => n > 0);
  renderBar('chart-monitorizacion', items, '#00695c');
}

// ── VAD CON % ─────────────────────────────────────────────
function renderVADChart(cases) {
  const total = cases.length;
  if (!total) { renderBar('chart-vad', [], '#c62828'); return; }

  const types = ['VAD prevista', 'VAD no prevista', 'No intubable', 'No ventilable'];
  const labels = { 'VAD prevista': 'Prevista', 'VAD no prevista': 'No prevista',
                   'No intubable': 'No intubable', 'No ventilable': 'No ventilable' };

  const items = types.map(t => {
    const n = cases.filter(c => (c.data.vad || '').includes(t)).length;
    const pct = (n / total * 100).toFixed(1);
    return [`${labels[t]} (${pct}%)`, n];
  });
  renderBar('chart-vad', items, '#c62828');
}

// ── GENERIC BAR RENDERER ──────────────────────────────────
function renderBar(containerId, items, color) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!items.length) {
    el.innerHTML = '<p class="text-muted" style="text-align:center;padding:16px 0">Sin datos</p>';
    return;
  }
  const max = Math.max(...items.map(i => i[1]), 1);
  el.innerHTML = items.map(([label, n]) => `
    <div class="chart-bar-item">
      <div class="chart-bar-label" title="${label}">${label}</div>
      <div class="chart-bar-track">
        <div class="chart-bar-fill" style="width:${(n / max * 100).toFixed(1)}%;background:${color}"></div>
      </div>
      <div class="chart-bar-value">${n}</div>
    </div>`).join('');
}

// ── HELPERS ───────────────────────────────────────────────
function getLast6Months() {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
}

function formatMonth(ym) {
  const [y, m] = ym.split('-');
  return ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][+m - 1]
    + ' ' + y.slice(2);
}

function topN(obj, n) {
  return Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n);
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
