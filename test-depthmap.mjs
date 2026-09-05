// Validate depthmap.html — video -> temporally stable grayscale depth-map MP4.
//
// The neural network is deliberately NOT downloaded. Playwright replaces the
// Transformers ESM entry point with a deterministic fake pipeline, while the
// page still exercises its real lazy-import, frame scheduler, post-processing,
// temporal smoothing and MP4 export paths.
import { chromium, devices } from 'playwright';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const root = process.cwd();
const fixture = '/tmp/tipo-depthmap-fixture.mp4';
const rawOutput = '/tmp/tipo-depthmap-raw.mp4';
const stableOutput = '/tmp/tipo-depthmap-stable.mp4';
const repeatOutput = '/tmp/tipo-depthmap-repeat.mp4';
const FFMPEG = process.env.FFMPEG || 'ffmpeg';

let fails = 0;
const check = (name, ok, detail = '') => {
  console.log(`${name}: ${ok ? 'OK' : 'FAIL'} ${detail}`);
  if (!ok) fails++;
};

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: options.binary ? null : 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    ...options,
  });
  if (result.error || result.status !== 0) {
    const message = result.error?.message || String(result.stderr || result.stdout || '').slice(0, 1000);
    throw new Error(`${command} failed: ${message}`);
  }
  return result;
}

// Six deliberately simple frames are enough to prove ordered frame stepping
// and temporal smoothing without making the E2E test slow.
run(FFMPEG, [
  '-y', '-v', 'error',
  '-f', 'lavfi', '-i', 'testsrc2=size=160x96:rate=6:duration=1',
  '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
  fixture,
]);

const MOCK_TRANSFORMERS = String.raw`
  const telemetry = globalThis.__depthMock = globalThis.__depthMock || {
    factoryCalls: 0,
    inferenceCalls: 0,
    task: '',
    model: '',
    options: null,
    timestamps: [],
    outputMeans: [],
  };

  export async function pipeline(task, model, options = {}) {
    telemetry.factoryCalls++;
    telemetry.task = task;
    telemetry.model = model;
    telemetry.options = { dtype: options.dtype, device: options.device };
    options.progress_callback?.({ status: 'progress', file: 'mock-model.onnx', loaded: 25, total: 100 });
    await new Promise(resolve => setTimeout(resolve, 8));
    options.progress_callback?.({ status: 'progress', file: 'mock-model.onnx', loaded: 100, total: 100 });

    return async function mockDepthPipeline() {
      const call = telemetry.inferenceCalls++;
      const video = document.getElementById('sourceVideo');
      telemetry.timestamps.push(video ? video.currentTime : -1);

      // Alternating near/far frames intentionally flicker. A correct temporal
      // EMA in the product makes the second export measurably steadier.
      const width = 80, height = 48;
      const base = call % 2 === 0 ? 24 : 232;
      const data = new Uint8Array(width * height);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const ramp = Math.round((x / (width - 1) - 0.5) * 30);
          data[y * width + x] = Math.max(0, Math.min(255, base + ramp));
        }
      }
      telemetry.outputMeans.push(base);
      // Long enough for the test to click Cancel while an inference is in
      // flight, but still short enough to keep this suite fast.
      await new Promise(resolve => setTimeout(resolve, 18));
      return { depth: { width, height, data } };
    };
  }
`;

function contentType(file) {
  return {
    '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
    '.css': 'text/css', '.svg': 'image/svg+xml', '.ttf': 'font/ttf',
    '.otf': 'font/otf', '.mp4': 'video/mp4', '.png': 'image/png',
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  }[path.extname(file).toLowerCase()] || 'application/octet-stream';
}

