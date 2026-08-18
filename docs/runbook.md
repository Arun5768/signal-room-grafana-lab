# Checkout degradation runbook

## Scope

Use this runbook when either `CheckoutErrorRateHigh` or `CheckoutP95LatencyHigh` fires in the Signal Room lab.

## First five minutes

1. Confirm the alert is active in Prometheus and note its start time.
2. Open the Signal Room dashboard with a 15-minute time range.
3. Decide whether the primary symptom is errors, latency, or both.
4. Check traffic volume. A percentage without request volume can be misleading.
5. Inspect the scenario panel to confirm whether a controlled experiment is running.

## Error investigation

1. Filter Loki logs to `outcome="error"`.
2. Open one log entry and record its `scenario`, `durationMs`, and `traceId`.
3. Follow the derived TraceID link to Tempo.
4. Confirm the span status and HTTP response code.
5. If the scenario is `failure`, classify the event as an expected experiment. Otherwise, escalate it as an application defect.

## Latency investigation

1. Compare p50 and p95. A p95-only increase suggests a tail-latency problem.
2. Filter logs to `scenario="slow"` and compare recorded durations.
3. Open a representative slow trace.
4. Verify whether the slow time belongs to the simulated dependency or to telemetry export.

## Severity guidance

- **Page:** sustained user-visible errors above 10% with meaningful traffic.
- **Ticket:** sustained p95 latency above one second without significant errors.
- **No incident:** an expected, time-boxed failure-injection exercise.

## Resolution evidence

Do not close the incident on intuition. Capture:

- Alert recovery time.
- Error and latency values after recovery.
- One representative trace.
- The final cause and the action that removed it.
