# Contributing

Thank you for improving Signal Room.

## Before opening a pull request

1. Open an issue for behavior changes that affect the telemetry model or Docker topology.
2. Keep metrics and log labels bounded. Do not add user IDs, order IDs, trace IDs, or other unbounded values as labels.
3. Add or update a test for application behavior changes.
4. Run `npm test` and `npm run check`.
5. If Docker is available, run `docker compose config --quiet` and the smoke test against the complete stack.

## Pull request description

Explain the user or operator problem, the evidence used to verify the change, and any effect on dashboards, alerts, retention, or cardinality.

AI-assisted changes are welcome only when the contributor has reviewed, tested, and can explain every submitted line. Disclose material AI assistance in the pull request.
