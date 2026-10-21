'use strict';
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const COLORS = ['#b65a3c', '#4776b4', '#8b59a2', '#278678', '#ac7b20', '#bd557d'];
function nightTotal(start, checkout, weekday, weekend) {
  let total = 0;
  for (let offset = 0; offset < checkout - 1; offset++) {
    const day = (start + offset) % 7;
    total += day === 5 || day === 6 ? weekend : weekday;
  }
  return total;
}
function isRestDay(day, interval, includeTravel = false) {
  return interval > 0 && day > 1 && (day - (includeTravel ? 0 : 1)) % interval === 0;
}
function restDays(checkout, interval, includeTravel = false) {
  if (!interval) return [];
  const days = [];
  for (let day = interval + (includeTravel ? 0 : 1); day < checkout; day += interval) days.push(day);
  return days;
}
function parkDayOffsets(checkout, interval, includeTravel = false) {
  const offsets = [];
  for (let day = 1; day <= checkout; day++) {
    const travel = day === 1 || day === checkout;
    if (travel ? includeTravel : !isRestDay(day, interval, includeTravel)) offsets.push(day - 1);
  }
  return offsets;
}
function parkDays(start, checkout, interval, includeTravel = false) {
  let weekdays = 0, weekends = 0;
  for (const offset of parkDayOffsets(checkout, interval, includeTravel)) {
    const weekday = (start + offset) % 7;
    if (weekday === 0 || weekday === 6) weekends++;
    else weekdays++;
  }
  return { total: weekdays + weekends, weekdays, weekends };
}
function rankingMetrics(start, checkout, weekday, weekend, interval, includeTravel = false) {
  let saturday = 0, sunday = 0;
  for (const offset of parkDayOffsets(checkout, interval, includeTravel)) {
    const dow = (start + offset) % 7;
    if (dow === 6) saturday++;
    if (dow === 0) sunday++;
  }
  return { points: nightTotal(start, checkout, weekday, weekend), saturday, sunday, departure: (start + checkout - 1) % 7 };
}
function compareOptions(a, b, rules) {
  for (const rule of rules.order || ['points', 'saturday', 'sunday', 'departure']) {
    if (rule !== 'points' && !rules[rule]) continue;
    const difference = rule === 'departure'
      ? Number(!rules.preferred.includes(a.departure)) - Number(!rules.preferred.includes(b.departure))
      : a[rule] - b[rule];
    if (difference) return difference;
  }
  return 0;
}
function rankOptions(options, rules) {
  const sorted = [...options].sort((a, b) => compareOptions(a, b, rules));
  const allTied = compareOptions(sorted[0], sorted[sorted.length - 1], rules) === 0;
  return options.map(option => allTied ? 'Tied' : compareOptions(option, sorted[0], rules) === 0 ? 'Best' : compareOptions(option, sorted[sorted.length - 1], rules) === 0 ? 'Worst' : '');
}
function encodeComparison(state) {
  const bytes = new TextEncoder().encode(JSON.stringify(state));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return 'v1.' + btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function decodeComparison(encoded) {
  if (encoded.length > 64000) throw new Error('Comparison link is too large.');
  if (!encoded.startsWith('v1.')) throw new Error('This comparison link uses an unsupported version.');
  const payload = encoded.slice(3);
  if (!payload || !/^[A-Za-z0-9_-]+$/.test(payload)) throw new Error('Invalid comparison encoding.');
  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(binary, char => char.charCodeAt(0))));
}
if (typeof module !== 'undefined') module.exports = { nightTotal, restDays, parkDays, rankingMetrics, compareOptions, rankOptions, encodeComparison, decodeComparison };
if (typeof document !== 'undefined') {
  const el = id => document.getElementById(id);
  el('footer-year').textContent = new Date().getFullYear();
  const count = 30;
  let weekday = null, weekend = null, nextId = 1, restInterval = 0;
  const selections = [];
  let requestedRows = 0;
  let activeComparison = 0, nextComparisonId = 2;
  const comparisons = [{ id: 1, resort: 'select', room: '', view: '', period: '', weekday: null, weekend: null }];
  function saveComparison() {
    Object.assign(comparisons[activeComparison], { resort: el('resort').value, room: el('room').value, view: el('view').value, period: el('period').value, weekday, weekend });
  }
  function comparisonName(comparison) {
    return window.DVC_POINTS?.resorts.find(resort => resort.id === comparison.resort)?.name || (comparison.resort === '' ? 'Manual points' : 'Select resort');
  }
  function renderComparisonTabs() {
    for (const container of document.querySelectorAll('.comparison-tabs')) {
      container.replaceChildren();
      comparisons.forEach((comparison, index) => {
        const group = document.createElement('div'); group.className = 'comparison-tab-group';
        const button = document.createElement('button'); button.type = 'button'; button.setAttribute('role', 'tab');
        button.setAttribute('aria-selected', String(index === activeComparison)); button.tabIndex = index === activeComparison ? 0 : -1;
        button.textContent = `${comparison.id}. ${comparisonName(comparison)}`;
        button.title = [comparisonName(comparison), comparison.room, comparison.view].filter(Boolean).join(' · ');
        button.addEventListener('click', () => switchComparison(index));
        button.addEventListener('keydown', event => {
          let next;
          if (event.key === 'ArrowRight') next = (index + 1) % comparisons.length;
          if (event.key === 'ArrowLeft') next = (index + comparisons.length - 1) % comparisons.length;
          if (event.key === 'Home') next = 0;
          if (event.key === 'End') next = comparisons.length - 1;
          if (next === undefined) return;
          event.preventDefault(); switchComparison(next); container.querySelector('[aria-selected="true"]').focus();
        });
        group.append(button);
        if (comparisons.length > 1) {
          const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'remove-comparison'; remove.textContent = '×';
          remove.setAttribute('aria-label', `Remove resort ${comparison.id}: ${comparisonName(comparison)}`);
          remove.addEventListener('click', () => { saveComparison(); comparisons.splice(index, 1); activeComparison = index < activeComparison ? activeComparison - 1 : Math.min(activeComparison, comparisons.length - 1); restoreComparison(); });
          group.append(remove);
        }
        container.append(group);
      });
      const add = document.createElement('button'); add.type = 'button'; add.className = 'add-comparison'; add.textContent = '+ Compare resort'; add.disabled = comparisons.length >= 3;
      add.addEventListener('click', () => {
        saveComparison(); comparisons.push({ id: nextComparisonId++, resort: 'select', room: '', view: '', period: '', weekday: null, weekend: null });
        activeComparison = comparisons.length - 1; restoreComparison(); el('resort-disclosure').open = true;
      });
      container.append(add);
    }
    el('ranking-resort-note').textContent = `Rankings use resort ${comparisons[activeComparison].id}: ${comparisonName(comparisons[activeComparison])}. Park and travel days are shared.`;
  }
  function switchComparison(index) { saveComparison(); activeComparison = index; restoreComparison(); }
  function restoreComparison() {
    const comparison = comparisons[activeComparison];
    weekday = comparison.weekday; weekend = comparison.weekend;
    el('resort').value = comparison.resort;
    const resort = selectedResort();
    for (const id of ['room', 'view', 'period']) { el(id).disabled = !resort; el(id).closest('label').hidden = !resort; }
    el('manual-points').hidden = comparison.resort !== '';
    el('chart-source').hidden = !resort;
    el('category-note').hidden = resort?.id !== 'AKV_AKV2';
    if (resort) {
      fillSelect(el('room'), [...new Set(resort.categories.map(category => category.room))].map(room => [room, room]));
      el('room').value = comparison.room;
      fillViews(); el('view').value = comparison.view;
      fillSelect(el('period'), resort.periods.map(period => [period.id, period.label])); el('period').value = comparison.period;
      updateSourceLink(resort);
    } else {
      for (const id of ['room', 'view', 'period']) fillSelect(el(id), [['', 'Select a resort']]);
      el('chart-source').removeAttribute('href');
    }
    el('weekday').value = weekday ?? ''; el('weekend').value = weekend ?? '';
    el('preset-status').textContent = pointsReady() ? `${resort ? 'Chart rates' : 'Manual points'}: ${weekday} Sun–Thu / ${weekend} Fri–Sat points per night.` : 'Select a resort or enter both manual point values.';
    renderGrid();
  }
  function resortPointRows(selection) {
    return '<tr class="section-heading"><th colspan="8">Night points by resort</th></tr>' + comparisons.map((comparison, index) => {
      const row = document.createElement('tr'); row.className = 'points-row' + (index === activeComparison ? ' active-resort-row' : '');
      row.dataset.comparison = comparison.id;
      const heading = document.createElement('th'); heading.scope = 'row'; heading.className = 'measure-label resort-row-label';
      const link = document.createElement('button'); link.type = 'button'; link.className = 'resort-result-link'; link.dataset.comparisonIndex = index;
      link.textContent = `${comparison.id}. ${comparisonName(comparison)}`;
      link.setAttribute('aria-label', `Show resort ${comparison.id}: ${comparisonName(comparison)} in main table`);
      heading.append(link);
      heading.title = [comparison.room, comparison.view].filter(Boolean).join(' · '); row.append(heading);
      DAYS.forEach((_, start) => {
        const cell = document.createElement('td'), total = comparisonTotal(comparison, start, selection.day);
        const estimate = total !== null && estimatedStay(comparison, start, selection.day);
        cell.textContent = total === null ? '—' : `${estimate ? '~' : ''}${total}`;
        if (estimate) { cell.classList.add('estimated-total'); cell.title = estimateExplanation(); cell.setAttribute('aria-label', `Estimated total: ${total} points`); }
        row.append(cell);
      });
      return row.outerHTML;
    }).join('');
  }
  function firstDate() {
    const input = el('earliest-checkin');
    return input.value && input.validity.valid ? new Date(input.value + 'T00:00:00Z') : null;
  }
  function columnDate(column, offset = 0) {
    const first = firstDate();
    if (!first) return null;
    first.setUTCDate(first.getUTCDate() + column + offset); return first;
  }
  function columnDay(column) { return columnDate(column)?.getUTCDay() ?? column; }
  function shortDate(date) { return date ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) : ''; }
  function rateForDate(comparison, date) {
    if (!date) return null;
    const resort = window.DVC_POINTS?.resorts.find(resort => resort.id === comparison.resort);
    const dow = date.getUTCDay();
    if (!resort) return comparison.resort === '' && comparison.weekday !== null && comparison.weekend !== null ? (dow === 5 || dow === 6 ? comparison.weekend : comparison.weekday) : null;
    let iso = date.toISOString().slice(0, 10);
    if (date.getUTCFullYear() === 2028) {
      // Use the prior chart's month/day, but the actual date's night type.
      const monthDay = iso.slice(5) === '02-29' ? '02-28' : iso.slice(5);
      iso = '2027-' + monthDay;
    }
    const period = resort.periods.find(period => period.ranges.some(range => iso >= range.start && iso <= range.end));
    const index = resort.categories.findIndex(category => category.room === comparison.room && category.view === comparison.view);
    return period && index >= 0 ? period.rates[index][dow === 5 || dow === 6 ? 'weekend' : 'weekday'] : null;
  }
  function estimatedNight(comparison, date) {
    return !!date && date.getUTCFullYear() === 2028 && comparison.resort !== '' && comparison.resort !== 'select' && rateForDate(comparison, date) !== null;
  }
  function estimatedStay(comparison, column, checkout) {
    for (let offset = 0; offset < checkout - 1; offset++) if (estimatedNight(comparison, columnDate(column, offset))) return true;
    return false;
  }
  function estimateExplanation() {
    return 'Estimate: 2028 nights use the matching month/day from the 2027 chart, with the actual night’s weekday/weekend rate. February 29 uses February 28.';
  }
  function comparisonTotal(comparison, column, checkout) {
    if (!firstDate() || comparison.resort === 'select' || comparison.weekday === null || comparison.weekend === null) return null;
    let total = 0;
    for (let offset = 0; offset < checkout - 1; offset++) {
      const rate = rateForDate(comparison, columnDate(column, offset));
      if (rate === null) return null;
      total += rate;
    }
    return total;
  }
  function columnHeaders(selection) {
    const ranks = selection ? rankingData(selection)?.ranks : null;
    return DAYS.map((_, column) => `<th scope="col">${ranks?.[column] ? `<span class="rank-badge floating-rank rank-${ranks[column].toLowerCase()}">${ranks[column]}</span>` : ''}${DAYS[columnDay(column)]}<small class="column-date">${shortDate(columnDate(column))}</small></th>`).join('');
  }
  function updateComparisonVisibility() {
    const ready = !!firstDate() && comparisons.every(comparison => comparison.resort !== 'select' && comparison.weekday !== null && comparison.weekend !== null);
    el('comparison-area').hidden = !ready;
    el('comparison-placeholder').hidden = ready;
    el('comparison-placeholder').textContent = !firstDate() ? 'Choose an earliest check-in date and complete your resort selections to see the comparison.' : 'Complete each resort selection (or both manual point values) to see the comparison.';
    el('period').closest('label').hidden = !!firstDate() || !selectedResort();
    el('date-rate-note').hidden = !firstDate();
  }
  function highlightDays() {
    const checkoutDays = new Set(selections.map(selection => selection.day));
    const lastIncludedDay = Math.max(0, ...checkoutDays);
    for (const [offset, row] of Array.from(el('grid').tBodies[0].rows).entries()) {
      row.classList.toggle('outside-stay', offset + 1 > lastIncludedDay);
      row.classList.toggle('rest-day', isRestDay(offset + 1, restInterval, el('travel-park').checked));
      row.classList.toggle('arrival-day', offset === 0);
      row.classList.toggle('checkout-day', checkoutDays.has(offset + 1));
      const labels = [];
      if (offset === 0) labels.push('Arrival');
      if (isRestDay(offset + 1, restInterval, el('travel-park').checked)) labels.push('Rest day, if before checkout');
      if (checkoutDays.has(offset + 1)) labels.push('Checkout for line ' + selections.filter(selection => selection.day === offset + 1).map(selection => selection.id).join(', '));
      row.title = labels.join(' · ');
      Array.from(row.cells).slice(1).forEach((cell, start) => {
        const day = (columnDay(start) + offset) % 7;
        const isRest = row.classList.contains('rest-day') && !row.classList.contains('checkout-day') && !row.classList.contains('arrival-day');
        cell.classList.toggle('saturday-rest', isRest && day === 6);
        cell.classList.toggle('sunday-rest', isRest && day === 0);
        cell.title = (isRest && day === 6 ? '★ Saturday rest day — if before checkout' : isRest && day === 0 ? '◆ Sunday rest day — if before checkout' : '') + (cell.classList.contains('estimated-night') ? ' · ' + columnDate(start, offset).toISOString().slice(0,10) + ' · ' + estimateExplanation() : '');
      });
    }
  }
  function visibleDayCount() {
    return window.matchMedia('(max-width:700px)').matches ? Math.min(count, Math.max(8, requestedRows, ...selections.map(selection => selection.day + (requestedRows ? 0 : 3)))) : count;
  }
  function updateVisibleRows() {
    const visible = visibleDayCount(), mobile = window.matchMedia('(max-width:700px)').matches;
    Array.from(el('grid').tBodies[0].rows).forEach((row, index) => { row.hidden = index >= visible; });
    el('extra-days-controls').hidden = !mobile;
    el('more-days').hidden = visible === count;
    el('trim-days').hidden = requestedRows === 0;
    el('visible-days-status').textContent = `Showing ${visible} of ${count} days`;
    positionLines();
  }
  function positionLines() {
    const rows = el('grid').tBodies[0].rows;
    for (const selection of selections) {
      const row = rows[selection.day - 1];
      const wrap = el('grid-wrap').getBoundingClientRect();
      el(`line-${selection.id}`).style.top = `${row.getBoundingClientRect().bottom - wrap.top}px`;
    }
  }
  function update(selection, day) {
    selection.day = Math.max(1, Math.min(count, Math.round(day)));
    renderResults();
    const line = el(`line-${selection.id}`);
    line.dataset.label = `${selection.id} · Checkout day ${selection.day}`;
    line.dataset.compact = `${selection.id} · ${selection.day}`;
    line.setAttribute('aria-valuenow', selection.day);
    line.setAttribute('aria-valuetext', `Checkout day ${selection.day}, ${selection.day - 1} nights`);
    highlightDays();
    updateVisibleRows();
  }
  function pointsReady() { return weekday !== null && weekend !== null; }
  function rankingData(selection) {
    if (!el('rank').checked) return null;
    if (!pointsReady()) return { message: 'Select chart rates or enter both point values to rank options.' };
    const rules = { order: Array.from(el('rule-order').children, item => item.dataset.rule), saturday: el('rank-sat').checked, sunday: el('rank-sun').checked, departure: el('rank-departure').checked, preferred: Array.from(document.querySelectorAll('.preferred-day:checked'), input => Number(input.value)) };
    const metrics = DAYS.map((_, start) => ({ ...rankingMetrics(columnDay(start), selection.day, weekday, weekend, restInterval, el('travel-park').checked), points: comparisonTotal(comparisons[activeComparison], start, selection.day) }));
    if (metrics.some(metric => metric.points === null)) return { message: 'Ranking unavailable: some stay nights are outside the loaded 2027 chart.' };
    return { metrics, ranks: rankOptions(metrics, rules) };
  }
  function sectionToggle(selection, section, label) {
    return `<tr class="section-heading"><th colspan="8"><button type="button" class="result-section-toggle" data-section="${section}" aria-expanded="${!!selection[section + 'Open']}" aria-controls="${section}-${selection.id}"><span aria-hidden="true">${selection[section + 'Open'] ? '▾' : '▸'}</span> ${label}</button></th></tr>`;
  }
  function rankingRows(selection) {
    const data = rankingData(selection);
    if (!data) return '';
    return sectionToggle(selection, 'comparison', 'Comparison details') + `</tbody><tbody id="comparison-${selection.id}" ${selection.comparisonOpen ? '' : 'hidden'}>` +
      (data.message ? `<tr><td colspan="8" class="ranking-pending">${data.message}</td></tr>` :
      [['saturday', 'Sat park'], ['sunday', 'Sun park'], ['departure', 'Depart']].map(([key, label]) => `<tr class="ranking-detail"><th scope="row" class="measure-label">${label}</th>${data.metrics.map(metric => `<td>${key === 'departure' ? DAYS[metric[key]] : metric[key]}</td>`).join('')}</tr>`).join(''));
  }
  function renderResults() {
    el('results').replaceChildren();
    if (!selections.length) el('results').textContent = 'Add a checkout line to compare stays.';
    for (const selection of selections) {
      const card = document.createElement('article');
      card.className = 'result'; card.style.setProperty('--color', selection.color);
      card.innerHTML = `<div class="result-head"><strong>Checkout ${selection.id}</strong><span class="night-count">${selection.day - 1} nights</span><button class="remove" aria-label="Remove checkout ${selection.id}">×</button></div><label>Checkout day <input type="number" min="1" max="${count}" step="1" value="${selection.day}" aria-label="Checkout day for line ${selection.id}"></label><table class="totals"><caption class="sr-only">Total points by starting weekday for checkout ${selection.id}</caption><colgroup><col class="label-column">${DAYS.map(() => '<col>').join('')}</colgroup><thead><tr><th scope="col" class="start-label">Start day</th>${columnHeaders(selection)}</tr></thead><tbody>${resortPointRows(selection)}${sectionToggle(selection, 'park', 'Park days')}</tbody><tbody id="park-${selection.id}" ${selection.parkOpen ? '' : 'hidden'}>${[['total', 'Total'], ['weekdays', 'Weekday'], ['weekends', 'Weekend']].map(([key, label]) => `<tr class="park-counts"><th scope="row" class="measure-label">${label}</th>${DAYS.map((_, start) => `<td><b>${parkDays(columnDay(start), selection.day, restInterval, el('travel-park').checked)[key]}</b></td>`).join('')}</tr>`).join('')}</tbody><tbody>${rankingRows(selection)}</tbody></table>`;
      card.querySelector('input').addEventListener('change', event => {
        if (event.target.validity.valid) update(selection, Number(event.target.value));
      });
      card.querySelector('.remove').addEventListener('click', () => {
        selections.splice(selections.indexOf(selection), 1); renderLines(); renderResults();
      });
      for (const toggle of card.querySelectorAll('.result-section-toggle')) toggle.addEventListener('click', () => {
        const key = toggle.dataset.section + 'Open'; selection[key] = !selection[key];
        const body = card.querySelector('#' + toggle.getAttribute('aria-controls')); body.hidden = !selection[key];
        toggle.setAttribute('aria-expanded', String(selection[key]));
        toggle.querySelector('span').textContent = selection[key] ? '▾' : '▸';
      });
      for (const link of card.querySelectorAll('.resort-result-link')) link.addEventListener('click', () => {
        switchComparison(Number(link.dataset.comparisonIndex));
        const replacement = el('results').querySelector(`[data-comparison="${comparisons[activeComparison].id}"] .resort-result-link`);
        replacement?.focus({ preventScroll: true });
      });
      const ranks = rankingData(selection)?.ranks;
      ranks?.forEach((rank, index) => {
        if (rank !== 'Best' && rank !== 'Worst') return;
        for (const row of card.querySelectorAll('.totals tr')) {
          if (row.cells.length === 8 && (!row.classList.contains('points-row') || row.classList.contains('active-resort-row'))) row.cells[index + 1].classList.add(`column-${rank.toLowerCase()}`);
        }
      });
      if (comparisons.some(comparison => DAYS.some((_, start) => estimatedStay(comparison, start, selection.day)))) {
        const note = document.createElement('p'); note.className = 'estimate-note';
        note.textContent = '~ Estimated totals include 2028 nights priced from the matching 2027 dates.' + (el('rank').checked ? ' Rankings may depend on these estimates.' : '');
        note.title = estimateExplanation(); card.append(note);
      }
      el('results').append(card);
    }
  }
  function renderLines() {
    el('lines').replaceChildren();
    for (const selection of selections) {
      const line = document.createElement('div');
      line.id = `line-${selection.id}`; line.className = 'line'; line.tabIndex = 0;
      line.style.setProperty('--color', selection.color);
      line.dataset.label = `${selection.id} · Checkout day ${selection.day}`;
    line.dataset.compact = `${selection.id} · ${selection.day}`;
      line.setAttribute('role', 'slider'); line.setAttribute('aria-label', `Checkout ${selection.id}`);
      line.setAttribute('aria-orientation', 'vertical'); line.setAttribute('aria-valuemin', '1');
      line.setAttribute('aria-valuemax', count); line.setAttribute('aria-valuenow', selection.day);
      line.setAttribute('aria-valuetext', `Checkout day ${selection.day}, ${selection.day - 1} nights`);
      line.addEventListener('keydown', event => {
        const values = { ArrowUp: selection.day - 1, ArrowDown: selection.day + 1, Home: 1, End: count };
        if (event.key in values) { event.preventDefault(); update(selection, values[event.key]); }
      });
      let dragging = false, dragLimit = count;
      line.addEventListener('pointerdown', event => {
        if (event.button !== 0) return;
        dragging = true; dragLimit = visibleDayCount(); if (window.matchMedia('(max-width:700px)').matches) requestedRows = Math.max(requestedRows, dragLimit); line.setPointerCapture(event.pointerId);
        line.focus({ preventScroll: true }); event.preventDefault();
      });
      line.addEventListener('pointermove', event => {
        if (!dragging) return;
        const rows = el('grid').tBodies[0].rows;
        const top = rows[0].getBoundingClientRect().top;
        const day = Math.max(1, Math.min(dragLimit, Math.round((event.clientY - top) / rows[0].getBoundingClientRect().height)));
        if (day !== selection.day) update(selection, day);
      });
      for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) line.addEventListener(type, () => { dragging = false; });
      el('lines').append(line);
    }
    highlightDays();
    updateVisibleRows();
  }
  function updateControlSummaries() {
    el('settings-summary').textContent = `${restInterval ? `Every ${restInterval} days` : 'No rest days'} · travel ${el('travel-park').checked ? 'included' : 'excluded'}`;
    const resort = window.DVC_POINTS?.resorts.find(resort => resort.id === el('resort').value);
    el('resort-summary').textContent = resort ? `${resort.name} · ${firstDate() ? `from ${shortDate(firstDate())}` : el('period').selectedOptions[0]?.textContent || ''}` : el('resort').value === 'select' ? 'Select Resort' : `Manual · ${weekday ?? '—'} / ${weekend ?? '—'} pts`;
  }
  function renderGrid() {
    saveComparison(); renderComparisonTabs();
    updateControlSummaries(); updateComparisonVisibility();
    el('grid').tHead.innerHTML = `<tr><th scope="col">Day</th>${columnHeaders()}</tr>`;
    el('grid').tBodies[0].innerHTML = Array.from({length: count}, (_, offset) => `<tr><td>${offset + 1}</td>${DAYS.map((_, start) => {
      const day = (columnDay(start) + offset) % 7;
      const isWeekendNight = day === 5 || day === 6;
      const isWeekendDay = day === 6 || day === 0;
      const date = columnDate(start, offset), rate = rateForDate(comparisons[activeComparison], date);
      const estimate = estimatedNight(comparisons[activeComparison], date);
      return `<td class="${isWeekendDay ? 'weekend' : ''}${estimate ? ' estimated-night' : ''}"><span>${DAYS[day]}</span><b${estimate ? ` aria-label="Estimated ${rate} points for ${date.toISOString().slice(0,10)}"` : ''}>${rate === null ? '—' : `${estimate ? '~' : ''}${rate}`}</b></td>`;
    }).join('')}</tr>`).join('');
    renderLines(); renderResults();
  }
  for (const id of ['weekday', 'weekend']) el(id).addEventListener('input', event => {
    const valid = event.target.value !== '' && event.target.validity.valid && Number.isSafeInteger(Number(event.target.value));
    if (id === 'weekday') weekday = valid ? Number(event.target.value) : null;
    else weekend = valid ? Number(event.target.value) : null;
    el('preset-status').textContent = pointsReady() ? 'Using manual points.' : 'Enter both weekday and weekend points.';
    renderGrid();
  });
  el('travel-park').addEventListener('change', () => { updateControlSummaries(); highlightDays(); renderResults(); });
  el('rest').addEventListener('change', event => {
    restInterval = Number(event.target.value);
    updateControlSummaries(); highlightDays(); renderResults();
  });
  el('add').addEventListener('click', () => {
    const id = nextId++;
    selections.push({ id, day: Math.min(count, 8 + selections.length * 3), color: COLORS[(id - 1) % COLORS.length] });
    renderLines(); renderResults();
  });
  for (const input of document.querySelectorAll('#ranking-controls input')) input.addEventListener('change', renderResults);
  function updateRuleButtons() {
    const items = Array.from(el('rule-order').children);
    items.forEach((item, index) => {
      item.querySelector('[data-direction="up"]').disabled = index === 0;
      item.querySelector('[data-direction="down"]').disabled = index === items.length - 1;
    });
  }
  el('rule-order').addEventListener('click', event => {
    const button = event.target.closest('button[data-direction]');
    if (!button) return;
    const item = button.closest('li');
    if (button.dataset.direction === 'up' && item.previousElementSibling) item.previousElementSibling.before(item);
    else if (button.dataset.direction === 'down' && item.nextElementSibling) item.nextElementSibling.after(item);
    updateRuleButtons(); renderResults();
    const nextFocus = button.disabled ? item.querySelector('button:not(:disabled)') : button;
    nextFocus?.focus();
  });
  let ruleDrag = null;
  el('rule-order').addEventListener('pointerdown', event => {
    const handle = event.target.closest('.rule-drag');
    if (!handle || event.button !== 0) return;
    event.preventDefault();
    const item = handle.closest('li');
    ruleDrag = { item, pointerId: event.pointerId, original: Array.from(el('rule-order').children) };
    item.classList.add('dragging-rule');
    document.body.classList.add('reordering-rules');
    handle.focus();
  });
  window.addEventListener('pointermove', event => {
    if (!ruleDrag || event.pointerId !== ruleDrag.pointerId) return;
    event.preventDefault();
    const list = el('rule-order');
    const others = Array.from(list.children).filter(item => item !== ruleDrag.item);
    const next = others.find(item => {
      const box = item.getBoundingClientRect();
      return event.clientY < box.top + box.height / 2;
    });
    if (next) list.insertBefore(ruleDrag.item, next);
    else list.append(ruleDrag.item);
  }, { passive: false });
  function finishRuleDrag(event) {
    if (!ruleDrag || event.pointerId !== ruleDrag.pointerId) return;
    const { item, original } = ruleDrag;
    if (event.type === 'pointercancel') for (const rule of original) el('rule-order').append(rule);
    item.classList.remove('dragging-rule');
    document.body.classList.remove('reordering-rules');
    ruleDrag = null;
    updateRuleButtons(); renderResults();
    el('rule-status').textContent = 'Rule order: ' + Array.from(el('rule-order').children, rule => rule.dataset.rule).join(', ');
    item.querySelector('.rule-drag').focus();
  }
  window.addEventListener('pointerup', finishRuleDrag);
  window.addEventListener('pointercancel', finishRuleDrag);
  updateRuleButtons();
  el('reset-rules').addEventListener('click', () => {
    for (const rule of ['points', 'saturday', 'sunday', 'departure']) el('rule-order').append(document.querySelector(`[data-rule="${rule}"]`));
    updateRuleButtons();
    for (const id of ['rank-sat', 'rank-sun', 'rank-departure']) el(id).checked = true;
    for (const input of document.querySelectorAll('.preferred-day')) input.checked = ['5', '6'].includes(input.value);
    renderResults();
  });
  const pointData = window.DVC_POINTS;
  function updateSourceLink(resort) {
    const year = firstDate()?.getUTCFullYear() || 2027;
    el('chart-source').href = resort.sources?.[year]?.url || resort.source;
    el('chart-source').textContent = `Official ${resort.sources?.[year] ? year : 2027} chart ↗`;
  }
  function selectedResort() { return pointData?.resorts.find(resort => resort.id === el('resort').value); }
  function fillSelect(select, entries) {
    select.replaceChildren(...entries.map(([value, label]) => new Option(label, value)));
  }
  function applyPreset() {
    const resort = selectedResort();
    if (!resort) return;
    const date = firstDate()?.toISOString().slice(0, 10);
    const period = date ? resort.periods.find(period => period.ranges.some(range => date >= range.start && date <= range.end)) : resort.periods.find(period => period.id === el('period').value);
    if (period) el('period').value = period.id;
    const index = resort.categories.findIndex(category => category.room === el('room').value && category.view === el('view').value);
    if (!period || index < 0) return;
    weekday = period.rates[index].weekday; weekend = period.rates[index].weekend;
    el('weekday').value = weekday; el('weekend').value = weekend;
    updateSourceLink(resort);
    el('preset-status').textContent = `Chart rates: ${weekday} Sun–Thu / ${weekend} Fri–Sat points per night.${weekday === weekend ? ' Same rate every night.' : ''}`;
    renderGrid();
  }
  function fillViews() {
    const resort = selectedResort();
    if (!resort) return;
    const previous = el('view').value;
    fillSelect(el('view'), resort.categories.filter(category => category.room === el('room').value).map(category => [category.view, category.view || 'No separate view category']));
    if (Array.from(el('view').options).some(option => option.value === previous)) el('view').value = previous;
  }
  if (pointData) {
    const resortGroups = [
      ['Walt Disney World', ['AKV_AKV2','BLT','BCV','BWALK','VWL-BRV','CFW','WCC-CCVC','VGF','CLUB-OKW','POLYV','RVA','SSR']],
      ['Disneyland', ['GCAL-VGC','VDH']],
      ['Others', ['AULV','HH','VERO']]
    ];
    const sortName = resort => resort.name.replace(/^The /, '');
    const manualOption = el('resort').querySelector('option[value=""]');
    for (const [label, ids] of resortGroups) {
      const group = document.createElement('optgroup'); group.label = label;
      for (const resort of pointData.resorts.filter(resort => ids.includes(resort.id)).sort((a,b) => sortName(a).localeCompare(sortName(b)))) group.append(new Option(resort.name, resort.id));
      el('resort').insertBefore(group, manualOption);
    }
  } else {
    el('preset-status').textContent = 'Chart data could not load. Manual points are still available.';
  }
  el('resort').addEventListener('change', () => {
    const resort = selectedResort();
    weekday = null; weekend = null; el('weekday').value = ''; el('weekend').value = '';
    for (const id of ['room', 'view', 'period']) el(id).disabled = !resort;
    el('chart-source').hidden = !resort;
    el('manual-points').hidden = el('resort').value !== '';
    for (const id of ['room', 'view', 'period']) el(id).closest('label').hidden = !resort;
    el('category-note').hidden = resort?.id !== 'AKV_AKV2';
    if (!resort) {
      for (const id of ['room', 'view', 'period']) fillSelect(el(id), [['', 'Select a resort']]);
      el('chart-source').removeAttribute('href');
      el('preset-status').textContent = el('resort').value === 'select' ? 'Select a resort or choose Manual Points Entry.' : pointsReady() ? `Using manual points: ${weekday} weekday / ${weekend} weekend.` : 'Enter both weekday and weekend points.';
      renderGrid();
      return;
    }
    const previousRoom = el('room').value;
    fillSelect(el('room'), [...new Set(resort.categories.map(category => category.room))].map(room => [room, room]));
    if (Array.from(el('room').options).some(option => option.value === previousRoom)) el('room').value = previousRoom;
    fillViews();
    fillSelect(el('period'), resort.periods.map(period => [period.id, period.label]));
    updateSourceLink(resort);
    applyPreset();
  });
  el('room').addEventListener('change', () => { fillViews(); applyPreset(); });
  for (const id of ['view', 'period']) el(id).addEventListener('change', applyPreset);
  el('earliest-checkin').addEventListener('input', () => {
    if (selectedResort() && firstDate()) applyPreset();
    else renderGrid();
  });
  function sharingState() {
    saveComparison();
    if (!firstDate() || comparisons.some(comparison => comparison.resort === 'select' || comparison.weekday === null || comparison.weekend === null)) throw new Error('Complete the date and resort selections before sharing.');
    return {
      v: 1, d: el('earliest-checkin').value,
      r: comparisons.map(({ id, resort, room, view, period, weekday, weekend }) => ({ id, resort, room, view, period, weekday, weekend })),
      a: activeComparison,
      s: selections.map(({ id, day, parkOpen, comparisonOpen }) => ({ id, day, parkOpen: !!parkOpen, comparisonOpen: !!comparisonOpen })),
      i: restInterval, t: el('travel-park').checked, n: requestedRows,
      k: { on: el('rank').checked, order: Array.from(el('rule-order').children, item => item.dataset.rule), sat: el('rank-sat').checked, sun: el('rank-sun').checked, dep: el('rank-departure').checked, pref: Array.from(document.querySelectorAll('.preferred-day:checked'), input => Number(input.value)) }
    };
  }
  function comparisonLink() {
    const url = new URL(window.location.href);
    const state = sharingState();
    validateSharedState(state);
    const encoded = encodeComparison(state);
    if (encoded.length > 64000) throw new Error('This comparison is too large for a share link.');
    url.hash = 'comparison=' + encoded;
    return url.href;
  }
  function refreshShareField() {
    try { el('comparison-link').value = comparisonLink(); return true; }
    catch (error) { el('comparison-link').value = ''; el('share-status').textContent = error.message; return false; }
  }
  el('share-link-details').addEventListener('toggle', () => {
    if (el('share-link-details').open) refreshShareField();
  });
  el('comparison-link').addEventListener('click', event => event.target.select());
  el('copy-comparison').addEventListener('click', async () => {
    if (!refreshShareField()) return;
    const link = el('comparison-link').value;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(link);
      el('share-status').textContent = 'Link copied';
    } catch {
      el('share-link-details').open = true;
      el('comparison-link').focus(); el('comparison-link').select();
      el('share-status').textContent = 'Automatic copying is unavailable. Copy the selected link below.';
    }
  });
  function validateSharedState(state) {
    const fail = () => { throw new Error('This comparison link contains invalid or unavailable settings.'); };
    const integer = (value, min, max) => Number.isSafeInteger(value) && value >= min && value <= max;
    if (!state || state.v !== 1 || typeof state.d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(state.d)) fail();
    const date = new Date(state.d + 'T00:00:00Z');
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== state.d || state.d < (pointData?.startDate || '2027-01-01') || state.d > '2027-12-31') fail();
    if (!Array.isArray(state.r) || state.r.length < 1 || state.r.length > 3 || !integer(state.a, 0, state.r.length - 1)) fail();
    const ids = new Set();
    const resorts = state.r.map(item => {
      if (!item || !integer(item.id,1,1000000) || ids.has(item.id) || typeof item.resort !== 'string') fail();
      ids.add(item.id);
      if (item.resort === '') {
        if (!integer(item.weekday,0,Number.MAX_SAFE_INTEGER) || !integer(item.weekend,0,Number.MAX_SAFE_INTEGER)) fail();
        return { id:item.id, resort:'', room:'', view:'', period:'', weekday:item.weekday, weekend:item.weekend };
      }
      const resort = pointData?.resorts.find(resort => resort.id === item.resort);
      const index = resort?.categories.findIndex(category => category.room === item.room && category.view === item.view);
      const period = resort?.periods.find(period => period.ranges.some(range => state.d >= range.start && state.d <= range.end));
      if (!resort || index < 0 || !period) fail();
      return { id:item.id, resort:resort.id, room:resort.categories[index].room, view:resort.categories[index].view, period:period.id, ...period.rates[index] };
    });
    if (!Array.isArray(state.s) || state.s.length > 128) fail();
    const lineIds = new Set();
    const lines = state.s.map(item => {
      if (!item || !integer(item.id,1,1000000) || lineIds.has(item.id) || !integer(item.day,1,count) || typeof item.parkOpen !== 'boolean' || typeof item.comparisonOpen !== 'boolean') fail();
      lineIds.add(item.id);
      return { id:item.id, day:item.day, parkOpen:item.parkOpen, comparisonOpen:item.comparisonOpen, color:COLORS[(item.id-1)%COLORS.length] };
    });
    if (!integer(state.i,0,21) || state.i === 1 || typeof state.t !== 'boolean' || !integer(state.n,0,count)) fail();
    const rules = state.k, names = ['points','saturday','sunday','departure'];
    if (!rules || ['on','sat','sun','dep'].some(key => typeof rules[key] !== 'boolean') || !Array.isArray(rules.order) || rules.order.length !== 4 || new Set(rules.order).size !== 4 || rules.order.some(key => !names.includes(key)) || !Array.isArray(rules.pref) || rules.pref.length > 7 || new Set(rules.pref).size !== rules.pref.length || rules.pref.some(day => !integer(day,0,6))) fail();
    return { date:state.d, resorts, lines, active:state.a, interval:state.i, travel:state.t, rows:state.n, rules };
  }
  function restoreSharedComparison() {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const encoded = params.get('comparison');
    if (!encoded) return;
    try {
      const state = validateSharedState(decodeComparison(encoded));
      comparisons.splice(0, comparisons.length, ...state.resorts);
      selections.splice(0, selections.length, ...state.lines);
      activeComparison = state.active; nextComparisonId = Math.max(...comparisons.map(item => item.id)) + 1;
      nextId = Math.max(0, ...selections.map(item => item.id)) + 1;
      requestedRows = state.rows; restInterval = state.interval;
      el('earliest-checkin').min = coverageStart; el('earliest-checkin').value = state.date;
      el('rest').value = String(restInterval); el('travel-park').checked = state.travel;
      el('rank').checked = state.rules.on;
      el('rank-sat').checked = state.rules.sat; el('rank-sun').checked = state.rules.sun; el('rank-departure').checked = state.rules.dep;
      for (const name of state.rules.order) el('rule-order').append(document.querySelector(`[data-rule="${name}"]`));
      for (const input of document.querySelectorAll('.preferred-day')) input.checked = state.rules.pref.includes(Number(input.value));
      updateRuleButtons(); restoreComparison();
      el('resort-disclosure').open = !mobilePanels.matches;
      el('shared-load-status').textContent = 'Shared comparison loaded.' + (state.date < localToday ? ' Its original check-in date has been preserved.' : '');
    } catch (error) {
      el('shared-load-status').textContent = 'Could not load this shared comparison. The link may be incomplete, invalid, or from an unsupported version. You can still create a comparison below.';
    }
    el('shared-load-status').hidden = false;
  }
  window.addEventListener('hashchange', restoreSharedComparison);
  el('more-days').addEventListener('click', () => { requestedRows = Math.min(count, visibleDayCount() + 7); updateVisibleRows(); });
  el('trim-days').addEventListener('click', () => { requestedRows = 0; updateVisibleRows(); });
  window.addEventListener('resize', updateVisibleRows);
  const today = new Date();
  const localToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const coverageStart = pointData?.startDate || '2027-01-01';
  el('earliest-checkin').min = localToday > coverageStart ? localToday : coverageStart;
  const mobilePanels = window.matchMedia('(max-width:700px)');
  function syncDisclosures() {
    el('resort-disclosure').open = true;
    positionLines();
  }
  mobilePanels.addEventListener('change', syncDisclosures);
  el('resort').value = 'select';
  el('resort').dispatchEvent(new Event('change'));
  renderGrid(); el('add').click(); syncDisclosures();
  restoreSharedComparison();
}
