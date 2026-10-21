const test = require('node:test');
const assert = require('node:assert/strict');
const { encodeComparison, decodeComparison } = require('../app.js');

test('versioned links round-trip Unicode and comparison settings', () => {
  const state = { v: 1, d: '2026-12-22', r: [{ resort: 'AULV', room: 'Studio · Hawaiʻi', weekday: 0, weekend: 34 }], s: [{ id: 3, day: 16 }], k: { order: ['departure', 'points', 'saturday', 'sunday'] } };
  const encoded = encodeComparison(state);
  assert.match(encoded, /^v1\.[A-Za-z0-9_-]+$/);
  assert.deepEqual(decodeComparison(encoded), state);
  const url = new URL('https://example.com/planner/?example=1');
  url.hash = 'comparison=' + encoded;
  assert.deepEqual(decodeComparison(new URLSearchParams(url.hash.slice(1)).get('comparison')), state);
});

test('rejects unsupported, malformed, oversized, and invalid UTF-8 encodings', () => {
  for (const value of ['v2.abc', 'v1.', 'v1.%invalid', 'v1.____', 'v1.' + 'a'.repeat(64001)]) {
    assert.throws(() => decodeComparison(value));
  }
});
