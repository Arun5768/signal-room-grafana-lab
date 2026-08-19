import assert from "node:assert/strict";
import test from "node:test";
import worker from "../cloudflare/worker.js";

const environment = { SIMULATED_DELAY_SCALE: 0 };

function checkout(scenario) {
  return worker.fetch(
    new Request("https://example.com/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scenario }),
    }),
    environment,
  );
}

test("Worker produces traceable success evidence", async () => {
  const response = await checkout("normal");
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.outcome, "success");
  assert.match(body.traceId, /^[a-f0-9]{32}$/);
  assert.equal(response.headers.get("x-trace-id"), body.traceId);
});

test("Worker exposes a controlled failure without losing correlation", async () => {
  const response = await checkout("failure");
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(body.outcome, "error");
  assert.match(body.error, /simulated request/);
  assert.equal(response.headers.get("x-trace-id"), body.traceId);
});