async function installRoutes(context, traffic) {
  const cdn = new Map();
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (!['http:', 'https:'].includes(url.protocol)) return route.fallback();

    try {
      if (url.hostname === 'localhost') {
        const file = path.join(root, decodeURIComponent(url.pathname));
        return route.fulfill({ status: 200, contentType: contentType(file), body: fs.readFileSync(file) });
      }

      traffic.external.push(url.href);
      if (/@huggingface\/transformers/i.test(url.href)) {
        traffic.transformersModules++;
        return route.fulfill({ status: 200, contentType: 'text/javascript', body: MOCK_TRANSFORMERS });
      }

      // Any request for actual model/config/tokenizer weights is a regression:
      // the fake module must completely own the model boundary in this suite.
      if (/huggingface\.co|onnx-community|\.onnx(?:\?|$)|model\.json|config\.json|tokenizer/i.test(url.href)) {
        traffic.modelWeightRequests.push(url.href);
        return route.fulfill({ status: 418, body: 'model network disabled by test' });
      }

      // Shared UI dependencies (not model weights) follow the repository's
      // existing Playwright convention and are cached for this test process.
      if (!cdn.has(url.href)) {
        const response = await fetch(url.href);
        cdn.set(url.href, {
          status: response.status,
          type: response.headers.get('content-type') || 'application/octet-stream',
          body: Buffer.from(await response.arrayBuffer()),
        });
      }
      const cached = cdn.get(url.href);
      return route.fulfill({ status: cached.status, contentType: cached.type, body: cached.body });
    } catch (error) {
      return route.fulfill({ status: 404, body: String(error.message || error) });
    }
  });
}

function canvasHash(page) {
  return page.evaluate(() => {
    const canvas = document.getElementById('depthCanvas');
    const sample = document.createElement('canvas');
    sample.width = 32; sample.height = 20;
    const ctx = sample.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(canvas, 0, 0, sample.width, sample.height);
    const pixels = ctx.getImageData(0, 0, sample.width, sample.height).data;
    let hash = 2166136261;
    for (let i = 0; i < pixels.length; i += 4) {
      hash ^= pixels[i];
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  });
}

async function setControl(page, id, value) {
  await page.locator(`#${id}`).evaluate((element, next) => {
    if (element.type === 'checkbox') element.checked = Boolean(next);
    else element.value = String(next);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await page.waitForTimeout(80);
}

async function observeProgress(page) {
  await page.evaluate(() => {
    globalThis.__depthProgressLog = [];
    const progress = document.getElementById('progressText');
    const observer = new MutationObserver(() => globalThis.__depthProgressLog.push(progress.textContent.trim()));
    observer.observe(progress, { childList: true, subtree: true, characterData: true });
    globalThis.__depthProgressObserver = observer;
  });
}

async function generateAndDownload(page, output, { inspectExport = false } = {}) {
  await observeProgress(page);
  const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
  await page.click('#processBtn');

  let exportLayout = null;
  if (inspectExport) {
    await page.waitForFunction(() => globalThis.depthMapState?.phase === 'exporting', null, { timeout: 30000 });
    exportLayout = await actionLayout(page);
  }

  const download = await downloadPromise;
  await download.saveAs(output);
  await page.waitForFunction(() => {
    const state = globalThis.depthMapState;
    return state && (state.phase === 'ready' || state.phase === 'done') &&
      state.processedFrames === state.totalFrames && state.outputFrames > 0 && state.outputBlob;
  }, null, { timeout: 30000 });
  await page.evaluate(() => globalThis.__depthProgressObserver?.disconnect());
  return { suggestedFilename: download.suggestedFilename(), exportLayout };
}

async function downloadAgain(page, output) {
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 30000 }),
    page.click('#exportBtn'),
  ]);
  await download.saveAs(output);
  return download.suggestedFilename();
}

async function actionLayout(page) {
  return page.evaluate(() => {
    const process = document.getElementById('processBtn').getBoundingClientRect();
    const cancel = document.getElementById('cancelBtn').getBoundingClientRect();
    const style = getComputedStyle(document.getElementById('cancelBtn'));
    return {
      phase: globalThis.depthMapState?.phase || '',
      visible: style.display !== 'none' && style.visibility !== 'hidden' && cancel.width > 0 && cancel.height > 0,
      belowGenerate: cancel.top >= process.bottom - .5 && cancel.top - process.bottom <= 18,
      followsGenerate: Boolean(document.getElementById('processBtn').compareDocumentPosition(document.getElementById('cancelBtn')) & Node.DOCUMENT_POSITION_FOLLOWING),
      touchTarget: cancel.width >= 44 && cancel.height >= 44,
      process: { top: process.top, bottom: process.bottom, width: process.width, height: process.height },
      cancel: { top: cancel.top, bottom: cancel.bottom, width: cancel.width, height: cancel.height },
    };
  });
}

