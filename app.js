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
function showToast(msg, durationMs) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), durationMs || 2400);
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

/* ---------- Generell filuppladdning (t.ex. avräkningsnota/PDF) ---------- */
// Till skillnad från bilder komprimeras dessa inte (kan inte förlustfritt canvas-komprimera en PDF)
// och de renderas som nedladdningsbara filchips istället för miniatyrbilder.
function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Kunde inte läsa filen'));
    reader.readAsDataURL(file);
  });
}

function fileChipHtml(f, removable, i) {
  return `<span class="file-chip">
    <a href="${f.dataUrl}" target="_blank" rel="noopener" download="${escapeHtml(f.name)}" title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</a>
    ${removable ? `<button type="button" class="remove-file" data-i="${i}">✕</button>` : ''}
  </span>`;
}

function renderFileUploadWidget(containerEl, filesArr) {
  const inputId = containerEl.id + '_input';
  containerEl.innerHTML =
    filesArr.map((f, i) => fileChipHtml(f, true, i)).join('') +
    `<label class="file-add-btn" for="${inputId}">+ Bifoga PDF (t.ex. avräkningsnota)<input type="file" accept="application/pdf,.pdf" multiple hidden id="${inputId}"></label>`;

  containerEl.querySelectorAll('.remove-file').forEach(btn => {
    btn.addEventListener('click', () => {
      filesArr.splice(parseInt(btn.dataset.i, 10), 1);
      renderFileUploadWidget(containerEl, filesArr);
    });
  });
  const input = containerEl.querySelector('input[type=file]');
  input.addEventListener('change', async (e) => {
    const chosen = Array.from(e.target.files);
    for (const f of chosen) {
      try {
        const dataUrl = await readFileAsDataUrl(f);
        filesArr.push({ name: f.name, dataUrl });
      } catch (err) { console.error(err); }
    }
    renderFileUploadWidget(containerEl, filesArr);
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
    });
  }
  // Avanzas transaktionsexport listar raderna NYAST FÖRST (senaste transaktionen överst i filen) –
  // men resten av appen (ihopparning av Köp/Sälj-ben till positioner, "löpande resultat", vilket ben
  // som är dagens topp osv) förutsätter att en STIGANDE fileOrder motsvarar kronologisk ordning, äldst
  // till nyast. Utan denna vändning paras positionerna ihop i fel riktning – ett helt normalt Köp-sen-
  // Sälj samma dag läses som Sälj-sen-Köp och flaggas felaktigt som "position öppnad innan denna dag",
  // och "Trade 1" hamnar på dagens SISTA position istället för den första. Verifierat mot exakta
  // klockslag från riktiga avräkningsnotor. Sista raden i filen (kronologiskt äldst) får fileOrder 0.
  const n = rows.length;
  rows.forEach((r, idx) => { r.fileOrder = n - 1 - idx; });
  return rows;
}

/* ---------- Avräkningsnota (PDF) import ----------
 * Avanzas avräkningsnota är ett PDF-formulär – en sida per handlad transaktion. Siffrorna (datum,
 * antal, kurs, klockslag osv) ligger som IFYLLDA FORMULÄRFÄLT, inte som vanlig text i sidan (vanlig
 * textextraktion ger bara etiketterna som "Antal"/"Kurs", aldrig värdena). Fältnamnen är stabila
 * mellan notor (verifierat mot 11 riktiga notor): business_date, instrument_headline (innehåller
 * "köpt"/"sålt"), instrument_name, isin_number, misc_1_value (totalt antal), misc_2_value
 * (volymviktad snittkurs), instrument_5_1_value ("YYMMDD HH:MM:SS", klockslaget CSV-exporten saknar),
 * sum_1_value (köpeskilling/likvid), sum_2_value (courtage). CSV-exporten har Resultat men inget
 * klockslag; avräkningsnotan har klockslag men inget Resultat – detta är precis varför de kompletterar
 * varandra istället för att ersätta varandra. */

/* Parsar EN sidas redan uttagna formulärfält (namn -> strängvärde) till en notatransaktion, eller
 * null om sidan inte såg ut som en avräkningsnota (t.ex. saknade fält). Ren funktion – ingen PDF/DOM
 * inblandad – så den kan testas direkt med hopplockade fältvärden. */
function parseAvrakningsnotaPage(fields) {
  if (!fields) return null;
  const headline = fields.instrument_headline || '';
  let type = null;
  if (/köpt/i.test(headline)) type = 'Köp';
  else if (/sålt/i.test(headline)) type = 'Sälj';
  const date = (fields.business_date || '').trim();
  const instrument = (fields.instrument_name || '').trim();
  if (!type || !date || !instrument) return null;

  // En order kan i sällsynta fall ha fyllts i flera delklipp (instrument_1_1_value,
  // instrument_1_2_value, ...) inom samma nota, var och en med eget klockslag.
  const legs = [];
  for (let i = 1; i <= 10; i++) {
    const qtyRaw = fields['instrument_1_' + i + '_value'];
    if (qtyRaw === undefined) break;
    const qty = parseSwedishNumber(qtyRaw);
    if (qty === null) continue;
    const price = parseSwedishNumber(fields['instrument_3_' + i + '_value']);
    const timeMatch = /(\d{2}):(\d{2}):(\d{2})/.exec(fields['instrument_5_' + i + '_value'] || '');
    legs.push({ qty, price, time: timeMatch ? timeMatch[0] : null });
  }
  if (legs.length === 0) return null;

  const totalQtyField = parseSwedishNumber(fields.misc_1_value);
  const totalQty = totalQtyField !== null ? totalQtyField : legs.reduce((s, l) => s + l.qty, 0);
  const avgPriceField = parseSwedishNumber(fields.misc_2_value);
  const price = avgPriceField !== null ? avgPriceField : legs[0].price;
  const totalAmountAbs = parseSwedishNumber(fields.sum_1_value);
  const commission = parseSwedishNumber(fields.sum_2_value) || 0;
  const currency = (fields.instrument_4_1_value || 'SEK').trim();
  const isin = (fields.isin_number || '').trim();
  const noteNumber = (fields.number || '').trim();
  // Tidigaste ifyllda klockslaget bland delklippen = när ordern började exekveras.
  const time = legs.map(l => l.time).find(t => !!t) || null;

  return {
    noteNumber, date, type, instrument, isin,
    quantity: type === 'Sälj' ? -Math.abs(totalQty) : Math.abs(totalQty),
    price,
    amount: totalAmountAbs === null ? null : (type === 'Köp' ? -Math.abs(totalAmountAbs) : Math.abs(totalAmountAbs)),
    commission, currency, time,
  };
}

/* Parsar alla sidor i en avräkningsnota-PDF (en eller flera notor i samma fil). */
function parseAvrakningsnotaFields(pagesFields) {
  const notes = [];
  let unparsed = 0;
  (pagesFields || []).forEach(fields => {
    const note = parseAvrakningsnotaPage(fields);
    if (note) notes.push(note); else unparsed++;
  });
  return { notes, unparsed };
}

/* Matchar avräkningsnotor mot redan importerade CSV-trades (samma datum, ISIN/instrument, typ, antal
 * och pris) för att sätta ett exakt klockslag på transaktionen. Om ingen matchning finns skapas
 * istället en helt ny trade-rad direkt från notan (utan Resultat, eftersom notor inte innehåller
 * realiserad vinst/förlust). Ren funktion – inga DB-anrop – så matchningslogiken går att testa
 * isolerat mot riktiga notor + riktiga CSV-rader. */
