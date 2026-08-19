# Signal Room workshop facilitator guide

## Session promise

In 60 minutes, participants will move from a user complaint—“checkout is slow”—to a defensible incident conclusion using Grafana, Prometheus, Loki, and Tempo.

This is an investigation workshop, not a dashboard tour. Every participant triggers a real synthetic request and follows its evidence.

## Audience

- Developers new to observability.
- Platform and cloud learners who know basic HTTP concepts.
- Student builders who have used application logs but not correlated telemetry.

No previous Grafana experience is required. Docker Desktop is required only for participants running the stack on their own machines.

## Learning outcomes

By the end, a participant should be able to:

1. Explain the different questions answered by metrics, logs, and traces.
2. Use RED signals to identify a service problem.
3. Avoid high-cardinality trace and order IDs in metric or Loki labels.
4. Move from a structured log to its related Tempo trace.
5. Decide whether an alert is actionable using an incident runbook.

## 60-minute flow

| Time      | Activity                                                    | Evidence produced                        |
| --------- | ----------------------------------------------------------- | ---------------------------------------- |
| 0–5 min   | Introduce the checkout complaint and investigation question | One written hypothesis                   |
| 5–12 min  | Map request → metric → log → trace                          | Participant signal map                   |
| 12–20 min | Start Signal Room and generate a normal baseline            | Successful requests and baseline latency |
| 20–30 min | Inject slow requests and find the p95 change                | Dashboard time window around the spike   |
| 30–40 min | Open a structured log and follow its trace ID               | Correlated Loki event and Tempo trace    |
| 40–48 min | Inject sustained failures with k6                           | Error-rate change and alert evaluation   |
| 48–55 min | Use the runbook to classify the incident                    | Written severity and next action         |
| 55–60 min | Five-question evidence check and feedback                   | Learning score and workshop feedback     |

## Facilitator preparation

1. Run `docker compose up --build -d` before participants arrive.
2. Confirm the application, Grafana, Prometheus, Loki, Tempo, and Alloy containers are healthy.
3. Run all three scenarios once and clear or narrow the dashboard time range.
4. Keep `docs/runbook.md` open beside Grafana.
5. Have the public Worker demo available as a fallback interaction surface.

## Evidence check

Ask participants to answer these questions without guessing:

1. Which signal first showed the user-visible problem?
2. What was the affected scenario and approximate p95 duration?
3. Which fields are Loki labels, and why is `traceId` not one of them?
4. What evidence connects the log to the trace?
5. Did the alert threshold describe a sustained operational condition or one workshop click?

A successful participant should support each answer with a dashboard panel, log field, trace, or runbook rule.

## Measurable session outcomes

Track:

- Number of participants who complete the normal-to-slow investigation.
- Percentage who correctly explain why trace IDs are not labels.
- Number who follow a Loki log into Tempo without facilitator assistance.
- Pre/post confidence score for investigating latency incidents.
- Repository forks or repeat runs within seven days.

These measures value demonstrated investigation skills over attendance alone.
