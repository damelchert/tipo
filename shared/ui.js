/* ============================================================
   TIPÓ — Shared Easing Library
   Professional easing curves for all kinetic type modes.
   Usage: TipoEase.inOut.cubic(t), TipoEase.out.bounce(t), etc.
   ============================================================ */

const TipoEase = {
  // ---- In (acceleration) ----
  in: {
    sine(t)    { return 1 - Math.cos(t * Math.PI / 2); },
    quad(t)    { return t * t; },
    cubic(t)   { return t * t * t; },
    quart(t)   { return t * t * t * t; },
    quint(t)   { return t * t * t * t * t; },
    expo(t)    { return t === 0 ? 0 : Math.pow(2, 10 * t - 10); },
    circ(t)    { return 1 - Math.sqrt(1 - t * t); },
    back(t)    { const s = 1.70158; return t * t * ((s + 1) * t - s); },
    elastic(t) { const c = (2 * Math.PI) / 3; return t === 0 ? 0 : t === 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((10 * t - 10.75) * c); },
    bounce(t)  { return 1 - TipoEase.out.bounce(1 - t); },
  },

  // ---- Out (deceleration) ----
  out: {
    sine(t)    { return Math.sin(t * Math.PI / 2); },
    quad(t)    { return 1 - (1 - t) * (1 - t); },
    cubic(t)   { return 1 - Math.pow(1 - t, 3); },
    quart(t)   { return 1 - Math.pow(1 - t, 4); },
    quint(t)   { return 1 - Math.pow(1 - t, 5); },
    expo(t)    { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); },
    circ(t)    { return Math.sqrt(1 - Math.pow(t - 1, 2)); },
    back(t)    { const s = 1.70158; const t1 = t - 1; return 1 + t1 * t1 * ((s + 1) * t1 + s); },
    elastic(t) { const c = (2 * Math.PI) / 3; return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((10 * t - 0.75) * c) + 1; },
    bounce(t)  { const n = 7.5625, d = 2.75; if (t < 1/d) return n*t*t; if (t < 2/d) return n*(t -= 1.5/d)*t + 0.75; if (t < 2.5/d) return n*(t -= 2.25/d)*t + 0.9375; return n*(t -= 2.625/d)*t + 0.984375; },
  },

  // ---- InOut (acceleration + deceleration) ----
  inOut: {
    sine(t)    { return -(Math.cos(Math.PI * t) - 1) / 2; },
    quad(t)    { return t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2) / 2; },
    cubic(t)   { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2; },
    quart(t)   { return t < 0.5 ? 8*t*t*t*t : 1 - Math.pow(-2*t + 2, 4) / 2; },
    quint(t)   { return t < 0.5 ? 16*t*t*t*t*t : 1 - Math.pow(-2*t + 2, 5) / 2; },
    expo(t)    { if (t === 0 || t === 1) return t; return t < 0.5 ? Math.pow(2, 20*t - 10) / 2 : (2 - Math.pow(2, -20*t + 10)) / 2; },
    circ(t)    { return t < 0.5 ? (1 - Math.sqrt(1 - Math.pow(2*t, 2))) / 2 : (Math.sqrt(1 - Math.pow(-2*t + 2, 2)) + 1) / 2; },
    back(t)    { const s = 1.70158 * 1.525; return t < 0.5 ? (Math.pow(2*t, 2) * ((s+1)*2*t - s)) / 2 : (Math.pow(2*t-2, 2) * ((s+1)*(2*t-2) + s) + 2) / 2; },
    elastic(t) { const c = (2 * Math.PI) / 4.5; if (t === 0 || t === 1) return t; return t < 0.5 ? -(Math.pow(2, 20*t - 10) * Math.sin((20*t - 11.125) * c)) / 2 : Math.pow(2, -20*t + 10) * Math.sin((20*t - 11.125) * c) / 2 + 1; },
    bounce(t)  { return t < 0.5 ? (1 - TipoEase.out.bounce(1 - 2*t)) / 2 : (1 + TipoEase.out.bounce(2*t - 1)) / 2; },
  },

  // ---- Named lookup (for slider-driven selection) ----
  _names: ['sine','quad','cubic','quart','quint','expo','circ','back','bounce','elastic'],

  /** Get easing function by index and direction.
   * @param {number} idx - Index into _names array
   * @param {'in'|'out'|'inOut'} dir - Direction (default 'inOut')
   * @returns {function} Easing function (t) => t
   */
  byIndex(idx, dir = 'inOut') {
    const name = this._names[Math.min(idx, this._names.length - 1)] || 'cubic';
    return this[dir][name];
  },

  /** Get easing function by name and direction.
   * @param {string} name - Easing name (e.g. 'cubic', 'elastic')
   * @param {'in'|'out'|'inOut'} dir - Direction (default 'inOut')
   * @returns {function} Easing function (t) => t
   */
  byName(name, dir = 'inOut') {
    return this[dir][name] || this[dir].cubic;
  }
};