function matchAvrakningsnotorToTrades(notes, existingTrades) {
  const byDate = {};
  existingTrades.forEach(t => { (byDate[t.date] = byDate[t.date] || []).push(t); });
  const claimed = new Set();
  const matches = [];        // { note, trade } – trade får sitt klockslag satt
  const alreadyTimed = [];   // notan matchade en trade som redan hade ett klockslag (dubbelimport)
  const newTradeRows = [];   // ingen matchning hittades -> blir en egen ny trade-rad

  notes.forEach(note => {
    // OBS: pris är MEDVETET inte ett hårt krav här längre – bara datum + typ + ISIN(eller namn) +
    // antal avgör om en nota matchar en CSV-trade. Ett hårt priskrav (även med liten marginal) visade
    // sig i praktiken kunna missa riktiga matchningar (CSV:ns Kurs kan vara avrundad/viktad något
    // annorlunda än notans volymviktade snittkurs), vilket ledde till att en avräkningsnota som
    // egentligen hörde ihop med en redan importerad CSV-rad istället skapade en HELT NY, parallell
    // "spöktrade" – CSV och PDF "lades på varandra" istället för att komplettera varandra, precis det
    // som rapporterades. Pris används nu bara för att välja mellan flera annars likvärdiga kandidater.
    const candidates = (byDate[note.date] || []).filter(t => {
      if (claimed.has(t.id)) return false;
      if (t.type !== note.type) return false;
      const sameIsin = !!(note.isin && t.isin && note.isin.trim().toUpperCase() === t.isin.trim().toUpperCase());
      const sameName = (t.instrument || '').trim() === note.instrument;
      if (!sameIsin && !sameName) return false;
      return Math.abs(Math.abs(t.quantity) - Math.abs(note.quantity)) < 0.001;
    });
    candidates.sort((a, b) => {
      const da = (a.price !== null && a.price !== undefined && note.price !== null) ? Math.abs(a.price - note.price) : 0;
      const db = (b.price !== null && b.price !== undefined && note.price !== null) ? Math.abs(b.price - note.price) : 0;
      return da - db;
    });
    const match = candidates[0];
    if (match) {
      claimed.add(match.id);
      if (match.time) alreadyTimed.push(note); else matches.push({ note, trade: match });
    } else {
      newTradeRows.push(note);
    }
  });

  return { matches, newTradeRows, alreadyTimed };
}

/* Utför matchningen mot databasen: sätter klockslag på befintliga trades, skapar nya trade-rader för
 * omatchade notor, och skriver om fileOrder till den RIKTIGA kronologiska ordningen för varje dag där
 * samtliga trades nu har ett klockslag (istället för CSV-radordningens gissning). */
async function applyAvrakningsnotaImport(notes, filename) {
  if (notes.length === 0) return { filename, matched: 0, inserted: 0, skipped: 0, unparsed: 0 };
  const dates = Array.from(new Set(notes.map(n => n.date))).sort();
  // Läk eventuella gamla spöktrades för just dessa datum FÖRST, så att dagens notor matchar mot en
  // redan renstädad bild av datat istället för att riskera att skapa ännu en dubblett.
  await healOrphanAvrakningsnotaTrades(dates);
  let existing = [];
  for (const d of dates) existing = existing.concat(await dbGetAllByIndex('trades', 'date', d));

  const { matches, newTradeRows, alreadyTimed } = matchAvrakningsnotorToTrades(notes, existing);

  for (const { note, trade } of matches) {
    await dbPut('trades', Object.assign({}, trade, { time: note.time, noteNumber: note.noteNumber }));
  }

  const insertedIds = [];
  for (const note of newTradeRows) {
    const signature = ['avrakningsnota', note.date, note.type, note.instrument, note.quantity, note.price, note.noteNumber].join('|');
    const row = {
      date: note.date, type: note.type, instrument: note.instrument, isin: note.isin,
      quantity: note.quantity, price: note.price, amount: note.amount, currency: note.currency,
      commission: note.commission, result: null, time: note.time, source: 'avrakningsnota',
      noteNumber: note.noteNumber, signature, fileOrder: 0,
    };
    insertedIds.push(await dbAdd('trades', row));
  }

  for (const d of dates) {
    const dayTrades = await dbGetAllByIndex('trades', 'date', d);
    if (dayTrades.length > 0 && dayTrades.every(t => t.time)) {
      const sorted = dayTrades.slice().sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));
      for (let i = 0; i < sorted.length; i++) {
        if (sorted[i].fileOrder !== i) await dbPut('trades', Object.assign({}, sorted[i], { fileOrder: i }));
      }
    }
  }

  if (insertedIds.length > 0) {
    await dbAdd('importBatches', {
      filename, importedAt: new Date().toISOString(),
      inserted: insertedIds.length, skipped: alreadyTimed.length, totalRows: notes.length,
      excludedCount: 0, excludedSummary: [],
      dateFrom: dates[0], dateTo: dates[dates.length - 1],
      tradeIds: insertedIds, sourceType: 'pdf',
    });
  }

  return { filename, matched: matches.length, inserted: insertedIds.length, skipped: alreadyTimed.length, unparsed: 0 };
}

/* Om en avräkningsnota importerades innan matchningen var tillräckligt robust (t.ex. ett tidigare
 * hårt priskrav som missade en riktig träff), kan en "spöktrade" ha skapats direkt från PDF:en
 * (source: 'avrakningsnota', result: null) parallellt med den riktiga CSV-raden istället för att slås
 * ihop med den – CSV och PDF hamnade på varandra istället för att komplettera varandra. Denna
 * funktion läker det i efterhand: letar upp en riktig CSV-trade (har ett Resultat, saknar ännu
 * klockslag) med samma datum/typ/ISIN(eller namn)/antal som spöktraden, flyttar över klockslaget dit
 * och tar sedan bort spöktraden. Körs vid varje appstart samt efter varje CSV- och PDF-import, så
 * befintlig felaktig data rättas till automatiskt utan att man behöver importera om något.
 */
async function healOrphanAvrakningsnotaTrades(dates) {
  let healedCount = 0;
  for (const d of dates) {
    const dayTrades = await dbGetAllByIndex('trades', 'date', d);
    const orphans = dayTrades.filter(t => t.source === 'avrakningsnota' && (t.result === null || t.result === undefined));
    if (orphans.length === 0) continue;
    const claimed = new Set();
    for (const orphan of orphans) {
      const candidate = dayTrades.find(t => {
        if (t.id === orphan.id || claimed.has(t.id)) return false;
        // OBS: "riktig CSV-trade" avgörs av att den INTE själv är en PDF-spöktrade (source ===
        // 'avrakningsnota') – INTE av att den har ett Resultat, eftersom Köp-ben helt normalt saknar
        // Resultat (det realiseras först vid Sälj). Att kräva ett Resultat här var själva buggen:
        // den uteslöt exakt de Köp-rader som en avräkningsnota för ett köp ska matcha mot.
        if (t.source === 'avrakningsnota') return false;
        if (t.time) return false;
        if (t.type !== orphan.type) return false;
        const sameIsin = !!(orphan.isin && t.isin && orphan.isin.trim().toUpperCase() === t.isin.trim().toUpperCase());
        const sameName = (t.instrument || '').trim() === (orphan.instrument || '').trim();
        if (!sameIsin && !sameName) return false;
        return Math.abs(Math.abs(t.quantity) - Math.abs(orphan.quantity)) < 0.001;
      });
      if (candidate) {
        claimed.add(candidate.id);
        await dbPut('trades', Object.assign({}, candidate, { time: orphan.time, noteNumber: orphan.noteNumber }));
        await dbDelete('trades', orphan.id);
        healedCount++;
      }
    }
    const refreshed = await dbGetAllByIndex('trades', 'date', d);
    if (refreshed.length > 0 && refreshed.every(t => t.time)) {
      const sorted = refreshed.slice().sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));
      for (let i = 0; i < sorted.length; i++) {
        if (sorted[i].fileOrder !== i) await dbPut('trades', Object.assign({}, sorted[i], { fileOrder: i }));
      }
    }
  }
  return healedCount;
}

/* Körs över HELA databasen (inte bara ett visst importtillfälles datum) – hittar alla datum som har
 * minst en kvarvarande spöktrade och läker dem. Billigt att köra ofta eftersom en personlig
 * handelsjournal aldrig blir så stor att en full scan är ett problem. */
async function healAllOrphanAvrakningsnotaTrades() {
  const all = await dbGetAll('trades');
  const orphanDates = Array.from(new Set(all.filter(t => t.source === 'avrakningsnota' && (t.result === null || t.result === undefined)).map(t => t.date)));
  if (orphanDates.length === 0) return 0;
  return healOrphanAvrakningsnotaTrades(orphanDates);
}

/* Kastar ett tydligt fel om ett löfte inte gör NÅGOT (varken lyckas eller misslyckas) inom given tid –
 * utan detta kan ett blockerat CDN-anrop eller en Worker som aldrig startar göra att importen bara
 * "hänger" med en snurrande PDF-fil och inget syns i importrutan, istället för ett felmeddelande. */
function withTimeout(promise, ms, message) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(v => { clearTimeout(timer); resolve(v); }, err => { clearTimeout(timer); reject(err); });
  });
}

let pdfjsLoadPromise = null;
function ensurePdfJs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (pdfjsLoadPromise) return pdfjsLoadPromise;
  pdfjsLoadPromise = withTimeout(new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      try {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(window.pdfjsLib);
      } catch (err) { reject(err); }
    };
    script.onerror = () => reject(new Error('Kunde inte ladda PDF-läsaren (nätverket blockerade troligen cdnjs.cloudflare.com).'));
    document.head.appendChild(script);
  }), 15000, 'Det tog för lång tid att ladda PDF-läsaren (>15s) – kontrollera nätverksanslutningen eller att inget blockerar cdnjs.cloudflare.com.').catch(err => {
    pdfjsLoadPromise = null; // tillåt ett nytt försök nästa gång istället för att fastna på ett trasigt löfte för alltid
    throw err;
  });
  return pdfjsLoadPromise;
}

