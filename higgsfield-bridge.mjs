import http from 'node:http';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { HIGGSFIELD_MODELS, estimateCost, modelByName } = require('./shared/fotograma-providers.js');
const { EXPAND_RATIOS, TOOL_COSTS } = require('./shared/fotograma-tools.js');

const HOST = process.env.TIPO_HIGGSFIELD_HOST || '127.0.0.1';
const PORT = Number(process.env.TIPO_HIGGSFIELD_PORT || 4789);
const CLI = process.env.TIPO_HIGGSFIELD_BIN || '/usr/local/bin/higgsfield';
const FFMPEG = process.env.TIPO_FFMPEG_BIN || (() => {
  try { return require('ffmpeg-static'); } catch (error) { return 'ffmpeg'; }
})();
const MAX_BODY_BYTES = 64 * 1024 * 1024;
const MAX_IMAGE_BYTES = 16 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 32 * 1024 * 1024;
const CLI_TIMEOUT_MS = 22 * 60 * 1000;
const DEFAULT_ORIGINS = [
  'http://127.0.0.1:3000', 'http://localhost:3000',
  'http://127.0.0.1:8080', 'http://localhost:8080',
  'http://localhost',
  'https://tipo-steel.vercel.app',
];
const configuredOrigins = String(process.env.TIPO_HIGGSFIELD_ORIGINS || '')
  .split(',').map(value => value.trim()).filter(Boolean);
const ALLOWED_ORIGINS = new Set([...DEFAULT_ORIGINS, ...configuredOrigins]);

let activeJob = null;

function inputError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function publicError(error) {
  const text = String((error && error.message) || error || 'Falha desconhecida')
    .replace(/AIza[0-9A-Za-z_-]{10,}/g, 'AIza•••')
    .replace(/AQ\.[0-9A-Za-z_.-]{8,}/g, 'AQ.•••')
    .replace(/Bearer\s+\S+/gi, 'Bearer •••')
    .slice(0, 400);
  return text || 'Falha desconhecida';
}

function originAllowed(origin) {
  return !origin || ALLOWED_ORIGINS.has(origin);
}

function sendJson(req, res, status, payload) {
  const origin = req.headers.origin;
  if (origin && originAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(JSON.stringify(payload));
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      const error = new Error('Pedido grande demais para o bridge');
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch (cause) {
    const error = new Error('JSON inválido');
    error.status = 400;
    throw error;
  }
}

function run(bin, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      cwd: options.cwd,
      env: process.env,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let settled = false;
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      finish(new Error('O Higgsfield CLI excedeu o tempo limite'));
    }, options.timeoutMs || CLI_TIMEOUT_MS);

    const append = (current, chunk) => {
      const next = current + chunk.toString('utf8');
      return next.length > 12_000_000 ? next.slice(-12_000_000) : next;
    };
    child.stdout.on('data', chunk => { stdout = append(stdout, chunk); });
    child.stderr.on('data', chunk => { stderr = append(stderr, chunk); });
    child.on('error', finish);
    child.on('close', code => {
      if (code === 0) finish(null, { stdout, stderr });
      else {
        const error = new Error(stderr.trim() || stdout.trim() || `CLI encerrou com código ${code}`);
        error.code = code;
        finish(error);
      }
    });

    function finish(error, result) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error); else resolve(result);
    }
  });
}

function parseCliJson(text) {
  const clean = String(text || '').replace(/\u001b\[[0-9;]*m/g, '').trim();
  const candidates = [clean];
  const arrayAt = clean.indexOf('[');
  const objectAt = clean.indexOf('{');
  if (arrayAt >= 0) candidates.push(clean.slice(arrayAt));
  if (objectAt >= 0) candidates.push(clean.slice(objectAt));
  for (const candidate of candidates) {
    try { return JSON.parse(candidate); } catch (error) {}
  }
  throw new Error('O CLI não devolveu JSON válido');
}

function decodeImage(dataUrl) {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=\s]+)$/.exec(String(dataUrl || ''));
  if (!match) throw inputError('Referência precisa ser PNG, JPEG ou WebP');
  const buffer = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) throw inputError('Referência vazia ou maior que 16 MB');
  return { mime: match[1], buffer };
}

