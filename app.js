/* =========================================================
   Trading Journal – app.js
   Allt sparas lokalt i webbläsaren via IndexedDB.
   ========================================================= */

/* ---------- IndexedDB ---------- */
const DB_NAME = 'tradingJournalDB';
const DB_VERSION = 2;
let dbInstance = null;

function openDB() {
  if (dbInstance) return Promise.resolve(dbInstance);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('trades')) {
        const store = db.createObjectStore('trades', { keyPath: 'id', autoIncrement: true });
        store.createIndex('date', 'date');
        store.createIndex('signature', 'signature');
      }
      if (!db.objectStoreNames.contains('importBatches')) {
        db.createObjectStore('importBatches', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('journal')) {
        const store = db.createObjectStore('journal', { keyPath: 'id', autoIncrement: true });
        store.createIndex('date', 'date');
      }
      if (!db.objectStoreNames.contains('education')) {
        db.createObjectStore('education', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('goldbias')) {
        const store = db.createObjectStore('goldbias', { keyPath: 'id', autoIncrement: true });
        store.createIndex('date', 'date');
      }
      if (!db.objectStoreNames.contains('rules')) {
        db.createObjectStore('rules', { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = (e) => { dbInstance = e.target.result; resolve(dbInstance); };
    req.onerror = (e) => reject(e.target.error);
  });
}

function dbAdd(storeName, obj) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).add(obj);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}
function dbPut(storeName, obj) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).put(obj);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}
function dbDelete(storeName, id) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  }));
}
function dbGet(storeName, id) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}
function dbGetAll(storeName) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}
function dbGetAllByIndex(storeName, indexName, value) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).index(indexName).getAll(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}
function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/* ---------- Utils ---------- */
function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function formatMoney(n) {
  if (n === null || n === undefined || isNaN(n)) return '–';
  const sign = n < 0 ? '-' : '';
  return sign + Math.abs(n).toLocaleString('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' kr';
}
function formatNum(n, maxDec) {
  if (n === null || n === undefined || isNaN(n)) return '';
  return n.toLocaleString('sv-SE', { maximumFractionDigits: maxDec === undefined ? 2 : maxDec });
}
function formatDateHuman(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  const str = d.toLocaleDateString('sv-SE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  return str.charAt(0).toUpperCase() + str.slice(1);
}
function todayISO() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}
function statBox(label, value, cls, animateRaw) {
  const attr = animateRaw !== undefined && animateRaw !== null ? ` data-anim-raw="${animateRaw}"` : '';
  return `<div class="stat-box"><div class="label">${escapeHtml(label)}</div><div class="value ${cls || ''}"${attr}>${animateRaw !== undefined && animateRaw !== null ? '0,00 kr' : value}</div></div>`;
}
function runStatAnimations(container) {
  container.querySelectorAll('[data-anim-raw]').forEach(el => {
    const raw = parseFloat(el.dataset.animRaw);
    if (isNaN(raw)) return;
    animateNumber(el, raw, formatMoney);
  });
}
let toastTimer = null;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

/* ---------- Modal / Lightbox ---------- */
function openModal(html) {
  document.getElementById('modal').innerHTML = html;
  document.getElementById('modalBackdrop').classList.remove('hidden');
}
function closeModal() {
  document.getElementById('modalBackdrop').classList.add('hidden');
  document.getElementById('modal').innerHTML = '';
}
function openLightbox(src) {
  document.getElementById('lightboxImg').src = src;
  document.getElementById('lightbox').classList.remove('hidden');
}
function closeLightbox() {
  document.getElementById('lightbox').classList.add('hidden');
  document.getElementById('lightboxImg').src = '';
}

/* ---------- Image handling ---------- */
function compressImage(file, maxDim, quality) {
  maxDim = maxDim || 1280;
  quality = quality || 0.75;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) { height = Math.round(height * maxDim / width); width = maxDim; }
          else { width = Math.round(width * maxDim / height); height = maxDim; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Kunde inte läsa bilden'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Kunde inte läsa filen'));
    reader.readAsDataURL(file);
  });
}

let imgWidgetCounter = 0;
function renderImageUploadWidget(containerEl, imagesArr) {
  const inputId = containerEl.id + '_input';
  containerEl.innerHTML =
    imagesArr.map((src, i) => `
      <div class="img-preview"><img src="${src}"><button type="button" class="remove-img" data-i="${i}">✕</button></div>
    `).join('') +
    `<label class="img-add-btn" for="${inputId}" title="Lägg till bild">+<input type="file" accept="image/*" multiple hidden id="${inputId}"></label>`;

  containerEl.querySelectorAll('.remove-img').forEach(btn => {
    btn.addEventListener('click', () => {
      imagesArr.splice(parseInt(btn.dataset.i, 10), 1);
      renderImageUploadWidget(containerEl, imagesArr);
    });
  });
  const input = containerEl.querySelector('input[type=file]');
  input.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    for (const f of files) {
      try {
        const dataUrl = await compressImage(f);
        imagesArr.push(dataUrl);
      } catch (err) { console.error(err); }
    }
    renderImageUploadWidget(containerEl, imagesArr);
  });
}

/* ---------- Avanza CSV Import ---------- */
function parseSwedishNumber(s) {
  if (s === undefined || s === null) return null;
  s = String(s).trim();
  if (s === '') return null;
  const cleaned = s.replace(/[\s ]/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function parseAvanzaCSV(text) {
  text = text.replace(/^﻿/, '');
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) throw new Error('Filen verkar tom eller har fel format.');
  const header = lines[0].split(';').map(h => h.trim());
  const idx = {
    date: header.indexOf('Datum'),
    account: header.indexOf('Konto'),
    type: header.indexOf('Typ av transaktion'),
    instrument: header.indexOf('Värdepapper/beskrivning'),
    quantity: header.indexOf('Antal'),
    price: header.indexOf('Kurs'),
    amount: header.indexOf('Belopp'),
    currency: header.indexOf('Transaktionsvaluta'),
    commission: header.indexOf('Courtage'),
    fxRate: header.indexOf('Valutakurs'),
    instrumentCurrency: header.indexOf('Instrumentvaluta'),
    isin: header.indexOf('ISIN'),
    result: header.indexOf('Resultat'),
  };
  if (idx.date === -1 || idx.type === -1 || idx.instrument === -1) {
    throw new Error('Kände inte igen kolumnerna. Kontrollera att filen är en Avanza-transaktionsexport (CSV, semikolon-separerad).');
  }
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(';');
    if (cols.length < 3) continue;
    const date = (cols[idx.date] || '').trim();
    if (!date) continue;
    rows.push({
      date,
      account: (cols[idx.account] || '').trim(),
      type: (cols[idx.type] || '').trim(),
      instrument: (cols[idx.instrument] || '').trim(),
      quantity: parseSwedishNumber(cols[idx.quantity]),
      price: parseSwedishNumber(cols[idx.price]),
      amount: parseSwedishNumber(cols[idx.amount]),
      currency: (cols[idx.currency] || '').trim(),
      commission: parseSwedishNumber(cols[idx.commission]),
      fxRate: parseSwedishNumber(cols[idx.fxRate]),
      instrumentCurrency: (cols[idx.instrumentCurrency] || '').trim(),
      isin: (cols[idx.isin] || '').trim(),
      result: idx.result > -1 ? parseSwedishNumber(cols[idx.result]) : null,
      fileOrder: i - 1,
    });
  }
  return rows;
}

/* Endast köp/sälj av BULL/BEAR-certifikat på guld ska räknas som trades i journalen. */
const GOLD_BULLBEAR_REGEX = /^(BULL|BEAR)\s+GULD\b/i;
function isBuySellType(type) { return type === 'Köp' || type === 'Sälj'; }
function isGoldBullBearInstrument(instrument) { return GOLD_BULLBEAR_REGEX.test((instrument || '').trim()); }

function classifyRows(rows) {
  const included = [];
  const excluded = [];
  rows.forEach(row => {
    if (isBuySellType(row.type) && isGoldBullBearInstrument(row.instrument)) {
      included.push(row);
    } else {
      const reason = !isBuySellType(row.type) ? 'Fel transaktionstyp' : 'Inte BULL/BEAR-certifikat på guld';
      excluded.push({ row, reason });
    }
  });
  return { included, excluded };
}

function summarizeExcluded(excluded) {
  const counts = {};
  excluded.forEach(({ row, reason }) => {
    const key = reason + '|' + row.type + '|' + row.instrument;
    if (!counts[key]) counts[key] = { reason, type: row.type, instrument: row.instrument, count: 0 };
    counts[key].count++;
  });
  return Object.values(counts).sort((a, b) => b.count - a.count);
}

/*
 * Importerar en enskild CSV-fil: läser, validerar, klassificerar, dedupar mot befintliga trades
 * (inkl. de som redan lagts in tidigare under samma multi-filsimport) och skriver en importBatch.
 * Gör ingen DOM-uppdatering själv – returnerar ett resultatobjekt som anroparen renderar.
 * existingSigs muteras in-place så att flera filer i samma omgång dedupar mot varandra också.
 */
async function importSingleCSVFile(file, existingSigs) {
  let text;
  try { text = await file.text(); } catch (err) {
    return { filename: file.name, error: 'Kunde inte läsa filen.' };
  }
  let rows;
  try { rows = parseAvanzaCSV(text); } catch (err) {
    return { filename: file.name, error: err.message };
  }
  if (rows.length === 0) {
    return { filename: file.name, error: 'Inga transaktionsrader hittades i filen.' };
  }

  const { included, excluded } = classifyRows(rows);
  const excludedSummary = summarizeExcluded(excluded);

  if (included.length === 0) {
    return { filename: file.name, error: 'Inga rader matchade filtret (köp/sälj av BULL/BEAR-certifikat på guld).', excludedSummary };
  }

  const db = await openDB();
  const tx = db.transaction('trades', 'readwrite');
  const store = tx.objectStore('trades');
  let inserted = 0, skipped = 0;
  const insertedIds = [];
  for (const row of included) {
    const signature = [row.date, row.type, row.instrument, row.quantity, row.price, row.amount, row.result].join('|');
    if (existingSigs.has(signature)) { skipped++; continue; }
    existingSigs.add(signature);
    const req = store.add(Object.assign({ signature }, row));
    req.onsuccess = () => insertedIds.push(req.result);
    inserted++;
  }
  await txDone(tx);

  const dates = included.map(r => r.date).sort();
  const dateFrom = dates[0];
  const dateTo = dates[dates.length - 1];

  await dbAdd('importBatches', {
    filename: file.name,
    importedAt: new Date().toISOString(),
    inserted, skipped, totalRows: rows.length,
    excludedCount: excluded.length,
    excludedSummary,
    dateFrom, dateTo,
    tradeIds: insertedIds,
  });

  return { filename: file.name, inserted, skipped, totalRows: rows.length, excluded, excludedSummary, dateFrom, dateTo };
}