/* Läser ut formulärfälten sida för sida ur en riktig PDF-fil (browser-delen – kräver pdf.js).
 * disableWorker: true körs medvetet – dessa filer är små (några sidor formulärdata, ingen rendering),
 * och att slippa skapa en separat Web Worker från ett annat ursprung (cdnjs) tar bort en hel klass av
 * tysta fel som annars kan uppstå om webbläsaren/nätverket stryper korsdomän-workers. */
async function extractPdfFormFieldsPerPage(file) {
  const pdfjsLib = await ensurePdfJs();
  const buf = await file.arrayBuffer();
  const doc = await withTimeout(
    pdfjsLib.getDocument({ data: buf, disableWorker: true }).promise,
    15000,
    'Det tog för lång tid att läsa PDF-filen (>15s).'
  );
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const annots = await page.getAnnotations({ intent: 'display' });
    const fields = {};
    annots.forEach(a => { if (a.fieldName && a.fieldValue !== undefined) fields[a.fieldName] = a.fieldValue; });
    pages.push(fields);
  }
  return pages;
}

function renderPDFImportResultsSummary(results) {
  const resultEl = document.getElementById('importResult');
  if (!resultEl) return;
  const loadingEl = document.getElementById('pdfImportLoading');
  if (loadingEl) loadingEl.remove();
  const html = results.map(r => {
    if (r.error) return `<p class="value neg" style="margin-top:8px;">${escapeHtml(r.filename)}: ${escapeHtml(r.error)}</p>`;
    const parts = [];
    if (r.matched) parts.push(`${r.matched} transaktion${r.matched === 1 ? '' : 'er'} fick exakt klockslag`);
    if (r.inserted) parts.push(`${r.inserted} ny${r.inserted === 1 ? '' : 'a'} trade${r.inserted === 1 ? '' : 's'} skapade direkt från notan`);
    if (r.skipped) parts.push(`${r.skipped} redan tidsatta sedan tidigare (dubbelimport)`);
    if (r.unparsed) parts.push(`${r.unparsed} sid${r.unparsed === 1 ? 'a' : 'or'} kunde inte tolkas`);
    return `<p class="value pos" style="margin-top:8px;">${escapeHtml(r.filename)} (avräkningsnota): ${parts.join(', ') || 'inget att göra'}.</p>`;
  }).join('');
  resultEl.innerHTML += html;
}

async function handlePDFImportFiles(fileList) {
  const files = Array.from(fileList || []).filter(f => f);
  if (files.length === 0) return [];
  // Visas direkt (innan pdf.js ens hunnit ladda) så att man ser att något faktiskt händer – annars kan
  // en blockerad CDN-nedladdning eller en fastnad Worker göra att importrutan bara ser ut att stå still
  // med filen "laddad" utan någon synlig reaktion alls, vilket är precis vad som rapporterades.
  const resultEl = document.getElementById('importResult');
  if (resultEl) resultEl.innerHTML += `<p class="muted" id="pdfImportLoading">Läser ${files.length > 1 ? files.length + ' avräkningsnota-PDF:er' : 'avräkningsnota-PDF:en ' + escapeHtml(files[0].name)}...</p>`;
  const results = [];
  for (const file of files) {
    try {
      const pagesFields = await extractPdfFormFieldsPerPage(file);
      const { notes, unparsed } = parseAvrakningsnotaFields(pagesFields);
      if (notes.length === 0) {
        results.push({ filename: file.name, error: 'Kände inte igen någon avräkningsnota i filen.' });
        continue;
      }
      const r = await applyAvrakningsnotaImport(notes, file.name);
      r.unparsed = unparsed;
      results.push(r);
    } catch (err) {
      results.push({ filename: file.name, error: err.message || 'Kunde inte läsa PDF-filen.' });
    }
  }
  renderPDFImportResultsSummary(results);
  await renderImportHistory();
  await renderOverview();
  return results;
}

/* Delar upp en filsläpp/filval i CSV- respektive PDF-filer och kör rätt importflöde för varje – så att
 * man kan släppa både transaktions-CSV:n och dagens avräkningsnotor i samma drag. */
async function handleMixedImportFiles(fileList) {
  const files = Array.from(fileList || []).filter(f => f);
  if (files.length === 0) return { csvResults: [], pdfResults: [] };
  const csvFiles = files.filter(f => /\.csv$/i.test(f.name));
  const pdfFiles = files.filter(f => /\.pdf$/i.test(f.name));
  const resultEl = document.getElementById('importResult');
  if (resultEl) resultEl.innerHTML = '';
  let csvResults = [], pdfResults = [];
  if (csvFiles.length) csvResults = (await handleCSVImportFiles(csvFiles)) || [];
  if (pdfFiles.length) pdfResults = (await handlePDFImportFiles(pdfFiles)) || [];
  if (!csvFiles.length && !pdfFiles.length) {
    if (resultEl) resultEl.innerHTML = '<p class="value neg">Filtypen kändes inte igen – välj en Avanza-CSV eller en avräkningsnota (PDF).</p>';
  }
  return { csvResults, pdfResults };
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

  // Vid en enda fil visas detaljerna direkt. Vid flera filer på en gång skulle en fullständig rad
  // per fil göra att sammanfattningen sväller ut och tar upp nästan hela sidan (det användaren såg
  // och tyckte "ligger över sidan" efter att ha importerat 12 filer samtidigt) – därför visas bara
  // totalsumman direkt, med detaljerna per fil bakom en "Visa detaljer"-knapp.
  const isMulti = results.length > 1;
  resultEl.innerHTML = `
    ${isMulti ? `<p class="value ${failed.length ? (ok.length ? '' : 'neg') : 'pos'}">${results.length} filer bearbetade: ${totalInserted} transaktioner importerade totalt${totalSkipped ? `, ${totalSkipped} dubbletter hoppades över` : ''}${failed.length ? `, ${failed.length} fil${failed.length > 1 ? 'er' : ''} misslyckades` : ''}.</p>` : ''}
    ${isMulti ? `<button class="btn btn-ghost btn-small" id="importResultToggleDetails" style="margin-top:8px;">Visa detaljer för alla ${results.length} filer</button><div id="importResultDetails" class="hidden">${perFileHtml}</div>` : perFileHtml}
    ${ok.length ? '<p class="muted small" style="margin-top:10px;">Gå till <strong>Översikt</strong> för att se resultatet dag för dag.</p>' : ''}
  `;

  const toggleBtn = document.getElementById('importResultToggleDetails');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const details = document.getElementById('importResultDetails');
      const nowHidden = details.classList.toggle('hidden');
      toggleBtn.textContent = nowHidden ? `Visa detaljer för alla ${results.length} filer` : 'Dölj detaljer';
    });
  }
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

  // Om en avräkningsnota importerades innan denna CSV fanns kan den ha skapat en spöktrade istället
  // för att matcha – nu när CSV-raden finns kan den läkas ihop med den automatiskt.
  await healAllOrphanAvrakningsnotaTrades();

  renderImportResultsSummary(results);
  await renderImportHistory();
  await renderOverview();
  return results;
}

async function handleCSVImport(file) {
  return handleCSVImportFiles([file]);
}

// Om två importer täcker exakt samma datumintervall (den ena flaggas som "Möjlig dubblett" av den
// andra) äger BARA en av dem faktiskt transaktionerna – den andra la inte till några nya rader
// eftersom allt redan fanns (dedupliceringen skippar dem). Om man då raderar den import som äger
// transaktionerna försvinner de helt från kalendern, trots att "dubblett-importen" fortfarande finns
// kvar i listan – det var precis det som rapporterades som en bugg. Lösningen: när man raderar en
// import som har kopplade transaktioner OCH det finns en annan import kvar för exakt samma datum,
// flyttas transaktionerna dit istället för att raderas, så att datan inte försvinner bara för att man
// städar bort en specifik importpost.
async function removeBatchAndTrades(batch, allBatchesSnapshot, batchIdsBeingDeleted) {
  const tradeIds = batch.tradeIds || [];
  const sibling = batch.dateFrom
    ? allBatchesSnapshot.find(b => b.id !== batch.id && b.dateFrom === batch.dateFrom && b.dateTo === batch.dateTo && !batchIdsBeingDeleted.has(b.id))
    : null;
  if (sibling && tradeIds.length > 0) {
    const freshSibling = await dbGet('importBatches', sibling.id).catch(() => null);
    if (freshSibling) {
      const merged = Object.assign({}, freshSibling, {
        tradeIds: (freshSibling.tradeIds || []).concat(tradeIds),
        inserted: (freshSibling.inserted || 0) + tradeIds.length,
      });
      await dbPut('importBatches', merged);
      await dbDelete('importBatches', batch.id);
      return { transferred: tradeIds.length, deletedTrades: 0 };
    }
  }
  for (const tid of tradeIds) {
    await dbDelete('trades', tid).catch(() => {});
  }
  await dbDelete('importBatches', batch.id);
  return { transferred: 0, deletedTrades: tradeIds.length };
}