function probeMp4(file) {
  const probe = spawnSync(FFMPEG, ['-i', file], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  const text = `${probe.stdout || ''}\n${probe.stderr || ''}`;
  const dims = text.match(/Video:.*? (\d{2,5})x(\d{2,5})[ ,]/s);
  const duration = text.match(/Duration: (\d+):(\d+):([\d.]+)/);
  const seconds = duration
    ? Number(duration[1]) * 3600 + Number(duration[2]) * 60 + Number(duration[3])
    : 0;
  const decode = spawnSync(FFMPEG, ['-v', 'error', '-i', file, '-f', 'null', '-'], {
    encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
  });
  return {
    width: dims ? Number(dims[1]) : 0,
    height: dims ? Number(dims[2]) : 0,
    seconds,
    clean: decode.status === 0 && !(decode.stderr || '').trim(),
    decodeError: String(decode.stderr || '').trim().slice(0, 300),
  };
}

function decodedGrayStats(file) {
  const width = 32, height = 20, frameBytes = width * height;
  const decoded = run(FFMPEG, [
    '-v', 'error', '-i', file,
    '-vf', `scale=${width}:${height},format=gray`,
    '-pix_fmt', 'gray', '-f', 'rawvideo', 'pipe:1',
  ], { binary: true });
  const buffer = decoded.stdout;
  const frames = Math.floor(buffer.length / frameBytes);
  const means = [];
  let maxChannelError = 0;
  for (let frame = 0; frame < frames; frame++) {
    let total = 0;
    const offset = frame * frameBytes;
    for (let i = 0; i < frameBytes; i++) total += buffer[offset + i];
    means.push(total / frameBytes);
  }
  const deltas = means.slice(1).map((mean, index) => Math.abs(mean - means[index]));
  const transitions = deltas.filter(delta => delta > 2);
  const transitionMean = transitions.length
    ? transitions.reduce((sum, value) => sum + value, 0) / transitions.length
    : 0;

  // Decode one frame as RGB as an end-to-end grayscale guarantee. Small H.264
  // chroma rounding is tolerated, but colored output is not.
  const rgb = run(FFMPEG, [
    '-v', 'error', '-i', file, '-frames:v', '1',
    '-vf', 'scale=32:20', '-pix_fmt', 'rgb24', '-f', 'rawvideo', 'pipe:1',
  ], { binary: true }).stdout;
  for (let i = 0; i + 2 < rgb.length; i += 3) {
    maxChannelError = Math.max(maxChannelError,
      Math.abs(rgb[i] - rgb[i + 1]),
      Math.abs(rgb[i + 1] - rgb[i + 2]),
      Math.abs(rgb[i] - rgb[i + 2]));
  }
  return { frames, means, transitionMean, maxChannelError };
}

const browser = await chromium.launch({ args: ['--use-gl=angle'] });
const traffic = { external: [], transformersModules: 0, modelWeightRequests: [] };
const context = await browser.newContext({
  acceptDownloads: true,
  viewport: { width: 1280, height: 820 },
});
await installRoutes(context, traffic);

const page = await context.newPage();
const pageErrors = [];
const consoleErrors = [];
let downloadEvents = 0;
page.on('pageerror', error => pageErrors.push(error.message));
page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
page.on('download', () => { downloadEvents++; });

await page.goto('http://localhost/depthmap.html', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof TipoUI !== 'undefined');

// 1) Input contract and graceful rejection.
const initial = await page.evaluate(() => ({
  accept: document.getElementById('fileInput').accept,
  processDisabled: document.getElementById('processBtn').disabled,
  exportDisabled: !document.getElementById('exportBtn') || document.getElementById('exportBtn').disabled,
  canvas: !!document.getElementById('depthCanvas'),
  cancel: !!document.getElementById('cancelBtn'),
}));
check('video input + processing UI exists', /video/i.test(initial.accept) && initial.canvas && initial.cancel);
check('actions disabled before upload', initial.processDisabled && initial.exportDisabled);
check('model is lazy (zero module requests at boot)', traffic.transformersModules === 0);
const [emptyChooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('#emptyUploadBtn')]);
check('empty-state upload opens the native file picker', !!emptyChooser);
const presetDescriptions = await page.evaluate(() => {
  const descriptions = ['seedance', 'stable', 'edges', 'motion'].map(name => {
    applyPreset(name);
    return document.getElementById('presetNote').textContent;
  });
  applyPreset('seedance');
  return descriptions;
});
check('each preset explains its detail/stability tradeoff', new Set(presetDescriptions).size === 4 && presetDescriptions.every(text => text.length > 40));