function renderImportResultsSummary(results) {
  const resultEl = document.getElementById('importResult');
  const ok = results.filter(r => !r.error);
  const failed = results.filter(r => r.error);
  const totalInserted = ok.reduce((s, r) => s + (r.inserted || 0), 0);
  const totalSkipped = ok.reduce((s, r) => s + (r.skipped || 0), 0);

  const perFileHtml = results.map(r => {
    if (r.error) {
      return `<p class="value neg" style="margin-top:8px;">${escapeHtml(r.filename)}: ${escapeHtml(r.error)}</p>`;
    }
    const rangeLabel = r.dateFrom ? (r.dateFrom === r.dateTo ? formatDateHuman(r.dateFrom) : `${r.dateFrom} – ${r.dateTo}`) : 'okänt datum';
    return `
      <div style="margin-top:10px;">
        <p class="value pos" style="margin-bottom:2px;">${escapeHtml(r.filename)}: ${r.inserted} transaktioner importerade för ${escapeHtml(rangeLabel)}${r.skipped ? `, ${r.skipped} dubbletter hoppades över` : ''}.</p>
        ${r.excluded && r.excluded.length ? `
          <p class="muted small" style="margin-top:4px;">${r.excluded.length} rader ignorerades:</p>
          <div class="rule-violation-list">
            ${r.excludedSummary.slice(0, 12).map(s => `<span class="rule-chip">${escapeHtml(s.reason)}: ${escapeHtml(s.type)} ${escapeHtml(s.instrument)} × ${s.count}</span>`).join('')}
            ${r.excludedSummary.length > 12 ? `<span class="rule-chip">+${r.excludedSummary.length - 12} till</span>` : ''}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  resultEl.innerHTML = `
    ${results.length > 1 ? `<p class="value ${failed.length ? (ok.length ? '' : 'neg') : 'pos'}">${results.length} filer bearbetade: ${totalInserted} transaktioner importerade totalt${totalSkipped ? `, ${totalSkipped} dubbletter hoppades över` : ''}${failed.length ? `, ${failed.length} fil${failed.length > 1 ? 'er' : ''} misslyckades` : ''}.</p>` : ''}
    ${perFileHtml}
    ${ok.length ? '<p class="muted small" style="margin-top:10px;">Gå till <strong>Översikt</strong> för att se resultatet dag för dag.</p>' : ''}
  `;
}

async function handleCSVImportFiles(fileList) {
  const files = Array.from(fileList || []).filter(f => f);
  if (files.length === 0) return;
  const resultEl = document.getElementById('importResult');
  resultEl.innerHTML = `<p class="muted">Läser in ${files.length > 1 ? files.length + ' filer' : escapeHtml(files[0].name)}...</p>`;

  const existing = await dbGetAll('trades');
  const existingSigs = new Set(existing.map(t => t.signature));

  const results = [];
  for (const file of files) {
    // Körs sekventiellt (inte parallellt) så att dedupliceringen ser tidigare filers rader innan nästa fil läggs in.
    const r = await importSingleCSVFile(file, existingSigs);
    results.push(r);
  }

  renderImportResultsSummary(results);
  renderImportHistory();
  renderOverview();
}

async function handleCSVImport(file) {
  return handleCSVImportFiles([file]);
}

async function deleteImportBatch(batchId) {
  const batch = await dbGet('importBatches', batchId);
  if (!batch) return;
  const tradeIds = batch.tradeIds || [];
  const label = batch.dateFrom ? (batch.dateFrom === batch.dateTo ? formatDateHuman(batch.dateFrom) : `${batch.dateFrom} – ${batch.dateTo}`) : batch.filename;
  const msg = tradeIds.length
    ? `Ta bort importen "${label}"? ${tradeIds.length} transaktioner tas bort permanent.`
    : `Ta bort importposten "${label}"? (Inga kopplade transaktioner hittades att ta bort.)`;
  if (!confirm(msg)) return;
  for (const tid of tradeIds) {
    await dbDelete('trades', tid).catch(() => {});
  }
  await dbDelete('importBatches', batchId);
  renderImportHistory();
  renderOverview();
  showToast('Import borttagen');
}

async function renderImportHistory() {
  const el = document.getElementById('importHistory');
  const sortSelect = document.getElementById('importSort');
  const sortMode = sortSelect ? sortSelect.value : 'imported_desc';
  const batches = await dbGetAll('importBatches');
  if (batches.length === 0) { el.innerHTML = '<div class="empty-state">Inga importer gjorda än.</div>'; return; }

  const dateCounts = {};
  batches.forEach(b => { if (b.dateFrom) dateCounts[b.dateFrom] = (dateCounts[b.dateFrom] || 0) + 1; });

  const sorted = batches.slice();
  if (sortMode === 'date_desc') sorted.sort((a, b) => (b.dateFrom || '').localeCompare(a.dateFrom || '') || b.importedAt.localeCompare(a.importedAt));
  else if (sortMode === 'date_asc') sorted.sort((a, b) => (a.dateFrom || '').localeCompare(b.dateFrom || '') || a.importedAt.localeCompare(b.importedAt));
  else sorted.sort((a, b) => b.importedAt.localeCompare(a.importedAt));

  el.innerHTML = sorted.map(b => {
    const rangeLabel = b.dateFrom ? (b.dateFrom === b.dateTo ? formatDateHuman(b.dateFrom) : `${b.dateFrom} – ${b.dateTo}`) : 'Okänt datum';
    const isDup = b.dateFrom && dateCounts[b.dateFrom] > 1;
    return `
    <div class="entry-card">
      <div class="entry-card-head">
        <div>
          <div class="entry-card-title">${escapeHtml(rangeLabel)} ${isDup ? '<span class="rule-chip" style="margin-left:6px;"><span class="status-dot warn" style="margin-right:5px;"></span>Möjlig dubblett</span>' : ''}</div>
          <div class="entry-card-meta">${escapeHtml(b.filename)} · Importerad ${new Date(b.importedAt).toLocaleString('sv-SE')}</div>
        </div>
        <div class="entry-card-actions"><button class="btn btn-danger btn-small delete-batch" data-id="${b.id}">Ta bort</button></div>
      </div>
      <div class="entry-card-meta" style="margin-top:8px;">
        ${b.inserted} importerade${b.skipped ? ' · ' + b.skipped + ' dubbletter' : ''}${b.excludedCount ? ' · ' + b.excludedCount + ' ignorerade rader' : ''}
      </div>
    </div>`;
  }).join('');

  el.querySelectorAll('.delete-batch').forEach(btn => {
    btn.addEventListener('click', () => deleteImportBatch(parseInt(btn.dataset.id, 10)));
  });
}

function setupImport() {
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('csvFile');
  dropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length) handleCSVImportFiles(e.target.files);
    e.target.value = '';
  });
  dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files && files.length) handleCSVImportFiles(files);
  });
  const sortSelect = document.getElementById('importSort');
  if (sortSelect) sortSelect.addEventListener('change', renderImportHistory);
}

/* ---------- Overview / Dashboard ---------- */
let equityChartInstance = null;

// 'final' = summera varje dags slutresultat, 'peak' = summera varje dags bästa (topp) punkt istället.
let overviewMetric = 'final';

/* Måndag 00:00 – söndag 23:59:59 för veckan som innehåller `d`. */
function getWeekRange(d) {
  const date = new Date(d); date.setHours(0, 0, 0, 0);
  const dow = (date.getDay() + 6) % 7; // Mån=0 .. Sön=6
  const start = new Date(date); start.setDate(date.getDate() - dow);
  const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999);
  return { start, end };
}
/* Hela kalendermånaden som innehåller `d`. */
function getMonthRange(d) {
  const date = new Date(d);
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}
/* Summerar antingen slutresultat eller dagens topp (beroende på metric) för dagar inom [start, end]. */
function sumMetricForRange(byDate, start, end, metric) {
  let sum = 0;
  Object.keys(byDate).forEach(date => {
    const d = new Date(date + 'T00:00:00');
    if (d < start || d > end) return;
    const stats = computeDayStats(byDate[date]);
    sum += metric === 'peak' ? stats.peak : stats.totalPnl;
  });
  return sum;
}

async function renderOverview() {
  const trades = await dbGetAll('trades');
  const globalStatsEl = document.getElementById('globalStats');
  const dayListEl = document.getElementById('dayList');
  document.getElementById('dayDetailCard').classList.add('hidden');

  if (trades.length === 0) {
    globalStatsEl.innerHTML = '';
    dayListEl.innerHTML = `<div class="empty-state">Inga trades importerade än. Gå till <strong>Importera</strong> för att ladda upp din Avanza-historik.</div>`;
    document.getElementById('heatmapGrid').innerHTML = '';
    document.getElementById('heatmapMonthLabel').textContent = '';
    renderAchievements();
    return;
  }

  const byDate = {};
  trades.forEach(t => { (byDate[t.date] = byDate[t.date] || []).push(t); });
  const dates = Object.keys(byDate).sort().reverse();

  let totalPnl = 0, wins = 0, losses = 0;
  trades.forEach(t => { if (t.result !== null && t.result !== undefined) { totalPnl += t.result; if (t.result > 0) wins++; else if (t.result < 0) losses++; } });
  const winRate = (wins + losses) > 0 ? (wins / (wins + losses) * 100) : null;

  const now = new Date();
  const weekRange = getWeekRange(now);
  const monthRange = getMonthRange(now);
  const weekSum = sumMetricForRange(byDate, weekRange.start, weekRange.end, overviewMetric);
  const monthSum = sumMetricForRange(byDate, monthRange.start, monthRange.end, overviewMetric);
  const totalSum = sumMetricForRange(byDate, new Date(0), new Date(8640000000000000), overviewMetric);
  const metricSuffix = overviewMetric === 'peak' ? ' (dagens topp)' : '';

  globalStatsEl.innerHTML =
    statBox('Denna vecka' + metricSuffix, formatMoney(weekSum), weekSum >= 0 ? 'pos' : 'neg', weekSum) +
    statBox('Denna månad' + metricSuffix, formatMoney(monthSum), monthSum >= 0 ? 'pos' : 'neg', monthSum) +
    statBox('Totalt resultat' + metricSuffix, formatMoney(totalSum), totalSum >= 0 ? 'pos' : 'neg', totalSum) +
    statBox('Handelsdagar', dates.length) +
    statBox('Totalt antal trades', trades.length) +
    statBox('Träffsäkerhet', winRate !== null ? winRate.toFixed(0) + '%' : '–');
  runStatAnimations(globalStatsEl);

  renderHeatmap();
  renderAchievements();

  dayListEl.innerHTML = dates.map(date => {
    const dayTrades = byDate[date];
    const pnl = dayTrades.reduce((s, t) => s + (t.result || 0), 0);
    const pillClass = pnl > 0 ? 'pos' : pnl < 0 ? 'neg' : 'neutral';
    return `<div class="day-row" data-date="${date}">
      <div>
        <div class="date">${formatDateHuman(date)}</div>
        <div class="meta">${dayTrades.length} transaktioner</div>
      </div>
      <div class="pill ${pillClass}">${formatMoney(pnl)}</div>
    </div>`;
  }).join('');

  dayListEl.querySelectorAll('.day-row').forEach(el => {
    el.addEventListener('click', () => openDayDetail(el.dataset.date, false));
  });
}

/*
 * Parar ihop enskilda Köp/Sälj-transaktioner till hela positioner ("trades") per instrument:
 * en position börjar när innehavet går från 0 till något (Köp), fortsätter genom ev. fler Köp
 * och delvisa Sälj (TP1, TP2, TP3...), och avslutas när innehavet är tillbaka på 0.
 * Om dagen börjar med ett Sälj utan föregående Köp antas positionen ha öppnats innan denna dag.
 */