async function deleteImportBatch(batchId) {
  const batch = await dbGet('importBatches', batchId);
  if (!batch) return;
  const allBatches = await dbGetAll('importBatches');
  const tradeIds = batch.tradeIds || [];
  const sibling = batch.dateFrom ? allBatches.find(b => b.id !== batch.id && b.dateFrom === batch.dateFrom && b.dateTo === batch.dateTo) : null;
  const label = batch.dateFrom ? (batch.dateFrom === batch.dateTo ? formatDateHuman(batch.dateFrom) : `${batch.dateFrom} – ${batch.dateTo}`) : batch.filename;
  const msg = (sibling && tradeIds.length > 0)
    ? `Ta bort importposten "${label}"? Det finns en till import för samma datum (${sibling.filename}) – de ${tradeIds.length} transaktionerna flyttas dit så att de inte försvinner från kalendern.`
    : tradeIds.length
      ? `Ta bort importen "${label}"? ${tradeIds.length} transaktioner tas bort permanent.`
      : `Ta bort importposten "${label}"? (Inga kopplade transaktioner hittades att ta bort.)`;
  if (!confirm(msg)) return;
  const result = await removeBatchAndTrades(batch, allBatches, new Set([batchId]));
  selectedBatchIds.delete(batchId);
  renderImportHistory();
  renderOverview();
  showToast(result.transferred > 0 ? 'Import borttagen, transaktionerna flyttades till den andra importen för samma datum' : 'Import borttagen');
}

// Håller reda på vilka importer som är ikryssade för massradering, mellan omritningar av listan
// (t.ex. när sorteringen ändras) tills de faktiskt raderas eller vyn lämnas.
let selectedBatchIds = new Set();

function updateImportBulkBar(totalCount) {
  const bar = document.getElementById('importBulkBar');
  const deleteBtn = document.getElementById('importDeleteSelected');
  const selectAll = document.getElementById('importSelectAll');
  if (!bar) return;
  bar.style.display = totalCount > 0 ? 'flex' : 'none';
  const n = selectedBatchIds.size;
  deleteBtn.textContent = `Ta bort valda (${n})`;
  deleteBtn.disabled = n === 0;
  if (selectAll) selectAll.checked = totalCount > 0 && n === totalCount;
}

async function deleteSelectedBatches() {
  if (selectedBatchIds.size === 0) return;
  const allBatches = await dbGetAll('importBatches');
  const toDelete = allBatches.filter(b => selectedBatchIds.has(b.id));
  if (toDelete.length === 0) return;
  const totalTrades = toDelete.reduce((s, b) => s + ((b.tradeIds && b.tradeIds.length) || 0), 0);
  const msg = `Ta bort ${toDelete.length} valda importer? ${totalTrades} transaktioner berörs (de som har en annan import kvar för exakt samma datum flyttas dit istället för att raderas, så de inte försvinner från kalendern).`;
  if (!confirm(msg)) return;
  const idsBeingDeleted = new Set(toDelete.map(b => b.id));
  let transferredTotal = 0;
  for (const b of toDelete) {
    const r = await removeBatchAndTrades(b, allBatches, idsBeingDeleted);
    transferredTotal += r.transferred;
  }
  const deletedCount = toDelete.length;
  selectedBatchIds.clear();
  renderImportHistory();
  renderOverview();
  showToast(deletedCount + ' importer borttagna' + (transferredTotal > 0 ? ' (' + transferredTotal + ' transaktioner flyttades till kvarvarande importer)' : ''));
}

// Vilka månadsgrupper som är utfällda i importlistan just nu (null = inte initierat än denna
// session – den mest aktuella månaden fälls då ut automatiskt, resten börjar hopfällda).
let expandedImportMonths = null;

function importMonthKey(b) { return b.dateFrom ? b.dateFrom.slice(0, 7) : 'okänt'; }
function importMonthLabel(b) {
  if (!b.dateFrom) return 'Okänt datum';
  const d = new Date(b.dateFrom + 'T00:00:00');
  const s = d.toLocaleDateString('sv-SE', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function importWeekKey(b) { return b.dateFrom ? isoWeekNumber(new Date(b.dateFrom + 'T00:00:00')) : null; }

async function renderImportHistory() {
  const el = document.getElementById('importHistory');
  const sortSelect = document.getElementById('importSort');
  const sortMode = sortSelect ? sortSelect.value : 'imported_desc';
  const batches = await dbGetAll('importBatches');
  if (batches.length === 0) {
    el.innerHTML = '<div class="empty-state">Inga importer gjorda än.</div>';
    selectedBatchIds.clear();
    updateImportBulkBar(0);
    return;
  }

  const dateCounts = {};
  batches.forEach(b => { if (b.dateFrom) dateCounts[b.dateFrom] = (dateCounts[b.dateFrom] || 0) + 1; });

  const sorted = batches.slice();
  if (sortMode === 'date_desc') sorted.sort((a, b) => (b.dateFrom || '').localeCompare(a.dateFrom || '') || b.importedAt.localeCompare(a.importedAt));
  else if (sortMode === 'date_asc') sorted.sort((a, b) => (a.dateFrom || '').localeCompare(b.dateFrom || '') || a.importedAt.localeCompare(b.importedAt));
  else sorted.sort((a, b) => b.importedAt.localeCompare(a.importedAt));

  // Rensa bort ev. ikryssade id:n som inte längre finns kvar (t.ex. borttagna på annat sätt).
  const liveIds = new Set(sorted.map(b => b.id));
  Array.from(selectedBatchIds).forEach(id => { if (!liveIds.has(id)) selectedBatchIds.delete(id); });

  if (expandedImportMonths === null) {
    expandedImportMonths = new Set([importMonthKey(sorted[0])]);
  }

  // Grupperar listan efter månad (hopfällbar rubrik) och sedan efter ISO-vecka (liten etikett) inom
  // varje månad, så att den inte blir rörig när det finns många importer – annars såg man bara en
  // lång osorterad lista med alla filer.
  const monthCounts = {};
  sorted.forEach(b => { const k = importMonthKey(b); monthCounts[k] = (monthCounts[k] || 0) + 1; });

  let html = '';
  let lastMonthKey = null;
  let lastWeekKey = null;
  sorted.forEach(b => {
    const mKey = importMonthKey(b);
    if (mKey !== lastMonthKey) {
      if (lastMonthKey !== null) html += '</div>';
      const expanded = expandedImportMonths.has(mKey);
      html += `
        <button type="button" class="import-month-header" data-month="${mKey}">
          <span>${escapeHtml(importMonthLabel(b))} · ${monthCounts[mKey]} import${monthCounts[mKey] === 1 ? '' : 'er'}</span>
          <span class="import-month-caret">${expanded ? '−' : '+'}</span>
        </button>
        <div class="import-month-body${expanded ? '' : ' hidden'}" data-month-body="${mKey}">
      `;
      lastMonthKey = mKey;
      lastWeekKey = null;
    }
    const wKey = importWeekKey(b);
    if (wKey !== null && wKey !== lastWeekKey) {
      html += `<div class="import-week-label muted small">Vecka ${wKey}</div>`;
      lastWeekKey = wKey;
    }
    const rangeLabel = b.dateFrom ? (b.dateFrom === b.dateTo ? formatDateHuman(b.dateFrom) : `${b.dateFrom} – ${b.dateTo}`) : 'Okänt datum';
    const isDup = b.dateFrom && dateCounts[b.dateFrom] > 1;
    const checked = selectedBatchIds.has(b.id) ? 'checked' : '';
    html += `
    <div class="entry-card">
      <div class="entry-card-head">
        <div style="display:flex; align-items:flex-start; gap:10px;">
          <input type="checkbox" class="batch-select" data-id="${b.id}" ${checked} style="margin-top:5px;">
          <div>
            <div class="entry-card-title">${escapeHtml(rangeLabel)} ${isDup ? '<span class="rule-chip" style="margin-left:6px;"><span class="status-dot warn" style="margin-right:5px;"></span>Möjlig dubblett</span>' : ''}</div>
            <div class="entry-card-meta">${escapeHtml(b.filename)} · Importerad ${new Date(b.importedAt).toLocaleString('sv-SE')}</div>
          </div>
        </div>
        <div class="entry-card-actions"><button class="btn btn-danger btn-small delete-batch" data-id="${b.id}">Ta bort</button></div>
      </div>
      <div class="entry-card-meta" style="margin-top:8px;">
        ${b.inserted} importerade${b.skipped ? ' · ' + b.skipped + ' dubbletter' : ''}${b.excludedCount ? ' · ' + b.excludedCount + ' ignorerade rader' : ''}
      </div>
      ${isDup && !b.inserted ? `<div class="entry-card-meta" style="margin-top:4px;"><span class="status-dot info" style="margin-right:5px;"></span>Alla rader fanns redan – transaktionerna för detta datum ägs av en annan import i listan, inte den här.</div>` : ''}
    </div>`;
  });
  if (lastMonthKey !== null) html += '</div>';

  el.innerHTML = html;

  el.querySelectorAll('.import-month-header').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.month;
      const body = el.querySelector(`.import-month-body[data-month-body="${key}"]`);
      const nowHidden = body.classList.toggle('hidden');
      if (nowHidden) expandedImportMonths.delete(key); else expandedImportMonths.add(key);
      btn.querySelector('.import-month-caret').textContent = nowHidden ? '+' : '−';
    });
  });
  el.querySelectorAll('.delete-batch').forEach(btn => {
    btn.addEventListener('click', () => deleteImportBatch(parseInt(btn.dataset.id, 10)));
  });
  el.querySelectorAll('.batch-select').forEach(cb => {
    cb.addEventListener('change', () => {
      const id = parseInt(cb.dataset.id, 10);
      if (cb.checked) selectedBatchIds.add(id); else selectedBatchIds.delete(id);
      updateImportBulkBar(sorted.length);
    });
  });
  updateImportBulkBar(sorted.length);
}