await page.locator('#fileInput').setInputFiles({
  name: 'not-a-video.txt', mimeType: 'text/plain', buffer: Buffer.from('not video'),
});
await page.waitForTimeout(100);
const invalid = await page.evaluate(() => ({
  text: document.getElementById('modelStatus').textContent,
  disabled: document.getElementById('processBtn').disabled,
}));
check('invalid file is rejected without model load', invalid.disabled && /v[íi]deo|video|inv[aá]lid/i.test(invalid.text) && traffic.transformersModules === 0, JSON.stringify(invalid));

await page.locator('#fileInput').setInputFiles(fixture);
await page.waitForFunction(() => {
  const video = document.getElementById('sourceVideo');
  return video && video.readyState >= 1 && video.videoWidth > 0 && !document.getElementById('processBtn').disabled;
});
const loaded = await page.evaluate(() => {
  const video = document.getElementById('sourceVideo');
  const workspace = document.getElementById('depthWorkspace').getBoundingClientRect();
  const preview = video.getBoundingClientRect();
  const style = getComputedStyle(video);
  return {
    width: video.videoWidth,
    height: video.videoHeight,
    duration: video.duration,
    processEnabled: !document.getElementById('processBtn').disabled,
    controls: video.controls,
    visible: style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > .5,
    inWorkspace: document.getElementById('depthWorkspace').contains(video),
    preview: { width: preview.width, height: preview.height },
    workspace: { width: workspace.width, height: workspace.height },
  };
});
check('synthetic MP4 loads with its native metadata', loaded.width === 160 && loaded.height === 96 && Math.abs(loaded.duration - 1) < 0.15, JSON.stringify(loaded));
check('uploaded source becomes the large primary workspace preview',
  loaded.visible && loaded.inWorkspace && loaded.preview.width >= loaded.workspace.width * .60 && loaded.preview.height >= loaded.workspace.height * .42,
  JSON.stringify({ preview: loaded.preview, workspace: loaded.workspace, visible: loaded.visible }));
check('source preview exposes native playback controls', loaded.controls, JSON.stringify(loaded));

await page.evaluate(async () => {
  const video = document.getElementById('sourceVideo');
  video.currentTime = 0;
  await video.play();
});
await page.waitForFunction(() => document.getElementById('sourceVideo').currentTime > .03, null, { timeout: 3000 });
const playback = await page.evaluate(() => {
  const video = document.getElementById('sourceVideo');
  const result = { advanced: video.currentTime > .03, ended: video.ended };
  video.pause(); video.currentTime = 0;
  return result;
});
check('uploaded source preview is playable', playback.advanced, JSON.stringify(playback));
check('upload still does not load the model', traffic.transformersModules === 0);

// 2) Cancel is a dedicated row directly below Generate and interrupts safely
// between AI frames without creating a partial download.
await setControl(page, 'temporalSmooth', 0);
await setControl(page, 'analysisFps', 6);
await observeProgress(page);
await page.click('#processBtn');
await page.waitForFunction(() => globalThis.depthMapState?.phase === 'processing' && globalThis.__depthMock?.inferenceCalls > 0, null, { timeout: 30000 });
const lockedDrop = await page.evaluate(() => {
  const source = document.getElementById('sourceVideo').src;
  const transfer = new DataTransfer();
  transfer.items.add(new File(['replacement'], 'replacement.mp4', { type: 'video/mp4' }));
  document.getElementById('depthWorkspace').dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: transfer }));
  return { sameSource: document.getElementById('sourceVideo').src === source, phase: depthMapState.phase };
});
check('drag-and-drop cannot replace the source during an active pass', lockedDrop.sameSource && lockedDrop.phase === 'processing', JSON.stringify(lockedDrop));
const processingLayout = await actionLayout(page);
await page.click('#cancelBtn');
await page.waitForFunction(() => globalThis.depthMapState?.phase === 'cancelled', null, { timeout: 30000 });
await page.evaluate(() => globalThis.__depthProgressObserver?.disconnect());
const cancelled = await page.evaluate(() => ({
  state: { ...globalThis.depthMapState },
  inferenceCalls: globalThis.__depthMock.inferenceCalls,
  processDisabled: document.getElementById('processBtn').disabled,
}));
check('model loads lazily on the first Generate click', traffic.transformersModules === 1 && (await page.evaluate(() => globalThis.__depthMock.factoryCalls)) === 1);
check('Cancel is a 44px touch target on the line immediately below Generate while processing',
  processingLayout.visible && processingLayout.belowGenerate && processingLayout.followsGenerate && processingLayout.touchTarget,
  JSON.stringify(processingLayout));
