import { randomBytes } from "node:crypto";

function randomHex(bytes) {
  return randomBytes(bytes).toString("hex");
}

export function newTraceContext(incomingTraceparent) {
  const match = /^00-([a-f0-9]{32})-([a-f0-9]{16})-[a-f0-9]{2}$/i.exec(
    incomingTraceparent ?? "",
  );
  return {
    traceId: match?.[1]?.toLowerCase() ?? randomHex(16),
    parentSpanId: match?.[2]?.toLowerCase(),
    spanId: randomHex(8),
  };
}

function attribute(key, value) {
  if (typeof value === "number") {
    return { key, value: { doubleValue: value } };
  }
  if (typeof value === "boolean") {
    return { key, value: { boolValue: value } };
  }
  return { key, value: { stringValue: String(value) } };
}

export function createTraceExporter({
  endpoint = process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
  serviceName = "checkout-api",
} = {}) {
  async function exportSpan({
    context,
    name,
    startedAtNanos,
    endedAtNanos,
    attributes,
    error,
  }) {
    if (!endpoint) {
      return;
    }

    const span = {
      traceId: context.traceId,
      spanId: context.spanId,
      name,
      kind: 2,
      startTimeUnixNano: String(startedAtNanos),
      endTimeUnixNano: String(endedAtNanos),
      attributes: Object.entries(attributes).map(([key, value]) =>
        attribute(key, value),
      ),
      status: error ? { code: 2, message: error.message } : { code: 1 },
    };
    if (context.parentSpanId) {
      span.parentSpanId = context.parentSpanId;
    }

    const payload = {
      resourceSpans: [
        {
          resource: {
            attributes: [
              attribute("service.name", serviceName),
              attribute("deployment.environment", "local"),
            ],
          },
          scopeSpans: [
            {
              scope: { name: "signal-room", version: "1.0.0" },
              spans: [span],
            },
          ],
        },
      ],
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) {
      throw new Error(`OTLP exporter returned ${response.status}`);
    }
  }

  function send(span) {
    void exportSpan(span).catch((error) => {
      process.stderr.write(`trace export failed: ${error.message}\n`);
    });
  }

  return { send };
}