function setupImport() {
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('csvFile');
  dropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length) handleMixedImportFiles(e.target.files);
    e.target.value = '';
  });
  dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files && files.length) handleMixedImportFiles(files);
  });
  const sortSelect = document.getElementById('importSort');
  if (sortSelect) sortSelect.addEventListener('change', renderImportHistory);

  const selectAll = document.getElementById('importSelectAll');
  if (selectAll) {
    selectAll.addEventListener('change', () => {
      document.querySelectorAll('#importHistory .batch-select').forEach(cb => {
        cb.checked = selectAll.checked;
        const id = parseInt(cb.dataset.id, 10);
        if (selectAll.checked) selectedBatchIds.add(id); else selectedBatchIds.delete(id);
      });
      updateImportBulkBar(document.querySelectorAll('#importHistory .batch-select').length);
    });
  }
  const deleteSelectedBtn = document.getElementById('importDeleteSelected');
  if (deleteSelectedBtn) deleteSelectedBtn.addEventListener('click', deleteSelectedBatches);
}

/* ---------- Overview / Dashboard ---------- */
let equityChartInstance = null;

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

/* Veckonummer enligt ISO 8601 (samma system som används i Sverige: måndag som veckostart,
   vecka 1 = veckan som innehåller årets första torsdag). */
function isoWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7; // Mån=0 .. Sön=6
  date.setUTCDate(date.getUTCDate() - dayNum + 3); // torsdag i denna vecka
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const firstThursdayDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstThursdayDayNum + 3);
  return 1 + Math.round((date - firstThursday) / (7 * 24 * 60 * 60 * 1000));
}

/*
 * Rendrar bara toppens stat-rad (vecka/månad/totalt + handelsdagar/trades/träffsäkerhet).
 * Egen funktion så att kalenderns Slutresultat/Dagens topp-toggle kan uppdatera siffrorna utan
 * att (som en full renderOverview() skulle göra) döljas en redan öppen dagsdetalj under tiden.
 */
async function renderGlobalStatsRow() {
  const trades = await dbGetAll('trades');
  const globalStatsEl = document.getElementById('globalStats');
  if (trades.length === 0) { globalStatsEl.innerHTML = ''; return; }

  const byDate = {};
  trades.forEach(t => { (byDate[t.date] = byDate[t.date] || []).push(t); });
  const dates = Object.keys(byDate);

  let wins = 0, losses = 0;
  trades.forEach(t => { if (t.result !== null && t.result !== undefined) { if (t.result > 0) wins++; else if (t.result < 0) losses++; } });
  const winRate = (wins + losses) > 0 ? (wins / (wins + losses) * 100) : null;

  // "Denna månad" följer alltid den månad som är vald i kalendern nedan (heatmapCursor) – inte
  // datorns verkliga dagens datum – så siffran matchar det du faktiskt bläddrat fram till och inte
  // visar 0 kr bara för att du tittar på en annan månad än den du råkar sitta i just nu.
  const cursorMonth = heatmapCursor || new Date();
  const monthRange = getMonthRange(cursorMonth);
  const monthLabelText = cursorMonth.toLocaleDateString('sv-SE', { month: 'long', year: 'numeric' });
  const monthLabel = monthLabelText.charAt(0).toUpperCase() + monthLabelText.slice(1);

  // Ingen separat "vecka"-ruta här längre – veckans resultat (med svenskt veckonummer) står redan
  // bredvid rätt rad i kalenderns egen veckokolumn nedanför, så en till ruta här bara dubblerade
  // samma siffra (och kunde dessutom syfta på fel vecka om du bläddrat till en annan månad).
  const monthSum = sumMetricForRange(byDate, monthRange.start, monthRange.end, heatmapMetric);
  const totalSum = sumMetricForRange(byDate, new Date(0), new Date(8640000000000000), heatmapMetric);
  const metricSuffix = heatmapMetric === 'peak' ? ' (dagens topp)' : '';

  globalStatsEl.innerHTML =
    statBox(monthLabel + metricSuffix, formatMoney(monthSum), monthSum >= 0 ? 'pos' : 'neg', monthSum) +
    statBox('Totalt resultat' + metricSuffix, formatMoney(totalSum), totalSum >= 0 ? 'pos' : 'neg', totalSum) +
    statBox('Handelsdagar', dates.length) +
    statBox('Totalt antal trades', trades.length) +
    statBox('Träffsäkerhet', winRate !== null ? winRate.toFixed(0) + '%' : '–');
  runStatAnimations(globalStatsEl);
}

