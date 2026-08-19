import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { createLogger } from "./logger.js";
import { createMetrics } from "./metrics.js";
import { createTraceExporter, newTraceContext } from "./tracing.js";

const rootDirectory = fileURLToPath(new URL("..", import.meta.url));
const publicDirectory = join(rootDirectory, "public");
const allowedScenarios = new Set(["normal", "slow", "failure"]);
const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function randomBetween(minimum, maximum) {
  return minimum + Math.floor(Math.random() * (maximum - minimum + 1));
}

async function readJsonBody(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 64 * 1024) {
      const error = new Error("Request body is too large");
      error.statusCode = 413;
      throw error;
    }
  }
  try {
    return body ? JSON.parse(body) : {};
  } catch {
    const error = new Error("Request body must be valid JSON");
    error.statusCode = 400;
    throw error;
  }
}

function sendJson(response, statusCode, payload, traceId) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "x-trace-id": traceId ?? "",
  });
  response.end(JSON.stringify(payload));
}

async function sendStatic(response, pathname) {
  const fileName = pathname === "/" ? "index.html" : pathname.slice(1);
  if (!["index.html", "app.js", "styles.css"].includes(fileName)) {
    return false;
  }
  const filePath = join(publicDirectory, fileName);
  const content = await readFile(filePath);
  response.writeHead(200, {
    "content-type":
      contentTypes[extname(filePath)] ?? "application/octet-stream",
    "cache-control":
      fileName === "index.html" ? "no-cache" : "public, max-age=3600",
    "x-content-type-options": "nosniff",
    "content-security-policy":
      "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'",
  });
  response.end(content);
  return true;
}

export function createSignalRoom({
  logger = createLogger(),
  metrics = createMetrics(),
  traceExporter = createTraceExporter(),
  delayScale = Number(process.env.SIMULATED_DELAY_SCALE ?? 1),
} = {}) {
  const recentEvents = [];

  function remember(event) {
    recentEvents.unshift(event);
    recentEvents.splice(30);
  }

  async function handleCheckout(request, response) {
    const payload = await readJsonBody(request);
    const scenario = payload.scenario ?? "normal";
    if (!allowedScenarios.has(scenario)) {
      return sendJson(response, 400, {
        error: "scenario must be normal, slow, or failure",
      });
    }

    const context = newTraceContext(request.headers.traceparent);
    const startedAtNanos = BigInt(Date.now()) * 1_000_000n;
    const startedAt = performance.now();
    let outcome = "success";
    let failure;

    try {
      const delay =
        scenario === "slow"
          ? randomBetween(1100, 1600)
          : randomBetween(50, 180);
      await sleep(Math.max(0, delay * delayScale));
      if (scenario === "failure") {
        failure = new Error("Payment provider declined the simulated request");
        failure.statusCode = 503;
        throw failure;
      }

      const durationMs = Math.round(performance.now() - startedAt);
      metrics.observe({
        outcome,
        scenario,
        durationSeconds: durationMs / 1000,
      });
      const event = {
        timestamp: new Date().toISOString(),
        scenario,
        outcome,
        durationMs,
        traceId: context.traceId,
      };
      remember(event);
      logger.info("checkout completed", {
        route: "/api/checkout",
        method: "POST",
        ...event,
      });
      traceExporter.send({
        context,
        name: "POST /api/checkout",
        startedAtNanos,
        endedAtNanos: BigInt(Date.now()) * 1_000_000n,
        attributes: {
          "http.request.method": "POST",
          "http.response.status_code": 200,
          "signal_room.scenario": scenario,
          "signal_room.outcome": outcome,
          "signal_room.duration_ms": durationMs,
        },
      });
      return sendJson(
        response,
        200,
        {
          orderId: randomUUID(),
          outcome,
          scenario,
          durationMs,
          traceId: context.traceId,
        },
        context.traceId,
      );
    } catch (error) {
      failure = error;
      outcome = "error";
      const durationMs = Math.round(performance.now() - startedAt);
      metrics.observe({
        outcome,
        scenario,
        durationSeconds: durationMs / 1000,
      });
      const event = {
        timestamp: new Date().toISOString(),
        scenario,
        outcome,
        durationMs,
        traceId: context.traceId,
      };
      remember(event);
      logger.error("checkout failed", {
        route: "/api/checkout",
        method: "POST",
        error: error.message,
        ...event,
      });
      traceExporter.send({
        context,
        name: "POST /api/checkout",
        startedAtNanos,
        endedAtNanos: BigInt(Date.now()) * 1_000_000n,
        error,
        attributes: {
          "http.request.method": "POST",
          "http.response.status_code": error.statusCode ?? 500,
          "signal_room.scenario": scenario,
          "signal_room.outcome": outcome,
          "signal_room.duration_ms": durationMs,
        },
      });
      return sendJson(
        response,
        error.statusCode ?? 500,
        {
          error: error.message,
          outcome,
          scenario,
          durationMs,
          traceId: context.traceId,
        },
        context.traceId,
      );
    }
  }

  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, "http://localhost");
      if (
        request.method === "GET" &&
        (await sendStatic(response, url.pathname))
      ) {
        return;
      }
      if (request.method === "GET" && url.pathname === "/healthz") {
        return sendJson(response, 200, { status: "ok" });
      }
      if (request.method === "GET" && url.pathname === "/readyz") {
        return sendJson(response, 200, { status: "ready" });
      }
      if (request.method === "GET" && url.pathname === "/api/events") {
        return sendJson(response, 200, { events: recentEvents });
      }
      if (request.method === "GET" && url.pathname === "/metrics") {
        response.writeHead(200, {
          "content-type": "text/plain; version=0.0.4; charset=utf-8",
          "cache-control": "no-store",
        });
        return response.end(metrics.render());
      }
      if (request.method === "POST" && url.pathname === "/api/checkout") {
        return await handleCheckout(request, response);
      }
      return sendJson(response, 404, { error: "Not found" });
    } catch (error) {
      logger.error("request failed before completion", {
        error: error.message,
      });
      return sendJson(response, error.statusCode ?? 500, {
        error: error.message,
      });
    }
  });

  return { server, metrics, recentEvents };
}