check('Cancel stops between frames without producing an MP4',
  cancelled.state.cancelled && cancelled.state.processedFrames < cancelled.state.totalFrames &&
  cancelled.inferenceCalls <= cancelled.state.processedFrames + 1 && !cancelled.state.outputBlob && downloadEvents === 0 && !cancelled.processDisabled,
  JSON.stringify({ cancelled, downloadEvents }));

// 3) One click performs AI analysis, encodes the MP4 and starts the download.
// There is no mandatory second click on an Export action.
const callsBeforeRaw = await page.evaluate(() => globalThis.__depthMock.inferenceCalls);
const rawDownload = await generateAndDownload(page, rawOutput, { inspectExport: true });
const processed = await page.evaluate(() => ({
  state: { ...globalThis.depthMapState },
  mock: { ...globalThis.__depthMock },
  progress: [...globalThis.__depthProgressLog],
  status: document.getElementById('modelStatus').textContent,
  processDisabled: document.getElementById('processBtn').disabled,
  downloadAgain: document.getElementById('exportBtn') ? {
    disabled: document.getElementById('exportBtn').disabled,
    text: document.getElementById('exportBtn').textContent.trim(),
  } : null,
}));
const timestamps = processed.mock.timestamps.slice(callsBeforeRaw, callsBeforeRaw + processed.state.totalFrames);
const ordered = timestamps.every((time, index) => index === 0 || time > timestamps[index - 1] - 0.001);
check('model is reused after cancellation', traffic.transformersModules === 1 && processed.mock.factoryCalls === 1);
check('correct depth pipeline/model options',
  processed.mock.task === 'depth-estimation' && /depth|video/i.test(processed.mock.model) && /q8|fp16/.test(processed.mock.options?.dtype || ''),
  JSON.stringify({ task: processed.mock.task, model: processed.mock.model, options: processed.mock.options }));
check('video is processed frame by frame',
  processed.state.totalFrames >= 5 && processed.state.totalFrames <= 8 &&
  processed.state.processedFrames === processed.state.totalFrames &&
  processed.mock.inferenceCalls - callsBeforeRaw === processed.state.totalFrames,
  JSON.stringify({ state: processed.state, callsBeforeRaw, inferenceCalls: processed.mock.inferenceCalls }));
check('frame timestamps are ordered across the take', ordered && timestamps[0] < 0.08 && timestamps.at(-1) > 0.7, JSON.stringify(timestamps));
check('progress covers analysis and automatic MP4 export',
  processed.progress.some(text => /100%|6\s*\/\s*6|ready|pronto/i.test(text)) &&
  !processed.processDisabled && processed.state.outputFrames > 0 && processed.state.outputBlob && /ready|pronto|conclu|complete/i.test(processed.status),
  JSON.stringify({ progress: processed.progress, status: processed.status }));
check('Cancel stays directly below Generate and remains touch-sized during automatic export',
  rawDownload.exportLayout?.phase === 'exporting' && rawDownload.exportLayout.visible &&
  rawDownload.exportLayout.belowGenerate && rawDownload.exportLayout.touchTarget,
  JSON.stringify(rawDownload.exportLayout));
check('Generate automatically downloads the completed MP4',
  /depth/i.test(rawDownload.suggestedFilename) && /\.mp4$/i.test(rawDownload.suggestedFilename) &&
  downloadEvents === 1 && fs.existsSync(rawOutput) && fs.statSync(rawOutput).size > 1500,
  JSON.stringify({ filename: rawDownload.suggestedFilename, downloadEvents, bytes: fs.existsSync(rawOutput) ? fs.statSync(rawOutput).size : 0 }));