async function renderOverview() {
  const trades = await dbGetAll('trades');
  const dayListEl = document.getElementById('dayList');
  document.getElementById('dayDetailCard').classList.add('hidden');

  if (trades.length === 0) {
    document.getElementById('globalStats').innerHTML = '';
    dayListEl.innerHTML = `<div class="empty-state">Inga trades importerade än. Gå till <strong>Importera</strong> för att ladda upp din Avanza-historik.</div>`;
    document.getElementById('heatmapGrid').innerHTML = '';
    document.getElementById('heatmapMonthLabel').textContent = '';
    await renderAchievements();
    return;
  }

  const byDate = {};
  trades.forEach(t => { (byDate[t.date] = byDate[t.date] || []).push(t); });
  const dates = Object.keys(byDate).sort().reverse();

  await renderGlobalStatsRow();
  await renderHeatmap();
  // Måste awaitas (bugg tidigare): annars kan denna panel visa fördröjda/inaktuella siffror från
  // föregående månad ett ögonblick eftersom IndexedDB-läsningen inuti renderAchievements() är
  // asynkron och inget annat väntade in den.
  await renderAchievements();

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

/*
 * `journalByTradeId`: valfri karta { tradeId -> [journalEntry, ...] } (byggs av anroparen från
 * dagens journalanteckningar). Om en trades ben har en kopplad anteckning med bilder, visas de som
 * thumbnails direkt på tradekortet – så man faktiskt "ser traden" utan att behöva gå via Journal-fliken.
 */
function renderTradeGroups(groups, baseMovePct, tolerancePct, journalByTradeId) {
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

    // Bilder och bifogade filer (t.ex. avräkningsnota-PDF) kopplade till någon av positionens ben
    // (via journalanteckningar med tradeId satt).
    const linkedEntries = journalByTradeId
      ? g.legs.flatMap(t => journalByTradeId[t.id] || [])
      : [];
    const images = linkedEntries.flatMap(e => e.images || []);
    const linkedFiles = linkedEntries.flatMap(e => e.files || []);
    const imagesHtml = images.length ? `
      <div class="entry-images" style="margin-top:10px;">
        ${images.map(src => `<img src="${src}" alt="Bild för Trade ${gi + 1}">`).join('')}
      </div>` : '';
    const filesHtml = linkedFiles.length ? `
      <div class="entry-files" style="margin-top:10px;">
        ${linkedFiles.map(f => fileChipHtml(f, false)).join('')}
      </div>` : '';
    const hasAttachments = images.length > 0 || linkedFiles.length > 0;

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
      ${imagesHtml}
      ${filesHtml}
      <div style="margin-top:10px;"><button class="btn btn-ghost btn-small group-journal-btn" data-trade-id="${lastLeg.id}">${hasAttachments ? '+ Fler bilder/filer för Trade ' + (gi + 1) : '+ Bild/avräkningsnota för Trade ' + (gi + 1)}</button></div>
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

/*
 * Kompakt transaktionstabell (alla dagens trades) med dagens toppunkt markerad – används i info-popupen.
 * Visar Antal/Kurs/Belopp per rad (inte bara Resultat) så att flera "Köp"-rader på samma instrument
 * går att skilja åt – de är normalt inte dubbletter utan att man skalat in positionen i flera steg,
 * ofta till olika kurser/antal. Köp-rader saknar alltid Resultat eftersom vinst/förlust bara
 * realiseras när man säljer.
 */
function renderCompactTradeTable(stats) {
  const rows = stats.sorted.map((t, i) => {
    const isPeak = stats.giveback > 0.01 && stats.peakTrade && t === stats.peakTrade;
    return `
    <tr class="${isPeak ? 'peak-row' : ''}">
      <td>${i + 1}</td>
      <td class="${t.type === 'Köp' ? 'tag-buy' : 'tag-sell'}">${escapeHtml(t.type)}</td>
      <td>${escapeHtml(t.instrument)}</td>
      <td>${formatNum(t.quantity, 0)}</td>
      <td>${formatNum(t.price, 4)}</td>
      <td>${t.amount != null ? formatMoney(t.amount) : ''}</td>
      <td class="${t.result > 0 ? 'num-pos' : t.result < 0 ? 'num-neg' : ''}">${t.result != null ? formatMoney(t.result) : '–'}</td>
      <td class="${t._running >= 0 ? 'num-pos' : 'num-neg'}">${formatMoney(t._running)}${isPeak ? ' <span class="rule-chip ok" style="margin-left:4px;white-space:nowrap;"><span class="status-dot ok" style="margin-right:5px;"></span>Hit borde du stannat</span>' : ''}</td>
    </tr>`;
  }).join('');
  return `
    <table class="trade-table" style="margin-top:14px;">
      <thead><tr><th>#</th><th>Typ</th><th>Värdepapper</th><th>Antal</th><th>Kurs</th><th>Belopp</th><th>Resultat</th><th>Löpande</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="muted small" style="margin-top:8px; line-height:1.5;">Flera "Köp"-rader på samma certifikat är normalt inte dubbletter – de visar att positionen byggdes upp i flera steg (ofta till olika kurs/antal, se kolumnerna Antal/Kurs/Belopp). Köp-rader saknar alltid Resultat eftersom vinst/förlust bara uppstår vid Sälj. För dagens första transaktion är Resultat och Löpande alltid samma summa, eftersom det löpande resultatet bara är den enda tradens resultat så länge inget annat hänt än dagen.</p>
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

  const journalEntries = await dbGetAllByIndex('journal', 'date', date);
  const journalByTradeId = {};
  journalEntries.forEach(e => { if (e.tradeId) (journalByTradeId[e.tradeId] = journalByTradeId[e.tradeId] || []).push(e); });

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
        <p class="muted small" style="margin-bottom:6px;">Dagens trades, ihopparade (entry + ev. TP1/TP2/TP3... vid delvisa uttag). Klicka "+ Bild/anteckning" på ett tradekort för att koppla en skärmdump till just den traden. Avanzas export har inget klockslag, bara datum och radordning.</p>
        <div class="entry-list">${renderTradeGroups(groups, baseMovePct, riskTolerancePct, journalByTradeId)}</div>
      ` : ''}
      ${stats.tradeCount > 0 ? `<p class="muted small" style="margin:16px 0 0;">Alla transaktioner denna dag, rå ordning:</p>${renderCompactTradeTable(stats)}` : ''}
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" id="dayInfoClose">Stäng</button>
      <button class="btn btn-secondary" id="dayInfoAddJournal" style="margin-top:0;">+ Journal/bild för dagen (utan specifik trade)</button>
      <button class="btn btn-primary" id="dayInfoOpenDetail">Öppna dagsdetalj →</button>
    </div>
  `;
  openModal(modalHtml);
  document.getElementById('dayInfoClose').addEventListener('click', closeModal);
  document.getElementById('dayInfoAddJournal').addEventListener('click', () => {
    closeModal();
    openJournalForm(null, { date }, () => openDayInfoModal(date));
  });
  document.querySelectorAll('#modal .group-journal-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      closeModal();
      openJournalForm(null, { date, tradeId: parseInt(btn.dataset.tradeId, 10) }, () => openDayInfoModal(date));
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
  // Bilder kopplade till en specifik trade (inte bara dagen som helhet) ska synas direkt på
  // tradekortet här också, inte bara i kalenderns info-popup.
  const journalEntriesForDay = await dbGetAllByIndex('journal', 'date', date);
  const journalByTradeId = {};
  journalEntriesForDay.forEach(e => {
    if (e.tradeId) (journalByTradeId[e.tradeId] = journalByTradeId[e.tradeId] || []).push(e);
  });
  const groupedHtml = `
    <div class="entry-list">${renderTradeGroups(groups, baseMovePct, riskTolerancePct, journalByTradeId)}</div>
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
    btn.addEventListener('click', () => openJournalForm(null, { date, tradeId: parseInt(btn.dataset.tradeId, 10) }, () => openDayDetail(date, reversed, viewMode)));
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
      ${e.files && e.files.length ? `<div class="entry-files" style="margin-top:8px;">${e.files.map(f => fileChipHtml(f, false)).join('')}</div>` : ''}
    </div>
  `).join('');

  listEl.querySelectorAll('.edit-journal').forEach(btn => {
    btn.addEventListener('click', async () => {
      const entry = await dbGet('journal', parseInt(btn.dataset.id, 10));
      openJournalForm(entry);
    });
  });
}

/*
 * Öppnar journalformuläret (inkl. bilduppladdning). `onDone`, om satt, körs efter att en anteckning
 * sparats eller tagits bort – t.ex. för att stänga tillbaka till kalenderns infopopup istället för
 * att bara lämna användaren på Journal-fliken, så att en nyss tillagd bild syns direkt på tradekortet.
 */
async function openJournalForm(existing, prefill, onDone) {
  const isEdit = !!existing;
  const entry = existing || {
    date: (prefill && prefill.date) || todayISO(),
    tradeId: (prefill && prefill.tradeId) || null,
    title: '', outcome: 'neutral', text: '', images: [], files: []
  };
  const images = (entry.images || []).slice();
  const files = (entry.files || []).slice();
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
    <div class="form-group"><label>Avräkningsnota / bifogade filer (PDF)</label><div class="file-upload-row" id="jf_files"></div></div>
    <div class="modal-actions">
      ${isEdit ? '<button class="btn btn-danger" id="jf_delete">Ta bort</button>' : ''}
      <button class="btn btn-ghost" id="jf_cancel">Avbryt</button>
      <button class="btn btn-primary" id="jf_save">Spara</button>
    </div>
  `;
  openModal(modalHtml);

  populateTradeSelect(document.getElementById('jf_trade'), trades, entry.tradeId);
  renderImageUploadWidget(document.getElementById('jf_images'), images);
  renderFileUploadWidget(document.getElementById('jf_files'), files);

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
        if (typeof onDone === 'function') onDone();
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
    const payload = { date, tradeId, title, outcome, text, images, files, createdAt: entry.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
    if (isEdit) { payload.id = entry.id; await dbPut('journal', payload); } else { await dbAdd('journal', payload); }
    closeModal(); renderJournalList(); showToast('Sparat');
    if (typeof onDone === 'function') onDone();
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

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Guld-/BULL-BEAR-certifikat handlas inte på helger, så kalendern visar bara Mån-Fre (5 kolumner) –
  // lördag och söndag tas bort helt. En 6:e kolumn läggs till per veckorad med det ISO-veckonummer
  // (samma system som svensk kalender använder) och veckans summa, så resultatet alltid syns bredvid
  // rätt vecka i själva matrisen istället för i en lös ruta som kan syfta på fel period.
  const dowLabels = ['MÅN', 'TIS', 'ONS', 'TOR', 'FRE', 'VECKA'];
  let html = dowLabels.map(d => `<div class="heatmap-dow${d === 'VECKA' ? ' heatmap-week-col-label' : ''}">${d}</div>`).join('');

  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month, daysInMonth);
  const rowStart = new Date(monthStart);
  rowStart.setDate(monthStart.getDate() - ((monthStart.getDay() + 6) % 7)); // måndagen i den första veckan
  const rowEnd = new Date(monthEnd);
  rowEnd.setDate(monthEnd.getDate() + (4 - ((monthEnd.getDay() + 6) % 7))); // fredagen i den sista veckan

  const cursor = new Date(rowStart);
  while (cursor <= rowEnd) {
    let weekSum = 0;
    let weekHasData = false;
    let rowHtml = '';
    for (let i = 0; i < 5; i++) {
      const d = new Date(cursor);
      d.setDate(cursor.getDate() + i);
      const inMonth = d.getMonth() === month;
      if (!inMonth) { rowHtml += '<div class="heatmap-cell"></div>'; continue; }
      const day = d.getDate();
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayTrades = byDate[dateStr];
      let cls = 'heatmap-cell';
      let pnlLabel = '';
      if (dayTrades && dayTrades.length) {
        const val = metricValue(dateStr);
        weekSum += val;
        weekHasData = true;
        const intensity = Math.min(4, Math.max(1, Math.ceil((Math.abs(val) / maxAbs) * 4)));
        cls += val >= 0 ? ` has-trades win-${intensity}` : ` has-trades loss-${intensity}`;
        const stats = statsByDate[dateStr];
        const overtradeMark = stats.giveback > 0.01 ? '<span title="Gav tillbaka från toppen">↩</span>' : '';
        pnlLabel = `<div class="dpnl">${val >= 0 ? '+' : ''}${Math.round(val)} ${overtradeMark}</div>`;
        if (rules.length) {
          const compliance = evaluateDayCompliance(dayTrades, rules);
          if (!compliance.compliant) cls += ' rule-flag';
        }
      } else {
        // Tomma handelsdagar (vardagar utan importerade trades) är klickbara för att importera en
        // CSV direkt utan att behöva byta till fliken "Importera" – vilka datum som faktiskt landar
        // i databasen styrs fortfarande av filens eget innehåll, inte av vilken ruta man klickade på.
        cls += ' heatmap-cell-empty';
        pnlLabel = '<div class="dpnl-add" title="Importera CSV eller avräkningsnota (PDF) för denna period">+</div>';
      }
      rowHtml += `<div class="${cls}" data-date="${dateStr}"><div class="dnum">${day}</div>${pnlLabel}</div>`;
    }
    const weekNo = isoWeekNumber(cursor);
    const weekCls = 'heatmap-cell heatmap-week-total' + (weekHasData ? (weekSum >= 0 ? ' pos' : ' neg') : '');
    rowHtml += `<div class="${weekCls}"><div class="dnum">V.${weekNo}</div>${weekHasData ? `<div class="dpnl">${weekSum >= 0 ? '+' : ''}${Math.round(weekSum)}</div>` : ''}</div>`;
    html += rowHtml;
    cursor.setDate(cursor.getDate() + 7);
  }

  const grid = document.getElementById('heatmapGrid');
  grid.innerHTML = html;
  grid.querySelectorAll('.heatmap-cell.has-trades').forEach(cell => {
    cell.addEventListener('click', () => openDayInfoModal(cell.dataset.date));
  });
  grid.querySelectorAll('.heatmap-cell.heatmap-cell-empty').forEach(cell => {
    cell.addEventListener('click', () => openQuickImportModal());
  });
}

// Liten genväg för att importera en CSV direkt från kalendern (klick på en tom vardag), så man
// slipper byta till fliken "Importera" separat. Modalen stängs direkt när en fil väljs/släpps och
// importen körs i bakgrunden – kalendern och statistiken uppdateras automatiskt (samma väg som en
// vanlig import tar), och en toast bekräftar när den är klar.
function openQuickImportModal() {
  openModal(`
    <h3>Importera CSV eller avräkningsnota</h3>
    <p class="muted small" style="margin-bottom:14px;">Snabbimport direkt från kalendern. Släpp en Avanza-CSV, en eller flera avräkningsnota-PDF:er, eller båda samtidigt – avräkningsnotan ger transaktionerna ett exakt klockslag som CSV-filen saknar. Vilka datum som importeras avgörs av filernas eget innehåll, inte av vilken ruta du klickade på.</p>
    <div class="dropzone" id="quickImportDropzone">
      <input type="file" id="quickImportFile" accept=".csv,.pdf" multiple hidden>
      <div class="dropzone-inner">
        <div class="dropzone-icon">⇪</div>
        <p><strong>Klicka för att välja filer</strong> eller dra och släpp CSV/PDF-filer här</p>
        <p class="muted small">Du kan välja/släppa flera filer samtidigt, av båda typerna.</p>
      </div>
    </div>
    <div class="modal-actions" style="margin-top:16px;">
      <button class="btn btn-ghost" id="quickImportClose">Stäng</button>
    </div>
  `);
  const dz = document.getElementById('quickImportDropzone');
  const input = document.getElementById('quickImportFile');
  const runImport = async (files) => {
    if (!files || !files.length) return;
    closeModal();
    // Läser rutan i #importResult (fliken Importera) uppdateras alltid, men den fliken syns inte just
    // nu (vi är kvar på Översikt) – utan en toast som faktiskt speglar vad som hände skulle ett
    // misslyckat/hängande PDF-inläsning se ut som att "ingenting händer" här, vilket rapporterades.
    const { csvResults, pdfResults } = await handleMixedImportFiles(files);
    const all = (csvResults || []).concat(pdfResults || []);
    const errors = all.filter(r => r.error);
    if (errors.length > 0) {
      showToast('Import misslyckades: ' + errors[0].error, 6000);
    } else if (all.length > 0) {
      showToast('Import klar – se Översikt för resultatet');
    } else {
      showToast('Inget importerades.');
    }
  };
  dz.addEventListener('click', () => input.click());
  input.addEventListener('change', (e) => { runImport(e.target.files); e.target.value = ''; });
  dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('dragover'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
  dz.addEventListener('drop', (e) => {
    e.preventDefault();
    dz.classList.remove('dragover');
    runImport(e.dataTransfer.files);
  });
  document.getElementById('quickImportClose').addEventListener('click', closeModal);
}

function setupHeatmapNav() {
  document.getElementById('heatmapPrev').addEventListener('click', async () => {
    heatmapCursor.setMonth(heatmapCursor.getMonth() - 1);
    await renderHeatmap();
    await renderGlobalStatsRow();
    await renderAchievements();
  });
  document.getElementById('heatmapNext').addEventListener('click', async () => {
    heatmapCursor.setMonth(heatmapCursor.getMonth() + 1);
    await renderHeatmap();
    await renderGlobalStatsRow();
    await renderAchievements();
  });
  document.getElementById('heatmapMetricFinalBtn').addEventListener('click', () => {
    heatmapMetric = 'final';
    document.getElementById('heatmapMetricFinalBtn').className = 'btn btn-small btn-primary';
    document.getElementById('heatmapMetricPeakBtn').className = 'btn btn-small btn-secondary';
    // Uppdaterar kalendern + vecka/månad/totalt-rutorna, men INTE via full renderOverview() –
    // den skulle döljt en redan öppen dagsdetalj som en bieffekt.
    renderHeatmap();
    renderGlobalStatsRow();
  });
  document.getElementById('heatmapMetricPeakBtn').addEventListener('click', () => {
    heatmapMetric = 'peak';
    document.getElementById('heatmapMetricPeakBtn').className = 'btn btn-small btn-primary';
    document.getElementById('heatmapMetricFinalBtn').className = 'btn btn-small btn-secondary';
    renderHeatmap();
    renderGlobalStatsRow();
  });
}

/* ---------- Gamification: streaks & badges ---------- */
async function computeStreaks(trades) {
  if (!trades) trades = await dbGetAll('trades');
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

// Prestationsstatistik räknad över HELA handelshistoriken, per hel position (entry + ev.
// TP1/TP2/TP3...) snarare än per enskild transaktionsrad – annars skulle en position med flera
// delvisa uttag felaktigt räknas som flera separata "trades" i vinst/förlust-måtten. Detta är samma
// typ av nyckeltal (träffsäkerhet, profit factor, förväntat värde, drawdown) som prop firms och
// institutionella tradingdesks använder för att utvärdera en strategi, till skillnad från de gamla
// "prestationsmärkena" som bara mätte hur mycket data som fanns i appen (t.ex. "10 trades loggade").
function computeOverallPerformanceStats(allTrades) {
  const byDate = {};
  allTrades.forEach(t => { (byDate[t.date] = byDate[t.date] || []).push(t); });
  const dates = Object.keys(byDate).sort();

  let allGroups = [];
  const dailyPnl = [];
  dates.forEach(d => {
    const dayTrades = byDate[d].slice().sort((a, b) => a.fileOrder - b.fileOrder);
    allGroups = allGroups.concat(computeTradeGroupsForDay(dayTrades));
    dailyPnl.push({ date: d, pnl: dayTrades.reduce((s, t) => s + (t.result || 0), 0) });
  });

  const wins = allGroups.filter(g => g.totalResult > 0);
  const losses = allGroups.filter(g => g.totalResult < 0);
  const totalPositions = allGroups.length;
  const winRate = totalPositions > 0 ? (wins.length / totalPositions) * 100 : null;
  const grossProfit = wins.reduce((s, g) => s + g.totalResult, 0);
  const grossLoss = Math.abs(losses.reduce((s, g) => s + g.totalResult, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? null : 0); // null = ingen förlust ännu (oändlig)
  const avgWin = wins.length ? grossProfit / wins.length : 0;
  const avgLoss = losses.length ? grossLoss / losses.length : 0;
  const payoffRatio = avgLoss > 0 ? avgWin / avgLoss : null;
  const expectancy = totalPositions > 0 ? (winRate / 100) * avgWin - (1 - winRate / 100) * avgLoss : 0;

  // Störst nedgång (drawdown): peak-till-trough på det ackumulerade resultatet, dag för dag.
  let equity = 0, peakEquity = 0, maxDrawdown = 0;
  dailyPnl.forEach(d => {
    equity += d.pnl;
    if (equity > peakEquity) peakEquity = equity;
    const dd = peakEquity - equity;
    if (dd > maxDrawdown) maxDrawdown = dd;
  });

  const bestDay = dailyPnl.reduce((best, d) => (!best || d.pnl > best.pnl) ? d : best, null);
  const worstDay = dailyPnl.reduce((worst, d) => (!worst || d.pnl < worst.pnl) ? d : worst, null);
  const avgPerDay = dailyPnl.length ? dailyPnl.reduce((s, d) => s + d.pnl, 0) / dailyPnl.length : 0;

  let longestLossStreak = 0, curLossStreak = 0;
  dailyPnl.forEach(d => {
    if (d.pnl < 0) { curLossStreak++; longestLossStreak = Math.max(longestLossStreak, curLossStreak); }
    else curLossStreak = 0;
  });

  return {
    totalPositions, winRate, profitFactor, avgWin, avgLoss, payoffRatio, expectancy,
    maxDrawdown, bestDay, worstDay, avgPerDay, longestLossStreak,
  };
}

async function renderAchievements() {
  const allTrades = await dbGetAll('trades');

  const banner = document.getElementById('streakBanner');
  const shelf = document.getElementById('badgeShelf');
  const headerLabel = document.getElementById('statsMonthLabel');

  if (allTrades.length === 0) {
    if (headerLabel) headerLabel.textContent = '';
    banner.innerHTML = `<span class="muted">Importera trades för att börja bygga din statistik.</span>`;
    shelf.innerHTML = '';
    return;
  }

  // Samma vald månad som kalendern nedan (heatmapCursor) styr – bläddrar du till juli visas
  // juli-statistik här, inte hela historiken.
  const cursorMonth = heatmapCursor || new Date();
  const monthRange = getMonthRange(cursorMonth);
  const trades = allTrades.filter(t => {
    const d = new Date(t.date + 'T00:00:00');
    return d >= monthRange.start && d <= monthRange.end;
  });
  const monthLabelText = cursorMonth.toLocaleDateString('sv-SE', { month: 'long', year: 'numeric' });
  const monthLabel = monthLabelText.charAt(0).toUpperCase() + monthLabelText.slice(1);
  if (headerLabel) headerLabel.textContent = monthLabel;

  if (trades.length === 0) {
    banner.innerHTML = `<span class="muted">Inga trades i ${monthLabel.toLowerCase()}.</span>`;
    shelf.innerHTML = '';
    return;
  }

  const streaks = await computeStreaks(trades);

  banner.innerHTML = `
    <span class="streak-icon"></span>
    <div class="streak-figure"><span class="num">${streaks.current}</span><span class="lbl">Nuvarande vinststreak</span></div>
    <div class="streak-figure"><span class="num">${streaks.best}</span><span class="lbl">Bästa streak</span></div>
    <div class="streak-figure"><span class="num">${streaks.tradingDays}</span><span class="lbl">Handelsdagar</span></div>
  `;

  const perf = computeOverallPerformanceStats(trades);
  const pfLabel = perf.profitFactor === null ? (perf.avgWin > 0 ? '∞' : '–') : perf.profitFactor.toFixed(2);
  const pfCls = perf.profitFactor === null ? (perf.avgWin > 0 ? 'pos' : '') : (perf.profitFactor >= 1 ? 'pos' : 'neg');
  shelf.innerHTML = [
    statBox('Träffsäkerhet (trades)', perf.winRate !== null ? perf.winRate.toFixed(0) + '%' : '–'),
    statBox('Profit factor', pfLabel, pfCls),
    statBox('Snittvinst', formatMoney(perf.avgWin), perf.avgWin > 0 ? 'pos' : '', perf.avgWin),
    statBox('Snittförlust', formatMoney(-perf.avgLoss), perf.avgLoss > 0 ? 'neg' : '', -perf.avgLoss),
    statBox('Förväntat värde / trade', formatMoney(perf.expectancy), perf.expectancy >= 0 ? 'pos' : 'neg', perf.expectancy),
    statBox('Störst nedgång (drawdown)', formatMoney(-perf.maxDrawdown), perf.maxDrawdown > 0 ? 'neg' : '', -perf.maxDrawdown),
    perf.bestDay ? statBox('Bästa dag', formatMoney(perf.bestDay.pnl), 'pos', perf.bestDay.pnl) : '',
    perf.worstDay ? statBox('Sämsta dag', formatMoney(perf.worstDay.pnl), perf.worstDay.pnl < 0 ? 'neg' : '', perf.worstDay.pnl) : '',
    statBox('Snitt / handelsdag', formatMoney(perf.avgPerDay), perf.avgPerDay >= 0 ? 'pos' : 'neg', perf.avgPerDay),
    statBox('Längsta förlust-streak', perf.longestLossStreak + (perf.longestLossStreak === 1 ? ' dag' : ' dagar')),
  ].join('');
  runStatAnimations(shelf);
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
}

/* ---------- Tema: ljust / mörkt läge ---------- */
const THEME_STORAGE_KEY = 'tj_theme';
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const darkBtn = document.getElementById('themeDarkBtn');
  const lightBtn = document.getElementById('themeLightBtn');
  if (darkBtn && lightBtn) {
    darkBtn.classList.toggle('active', theme === 'dark');
    lightBtn.classList.toggle('active', theme === 'light');
  }
}
function getStoredTheme() {
  try { return localStorage.getItem(THEME_STORAGE_KEY); } catch (e) { return null; }
}
function setStoredTheme(theme) {
  try { localStorage.setItem(THEME_STORAGE_KEY, theme); } catch (e) { /* privat läge etc. – strunta i det */ }
}
function setupThemeToggle() {
  const stored = getStoredTheme();
  const prefersLight = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: light)').matches;
  applyTheme(stored || (prefersLight ? 'light' : 'dark'));
  document.getElementById('themeDarkBtn').addEventListener('click', () => { applyTheme('dark'); setStoredTheme('dark'); });
  document.getElementById('themeLightBtn').addEventListener('click', () => { applyTheme('light'); setStoredTheme('light'); });
}

document.addEventListener('DOMContentLoaded', async () => {
  setupThemeToggle();
  try {
    await openDB();
  } catch (err) {
    console.error('IndexedDB kunde inte öppnas', err);
    showToast('Kunde inte öppna lokal lagring i webbläsaren.');
  }
  setupGlobalUI();
  setupImport();
  // Läker automatiskt eventuella gamla "spöktrades" från avräkningsnota-import (skapade innan
  // matchningen mot CSV-rader var tillräckligt robust) varje gång appen laddas, så befintlig felaktig
  // data rättas till utan att man behöver importera om något.
  try { await healAllOrphanAvrakningsnotaTrades(); } catch (err) { console.error('Kunde inte läka spöktrades', err); }
  renderOverview();
});
