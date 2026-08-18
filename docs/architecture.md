# Architecture decisions

## Why a checkout simulator?

Checkout has a clear user outcome, meaningful latency, and an obvious failure state. That makes it easier to explain the RED method—rate, errors, and duration—without inventing infrastructure complexity before the learner understands the signals.

## Correlation model

Every checkout receives a 128-bit trace ID. The same ID appears in:

1. The HTTP response header and JSON response.
2. The structured application log.
3. The exported OTLP span.

Grafana's Loki datasource uses a derived field to turn the ID in a log line into a Tempo link. The trace ID is not a Loki label because request identifiers are unbounded and would produce a high-cardinality index.

## Metrics model

The service exposes two counters and one histogram:

- Requests by bounded `outcome`.
- Experiments by bounded `scenario`.
- End-to-end duration with explicit buckets.

The labels have fixed, small value sets. Order IDs and trace IDs never appear in Prometheus labels.

## Failure injection

Failures are explicit inputs, not random production behavior:

- `normal`: 50–180 ms simulated dependency time.
- `slow`: 1.1–1.6 seconds.
- `failure`: returns HTTP 503 after a short delay.

This keeps demonstrations reproducible and makes expected failures easy to distinguish from defects in the lab itself.

## Collector choice

Grafana Alloy handles two jobs:

- Tail the application's JSON log file and send entries to Loki.
- Receive OTLP traces over HTTP or gRPC, batch them, and export them to Tempo.

Prometheus scrapes the application directly. Keeping that path visible helps new users understand pull-based metrics collection before introducing remote write.

## Storage boundary

Loki and Tempo use local filesystem backends, and Prometheus uses its local TSDB. These choices are appropriate for a disposable lab, not for production. Production environments should use durable object storage where recommended and design retention, tenancy, encryption, and backup policies explicitly.
