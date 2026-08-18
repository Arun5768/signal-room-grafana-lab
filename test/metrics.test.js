import assert from 'node:assert/strict';
import test from 'node:test';
import { createMetrics } from '../src/metrics.js';

test('renders counters and cumulative histogram buckets', () => {
  const metrics = createMetrics({ buckets: [0.1, 1] });
  metrics.observe({ outcome: 'success', scenario: 'normal', durationSeconds: 0.05 });
  metrics.observe({ outcome: 'error', scenario: 'failure', durationSeconds: 0.5 });

  const output = metrics.render();

  assert.match(output, /signal_room_checkout_requests_total\{outcome="success"\} 1/);
  assert.match(output, /signal_room_checkout_requests_total\{outcome="error"\} 1/);
  assert.match(output, /signal_room_checkout_duration_seconds_bucket\{le="0.1"\} 1/);
  assert.match(output, /signal_room_checkout_duration_seconds_bucket\{le="1"\} 2/);
  assert.match(output, /signal_room_checkout_duration_seconds_count 2/);
});
