import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import exec from 'k6/execution';

const API = __ENV.API_BASE_URL || 'http://localhost:8080';
const WS = __ENV.WS_BASE_URL || 'ws://localhost:8080';
const TOKEN = __ENV.AUTH_TOKEN || '';
const CHARACTER_IDS = (__ENV.CHARACTER_IDS || '').split(',').map((v) => v.trim()).filter(Boolean);
const HOLD = __ENV.HOLD || '2m';

export const options = {
  scenarios: {
    ccu_ramp: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: Number(__ENV.CCU_1 || 100) },
        { duration: HOLD, target: Number(__ENV.CCU_1 || 100) },
        { duration: '45s', target: Number(__ENV.CCU_2 || 500) },
        { duration: HOLD, target: Number(__ENV.CCU_2 || 500) },
        { duration: '60s', target: Number(__ENV.CCU_3 || 1000) },
        { duration: HOLD, target: Number(__ENV.CCU_3 || 1000) },
        { duration: '90s', target: Number(__ENV.CCU_4 || 2500) },
        { duration: HOLD, target: Number(__ENV.CCU_4 || 2500) },
        { duration: '120s', target: Number(__ENV.CCU_5 || 5000) },
        { duration: HOLD, target: Number(__ENV.CCU_5 || 5000) },
        { duration: '60s', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    checks: ['rate>0.99'],
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

function characterForVU() {
  const index = exec.vu.idInTest - 1;
  if (!CHARACTER_IDS[index]) {
    throw new Error(`CHARACTER_IDS precisa possuir um personagem exclusivo para o VU ${index + 1}`);
  }
  return CHARACTER_IDS[index];
}

export default function () {
  if (!TOKEN) throw new Error('AUTH_TOKEN obrigatório');
  const characterId = characterForVU();
  const ticketResponse = http.post(`${API}/api/v1/auth/ws-ticket`, JSON.stringify({ character_id: characterId }), {
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
  });
  check(ticketResponse, { 'ticket HTTP 201': (r) => r.status === 201 });
  if (ticketResponse.status !== 201) return;
  const ticket = ticketResponse.json('ticket');

  const response = ws.connect(`${WS}/ws?ticket=${encodeURIComponent(ticket)}`, {}, (socket) => {
    socket.on('open', () => {
      socket.send(JSON.stringify({ action: 'REQUEST_STATE_SYNC', request_id: `load-${exec.vu.idInTest}-${Date.now()}` }));
    });
    socket.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw);
        if (msg.type === 'WELCOME_EVENT') {
          socket.send(JSON.stringify({ action: 'TOGGLE_EXPEDITION' }));
        }
      } catch (_) {}
    });
    socket.setInterval(() => {
      socket.send(JSON.stringify({ action: 'MOVE_HERO', direction: 'right', pressed: true, request_id: `mv-${Date.now()}` }));
      socket.send(JSON.stringify({ action: 'MOVE_HERO', direction: 'right', pressed: false, request_id: `mv2-${Date.now()}` }));
    }, 5000);
    socket.setTimeout(() => socket.close(), 120000);
  });
  check(response, { 'websocket upgrade 101': (r) => r && r.status === 101 });
  sleep(1);
}