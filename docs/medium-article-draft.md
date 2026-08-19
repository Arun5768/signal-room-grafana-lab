# I Built a Grafana Dashboard. Then I Realised It Wasn't Observability.

The last test I ran on Signal Room was deliberately boring.

I opened the live site, clicked **Payment failure**, and waited. The checkout failed in 123 ms, exactly as it was supposed to. The useful part was not the red failure message. It was the small string shown underneath it:

`68fc254f277fdab574497f54341acbb7`

That trace ID was the reason I built the project.

I have seen plenty of observability demos where a dashboard already looks perfect when the presentation begins. There are ten panels, several colours and a dramatic spike waiting at the right side of a graph. It looks impressive, but it skips the part I actually struggle with when something breaks: where do I start, and how do I move from “something is wrong” to evidence about one request?

Signal Room is my attempt to make that path visible.

The project is public here:

- Live failure injector: <https://signal-room-grafana-lab.arunchandel1780.workers.dev>
- Source and complete lab: <https://github.com/Arun5768/signal-room-grafana-lab>

## I kept the application small on purpose

The application pretends to be a checkout service. It only knows three situations:

- a normal checkout;
- a slow dependency;
- a payment failure.

There is no shopping cart, payment gateway or user account. Those would add code without improving the observability lesson. Everyone already understands what a checkout should do, so when it becomes slow or returns a 503 the symptom needs no explanation.

For every request, the Node.js service records a counter, adds a value to a duration histogram, writes one JSON log and exports an OTLP span. The same trace ID goes into the response header, log body and trace. That shared value is the thread through the investigation.

I also avoided application dependencies. I wrote the Prometheus text output and cumulative histogram buckets directly. It is not how I would build every production service, but doing it once made `histogram_quantile()` much less mysterious. A p95 panel is easier to trust after seeing exactly which bucket counts produce it.

The test suite checks the same behaviour instead of only checking that the page loads. It verifies successful and failed counters, cumulative buckets, rejected scenarios and 32-character trace IDs. At the time of writing, all five tests pass.

## My first mental model was too dashboard-heavy

At the beginning, I was thinking about panels: request rate, error percentage, p50, p95 and recent logs. That is a reasonable dashboard, but it still leaves the operator doing the important work in their head.

The question that improved the project was simpler: if the p95 line rises, what is the next click?

That changed the layout and the data flow. Prometheus shows the symptom. The operator narrows the time range and opens the matching structured logs in Loki. Grafana extracts the trace ID from the JSON log as a derived field, and that field opens the request in Tempo. Metrics lead to logs; logs lead to a trace. The dashboard is only useful because it reduces the distance between those steps.

This is also why I no longer describe the dashboard itself as “the observability system.” Prometheus, Loki and Tempo each answer a different question. Grafana gives the questions one investigation surface.

## One label can quietly ruin the design

The trace ID is the most useful field in the demo, so the obvious temptation is to make it a label everywhere. That would also be the wrong choice.

A fresh trace ID is created for every request. The number of possible values keeps growing, which makes it a high-cardinality dimension. Indexing it as a Prometheus or Loki label would make this tiny demo teach a bad production habit.

Alloy therefore promotes only bounded values such as `level`, `scenario` and `outcome` to Loki labels. The trace ID stays inside the JSON body. Grafana's Loki datasource uses this expression to find it:

`"traceId":"([a-f0-9]{32})"`

That gives me the correlation link without building an index entry for every request. This small choice ended up being one of the most valuable parts of the project because it separates “a value I need to search” from “a dimension I should index.” Those are not the same thing.

## I wanted alerts that mean something

It is easy to make a demo alert fire. One failed request and a huge red banner looks exciting on screen. It is not a useful operating rule.

Signal Room waits for an error rate above 10% for one minute before raising `CheckoutErrorRateHigh`. It waits for p95 latency above one second for two minutes before raising `CheckoutP95LatencyHigh`.

Those waiting periods are intentional. During a workshop, somebody will click the failure button once just to see what happens. That click should create evidence, not wake a fictional on-call engineer. Sustained traffic from the included k6 workload is what should move the alert into a firing state.

The runbook then asks a human to decide whether the signal is an expected experiment, a ticket or something worth paging on. An alert without a next decision is just another notification.

## The public demo and the full lab are different things

This part took some restraint.

I wanted a reviewer to try Signal Room without installing Docker, so I deployed the interaction layer on Cloudflare Workers. It can run all three scenarios, return the trace ID, store structured Worker logs and export the visitor's session evidence as JSON.

What it does not do is pretend that Grafana, Loki, Tempo, Prometheus and Alloy are somehow running inside one Worker. They are separate services with storage and lifecycle requirements. The complete investigation environment stays in Docker Compose, where every datasource and dashboard is provisioned from the repository.

That split is less flashy than a page filled with hard-coded charts, but it is honest. The live site proves the interaction. The repository proves the observability pipeline.

## There are still rough edges

Signal Room is a lab, not a production checkout platform. It uses local filesystem storage, simple local credentials and intentionally exposed failure controls. A real deployment would need authentication, TLS, secrets management, durable object storage, backups, retention policies, tenant isolation and strict access around failure injection.

I wrote those limits in the README because “production-grade” should not be a decoration added to a demo. A useful technical project should make its boundary obvious.

The next improvement I want to make is a longer incident exercise where a slow dependency and a payment failure overlap. The current scenarios are clean enough for teaching correlation, but real incidents rarely arrive one at a time.

## What I would show in a workshop

I would not begin the session inside Grafana.

I would ask someone in the room to break a checkout. We would copy the returned trace ID, then deliberately ignore it for a moment and start where an operator normally starts: the error-rate or p95 panel. From there, we would narrow the time range, inspect the JSON log, follow its derived field into Tempo and use the runbook to decide what the signal deserves.

Only after completing that path would I open the configuration files and explain why the labels, alert windows and datasources are arranged the way they are.

That is the main thing I learned while building Signal Room. Observability is not the collection of screens we show at the end. It is whether another person can begin with a vague complaint, follow a believable trail and make a better decision without guessing.
