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

    // WebCodecs MP4 works for both 2D and WEBGL canvases: frames are copied
    // via drawImage into a 2D record canvas (p5 WEBGL keeps
    // preserveDrawingBuffer=true, and captureFrame() runs inside draw()).
    if (this.hasMp4Support && !this.preferStream) {
      try {
        this._startMP4(bitrate);
      } catch (err) {
        console.warn('MP4 encoder unavailable, falling back to stream recorder:', err);
        this._resetSession();
        this._startStream(bitrate);
      }
    } else {
      this._startStream(bitrate);
    }

    this.isRecording = true;
    if (this.encoder) {
      this._mp4FrameTimer = setInterval(() => {
        this.captureFrame();
      }, 1000 / this.fps);
    }
    this.startTime = performance.now();
    this._startTimer();
    this.onStatusChange('recording');
  }

  _startMP4(bitrate) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.encW = w + (w % 2);
    this.encH = h + (h % 2);
    this._lastKeyTsUs = -1;

    const target = new Mp4Muxer.ArrayBufferTarget();
    this.muxer = new Mp4Muxer.Muxer({
      target,
      video: { codec: 'avc', width: this.encW, height: this.encH },
      fastStart: 'in-memory',
      firstTimestampBehavior: 'offset',
    });

    this.encoder = new VideoEncoder({
      output: (chunk, meta) => { this.muxer.addVideoChunk(chunk, meta); },
      error: (e) => console.error('VideoEncoder error:', e),
    });

    this.encoder.configure({
      codec: 'avc1.42001f',
      width: this.encW,
      height: this.encH,
      bitrate,
      framerate: this.fps,
      latencyMode: 'realtime',
    });

    this.frameCount = 0;
    this.lastCaptureTime = -1;
  }

  _startStream(bitrate) {
    this.encW = this.canvas.width + (this.canvas.width % 2);
    this.encH = this.canvas.height + (this.canvas.height % 2);
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

    const frame = new VideoFrame(this._recCanvas, { timestamp: timestampUs });
    // Time-based keyframes (every 1s of real time) → reliable seeking/playback
    const keyFrame = this._lastKeyTsUs < 0 || (timestampUs - this._lastKeyTsUs) >= 1000000;
    if (keyFrame) this._lastKeyTsUs = timestampUs;
    this.encoder.encode(frame, { keyFrame });
    frame.close();
    this.frameCount++;
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

    return { blob, filename: 'tipo-export.mp4', duration, sizeMB };
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

    return { blob, filename: `tipo-export.${ext}`, duration, sizeMB };
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

  static download(blob, filename) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = URL.createObjectURL(blob);
    link.click();
    // Generous delay: revoking too early can truncate large downloads on slow disks
    setTimeout(() => URL.revokeObjectURL(link.href), 60000);
  }
}

window.TipoRecorder = TipoRecorder;