/* ============================================================
   TIPÓ — Mouse Interaction System
   Opt-in mouse/touch reactivity for kinetic type modes.
   Usage: TipoMouse.init(canvas), then use TipoMouse.nx/ny in draw().
   ============================================================ */

const TipoMouse = {
  // Normalized mouse position (-1 to 1, center = 0)
  nx: 0, ny: 0,
  // Raw pixel position
  px: 0, py: 0,
  // Smoothed (lerped) normalized position
  sx: 0, sy: 0,
  // Distance from center (0 to 1)
  dist: 0,
  // Whether mouse is over the canvas
  active: false,
  // Smoothing factor (lower = smoother)
  smoothing: 0.08,
  _canvas: null,
  _enabled: false,

  init(canvas) {
    this._canvas = canvas;
    this._enabled = true;

    const el = canvas.elt || canvas;
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      this.px = e.clientX - r.left;
      this.py = e.clientY - r.top;
      this.nx = (this.px / r.width) * 2 - 1;
      this.ny = (this.py / r.height) * 2 - 1;
      this.active = true;
    });
    el.addEventListener('mouseleave', () => { this.active = false; });
    el.addEventListener('touchmove', (e) => {
      const r = el.getBoundingClientRect();
      const t = e.touches[0];
      this.px = t.clientX - r.left;
      this.py = t.clientY - r.top;
      this.nx = (this.px / r.width) * 2 - 1;
      this.ny = (this.py / r.height) * 2 - 1;
      this.active = true;
    }, { passive: true });
    el.addEventListener('touchend', () => { this.active = false; });
  },

  /** Call in draw() to update smoothed values */
  update() {
    if (!this._enabled) return;
    const targetX = this.active ? this.nx : 0;
    const targetY = this.active ? this.ny : 0;
    this.sx += (targetX - this.sx) * this.smoothing;
    this.sy += (targetY - this.sy) * this.smoothing;
    this.dist = Math.sqrt(this.sx * this.sx + this.sy * this.sy);
  }
};


/* ============================================================
   TIPÓ — Organic Noise System
   Perlin noise jitter for natural movement in all modes.
   Usage: TipoNoise.jitter(seed, scale) returns value in [-1, 1]
   ============================================================ */

