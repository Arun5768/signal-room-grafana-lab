const baseUrl = process.env.BASE_URL ?? "http://localhost:8080";

for (const scenario of ["normal", "slow", "failure"]) {
  const response = await fetch(`${baseUrl}/api/checkout`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ scenario }),
  });
  const payload = await response.json();
  const expectedStatus = scenario === "failure" ? 503 : 200;
  if (response.status !== expectedStatus || !payload.traceId) {
    throw new Error(
      `Smoke test failed for ${scenario}: ${response.status} ${JSON.stringify(payload)}`,
    );
  }
  process.stdout.write(
    `✓ ${scenario}: ${response.status}, trace ${payload.traceId}\n`,
  );
}

const metrics = await fetch(`${baseUrl}/metrics`).then((response) =>
  response.text(),
);
if (!metrics.includes("signal_room_checkout_requests_total")) {
  throw new Error("Prometheus metrics were not exposed");
}
process.stdout.write("✓ Prometheus metrics exposed\n");