check('optional secondary action is clearly Download again, never a required Export step',
  !processed.downloadAgain || (!processed.downloadAgain.disabled && /download again|baixar novamente/i.test(processed.downloadAgain.text)),
  JSON.stringify(processed.downloadAgain));
check('no actual model weights touched the network', traffic.modelWeightRequests.length === 0, JSON.stringify(traffic.modelWeightRequests));

const repeatName = processed.downloadAgain ? await downloadAgain(page, repeatOutput) : '';
check('Download again re-delivers the finished MP4 when present',
  !processed.downloadAgain || (/\.mp4$/i.test(repeatName) && fs.statSync(repeatOutput).size > 1500),
  processed.downloadAgain ? `(${repeatName}, ${fs.existsSync(repeatOutput) ? fs.statSync(repeatOutput).size : 0} bytes)` : '(action omitted)');

// 4) Post controls must alter the current depth without re-running inference.
const baseHash = await canvasHash(page);
const callsBeforeControls = processed.mock.inferenceCalls;
await setControl(page, 'invertDepth', true);
const invertedHash = await canvasHash(page);
await setControl(page, 'invertDepth', false);
await setControl(page, 'nearClip', 30);
await setControl(page, 'farClip', 70);
const clippedHash = await canvasHash(page);
const callsAfterControls = await page.evaluate(() => globalThis.__depthMock.inferenceCalls);
check('invert and near/far controls change the depth preview', baseHash !== invertedHash && baseHash !== clippedHash && invertedHash !== clippedHash,
  JSON.stringify({ baseHash, invertedHash, clippedHash }));
check('post controls do not re-run the neural model', callsAfterControls === callsBeforeControls, `(${callsBeforeControls} -> ${callsAfterControls})`);

// The automatically downloaded first pass is the raw/flickery reference.
await setControl(page, 'nearClip', 0);
await setControl(page, 'farClip', 100);
const rawProbe = probeMp4(rawOutput);
const rawStats = decodedGrayStats(rawOutput);
check('raw MP4 preserves source geometry/duration', rawProbe.width === 160 && rawProbe.height === 96 && Math.abs(rawProbe.seconds - 1) < 0.25, JSON.stringify(rawProbe));
check('raw MP4 decodes clean and is grayscale', rawProbe.clean && rawStats.frames >= 5 && rawStats.maxChannelError <= 5,
  JSON.stringify({ probe: rawProbe, frames: rawStats.frames, channelError: rawStats.maxChannelError }));

// 5) A second one-click pass reuses the model; high temporal smoothing must measurably
// reduce frame-to-frame brightness jumps in the actual exported MP4.
await setControl(page, 'temporalSmooth', 85);
const callsBeforeStable = await page.evaluate(() => globalThis.__depthMock.inferenceCalls);
const stableDownload = await generateAndDownload(page, stableOutput);
const secondPass = await page.evaluate(() => ({
  factoryCalls: globalThis.__depthMock.factoryCalls,
  inferenceCalls: globalThis.__depthMock.inferenceCalls,
  totalFrames: globalThis.depthMapState.totalFrames,
}));
check('second pass reuses cached model', traffic.transformersModules === 1 && secondPass.factoryCalls === 1);
check('second pass processes every frame again', secondPass.inferenceCalls - callsBeforeStable === secondPass.totalFrames, JSON.stringify(secondPass));

const stableProbe = probeMp4(stableOutput);
const stableStats = decodedGrayStats(stableOutput);
check('stable MP4 auto-downloads and decodes cleanly', /\.mp4$/i.test(stableDownload.suggestedFilename) && stableProbe.clean && fs.statSync(stableOutput).size > 1500,
  JSON.stringify({ name: stableDownload.suggestedFilename, probe: stableProbe }));
check('temporal smoothing reduces real exported-frame flicker',
  rawStats.transitionMean > 20 && stableStats.transitionMean < rawStats.transitionMean * 0.65,
  JSON.stringify({ rawDelta: rawStats.transitionMean, stableDelta: stableStats.transitionMean }));