const TipoNoise = {
  _time: 0,
  speed: 0.02,

  /** Update noise time — call once per frame */
  update() { this._time += this.speed; },

  /** Get noise-based jitter for a given seed.
   * @param {number} seed - Unique seed per element (e.g. character index)
   * @param {number} scale - Amplitude multiplier (default 1)
   * @returns {number} Value in [-scale, scale]
   */
  jitter(seed, scale = 1) {
    // Uses a simple sine-based noise approximation (works without p5.js noise)
    const n = Math.sin(seed * 127.1 + this._time * 3.7) * 0.5 +
              Math.sin(seed * 269.5 + this._time * 5.3) * 0.3 +
              Math.sin(seed * 419.2 + this._time * 7.1) * 0.2;
    return n * scale;
  },

  /** Get 2D noise jitter (x, y offsets).
   * @param {number} seed - Unique seed per element
   * @param {number} scale - Amplitude multiplier
   * @returns {{ x: number, y: number }}
   */
  jitter2D(seed, scale = 1) {
    return {
      x: this.jitter(seed, scale),
      y: this.jitter(seed + 1000, scale)
    };
  }
};


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

    // Setup theme toggle
    this.initTheme();
  },

  /** Initialize theme toggle button and restore saved preference */
  initTheme() {
    // Restore saved theme
    const saved = localStorage.getItem('tipo-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);

    // Create toggle button if not already present
    if (!document.querySelector('.tipo-theme-toggle')) {
      const btn = document.createElement('button');
      btn.className = 'tipo-theme-toggle';
      btn.title = 'Toggle light/dark theme';
      btn.textContent = saved === 'dark' ? '\u263C' : '\u263E';
      btn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('tipo-theme', next);
        btn.textContent = next === 'dark' ? '\u263C' : '\u263E';
      });
      document.body.appendChild(btn);
    }
  },

  /** Format a slider value based on registered formatters.
   * Supports: { div, decimals } objects OR functions (raw) => display */
  formatValue(id, raw) {
    const fmt = this.formatters[id];
    if (fmt) {
      if (typeof fmt === 'function') return fmt(raw);
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

  /** Apply a preset with smooth slider morphing.
   * Captures current slider state, applies preset instantly (to get target values),
   * then animates from old → new over 300ms. */
  _morphAnim: null,

  applyPreset(name, presets) {
    if (!presets[name]) return;

    // Capture current state of all range inputs and color inputs
    const sliders = document.querySelectorAll('input[type="range"]');
    const colors = document.querySelectorAll('input[type="color"]');
    const oldState = {};
    sliders.forEach(el => { oldState[el.id] = Number(el.value); });
    const oldColors = {};
    colors.forEach(el => { oldColors[el.id] = el.value; });

    // Apply preset to get target values
    presets[name]();

    // Capture target state
    const newState = {};
    sliders.forEach(el => { newState[el.id] = Number(el.value); });
    const newColors = {};
    colors.forEach(el => { newColors[el.id] = el.value; });

    // Check if anything actually changed
    let changed = false;
    for (const id in newState) {
      if (oldState[id] !== newState[id]) { changed = true; break; }
    }
    if (!changed) {
      for (const id in newColors) {
        if (oldColors[id] !== newColors[id]) { changed = true; break; }
      }
    }

    // Highlight active chip
    document.querySelectorAll('.preset-chip').forEach(el => el.classList.remove('active'));
    if (event && event.target) event.target.classList.add('active');

    if (!changed) return;

    // Cancel any running morph
    if (this._morphAnim) cancelAnimationFrame(this._morphAnim);

    // Animate: restore old values and morph to new
    const duration = 300;
    const start = performance.now();
    const self = this;

    // Restore old values immediately (we'll animate towards new)
    sliders.forEach(el => {
      if (oldState[el.id] !== undefined) el.value = oldState[el.id];
    });
    colors.forEach(el => {
      if (oldColors[el.id] !== undefined) el.value = oldColors[el.id];
    });

    function animate(now) {
      const t = Math.min((now - start) / duration, 1);
      const eased = TipoEase.inOut.cubic(t);

      // Morph sliders
      sliders.forEach(el => {
        const from = oldState[el.id];
        const to = newState[el.id];
        if (from !== undefined && to !== undefined && from !== to) {
          const v = Math.round(from + (to - from) * eased);
          el.value = v;
          const valEl = document.getElementById(el.id + 'Val');
          if (valEl) valEl.textContent = self.formatValue(el.id, v);
        }
      });

      // Morph colors
      colors.forEach(el => {
        const from = oldColors[el.id];
        const to = newColors[el.id];
        if (from && to && from !== to) {
          el.value = self._lerpHex(from, to, eased);
        }
      });

      if (t < 1) {
        self._morphAnim = requestAnimationFrame(animate);
      } else {
        self._morphAnim = null;
        // Ensure final values are exact
        sliders.forEach(el => { el.value = newState[el.id]; });
        colors.forEach(el => { el.value = newColors[el.id]; });
      }
    }

    this._morphAnim = requestAnimationFrame(animate);
  },

  /** Lerp between two hex colors */
  _lerpHex(a, b, t) {
    const ar = parseInt(a.slice(1,3), 16), ag = parseInt(a.slice(3,5), 16), ab = parseInt(a.slice(5,7), 16);
    const br = parseInt(b.slice(1,3), 16), bg = parseInt(b.slice(3,5), 16), bb = parseInt(b.slice(5,7), 16);
    const r = Math.round(ar + (br - ar) * t);
    const g = Math.round(ag + (bg - ag) * t);
    const bv = Math.round(ab + (bb - ab) * t);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + bv).toString(16).slice(1);
  },

  /** Save canvas as PNG */
  savePNG() {
    saveCanvas('tipo-' + this.modeName, 'png');
    this.showToast('PNG saved');
  },

  /** Toggle MP4/WebM recording */
  async toggleRec() {
    if (!this.recorder) return;
    const btn = document.getElementById('recBtn');
    if (!this.recorder.isRecording) {
      await this.recorder.start(8000000);
      btn.textContent = 'Stop Recording';
      btn.style.borderColor = 'var(--red)';
    } else {
      // Only show progress overlay for MP4 (encoder-based) — WebM stops instantly
      const isMP4 = !!this.recorder.encoder;
      const prog = document.getElementById('exportProgress');
      if (isMP4 && prog) prog.classList.add('open');
      const result = await this.recorder.stop();
      TipoRecorder.download(result.blob, result.filename);
      const ext = result.filename.endsWith('.mp4') ? 'MP4' : 'WebM';
      this.showToast(`${ext} exported (${result.sizeMB} MB)`);
      if (prog) prog.classList.remove('open');
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
