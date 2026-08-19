import assert from "node:assert/strict";
import test from "node:test";
import { once } from "node:events";
import { createSignalRoom } from "../src/server.js";

function quietLogger() {
  return { info() {}, warn() {}, error() {} };
}

async function startTestServer() {
  const { server } = createSignalRoom({
    logger: quietLogger(),
    traceExporter: { send() {} },
    delayScale: 0,
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  return { server, baseUrl: `http://127.0.0.1:${port}` };
}

test("records successful and failed checkouts as observable signals", async (context) => {
  const { server, baseUrl } = await startTestServer();
  context.after(() => server.close());

  const success = await fetch(`${baseUrl}/api/checkout`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ scenario: "normal" }),
  });
  const failure = await fetch(`${baseUrl}/api/checkout`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ scenario: "failure" }),
  });

  assert.equal(success.status, 200);
  assert.equal(failure.status, 503);
  assert.match(success.headers.get("x-trace-id"), /^[a-f0-9]{32}$/);

  const metrics = await fetch(`${baseUrl}/metrics`).then((response) =>
    response.text(),
  );
  assert.match(
    metrics,
    /signal_room_checkout_requests_total\{outcome="success"\} 1/,
  );
  assert.match(
    metrics,
    /signal_room_checkout_requests_total\{outcome="error"\} 1/,
  );

  const { events } = await fetch(`${baseUrl}/api/events`).then((response) =>
    response.json(),
  );
  assert.equal(events.length, 2);
  assert.equal(events[0].outcome, "error");
});

test("rejects unknown failure scenarios", async (context) => {
  const { server, baseUrl } = await startTestServer();
  context.after(() => server.close());

  const response = await fetch(`${baseUrl}/api/checkout`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ scenario: "surprise" }),
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: "scenario must be normal, slow, or failure",
  });
});