function computeTradeGroupsForDay(trades) {
  const byInstrument = {};
  trades.forEach(t => {
    const key = (t.isin || t.instrument || '').trim() || t.instrument;
    (byInstrument[key] = byInstrument[key] || []).push(t);
  });

  const groups = [];
  Object.keys(byInstrument).forEach(key => {
    const list = byInstrument[key].slice().sort((a, b) => a.fileOrder - b.fileOrder);
    let current = null;
    let runningQty = 0;
    list.forEach(t => {
      if (!current) {
        current = {
          instrument: t.instrument,
          isin: t.isin,
          legs: [],
          entryLegs: [],
          exitLegs: [],
          openedBeforeVisibleData: t.type === 'Sälj',
        };
      }
      current.legs.push(t);
      if (t.type === 'Köp') current.entryLegs.push(t); else current.exitLegs.push(t);
      runningQty += (t.quantity || 0);
      if (Math.abs(runningQty) < 0.0001) {
        current.status = 'closed';
        groups.push(current);
        current = null;
        runningQty = 0;
      }
    });
    if (current) {
      current.status = 'open';
      groups.push(current);
    }
  });

  groups.sort((a, b) => a.legs[0].fileOrder - b.legs[0].fileOrder);

  return groups.map(g => {
    const entryQty = g.entryLegs.reduce((s, t) => s + (t.quantity || 0), 0);
    const entryCost = g.entryLegs.reduce((s, t) => s + Math.abs(t.amount || 0), 0);
    const avgEntryPrice = entryQty > 0
      ? g.entryLegs.reduce((s, t) => s + (t.quantity || 0) * (t.price || 0), 0) / entryQty
      : null;
    const exitQty = g.exitLegs.reduce((s, t) => s + Math.abs(t.quantity || 0), 0);
    const totalResult = g.exitLegs.reduce((s, t) => s + (t.result || 0), 0);
    const totalCommission = g.legs.reduce((s, t) => s + (t.commission || 0), 0);
    const exitLabels = g.exitLegs.length <= 1 ? g.exitLegs.map(() => 'Stängning') : g.exitLegs.map((_, i) => `TP${i + 1}`);
    return Object.assign(g, { entryQty, entryCost, avgEntryPrice, exitQty, totalResult, totalCommission, exitLabels });
  });
}

function renderTradeGroups(groups, baseMovePct, tolerancePct) {
  if (groups.length === 0) return '<div class="empty-state">Inga transaktioner att gruppera.</div>';
  const baseMove = baseMovePct === undefined || baseMovePct === null ? RULE_DEFAULT_THRESHOLDS.max_risk_pct_leveraged : baseMovePct;
  return groups.map((g, gi) => {
    const statusLabel = g.status === 'open' ? 'Öppen vid dagens slut' : g.openedBeforeVisibleData ? 'Position öppnad innan denna dag' : 'Stängd';
    const statusClass = g.status === 'open' ? 'neutral' : g.totalResult > 0 ? 'pos' : g.totalResult < 0 ? 'neg' : 'neutral';
    const exitRows = g.exitLegs.map((t, i) => `
      <tr>
        <td>${escapeHtml(g.exitLabels[i])}</td>
        <td>${formatNum(Math.abs(t.quantity), 0)}</td>
        <td>${formatNum(t.price, 4)}</td>
        <td class="${t.result > 0 ? 'num-pos' : t.result < 0 ? 'num-neg' : ''}">${t.result != null ? formatMoney(t.result) : '–'}</td>
      </tr>
    `).join('');
    const lastLeg = g.legs[g.legs.length - 1];

    // Resultat/risk per position i % av köpt belopp – visas alltid (vinst eller förlust), inte bara
    // när risken sprack. Vid förlust jämförs den mot riskbudgeten (~2,4% × hävstång) och flaggas om
    // den överskreds; vid vinst visas bara resultatet i %.
    let riskHtml = '';
    if (g.entryCost > 0) {
      const leverage = parseLeverage(g.instrument);
      if (g.totalResult < 0) {
        const lossPct = (-g.totalResult / g.entryCost) * 100;
        if (leverage) {
          const allowedPct = baseMove * leverage;
          const tol = tolerancePct === undefined || tolerancePct === null ? RULE_DEFAULT_TOLERANCE_PCT : tolerancePct;
          const bufferedAllowedPct = allowedPct * (1 + tol / 100);
          const exceeded = lossPct > bufferedAllowedPct;
          const nearLimit = lossPct > allowedPct && lossPct <= bufferedAllowedPct;
          const cls = exceeded ? 'num-neg' : nearLimit ? '' : 'muted';
          const style = nearLimit ? 'color: var(--yellow);' : '';
          riskHtml = `<div class="entry-card-meta" style="margin-top:4px;">Risk: <span class="${cls}" style="${style}">${exceeded ? statusDotHtml('warn') : ''}${lossPct.toFixed(2)}%</span> av köpt belopp (${formatMoney(-g.entryCost)}) · mål ${allowedPct.toFixed(2)}% · gräns m. marginal ${bufferedAllowedPct.toFixed(2)}% vid X${leverage}${exceeded ? ' · över riskbudget' : ''}</div>`;
        } else {
          riskHtml = `<div class="entry-card-meta muted" style="margin-top:4px;">Risk: ${lossPct.toFixed(2)}% av köpt belopp (${formatMoney(-g.entryCost)}) · hävstång okänd</div>`;
        }
      } else {
        const gainPct = (g.totalResult / g.entryCost) * 100;
        riskHtml = `<div class="entry-card-meta" style="margin-top:4px;">Resultat: <span class="num-pos">+${gainPct.toFixed(2)}%</span> av köpt belopp (${formatMoney(-g.entryCost)})</div>`;
      }
    }

    return `
    <div class="entry-card">
      <div class="entry-card-head">
        <div>
          <div class="entry-card-title">Trade ${gi + 1}: ${escapeHtml(g.instrument)} <span class="pill ${statusClass}" style="margin-left:8px;">${escapeHtml(statusLabel)}</span></div>
          <div class="entry-card-meta">
            ${g.entryQty > 0 ? `Entry: ${formatNum(g.entryQty, 0)} st @ snitt ${formatNum(g.avgEntryPrice, 4)} (${formatMoney(-g.entryCost)})` : 'Entry: okänd (positionen fanns redan innan denna dag)'}
            ${g.exitQty > 0 ? ` · Stängt: ${formatNum(g.exitQty, 0)} st i ${g.exitLegs.length} del${g.exitLegs.length > 1 ? 'ar' : ''}` : ' · Fortfarande öppen'}
          </div>
          ${riskHtml}
        </div>
        <div class="value ${g.totalResult > 0 ? 'pos' : g.totalResult < 0 ? 'neg' : ''}" style="font-size:1.15rem;">${formatMoney(g.totalResult)}</div>
      </div>
      ${g.exitLegs.length ? `
      <table class="trade-table" style="margin-top:10px;">
        <thead><tr><th>Del</th><th>Antal</th><th>Kurs</th><th>Resultat</th></tr></thead>
        <tbody>${exitRows}</tbody>
      </table>` : ''}
      <div style="margin-top:10px;"><button class="btn btn-ghost btn-small group-journal-btn" data-trade-id="${lastLeg.id}">+ Journal för denna trade</button></div>
    </div>`;
  }).join('');
}

/*
 * Delad beräkning av en dags resultatutveckling: löpande resultat, topp, största "giveback"
 * och en overtrading-bedömning. Används av dagsdetaljen, kalendern och info-popupen så att
 * alla visar exakt samma siffror.
 */
function computeDayStats(dayTrades) {
  const sorted = dayTrades.slice().sort((a, b) => a.fileOrder - b.fileOrder);
  let running = 0, peak = 0, peakIndex = -1;
  sorted.forEach((t, i) => {
    running += (t.result || 0);
    t._running = running;
    if (i === 0 || running > peak) { peak = running; peakIndex = i; }
  });
  const totalPnl = running;
  let maxGiveback = 0, runningPeak = sorted.length ? sorted[0]._running : 0;
  sorted.forEach(t => {
    if (t._running > runningPeak) runningPeak = t._running;
    const giveback = runningPeak - t._running;
    if (giveback > maxGiveback) maxGiveback = giveback;
  });
  const giveback = peak - totalPnl;
  // "Overtraded" = dagen slutade på minus efter att ha gett tillbaka från sin bästa punkt
  // (oavsett om den bästa punkten själv var plus eller "bara mindre minus").
  const overtraded = totalPnl < 0 && giveback > 0.01;
  const peakTrade = peakIndex >= 0 ? sorted[peakIndex] : null;
  const withResult = sorted.filter(t => t.result !== null && t.result !== undefined);
  const wins = withResult.filter(t => t.result > 0).length;
  const losses = withResult.filter(t => t.result < 0).length;
  const winRate = (wins + losses) > 0 ? (wins / (wins + losses) * 100) : null;
  const totalCommission = sorted.reduce((s, t) => s + (t.commission || 0), 0);
  return {
    sorted, totalPnl, peak, peakIndex, peakTrade, maxGiveback, giveback, overtraded,
    wins, losses, winRate, totalCommission, tradeCount: sorted.length,
  };
}

/*
 * Ett enda ställe som avgör vad som hände en dag: ikon, allvarlighetsgrad och text.
 * Täcker alla kombinationer: topp plus/minus, slut plus/minus, med eller utan giveback.
 */
function dayInsight(stats) {
  if (stats.tradeCount === 0) {
    return { show: false, tone: 'neutral', text: 'Inga trades denna dag.' };
  }
  if (stats.giveback <= 0.01) {
    if (stats.totalPnl >= 0) {
      return { show: false, tone: 'neutral', text: 'Inget tecken på övertradning – dagens resultat är samma som (eller mycket nära) dagens bästa punkt.' };
    }
    return { show: true, tone: 'neutral', text: 'Dagen var på minus rakt igenom, utan att någon gång ha varit bättre än så här.' };
  }
  const peakWasPositive = stats.peak > 0.01;
  const base = `Du låg som ${peakWasPositive ? 'mest på' : 'bäst på'} ${formatMoney(stats.peak)} (vid trade #${stats.peakIndex + 1}) men avslutade på ${formatMoney(stats.totalPnl)} – ${formatMoney(stats.giveback)} gavs tillbaka efteråt.`;
  if (stats.totalPnl < 0 && peakWasPositive) {
    return { show: true, tone: 'danger', text: base + ' Ett tydligt tecken på övertradning: vinsten vändes till förlust.' };
  }
  if (stats.totalPnl < 0 && !peakWasPositive) {
    return { show: true, tone: 'danger', text: base + ' Dagen var aldrig på plus, men förlusten växte efter din bästa punkt – ett tecken på att handeln kanske borde stoppats tidigare.' };
  }
  return { show: true, tone: 'info', text: base + ' Ett möjligt tecken på övertradning, även om dagen ändå slutade på plus.' };
}

/* Mappar en insight/tone till en status-dot-klass (CSS-cirkel istället för emoji). */
function toneDotClass(tone) { return tone === 'danger' ? 'warn' : (tone === 'info' || tone === 'neutral') ? tone : 'info'; }
function statusDotHtml(tone) { return `<span class="status-dot ${toneDotClass(tone)}"></span>`; }

// Behåller det gamla namnet som en tunn wrapper (kalendermodal/dagsdetalj kan fortsätta be om ren text).
function overtradingVerdictText(stats) { return dayInsight(stats).text; }

