import http from 'k6/http';
import { check, sleep } from 'k6';

const baseUrl = __ENV.BASE_URL || 'http://localhost:8080';

export const options = {
  scenarios: {
    steady_traffic: {
      executor: 'constant-arrival-rate',
      rate: 4,
      timeUnit: '1s',
      duration: '2m',
      preAllocatedVUs: 8,
      maxVUs: 20,
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1800'],
    checks: ['rate>0.95'],
  },
};

export default function () {
  const roll = Math.random();
  const scenario = roll < 0.1 ? 'failure' : roll < 0.3 ? 'slow' : 'normal';
  const response = http.post(
    `${baseUrl}/api/checkout`,
    JSON.stringify({ scenario }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(response, {
    'expected status returned': (result) =>
      scenario === 'failure' ? result.status === 503 : result.status === 200,
    'trace id returned': (result) => Boolean(result.headers['X-Trace-Id']),
  });
  sleep(0.2);
}
