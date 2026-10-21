/* Combine official chart years without changing the original generated bundles. */
(() => {
  const current = window.DVC_POINTS;
  if (!current) return;
  const previous = window.DVC_POINTS_2026;
  current.startDate = previous?.startDate || '2027-01-01';
  current.years = previous ? [2026, 2027] : [2027];
  for (const resort of current.resorts) {
    const prior = previous?.resorts.find(item => item.id === resort.id);
    resort.sources = { 2027: { url: resort.source, sha256: resort.sourceSha256 } };
    resort.periods = resort.periods.map(period => ({ ...period, label: `2027 · ${period.label}` }));
    if (!prior) continue;
    resort.sources[2026] = { url: prior.source, sha256: prior.sourceSha256 };
    resort.periods = [...prior.periods, ...resort.periods];
  }
})();
