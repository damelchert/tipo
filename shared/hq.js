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
  _perf: null,      // 16.5 — { events, startState, active, use }
  _perfInit: false,

  enable(cfg) {
    this._cfg = cfg;
    this._initPerf();
    const rec = document.getElementById('recBtn') || document.getElementById('recordBtn');
    if (!rec || document.getElementById('hqBtn')) return;
    if (!document.getElementById('tipoHQcss')) {
      const s = document.createElement('style');
      s.id = 'tipoHQcss';
      s.textContent = `
#hqBtn { flex: 1; white-space: nowrap; }
#hqBtn.running {
  border-color: var(--accent, #2A8A7A) !important;
  color: var(--accent, #2A8A7A) !important;
  opacity: 1 !important;
  animation: hqPulse 1.4s ease-in-out infinite;
}
@keyframes hqPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(42, 138, 122, 0); }
  50% { box-shadow: 0 0 0 3px rgba(42, 138, 122, .25); }
}`;
      document.head.appendChild(s);
    }
    const b = document.createElement('button');
    b.id = 'hqBtn';
    b.type = 'button';
    b.className = rec.className || 'btn btn-secondary';
    b.textContent = 'Export HQ';
    b.title = 'Render offline na resolução do vídeo fonte — frame-perfect pra montagem (leva mais tempo, não trava)';
    b.addEventListener('click', () => this.run());
    // inserir DEPOIS do boot: GIF/Link são injetados após o recBtn no
    // DOMContentLoaded e entrariam no meio — assim fica Record | HQ | GIF | Link
    const place = () => rec.insertAdjacentElement('afterend', b);
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => setTimeout(place, 0));
    } else {
      setTimeout(place, 0);
    }
  },

  /* ============================================================
     16.5 — PERFORMANCE CAPTURE: durante o Record MP4 ao vivo,
     loga a automação de sliders e eventos da ferramenta (ex.:
     drop de keyframe do datamosh) com o TIMESTAMP DO VÍDEO.
     No Export HQ, a passada offline reaplica os eventos nos
     tempos certos — performance de VJ + arquivo master.
     ============================================================ */
  _initPerf() {
    if (this._perfInit) return;
    this._perfInit = true;
    document.addEventListener('tipo-rec-start', () => {
      const v = this._cfg && this._cfg.getVideo ? this._cfg.getVideo() : null;
      if (!v || !isFinite(v.duration) || !v.duration) return;
      this._perf = { events: [], startState: this._snapshotSliders(), active: true, use: false };
      this._syncPerfChip();
    });
    document.addEventListener('tipo-rec-stop', () => {
      if (!this._perf || !this._perf.active) return;
      this._perf.active = false;
      if (this._perf.events.length) {
        this._perf.use = true;
        TipoUI.showToast(`Performance capturada — ${this._perf.events.length} eventos. Export HQ vai reaplicar ✦`);
      } else {
        this._perf = null;
      }
      this._syncPerfChip();
    });
    // automação de sliders (só interação REAL do usuário)
    document.addEventListener('input', (e) => {
      if (!this._perf || !this._perf.active || !e.isTrusted) return;
      const el = e.target;
      if (!el.matches || !el.matches('input[type="range"]') || !el.id || el.closest('#tipoTL')) return;
      const v = this._cfg.getVideo();
      if (!v) return;
      this._perf.events.push({ kind: 'slider', id: el.id, v: Number(el.value), t: v.currentTime });
    });
  },

  /** Ferramentas chamam pra registrar momentos próprios com timestamp do
   *  vídeo (ex.: datamosh dropKeyframe). No-op fora de gravação. */
  perfEvent(name) {
    if (!this._perf || !this._perf.active || !this._cfg) return;
    const v = this._cfg.getVideo();
    if (!v) return;
    this._perf.events.push({ kind: 'custom', name, t: v.currentTime });
  },

  _snapshotSliders() {
    return Array.from(document.querySelectorAll('.range-row input[type="range"]'))
      .filter(el => el.id && !el.closest('#tipoTL'))
      .map(el => ({ id: el.id, v: el.value }));
  },

  _applySlider(id, v) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = v;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  },

  _syncPerfChip() {
    let chip = document.getElementById('hqPerfChip');
    const hqBtn = document.getElementById('hqBtn');
    if (!this._perf || !this._perf.events.length || this._perf.active) {
      if (chip) chip.remove();
      return;
    }
    if (!chip && hqBtn) {
      chip = document.createElement('button');
      chip.id = 'hqPerfChip';
      chip.type = 'button';
      chip.className = hqBtn.className;
      chip.addEventListener('click', () => {
        this._perf.use = !this._perf.use;
        this._syncPerfChip();
      });
      hqBtn.insertAdjacentElement('afterend', chip);
    }
    if (chip) {
      chip.textContent = `✦ Performance (${this._perf.events.length} ev) ${this._perf.use ? 'ON' : 'OFF'}`;
      chip.title = 'Sua performance ao vivo (sliders + drops, com timestamp do vídeo) reaplicada no Export HQ. Clique pra ligar/desligar.';
      chip.style.borderColor = this._perf.use ? 'var(--accent, #2A8A7A)' : '';
      chip.style.color = this._perf.use ? 'var(--accent, #2A8A7A)' : '';
    }
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

  /** 16.4 — áudio: decodifica a trilha do arquivo fonte e devolve
   *  { buffer, rate, channels, codec } pronto pro encode, ou null
   *  (sem trilha / codec sem suporte → exporta mudo, como antes). */
  async _prepareAudio(video) {
    try {
      const src = video.currentSrc || video.src;
      if (!src) return null;
      const bytes = await (await fetch(src)).arrayBuffer();
      const actx = new AudioContext();
      let ab;
      try {
        ab = await actx.decodeAudioData(bytes);
      } finally {
        actx.close();
      }
      if (!ab || !ab.length) return null;
      const channels = Math.min(2, ab.numberOfChannels);
      const rate = ab.sampleRate;
      for (const codec of ['mp4a.40.2', 'opus']) {
        try {
          const s = await AudioEncoder.isConfigSupported({
            codec, sampleRate: rate, numberOfChannels: channels, bitrate: 128000,
          });
          if (s.supported) return { buffer: ab, rate, channels, codec };
        } catch (e) { /* tenta o próximo */ }
      }
      return null;
    } catch (e) {
      return null; // fonte sem áudio (ou CORS) — segue mudo
    }
  },

  /** Encoda o AudioBuffer inteiro em chunks pro muxer. */
  async _encodeAudio(audio, muxer, onError) {
    const { buffer: ab, rate, channels, codec } = audio;
    const enc = new AudioEncoder({
      output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
      error: e => onError(e),
    });
    enc.configure({ codec, sampleRate: rate, numberOfChannels: channels, bitrate: 128000 });
    const FRAME = 1024;
    const len = ab.length;
    const chData = [];
    for (let c = 0; c < channels; c++) chData.push(ab.getChannelData(c));
    for (let off = 0; off < len; off += FRAME) {
      const n = Math.min(FRAME, len - off);
      const buf = new Float32Array(n * channels);
      for (let c = 0; c < channels; c++) buf.set(chData[c].subarray(off, off + n), c * n);
      const ad = new AudioData({
        format: 'f32-planar',
        sampleRate: rate,
        numberOfFrames: n,
        numberOfChannels: channels,
        timestamp: Math.round(off / rate * 1e6),
        data: buf,
      });
      enc.encode(ad);
      ad.close();
      if (enc.encodeQueueSize > 12) await new Promise(r => setTimeout(r, 2));
    }
    await enc.flush();
    enc.close();
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

  /** 16.6 — Record → HQ como default: gravou ao vivo com fonte de vídeo?
   *  A entrega final é a passada HQ com a performance reaplicada. A
   *  gravação ao vivo vira fallback (cancelou/falhou = baixa ela).
   *  Retorna true quando assumiu a entrega; false = o chamador baixa o live. */
  async deliverRecording(liveResult) {
    const cfg = this._cfg;
    const video = cfg && cfg.getVideo ? cfg.getVideo() : null;
    if (!video || !video.videoWidth || !isFinite(video.duration) || video.duration <= 0) return false;
    if (typeof VideoEncoder === 'undefined' || typeof Mp4Muxer === 'undefined') return false;
    if (this._running) return false;
    // REC da timeline tem duração/automação próprias — segue no fluxo ao vivo
    if (typeof TipoTimeline !== 'undefined' && TipoTimeline._tlPass) return false;
    // performance capturada é o default do render
    if (this._perf && this._perf.events.length) { this._perf.use = true; this._syncPerfChip(); }
    const n = (this._perf && this._perf.use) ? this._perf.events.length : 0;
    TipoUI.showToast(n
      ? `Take gravada — renderizando em HQ com sua performance (${n} eventos)…`
      : 'Take gravada — renderizando em HQ…');
    const ok = await this.run({ title: 'Render HQ da sua take', fromRecording: true });
    if (!ok && liveResult && liveResult.blob) {
      TipoRecorder.download(liveResult.blob, liveResult.filename);
      TipoUI.showToast(`Ficou a gravação ao vivo (${liveResult.sizeMB} MB)`);
    }
    return true;
  },

  async run(opts = {}) {
    if (this._running) return false;
    const TITLE = opts.title || 'Export HQ';
    const cfg = this._cfg;
    const video = cfg && cfg.getVideo ? cfg.getVideo() : null;
    if (!video || !video.videoWidth || !isFinite(video.duration) || video.duration <= 0) {
      TipoUI.showToast('Export HQ precisa de um VÍDEO carregado (upload)');
      return false;
    }
    if (typeof VideoEncoder === 'undefined' || typeof Mp4Muxer === 'undefined') {
      TipoUI.showToast('Precisa de WebCodecs — use Chrome ou Edge');
      return false;
    }

    const fps = 30;
    const enc = await this._pickConfig(video.videoWidth, video.videoHeight, fps);
    if (!enc) { TipoUI.showToast('Encoder não suporta essa resolução'); return false; }

    this._running = true;
    this._cancel = false;
    window.__tipoHQactive = true; // ferramentas temporais pausam o loop ao vivo
    const ui = this._progressUI();
    const hqBtn = document.getElementById('hqBtn');
    if (hqBtn) { hqBtn.disabled = true; hqBtn.classList.add('running'); hqBtn.textContent = 'Renderizando…'; }

    // estado do player pra restaurar no fim
    const wasPaused = video.paused;
    const wasTime = video.currentTime;
    video.pause();

    const canvas = document.createElement('canvas');
    canvas.width = enc.width;
    canvas.height = enc.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    // 16.4 — remux da trilha do fonte (AAC; fallback Opus; sem trilha = mudo)
    ui.open();
    ui.set(0, `${TITLE} — preparando`, 'lendo a trilha de áudio do fonte…');
    const audio = typeof AudioEncoder !== 'undefined' ? await this._prepareAudio(video) : null;

    const muxer = new Mp4Muxer.Muxer({
      target: new Mp4Muxer.ArrayBufferTarget(),
      video: { codec: 'avc', width: enc.width, height: enc.height },
      audio: audio ? {
        codec: audio.codec === 'opus' ? 'opus' : 'aac',
        sampleRate: audio.rate,
        numberOfChannels: audio.channels,
      } : undefined,
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

    // 16.5 — replay da performance: estado inicial do take + eventos por tempo
    const perf = (this._perf && this._perf.use && this._perf.events.length) ? this._perf : null;
    let perfIdx = 0;
    let perfRestore = null;
    if (perf) {
      perf.events.sort((a, b) => a.t - b.t);
      perfRestore = this._snapshotSliders(); // estado atual (pós-performance)
      perf.startState.forEach(s => this._applySlider(s.id, s.v));
    }

    let delivered = false;
    try {
      ui.open();
      ui.set(0, `${TITLE} — renderizando`, `${enc.width}×${enc.height} · frame 0/${total}${perf ? ' · ✦ performance' : ''}`);
      // temporais (datamosh/rastro) resetam buffers no tamanho HQ antes da passada
      if (cfg.begin) await cfg.begin(enc.width, enc.height);
      for (let i = 0; i < total; i++) {
        if (this._cancel) break;
        const t = Math.min((i + 0.5) / fps, dur - 0.001);
        await this._seek(video, t);
        if (perf) {
          while (perfIdx < perf.events.length && perf.events[perfIdx].t <= t) {
            const ev = perf.events[perfIdx++];
            if (ev.kind === 'slider') this._applySlider(ev.id, ev.v);
            else if (cfg.perfEvent) cfg.perfEvent(ev.name);
          }
        }
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
          ui.set((i + 1) / total, `${TITLE} — renderizando`,
            `${enc.width}×${enc.height} · frame ${i + 1}/${total} · ${rate.toFixed(1)} fps · ~${eta}s restantes`);
          await new Promise(r => setTimeout(r, 0)); // deixa a UI respirar
        }
      }
      if (!this._cancel) {
        ui.set(1, `${TITLE} — finalizando`, 'encodando os últimos frames...');
        await encoder.flush();
        if (audio) {
          ui.set(1, `${TITLE} — finalizando`, 'remuxando o áudio do fonte…');
          try {
            await this._encodeAudio(audio, muxer, e => { throw e; });
          } catch (e) {
            console.warn('[TipoHQ] áudio falhou, exportando mudo:', e);
          }
        }
        muxer.finalize();
        const blob = new Blob([muxer.target.buffer], { type: 'video/mp4' });
        const name = (cfg.filename ? cfg.filename() : 'tipo-HQ') + '.mp4';
        TipoUI._downloadBlob(blob, name);
        TipoUI.showToast(`HQ pronto — ${enc.width}×${enc.height}${audio ? ' + áudio' : ''}, ${(blob.size / 1048576).toFixed(1)} MB`);
        delivered = true;
      } else {
        TipoUI.showToast(opts.fromRecording
          ? 'Render HQ cancelado — mantendo a gravação ao vivo'
          : 'Export HQ cancelado');
      }
    } catch (e) {
      console.error('[TipoHQ]', e);
      TipoUI.showToast('Export HQ falhou — veja o console');
    } finally {
      window.__tipoHQactive = false;
      if (perfRestore) perfRestore.forEach(s => this._applySlider(s.id, s.v));
      if (cfg.end) { try { cfg.end(); } catch (e) {} }
      try { encoder.close(); } catch (e) {}
      ui.close();
      if (hqBtn) { hqBtn.disabled = false; hqBtn.classList.remove('running'); hqBtn.textContent = 'Export HQ'; }
      this._running = false;
      video.currentTime = wasTime;
      if (!wasPaused) video.play();
    }
    return delivered;
  },
};

if (typeof window !== 'undefined') window.TipoHQ = TipoHQ;