async function materializeImages(images, directory) {
  const files = [];
  for (let index = 0; index < images.length; index++) {
    const decoded = decodeImage(images[index] && images[index].dataUrl);
    const sourceExt = decoded.mime === 'image/jpeg' ? '.jpg' : `.${decoded.mime.split('/')[1]}`;
    const source = join(directory, `source-${index}${sourceExt}`);
    const output = join(directory, `input-${index}.png`);
    await writeFile(source, decoded.buffer, { mode: 0o600 });
    if (decoded.mime === 'image/png') {
      await writeFile(output, decoded.buffer, { mode: 0o600 });
    } else {
      await run(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', '-i', source, '-frames:v', '1', output], { timeoutMs: 120_000 });
    }
    files.push(output);
  }
  return files;
}

function validateGenerate(body) {
  const model = modelByName(body && body.model);
  if (!model) throw inputError('Modelo Higgsfield não permitido');
  const prompt = String(body.prompt || '').trim();
  if (!prompt || prompt.length > 24_000) throw inputError('Prompt vazio ou grande demais');
  const aspectRatio = String(body.aspectRatio || '16:9');
  if (!model.aspectRatios.includes(aspectRatio)) throw inputError(`Aspect ratio indisponível no ${model.label}`);
  const images = Array.isArray(body.images) ? body.images : [];
  if (images.length > 5) throw inputError('Máximo de 5 referências no Higgsfield');
  let resolution = String(body.resolution || '2K').toUpperCase();
  if (model.resolutions.length && !model.resolutions.includes(resolution)) resolution = model.resolutions[0];
  return { model, prompt, aspectRatio, images, resolution };
}

function cliArgs(input, imageFiles) {
  const args = ['generate', 'create', input.model.name, '--prompt', input.prompt];
  for (const file of imageFiles) args.push('--image', file);
  args.push('--aspect_ratio', input.aspectRatio);
  if (['nano_banana_2', 'nano_banana_flash'].includes(input.model.name)) {
    args.push('--resolution', input.resolution.toLowerCase());
  } else if (input.model.name === 'seedream_v5_lite' || input.model.name === 'seedream_v4_5') {
    args.push('--quality', 'high');
  } else if (input.model.name === 'seedream_v5_pro') {
    args.push('--resolution', '2k');
  } else if (input.model.name === 'gpt_image_2') {
    args.push('--quality', 'high', '--resolution', input.resolution.toLowerCase(), '--batch_size', '1');
  }
  args.push('--wait', '--wait-timeout', '20m', '--wait-interval', '3s', '--json');
  return args;
}

function strictInteger(value, min, max, label) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw inputError(`${label} precisa estar entre ${min} e ${max}`);
  }
  return number;
}

function validateTool(body) {
  const tool = String(body && body.tool || '');
  const images = Array.isArray(body && body.images) ? body.images : [];
  if (images.length !== 1) throw inputError('A ferramenta precisa de exatamente uma imagem');

  if (tool === 'multiAngle') {
    return {
      tool,
      images,
      label: 'Multi Angle',
      cost: TOOL_COSTS.multiAngle,
      rotate: strictInteger(body.rotate ?? 0, -180, 180, 'Rotação'),
      vertical: strictInteger(body.vertical ?? 0, -90, 90, 'Ângulo vertical'),
      forward: strictInteger(body.forward ?? 0, -10, 10, 'Aproximação'),
      removeBg: body.removeBg === true,
    };
  }
  if (tool === 'expand') {
    const aspectRatio = String(body.aspectRatio || '16:9');
    if (!EXPAND_RATIOS.includes(aspectRatio)) throw inputError('Aspect ratio indisponível no Expand');
    return { tool, images, label: 'Expand Frame', cost: TOOL_COSTS.expand, aspectRatio };
  }
  if (tool === 'removeBg') {
    return { tool, images, label: 'Remove BG · beta', cost: TOOL_COSTS.removeBg };
  }
  throw inputError('Ferramenta Higgsfield não permitida');
}

function toolCliArgs(input, imageFile) {
  let args;
  if (input.tool === 'multiAngle') {
    args = [
      'generate', 'create', 'qwen_camera_control', '--image', imageFile,
      '--rotate_degree', String(input.rotate),
      '--vertical_angle', String(input.vertical),
      '--move_forward_level', String(input.forward),
    ];
    if (input.removeBg) args.push('--remove_bg', 'true');
  } else if (input.tool === 'expand') {
    args = ['generate', 'create', 'outpaint', '--image', imageFile, '--aspect_ratio', input.aspectRatio];
  } else {
    args = ['generate', 'create', 'image_background_remover', '--image', imageFile];
  }
  args.push('--wait', '--wait-timeout', '20m', '--wait-interval', '3s', '--json');
  return args;
}

async function accountStatus() {
  const result = await run(CLI, ['account', 'status', '--json'], { timeoutMs: 30_000 });
  const parsed = parseCliJson(result.stdout);
  return {
    connected: true,
    plan: parsed.subscription_plan_type || 'unknown',
    credits: Number(parsed.credits),
  };
}

