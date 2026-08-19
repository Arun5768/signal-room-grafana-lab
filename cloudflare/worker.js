const allowedScenarios = new Set(["normal", "slow", "failure"]);

function randomHex(bytes) {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  return [...value].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function json(payload, status = 200, traceId = "") {
  return Response.json(payload, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
      "x-trace-id": traceId,
    },
  });
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function boundedScale(env) {
  const value = Number(env.SIMULATED_DELAY_SCALE ?? 1);
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 1;
}

async function checkout(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Request body must be valid JSON" }, 400);
  }

  const scenario = body.scenario ?? "normal";
  if (!allowedScenarios.has(scenario)) {
    return json({ error: "scenario must be normal, slow, or failure" }, 400);
  }

  const startedAt = performance.now();
  const traceId = randomHex(16);
  const requestId = crypto.randomUUID();
  const baseDelay = scenario === "slow" ? 1250 : 90;
  const jitter =
    scenario === "slow" ? Math.random() * 300 : Math.random() * 100;
  await delay((baseDelay + jitter) * boundedScale(env));

  const durationMs = Math.round(performance.now() - startedAt);
  const outcome = scenario === "failure" ? "error" : "success";
  const event = {
    timestamp: new Date().toISOString(),
    service: "signal-room-public-demo",
    route: "/api/checkout",
    method: "POST",
    requestId,
    traceId,
    scenario,
    outcome,
    durationMs,
    colo: request.cf?.colo ?? "unknown",
  };

  console.log(JSON.stringify(event));

  if (scenario === "failure") {
    return json(
      {
        ...event,
        error: "Payment provider declined the simulated request",
      },
      503,
      traceId,
    );
  }

  return json(
    {
      ...event,
      orderId: crypto.randomUUID(),
    },
    200,
    traceId,
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/api/checkout") {
      return checkout(request, env);
    }

    if (request.method === "GET" && url.pathname === "/healthz") {
      return json({ status: "ok", runtime: "cloudflare-workers" });
    }

    if (url.pathname.startsWith("/api/")) {
      return json({ error: "Not found" }, 404);
    }

    return env.ASSETS.fetch(request);
  },
};
