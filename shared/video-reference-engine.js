/* Local-only video sampling. No account, uploads, playback recording or AI calls. */
(() => {
  'use strict';

  const GIF_LIBRARY = 'https://cdn.jsdelivr.net/npm/gifenc@1.0.3/dist/gifenc.esm.js';
  const MAX_GIF_BYTES = 24 * 1024 * 1024;
  const MAX_PIXELS = 120 * 1000 * 1000;
  const busyVideos = new WeakSet();
  let libraryPromise;

  class ConversionError extends Error {}
  const fail = message => { throw new ConversionError(message); };
  const cancelled = () => new DOMException('Conversão cancelada.', 'AbortError');
  const checkAbort = signal => { if (signal?.aborted) throw cancelled(); };

  function choice(value, allowed, fallback, label) {
    const selected = value ?? fallback;
    if (!allowed.includes(selected)) fail(`${label} inválido.`);
    return selected;
  }

  function fit(width, height, longEdge) {
    const scale = Math.min(1, longEdge / Math.max(width, height));
    return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
  }

  function sheetLayout(longEdge, frames, sourceWidth, sourceHeight) {
    const margin = 12;
    const cellWidth = Math.min(longEdge, 464, Math.max(180, sourceWidth));
    const cellHeight = Math.max(96, Math.min(360, Math.round(cellWidth * sourceHeight / sourceWidth)));
    const labelHeight = 30;
    return {
      margin, cellWidth, cellHeight, labelHeight,
      width: cellWidth * 3 + margin * 4,
      height: Math.ceil(frames / 3) * (cellHeight + labelHeight + margin) + margin,
    };
  }

  function validateOptions(video, options = {}) {
    if (!options || typeof options !== 'object' || Array.isArray(options)) fail('Escolha as opções de conversão.');
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0 || video.duration > 86400) {
      fail('Carregue um vídeo com duração definida de até 24 horas. Transmissões ao vivo não são compatíveis.');
    }
    if (!(video.videoWidth > 0 && video.videoHeight > 0) || video.readyState < 2) {
      fail('Aguarde o vídeo carregar antes de converter.');
    }
    if (!video.seekable?.length) fail('Este vídeo não permite navegar pelos quadros. Baixe o arquivo e faça o upload.');
    const mode = choice(options.mode, ['gif', 'sheet', 'both'], 'both', 'Formato');
    const start = options.start ?? 0;
    const end = options.end ?? Math.min(video.duration, 8);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end > video.duration + 0.001 || end - start < 0.1) {
      fail('Escolha início e fim dentro do vídeo, com pelo menos 0,1 segundo de duração.');
    }
    const safeEnd = Math.min(end, video.duration);
    const duration = safeEnd - start;
    const fps = choice(options.fps, [3, 6, 12], 6, 'FPS');
    const longEdge = choice(options.width, [320, 512, 720], 512, 'Tamanho');
    const colors = choice(options.colors, [64, 128, 256], 128, 'Número de cores');
    const sheetFrames = choice(options.sheetFrames, [6, 9, 12], 9, 'Número de quadros');
    const hasGif = mode !== 'sheet';
    const hasSheet = mode !== 'gif';
    const frames = hasGif ? Math.max(1, Math.ceil(duration * fps - 1e-8)) : 0;
    if (hasGif && (duration > 30 + 1e-8 || frames > 360)) {
      fail('O GIF aceita até 30 segundos e 360 quadros. Reduza o trecho ou use somente a prancha.');
    }
    const dimensions = fit(video.videoWidth, video.videoHeight, longEdge);
    const sheet = sheetLayout(longEdge, sheetFrames, video.videoWidth, video.videoHeight);
    const pixels = frames * dimensions.width * dimensions.height + (hasSheet ? sheet.width * sheet.height : 0);
    if (pixels > MAX_PIXELS) {
      fail('Este ajuste é pesado demais para o navegador. Reduza o tamanho, FPS ou duração do GIF.');
    }
    return { mode, start, end: safeEnd, duration, fps, longEdge, colors, sheetFrames, frames, ...dimensions, sheet };
  }

  // Abort listeners and deadlines are removed on every settlement. An import or
  // browser-owned toBlob already in flight may finish, but cannot publish a result.
  function bounded(promise, signal, timeout, message) {
    checkAbort(signal);
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (error, value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
        if (error) reject(error); else resolve(value);
      };
      const abort = () => finish(cancelled());
      const timer = setTimeout(() => finish(new ConversionError(message)), timeout);
      signal?.addEventListener('abort', abort, { once: true });
      promise.then(value => finish(null, value), error => finish(error));
    });
  }

  async function loadLibrary(signal) {
    checkAbort(signal);
    if (!libraryPromise) {
      libraryPromise = import(GIF_LIBRARY).catch(() => {
        libraryPromise = null;
        fail('Não foi possível carregar o exportador de GIF. Confira a conexão e tente novamente.');
      });
    }
    return bounded(libraryPromise, signal, 30000, 'O exportador de GIF não respondeu. Confira a conexão e tente novamente.');
  }

  function seek(video, time, signal) {
    checkAbort(signal);
    if (!video.seeking && Math.abs(video.currentTime - time) < 0.00001 && video.readyState >= 2) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = error => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        video.removeEventListener('seeked', seeked);
        video.removeEventListener('error', failed);
        signal?.removeEventListener('abort', aborted);
        if (error) reject(error); else resolve();
      };
      const seeked = () => {
        if (!video.seeking && video.readyState >= 2) finish();
      };
      const failed = () => finish(new ConversionError('Não foi possível ler um quadro do vídeo. Tente um arquivo MP4 compatível.'));
      const aborted = () => finish(cancelled());
      const timer = setTimeout(() => finish(new ConversionError('O vídeo demorou para abrir um quadro. Tente fazer upload do arquivo.')), 15000);
      video.addEventListener('seeked', seeked);
      video.addEventListener('error', failed, { once: true });
      signal?.addEventListener('abort', aborted, { once: true });
      try { video.currentTime = time; } catch { failed(); }
    });
  }

  function yieldToUI(signal) {
    return bounded(new Promise(resolve => setTimeout(resolve, 0)), signal, 30000, 'O navegador demorou para continuar a conversão.');
  }

  function canvasSurface(width, height, readPixels = false) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha: false, willReadFrequently: readPixels });
    if (!context) fail('Seu navegador não disponibilizou o processamento de imagem.');
    return { canvas, context };
  }

  function progressReporter(total, onProgress) {
    const started = performance.now();
    let completed = 0;
    return (phase, advance = false) => {
      if (advance) completed++;
      const elapsed = (performance.now() - started) / 1000;
      const eta = completed ? elapsed / completed * (total - completed) : null;
      try {
        onProgress?.({ phase, completed, total, percent: Math.floor(completed / total * 100), elapsed, eta });
      } catch { /* A view callback must not discard a completed conversion. */ }
    };
  }

  function encodeFrame(lib, encoder, context, options, index, signal) {
    checkAbort(signal);
    // This single frame's RGBA and indexed buffers become collectible on return.
    const rgba = context.getImageData(0, 0, options.width, options.height).data;
    const palette = lib.quantize(rgba, options.colors);
    checkAbort(signal);
    const indices = lib.applyPalette(rgba, palette);
    // GIF timing is centiseconds. Cumulative rounding avoids 12 FPS drifting.
    const delay = (Math.round((index + 1) * options.duration * 100 / options.frames)
      - Math.round(index * options.duration * 100 / options.frames)) * 10;
    encoder.writeFrame(indices, options.width, options.height, { palette, delay, repeat: 0 });
    checkAbort(signal);
    if (encoder.bytesView().byteLength > MAX_GIF_BYTES) {
      fail('O GIF ultrapassou 24 MB. Reduza tamanho, FPS, cores ou duração.');
    }
  }

  async function renderGif(video, options, signal, report) {
    report('loading');
    const lib = await loadLibrary(signal);
    const encoder = lib.GIFEncoder();
    const { canvas, context } = canvasSurface(options.width, options.height, true);
    try {
      for (let index = 0; index < options.frames; index++) {
        await seek(video, options.start + index * options.duration / options.frames, signal);
        checkAbort(signal);
        context.drawImage(video, 0, 0, options.width, options.height);
        encodeFrame(lib, encoder, context, options, index, signal);
        report('gif', true);
        await yieldToUI(signal);
      }
      encoder.finish();
      const bytes = encoder.bytesView();
      if (bytes.byteLength > MAX_GIF_BYTES) fail('O GIF ultrapassou 24 MB. Reduza tamanho, FPS, cores ou duração.');
      const blob = new Blob([bytes], { type: 'image/gif' });
      return { blob, width: options.width, height: options.height, frames: options.frames, duration: Math.round(options.duration * 100) / 100 };
    } finally {
      canvas.width = canvas.height = 1;
    }
  }

  function formatTimestamp(time) {
    const total = Math.round(time * 1000);
    const hours = Math.floor(total / 3600000);
    const minutes = Math.floor(total / 60000) % 60;
    const seconds = Math.floor(total / 1000) % 60;
    const pad = value => String(value).padStart(2, '0');
    return `${hours ? `${pad(hours)}:` : ''}${pad(minutes)}:${pad(seconds)}.${String(total % 1000).padStart(3, '0')}`;
  }

  function drawSheetFrame(context, video, layout, index, timestamp) {
    const x = layout.margin + (index % 3) * (layout.cellWidth + layout.margin);
    const y = layout.margin + Math.floor(index / 3) * (layout.cellHeight + layout.labelHeight + layout.margin);
    const scale = Math.min(1, layout.cellWidth / video.videoWidth, layout.cellHeight / video.videoHeight);
    const width = Math.round(video.videoWidth * scale);
    const height = Math.round(video.videoHeight * scale);
    context.fillStyle = '#080a0b';
    context.fillRect(x, y, layout.cellWidth, layout.cellHeight);
    context.drawImage(video, x + (layout.cellWidth - width) / 2, y + (layout.cellHeight - height) / 2, width, height);
    context.fillStyle = '#fafaf6';
    context.font = '14px monospace';
    context.textBaseline = 'middle';
    context.fillText(`${String(index + 1).padStart(2, '0')}  ${formatTimestamp(timestamp)}`, x + 8, y + layout.cellHeight + layout.labelHeight / 2);
  }

  async function renderSheet(video, options, signal, report) {
    const layout = options.sheet;
    const { canvas, context } = canvasSurface(layout.width, layout.height);
    const timestamps = [];
    context.fillStyle = '#1a1e20';
    context.fillRect(0, 0, canvas.width, canvas.height);
    try {
      for (let index = 0; index < options.sheetFrames; index++) {
        // Seeking to duration itself may show a blank frame in some decoders.
        const timestamp = Math.min(options.start + options.duration * index / (options.sheetFrames - 1), video.duration - 0.001);
        await seek(video, timestamp, signal);
        checkAbort(signal);
        drawSheetFrame(context, video, layout, index, timestamp);
        timestamps.push(timestamp);
        report('sheet', true);
        await yieldToUI(signal);
      }
      report('finishing');
      const blob = await bounded(new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9)), signal, 30000, 'A prancha demorou para ser exportada. Tente novamente.');
      if (!blob) fail('Não foi possível exportar a prancha. Tente outro arquivo de vídeo.');
      return { blob, width: canvas.width, height: canvas.height, frames: options.sheetFrames, timestamps };
    } finally {
      canvas.width = canvas.height = 1;
    }
  }

  async function convert(video, options = {}, { signal, onProgress } = {}) {
    checkAbort(signal);
    const normalized = validateOptions(video, options);
    if (busyVideos.has(video)) fail('Este vídeo já está sendo convertido. Aguarde ou cancele a conversão atual.');
    busyVideos.add(video);
    const originalTime = video.currentTime;
    const source = video.currentSrc;
    const report = progressReporter(normalized.frames + (normalized.mode !== 'gif' ? normalized.sheetFrames : 0), onProgress);
    try {
      video.pause();
      const gif = normalized.mode !== 'sheet' ? await renderGif(video, normalized, signal, report) : null;
      const sheet = normalized.mode !== 'gif' ? await renderSheet(video, normalized, signal, report) : null;
      checkAbort(signal);
      report('complete');
      return { gif, sheet };
    } catch (error) {
      if (error?.name === 'AbortError' || error instanceof ConversionError) throw error;
      if (error?.name === 'SecurityError') {
        fail('Este link não permite exportar os quadros do vídeo (CORS). Baixe o arquivo e faça o upload.');
      }
      fail('Não foi possível converter este vídeo. Tente um arquivo MP4 compatível ou reduza o tamanho.');
    } finally {
      // Never wait for an uncancellable restoration or touch a newly loaded file.
      if (video.currentSrc === source && Number.isFinite(originalTime)) {
        try { video.currentTime = originalTime; } catch { /* Decoder may already be disposed by the caller. */ }
      }
      busyVideos.delete(video);
    }
  }

  window.VideoReferenceEngine = Object.freeze({ convert, validateOptions });
})();
