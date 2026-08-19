# A Dashboard Is Not Observability: What I Learned Building Signal Room

Most observability demos begin at the end. They show a polished dashboard full of lines, percentages, and colors. The missing part is the investigation: what happened to a real request, and how does a person move from a symptom to evidence?

I built Signal Room to practise that missing path.

You can try the public failure injector here: [Signal Room live demo](https://signal-room-grafana-lab.arunchandel1780.workers.dev). It runs on Cloudflare Workers and returns a trace ID for every synthetic checkout. The repository contains the complete Grafana, Prometheus, Loki, Tempo, and Alloy lab.

## The problem with disconnected signals

A latency chart can tell us that users waited longer. It cannot explain which request was affected. A log can contain an error message, but without context it may be impossible to connect that message to a user-visible symptom. A trace shows the shape of one request, but it needs a reason to be investigated.

The useful workflow is therefore not “collect everything.” It is:

1. Detect a symptom with metrics.
2. Narrow the time window.
3. Find a relevant structured log.
4. Follow the request identifier into a trace.
5. Make a decision using a runbook.

## A deliberately small service

Signal Room simulates checkout because the outcome is understandable: the operation either completes, becomes slow, or fails. The interface exposes those three controlled scenarios. Each request creates:

- A Prometheus counter and histogram observation.
- A structured JSON log.
- An OTLP trace sent through Grafana Alloy to Tempo.

The same trace ID is returned to the browser, written into the log, and attached to the span.

## The label decision that matters

It is tempting to turn every useful field into a Loki or Prometheus label. I intentionally did not label logs or metrics with trace IDs or order IDs. Those values are unbounded: every request creates a new one. Indexing them would increase cardinality without improving the common query path.

Instead, Loki keeps the trace ID in the JSON body. Grafana extracts it as a derived field when a user opens the log and creates a link to Tempo. Bounded values such as `scenario`, `outcome`, and `level` remain labels.

This distinction—search context versus index dimension—is one of the most practical lessons in the project.

## Alerts should reflect action

Signal Room includes two alert rules:

- Error rate above 10% for one minute.
- p95 duration above one second for two minutes.

The waiting periods matter. One person clicking “payment failure” during a workshop should not page anyone. Sustained failure traffic from the included k6 workload should become visible. The threshold is part of an operational decision, not decoration on a chart.

## What Grafana adds

Grafana is most useful here as the investigation surface connecting three specialized backends:

- Prometheus answers “is there a problem?”
- Loki answers “what did the application report?”
- Tempo answers “what happened inside this request?”

The dashboard is valuable because it shortens movement between these questions. It is not the observability system by itself.

## What I would change for production

The lab uses local filesystem storage and local credentials so that another learner can start it with one Docker Compose command. A production design would add durable object storage, authentication, encryption, backups, explicit retention, multi-tenancy, and restricted access to failure injection.

That boundary is documented because a reproducible demo should not pretend to be a production deployment.

## Why the public demo is separate

The live Worker is an interaction surface, not a fake hosted Grafana stack. It lets a reviewer run the same normal, slow, and failure scenarios, inspect request evidence, and export a small incident report. Cloudflare Workers Observability stores its structured runtime logs.

The full investigation lab stays in Docker Compose because Prometheus, Loki, Tempo, Alloy, and Grafana are independent services with their own storage and lifecycle. Keeping that distinction visible is more honest—and more useful—than replacing real backends with hard-coded dashboard screenshots.

## The outcome

Signal Room gave me a better way to explain observability in workshops: start with a user-visible failure, follow the evidence, and finish with a decision. The source, dashboard, alerts, workload, tests, and runbook are published together so another builder can repeat the exercise rather than only view the final screenshot.

Live demo: <https://signal-room-grafana-lab.arunchandel1780.workers.dev>

Project source: https://github.com/Arun5768/signal-room-grafana-lab
