/* ============================================================
   TIPÓ — Shared UI Helpers
   Reusable across all kinetic type modes.
   ============================================================ */

const TipoUI = {
  recorder: null,
  modeName: '',

  // Value formatters: { sliderId: { div: 10, decimals: 1 } }
  // Set per page before calling init()
  formatters: {},

  /**
   * Initialize shared UI for a kinetic type page.
   * @param {Object} opts
   * @param {string} opts.mode - Mode name for export filenames (e.g. 'cylinder')
   * @param {Object} [opts.formatters] - Slider value formatters { id: { div, decimals } }
   * @param {HTMLCanvasElement} [opts.canvas] - Canvas element (auto-detected if omitted)
   */
  init(opts = {}) {
    this.modeName = opts.mode || 'tipo';
    this.formatters = opts.formatters || {};

    // Setup recorder
    const cnv = opts.canvas || document.querySelector('#canvasContainer canvas');
    if (cnv) {
      this.recorder = new TipoRecorder(cnv);
      this.recorder.setTimerElement(document.getElementById('recTimer'));
      this.recorder.onProgress = (p) => {
        const bar = document.getElementById('progressBar');
        const info = document.getElementById('progressInfo');
        if (bar) bar.style.width = p.percent + '%';
        if (info) {
          info.textContent =
            p.phase === 'done' ? `Done! ${p.duration}s, ${p.sizeMB} MB` :
            p.phase === 'muxing' ? 'Muxing MP4...' :
            `Flushing ${p.frames} frames... ${p.elapsed || ''}s`;
        }
      };
    }

    // Bind all sliders
    this.bindSliders();
  },

  /** Format a slider value based on registered formatters */
  formatValue(id, raw) {
    const fmt = this.formatters[id];
    if (fmt) {
      return (raw / fmt.div).toFixed(fmt.decimals !== undefined ? fmt.decimals : 1);
    }
    return Number(raw);
  },

  /** Bind all range inputs to update their value display */
  bindSliders() {
    const self = this;
    document.querySelectorAll('input[type="range"]').forEach(el => {
      const valEl = document.getElementById(el.id + 'Val');
      if (valEl) {
        el.addEventListener('input', () => {
          valEl.textContent = self.formatValue(el.id, el.value);
        });
      }
    });
  },

  /** Get numeric value of a slider */
  val(id) {
    return Number(document.getElementById(id).value);
  },

  /** Get checkbox state */
  chk(id) {
    return document.getElementById(id).checked;
  },

  /** Get color input value */
  col(id) {
    return document.getElementById(id).value;
  },

  /** Set slider/checkbox value and update display */
  setVal(id, v) {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.type === 'checkbox') { el.checked = v; return; }
    el.value = v;
    const valEl = document.getElementById(id + 'Val');
    if (valEl) {
      valEl.textContent = this.formatValue(id, v);
    }
  },

  /** Set color input value */
  setCol(id, v) {
    const el = document.getElementById(id);
    if (el) el.value = v;
  },

  /** Swap two color inputs */
  swapColors(id1, id2) {
    const a = document.getElementById(id1);
    const b = document.getElementById(id2);
    if (a && b) {
      const tmp = a.value;
      a.value = b.value;
      b.value = tmp;
    }
  },

  /** Apply a preset and highlight the active chip */
  applyPreset(name, presets) {
    if (presets[name]) presets[name]();
    document.querySelectorAll('.preset-chip').forEach(el => el.classList.remove('active'));
    if (event && event.target) event.target.classList.add('active');
  },

  /** Save canvas as PNG */
  savePNG() {
    saveCanvas('tipo-' + this.modeName, 'png');
    this.showToast('PNG saved');
  },

  /** Toggle MP4 recording */
  async toggleRec() {
    if (!this.recorder) return;
    const btn = document.getElementById('recBtn');
    if (!this.recorder.isRecording) {
      await this.recorder.start(8000000);
      btn.textContent = 'Stop Recording';
      btn.style.borderColor = 'var(--red)';
    } else {
      const prog = document.getElementById('exportProgress');
      if (prog) prog.classList.add('open');
      const result = await this.recorder.stop();
      TipoRecorder.download(result.blob, result.filename);
      this.showToast(`MP4 exported (${result.sizeMB} MB)`);
      setTimeout(() => { if (prog) prog.classList.remove('open'); }, 2000);
      btn.textContent = 'Record MP4';
      btn.style.borderColor = '';
    }
  },

  /** Show a brief toast message */
  showToast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 2500);
  },

  /** Capture frame for recording (call in draw loop) */
  captureFrame() {
    if (this.recorder) this.recorder.captureFrame();
  }
};
