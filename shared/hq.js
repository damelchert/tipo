/* ============================================================
   TIPÓ — Export HQ (Fase 16)
   Render OFFLINE na resolução nativa do vídeo fonte: em vez de
   gravar o preview ao vivo (capado pra rodar a 30fps), o take é
   processado frame a frame sem pressa — seek exato → efeito em
   full-res → encode com timestamp perfeito. O resultado é um
   take frame-accurate pronto pra montagem.

   Contrato por ferramenta:
     TipoHQ.enable({
       getVideo: () => HTMLVideoElement | null,   // só vídeo upload
       render: (frame, tSec, ctx, W, H) => void,  // pipeline puro, sem cap
       filename: () => 'tipo-riso-HQ',
     });
   ============================================================ */

const TipoHQ = {
  _cfg: null,
  _running: false,
  _cancel: false,

  enable(cfg) {
    this._cfg = cfg;
    const rec = document.getElementById('recBtn');
    if (!rec || document.getElementById('hqBtn')) return;
    const b = document.createElement('button');
    b.id = 'hqBtn';
    b.type = 'button';
    b.className = rec.className || 'btn btn-secondary';
    b.textContent = 'Export HQ';
    b.title = 'Render offline na resolução do vídeo fonte — frame-perfect pra montagem (leva mais tempo, não trava)';
    b.addEventListener('click', () => this.run());
    rec.insertAdjacentElement('afterend', b);
  },

  /** Codec ladder: tenta a resolução da fonte; se o encoder do hardware não
   *  suportar, desce pra 1440p e 1080p mantendo o aspecto. */
  async _pickConfig(sw, sh, fps) {
    const fit = (maxL, maxS) => {
      const long = Math.max(sw, sh), short = Math.min(sw, sh);
      const s = Math.min(1, maxL / long, maxS / short);
      let w = Math.round(sw * s), h = Math.round(sh * s);
      w -= w % 2; h -= h % 2;
      return { w: Math.max(2, w), h: Math.max(2, h) };
    };
    const candidates = [fit(1e9, 1e9), fit(2560, 1440), fit(1920, 1080)];
    for (const c of candidates) {
      const px = c.w * c.h;
      const codec = px > 1920 * 1088 ? 'avc1.640033' : 'avc1.640028'; // High 5.1 (4K) / High 4.0
      const config = {
        codec,
        width: c.w,
        height: c.h,
        bitrate: Math.min(4e7, Math.round(px * fps * 0.12)),
        framerate: fps,
      };
      try {
        const s = await VideoEncoder.isConfigSupported(config);
        if (s.supported) return config;
      } catch (e) { /* tenta o próximo degrau */ }
    }
    return null;
  },

  _seek(v, t) {
    return new Promise(resolve => {
      const done = () => { v.removeEventListener('seeked', done); resolve(); };
      v.addEventListener('seeked', done);
      v.currentTime = t;
    });
  },

  _progressUI() {
    const overlay = document.getElementById('exportProgress');
    const title = document.getElementById('progressTitle');
    const bar = document.getElementById('progressBar');
    const info = document.getElementById('progressInfo');
    let cancelBtn = document.getElementById('hqCancel');
    if (overlay && !cancelBtn) {
      cancelBtn = document.createElement('button');
      cancelBtn.id = 'hqCancel';
      cancelBtn.textContent = 'Cancelar';
      cancelBtn.style.cssText = 'margin-top:12px;background:transparent;border:1px solid var(--border-2,#3a3a3a);color:var(--text-3,#bbb);padding:8px 18px;border-radius:6px;cursor:pointer;font-family:var(--font-ui,monospace);font-size:11px;';
      cancelBtn.addEventListener('click', () => { this._cancel = true; });
      overlay.querySelector('.progress-box').appendChild(cancelBtn);
    }
    return {
      open() { if (overlay) overlay.classList.add('open'); if (cancelBtn) cancelBtn.style.display = ''; },
      close() { if (overlay) overlay.classList.remove('open'); if (cancelBtn) cancelBtn.style.display = 'none'; },
      set(frac, txt, sub) {
        if (title) title.textContent = txt;
        if (bar) bar.style.width = (frac * 100).toFixed(1) + '%';
        if (info) info.textContent = sub || '';
      },
    };
  },

  async run() {
    if (this._running) return;
    const cfg = this._cfg;
    const video = cfg && cfg.getVideo ? cfg.getVideo() : null;
    if (!video || !video.videoWidth || !isFinite(video.duration) || video.duration <= 0) {
      TipoUI.showToast('Export HQ precisa de um VÍDEO carregado (upload)');
      return;
    }
    if (typeof VideoEncoder === 'undefined' || typeof Mp4Muxer === 'undefined') {
      TipoUI.showToast('Precisa de WebCodecs — use Chrome ou Edge');
      return;
    }

    const fps = 30;
    const enc = await this._pickConfig(video.videoWidth, video.videoHeight, fps);
    if (!enc) { TipoUI.showToast('Encoder não suporta essa resolução'); return; }

    this._running = true;
    this._cancel = false;
    const ui = this._progressUI();
    const hqBtn = document.getElementById('hqBtn');
    if (hqBtn) hqBtn.disabled = true;

    // estado do player pra restaurar no fim
    const wasPaused = video.paused;
    const wasTime = video.currentTime;
    video.pause();

    const canvas = document.createElement('canvas');
    canvas.width = enc.width;
    canvas.height = enc.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const muxer = new Mp4Muxer.Muxer({
      target: new Mp4Muxer.ArrayBufferTarget(),
      video: { codec: 'avc', width: enc.width, height: enc.height },
      fastStart: 'in-memory',
    });
    let encodeError = null;
    const encoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
      error: e => { encodeError = e; },
    });
    encoder.configure(enc);

    const dur = video.duration;
    const total = Math.max(1, Math.floor(dur * fps));
    const t0 = performance.now();
    const frameUs = Math.round(1e6 / fps);

    try {
      ui.open();
      ui.set(0, 'Export HQ — renderizando', `${enc.width}×${enc.height} · frame 0/${total}`);
      for (let i = 0; i < total; i++) {
        if (this._cancel) break;
        const t = Math.min((i + 0.5) / fps, dur - 0.001);
        await this._seek(video, t);
        cfg.render(video, t, ctx, enc.width, enc.height);
        const vf = new VideoFrame(canvas, { timestamp: i * frameUs, duration: frameUs });
        encoder.encode(vf, { keyFrame: i % fps === 0 });
        vf.close();
        if (encodeError) throw encodeError;
        // backpressure: não deixa a fila do encoder crescer sem limite
        while (encoder.encodeQueueSize > 6) await new Promise(r => setTimeout(r, 4));
        if (i % 3 === 0 || i === total - 1) {
          const elapsed = (performance.now() - t0) / 1000;
          const rate = (i + 1) / elapsed;
          const eta = Math.max(0, Math.round((total - i - 1) / rate));
          ui.set((i + 1) / total, 'Export HQ — renderizando',
            `${enc.width}×${enc.height} · frame ${i + 1}/${total} · ${rate.toFixed(1)} fps · ~${eta}s restantes`);
          await new Promise(r => setTimeout(r, 0)); // deixa a UI respirar
        }
      }
      if (!this._cancel) {
        ui.set(1, 'Export HQ — finalizando', 'encodando os últimos frames...');
        await encoder.flush();
        muxer.finalize();
        const blob = new Blob([muxer.target.buffer], { type: 'video/mp4' });
        const name = (cfg.filename ? cfg.filename() : 'tipo-HQ') + '.mp4';
        TipoUI._downloadBlob(blob, name);
        TipoUI.showToast(`HQ pronto — ${enc.width}×${enc.height}, ${(blob.size / 1048576).toFixed(1)} MB`);
      } else {
        TipoUI.showToast('Export HQ cancelado');
      }
    } catch (e) {
      console.error('[TipoHQ]', e);
      TipoUI.showToast('Export HQ falhou — veja o console');
    } finally {
      try { encoder.close(); } catch (e) {}
      ui.close();
      if (hqBtn) hqBtn.disabled = false;
      this._running = false;
      video.currentTime = wasTime;
      if (!wasPaused) video.play();
    }
  },
};

if (typeof window !== 'undefined') window.TipoHQ = TipoHQ;
