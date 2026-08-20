import { createHiggsfieldBridgeServer } from './higgsfield-bridge.mjs';

let fails = 0;
const check = (name, ok, detail = '') => {
  console.log(`${name}: ${ok ? 'OK' : 'FAIL'} ${detail}`);
  if (!ok) fails++;
};

const server = createHiggsfieldBridgeServer();
await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});
const address = server.address();
const base = `http://127.0.0.1:${address.port}`;

try {
  const denied = await fetch(`${base}/health`, { headers: { Origin: 'https://evil.example' } });
  check('origin externa é recusada antes do CLI', denied.status === 403, `(${denied.status})`);

  const preflight = await fetch(`${base}/generate`, {
    method: 'OPTIONS',
    headers: { Origin: 'http://localhost:3000', 'Access-Control-Request-Method': 'POST' },
  });
  check('preflight permitido somente para origin aprovada', preflight.status === 204 && preflight.headers.get('access-control-allow-origin') === 'http://localhost:3000');

  const invalid = await fetch(`${base}/generate`, {
    method: 'POST',
    headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'shell_injection_model', prompt: 'test', aspectRatio: '16:9' }),
  });
  const invalidBody = await invalid.json();
  check('modelo fora da allowlist morre com 400', invalid.status === 400 && /não permitido/i.test(invalidBody.error), `(${invalid.status})`);

  const badRatio = await fetch(`${base}/generate`, {
    method: 'POST',
    headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'seedream_v5_lite', prompt: 'test', aspectRatio: '3:2' }),
  });
  check('aspect ratio inválido morre antes de gastar créditos', badRatio.status === 400, `(${badRatio.status})`);

  const missing = await fetch(`${base}/missing`, { headers: { Origin: 'http://localhost:3000' } });
  check('bridge expõe somente health/generate', missing.status === 404, `(${missing.status})`);
} finally {
  await new Promise(resolve => server.close(resolve));
}

console.log(fails ? `${fails} FAIL` : 'ALL PASS');
process.exit(fails ? 1 : 0);