/* Kompakt transaktionstabell (alla dagens trades) med dagens toppunkt markerad – används i info-popupen. */
function renderCompactTradeTable(stats) {
  const rows = stats.sorted.map((t, i) => {
    const isPeak = stats.giveback > 0.01 && stats.peakTrade && t === stats.peakTrade;
    return `
    <tr class="${isPeak ? 'peak-row' : ''}">
      <td>${i + 1}</td>
      <td class="${t.type === 'Köp' ? 'tag-buy' : 'tag-sell'}">${escapeHtml(t.type)}</td>
      <td>${escapeHtml(t.instrument)}</td>
      <td class="${t.result > 0 ? 'num-pos' : t.result < 0 ? 'num-neg' : ''}">${t.result != null ? formatMoney(t.result) : '–'}</td>
      <td class="${t._running >= 0 ? 'num-pos' : 'num-neg'}">${formatMoney(t._running)}${isPeak ? ' <span class="rule-chip ok" style="margin-left:4px;white-space:nowrap;"><span class="status-dot ok" style="margin-right:5px;"></span>Hit borde du stannat</span>' : ''}</td>
    </tr>`;
  }).join('');
  return `
    <table class="trade-table" style="margin-top:14px;">
      <thead><tr><th>#</th><th>Typ</th><th>Värdepapper</th><th>Resultat</th><th>Löpande</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

async function openDayInfoModal(date) {
  const dayTrades = await dbGetAllByIndex('trades', 'date', date);
  const stats = computeDayStats(dayTrades);
  const insight = dayInsight(stats);

  const rules = await dbGetAll('rules');
  const activeRiskRule = rules.find(r => r.type === 'max_risk_pct_leveraged' && r.active !== false);
  const baseMovePct = activeRiskRule ? activeRiskRule.threshold : RULE_DEFAULT_THRESHOLDS.max_risk_pct_leveraged;
  const riskTolerancePct = activeRiskRule ? activeRiskRule.tolerancePct : undefined;
  const ascTrades = dayTrades.slice().sort((a, b) => a.fileOrder - b.fileOrder);
  const groups = computeTradeGroupsForDay(ascTrades);

  const modalHtml = `
    <h2>${formatDateHuman(date)}</h2>
    <div class="stat-row">
      ${statBox('Slutresultat', formatMoney(stats.totalPnl), stats.totalPnl >= 0 ? 'pos' : 'neg')}
      ${statBox('Dagens topp', formatMoney(stats.peak), stats.peak > 0 ? 'pos' : '')}
      ${statBox('Gav tillbaka', stats.giveback > 0.01 ? formatMoney(stats.giveback) : '0,00 kr', stats.giveback > 0.01 ? 'neg' : '')}
      ${statBox('Träffsäkerhet', stats.winRate !== null ? stats.winRate.toFixed(0) + '%' : '–')}
    </div>
    <p class="muted small" style="line-height:1.5;">${statusDotHtml(insight.tone)}${escapeHtml(insight.text)}</p>
    <div style="max-height: 420px; overflow-y: auto;">
      ${groups.length > 0 ? `
        <p class="muted small" style="margin-bottom:6px;">Dagens trades, ihopparade (entry + ev. TP1/TP2/TP3... vid delvisa uttag). Avanzas export har inget klockslag, bara datum och radordning.</p>
        <div class="entry-list">${renderTradeGroups(groups, baseMovePct, riskTolerancePct)}</div>
      ` : ''}
      ${stats.tradeCount > 0 ? `<p class="muted small" style="margin:16px 0 0;">Alla transaktioner denna dag, rå ordning:</p>${renderCompactTradeTable(stats)}` : ''}
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" id="dayInfoClose">Stäng</button>
      <button class="btn btn-primary" id="dayInfoOpenDetail">Öppna dagsdetalj →</button>
    </div>
  `;
  openModal(modalHtml);
  document.getElementById('dayInfoClose').addEventListener('click', closeModal);
  document.querySelectorAll('#modal .group-journal-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      closeModal();
      openJournalForm(null, { date, tradeId: parseInt(btn.dataset.tradeId, 10) });
    });
  });
  document.getElementById('dayInfoOpenDetail').addEventListener('click', async () => {
    closeModal();
    await switchView('overview');
    await openDayDetail(date, false);
  });
}

async function openDayDetail(date, reversed, viewMode) {
  viewMode = viewMode || 'flat';
  const all = await dbGetAllByIndex('trades', 'date', date);
  const trades = all.slice().sort((a, b) => reversed ? b.fileOrder - a.fileOrder : a.fileOrder - b.fileOrder);
  const ascTrades = all.slice().sort((a, b) => a.fileOrder - b.fileOrder);

  document.getElementById('dayDetailTitle').textContent = formatDateHuman(date);
  const card = document.getElementById('dayDetailCard');
  card.classList.remove('hidden');

  const dayStats = computeDayStats(all);
  const { totalPnl, peak, peakIndex, peakTrade, maxGiveback, giveback, overtraded: overtradedWarning, wins, losses, winRate, totalCommission } = dayStats;
  const insight = dayInsight(dayStats);

  const rules = await dbGetAll('rules');
  const activeRiskRule = rules.find(r => r.type === 'max_risk_pct_leveraged' && r.active !== false);
  const baseMovePct = activeRiskRule ? activeRiskRule.threshold : RULE_DEFAULT_THRESHOLDS.max_risk_pct_leveraged;
  const riskTolerancePct = activeRiskRule ? activeRiskRule.tolerancePct : undefined;

  // Pre-pass: how much of today's loss came from trades that broke the risk budget, and what the
  // day would have looked like if every one of those had been capped at the target risk instead.
  let overriskedCount = 0;
  let totalSavingsKr = 0;
  trades.forEach(t => {
    const risk = computeTradeRisk(t, baseMovePct, riskTolerancePct);
    if (risk && risk.exceeded) { overriskedCount++; totalSavingsKr += risk.savingsKr; }
  });
  const hypotheticalDayPnl = totalPnl + totalSavingsKr;

  const statsHtml = `<div class="stat-row">
    ${statBox('Dagens resultat', formatMoney(totalPnl), totalPnl >= 0 ? 'pos' : 'neg', totalPnl)}
    ${statBox('Dagens topp', formatMoney(peak), peak > 0 ? 'pos' : '', peak)}
    ${statBox('Gav tillbaka (störst)', maxGiveback > 0 ? formatMoney(maxGiveback) : '0,00 kr', maxGiveback > 0 ? 'neg' : '')}
    ${overriskedCount > 0 ? statBox('Resultat om SL hållits', formatMoney(hypotheticalDayPnl), hypotheticalDayPnl >= 0 ? 'pos' : 'neg', hypotheticalDayPnl) : ''}
    ${statBox('Antal transaktioner', trades.length)}
    ${statBox('Träffsäkerhet', winRate !== null ? winRate.toFixed(0) + '%' : '–')}
    ${statBox('Courtage', formatMoney(totalCommission))}
  </div>`;

  const overtradeHtml = insight.show ? `
    <div class="rule-row" style="background: linear-gradient(120deg, rgba(255,200,92,0.14), rgba(${overtradedWarning ? '255,93,120' : '43,230,160'},0.10)); border: 1px solid rgba(255,200,92,0.35); border-radius: var(--radius); padding: 14px 16px; margin-bottom: 16px;">
      <span>${statusDotHtml(insight.tone)}${escapeHtml(insight.text)}</span>
    </div>
  ` : '';

  let complianceHtml = '';
  if (rules.length > 0) {
    const compliance = evaluateDayCompliance(trades, rules);
    complianceHtml = `
      <div class="rule-row">
        <strong>${compliance.compliant ? statusDotHtml('ok') + 'Alla regler följdes' : compliance.violations.length + ' regelbrott denna dag'}</strong>
      </div>
      <div class="rule-violation-list">
        ${compliance.compliant
          ? '<span class="rule-chip ok">Inga brott</span>'
          : compliance.violations.map(v => `<span class="rule-chip">${escapeHtml(v.rule.name || RULE_TYPES[v.rule.type].label)}: ${escapeHtml(v.detail)}</span>`).join('')}
      </div>
    `;
  }

  const tableRows = trades.map((t, i) => {
    const risk = computeTradeRisk(t, baseMovePct, riskTolerancePct);
    let riskCell = '<span class="muted">–</span>';
    if (risk) {
      const cls = risk.exceeded ? 'num-neg' : risk.nearLimit ? '' : 'muted';
      const style = risk.nearLimit ? 'color: var(--yellow);' : '';
      const title = risk.exceeded
        ? `X${risk.leverage} hävstång · mål ${risk.allowedPct.toFixed(2)}% · gräns m. marginal ${risk.bufferedAllowedPct.toFixed(2)}% · vid hållen SL: -${formatNum(risk.hypotheticalLossKr, 2)} kr (${formatNum(risk.savingsKr, 2)} kr sparat)`
        : `X${risk.leverage} hävstång · mål ${risk.allowedPct.toFixed(2)}% · gräns m. marginal ${risk.bufferedAllowedPct.toFixed(2)}%`;
      riskCell = `<span class="${cls}" style="${style}" title="${title}">${risk.exceeded ? statusDotHtml('warn') : ''}${risk.lossPct.toFixed(2)}% / ${risk.allowedPct.toFixed(2)}%</span>`;
    } else if (!parseLeverage(t.instrument) && t.type === 'Sälj' && t.result < 0) {
      riskCell = '<span class="muted" title="Kunde inte tolka hävstång ur namnet">okänd</span>';
    }
    const isPeakRow = giveback > 0.01 && peakTrade && t === peakTrade;
    return `
    <tr class="${isPeakRow ? 'peak-row' : ''}">
      <td>${i + 1}</td>
      <td class="${t.type === 'Köp' ? 'tag-buy' : 'tag-sell'}">${escapeHtml(t.type)}</td>
      <td>${escapeHtml(t.instrument)}</td>
      <td>${formatNum(t.quantity, 0)}</td>
      <td>${formatNum(t.price, 4)}</td>
      <td>${t.amount != null ? formatMoney(t.amount) : ''}</td>
      <td class="${t.result > 0 ? 'num-pos' : t.result < 0 ? 'num-neg' : ''}">${t.result != null ? formatMoney(t.result) : '–'}</td>
      <td class="${t._running >= 0 ? 'num-pos' : 'num-neg'}">${formatMoney(t._running)}${isPeakRow ? ' <span class="rule-chip ok" style="margin-left:4px;white-space:nowrap;"><span class="status-dot ok" style="margin-right:5px;"></span>Hit borde du stannat</span>' : ''}</td>
      <td>${riskCell}</td>
      <td><button class="btn btn-ghost btn-small journal-from-trade" data-id="${t.id}">+ Journal</button></td>
    </tr>
  `;
  }).join('');

  const riskNoteHtml = overriskedCount > 0 ? `
    <div class="rule-row" style="background: rgba(255,93,120,0.10); border: 1px solid rgba(255,93,120,0.3); border-radius: var(--radius); padding: 12px 16px; margin-bottom: 16px;">
      <span>${statusDotHtml('warn')}${overriskedCount} trade${overriskedCount > 1 ? 's' : ''} denna dag förlorade mer än din riskbudget (${formatNum(baseMovePct, 2)}% × hävstång, motsvarande 55 pips i guldets pris) – även efter marginalen för Avanzas SL-avrundning. Om SL hade hållits på målet hade dagen slutat ${formatMoney(totalSavingsKr)} bättre (${formatMoney(hypotheticalDayPnl)} istället för ${formatMoney(totalPnl)}). Se kolumnen "Risk" i tabellen.</span>
    </div>
  ` : '';

  const groups = computeTradeGroupsForDay(ascTrades);
  const flatTableHtml = `
    <table class="trade-table">
      <thead><tr><th>#</th><th>Typ</th><th>Värdepapper</th><th>Antal</th><th>Kurs</th><th>Belopp</th><th>Resultat</th><th>Löpande</th><th>Risk (faktisk/max)</th><th></th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
  `;
  const groupedHtml = `
    <div class="entry-list">${renderTradeGroups(groups, baseMovePct, riskTolerancePct)}</div>
  `;

  document.getElementById('dayDetailContent').innerHTML = `
    ${statsHtml}
    ${overtradeHtml}
    ${riskNoteHtml}
    ${complianceHtml}
    <div class="reorder-note">
      <span>Ordningen bygger på radordningen i Avanza-filen (ingen klockslagsinformation finns i exporten).</span>
      <button class="btn btn-ghost btn-small" id="reverseOrderBtn" ${viewMode === 'grouped' ? 'disabled style="opacity:0.4;"' : ''}>↕ Vänd ordning</button>
      <button class="btn btn-primary btn-small" id="journalForDayBtn" style="margin-top:0;">+ Journalanteckning för dagen</button>
    </div>
    <div class="filter-row" style="margin-bottom:0;">
      <button class="btn btn-small ${viewMode === 'flat' ? 'btn-primary' : 'btn-secondary'}" id="viewModeFlatBtn" style="margin-top:0;">Enskilda transaktioner</button>
      <button class="btn btn-small ${viewMode === 'grouped' ? 'btn-primary' : 'btn-secondary'}" id="viewModeGroupedBtn" style="margin-top:0;">Grupperade trades (${groups.length}) – TP1/TP2/TP3</button>
    </div>
    <div class="chart-wrap"><canvas id="equityChart"></canvas></div>
    ${viewMode === 'grouped' ? groupedHtml : flatTableHtml}
  `;

  runStatAnimations(document.getElementById('dayDetailContent'));
  drawEquityChart(trades.map((t, i) => String(i + 1)), trades.map(t => t._running), peak);

  document.getElementById('viewModeFlatBtn').addEventListener('click', () => openDayDetail(date, reversed, 'flat'));
  document.getElementById('viewModeGroupedBtn').addEventListener('click', () => openDayDetail(date, reversed, 'grouped'));
  document.querySelectorAll('.group-journal-btn').forEach(btn => {
    btn.addEventListener('click', () => openJournalForm(null, { date, tradeId: parseInt(btn.dataset.tradeId, 10) }));
  });

  document.getElementById('reverseOrderBtn').addEventListener('click', () => { if (viewMode !== 'grouped') openDayDetail(date, !reversed, viewMode); });
  document.getElementById('journalForDayBtn').addEventListener('click', () => openJournalForm(null, { date }));
  document.querySelectorAll('.journal-from-trade').forEach(btn => {
    btn.addEventListener('click', () => openJournalForm(null, { date, tradeId: parseInt(btn.dataset.id, 10) }));
  });

  if (typeof card.scrollIntoView === 'function') {
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function drawEquityChart(labels, data, peak) {
  const ctx = document.getElementById('equityChart');
  if (!ctx) return;
  if (equityChartInstance) equityChartInstance.destroy();
  const datasets = [{
    label: 'Löpande resultat',
    data,
    borderColor: '#6f7bff',
    backgroundColor: 'rgba(111,123,255,0.15)',
    fill: true,
    tension: 0.25,
    pointRadius: 2,
  }];
  if (peak !== undefined && peak !== null && peak > 0) {
    datasets.push({
      label: 'Dagens topp',
      data: labels.map(() => peak),
      borderColor: '#ffc85c',
      borderDash: [6, 4],
      pointRadius: 0,
      fill: false,
      borderWidth: 1.5,
    });
  }
  equityChartInstance = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: '#8992a8' }, grid: { color: '#232a3b' } },
        y: { ticks: { color: '#8992a8' }, grid: { color: '#232a3b' } }
      },
      plugins: { legend: { display: false } }
    }
  });
}

/* ---------- Journal ---------- */
function outcomeLabel(o) { return o === 'win' ? 'Vinst' : o === 'loss' ? 'Förlust' : 'Neutral'; }

function populateTradeSelect(selectEl, trades, selectedId) {
  selectEl.innerHTML = '<option value="">— Ingen specifik trade —</option>' +
    trades.slice().sort((a, b) => a.fileOrder - b.fileOrder).map(t =>
      `<option value="${t.id}" ${selectedId === t.id ? 'selected' : ''}>${escapeHtml(t.type)} ${escapeHtml(t.instrument)} @ ${formatNum(t.price, 4)}${t.result != null ? ' (Resultat: ' + formatMoney(t.result) + ')' : ''}</option>`
    ).join('');
}

async function renderJournalList() {
  const search = document.getElementById('journalSearch').value.toLowerCase();
  const filter = document.getElementById('journalFilter').value;
  let entries = await dbGetAll('journal');
  entries.sort((a, b) => (b.date + (b.createdAt || '')).localeCompare(a.date + (a.createdAt || '')));
  if (filter) entries = entries.filter(e => e.outcome === filter);
  if (search) entries = entries.filter(e => (e.title || '').toLowerCase().includes(search) || (e.text || '').toLowerCase().includes(search));

  const listEl = document.getElementById('journalList');
  if (entries.length === 0) { listEl.innerHTML = '<div class="empty-state">Inga journalanteckningar än.</div>'; return; }

  const withTrades = await Promise.all(entries.map(async e => {
    let tradeInfo = '';
    if (e.tradeId) {
      const t = await dbGet('trades', e.tradeId).catch(() => null);
      if (t) tradeInfo = `${t.type} ${t.instrument} @ ${formatNum(t.price, 4)}${t.result != null ? ' · Resultat: ' + formatMoney(t.result) : ''}`;
    }
    return { e, tradeInfo };
  }));

  listEl.innerHTML = withTrades.map(({ e, tradeInfo }) => `
    <div class="entry-card">
      <div class="entry-card-head">
        <div>
          <div class="entry-card-title">${e.title ? escapeHtml(e.title) : formatDateHuman(e.date)}</div>
          <div class="entry-card-meta">${formatDateHuman(e.date)}${tradeInfo ? ' · ' + escapeHtml(tradeInfo) : ''} · <span class="pill ${e.outcome === 'win' ? 'pos' : e.outcome === 'loss' ? 'neg' : 'neutral'}" style="padding:2px 8px;">${outcomeLabel(e.outcome)}</span></div>
        </div>
        <div class="entry-card-actions"><button class="btn btn-ghost btn-small edit-journal" data-id="${e.id}">Redigera</button></div>
      </div>
      ${e.text ? `<div class="entry-card-body">${escapeHtml(e.text)}</div>` : ''}
      ${e.images && e.images.length ? `<div class="entry-images">${e.images.map(src => `<img src="${src}">`).join('')}</div>` : ''}
    </div>
  `).join('');

  listEl.querySelectorAll('.edit-journal').forEach(btn => {
    btn.addEventListener('click', async () => {
      const entry = await dbGet('journal', parseInt(btn.dataset.id, 10));
      openJournalForm(entry);
    });
  });
}

async function openJournalForm(existing, prefill) {
  const isEdit = !!existing;
  const entry = existing || {
    date: (prefill && prefill.date) || todayISO(),
    tradeId: (prefill && prefill.tradeId) || null,
    title: '', outcome: 'neutral', text: '', images: []
  };
  const images = (entry.images || []).slice();
  const trades = await dbGetAllByIndex('trades', 'date', entry.date).catch(() => []);

  const modalHtml = `
    <h2>${isEdit ? 'Redigera anteckning' : 'Ny journalanteckning'}</h2>
    <div class="form-row">
      <div class="form-group"><label>Datum</label><input type="date" id="jf_date" value="${entry.date}"></div>
      <div class="form-group"><label>Koppla till trade (valfritt)</label><select id="jf_trade"></select></div>
    </div>
    <div class="form-group"><label>Titel</label><input type="text" id="jf_title" value="${escapeHtml(entry.title || '')}" placeholder="Kort rubrik..."></div>
    <div class="form-group"><label>Utfall</label>
      <div class="radio-group" id="jf_outcome">
        <div class="radio-chip win ${entry.outcome === 'win' ? 'selected' : ''}" data-val="win">Vinst</div>
        <div class="radio-chip loss ${entry.outcome === 'loss' ? 'selected' : ''}" data-val="loss">Förlust</div>
        <div class="radio-chip neutral ${(!entry.outcome || entry.outcome === 'neutral') ? 'selected' : ''}" data-val="neutral">Neutral</div>
      </div>
    </div>
    <div class="form-group"><label>Anteckning</label><textarea id="jf_text" placeholder="Hur tänkte du? Vad gick bra/dåligt?">${escapeHtml(entry.text || '')}</textarea></div>
    <div class="form-group"><label>Bilder</label><div class="img-upload-row" id="jf_images"></div></div>
    <div class="modal-actions">
      ${isEdit ? '<button class="btn btn-danger" id="jf_delete">Ta bort</button>' : ''}
      <button class="btn btn-ghost" id="jf_cancel">Avbryt</button>
      <button class="btn btn-primary" id="jf_save">Spara</button>
    </div>
  `;
  openModal(modalHtml);

  populateTradeSelect(document.getElementById('jf_trade'), trades, entry.tradeId);
  renderImageUploadWidget(document.getElementById('jf_images'), images);

  document.getElementById('jf_date').addEventListener('change', async (e) => {
    const newTrades = await dbGetAllByIndex('trades', 'date', e.target.value).catch(() => []);
    populateTradeSelect(document.getElementById('jf_trade'), newTrades, null);
  });
  document.querySelectorAll('#jf_outcome .radio-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#jf_outcome .radio-chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
    });
  });
  document.getElementById('jf_cancel').addEventListener('click', closeModal);
  if (isEdit) {
    document.getElementById('jf_delete').addEventListener('click', async () => {
      if (confirm('Ta bort anteckningen?')) {
        await dbDelete('journal', entry.id);
        closeModal(); renderJournalList(); showToast('Anteckning borttagen');
      }
    });
  }
  document.getElementById('jf_save').addEventListener('click', async () => {
    const date = document.getElementById('jf_date').value;
    if (!date) { alert('Ange ett datum'); return; }
    const tradeSelect = document.getElementById('jf_trade');
    const tradeId = tradeSelect.value ? parseInt(tradeSelect.value, 10) : null;
    const outcomeEl = document.querySelector('#jf_outcome .radio-chip.selected');
    const outcome = outcomeEl ? outcomeEl.dataset.val : 'neutral';
    const title = document.getElementById('jf_title').value.trim();
    const text = document.getElementById('jf_text').value.trim();
    const payload = { date, tradeId, title, outcome, text, images, createdAt: entry.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
    if (isEdit) { payload.id = entry.id; await dbPut('journal', payload); } else { await dbAdd('journal', payload); }
    closeModal(); renderJournalList(); showToast('Sparat');
  });
}

/* ---------- Education ---------- */
const EDU_CATEGORIES = ['Strategi', 'Riskhantering', 'Psykologi', 'Teknisk analys', 'Övrigt'];

async function renderEducationList() {
  const search = document.getElementById('educationSearch').value.toLowerCase();
  const filter = document.getElementById('educationFilter').value;
  let entries = await dbGetAll('education');
  entries.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  if (filter) entries = entries.filter(e => e.category === filter);
  if (search) entries = entries.filter(e => (e.title || '').toLowerCase().includes(search) || (e.content || '').toLowerCase().includes(search));

  const listEl = document.getElementById('educationList');
  if (entries.length === 0) { listEl.innerHTML = '<div class="empty-state">Inget utbildningsmaterial än.</div>'; return; }

  listEl.innerHTML = entries.map(e => `
    <div class="entry-card">
      <div class="entry-card-head">
        <div>
          <div class="entry-card-title">${escapeHtml(e.title)}</div>
          <div class="entry-card-meta"><span class="pill neutral" style="padding:2px 8px;">${escapeHtml(e.category)}</span></div>
        </div>
        <div class="entry-card-actions"><button class="btn btn-ghost btn-small edit-education" data-id="${e.id}">Redigera</button></div>
      </div>
      ${e.content ? `<div class="entry-card-body">${escapeHtml(e.content)}</div>` : ''}
      ${e.images && e.images.length ? `<div class="entry-images">${e.images.map(src => `<img src="${src}">`).join('')}</div>` : ''}
    </div>
  `).join('');

  listEl.querySelectorAll('.edit-education').forEach(btn => {
    btn.addEventListener('click', async () => {
      const entry = await dbGet('education', parseInt(btn.dataset.id, 10));
      openEducationForm(entry);
    });
  });
}

async function openEducationForm(existing) {
  const isEdit = !!existing;
  const entry = existing || { title: '', category: 'Strategi', content: '', images: [] };
  const images = (entry.images || []).slice();

  const modalHtml = `
    <h2>${isEdit ? 'Redigera material' : 'Nytt utbildningsmaterial'}</h2>
    <div class="form-group"><label>Titel</label><input type="text" id="ef_title" value="${escapeHtml(entry.title)}"></div>
    <div class="form-group"><label>Kategori</label><select id="ef_category">
      ${EDU_CATEGORIES.map(c => `<option value="${c}" ${entry.category === c ? 'selected' : ''}>${c}</option>`).join('')}
    </select></div>
    <div class="form-group"><label>Innehåll</label><textarea id="ef_content" placeholder="Beskriv strategin, regler, lärdomar...">${escapeHtml(entry.content || '')}</textarea></div>
    <div class="form-group"><label>Bilder</label><div class="img-upload-row" id="ef_images"></div></div>
    <div class="modal-actions">
      ${isEdit ? '<button class="btn btn-danger" id="ef_delete">Ta bort</button>' : ''}
      <button class="btn btn-ghost" id="ef_cancel">Avbryt</button>
      <button class="btn btn-primary" id="ef_save">Spara</button>
    </div>
  `;
  openModal(modalHtml);
  renderImageUploadWidget(document.getElementById('ef_images'), images);
  document.getElementById('ef_cancel').addEventListener('click', closeModal);
  if (isEdit) {
    document.getElementById('ef_delete').addEventListener('click', async () => {
      if (confirm('Ta bort materialet?')) {
        await dbDelete('education', entry.id);
        closeModal(); renderEducationList(); showToast('Borttaget');
      }
    });
  }
  document.getElementById('ef_save').addEventListener('click', async () => {
    const title = document.getElementById('ef_title').value.trim();
    if (!title) { alert('Ange en titel'); return; }
    const category = document.getElementById('ef_category').value;
    const content = document.getElementById('ef_content').value.trim();
    const payload = { title, category, content, images, createdAt: entry.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
    if (isEdit) { payload.id = entry.id; await dbPut('education', payload); } else { await dbAdd('education', payload); }
    closeModal(); renderEducationList(); showToast('Sparat');
  });
}

/* ---------- Gold Bias ---------- */
async function renderBiasStats() {
  const entries = await dbGetAll('goldbias');
  const statsEl = document.getElementById('biasStats');
  const today = todayISO();
  const todaysEntries = entries.filter(e => e.date === today).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  const todayEntry = todaysEntries[0];
  const bullish = entries.filter(e => e.direction === 'Bullish').length;
  const bearish = entries.filter(e => e.direction === 'Bearish').length;
  statsEl.innerHTML =
    statBox('Dagens bias', todayEntry ? todayEntry.direction : 'Ej loggad', todayEntry ? (todayEntry.direction === 'Bullish' ? 'pos' : todayEntry.direction === 'Bearish' ? 'neg' : '') : '') +
    statBox('Totalt loggade', entries.length) +
    statBox('Bullish-dagar', bullish) +
    statBox('Bearish-dagar', bearish);
}

async function renderBiasList() {
  renderBiasStats();
  const filter = document.getElementById('biasFilter').value;
  let entries = await dbGetAll('goldbias');
  entries.sort((a, b) => (b.date + (b.createdAt || '')).localeCompare(a.date + (a.createdAt || '')));
  if (filter) entries = entries.filter(e => e.direction === filter);

  const listEl = document.getElementById('biasList');
  if (entries.length === 0) { listEl.innerHTML = '<div class="empty-state">Ingen bias loggad än.</div>'; return; }

  listEl.innerHTML = entries.map(e => `
    <div class="entry-card">
      <div class="entry-card-head">
        <div>
          <div class="entry-card-title">${formatDateHuman(e.date)}</div>
          <div class="entry-card-meta">
            <span class="pill ${e.direction === 'Bullish' ? 'pos' : e.direction === 'Bearish' ? 'neg' : 'neutral'}" style="padding:2px 8px;">${escapeHtml(e.direction)}</span>
            ${e.confidence ? ' · Säkerhet: ' + escapeHtml(e.confidence) : ''}
          </div>
        </div>
        <div class="entry-card-actions"><button class="btn btn-ghost btn-small edit-bias" data-id="${e.id}">Redigera</button></div>
      </div>
      ${e.notes ? `<div class="entry-card-body">${escapeHtml(e.notes)}</div>` : ''}
      ${e.images && e.images.length ? `<div class="entry-images">${e.images.map(src => `<img src="${src}">`).join('')}</div>` : ''}
    </div>
  `).join('');

  listEl.querySelectorAll('.edit-bias').forEach(btn => {
    btn.addEventListener('click', async () => {
      const entry = await dbGet('goldbias', parseInt(btn.dataset.id, 10));
      openBiasForm(entry);
    });
  });
}

async function openBiasForm(existing) {
  const isEdit = !!existing;
  const entry = existing || { date: todayISO(), direction: 'Neutral', confidence: 'Medel', notes: '', images: [] };
  const images = (entry.images || []).slice();

  const modalHtml = `
    <h2>${isEdit ? 'Redigera bias' : 'Ny guldbias'}</h2>
    <div class="form-row">
      <div class="form-group"><label>Datum</label><input type="date" id="bf_date" value="${entry.date}"></div>
      <div class="form-group"><label>Säkerhet</label><select id="bf_confidence">
        ${['Låg', 'Medel', 'Hög'].map(c => `<option value="${c}" ${entry.confidence === c ? 'selected' : ''}>${c}</option>`).join('')}
      </select></div>
    </div>
    <div class="form-group"><label>Riktning</label>
      <div class="radio-group" id="bf_direction">
        <div class="radio-chip Bullish ${entry.direction === 'Bullish' ? 'selected' : ''}" data-val="Bullish">Bullish</div>
        <div class="radio-chip Bearish ${entry.direction === 'Bearish' ? 'selected' : ''}" data-val="Bearish">Bearish</div>
        <div class="radio-chip Neutral ${(!entry.direction || entry.direction === 'Neutral') ? 'selected' : ''}" data-val="Neutral">Neutral</div>
      </div>
    </div>
    <div class="form-group"><label>Resonemang</label><textarea id="bf_notes" placeholder="Varför denna bias? Nivåer, nyheter, teknisk bild...">${escapeHtml(entry.notes || '')}</textarea></div>
    <div class="form-group"><label>Bilder (t.ex. chart-screenshot)</label><div class="img-upload-row" id="bf_images"></div></div>
    <div class="modal-actions">
      ${isEdit ? '<button class="btn btn-danger" id="bf_delete">Ta bort</button>' : ''}
      <button class="btn btn-ghost" id="bf_cancel">Avbryt</button>
      <button class="btn btn-primary" id="bf_save">Spara</button>
    </div>
  `;
  openModal(modalHtml);
  renderImageUploadWidget(document.getElementById('bf_images'), images);
  document.querySelectorAll('#bf_direction .radio-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#bf_direction .radio-chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
    });
  });
  document.getElementById('bf_cancel').addEventListener('click', closeModal);
  if (isEdit) {
    document.getElementById('bf_delete').addEventListener('click', async () => {
      if (confirm('Ta bort bias-anteckningen?')) {
        await dbDelete('goldbias', entry.id);
        closeModal(); renderBiasList(); showToast('Borttaget');
      }
    });
  }
  document.getElementById('bf_save').addEventListener('click', async () => {
    const date = document.getElementById('bf_date').value;
    if (!date) { alert('Ange datum'); return; }
    const confidence = document.getElementById('bf_confidence').value;
    const dirEl = document.querySelector('#bf_direction .radio-chip.selected');
    const direction = dirEl ? dirEl.dataset.val : 'Neutral';
    const notes = document.getElementById('bf_notes').value.trim();
    const payload = { date, direction, confidence, notes, images, createdAt: entry.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
    if (isEdit) { payload.id = entry.id; await dbPut('goldbias', payload); } else { await dbAdd('goldbias', payload); }
    closeModal(); renderBiasList(); showToast('Sparat');
  });
}

/* ---------- Trading Rules & Compliance ---------- */
const RULE_TYPES = {
  max_risk_pct_leveraged: {
    label: 'Max risk per trade (hävstångsjusterad)',
    unit: '% rörelse i guldpriset (vid din SL i pips)',
    desc: t => `Mål-maxförlust = ${formatNum(t, 2)}% × certifikatets hävstång (X-talet i namnet, t.ex. X20). Eftersom Avanzas SL inte går att sätta i exakt %, tillåts en marginal ovanpå målet (se nedan) innan en trade räknas som överriskad.`,
  },
  max_daily_loss: { label: 'Max förlust per dag', unit: 'kr', desc: t => `Dagens resultat får inte understiga -${formatNum(t, 2)} kr` },
  max_loss_per_trade: { label: 'Max förlust per trade', unit: 'kr', desc: t => `Ingen enskild trade får förlora mer än ${formatNum(t, 2)} kr` },
  max_trades_per_day: { label: 'Max antal trades per dag', unit: 'st', desc: t => `Max ${formatNum(t, 0)} transaktioner per dag` },
  min_daily_winrate: { label: 'Min träffsäkerhet per dag', unit: '%', desc: t => `Minst ${formatNum(t, 0)}% träffsäkerhet (dagar med 3+ avslut)` },
  max_losing_positions_per_day: { label: 'Max antal SL (förlorande positioner) per dag', unit: 'st', desc: t => `Max ${formatNum(t, 0)} förlorande position${t === 1 ? '' : 'er'} per dag (positioner räknas ihopgrupperade, dvs. entry + ev. TP1/TP2/TP3 räknas som en position)` },
};

const RULE_DEFAULT_THRESHOLDS = {
  max_risk_pct_leveraged: 0.12,
  max_daily_loss: 500,
  max_loss_per_trade: 300,
  max_trades_per_day: 20,
  min_daily_winrate: 40,
  max_losing_positions_per_day: 2,
};

/* Avanzas SL-funktion tar inte emot ett exakt %-värde, så en satt stop hamnar sällan exakt på målet.
   Den här marginalen (i procent, relativt målet) gör att småavvikelser inte räknas som regelbrott. */
const RULE_DEFAULT_TOLERANCE_PCT = 15;

/* Hämtar hävstången (X-talet) ur certifikatnamnet, t.ex. "BEAR GULD X20 AVA 1" -> 20 */
function parseLeverage(instrument) {
  const m = /X\s?(\d+(?:[.,]\d+)?)/i.exec(instrument || '');
  if (!m) return null;
  const v = parseFloat(m[1].replace(',', '.'));
  return isNaN(v) || v <= 0 ? null : v;
}

/*
 * Beräknar hur stor andel (%) av positionens värde som gick förlorad på en stängd (Sälj-)trade,
 * och jämför mot vad som borde vara maximalt givet hävstången och den tillåtna rörelsen i underliggande.
 * Kostnadsbasen approximeras ur Avanzas snittprisberäkning: Belopp (inbetalning vid sälj) - Resultat = ursprunglig kostnad.
 */
function computeTradeRisk(trade, baseMovePct, tolerancePct) {
  if (!trade || trade.type !== 'Sälj') return null;
  if (trade.result === null || trade.result === undefined || trade.result >= 0) return null;
  if (trade.amount === null || trade.amount === undefined) return null;
  const leverage = parseLeverage(trade.instrument);
  if (!leverage) return null;
  const costBasis = trade.amount - trade.result;
  if (!costBasis || costBasis <= 0) return null;
  const lossPct = (-trade.result / costBasis) * 100;
  const allowedPct = baseMovePct * leverage;
  const tol = tolerancePct === undefined || tolerancePct === null ? RULE_DEFAULT_TOLERANCE_PCT : tolerancePct;
  const bufferedAllowedPct = allowedPct * (1 + tol / 100);
  const exceeded = lossPct > bufferedAllowedPct;
  // Hypotetiskt: vad förlusten hade blivit om SL faktiskt legat på mål-%:et (2,4% vid X20 osv).
  const hypotheticalLossKr = costBasis * (allowedPct / 100);
  const savingsKr = exceeded ? (-trade.result) - hypotheticalLossKr : 0;
  return {
    leverage, costBasis, lossPct, allowedPct, bufferedAllowedPct,
    nearLimit: lossPct > allowedPct && lossPct <= bufferedAllowedPct,
    exceeded,
    hypotheticalLossKr,
    savingsKr,
  };
}

function evaluateDayCompliance(dayTrades, rules) {
  const activeRules = rules.filter(r => r.active !== false);
  const violations = [];
  const dayPnl = dayTrades.reduce((s, t) => s + (t.result || 0), 0);
  const withResult = dayTrades.filter(t => t.result !== null && t.result !== undefined);
  const wins = withResult.filter(t => t.result > 0).length;
  const losses = withResult.filter(t => t.result < 0).length;
  const winRate = (wins + losses) > 0 ? (wins / (wins + losses) * 100) : null;

  activeRules.forEach(r => {
    if (r.type === 'max_daily_loss' && dayPnl < -r.threshold) {
      violations.push({ rule: r, detail: `${formatMoney(dayPnl)} (gräns -${formatNum(r.threshold, 2)} kr)` });
    }
    if (r.type === 'max_loss_per_trade') {
      const worst = dayTrades.reduce((min, t) => (t.result !== null && t.result < min) ? t.result : min, 0);
      if (worst < -r.threshold) {
        violations.push({ rule: r, detail: `Störst förlust ${formatMoney(worst)} (gräns -${formatNum(r.threshold, 2)} kr)` });
      }
    }
    if (r.type === 'max_trades_per_day' && dayTrades.length > r.threshold) {
      violations.push({ rule: r, detail: `${dayTrades.length} transaktioner (gräns ${formatNum(r.threshold, 0)})` });
    }
    if (r.type === 'min_daily_winrate' && winRate !== null && (wins + losses) >= 3 && winRate < r.threshold) {
      violations.push({ rule: r, detail: `${winRate.toFixed(0)}% (gräns ${formatNum(r.threshold, 0)}%)` });
    }
    if (r.type === 'max_risk_pct_leveraged') {
      dayTrades.forEach(t => {
        const risk = computeTradeRisk(t, r.threshold, r.tolerancePct);
        if (risk && risk.exceeded) {
          violations.push({ rule: r, detail: `${t.instrument}: -${risk.lossPct.toFixed(2)}% (mål ${risk.allowedPct.toFixed(2)}%, gräns m. marginal ${risk.bufferedAllowedPct.toFixed(2)}% vid X${risk.leverage})` });
        }
      });
    }
    if (r.type === 'max_losing_positions_per_day') {
      const groups = computeTradeGroupsForDay(dayTrades);
      const losingGroups = groups.filter(g => g.totalResult < 0);
      if (losingGroups.length > r.threshold) {
        violations.push({ rule: r, detail: `${losingGroups.length} förlorande position${losingGroups.length === 1 ? '' : 'er'} (gräns ${formatNum(r.threshold, 0)})` });
      }
    }
  });

  return { activeRuleCount: activeRules.length, violations, compliant: violations.length === 0 };
}

async function renderRuleStats() {
  const rules = await dbGetAll('rules');
  const trades = await dbGetAll('trades');
  const statsEl = document.getElementById('ruleStats');
  if (rules.length === 0) {
    statsEl.innerHTML = '';
    return;
  }
  const byDate = {};
  trades.forEach(t => { (byDate[t.date] = byDate[t.date] || []).push(t); });
  const dates = Object.keys(byDate);
  let compliantDays = 0;
  dates.forEach(d => {
    const r = evaluateDayCompliance(byDate[d], rules);
    if (r.compliant) compliantDays++;
  });
  const pct = dates.length > 0 ? Math.round((compliantDays / dates.length) * 100) : null;

  const riskRule = rules.find(r => r.type === 'max_risk_pct_leveraged' && r.active !== false);
  let riskStatHtml = '';
  if (riskRule) {
    let overriskedCount = 0, riskEvaluated = 0;
    trades.forEach(t => {
      const risk = computeTradeRisk(t, riskRule.threshold, riskRule.tolerancePct);
      if (risk) { riskEvaluated++; if (risk.exceeded) overriskedCount++; }
    });
    riskStatHtml = statBox('Överriskade trades', riskEvaluated ? `${overriskedCount}/${riskEvaluated}` : '–', overriskedCount > 0 ? 'neg' : '');
  }

  statsEl.innerHTML =
    statBox('Aktiva regler', rules.filter(r => r.active !== false).length) +
    statBox('Dagar utvärderade', dates.length) +
    statBox('Dagar utan regelbrott', dates.length ? `${compliantDays}/${dates.length}` : '–') +
    statBox('Regelefterlevnad', pct !== null ? pct + '%' : '–', pct !== null ? (pct >= 80 ? 'pos' : pct >= 50 ? '' : 'neg') : '') +
    riskStatHtml;
}

async function renderRulesList() {
  renderRuleStats();
  const rules = await dbGetAll('rules');
  const listEl = document.getElementById('rulesList');
  if (rules.length === 0) {
    listEl.innerHTML = '<div class="empty-state">Inga regler ännu. Lägg till din första riskregel för att börja mäta disciplin.</div>';
    return;
  }
  listEl.innerHTML = rules.map(r => {
    const meta = RULE_TYPES[r.type] || { label: r.type, desc: () => '' };
    const tolNote = r.type === 'max_risk_pct_leveraged'
      ? ` Marginal: ${formatNum(r.tolerancePct !== undefined && r.tolerancePct !== null ? r.tolerancePct : RULE_DEFAULT_TOLERANCE_PCT, 0)}% (för Avanzas SL-avrundning).`
      : '';
    return `
    <div class="entry-card">
      <div class="entry-card-head">
        <div>
          <div class="entry-card-title">${escapeHtml(r.name || meta.label)}</div>
          <div class="entry-card-meta">${escapeHtml(meta.desc(r.threshold))}${escapeHtml(tolNote)} ${r.active === false ? '· <span class="rule-chip">Inaktiv</span>' : '· <span class="rule-chip ok">Aktiv</span>'}</div>
        </div>
        <div class="entry-card-actions"><button class="btn btn-ghost btn-small edit-rule" data-id="${r.id}">Redigera</button></div>
      </div>
    </div>`;
  }).join('');
  listEl.querySelectorAll('.edit-rule').forEach(btn => {
    btn.addEventListener('click', async () => {
      const rule = await dbGet('rules', parseInt(btn.dataset.id, 10));
      openRuleForm(rule);
    });
  });
}

async function openRuleForm(existing) {
  const isEdit = !!existing;
  const rule = existing || { name: '', type: 'max_risk_pct_leveraged', threshold: RULE_DEFAULT_THRESHOLDS.max_risk_pct_leveraged, tolerancePct: RULE_DEFAULT_TOLERANCE_PCT, active: true };
  const typeOptions = Object.keys(RULE_TYPES).map(k => `<option value="${k}" ${rule.type === k ? 'selected' : ''}>${RULE_TYPES[k].label}</option>`).join('');
  const isRiskType = rule.type === 'max_risk_pct_leveraged';
  const tolValue = rule.tolerancePct !== undefined && rule.tolerancePct !== null ? rule.tolerancePct : RULE_DEFAULT_TOLERANCE_PCT;
  const modalHtml = `
    <h2>${isEdit ? 'Redigera regel' : 'Ny regel'}</h2>
    <div class="form-group"><label>Namn (valfritt)</label><input type="text" id="rf_name" value="${escapeHtml(rule.name || '')}" placeholder="T.ex. Daglig förlustgräns"></div>
    <div class="form-row">
      <div class="form-group"><label>Typ av regel</label><select id="rf_type">${typeOptions}</select></div>
      <div class="form-group"><label>Gränsvärde (<span id="rf_unit">${(RULE_TYPES[rule.type] || {}).unit || ''}</span>)</label><input type="text" id="rf_threshold" value="${formatNum(rule.threshold, 2)}"></div>
    </div>
    <div class="form-group ${isRiskType ? '' : 'hidden'}" id="rf_tolerance_group">
      <label>Marginal utöver målet (%) – för att Avanzas SL inte går att sätta exakt</label>
      <input type="text" id="rf_tolerance" value="${formatNum(tolValue, 0)}">
    </div>
    <p class="muted small" id="rf_desc">${(RULE_TYPES[rule.type] || {}).desc ? RULE_TYPES[rule.type].desc(rule.threshold) : ''}</p>
    <div class="form-group">
      <label><input type="checkbox" id="rf_active" ${rule.active !== false ? 'checked' : ''} style="width:auto;margin-right:8px;">Aktiv</label>
    </div>
    <div class="modal-actions">
      ${isEdit ? '<button class="btn btn-danger" id="rf_delete">Ta bort</button>' : ''}
      <button class="btn btn-ghost" id="rf_cancel">Avbryt</button>
      <button class="btn btn-primary" id="rf_save">Spara</button>
    </div>
  `;
  openModal(modalHtml);
  document.getElementById('rf_type').addEventListener('change', (e) => {
    const meta = RULE_TYPES[e.target.value] || {};
    document.getElementById('rf_unit').textContent = meta.unit || '';
    const defaultVal = RULE_DEFAULT_THRESHOLDS[e.target.value];
    if (defaultVal !== undefined) document.getElementById('rf_threshold').value = formatNum(defaultVal, 2);
    document.getElementById('rf_desc').textContent = meta.desc ? meta.desc(defaultVal !== undefined ? defaultVal : 0) : '';
    document.getElementById('rf_tolerance_group').classList.toggle('hidden', e.target.value !== 'max_risk_pct_leveraged');
    if (e.target.value === 'max_risk_pct_leveraged' && !document.getElementById('rf_tolerance').value) {
      document.getElementById('rf_tolerance').value = formatNum(RULE_DEFAULT_TOLERANCE_PCT, 0);
    }
  });
  document.getElementById('rf_threshold').addEventListener('input', (e) => {
    const meta = RULE_TYPES[document.getElementById('rf_type').value] || {};
    const v = parseSwedishNumber(e.target.value);
    document.getElementById('rf_desc').textContent = meta.desc && v !== null ? meta.desc(v) : '';
  });
  document.getElementById('rf_cancel').addEventListener('click', closeModal);
  if (isEdit) {
    document.getElementById('rf_delete').addEventListener('click', async () => {
      if (confirm('Ta bort regeln?')) {
        await dbDelete('rules', rule.id);
        closeModal(); renderRulesList(); showToast('Regel borttagen');
      }
    });
  }
  document.getElementById('rf_save').addEventListener('click', async () => {
    const name = document.getElementById('rf_name').value.trim();
    const type = document.getElementById('rf_type').value;
    const threshold = parseSwedishNumber(document.getElementById('rf_threshold').value);
    if (threshold === null || isNaN(threshold)) { alert('Ange ett giltigt gränsvärde'); return; }
    const active = document.getElementById('rf_active').checked;
    const payload = { name, type, threshold, active };
    if (type === 'max_risk_pct_leveraged') {
      const tol = parseSwedishNumber(document.getElementById('rf_tolerance').value);
      payload.tolerancePct = (tol === null || isNaN(tol)) ? RULE_DEFAULT_TOLERANCE_PCT : tol;
    }
    if (isEdit) { payload.id = rule.id; await dbPut('rules', payload); } else { await dbAdd('rules', payload); }
    closeModal(); renderRulesList(); renderOverview(); showToast('Sparat');
  });
}

/* ---------- Calendar Heatmap ---------- */
let heatmapCursor = new Date();
heatmapCursor.setDate(1);
let heatmapMetric = 'final'; // 'final' = dagens slutresultat, 'peak' = dagens bästa (topp) resultat

async function renderHeatmap() {
  const trades = await dbGetAll('trades');
  const rules = await dbGetAll('rules');
  const byDate = {};
  trades.forEach(t => { (byDate[t.date] = byDate[t.date] || []).push(t); });

  const year = heatmapCursor.getFullYear();
  const month = heatmapCursor.getMonth();
  const monthLabel = heatmapCursor.toLocaleDateString('sv-SE', { month: 'long', year: 'numeric' });
  document.getElementById('heatmapMonthLabel').textContent = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  // Cacha dagsstatistik per datum (behövs för både färgskala och visat värde)
  const statsByDate = {};
  Object.keys(byDate).forEach(d => { statsByDate[d] = computeDayStats(byDate[d]); });

  const metricValue = (d) => heatmapMetric === 'peak' ? statsByDate[d].peak : statsByDate[d].totalPnl;

  const maxAbs = Object.keys(statsByDate).reduce((max, d) => Math.max(max, Math.abs(metricValue(d))), 0) || 1;

  const firstOfMonth = new Date(year, month, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const dowLabels = ['MÅN', 'TIS', 'ONS', 'TOR', 'FRE', 'LÖR', 'SÖN'];
  let html = dowLabels.map(d => `<div class="heatmap-dow">${d}</div>`).join('');
  for (let i = 0; i < startOffset; i++) html += '<div class="heatmap-cell"></div>';

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayTrades = byDate[dateStr];
    let cls = 'heatmap-cell';
    let pnlLabel = '';
    if (dayTrades && dayTrades.length) {
      const val = metricValue(dateStr);
      const intensity = Math.min(4, Math.max(1, Math.ceil((Math.abs(val) / maxAbs) * 4)));
      cls += val >= 0 ? ` has-trades win-${intensity}` : ` has-trades loss-${intensity}`;
      const stats = statsByDate[dateStr];
      const overtradeMark = stats.giveback > 0.01 ? '<span title="Gav tillbaka från toppen">↩</span>' : '';
      pnlLabel = `<div class="dpnl">${val >= 0 ? '+' : ''}${Math.round(val)} ${overtradeMark}</div>`;
      if (rules.length) {
        const compliance = evaluateDayCompliance(dayTrades, rules);
        if (!compliance.compliant) cls += ' rule-flag';
      }
    }
    html += `<div class="${cls}" data-date="${dateStr}"><div class="dnum">${day}</div>${pnlLabel}</div>`;
  }

  const grid = document.getElementById('heatmapGrid');
  grid.innerHTML = html;
  grid.querySelectorAll('.heatmap-cell.has-trades').forEach(cell => {
    cell.addEventListener('click', () => openDayInfoModal(cell.dataset.date));
  });
}

function setupHeatmapNav() {
  document.getElementById('heatmapPrev').addEventListener('click', () => {
    heatmapCursor.setMonth(heatmapCursor.getMonth() - 1);
    renderHeatmap();
  });
  document.getElementById('heatmapNext').addEventListener('click', () => {
    heatmapCursor.setMonth(heatmapCursor.getMonth() + 1);
    renderHeatmap();
  });
  document.getElementById('heatmapMetricFinalBtn').addEventListener('click', () => {
    heatmapMetric = 'final';
    document.getElementById('heatmapMetricFinalBtn').className = 'btn btn-small btn-primary';
    document.getElementById('heatmapMetricPeakBtn').className = 'btn btn-small btn-secondary';
    renderHeatmap();
  });
  document.getElementById('heatmapMetricPeakBtn').addEventListener('click', () => {
    heatmapMetric = 'peak';
    document.getElementById('heatmapMetricPeakBtn').className = 'btn btn-small btn-primary';
    document.getElementById('heatmapMetricFinalBtn').className = 'btn btn-small btn-secondary';
    renderHeatmap();
  });
}

function setupOverviewMetricToggle() {
  document.getElementById('overviewMetricFinalBtn').addEventListener('click', () => {
    overviewMetric = 'final';
    document.getElementById('overviewMetricFinalBtn').className = 'btn btn-small btn-primary';
    document.getElementById('overviewMetricPeakBtn').className = 'btn btn-small btn-secondary';
    renderOverview();
  });
  document.getElementById('overviewMetricPeakBtn').addEventListener('click', () => {
    overviewMetric = 'peak';
    document.getElementById('overviewMetricPeakBtn').className = 'btn btn-small btn-primary';
    document.getElementById('overviewMetricFinalBtn').className = 'btn btn-small btn-secondary';
    renderOverview();
  });
}

/* ---------- Gamification: streaks & badges ---------- */
async function computeStreaks() {
  const trades = await dbGetAll('trades');
  const byDate = {};
  trades.forEach(t => { (byDate[t.date] = byDate[t.date] || []).push(t); });
  const dates = Object.keys(byDate).sort();
  let current = 0, best = 0, running = 0;
  dates.forEach(d => {
    const pnl = byDate[d].reduce((s, t) => s + (t.result || 0), 0);
    if (pnl > 0) { running++; best = Math.max(best, running); }
    else { running = 0; }
  });
  // current streak = trailing positive days from the most recent date backwards
  for (let i = dates.length - 1; i >= 0; i--) {
    const pnl = byDate[dates[i]].reduce((s, t) => s + (t.result || 0), 0);
    if (pnl > 0) current++; else break;
  }
  return { current, best, tradingDays: dates.length };
}

const BADGE_DEFS = [
  { id: 'first_import', icon: 'GO', label: 'Första importen', check: (ctx) => ctx.tradeCount >= 1 },
  { id: 'ten_trades', icon: '10', label: '10 trades loggade', check: (ctx) => ctx.tradeCount >= 10 },
  { id: 'fifty_trades', icon: '50', label: '50 trades loggade', check: (ctx) => ctx.tradeCount >= 50 },
  { id: 'streak3', icon: '3×', label: '3 vinstdagar i rad', check: (ctx) => ctx.bestStreak >= 3 },
  { id: 'streak7', icon: '7×', label: '7 vinstdagar i rad', check: (ctx) => ctx.bestStreak >= 7 },
  { id: 'journaler', icon: 'J', label: 'Journalförare (5+)', check: (ctx) => ctx.journalCount >= 5 },
  { id: 'educated', icon: 'E', label: 'Utbildad (3+ material)', check: (ctx) => ctx.educationCount >= 3 },
  { id: 'bias_tracker', icon: 'Au', label: 'Guldbias-koll (5+)', check: (ctx) => ctx.biasCount >= 5 },
  { id: 'rule_setter', icon: 'R', label: 'Regler satta', check: (ctx) => ctx.ruleCount >= 1 },
];

async function renderAchievements() {
  const [trades, journal, education, goldbias, rules] = await Promise.all([
    dbGetAll('trades'), dbGetAll('journal'), dbGetAll('education'), dbGetAll('goldbias'), dbGetAll('rules')
  ]);
  const streaks = await computeStreaks();
  const ctx = {
    tradeCount: trades.length,
    journalCount: journal.length,
    educationCount: education.length,
    biasCount: goldbias.length,
    ruleCount: rules.length,
    bestStreak: streaks.best,
  };

  const banner = document.getElementById('streakBanner');
  if (trades.length === 0) {
    banner.innerHTML = `<span class="muted">Importera trades för att börja bygga din statistik och dina badges.</span>`;
  } else {
    banner.innerHTML = `
      <span class="streak-icon"></span>
      <div class="streak-figure"><span class="num">${streaks.current}</span><span class="lbl">Nuvarande vinststreak</span></div>
      <div class="streak-figure"><span class="num">${streaks.best}</span><span class="lbl">Bästa streak</span></div>
      <div class="streak-figure"><span class="num">${streaks.tradingDays}</span><span class="lbl">Handelsdagar totalt</span></div>
    `;
  }

  const shelf = document.getElementById('badgeShelf');
  shelf.innerHTML = BADGE_DEFS.map(b => {
    const unlocked = b.check(ctx);
    return `<div class="badge ${unlocked ? 'unlocked' : ''}"><span class="icon">${b.icon}</span>${escapeHtml(b.label)}</div>`;
  }).join('');
}

/* ---------- Animated numbers ---------- */
function animateNumber(el, targetValue, formatter) {
  if (!el) return;
  const duration = 700;
  const start = performance.now();
  const from = 0;
  function tick(now) {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    const val = from + (targetValue - from) * eased;
    el.textContent = formatter(val);
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = formatter(targetValue);
  }
  requestAnimationFrame(tick);
}

/* ---------- Navigation & init ---------- */
/*
 * Byter aktiv flik och kör respektive render-funktion. Returnerar render-funktionens promise så
 * att anropare kan invänta att sidan faktiskt är klarritad innan de gör något beroende av det
 * (t.ex. öppna dagsdetalj direkt efter – annars kan renderOverview()'s "dölj dagsdetalj"-rad
 * hinna köra EFTER att dagsdetaljen redan visats, i fel ordning, och osynliggöra den igen).
 */
function switchView(view) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  document.getElementById('view-' + view).classList.remove('hidden');
  if (view === 'overview') return renderOverview();
  if (view === 'import') return renderImportHistory();
  if (view === 'journal') return renderJournalList();
  if (view === 'education') return renderEducationList();
  if (view === 'goldbias') return renderBiasList();
  if (view === 'rules') return renderRulesList();
}

function setupGlobalUI() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });
  document.getElementById('closeDayDetail').addEventListener('click', () => {
    document.getElementById('dayDetailCard').classList.add('hidden');
  });
  document.getElementById('modalBackdrop').addEventListener('click', (e) => {
    if (e.target.id === 'modalBackdrop') closeModal();
  });
  document.getElementById('lightbox').addEventListener('click', (e) => {
    if (e.target.id === 'lightbox' || e.target.id === 'lightboxClose') closeLightbox();
  });
  document.addEventListener('click', (e) => {
    if (e.target.matches('.entry-images img')) openLightbox(e.target.src);
  });

  document.getElementById('newJournalBtn').addEventListener('click', () => openJournalForm(null));
  document.getElementById('newEducationBtn').addEventListener('click', () => openEducationForm(null));
  document.getElementById('newBiasBtn').addEventListener('click', () => openBiasForm(null));
  document.getElementById('newRuleBtn').addEventListener('click', () => openRuleForm(null));

  document.getElementById('journalSearch').addEventListener('input', renderJournalList);
  document.getElementById('journalFilter').addEventListener('change', renderJournalList);
  document.getElementById('educationSearch').addEventListener('input', renderEducationList);
  document.getElementById('educationFilter').addEventListener('change', renderEducationList);
  document.getElementById('biasFilter').addEventListener('change', renderBiasList);

  setupHeatmapNav();
  setupOverviewMetricToggle();
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await openDB();
  } catch (err) {
    console.error('IndexedDB kunde inte öppnas', err);
    showToast('Kunde inte öppna lokal lagring i webbläsaren.');
  }
  setupGlobalUI();
  setupImport();
  renderOverview();
});
