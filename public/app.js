const buttons = [...document.querySelectorAll("[data-scenario]")];
const result = document.querySelector("#result");
const history = document.querySelector("#history");
const downloadButton = document.querySelector("#download");
const runtimeNote = document.querySelector("#runtime-note");
const grafanaLink = document.querySelector("#grafana-link");
const events = [];

if (!["localhost", "127.0.0.1"].includes(window.location.hostname)) {
  grafanaLink.hidden = true;
  runtimeNote.textContent =
    "Public Cloudflare Worker demo. The repository runs the complete Grafana, Loki, Tempo, Prometheus, and Alloy stack.";
}

function setLoading(activeButton) {
  buttons.forEach((button) => {
    button.disabled = true;
    button.classList.toggle("active", button === activeButton);
  });
  result.className = "result loading";
  result.textContent = "Creating telemetry…";
}

function resetButtons() {
  buttons.forEach((button) => {
    button.disabled = false;
    button.classList.remove("active");
  });
}

function renderResponse(response, payload) {
  const successful = response.ok;
  result.className = `result ${successful ? "success" : "error"}`;
  result.replaceChildren();

  const status = document.createElement("strong");
  status.textContent = successful
    ? "Checkout completed"
    : "Checkout failed as planned";
  const detail = document.createElement("span");
  detail.textContent = `${payload.durationMs} ms · ${payload.scenario}`;
  const trace = document.createElement("code");
  trace.textContent = `trace ${payload.traceId}`;
  result.append(status, detail, trace);
}

function renderHistory() {
  history.replaceChildren();
  events.forEach((event) => {
    const item = document.createElement("li");
    item.className = `history-item ${event.outcome}`;

    const heading = document.createElement("strong");
    heading.textContent = `${event.scenario} · ${event.outcome}`;
    const timing = document.createElement("span");
    timing.textContent = `${event.durationMs} ms`;
    const trace = document.createElement("code");
    trace.textContent = event.traceId;
    item.append(heading, timing, trace);
    history.append(item);
  });
  downloadButton.disabled = events.length === 0;
}

function addEvent(payload) {
  events.unshift({
    timestamp: payload.timestamp ?? new Date().toISOString(),
    requestId: payload.requestId ?? null,
    scenario: payload.scenario,
    outcome: payload.outcome,
    durationMs: payload.durationMs,
    traceId: payload.traceId,
  });
  events.splice(10);
  renderHistory();
}

function downloadReport() {
  const report = {
    title: "Signal Room incident exercise",
    generatedAt: new Date().toISOString(),
    note: "Synthetic checkout scenarios. No real payments were processed.",
    events,
  };
  const blob = new Blob([JSON.stringify(report, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `signal-room-report-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function runScenario(button) {
  setLoading(button);
  try {
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scenario: button.dataset.scenario }),
    });
    const payload = await response.json();
    renderResponse(response, payload);
    if (payload.traceId) {
      addEvent(payload);
    }
  } catch (error) {
    result.className = "result error";
    result.textContent = `Request could not be completed: ${error.message}`;
  } finally {
    resetButtons();
  }
}

buttons.forEach((button) =>
  button.addEventListener("click", () => runScenario(button)),
);

downloadButton.addEventListener("click", downloadReport);
