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
function restDays(checkout, interval) {
  if (!interval) return [];
  const days = [];
  for (let day = 1 + interval; day < checkout; day += interval) days.push(day);
  return days;
}
function parkDays(start, checkout, interval) {
  let weekdays = 0, weekends = 0;
  for (let day = 2; day < checkout; day++) {
    if (interval > 0 && (day - 1) % interval === 0) continue;
    const weekday = (start + day - 1) % 7;
    if (weekday === 0 || weekday === 6) weekends++;
    else weekdays++;
  }
  return { total: weekdays + weekends, weekdays, weekends };
}
function rankingMetrics(start, checkout, weekday, weekend, interval) {
  let saturday = 0, sunday = 0;
  for (let day = 2; day < checkout; day++) {
    if (interval && (day - 1) % interval === 0) continue;
    const dow = (start + day - 1) % 7;
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
if (typeof module !== 'undefined') module.exports = { nightTotal, restDays, parkDays, rankingMetrics, compareOptions, rankOptions };
if (typeof document !== 'undefined') {
  const el = id => document.getElementById(id);
  let count = 21, weekday = null, weekend = null, nextId = 1, restInterval = 0;
  const selections = [];
  function highlightDays() {
    const checkoutDays = new Set(selections.map(selection => selection.day));
    const lastIncludedDay = Math.max(0, ...checkoutDays);
    for (const [offset, row] of Array.from(el('grid').tBodies[0].rows).entries()) {
      row.classList.toggle('outside-stay', offset + 1 > lastIncludedDay);
      row.classList.toggle('rest-day', restInterval > 0 && offset > 0 && offset % restInterval === 0);
      row.classList.toggle('arrival-day', offset === 0);
      row.classList.toggle('checkout-day', checkoutDays.has(offset + 1));
      const labels = [];
      if (offset === 0) labels.push('Arrival');
      if (restInterval > 0 && offset > 0 && offset % restInterval === 0) labels.push('Rest day, if before checkout');
      if (checkoutDays.has(offset + 1)) labels.push('Checkout for line ' + selections.filter(selection => selection.day === offset + 1).map(selection => selection.id).join(', '));
      row.title = labels.join(' · ');
      Array.from(row.cells).slice(1).forEach((cell, start) => {
        const day = (start + offset) % 7;
        const isRest = row.classList.contains('rest-day') && !row.classList.contains('checkout-day') && !row.classList.contains('arrival-day');
        cell.classList.toggle('saturday-rest', isRest && day === 6);
        cell.classList.toggle('sunday-rest', isRest && day === 0);
        cell.title = isRest && day === 6 ? '★ Saturday rest day — if before checkout' : isRest && day === 0 ? '◆ Sunday rest day — if before checkout' : '';
      });
    }
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
    positionLines();
  }
  function pointsReady() { return weekday !== null && weekend !== null; }
  function rankingRows(selection) {
    if (!el('rank').checked) return '';
    if (!pointsReady()) return '<tr><td colspan="8" class="ranking-pending">Select chart rates or enter both point values to rank options.</td></tr>';
    const rules = { order: Array.from(el('rule-order').children, item => item.dataset.rule), saturday: el('rank-sat').checked, sunday: el('rank-sun').checked, departure: el('rank-departure').checked, preferred: Array.from(document.querySelectorAll('.preferred-day:checked'), input => Number(input.value)) };
    const metrics = DAYS.map((_, start) => rankingMetrics(start, selection.day, weekday, weekend, restInterval));
    const ranks = rankOptions(metrics, rules);
    return `<tr class="section-heading"><th colspan="8">Comparison</th></tr><tr class="ranking-row"><th scope="row" class="measure-label">Rank</th>${ranks.map(rank => `<td>${rank ? `<span class="rank-badge rank-${rank.toLowerCase()}">${rank}</span>` : '—'}</td>`).join('')}</tr>` +
      [['saturday', 'Sat park'], ['sunday', 'Sun park'], ['departure', 'Depart']].map(([key, label]) => `<tr class="ranking-detail"><th scope="row" class="measure-label">${label}</th>${metrics.map(metric => `<td>${key === 'departure' ? DAYS[metric[key]] : metric[key]}</td>`).join('')}</tr>`).join('');
  }
  function renderResults() {
    el('results').replaceChildren();
    if (!selections.length) el('results').textContent = 'Add a checkout line to compare stays.';
    for (const selection of selections) {
      const card = document.createElement('article');
      card.className = 'result'; card.style.setProperty('--color', selection.color);
      card.innerHTML = `<div class="result-head"><strong>Checkout ${selection.id}</strong><span class="night-count">${selection.day - 1} nights</span><button class="remove" aria-label="Remove checkout ${selection.id}">×</button></div><label>Checkout day <input type="number" min="1" max="${count}" step="1" value="${selection.day}" aria-label="Checkout day for line ${selection.id}"></label><table class="totals"><caption class="sr-only">Total points by starting weekday for checkout ${selection.id}</caption><colgroup><col class="label-column">${DAYS.map(() => '<col>').join('')}</colgroup><thead><tr><th scope="col" class="start-label">Start day</th>${DAYS.map(day => `<th scope="col">${day}</th>`).join('')}</tr></thead><tbody><tr class="points-row"><th scope="row" class="measure-label">Points</th>${DAYS.map((_, start) => `<td>${pointsReady() ? nightTotal(start, selection.day, weekday, weekend) : '—'}</td>`).join('')}</tr><tr class="park-heading section-heading"><th colspan="8">Park days</th></tr>${[['total', 'Total'], ['weekdays', 'Weekday'], ['weekends', 'Weekend']].map(([key, label]) => `<tr class="park-counts"><th scope="row" class="measure-label">${label}</th>${DAYS.map((_, start) => `<td><b>${parkDays(start, selection.day, restInterval)[key]}</b></td>`).join('')}</tr>`).join('')}${rankingRows(selection)}</tbody></table>`;
      card.querySelector('input').addEventListener('change', event => {
        if (event.target.validity.valid) update(selection, Number(event.target.value));
      });
      card.querySelector('button').addEventListener('click', () => {
        selections.splice(selections.indexOf(selection), 1); renderLines(); renderResults();
      });
      if (el('rank').checked) {
        const badges = card.querySelectorAll('.ranking-row td');
        badges.forEach((cell, index) => {
          const badge = cell.querySelector('.rank-badge');
          const kind = badge?.textContent.toLowerCase();
          if (kind !== 'best' && kind !== 'worst') return;
          for (const row of card.querySelectorAll('.totals tr')) {
            if (row.cells.length === 8) row.cells[index + 1].classList.add(`column-${kind}`);
          }
        });
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
      let dragging = false;
      line.addEventListener('pointerdown', event => { if (event.button !== 0) return; dragging = true; line.setPointerCapture(event.pointerId); line.focus(); event.preventDefault(); });
      line.addEventListener('pointermove', event => {
        if (!dragging) return;
        const rows = el('grid').tBodies[0].rows;
        const top = rows[0].getBoundingClientRect().top;
        const day = Math.max(1, Math.min(count, Math.round((event.clientY - top) / rows[0].getBoundingClientRect().height)));
        if (day !== selection.day) update(selection, day);
      });
      for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) line.addEventListener(type, () => { dragging = false; });
      el('lines').append(line);
    }
    highlightDays();
    positionLines();
  }
  function updateControlSummaries() {
    el('settings-summary').textContent = `${count} days · ${restInterval ? `rest every ${restInterval} days` : 'no rest days'}`;
    const resort = window.DVC_POINTS?.resorts.find(resort => resort.id === el('resort').value);
    el('resort-summary').textContent = resort ? `${resort.name} · ${el('period').selectedOptions[0]?.textContent || ''}` : el('resort').value === 'select' ? 'Select Resort' : `Manual · ${weekday ?? '—'} / ${weekend ?? '—'} pts`;
  }
  function renderGrid() {
    updateControlSummaries();
    el('grid').tHead.innerHTML = `<tr><th scope="col">Day</th>${DAYS.map(day => `<th scope="col">${day}</th>`).join('')}</tr>`;
    el('grid').tBodies[0].innerHTML = Array.from({length: count}, (_, offset) => `<tr><td>${offset + 1}</td>${DAYS.map((_, start) => {
      const day = (start + offset) % 7;
      const isWeekendNight = day === 5 || day === 6;
      const isWeekendDay = day === 6 || day === 0;
      return `<td class="${isWeekendDay ? 'weekend' : ''}"><span>${DAYS[day]}</span><b>${pointsReady() ? (isWeekendNight ? weekend : weekday) : '—'}</b></td>`;
    }).join('')}</tr>`).join('');
    renderLines(); renderResults();
  }
  for (const id of ['weekday', 'weekend', 'days']) el(id).addEventListener('input', event => {
    if (id === 'weekday' || id === 'weekend') {
      const valid = event.target.value !== '' && event.target.validity.valid && Number.isSafeInteger(Number(event.target.value));
      if (id === 'weekday') weekday = valid ? Number(event.target.value) : null;
      else weekend = valid ? Number(event.target.value) : null;
      el('preset-status').textContent = pointsReady() ? 'Using manual points.' : 'Enter both weekday and weekend points.';
      renderGrid(); return;
    }
    if (!event.target.validity.valid || event.target.value === '') return;
    const value = Number(event.target.value);
    if (!Number.isSafeInteger(value)) return;
    if (id === 'weekday' || id === 'weekend') el('preset-status').textContent = 'Using manual points.';
    if (id === 'weekday') weekday = value;
    else if (id === 'weekend') weekend = value;
    else { count = value; selections.forEach(selection => { selection.day = Math.min(selection.day, count); }); }
    renderGrid();
  });
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
  function selectedResort() { return pointData?.resorts.find(resort => resort.id === el('resort').value); }
  function fillSelect(select, entries) {
    select.replaceChildren(...entries.map(([value, label]) => new Option(label, value)));
  }
  function applyPreset() {
    const resort = selectedResort();
    if (!resort) return;
    const period = resort.periods.find(period => period.id === el('period').value);
    const index = resort.categories.findIndex(category => category.room === el('room').value && category.view === el('view').value);
    if (!period || index < 0) return;
    weekday = period.rates[index].weekday; weekend = period.rates[index].weekend;
    el('weekday').value = weekday; el('weekend').value = weekend;
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
    for (const resort of [...pointData.resorts].sort((a,b) => a.name.localeCompare(b.name))) el('resort').add(new Option(resort.name, resort.id), el('resort').options.length - 1);
  } else {
    el('preset-status').textContent = 'Chart data could not load. Manual points are still available.';
  }
  el('resort').addEventListener('change', () => {
    const resort = selectedResort();
    for (const id of ['room', 'view', 'period']) el(id).disabled = !resort;
    el('chart-source').hidden = !resort;
    el('manual-points').hidden = el('resort').value !== '';
    for (const id of ['room', 'view', 'period']) el(id).closest('label').hidden = !resort;
    el('category-note').hidden = resort?.id !== 'AKV_AKV2';
    if (!resort) {
      for (const id of ['room', 'view', 'period']) fillSelect(el(id), [['', 'Select a resort']]);
      el('chart-source').removeAttribute('href');
      el('preset-status').textContent = el('resort').value === 'select' ? 'Select a resort or choose Manual Points Entry.' : pointsReady() ? `Using manual points: ${weekday} weekday / ${weekend} weekend.` : 'Enter both weekday and weekend points.';
      updateControlSummaries();
      return;
    }
    const previousRoom = el('room').value;
    fillSelect(el('room'), [...new Set(resort.categories.map(category => category.room))].map(room => [room, room]));
    if (Array.from(el('room').options).some(option => option.value === previousRoom)) el('room').value = previousRoom;
    fillViews();
    fillSelect(el('period'), resort.periods.map(period => [period.id, period.label]));
    el('chart-source').href = resort.source;
    applyPreset();
  });
  el('room').addEventListener('change', () => { fillViews(); applyPreset(); });
  for (const id of ['view', 'period']) el(id).addEventListener('change', applyPreset);
  window.addEventListener('resize', positionLines);
  const mobilePanels = window.matchMedia('(max-width:700px)');
  function syncDisclosures() {
    el('resort-disclosure').open = true;
    el('settings-disclosure').open = !mobilePanels.matches;
    positionLines();
  }
  mobilePanels.addEventListener('change', syncDisclosures);
  el('resort').value = 'select';
  el('resort').dispatchEvent(new Event('change'));
  renderGrid(); el('add').click(); syncDisclosures();
}
