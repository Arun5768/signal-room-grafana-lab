const DEFAULT_BUCKETS = [0.05, 0.1, 0.25, 0.5, 1, 2, 5];

function escapeLabel(value) {
  return String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('\n', '\\n');
}

export function createMetrics({ buckets = DEFAULT_BUCKETS } = {}) {
  const requestCounts = new Map();
  const scenarioCounts = new Map();
  const histogramCounts = buckets.map(() => 0);
  let histogramCount = 0;
  let histogramSum = 0;

  function increment(map, key) {
    map.set(key, (map.get(key) ?? 0) + 1);
  }

  function observe({ outcome, scenario, durationSeconds }) {
    increment(requestCounts, outcome);
    increment(scenarioCounts, scenario);
    histogramCount += 1;
    histogramSum += durationSeconds;
    buckets.forEach((bucket, index) => {
      if (durationSeconds <= bucket) {
        histogramCounts[index] += 1;
      }
    });
  }

  function render() {
    const lines = [
      '# HELP signal_room_build_info Static build information for the demo service.',
      '# TYPE signal_room_build_info gauge',
      'signal_room_build_info{service="checkout-api",version="1.0.0"} 1',
      '# HELP signal_room_checkout_requests_total Checkout attempts grouped by outcome.',
      '# TYPE signal_room_checkout_requests_total counter',
    ];

    for (const outcome of ['success', 'error']) {
      lines.push(`signal_room_checkout_requests_total{outcome="${outcome}"} ${requestCounts.get(outcome) ?? 0}`);
    }

    lines.push(
      '# HELP signal_room_checkout_scenarios_total Checkout attempts grouped by injected scenario.',
      '# TYPE signal_room_checkout_scenarios_total counter'
    );
    for (const scenario of ['normal', 'slow', 'failure']) {
      lines.push(
        `signal_room_checkout_scenarios_total{scenario="${escapeLabel(scenario)}"} ${scenarioCounts.get(scenario) ?? 0}`
      );
    }

    lines.push(
      '# HELP signal_room_checkout_duration_seconds End-to-end checkout duration.',
      '# TYPE signal_room_checkout_duration_seconds histogram'
    );
    buckets.forEach((bucket, index) => {
      lines.push(`signal_room_checkout_duration_seconds_bucket{le="${bucket}"} ${histogramCounts[index]}`);
    });
    lines.push(`signal_room_checkout_duration_seconds_bucket{le="+Inf"} ${histogramCount}`);
    lines.push(`signal_room_checkout_duration_seconds_sum ${histogramSum}`);
    lines.push(`signal_room_checkout_duration_seconds_count ${histogramCount}`);

    return `${lines.join('\n')}\n`;
  }

  return { observe, render };
}