async function downloadOutput(url) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:') throw new Error('O CLI devolveu uma URL de saída insegura');
  const trustedHost = parsed.hostname === 'higgsfield.ai'
    || parsed.hostname.endsWith('.higgsfield.ai')
    || parsed.hostname.endsWith('.cloudfront.net');
  if (!trustedHost) throw new Error('O CLI devolveu uma URL fora dos hosts de saída permitidos');
  const response = await fetch(parsed, { redirect: 'follow' });
  if (!response.ok) throw new Error(`Não consegui baixar a saída (${response.status})`);
  const declared = Number(response.headers.get('content-length') || 0);
  if (declared > MAX_OUTPUT_BYTES) throw new Error('Saída maior que 32 MB');
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > MAX_OUTPUT_BYTES) throw new Error('Saída maior que 32 MB');
  const mimeType = String(response.headers.get('content-type') || 'image/png').split(';')[0];
  if (!mimeType.startsWith('image/')) throw new Error('O Higgsfield não devolveu uma imagem');
  return { mimeType, data: buffer.toString('base64') };
}

async function generate(body) {
  if (activeJob) {
    const error = new Error('Já existe um job Higgsfield em processamento neste bridge');
    error.status = 409;
    throw error;
  }
  const input = validateGenerate(body);
  const directory = await mkdtemp(join(tmpdir(), 'tipo-higgsfield-'));
  activeJob = { model: input.model.name, startedAt: Date.now() };
  try {
    const files = await materializeImages(input.images, directory);
    const result = await run(CLI, cliArgs(input, files), { cwd: directory });
    const parsed = parseCliJson(result.stdout);
    const job = Array.isArray(parsed) ? parsed[0] : parsed;
    if (!job || job.status !== 'completed' || !job.result_url) throw new Error('O job terminou sem imagem utilizável');
    const image = await downloadOutput(job.result_url);
    let account = null;
    try { account = await accountStatus(); } catch (error) {}
    return {
      id: job.id,
      status: job.status,
      model: input.model.name,
      label: input.model.label,
      estimatedCredits: estimateCost(input.model, input.resolution),
      creditsRemaining: account && account.credits,
      image,
    };
  } finally {
    activeJob = null;
    await rm(directory, { recursive: true, force: true });
  }
}

async function runTool(body) {
  if (activeJob) {
    const error = new Error('Já existe um job Higgsfield em processamento neste bridge');
    error.status = 409;
    throw error;
  }
  const input = validateTool(body);
  const directory = await mkdtemp(join(tmpdir(), 'tipo-higgsfield-tool-'));
  activeJob = { model: input.tool, startedAt: Date.now() };
  try {
    const files = await materializeImages(input.images, directory);
    const result = await run(CLI, toolCliArgs(input, files[0]), { cwd: directory });
    const parsed = parseCliJson(result.stdout);
    const job = Array.isArray(parsed) ? parsed[0] : parsed;
    if (!job || job.status !== 'completed' || !job.result_url) throw new Error('A ferramenta terminou sem imagem utilizável');
    const image = await downloadOutput(job.result_url);
    let account = null;
    try { account = await accountStatus(); } catch (error) {}
    return {
      id: job.id,
      status: job.status,
      tool: input.tool,
      label: input.label,
      estimatedCredits: input.cost,
      creditsRemaining: account && account.credits,
      image,
    };
  } finally {
    activeJob = null;
    await rm(directory, { recursive: true, force: true });
  }
}

export function createHiggsfieldBridgeServer() {
  return http.createServer(async (req, res) => {
    const origin = req.headers.origin;
    if (!originAllowed(origin)) return sendJson(req, res, 403, { error: 'Origin não autorizado' });

    if (req.method === 'OPTIONS') {
      if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
      }
      res.writeHead(204, {
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '600',
      });
      return res.end();
    }

    const url = new URL(req.url || '/', `http://${req.headers.host || `${HOST}:${PORT}`}`);
    try {
      if (req.method === 'GET' && url.pathname === '/health') {
        const account = await accountStatus();
        return sendJson(req, res, 200, {
          ok: true,
          ...account,
          busy: !!activeJob,
          models: HIGGSFIELD_MODELS.map(({ name, label, cost, costs }) => ({ name, label, cost, costs: costs || null })),
        });
      }
      if (req.method === 'POST' && url.pathname === '/generate') {
        const payload = await readJson(req);
        const result = await generate(payload);
        return sendJson(req, res, 200, result);
      }
      if (req.method === 'POST' && url.pathname === '/tool') {
        const payload = await readJson(req);
        const result = await runTool(payload);
        return sendJson(req, res, 200, result);
      }
      return sendJson(req, res, 404, { error: 'Rota inexistente' });
    } catch (error) {
      if (!error.status || error.status >= 500) console.error('[tipo-higgsfield]', publicError(error));
      return sendJson(req, res, error.status || 500, {
        error: publicError(error),
        detail: error.status ? '' : 'Veja o terminal do bridge para o diagnóstico completo.',
      });
    }
  });
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const server = createHiggsfieldBridgeServer();
  server.listen(PORT, HOST, () => {
    console.log(`Tipó Higgsfield bridge em http://${HOST}:${PORT}`);
    console.log(`Origins permitidos: ${[...ALLOWED_ORIGINS].join(', ')}`);
  });
}
