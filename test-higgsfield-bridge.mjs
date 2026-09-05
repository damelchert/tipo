process.env.TIPO_HIGGSFIELD_ORIGINS = 'http://localhost:3000';
const { createHiggsfieldBridgeServer } = await import('./higgsfield-bridge.mjs');

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
  const live = await fetch(`${base}/live`);
  const liveBody = await live.json();
  check('liveness local não depende da sessão do CLI', live.status === 200 && liveBody.ok === true && liveBody.service === 'tipo-higgsfield-bridge');

  const denied = await fetch(`${base}/health`, { headers: { Origin: 'https://evil.example' } });
  check('origin externa é recusada antes do CLI', denied.status === 403, `(${denied.status})`);

  const missingOriginMutation = await fetch(`${base}/auth/login`, { method: 'POST' });
  check('endpoint de login exige uma origin aprovada', missingOriginMutation.status === 403, `(${missingOriginMutation.status})`);

  const deniedAuth = await fetch(`${base}/auth/login`, { method: 'POST', headers: { Origin: 'https://evil.example' } });
  check('origin externa não consegue abrir autenticação local', deniedAuth.status === 403, `(${deniedAuth.status})`);

  const preflight = await fetch(`${base}/generate`, {
    method: 'OPTIONS',
    headers: { Origin: 'http://localhost:3000', 'Access-Control-Request-Method': 'POST' },
  });
  check('preflight permitido somente para origin aprovada', preflight.status === 204 && preflight.headers.get('access-control-allow-origin') === 'http://localhost:3000');

  const unconfiguredDevOrigin = await fetch(`${base}/generate`, {
    method: 'OPTIONS',
    headers: { Origin: 'http://localhost:8080', 'Access-Control-Request-Method': 'POST' },
  });
  check('origin local de desenvolvimento exige opt-in explícito', unconfiguredDevOrigin.status === 403, `(${unconfiguredDevOrigin.status})`);

  const productionPreflight = await fetch(`${base}/tool`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://tipo-steel.vercel.app',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Private-Network': 'true',
    },
  });
  check('produção oficial alcança o bridge local', productionPreflight.status === 204 && productionPreflight.headers.get('access-control-allow-origin') === 'https://tipo-steel.vercel.app');
  check('preflight autoriza explicitamente o endereço loopback', productionPreflight.headers.get('access-control-allow-private-network') === 'true');

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

  const badTool = await fetch(`${base}/tool`, {
    method: 'POST',
    headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
    body: JSON.stringify({ tool: 'upscale_fake', images: [{ dataUrl: 'data:image/png;base64,AA==' }] }),
  });
  check('ferramenta não auditada morre antes do CLI', badTool.status === 400, `(${badTool.status})`);

  const badAngle = await fetch(`${base}/tool`, {
    method: 'POST',
    headers: { Origin: 'http://localhost:3000', 'Content-Type': 'application/json' },
    body: JSON.stringify({ tool: 'multiAngle', rotate: 999, vertical: 0, forward: 0, images: [{ dataUrl: 'data:image/png;base64,AA==' }] }),
  });
  check('parâmetro de câmera fora da allowlist morre antes do crédito', badAngle.status === 400, `(${badAngle.status})`);

  const missing = await fetch(`${base}/missing`, { headers: { Origin: 'http://localhost:3000' } });
  check('bridge não expõe rotas fora da allowlist', missing.status === 404, `(${missing.status})`);
} finally {
  await new Promise(resolve => server.close(resolve));
}

console.log(fails ? `${fails} FAIL` : 'ALL PASS');
process.exit(fails ? 1 : 0);
