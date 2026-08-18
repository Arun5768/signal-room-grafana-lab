const buttons = [...document.querySelectorAll('[data-scenario]')];
const result = document.querySelector('#result');

function setLoading(activeButton) {
  buttons.forEach((button) => {
    button.disabled = true;
    button.classList.toggle('active', button === activeButton);
  });
  result.className = 'result loading';
  result.textContent = 'Creating telemetry…';
}

function resetButtons() {
  buttons.forEach((button) => {
    button.disabled = false;
    button.classList.remove('active');
  });
}

function renderResponse(response, payload) {
  const successful = response.ok;
  result.className = `result ${successful ? 'success' : 'error'}`;
  result.replaceChildren();

  const status = document.createElement('strong');
  status.textContent = successful ? 'Checkout completed' : 'Checkout failed as planned';
  const detail = document.createElement('span');
  detail.textContent = `${payload.durationMs} ms · ${payload.scenario}`;
  const trace = document.createElement('code');
  trace.textContent = `trace ${payload.traceId}`;
  result.append(status, detail, trace);
}

async function runScenario(button) {
  setLoading(button);
  try {
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ scenario: button.dataset.scenario }),
    });
    const payload = await response.json();
    renderResponse(response, payload);
  } catch (error) {
    result.className = 'result error';
    result.textContent = `Request could not be completed: ${error.message}`;
  } finally {
    resetButtons();
  }
}

buttons.forEach((button) => button.addEventListener('click', () => runScenario(button)));