// 6) Landing-page and mobile integration.
const index = await context.newPage();
await index.goto('http://localhost/index.html#visual', { waitUntil: 'domcontentloaded' });
await index.locator('.hub-tool-link[href="depthmap.html"]').waitFor({ state: 'visible' });
const card = await index.evaluate(() => {
  const link = document.querySelector('.hub-tool-link[href="depthmap.html"]');
  return {
    link: link && {
      title: link.querySelector('h3')?.textContent || '',
      desc: link.querySelector('p')?.textContent || '',
      meta: link.querySelector('.hub-tool-meta')?.textContent || '',
    },
    visualFilter: document.querySelector('[data-filter="visual"]')?.getAttribute('aria-pressed'),
  };
});
check('Depth Map card is integrated in Visual Tools',
  !!card.link && card.visualFilter === 'true' && /depth\s*map/i.test(card.link.title) && /v[íi]deo/i.test(`${card.link.desc} ${card.link.meta}`) && /seedance|mp4/i.test(`${card.link.desc} ${card.link.meta}`),
  JSON.stringify(card));
await index.locator('[data-filter="all"]').click();
const catalogCount = await index.locator('.hub-tool-link').count();
const sourceToolCount = fs.readdirSync(root).filter(file => file.endsWith('.html') && file !== 'index.html').length;
check('landing tool count includes every standalone tool', catalogCount === sourceToolCount, `${catalogCount}/${sourceToolCount}`);
await index.close();

const mobileTraffic = { external: [], transformersModules: 0, modelWeightRequests: [] };
const mobileContext = await browser.newContext({ ...devices['iPhone 13'], acceptDownloads: true });
await installRoutes(mobileContext, mobileTraffic);
const mobile = await mobileContext.newPage();
const mobileErrors = [];
mobile.on('pageerror', error => mobileErrors.push(error.message));
await mobile.goto('http://localhost/depthmap.html', { waitUntil: 'domcontentloaded' });
await mobile.waitForFunction(() => document.body.classList.contains('tipo-mobile'));
await mobile.locator('#fileInput').setInputFiles(fixture);
await mobile.waitForFunction(() => document.getElementById('sourceVideo')?.videoWidth > 0);
const mobileLayout = await mobile.evaluate(() => {
  const canvas = document.getElementById('depthCanvas').getBoundingClientRect();
  const source = document.getElementById('sourceVideo');
  const sourceBox = source.getBoundingClientRect();
  const panel = document.querySelector('.tipo-panel');
  const grip = document.querySelector('.tipo-sheet-grip')?.getBoundingClientRect();
  const touch = id => {
    const element = document.getElementById(id);
    if (!element) return true;
    const box = element.getBoundingClientRect();
    return box.width >= 44 && box.height >= 44;
  };
  return {
    grip: !!grip && grip.top >= 0 && grip.bottom <= innerHeight,
    canvasFits: canvas.width > 100 && canvas.height > 50 && canvas.left >= -1 && canvas.right <= innerWidth + 1,
    sourceIsPrimaryPreview: source.controls && sourceBox.width >= innerWidth * .75 && sourceBox.height >= 150 && sourceBox.left >= -1 && sourceBox.right <= innerWidth + 1,
    noHorizontalOverflow: document.documentElement.scrollWidth <= innerWidth + 1,
    startsClosed: !panel.classList.contains('sheet-open'),
    touchTargets: touch('processBtn'),
    cancelCssTarget: parseFloat(getComputedStyle(document.getElementById('cancelBtn')).minHeight) >= 44,
  };
});
check('mobile layout keeps the playable source preview primary and touch-safe', Object.values(mobileLayout).every(Boolean), JSON.stringify(mobileLayout));
await mobile.tap('.tipo-sheet-grip');
await mobile.waitForTimeout(400);
check('mobile bottom sheet opens in one tap', await mobile.evaluate(() => document.querySelector('.tipo-panel').classList.contains('sheet-open')));
check('mobile boot is error-free and does not load model', mobileErrors.length === 0 && mobileTraffic.transformersModules === 0,
  JSON.stringify({ mobileErrors, modules: mobileTraffic.transformersModules }));
await mobileContext.close();

check('desktop page has zero runtime errors', pageErrors.length === 0, JSON.stringify(pageErrors));
check('desktop page has zero console errors', consoleErrors.length === 0, JSON.stringify(consoleErrors));
await page.screenshot({ path: '/tmp/tipo-depthmap-test.png', fullPage: true });
await context.close();
await browser.close();

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILURES`);
process.exit(fails ? 1 : 0);
