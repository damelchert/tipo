/* ============================================================
   TIPÓ — Shared MP4 Recorder
   Reusable across all tools. Uses WebCodecs + mp4-muxer.
   ============================================================ */

class TipoRecorder {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.fps = options.fps || 30;
    this.onStatusChange = options.onStatusChange || (() => {});
    this.onProgress = options.onProgress || (() => {});

    this.isRecording = false;
    this.muxer = null;
    this.encoder = null;
    this.frameCount = 0;
    this.startTime = 0;
    this.lastCaptureTime = -1;
    this.encW = 0;
    this.encH = 0;
    this.recordCanvas = document.createElement('canvas');
    this.recordCtx = this.recordCanvas.getContext('2d');

    // Detect WEBGL canvas (drawImage from WEBGL needs preserveDrawingBuffer)
    this.isWebGL = !!(canvas.getContext('webgl') || canvas.getContext('webgl2')
      || canvas.dataset?.webgl);

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
    if (this.isRecording) return;

    if (this.hasMp4Support) {
      this._startMP4(bitrate);
    } else {
      this._startWebM(bitrate);
    }

    this.isRecording = true;
    this.startTime = performance.now();
    this._startTimer();
    this.onStatusChange('recording');
  }

  _startMP4(bitrate) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.encW = w + (w % 2);
    this.encH = h + (h % 2);
    this.recordCanvas.width = this.encW;
    this.recordCanvas.height = this.encH;

    // For WEBGL canvases, try to enable preserveDrawingBuffer
    try {
      const gl = this.canvas.getContext('webgl2') || this.canvas.getContext('webgl');
      if (gl) this.isWebGL = true;
    } catch(e) {}

    const target = new Mp4Muxer.ArrayBufferTarget();
    this.muxer = new Mp4Muxer.Muxer({
      target,
      video: { codec: 'avc', width: this.encW, height: this.encH },
      fastStart: 'in-memory',
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

  _startWebM(bitrate) {
    const stream = this.canvas.captureStream(this.fps);
    const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9')
      ? 'video/webm; codecs=vp9' : 'video/webm';
    this._mediaRecorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: bitrate });
    this._chunks = [];
    this._mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) this._chunks.push(e.data); };
    this._mediaRecorder.start(100);
    this.frameCount = 0;
  }

  // Call this every frame from your render loop
  captureFrame() {
    if (!this.isRecording || !this.encoder) return;
    if (this.encoder.encodeQueueSize > 10) return;

    const now = performance.now();
    const elapsed = now - this.startTime;
    if (this.lastCaptureTime >= 0 && (elapsed - this.lastCaptureTime) < 16) return;

    this.lastCaptureTime = elapsed;
    const timestampUs = Math.round(elapsed * 1000);

    this.recordCtx.fillStyle = '#000';
    this.recordCtx.fillRect(0, 0, this.encW, this.encH);
    this.recordCtx.drawImage(this.canvas, 0, 0, this.encW, this.encH);

    const frame = new VideoFrame(this.recordCanvas, { timestamp: timestampUs });
    const keyFrame = this.frameCount % 60 === 0;
    this.encoder.encode(frame, { keyFrame });
    frame.close();
    this.frameCount++;
  }

  async stop() {
    if (!this.isRecording) return;
    this.isRecording = false;
    this._stopTimer();

    if (this.encoder) {
      return this._stopMP4();
    } else if (this._mediaRecorder) {
      return this._stopWebM();
    }
  }

  async _stopMP4() {
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

    await this.encoder.flush();
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

  async _stopWebM() {
    await new Promise(resolve => {
      this._mediaRecorder.onstop = resolve;
      this._mediaRecorder.stop();
    });

    const blob = new Blob(this._chunks, { type: 'video/webm' });
    const sizeMB = (blob.size / (1024 * 1024)).toFixed(1);
    this.onStatusChange('idle');

    return { blob, filename: 'tipo-export.webm', sizeMB };
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

  // Helper: trigger download
  static download(blob, filename) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = URL.createObjectURL(blob);
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 5000);
  }
}

// Export for use in pages
window.TipoRecorder = TipoRecorder;
