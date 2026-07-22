/* ============================================================
   TIPÓ — Shared MP4 Recorder
   Reusable across all tools. Uses WebCodecs + mp4-muxer for 2D MP4,
   with MediaRecorder/captureStream fallback for WEBGL or unsupported
   browsers.
   ============================================================ */

class TipoRecorder {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.fps = options.fps || 30;
    this.onStatusChange = options.onStatusChange || (() => {});
    this.onProgress = options.onProgress || (() => {});
    this.preferStream = options.preferStream === true;

    this.isRecording = false;
    this._stopping = false;
    this.muxer = null;
    this.encoder = null;
    this.frameCount = 0;
    this.startTime = 0;
    this.lastCaptureTime = -1;
    this.encW = 0;
    this.encH = 0;
    this._firstTimestampUs = null;
    this._lastKeyTsUs = -1;

    // MediaRecorder state
    this._mediaRecorder = null;
    this._chunks = null;
    this._streamFormat = null;
    this._streamTrack = null;
    this._streamFrameTimer = null;
    this._lastStreamFrameTime = -1;
    this._mp4FrameTimer = null;

    // Timer
    this.timerInterval = null;
    this.timerEl = null;
  }

  get hasMp4Support() {
    return typeof VideoEncoder !== 'undefined'
      && typeof Mp4Muxer !== 'undefined'
      && Mp4Muxer.Muxer;
  }

  setTimerElement(el) {
    this.timerEl = el;
  }

  async start(bitrate = 8000000) {
    // Block start while recording or while a previous stop() is still flushing —
    // otherwise the new session would overwrite encoder/muxer mid-flush.
    if (this.isRecording || this._stopping) return;

    this._resetSession();

    // ÁUDIO AO VIVO NA GRAVAÇÃO: se a página expõe um tap (TipoAudio com
    // fonte tocando), o MP4/WebM sai com a trilha que dirige os efeitos.
    this._tap = null;
    this.hasAudio = false;
    try {
      if (typeof TipoRecorder.audioTap === 'function') this._tap = TipoRecorder.audioTap() || null;
    } catch (e) { this._tap = null; }

    // WebCodecs MP4 works for both 2D and WEBGL canvases: frames are copied
    // via drawImage into a 2D record canvas (p5 WEBGL keeps
    // preserveDrawingBuffer=true, and captureFrame() runs inside draw()).
    let mp4Started = false;
    if (this.hasMp4Support && !this.preferStream) {
      try {
        mp4Started = await this._startMP4(bitrate);
      } catch (err) {
        console.warn('MP4 encoder unavailable, falling back to stream recorder:', err);
        this._resetSession();
      }
    }
    if (!mp4Started) this._startStream(bitrate);

    this.isRecording = true;
    if (this.encoder) {
      this._mp4FrameTimer = setInterval(() => {
        this.captureFrame();
      }, 1000 / this.fps);
    }
    this.startTime = performance.now();
    // relógio do áudio nasce junto com o do vídeo (timestamps por amostra)
    if (this.audioEncoder) this._startAudioCapture();
    this._startTimer();
    this.onStatusChange('recording');
  }

  // H.264 level must match the resolution — a fixed low level makes the
  // encoder error out asynchronously on big (e.g. retina) canvases, after
  // which every encode() throws and nothing can be exported.
  static _pickAvcCodec(w, h) {
    const px = w * h;
    if (px <= 921600) return 'avc1.42001f';   // ≤720p  — level 3.1
    if (px <= 2097152) return 'avc1.420028';  // ≤1080p — level 4.0
    return 'avc1.420033';                     // ≤4K    — level 5.1
  }

  async _startMP4(bitrate) {
    // Cap encode size at 1080p-class, aspect-preserving. Retina (DPR=2)
    // canvases would otherwise force a near-4K software H.264 encode that
    // starves the page's draw loop and makes the MP4 stutter.
    const w = this.canvas.width;
    const h = this.canvas.height;
    const long = Math.max(w, h), short = Math.min(w, h);
    const fit = Math.min(1, 1920 / long, 1080 / short);
    let encW = Math.round(w * fit); encW += encW % 2;
    let encH = Math.round(h * fit); encH += encH % 2;

    const config = {
      codec: TipoRecorder._pickAvcCodec(encW, encH),
      width: encW,
      height: encH,
      bitrate,
      framerate: this.fps,
      latencyMode: 'realtime',
    };
    const support = await VideoEncoder.isConfigSupported(config).catch(() => null);
    if (!support || !support.supported) {
      console.warn('MP4 config unsupported, falling back to stream recorder:', config);
      return false;
    }

    this.encW = encW;
    this.encH = encH;
    this._lastKeyTsUs = -1;

    // trilha de áudio: resolve o codec ANTES do muxer (o track é declarado
    // na construção). AAC com fallback Opus — padrão validado no hq.js.
    let audioCfg = null;
    if (this._tap && typeof AudioEncoder !== 'undefined') {
      const rate = this._tap.ctx.sampleRate;
      for (const codec of ['mp4a.40.2', 'opus']) {
        try {
          const s = await AudioEncoder.isConfigSupported({ codec, sampleRate: rate, numberOfChannels: 2, bitrate: 128000 });
          if (s && s.supported) { audioCfg = { codec, rate, channels: 2 }; break; }
        } catch (e) { /* tenta o próximo */ }
      }
    }

    const target = new Mp4Muxer.ArrayBufferTarget();
    this.muxer = new Mp4Muxer.Muxer({
      target,
      video: { codec: 'avc', width: this.encW, height: this.encH },
      ...(audioCfg ? { audio: {
        codec: audioCfg.codec === 'opus' ? 'opus' : 'aac',
        sampleRate: audioCfg.rate,
        numberOfChannels: audioCfg.channels,
      } } : {}),
      fastStart: 'in-memory',
      firstTimestampBehavior: 'offset',
    });

    if (audioCfg) {
      this.audioEncoder = new AudioEncoder({
        output: (chunk, meta) => { if (this.muxer) this.muxer.addAudioChunk(chunk, meta); },
        error: (e) => console.error('AudioEncoder error:', e),
      });
      this.audioEncoder.configure({ codec: audioCfg.codec, sampleRate: audioCfg.rate, numberOfChannels: audioCfg.channels, bitrate: 128000 });
      this._audioCfg = audioCfg;
      this.hasAudio = true;
    }

    this.encoder = new VideoEncoder({
      output: (chunk, meta) => {
        // chunks do warmup nunca entram no arquivo — mas a META do primeiro
        // carrega o decoderConfig (SPS/PPS); sem repassá-la ao primeiro
        // chunk real o MP4 sai indecodável
        if (this._warmupPending > 0) {
          this._warmupPending--;
          if (meta && meta.decoderConfig) this._warmupMeta = meta;
          return;
        }
        if (this._warmupMeta) {
          if (!(meta && meta.decoderConfig)) meta = this._warmupMeta;
          this._warmupMeta = null;
        }
        this.muxer.addVideoChunk(chunk, meta);
      },
      error: (e) => console.error('VideoEncoder error:', e),
    });

    this.encoder.configure(config);

    // WARM-UP: configure() retorna na hora, mas a sessão real do codec
    // (hardware) só nasce no primeiro encode — que pode levar SEGUNDOS.
    // Sem isso, os primeiros frames enfileiram, o backpressure derruba a
    // captura e o take abre com um buraco de 2-3s (timestamps são
    // real-time). Encodamos 1 frame dummy e esperamos o flush() — ele só
    // resolve com o pipeline de verdade pronto; o chunk é descartado.
    this._warmupPending = 1;
    try {
      if (!this._recCanvas) this._createStreamCanvas();
      this._paintRecCanvas();
      const dummy = new VideoFrame(this._recCanvas, { timestamp: 0 });
      this.encoder.encode(dummy, { keyFrame: true });
      dummy.close();
      await this.encoder.flush();
    } catch (err) {
      console.warn('TipoRecorder warmup skipped:', err);
    }
    this._warmupPending = 0;
    this._lastKeyTsUs = -1;       // 1º frame REAL volta a ser keyframe
    this._firstTimestampUs = null; // relógio do take começa limpo

    this.frameCount = 0;
    this.lastCaptureTime = -1;
    return true;
  }

  /** PCM ao vivo → AudioData f32-planar → AudioEncoder. ScriptProcessor por
   *  compatibilidade universal; sink com gain 0 pra não duplicar o som. */
  _startAudioCapture() {
    const { ctx } = this._tap;
    const rate = this._audioCfg.rate;
    this._audioSamples = 0;
    const sp = ctx.createScriptProcessor(4096, 2, 2);
    const sink = ctx.createGain();
    sink.gain.value = 0;
    this._tap.node.connect(sp);
    sp.connect(sink);
    sink.connect(ctx.destination);
    this._audioSp = sp;
    this._audioSink = sink;
    sp.onaudioprocess = (e) => {
      if (!this.isRecording || !this.audioEncoder || this.audioEncoder.state !== 'configured') return;
      const n = e.inputBuffer.length;
      const data = new Float32Array(n * 2);
      data.set(e.inputBuffer.getChannelData(0), 0);
      data.set(e.inputBuffer.getChannelData(e.inputBuffer.numberOfChannels > 1 ? 1 : 0), n);
      try {
        const ad = new AudioData({
          format: 'f32-planar',
          sampleRate: rate,
          numberOfFrames: n,
          numberOfChannels: 2,
          timestamp: Math.round(this._audioSamples / rate * 1e6),
          data,
        });
        this.audioEncoder.encode(ad);
        ad.close();
        this._audioSamples += n;
      } catch (err) { /* nunca derruba o áudio da página */ }
    };
  }

  _stopAudioCapture() {
    if (this._audioSp) {
      try { this._audioSp.onaudioprocess = null; this._audioSp.disconnect(); } catch (e) {}
      try { this._tap && this._tap.node.disconnect(this._audioSp); } catch (e) {}
    }
    if (this._audioSink) { try { this._audioSink.disconnect(); } catch (e) {} }
    this._audioSp = null;
    this._audioSink = null;
  }

  _startStream(bitrate) {
    // Same 1080p-class cap as the MP4 path (see _startMP4).
    const w = this.canvas.width;
    const h = this.canvas.height;
    const long = Math.max(w, h), short = Math.min(w, h);
    const fit = Math.min(1, 1920 / long, 1080 / short);
    this.encW = Math.round(w * fit); this.encW += this.encW % 2;
    this.encH = Math.round(h * fit); this.encH += this.encH % 2;
    // Always record through a fixed-size 2D copy canvas: keeps even dimensions
    // and survives mid-recording source canvas resizes (param changes).
    const sourceCanvas = this._createStreamCanvas();
    this._paintRecCanvas();

    let stream = sourceCanvas.captureStream(this.fps);
    this._streamTrack = stream.getVideoTracks()[0] || null;
    if (!this._streamTrack || typeof this._streamTrack.requestFrame !== 'function') {
      stream.getTracks().forEach(track => track.stop());
      stream = sourceCanvas.captureStream(this.fps);
      this._streamTrack = stream.getVideoTracks()[0] || null;
    }

    // trilha de áudio no caminho MediaRecorder: destination node do tap
    if (this._tap) {
      try {
        this._streamAudioDest = this._tap.ctx.createMediaStreamDestination();
        this._tap.node.connect(this._streamAudioDest);
        this._streamAudioDest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
        this.hasAudio = true;
      } catch (e) { this._streamAudioDest = null; }
    }

    // Try MP4 first (Chrome 130+), then WebM
    let mimeType, ext;
    if (MediaRecorder.isTypeSupported('video/mp4; codecs=avc1')) {
      mimeType = 'video/mp4; codecs=avc1';
      ext = 'mp4';
    } else if (MediaRecorder.isTypeSupported('video/mp4')) {
      mimeType = 'video/mp4';
      ext = 'mp4';
    } else if (MediaRecorder.isTypeSupported('video/webm; codecs=vp9')) {
      mimeType = 'video/webm; codecs=vp9';
      ext = 'webm';
    } else {
      mimeType = 'video/webm';
      ext = 'webm';
    }

    this._streamFormat = ext;
    this._mediaRecorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: bitrate,
    });
    this._chunks = [];
    this._mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this._chunks.push(e.data);
    };
    this._mediaRecorder.start(100);
    this.frameCount = 0;
    this._lastStreamFrameTime = -1;
    this._requestStreamFrame(true);
    this._streamFrameTimer = setInterval(() => {
      this._requestStreamFrame();
    }, 1000 / this.fps);
  }

  _resetSession() {
    this.frameCount = 0;
    this.lastCaptureTime = -1;
    this._warmupPending = 0;
    this._warmupMeta = null;
    this._stopAudioCapture();
    if (this.audioEncoder) { try { this.audioEncoder.close(); } catch (e) {} }
    this.audioEncoder = null;
    this._audioCfg = null;
    this._audioSamples = 0;
    if (this._streamAudioDest) { try { this._tap && this._tap.node.disconnect(this._streamAudioDest); } catch (e) {} }
    this._streamAudioDest = null;
    this.encW = 0;
    this.encH = 0;
    this._firstTimestampUs = null;
    this._lastKeyTsUs = -1;
    this._chunks = null;
    this._streamFormat = null;
    this._streamTrack = null;
    this._lastStreamFrameTime = -1;
    if (this._streamFrameTimer) clearInterval(this._streamFrameTimer);
    this._streamFrameTimer = null;
    if (this._mp4FrameTimer) clearInterval(this._mp4FrameTimer);
    this._mp4FrameTimer = null;
    this._recCanvas = null;
    this._recCtx = null;
  }

  _requestStreamFrame(force = false) {
    if (!this._streamTrack && !this._recCanvas) return false;
    if (!force && document.hidden && this.frameCount > 0) return false;
    const now = performance.now();
    const minDelta = 1000 / this.fps * 0.75;
    if (!force && this._lastStreamFrameTime >= 0 && now - this._lastStreamFrameTime < minDelta) return false;
    this._lastStreamFrameTime = now;
    this._paintRecCanvas();
    if (this._streamTrack && typeof this._streamTrack.requestFrame === 'function') {
      this._streamTrack.requestFrame();
    }
    this.frameCount++;
    return true;
  }

  _createStreamCanvas() {
    this._recCanvas = document.createElement('canvas');
    this._recCanvas.width = this.encW;
    this._recCanvas.height = this.encH;
    this._recCtx = this._recCanvas.getContext('2d');
    return this._recCanvas;
  }

  // Paint the source canvas into the fixed-size record canvas, aspect-fit
  // (letterboxed). Tolerates the source canvas being resized mid-recording
  // when the user changes tool parameters.
  _paintRecCanvas() {
    if (!this._recCtx) return;
    const cw = this.canvas.width, ch = this.canvas.height;
    if (!cw || !ch) return;
    this._recCtx.fillStyle = '#000';
    this._recCtx.fillRect(0, 0, this.encW, this.encH);
    const s = Math.min(this.encW / cw, this.encH / ch);
    const dw = cw * s, dh = ch * s;
    this._recCtx.drawImage(this.canvas, (this.encW - dw) / 2, (this.encH - dh) / 2, dw, dh);
  }

  // Call this every frame from your render loop
  captureFrame() {
    if (!this.isRecording) return;

    // Stream mode: MediaRecorder captures automatically
    if (this._mediaRecorder) {
      if (this._recCanvas || (this._streamTrack && typeof this._streamTrack.requestFrame === 'function')) {
        this._requestStreamFrame();
      } else {
        this.frameCount++;
      }
      return;
    }

    // MP4 direct mode: encode frame manually
    if (!this.encoder) return;
    // Skip frozen frames while the tab is hidden (timestamps are real-time,
    // so the last visible frame simply holds — smaller file, less CPU).
    if (document.hidden && this.frameCount > 0) return;
    if (this.encoder.encodeQueueSize > 10) return;

    const now = performance.now();
    const elapsed = now - this.startTime;
    // Throttle relative to target fps (not a hard-coded 60fps ceiling)
    const minDelta = (1000 / this.fps) * 0.75;
    if (this.lastCaptureTime >= 0 && (elapsed - this.lastCaptureTime) < minDelta) return;

    this.lastCaptureTime = elapsed;
    const rawTimestampUs = Math.round(elapsed * 1000);
    if (this._firstTimestampUs === null) this._firstTimestampUs = rawTimestampUs;
    const timestampUs = rawTimestampUs - this._firstTimestampUs;

    // Lazy-create record canvas
    if (!this._recCanvas) this._createStreamCanvas();
    this._paintRecCanvas();

    // Never let an encoder exception propagate into the tool's draw loop
    try {
      const frame = new VideoFrame(this._recCanvas, { timestamp: timestampUs });
      // Time-based keyframes (every 1s of real time) → reliable seeking/playback
      const keyFrame = this._lastKeyTsUs < 0 || (timestampUs - this._lastKeyTsUs) >= 1000000;
      if (keyFrame) this._lastKeyTsUs = timestampUs;
      this.encoder.encode(frame, { keyFrame });
      frame.close();
      this.frameCount++;
    } catch (err) {
      console.error('TipoRecorder encode failed:', err);
    }
  }

  async stop() {
    if (!this.isRecording || this._stopping) return;
    this._stopping = true;
    try {
      if (this.encoder && this.frameCount === 0) this.captureFrame();
      this.isRecording = false;
      this._stopTimer();
      if (this._mp4FrameTimer) clearInterval(this._mp4FrameTimer);
      this._mp4FrameTimer = null;

      if (this.encoder) {
        return await this._stopMP4();
      } else if (this._mediaRecorder) {
        return await this._stopStream();
      }
    } finally {
      this._stopping = false;
    }
  }

  async _stopMP4() {
    if (this.frameCount === 0) this.captureFrame();
    // fecha o áudio ANTES do finalize — flush entrega os últimos chunks AAC
    this._stopAudioCapture();
    if (this.audioEncoder) {
      try { await this.audioEncoder.flush(); this.audioEncoder.close(); } catch (e) {}
      this.audioEncoder = null;
    }
    this.onProgress({ phase: 'flushing', percent: 30, frames: this.frameCount });

    const flushStart = performance.now();
    const progTimer = setInterval(() => {
      const elapsed = ((performance.now() - flushStart) / 1000).toFixed(1);
      this.onProgress({
        phase: 'flushing',
        percent: Math.min(30 + Math.round((performance.now() - flushStart) / 100), 85),
        frames: this.frameCount,
        elapsed,
      });
    }, 200);

    await Promise.race([
      this.encoder.flush(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('MP4 encoder flush timed out')), 15000))
    ]);
    clearInterval(progTimer);
    this.onProgress({ phase: 'muxing', percent: 90 });

    this.encoder.close();
    this.encoder = null;

    this.muxer.finalize();
    const buffer = this.muxer.target.buffer;
    this.muxer = null;

    const blob = new Blob([buffer], { type: 'video/mp4' });
    const duration = (this.frameCount / this.fps).toFixed(1);
    const sizeMB = (blob.size / (1024 * 1024)).toFixed(1);

    this.onProgress({ phase: 'done', percent: 100, duration, sizeMB });
    this.onStatusChange('idle');

    return { blob, filename: `tipo-${TipoRecorder._pageName()}.mp4`, duration, sizeMB };
  }

  async _stopStream() {
    if (this._streamFrameTimer) clearInterval(this._streamFrameTimer);
    this._streamFrameTimer = null;
    this._requestStreamFrame(true);
    this.onProgress({ phase: 'muxing', percent: 80, frames: this.frameCount });
    await new Promise(resolve => {
      this._mediaRecorder.onstop = resolve;
      if (this._mediaRecorder.state === 'recording') this._mediaRecorder.requestData();
      this._mediaRecorder.stop();
    });

    const ext = this._streamFormat || 'webm';
    const mimeType = ext === 'mp4' ? 'video/mp4' : 'video/webm';
    const blob = new Blob(this._chunks, { type: mimeType });
    const sizeMB = (blob.size / (1024 * 1024)).toFixed(1);
    const duration = (this.frameCount / this.fps).toFixed(1);

    this._mediaRecorder = null;
    this._chunks = null;
    if (this._streamTrack) this._streamTrack.stop();
    this._streamTrack = null;
    this.onProgress({ phase: 'done', percent: 100, duration, sizeMB });
    this.onStatusChange('idle');

    return { blob, filename: `tipo-${TipoRecorder._pageName()}.${ext}`, duration, sizeMB };
  }

  _startTimer() {
    if (!this.timerEl) return;
    this.timerEl.style.display = 'block';
    const start = Date.now();
    this.timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const min = String(Math.floor(elapsed / 60)).padStart(2, '0');
      const sec = String(elapsed % 60).padStart(2, '0');
      this.timerEl.textContent = `● REC  ${min}:${sec}`;
    }, 250);
  }

  _stopTimer() {
    clearInterval(this.timerInterval);
    if (this.timerEl) this.timerEl.style.display = 'none';
  }

  static _pageName() {
    return (location.pathname.split('/').pop() || 'export').replace('.html', '') || 'export';
  }

  static download(blob, filename) {
    if (typeof TipoUI !== 'undefined' && TipoUI.stampName) filename = TipoUI.stampName(filename);
    const link = document.createElement('a');
    link.download = filename;
    link.href = URL.createObjectURL(blob);
    link.click();
    // Generous delay: revoking too early can truncate large downloads on slow disks
    setTimeout(() => URL.revokeObjectURL(link.href), 60000);
  }
}

window.TipoRecorder = TipoRecorder;
