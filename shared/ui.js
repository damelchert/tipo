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
  _listeners: null,

  init(canvas) {
    if (this._canvas) this.destroy(); // avoid duplicate listeners on re-init
    this._canvas = canvas;
    this._enabled = true;

    const el = canvas.elt || canvas;
    const onMouseMove = (e) => {
      const r = el.getBoundingClientRect();
      this.px = e.clientX - r.left;
      this.py = e.clientY - r.top;
      this.nx = (this.px / r.width) * 2 - 1;
      this.ny = (this.py / r.height) * 2 - 1;
      this.active = true;
    };
    const onMouseLeave = () => { this.active = false; };
    const onTouchMove = (e) => {
      const r = el.getBoundingClientRect();
      const t = e.touches[0];
      this.px = t.clientX - r.left;
      this.py = t.clientY - r.top;
      this.nx = (this.px / r.width) * 2 - 1;
      this.ny = (this.py / r.height) * 2 - 1;
      this.active = true;
    };
    const onTouchEnd = () => { this.active = false; };

    el.addEventListener('mousemove', onMouseMove);
    el.addEventListener('mouseleave', onMouseLeave);
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd);
    this._listeners = { el, onMouseMove, onMouseLeave, onTouchMove, onTouchEnd };
  },

  /** Remove listeners added by init() */
  destroy() {
    if (!this._listeners) { this._canvas = null; this._enabled = false; return; }
    const { el, onMouseMove, onMouseLeave, onTouchMove, onTouchEnd } = this._listeners;
    el.removeEventListener('mousemove', onMouseMove);
    el.removeEventListener('mouseleave', onMouseLeave);
    el.removeEventListener('touchmove', onTouchMove);
    el.removeEventListener('touchend', onTouchEnd);
    this._listeners = null;
    this._canvas = null;
    this._enabled = false;
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

    // Setup back button (returns to the right menu on the landing page)
    this.initBackButton();

    // Add editable hex fields next to every color picker
    this.initHexInputs();

    // Inject "PNG α" (transparent background) button next to the PNG button
    this.initAlphaButton();

    // Inject "~" behavior buttons (catches sliders added after DOMContentLoaded)
    if (typeof TipoBehavior !== 'undefined') TipoBehavior.scan();
  },

  /** Add a transparent-PNG export button when the tool has a flat bg color */
  initAlphaButton() {
    const pngBtn = document.querySelector('button[onclick^="savePNG"]');
    if (!pngBtn || !document.getElementById('bgColor') || document.getElementById('pngAlphaBtn')) return;
    const b = document.createElement('button');
    b.id = 'pngAlphaBtn';
    b.type = 'button';
    b.className = pngBtn.className;
    b.textContent = 'PNG α';
    b.title = 'PNG with transparent background';
    b.addEventListener('click', () => this.savePNGAlpha());
    pngBtn.insertAdjacentElement('afterend', b);
  },

  /** Add a small editable hex text field after each color input (two-way sync) */
  initHexInputs() {
    document.querySelectorAll('input[type="color"]').forEach(el => {
      if (el.dataset.hexBound) return;
      el.dataset.hexBound = '1';
      const hex = document.createElement('input');
      hex.type = 'text';
      hex.className = 'tipo-hex-input';
      hex.maxLength = 7;
      hex.spellcheck = false;
      hex.value = el.value;
      el.insertAdjacentElement('afterend', hex);
      el.addEventListener('input', () => { hex.value = el.value; });
      const commit = () => {
        let v = hex.value.trim();
        if (v && v[0] !== '#') v = '#' + v;
        if (/^#[0-9a-fA-F]{3}$/.test(v)) v = '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
        if (/^#[0-9a-fA-F]{6}$/.test(v)) {
          el.value = v.toLowerCase();
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
        hex.value = el.value; // snap back to valid value
      };
      hex.addEventListener('change', commit);
      hex.addEventListener('keydown', (e) => { if (e.key === 'Enter') { commit(); hex.blur(); } });
    });
  },

  /** Keep the hex field next to a color input in sync after programmatic changes */
  _syncHex(el) {
    const n = el.nextElementSibling;
    if (n && n.classList && n.classList.contains('tipo-hex-input')) n.value = el.value;
  },

  /** Category map: mode name → index.html hash */
  _backTargets: {
    // Visual tools
    dithering: 'visual', reticula: 'visual', glitch: 'visual',
    datamosh: 'visual', rastro: 'visual', pixelsort: 'visual',
    depth: 'visual', gradientmap: 'visual', riso: 'visual',
    overlay: 'visual', ascii: 'visual', audiotype: 'visual',
    pattern: 'visual', palette: 'visual', shaper: 'visual', mockup: 'visual',
    // Kinetic — 3D
    cylinder: '3d', field: '3d', stripes: '3d', coil: '3d',
    flag: '3d', cascade: '3d', ribbon: '3d', morisawa: '3d',
    // Kinetic — 2D
    layers: '2d', danger: '2d', string: '2d',
    // Kinetic — Composition
    badge: 'composition', clutter: 'composition', construct: 'composition',
    duplicator: 'composition',
    // Kinetic — Animation
    snap: 'animation', flash: 'animation', pow: 'animation', crash: 'animation',
    crashclock: 'animation', vessel: 'animation', shine: 'animation', boost: 'animation'
  },

  /** Create a fixed back button linking to the correct landing-page menu.
   *  Mode comes from TipoUI.init (kinetic pages) or the pathname (visual pages);
   *  an explicit hash overrides both. */
  initBackButton(hash) {
    if (document.querySelector('.tipo-back-btn')) return;
    const mode = this.modeName || location.pathname.split('/').pop().replace('.html', '');
    const target = hash || this._backTargets[mode];
    const a = document.createElement('a');
    a.className = 'tipo-back-btn';
    a.href = 'index.html' + (target ? '#' + target : '');
    a.title = 'Back to menu';
    a.textContent = '\u2190';
    document.body.appendChild(a);
  },

  /** One-call chrome for standalone visual tools (no p5/TipoUI.init):
   *  theme toggle + back button. Replaces the per-page initTheme IIFEs. */
  initChrome(hash) {
    this.initTheme();
    this.initBackButton(hash);
  },

  _visRec: null,

  /** Shared Record MP4 flow for standalone visual tools. Handles the
   *  recorder lifecycle, #recBtn state, #exportProgress overlay (if the
   *  page has one) and toasts. Returns the recorder so pages can keep
   *  their global `recorder` in sync for captureFrame() calls.
   *  opts.onStart / opts.onStop: page hooks (e.g. force the render loop). */
  async toggleVisualRec(canvas, opts = {}) {
    if (!this._visRec) {
      this._visRec = new TipoRecorder(canvas);
      this._visRec.setTimerElement(document.getElementById('recTimer'));
    }
    const rec = this._visRec;
    const btn = document.getElementById('recBtn');
    if (!rec.isRecording) {
      await rec.start(opts.bitrate || 8000000);
      if (btn) {
        btn.textContent = 'Stop Recording';
        btn.style.borderColor = 'var(--red)';
      }
      if (opts.onStart) opts.onStart();
    } else {
      const prog = document.getElementById('exportProgress');
      if (prog) prog.classList.add('open');
      if (btn) btn.disabled = true;
      try {
        const result = await rec.stop();
        TipoRecorder.download(result.blob, result.filename);
        this.showToast(`MP4 exported (${result.sizeMB} MB)`);
      } catch (e) {
        console.error(e);
        this.showToast('Export failed');
      } finally {
        if (prog) prog.classList.remove('open');
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Record MP4';
          btn.style.borderColor = '';
        }
        if (opts.onStop) opts.onStop();
      }
    }
    return rec;
  },

  /** Initialize theme toggle button and restore saved preference */
  initTheme() {
    // Restore saved theme
    const saved = localStorage.getItem('tipo-theme') || 'light';
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
        document.documentElement.classList.add('theme-anim');
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('tipo-theme', next);
        btn.textContent = next === 'dark' ? '\u263C' : '\u263E';
        setTimeout(() => document.documentElement.classList.remove('theme-anim'), 380);
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
    if (el) { el.value = v; this._syncHex(el); }
  },

  /** Swap two color inputs */
  swapColors(id1, id2) {
    const a = document.getElementById(id1);
    const b = document.getElementById(id2);
    if (a && b) {
      const tmp = a.value;
      a.value = b.value;
      b.value = tmp;
      this._syncHex(a);
      this._syncHex(b);
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
    const ev = typeof window !== 'undefined' ? window.event : null;
    if (ev && ev.target && ev.target.classList) ev.target.classList.add('active');

    if (!changed) return;

    // Behaviors pause during the morph and re-center on the preset values
    if (typeof TipoBehavior !== 'undefined') TipoBehavior.paused = true;

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
          self._syncHex(el);
        }
      });

      if (t < 1) {
        self._morphAnim = requestAnimationFrame(animate);
      } else {
        self._morphAnim = null;
        // Ensure final values are exact
        sliders.forEach(el => { el.value = newState[el.id]; });
        colors.forEach(el => { el.value = newColors[el.id]; self._syncHex(el); });
        if (typeof TipoBehavior !== 'undefined') {
          TipoBehavior.resync();
          TipoBehavior.paused = false;
        }
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

  /** Find the tool's main canvas */
  _exportCanvas() {
    return (this.recorder && this.recorder.canvas)
      || document.querySelector('#canvasContainer canvas')
      || document.querySelector('canvas');
  },

  /** Every export funnels through here. On mobile, offers the native share
   *  sheet (Web Share API) alongside download; on desktop, downloads direct. */
  _downloadBlob(blob, filename) {
    let file = null;
    try { file = new File([blob], filename, { type: blob.type || 'application/octet-stream' }); } catch (e) {}
    if (document.body.classList.contains('tipo-mobile') && file &&
        navigator.canShare && navigator.canShare({ files: [file] })) {
      this._shareBar(file, blob, filename);
    } else {
      this._forceDownload(blob, filename);
    }
  },

  _forceDownload(blob, filename) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = URL.createObjectURL(blob);
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 10000);
  },

  /** Mobile action bar: share to Instagram/WhatsApp/etc or plain download.
   *  navigator.share needs a user gesture — the bar buttons provide one. */
  _shareBar(file, blob, filename) {
    const old = document.getElementById('tipoShareBarEl');
    if (old) old.remove();
    const bar = document.createElement('div');
    bar.id = 'tipoShareBarEl';
    bar.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:68px;z-index:9000;' +
      'display:flex;gap:8px;align-items:center;background:var(--bg-1,#161616);' +
      'border:1px solid var(--border-2,#3a3a3a);border-radius:12px;padding:8px 10px;' +
      'box-shadow:0 6px 24px rgba(0,0,0,.3);font-family:var(--font-ui,monospace);';
    const mk = (label, accent) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.style.cssText = 'min-height:44px;padding:0 16px;border-radius:8px;font-size:12px;cursor:pointer;' +
        (accent
          ? 'background:var(--accent,#2A8A7A);color:#fff;border:none;font-weight:600;'
          : 'background:transparent;color:var(--text-2,#ccc);border:1px solid var(--border-2,#3a3a3a);');
      return b;
    };
    const share = mk('Salvar / Compartilhar', true);
    const down = mk('Arquivo', false);
    share.addEventListener('click', () => {
      navigator.share({ files: [file], title: 'Tipó' })
        .catch(() => this._forceDownload(blob, filename));
      bar.remove();
    });
    down.addEventListener('click', () => {
      this._forceDownload(blob, filename);
      bar.remove();
    });
    const col = document.createElement('div');
    col.style.cssText = 'display:flex;flex-direction:column;gap:5px;align-items:center;';
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:8px;';
    row.appendChild(share);
    row.appendChild(down);
    const hint = document.createElement('span');
    hint.style.cssText = 'font-size:9px;color:var(--text-5,#777);letter-spacing:.4px;';
    hint.textContent = 'Salvar = Fototeca · ou manda direto pro WhatsApp/Insta';
    col.appendChild(row);
    col.appendChild(hint);
    bar.appendChild(col);
    document.body.appendChild(bar);
    setTimeout(() => { if (bar.parentNode) bar.remove(); }, 20000);
  },

  /** Save canvas as PNG */
  savePNG() {
    const src = this._exportCanvas();
    if (!src) { this.showToast('No canvas found'); return; }
    src.toBlob(blob => {
      if (!blob) { this.showToast('PNG export failed'); return; }
      this._downloadBlob(blob, 'tipo-' + this.modeName + '.png');
      this.showToast('PNG saved');
    }, 'image/png');
  },

  /** Save canvas as PNG with transparent background (keys out the bg color) */
  savePNGAlpha() {
    const bgInput = document.getElementById('bgColor');
    const src = this._exportCanvas();
    if (!src || !bgInput) { this.showToast('Alpha PNG unavailable'); return; }
    const w = src.width, h = src.height;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(src, 0, 0);
    const img = ctx.getImageData(0, 0, w, h), d = img.data;
    const bg = bgInput.value;
    const br = parseInt(bg.slice(1, 3), 16), bgr = parseInt(bg.slice(3, 5), 16), bb = parseInt(bg.slice(5, 7), 16);
    for (let i = 0; i < d.length; i += 4) {
      const diff = Math.max(Math.abs(d[i] - br), Math.abs(d[i + 1] - bgr), Math.abs(d[i + 2] - bb));
      // diff 0–8 → transparent, 8–48 → edge ramp, >48 → opaque
      const a = (diff - 8) / 40;
      if (a <= 0) { d[i + 3] = 0; continue; }
      if (a >= 1) continue;
      // un-mix the bg contribution from antialiased edge pixels
      d[i]     = Math.min(255, Math.max(0, Math.round((d[i]     - (1 - a) * br)  / a)));
      d[i + 1] = Math.min(255, Math.max(0, Math.round((d[i + 1] - (1 - a) * bgr) / a)));
      d[i + 2] = Math.min(255, Math.max(0, Math.round((d[i + 2] - (1 - a) * bb)  / a)));
      d[i + 3] = Math.round(a * 255);
    }
    ctx.putImageData(img, 0, 0);
    c.toBlob(blob => {
      if (!blob) { this.showToast('Alpha PNG failed'); return; }
      this._downloadBlob(blob, 'tipo-' + this.modeName + '-alpha.png');
      this.showToast('Alpha PNG saved');
    }, 'image/png');
  },

  /** Toggle MP4/WebM recording */
  async toggleRec() {
    if (!this.recorder) return;
    const btn = document.getElementById('recBtn');
    if (!this.recorder.isRecording) {
      try {
        await this.recorder.start(8000000);
        btn.textContent = 'Stop Recording';
        btn.style.borderColor = 'var(--red)';
      } catch (err) {
        console.error(err);
        this.showToast('Recording failed to start');
      }
    } else {
      const prog = document.getElementById('exportProgress');
      if (prog) prog.classList.add('open');
      btn.textContent = 'Finalizing...';
      btn.disabled = true;
      try {
        const result = await this.recorder.stop();
        if (!result || !result.blob || result.blob.size === 0) throw new Error('Empty recording');
        TipoRecorder.download(result.blob, result.filename);
        const ext = result.filename.endsWith('.mp4') ? 'MP4' : 'WebM';
        this.showToast(`${ext} exported (${result.sizeMB} MB)`);
      } catch (err) {
        console.error(err);
        this.showToast('Export failed');
      } finally {
        if (prog) prog.classList.remove('open');
        btn.disabled = false;
        btn.textContent = 'Record MP4';
        btn.style.borderColor = '';
      }
    }
  },

  /** Show a brief toast message */
  showToast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.style.display = ''; // legacy pages set display:none inline via old flow
    el.classList.add('show');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => el.classList.remove('show'), 2500);
  },

  /** Capture frame for recording (call in draw loop) */
  captureFrame() {
    if (this.recorder) this.recorder.captureFrame();
  }
};


/* ============================================================
   TIPÓ — Stagger (Cavalry-style, 9.2)
   Per-element phase offset for multi-element modes (field,
   stripes, cascade, ...). Order modes: index, row, col, distance
   from center, deterministic random. Eased with TipoEase.
   Usage in a draw loop:
     const stg = TipoStagger.phase(mode, col, row, cols, rows, amount, curve);
     ... sinEng(offset + stg, ...) ...
   ============================================================ */

const TipoStagger = {
  MODES: ['off', 'index', 'row', 'col', 'center', 'random'],

  _hash(i) {
    const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  },

  /** Normalized stagger position 0..1 for an element in a cols×rows grid */
  t(mode, col, row, cols, rows) {
    switch (mode) {
      case 'index': {
        const n = cols * rows;
        return n > 1 ? (row * cols + col) / (n - 1) : 0;
      }
      case 'row': return rows > 1 ? row / (rows - 1) : 0;
      case 'col': return cols > 1 ? col / (cols - 1) : 0;
      case 'center': {
        const cx = (cols - 1) / 2, cy = (rows - 1) / 2;
        const m = Math.hypot(cx, cy) || 1;
        return Math.hypot(col - cx, row - cy) / m;
      }
      case 'random': return this._hash(row * 8191 + col + 1);
      default: return 0;
    }
  },

  /** Phase offset in radians.
   * @param {string} mode - off|index|row|col|center|random
   * @param {number} amount - 0..200 (% of one full wave cycle)
   * @param {string} curve - linear|inOut|in|out (TipoEase cubic)
   */
  phase(mode, col, row, cols, rows, amount, curve) {
    if (!mode || mode === 'off' || !amount) return 0;
    let t = this.t(mode, col, row, cols, rows);
    if (curve === 'inOut') t = TipoEase.inOut.cubic(t);
    else if (curve === 'in') t = TipoEase.in.cubic(t);
    else if (curve === 'out') t = TipoEase.out.cubic(t);
    return t * (amount / 100) * Math.PI * 2;
  },
};


/* ============================================================
   TIPÓ — Behaviors (Cavalry-style)
   Any slider can oscillate by itself: click the "~" button next
   to it, pick a behavior type (oscillate/noise/loop/ping-pong/
   random step), amount and speed. A single central rAF updates
   all animated sliders at ~30fps and dispatches 'input' so every
   tool reacts exactly as if the user were dragging.
   Auto-initialized on DOMContentLoaded for any page that loads
   this file. Sliders with the data-nobhv attribute are skipped.
   ============================================================ */

const TipoBehavior = {
  TYPES: ['sine', 'noise', 'loop', 'pingpong', 'step'],
  active: new Map(), // sliderId -> behavior state
  paused: false,
  _raf: null,
  _pop: null,
  _popFor: null,
  _seed: 0,
  _autoId: 0,
  _css: false,

  /** Self-contained styles (with var fallbacks) so behaviors work even on
   *  pages that don't load shared/style.css (e.g. dithering.html) */
  _injectCSS() {
    if (this._css) return;
    this._css = true;
    const s = document.createElement('style');
    s.textContent = `
.tipo-bhv-btn { flex:none; width:18px; height:18px; padding:0; border:1px solid var(--border-2,#3a3a3a); border-radius:4px; background:transparent; color:var(--text-5,#777); font-size:12px; line-height:1; font-family:var(--font-mono,monospace); cursor:pointer; }
.tipo-bhv-btn:hover { border-color:var(--accent,#2A8A7A); color:var(--accent,#2A8A7A); }
.tipo-bhv-btn.on { background:var(--accent,#2A8A7A); border-color:var(--accent,#2A8A7A); color:var(--bg-0,#0a0a0a); animation:tipo-bhv-pulse 1.4s ease-in-out infinite; }
@keyframes tipo-bhv-pulse { 50% { opacity:0.55; } }
.range-row.bhv-on .range-label, .range-row.bhv-on .range-value { color:var(--accent,#2A8A7A); }
#tipoBhvPop { position:fixed; z-index:10000; width:200px; background:var(--bg-1,#161616); border:1px solid var(--border-2,#3a3a3a); border-radius:6px; padding:10px 12px; box-shadow:0 6px 24px rgba(0,0,0,0.35); display:none; font-family:var(--font-ui,'IBM Plex Mono',monospace); }
#tipoBhvPop.open { display:block; }
.bhv-pop-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
.bhv-pop-head span { font-size:10px; letter-spacing:1px; text-transform:uppercase; color:var(--accent,#2A8A7A); }
#bhvPopOff { border:1px solid var(--border-2,#3a3a3a); background:transparent; color:var(--text-4,#999); font-size:9px; letter-spacing:1px; text-transform:uppercase; padding:2px 7px; border-radius:4px; cursor:pointer; font-family:inherit; }
#bhvPopOff:hover { border-color:var(--red,#CC4840); color:var(--red,#CC4840); }
.bhv-pop-row { display:flex; align-items:center; gap:8px; margin-top:6px; }
.bhv-pop-row span { font-size:9px; color:var(--text-4,#999); min-width:42px; text-transform:uppercase; letter-spacing:0.5px; }
.bhv-pop-row input[type="range"] { flex:1; min-width:0; width:auto; }
.bhv-pop-row select { flex:1; width:auto; background:var(--bg-2,#1e1e1e); color:var(--text-1,#e0e0e0); border:1px solid var(--border-2,#3a3a3a); padding:3px 4px; font-size:10px; font-family:inherit; }
`;
    document.head.appendChild(s);
  },

  /** Inject "~" buttons next to every .range-row slider (idempotent) */
  scan(root = document) {
    this._injectCSS();
    root.querySelectorAll('.range-row input[type="range"]').forEach(el => {
      if (el.dataset.bhvBound || el.dataset.nobhv !== undefined) return;
      if (!el.id) el.id = 'tipoBhvAuto' + (++this._autoId);
      el.dataset.bhvBound = '1';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tipo-bhv-btn';
      btn.textContent = '~';
      btn.title = 'Animate this slider (behavior)';
      btn.addEventListener('click', e => {
        e.stopPropagation();
        e.preventDefault();
        this._onButton(el, btn);
      });
      el.closest('.range-row').appendChild(btn);
      // a real user drag re-centers the behavior on the new value
      el.addEventListener('input', e => {
        const b = this.active.get(el.id);
        if (b && e.isTrusted) b.center = Number(el.value);
      });
    });
  },

  /** Start animating a slider. opts: { type, amp (1-100 % of range), speed (1-100) } */
  start(id, opts = {}) {
    const el = document.getElementById(id);
    if (!el) return null;
    const min = Number(el.min || 0), max = Number(el.max || 100);
    const step = Number(el.step) || 1;
    const b = {
      el, id, min, max, step,
      range: max - min,
      type: opts.type || 'sine',
      amp: opts.amp !== undefined ? Number(opts.amp) : 35,
      speed: opts.speed !== undefined ? Number(opts.speed) : 50,
      center: Number(el.value),
      t: 0,
      seed: (++this._seed) * 17.13,
      stepTimer: 0,
      stepTarget: Number(el.value),
      lastOut: null,
    };
    this.active.set(id, b);
    this._mark(el, true);
    this._ensureLoop();
    return b;
  },

  /** Stop a behavior and restore the slider to its center value */
  stop(id) {
    const b = this.active.get(id);
    if (!b) return;
    this.active.delete(id);
    this._mark(b.el, false);
    b.el.value = b.center;
    b.el.dispatchEvent(new Event('input', { bubbles: true }));
    if (this._popFor === id) this.closePopover();
  },

  stopAll() { [...this.active.keys()].forEach(id => this.stop(id)); },

  /** Re-capture centers from current slider values (after presets) */
  resync() { this.active.forEach(b => { b.center = Number(b.el.value); }); },

  _mark(el, on) {
    const row = el.closest('.range-row');
    if (!row) return;
    row.classList.toggle('bhv-on', on);
    const btn = row.querySelector('.tipo-bhv-btn');
    if (btn) btn.classList.toggle('on', on);
  },

  _ensureLoop() {
    if (this._raf) return;
    let last = 0;
    const tick = (now) => {
      if (!this.active.size) { this._raf = null; return; }
      this._raf = requestAnimationFrame(tick);
      if (now - last < 33) return;
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0.033;
      last = now;
      if (this.paused) return;
      this.active.forEach(b => this._update(b, dt));
    };
    this._raf = requestAnimationFrame(tick);
  },

  _update(b, dt) {
    if (!b.el.isConnected) { this.stop(b.id); return; } // slider was rebuilt/removed
    const spd = 0.2 + (b.speed / 100) * 2.8; // ~0.2..3 cycles factor
    b.t += dt * spd;
    const A = (b.amp / 100) * b.range;
    let v;
    switch (b.type) {
      case 'noise': {
        const n = Math.sin(b.seed + b.t * 2.1) * 0.5 +
                  Math.sin(b.seed * 1.7 + b.t * 3.7) * 0.3 +
                  Math.sin(b.seed * 2.3 + b.t * 5.9) * 0.2;
        v = b.center + n * A;
        break;
      }
      case 'loop': { // sawtooth across the window, wraps
        const ph = (b.t * 0.5) % 1;
        v = b.center - A + ph * 2 * A;
        break;
      }
      case 'pingpong': { // triangle wave
        const ph = (b.t * 0.5) % 2;
        const tri = ph < 1 ? ph : 2 - ph;
        v = b.center - A + tri * 2 * A;
        break;
      }
      case 'step': { // random target at intervals
        b.stepTimer -= dt * spd;
        if (b.stepTimer <= 0) {
          b.stepTimer = 0.5;
          b.stepTarget = b.center + (Math.random() * 2 - 1) * A;
        }
        v = b.stepTarget;
        break;
      }
      default: // sine oscillator
        v = b.center + Math.sin(b.t * Math.PI) * A;
    }
    this._apply(b, v);
  },

  _apply(b, v) {
    v = Math.max(b.min, Math.min(b.max, v));
    v = Math.round(v / b.step) * b.step;
    if (b.step < 1) v = Number(v.toFixed(4));
    if (v === b.lastOut) return;
    b.lastOut = v;
    b.el.value = v;
    b.el.dispatchEvent(new Event('input', { bubbles: true }));
  },

  // ---- "~" button + popover UI ----

  _onButton(el, btn) {
    if (this._popFor === el.id) { this.closePopover(); return; }
    if (!this.active.has(el.id)) this.start(el.id);
    this.openPopover(el, btn);
  },

  _buildPop() {
    if (this._pop) return;
    const p = document.createElement('div');
    p.id = 'tipoBhvPop';
    p.innerHTML =
      '<div class="bhv-pop-head"><span id="bhvPopName"></span>' +
      '<button type="button" id="bhvPopOff" title="Stop animating">off</button></div>' +
      '<div class="bhv-pop-row"><span>Type</span><select id="bhvPopType" data-nobhv>' +
      '<option value="sine">Oscillate</option><option value="noise">Noise</option>' +
      '<option value="loop">Loop</option><option value="pingpong">Ping-Pong</option>' +
      '<option value="step">Random Step</option></select></div>' +
      '<div class="bhv-pop-row"><span>Amount</span><input type="range" id="bhvPopAmp" min="1" max="100" value="35" data-nobhv></div>' +
      '<div class="bhv-pop-row"><span>Speed</span><input type="range" id="bhvPopSpeed" min="1" max="100" value="50" data-nobhv></div>';
    document.body.appendChild(p);
    p.addEventListener('click', e => e.stopPropagation());
    p.querySelector('#bhvPopOff').addEventListener('click', () => {
      if (this._popFor) this.stop(this._popFor);
    });
    p.querySelector('#bhvPopType').addEventListener('change', e => {
      const b = this.active.get(this._popFor);
      if (b) { b.type = e.target.value; b.t = 0; b.stepTimer = 0; }
    });
    p.querySelector('#bhvPopAmp').addEventListener('input', e => {
      const b = this.active.get(this._popFor);
      if (b) b.amp = Number(e.target.value);
    });
    p.querySelector('#bhvPopSpeed').addEventListener('input', e => {
      const b = this.active.get(this._popFor);
      if (b) b.speed = Number(e.target.value);
    });
    document.addEventListener('click', () => this.closePopover());
    const panel = document.querySelector('.tipo-panel');
    if (panel) panel.addEventListener('scroll', () => this.closePopover());
    this._pop = p;
  },

  openPopover(el, btn) {
    this._buildPop();
    const b = this.active.get(el.id);
    if (!b) return;
    this._popFor = el.id;
    const row = el.closest('.range-row');
    const label = row && row.querySelector('.range-label');
    this._pop.querySelector('#bhvPopName').textContent = (label ? label.textContent : el.id) + ' ~';
    this._pop.querySelector('#bhvPopType').value = b.type;
    this._pop.querySelector('#bhvPopAmp').value = b.amp;
    this._pop.querySelector('#bhvPopSpeed').value = b.speed;
    this._pop.classList.add('open');
    const r = btn.getBoundingClientRect();
    const pw = this._pop.offsetWidth, ph = this._pop.offsetHeight;
    let x = r.right + 8, y = r.top - 8;
    if (x + pw > window.innerWidth - 8) x = Math.max(8, r.left - pw - 8);
    if (y + ph > window.innerHeight - 8) y = Math.max(8, window.innerHeight - ph - 8);
    this._pop.style.left = x + 'px';
    this._pop.style.top = y + 'px';
  },

  closePopover() {
    if (this._pop) this._pop.classList.remove('open');
    this._popFor = null;
  },
};

/* ============================================================
   TIPÓ — Custom Font Upload (12.1)
   Injects an "Upload font" control under the Text input on every
   p5 tool. Loads .ttf/.otf via p5 loadFont (works in 2D and
   WEBGL), swaps the current font globally with textFont(), and
   dispatches a 'tipofont' event so tools with glyph caches
   (danger, ribbon, badge, audiotype) can rebuild.
   Session-only — reset restores IBM Plex Mono.
   ============================================================ */

const TipoFont = {
  DEFAULT: 'assets/fonts/IBMPlexMono-Regular.ttf',
  DEFAULT_NAME: 'IBM Plex Mono',
  /** Curated built-in library (Fase 14). All open-licensed, self-hosted.
   *  DEFAULT_BUILTIN is the site-wide display default for every tool. */
  BUILTINS: [
    { name: 'Clash Display', file: 'assets/fonts/ClashDisplay-Semibold.otf' },
    { name: 'General Sans', file: 'assets/fonts/GeneralSans-Semibold.otf' },
    { name: 'Space Grotesk', file: 'assets/fonts/SpaceGrotesk-Bold.ttf' },
    { name: 'Boska', file: 'assets/fonts/Boska-Bold.otf' },
    { name: 'Fraunces', file: 'assets/fonts/Fraunces-Black.ttf' },
    { name: 'IBM Plex Mono', file: 'assets/fonts/IBMPlexMono-Regular.ttf' },
  ],
  DEFAULT_BUILTIN: 'Clash Display',
  activeBuiltin: 'IBM Plex Mono',
  custom: false,
  _url: null,
  _label: null,
  _css: false,

  init() {
    const textInput = document.getElementById('textInput');
    if (!textInput || document.getElementById('tipoFontRow')) return;
    // tools with their own vector type engine (Flag) opt out of the font system
    if (textInput.dataset.tipoFont === 'off') {
      const note = document.createElement('div');
      note.id = 'tipoFontRow';
      note.style.cssText = 'font-size:9px;color:var(--text-5,#777);margin-top:7px;letter-spacing:.4px;';
      note.textContent = 'fonte vetorial própria da ferramenta';
      textInput.insertAdjacentElement('afterend', note);
      return;
    }
    this._injectCSS();

    const opts = this.BUILTINS.map(b =>
      `<option value="${b.name}">${b.name}</option>`).join('');
    const row = document.createElement('div');
    row.id = 'tipoFontRow';
    row.innerHTML =
      '<select id="tipoFontSel" title="Fonte das ferramentas">' + opts + '</select>' +
      '<button type="button" id="tipoFontBtn" title="Use your own font (.ttf / .otf)">Aa</button>' +
      '<span id="tipoFontName" style="display:none;"></span>' +
      '<button type="button" id="tipoFontReset" title="Voltar pra fonte da biblioteca" style="display:none;">&#8634;</button>' +
      '<input type="file" id="tipoFontFile" accept=".ttf,.otf" style="display:none;">';
    textInput.insertAdjacentElement('afterend', row);

    const file = row.querySelector('#tipoFontFile');
    row.querySelector('#tipoFontBtn').addEventListener('click', () => file.click());
    file.addEventListener('change', () => {
      const f = file.files && file.files[0];
      if (f) this._loadFile(f);
      file.value = '';
    });
    row.querySelector('#tipoFontReset').addEventListener('click', () => this.reset());
    const selEl = row.querySelector('#tipoFontSel');
    selEl.addEventListener('change', () => this.setBuiltin(selEl.value));

    // apply the saved/site default; p5 globals only exist after window load
    const saved = localStorage.getItem('tipo-font') || this.DEFAULT_BUILTIN;
    selEl.value = this.BUILTINS.some(b => b.name === saved) ? saved : this.DEFAULT_BUILTIN;
    if (selEl.value !== 'IBM Plex Mono') {
      const apply = () => this.setBuiltin(selEl.value, true);
      if (document.readyState === 'complete') setTimeout(apply, 120);
      else window.addEventListener('load', () => setTimeout(apply, 250));
    }
  },

  /** Switch to a library font (persisted site-wide). quiet = no toast. */
  setBuiltin(name, quiet) {
    const b = this.BUILTINS.find(x => x.name === name);
    if (!b) return;
    localStorage.setItem('tipo-font', name);
    const done = () => {
      this.activeBuiltin = name;
      this.custom = false;
      this._label = null;
      window.dispatchEvent(new CustomEvent('tipofont', { detail: this._lastP5Font || null }));
      this._syncRow();
      if (!quiet) this._toast('Fonte: ' + name);
    };
    if (typeof window.loadFont === 'function') {
      window.loadFont(b.file, (font) => {
        this._lastP5Font = font;
        if (typeof window.textFont === 'function') {
          try { window.textFont(font); } catch (e) {}
        }
        done();
      }, () => { if (!quiet) this._toast('Fonte falhou — mantendo a atual'); });
    } else {
      if (name === 'IBM Plex Mono') { // Plex is the page's CSS fallback, no FontFace needed
        if (this._bff) { document.fonts.delete(this._bff); this._bff = null; }
        done();
        return;
      }
      fetch(b.file).then(r => r.arrayBuffer()).then(buf => {
        const ff = new FontFace('TipoBuiltinFont', buf);
        return ff.load().then(() => {
          if (this._bff) document.fonts.delete(this._bff);
          document.fonts.add(ff);
          this._bff = ff;
          done();
        });
      }).catch(() => { if (!quiet) this._toast('Fonte falhou — mantendo a atual'); });
    }
  },

  _injectCSS() {
    if (this._css) return;
    this._css = true;
    const s = document.createElement('style');
    s.textContent = `
#tipoFontRow { display:flex; align-items:center; gap:7px; margin-top:7px; }
#tipoFontSel { flex:1; max-width:170px; background:var(--bg-2,#1e1e1e); color:var(--text-2,#ccc); border:1px solid var(--border-2,#3a3a3a); padding:4px 6px; font-size:10px; border-radius:4px; font-family:var(--font-ui,'IBM Plex Mono',monospace); }
#tipoFontRow button { border:1px solid var(--border-2,#3a3a3a); background:transparent; color:var(--text-4,#999); font-size:10px; padding:3px 8px; border-radius:4px; cursor:pointer; font-family:var(--font-ui,'IBM Plex Mono',monospace); }
#tipoFontRow button:hover { border-color:var(--accent,#2A8A7A); color:var(--accent,#2A8A7A); }
#tipoFontName { font-size:9px; color:var(--text-5,#777); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:150px; }
#tipoFontRow.custom #tipoFontName { color:var(--accent,#2A8A7A); }
`;
    document.head.appendChild(s);
  },

  /** Font family string for canvas-2D tools (ctx.font) */
  family() {
    if (this.custom && this._ff) return '"TipoCustomFont", monospace';
    if (this._bff) return '"TipoBuiltinFont", monospace';
    return '"IBM Plex Mono", monospace';
  },

  _ff: null,  // FontFace: user-uploaded font (canvas 2D pages)
  _bff: null, // FontFace: active library font (canvas 2D pages)

  _loadFile(f) {
    const name = f.name.replace(/\.(ttf|otf)$/i, '');
    if (!/\.(ttf|otf)$/i.test(f.name)) {
      this._toast('Only .ttf / .otf fonts work here');
      return;
    }
    // Canvas-2D pages (no p5 loadFont): register via the FontFace API
    if (typeof window.loadFont !== 'function') {
      f.arrayBuffer().then(buf => {
        const ff = new FontFace('TipoCustomFont', buf);
        return ff.load().then(() => {
          if (this._ff) document.fonts.delete(this._ff);
          document.fonts.add(ff);
          this._ff = ff;
          this.custom = true;
          this._label = name;
          window.dispatchEvent(new CustomEvent('tipofont', { detail: null }));
          this._syncRow();
          this._toast('Font: ' + name);
        });
      }).catch(() => this._toast('Font failed to load — keeping current'));
      return;
    }
    const url = URL.createObjectURL(f);
    this._apply(url, name, () => URL.revokeObjectURL(url));
  },

  reset() {
    // custom upload off → back to whatever library font is selected
    if (this._ff) { document.fonts.delete(this._ff); this._ff = null; }
    this.custom = false;
    this._label = null;
    this.setBuiltin(this.activeBuiltin === 'IBM Plex Mono'
      ? (document.getElementById('tipoFontSel') || {}).value || 'IBM Plex Mono'
      : this.activeBuiltin);
  },

  _apply(url, label, onFail) {
    if (typeof window.loadFont !== 'function') {
      this._toast('Custom fonts need a p5 tool');
      if (onFail) onFail();
      return;
    }
    window.loadFont(url,
      (font) => {
        if (this._url) URL.revokeObjectURL(this._url);
        this._url = label ? url : null;
        this.custom = !!label;
        this._label = label;
        // Global swap: tools that set the font once in setup follow immediately
        if (typeof window.textFont === 'function') {
          try { window.textFont(font); } catch (e) {}
        }
        // Tools with glyph caches/buffers listen and rebuild
        window.dispatchEvent(new CustomEvent('tipofont', { detail: font }));
        this._syncRow();
        this._toast(label ? 'Font: ' + label : 'Font reset to ' + this.DEFAULT_NAME);
      },
      () => {
        this._toast('Font failed to load — keeping current');
        if (onFail) onFail();
      });
  },

  _syncRow() {
    const row = document.getElementById('tipoFontRow');
    if (!row) return;
    row.classList.toggle('custom', this.custom);
    const name = row.querySelector('#tipoFontName');
    const selEl = row.querySelector('#tipoFontSel');
    name.style.display = this.custom ? '' : 'none';
    name.textContent = this.custom ? this._label : '';
    if (selEl) {
      selEl.style.display = this.custom ? 'none' : '';
      if (!this.custom) selEl.value = this.activeBuiltin;
    }
    row.querySelector('#tipoFontReset').style.display = this.custom ? '' : 'none';
  },

  _toast(msg) {
    if (typeof TipoUI !== 'undefined' && TipoUI.showToast) TipoUI.showToast(msg);
  },
};


/* ============================================================
   TIPÓ — Mini-Timeline (Cavalry Mode 9.4)
   Keyframe any slider over time: open the timeline bar, move the
   playhead, drag a slider — a keyframe is recorded at that time
   (AE-style auto-key). Per-segment easing (TipoEase), scrub,
   play/pause/loop, configurable duration, and "REC" exports an
   MP4 of exactly one pass through the timeline.
   Playback dispatches synthetic 'input' events, so every tool
   reacts as if the user were dragging (same contract as
   TipoBehavior). Keyframed playback pauses behaviors.
   ============================================================ */

const TipoTimeline = {
  open: false,
  playing: false,
  loop: true,
  duration: 4,
  time: 0,
  tracks: new Map(), // sliderId -> { keys: [{t, v, ease, dir}] } (keys sorted by t)
  selected: null,    // { id, i }
  _raf: null,
  _last: 0,
  _bar: null,
  _btn: null,
  _recording: false,
  _scrubbing: false,
  _css: false,

  init() {
    // Only on tool pages (all of them have an export/record button)
    if (!document.getElementById('recBtn') && !document.getElementById('recordBtn')) return;
    if (this._btn) return;
    this._injectCSS();
    const b = document.createElement('button');
    b.className = 'tipo-tl-toggle';
    b.title = 'Timeline — keyframe any slider';
    b.textContent = '⏱';
    b.addEventListener('click', () => this.toggleOpen());
    document.body.appendChild(b);
    this._btn = b;

    // AE-style auto-key: a REAL slider drag while the bar is open records
    // a keyframe at the playhead (synthetic events from behaviors/playback
    // are not trusted, so they never feed back into keys)
    document.addEventListener('input', (e) => {
      if (!this.open || !e.isTrusted) return;
      const el = e.target;
      if (!el.matches || !el.matches('.range-row input[type="range"]')) return;
      if (el.dataset.notl !== undefined || el.closest('#tipoTL')) return;
      if (!el.id) return;
      this.upsertKey(el.id, this.time, Number(el.value));
    });
  },

  _injectCSS() {
    if (this._css) return;
    this._css = true;
    const s = document.createElement('style');
    s.textContent = `
.tipo-tl-toggle { position:fixed; bottom:64px; right:14px; z-index:9000; width:40px; height:40px; border-radius:50%; border:1px solid var(--border-2,#3a3a3a); background:var(--bg-1,#161616); color:var(--text-3,#bbb); font-size:17px; cursor:pointer; box-shadow:0 2px 10px rgba(0,0,0,.25); }
.tipo-tl-toggle:hover { border-color:var(--accent,#2A8A7A); color:var(--accent,#2A8A7A); }
#tipoTL { position:fixed; bottom:64px; right:14px; z-index:9001; width:min(760px, calc(100vw - 28px)); background:var(--bg-1,#161616); border:1px solid var(--border-2,#3a3a3a); border-radius:8px; padding:10px 12px; box-shadow:0 8px 30px rgba(0,0,0,.4); font-family:var(--font-ui,'IBM Plex Mono',monospace); display:none; }
#tipoTL.open { display:block; }
.tl-head { display:flex; align-items:center; gap:8px; }
.tl-head button { border:1px solid var(--border-2,#3a3a3a); background:transparent; color:var(--text-3,#bbb); font-size:11px; padding:3px 8px; border-radius:4px; cursor:pointer; font-family:inherit; }
.tl-head button:hover { border-color:var(--accent,#2A8A7A); color:var(--accent,#2A8A7A); }
.tl-head button.on { background:var(--accent,#2A8A7A); border-color:var(--accent,#2A8A7A); color:var(--bg-0,#0a0a0a); }
#tlRec.armed { border-color:var(--red,#CC4840); color:var(--red,#CC4840); }
#tlDur { width:44px; background:var(--bg-2,#1e1e1e); color:var(--text-1,#e0e0e0); border:1px solid var(--border-2,#3a3a3a); border-radius:4px; font-size:11px; padding:3px 4px; font-family:inherit; }
#tlRuler { flex:1; height:24px; position:relative; background:var(--bg-2,#1e1e1e); border:1px solid var(--border-2,#3a3a3a); border-radius:4px; cursor:crosshair; overflow:hidden; }
#tlPlayhead { position:absolute; top:0; bottom:0; width:2px; background:var(--accent,#2A8A7A); pointer-events:none; }
#tlTime { font-size:10px; color:var(--text-4,#999); min-width:64px; text-align:right; }
#tlTracks { margin-top:8px; max-height:132px; overflow-y:auto; }
.tl-track { display:flex; align-items:center; gap:8px; height:22px; }
.tl-track-label { width:110px; font-size:9px; letter-spacing:.5px; text-transform:uppercase; color:var(--text-4,#999); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:none; }
.tl-lane { flex:1; height:14px; position:relative; background:var(--bg-2,#1e1e1e); border-radius:3px; }
.tl-key { position:absolute; top:50%; width:9px; height:9px; background:var(--accent-warm,#D4A040); transform:translate(-50%,-50%) rotate(45deg); cursor:ew-resize; border:1px solid var(--bg-0,#0a0a0a); }
.tl-key.sel { background:var(--accent,#2A8A7A); outline:2px solid var(--accent,#2A8A7A); }
.tl-foot { display:flex; align-items:center; gap:8px; margin-top:8px; }
.tl-foot select { background:var(--bg-2,#1e1e1e); color:var(--text-1,#e0e0e0); border:1px solid var(--border-2,#3a3a3a); border-radius:4px; font-size:10px; padding:2px 4px; font-family:inherit; }
.tl-foot button { border:1px solid var(--border-2,#3a3a3a); background:transparent; color:var(--text-4,#999); font-size:10px; padding:2px 8px; border-radius:4px; cursor:pointer; font-family:inherit; }
.tl-foot button:hover { border-color:var(--red,#CC4840); color:var(--red,#CC4840); }
.tl-hint { font-size:10px; color:var(--text-5,#777); margin-top:7px; letter-spacing:.4px; }
.tl-hint.warn { color:var(--accent-warm,#D4A040); font-weight:700; }
.tl-key.flash { animation: tl-key-flash .7s ease-out; }
@keyframes tl-key-flash { 0% { transform:translate(-50%,-50%) rotate(45deg) scale(2.4); box-shadow:0 0 12px var(--accent-warm,#D4A040); } 100% { transform:translate(-50%,-50%) rotate(45deg) scale(1); } }
#tlRuler.flash { animation: tl-ruler-flash .5s ease-out; }
@keyframes tl-ruler-flash { 0% { border-color:var(--accent-warm,#D4A040); box-shadow:0 0 8px var(--accent-warm,#D4A040); } 100% { border-color:var(--border-2,#3a3a3a); } }
`;
    document.head.appendChild(s);
  },

  toggleOpen() {
    this._buildBar();
    this.open = !this.open;
    this._bar.classList.toggle('open', this.open);
    this._btn.style.display = this.open ? 'none' : '';
    if (!this.open) this.pause();
  },

  _buildBar() {
    if (this._bar) return;
    const bar = document.createElement('div');
    bar.id = 'tipoTL';
    bar.innerHTML =
      '<div class="tl-head">' +
      '<button id="tlPlay" title="Play/pause">▶</button>' +
      '<button id="tlLoop" class="on" title="Loop">⟲</button>' +
      '<input id="tlDur" type="number" min="1" max="60" step="0.5" value="4" data-notl title="Duration (s)">' +
      '<div id="tlRuler"><div id="tlPlayhead"></div></div>' +
      '<span id="tlTime">0.00 / 4.0s</span>' +
      '<button id="tlRec" title="Record one pass as MP4">● REC</button>' +
      '<button id="tlClose" title="Close">×</button>' +
      '</div>' +
      '<div id="tlTracks"></div>' +
      '<div class="tl-foot" id="tlInspector" style="display:none;">' +
      '<span style="font-size:9px;color:var(--text-4,#999);text-transform:uppercase;">Ease</span>' +
      '<select id="tlEase" data-nobhv><option value="linear">Linear</option>' +
      TipoEase._names.map(n => `<option value="${n}">${n[0].toUpperCase() + n.slice(1)}</option>`).join('') +
      '</select>' +
      '<select id="tlDir" data-nobhv><option value="inOut">In-Out</option><option value="in">In</option><option value="out">Out</option></select>' +
      '<button id="tlDelKey">Delete key</button>' +
      '<button id="tlClear">Clear all</button>' +
      '</div>' +
      '<div class="tl-hint" id="tlHint"></div>';
    document.body.appendChild(bar);
    this._bar = bar;

    bar.querySelector('#tlPlay').addEventListener('click', () => this.playing ? this.pause() : this.play());
    bar.querySelector('#tlLoop').addEventListener('click', (e) => {
      this.loop = !this.loop;
      e.target.classList.toggle('on', this.loop);
    });
    bar.querySelector('#tlDur').addEventListener('change', (e) => {
      this.duration = Math.max(1, Math.min(60, Number(e.target.value) || 4));
      e.target.value = this.duration;
      if (this.time > this.duration) this.seek(this.duration);
      this._redraw();
    });
    bar.querySelector('#tlClose').addEventListener('click', () => this.toggleOpen());
    bar.querySelector('#tlRec').addEventListener('click', () => this.recPass());
    bar.querySelector('#tlClear').addEventListener('click', () => {
      this.tracks.clear();
      this.selected = null;
      this._redraw();
    });
    bar.querySelector('#tlDelKey').addEventListener('click', () => this._deleteSelected());
    bar.querySelector('#tlEase').addEventListener('change', (e) => {
      const k = this._selKey();
      if (k) k.ease = e.target.value;
    });
    bar.querySelector('#tlDir').addEventListener('change', (e) => {
      const k = this._selKey();
      if (k) k.dir = e.target.value;
    });

    // Scrub on the ruler
    const ruler = bar.querySelector('#tlRuler');
    const scrubTo = (ev) => {
      const r = ruler.getBoundingClientRect();
      this.seek(Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)) * this.duration);
    };
    ruler.addEventListener('pointerdown', (ev) => {
      this.pause();
      this._scrubbing = true;
      ruler.setPointerCapture(ev.pointerId);
      scrubTo(ev);
    });
    ruler.addEventListener('pointermove', (ev) => { if (this._scrubbing) scrubTo(ev); });
    ruler.addEventListener('pointerup', () => { this._scrubbing = false; });
    this._redraw();
  },

  _toast(msg) {
    if (typeof TipoUI !== 'undefined' && TipoUI.showToast) TipoUI.showToast(msg);
  },

  // ---- keys ----

  upsertKey(id, t, v) {
    let tr = this.tracks.get(id);
    if (!tr) { tr = { keys: [] }; this.tracks.set(id, tr); }
    const EPS = 0.02;
    const hit = tr.keys.find(k => Math.abs(k.t - t) < EPS);
    let isNew = false;
    if (hit) hit.v = v;
    else {
      isNew = true;
      tr.keys.push({ t, v, ease: 'linear', dir: 'inOut' });
      tr.keys.sort((a, b) => a.t - b.t);
    }
    this._redraw(isNew ? { id, t } : null);
  },

  _selKey() {
    if (!this.selected) return null;
    const tr = this.tracks.get(this.selected.id);
    return tr ? tr.keys[this.selected.i] : null;
  },

  _deleteSelected() {
    if (!this.selected) return;
    const tr = this.tracks.get(this.selected.id);
    if (tr) {
      tr.keys.splice(this.selected.i, 1);
      if (!tr.keys.length) this.tracks.delete(this.selected.id);
    }
    this.selected = null;
    this._redraw();
  },

  _labelFor(id) {
    const el = document.getElementById(id);
    const row = el && el.closest('.range-row');
    const lb = row && row.querySelector('.range-label');
    return lb ? lb.textContent : id;
  },

  _redraw(flashKey = null) {
    if (!this._bar) return;
    const wrap = this._bar.querySelector('#tlTracks');
    wrap.innerHTML = '';
    this.tracks.forEach((tr, id) => {
      const row = document.createElement('div');
      row.className = 'tl-track';
      const label = document.createElement('div');
      label.className = 'tl-track-label';
      label.textContent = this._labelFor(id);
      const lane = document.createElement('div');
      lane.className = 'tl-lane';
      tr.keys.forEach((k, i) => {
        const d = document.createElement('div');
        d.className = 'tl-key' + (this.selected && this.selected.id === id && this.selected.i === i ? ' sel' : '');
        if (flashKey && flashKey.id === id && Math.abs(k.t - flashKey.t) < 0.02) d.classList.add('flash');
        d.style.left = (Math.min(1, k.t / this.duration) * 100) + '%';
        d.addEventListener('pointerdown', (ev) => {
          ev.stopPropagation();
          this.selected = { id, i };
          this._syncInspector();
          d.classList.add('sel');
          d.setPointerCapture(ev.pointerId);
          const move = (mv) => {
            const r = lane.getBoundingClientRect();
            k.t = Math.max(0, Math.min(1, (mv.clientX - r.left) / r.width)) * this.duration;
            d.style.left = (k.t / this.duration * 100) + '%';
          };
          const up = () => {
            d.removeEventListener('pointermove', move);
            d.removeEventListener('pointerup', up);
            tr.keys.sort((a, b) => a.t - b.t);
            this.selected = { id, i: tr.keys.indexOf(k) };
            this._redraw();
          };
          d.addEventListener('pointermove', move);
          d.addEventListener('pointerup', up);
        });
        d.addEventListener('dblclick', () => {
          this.selected = { id, i };
          this._deleteSelected();
        });
        lane.appendChild(d);
      });
      row.appendChild(label);
      row.appendChild(lane);
      wrap.appendChild(row);
    });
    if (flashKey) {
      const ruler = this._bar.querySelector('#tlRuler');
      ruler.classList.remove('flash');
      void ruler.offsetWidth; // restart the animation
      ruler.classList.add('flash');
    }
    this._syncInspector();
    this._syncPlayhead();
    this._syncHint();
  },

  /** True when at least one track has enough keys to animate */
  _canAnimate() {
    for (const tr of this.tracks.values()) if (tr.keys.length >= 2) return true;
    return false;
  },

  /** Guided hint: tells the user the exact next step */
  _syncHint() {
    if (!this._bar) return;
    const h = this._bar.querySelector('#tlHint');
    if (!this.tracks.size) {
      h.textContent = 'Move any slider to record a keyframe at the playhead';
      h.classList.remove('warn');
    } else if (!this._canAnimate()) {
      h.textContent = '◆ recorded! Now drag the playhead to another time and move the slider again — 2+ keyframes make an animation';
      h.classList.add('warn');
    } else {
      h.textContent = '▶ play · ● REC exports one pass as MP4 · drag ◆ to retime · dblclick ◆ to delete';
      h.classList.remove('warn');
    }
  },

  _syncInspector() {
    if (!this._bar) return;
    const insp = this._bar.querySelector('#tlInspector');
    const k = this._selKey();
    insp.style.display = this.tracks.size ? 'flex' : 'none';
    this._bar.querySelector('#tlEase').value = k ? k.ease : 'linear';
    this._bar.querySelector('#tlDir').value = k ? k.dir : 'inOut';
    this._bar.querySelector('#tlDelKey').style.display = k ? '' : 'none';
  },

  _syncPlayhead() {
    if (!this._bar) return;
    this._bar.querySelector('#tlPlayhead').style.left = (Math.min(1, this.time / this.duration) * 100) + '%';
    this._bar.querySelector('#tlTime').textContent = this.time.toFixed(2) + ' / ' + this.duration.toFixed(1) + 's';
  },

  // ---- playback ----

  _valueAt(tr, t) {
    const keys = tr.keys;
    if (!keys.length) return null;
    if (t <= keys[0].t) return keys[0].v;
    if (t >= keys[keys.length - 1].t) return keys[keys.length - 1].v;
    let i = 0;
    while (i < keys.length - 1 && keys[i + 1].t < t) i++;
    const a = keys[i], b = keys[i + 1];
    const span = b.t - a.t || 1;
    let u = (t - a.t) / span;
    if (a.ease !== 'linear') u = TipoEase.byName(a.ease, a.dir || 'inOut')(u);
    return a.v + (b.v - a.v) * u;
  },

  _apply(t) {
    this.tracks.forEach((tr, id) => {
      const el = document.getElementById(id);
      if (!el) return;
      let v = this._valueAt(tr, t);
      if (v === null) return;
      const min = Number(el.min || 0), max = Number(el.max || 100);
      const step = Number(el.step) || 1;
      v = Math.max(min, Math.min(max, v));
      v = Math.round(v / step) * step;
      if (step < 1) v = Number(v.toFixed(4));
      if (Number(el.value) === v) return;
      el.value = v;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
  },

  seek(t) {
    this.time = Math.max(0, Math.min(this.duration, t));
    this._apply(this.time);
    this._syncPlayhead();
  },

  play() {
    if (this.playing) return;
    if (!this.tracks.size) {
      this._toast('No keyframes yet — move a slider with the timeline open');
      return;
    }
    if (!this._canAnimate()) {
      this._toast('Add a 2nd keyframe at another time to animate');
    }
    this.playing = true;
    this._last = 0;
    if (typeof TipoBehavior !== 'undefined') TipoBehavior.paused = true;
    if (this._bar) this._bar.querySelector('#tlPlay').textContent = '⏸';
    const tick = (now) => {
      if (!this.playing) return;
      this._raf = requestAnimationFrame(tick);
      if (this._last && now - this._last < 31) return; // ~30fps, matches MP4 target
      const dt = this._last ? (now - this._last) / 1000 : 0;
      this._last = now;
      this.time += dt;
      if (this.time >= this.duration) {
        if (this._recording) { this.time = this.duration; this._finishRec(); return; }
        if (this.loop) this.time = this.time % this.duration;
        else { this.seek(this.duration); this.pause(); return; }
      }
      this._apply(this.time);
      this._syncPlayhead();
    };
    this._raf = requestAnimationFrame(tick);
  },

  pause() {
    this.playing = false;
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
    if (this._bar) this._bar.querySelector('#tlPlay').textContent = '▶';
    if (typeof TipoBehavior !== 'undefined') {
      TipoBehavior.resync();
      TipoBehavior.paused = false;
    }
  },

  // ---- MP4 of exactly one timeline pass ----

  _recToggle() {
    if (typeof window.toggleRec === 'function') return window.toggleRec();
    const b = document.getElementById('recBtn') || document.getElementById('recordBtn');
    if (b) b.click();
  },

  async recPass() {
    if (this._recording) return;
    if (!this.tracks.size) {
      this._toast('No keyframes yet — move a slider with the timeline open');
      return;
    }
    this.pause();
    this.seek(0);
    this._recording = true;
    if (this._bar) this._bar.querySelector('#tlRec').classList.add('armed');
    await this._recToggle(); // start recording
    this.play();
  },

  async _finishRec() {
    this._apply(this.duration);
    this._syncPlayhead();
    this.pause();
    this._recording = false;
    if (this._bar) this._bar.querySelector('#tlRec').classList.remove('armed');
    await this._recToggle(); // stop + download
    this.seek(0);
  },
};

/* ============================================================
   TIPÓ — GIF Loop Export (12.2)
   "GIF" button next to Record on every tool. Captures ~3s of the
   live canvas at 20fps (or exactly one timeline pass when the
   timeline is open with keyframes — perfect loops), quantizes and
   encodes with gifenc (lazy ESM import, zero page weight until
   the first click), then downloads.
   ============================================================ */

const TipoGIF = {
  FPS: 20,
  SECONDS: 3,
  MAXW: 640,
  _lib: null,
  _busy: false,

  init() {
    const rec = document.getElementById('recBtn') || document.getElementById('recordBtn');
    if (!rec || document.getElementById('tipoGifBtn')) return;
    const b = document.createElement('button');
    b.id = 'tipoGifBtn';
    b.type = 'button';
    b.className = rec.className || 'btn btn-secondary';
    b.textContent = 'GIF';
    b.title = 'Export a 3s GIF loop — with timeline keyframes it captures exactly one pass';
    b.addEventListener('click', () => this.capture());
    rec.insertAdjacentElement('afterend', b);
  },

  async _load() {
    if (!this._lib) {
      this._lib = await import('https://cdn.jsdelivr.net/npm/gifenc@1.0.3/dist/gifenc.esm.js');
    }
    return this._lib;
  },

  _canvas() {
    return (typeof TipoUI !== 'undefined' && TipoUI.recorder && TipoUI.recorder.canvas)
      || document.querySelector('#canvasContainer canvas')
      || document.querySelector('#canvasWrap canvas')
      || document.querySelector('canvas');
  },

  _name() {
    const mode = (typeof TipoUI !== 'undefined' && TipoUI.modeName) ||
      location.pathname.split('/').pop().replace('.html', '') || 'export';
    return 'tipo-' + mode + '.gif';
  },

  async capture() {
    if (this._busy) return;
    const src = this._canvas();
    const btn = document.getElementById('tipoGifBtn');
    const setTxt = (t) => { if (btn) btn.textContent = t; };
    if (!src) return;
    this._busy = true;
    if (btn) btn.disabled = true;
    try {
      setTxt('…');
      const { GIFEncoder, quantize, applyPalette } = await this._load();

      // With an animatable timeline open, capture exactly one pass — perfect loop
      const useTL = typeof TipoTimeline !== 'undefined' && TipoTimeline.open && TipoTimeline._canAnimate();
      const seconds = useTL ? TipoTimeline.duration : this.SECONDS;
      const fps = this.FPS;
      const total = Math.max(2, Math.round(seconds * fps));
      const scale = Math.min(1, this.MAXW / src.width);
      const w = Math.max(2, Math.round(src.width * scale)), h = Math.max(2, Math.round(src.height * scale));
      const cap = document.createElement('canvas');
      cap.width = w; cap.height = h;
      const cctx = cap.getContext('2d', { willReadFrequently: true });

      if (useTL) { TipoTimeline.pause(); TipoTimeline.seek(0); TipoTimeline.play(); }
      const frames = [];
      await new Promise((res) => {
        let n = 0, last = 0;
        const step = (now) => {
          if (now - last < 1000 / fps - 2) { requestAnimationFrame(step); return; }
          last = now;
          cctx.drawImage(src, 0, 0, w, h);
          frames.push(cctx.getImageData(0, 0, w, h).data);
          n++;
          setTxt('REC ' + Math.round(n / total * 100) + '%');
          if (n >= total) res();
          else requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
      if (useTL) TipoTimeline.pause();

      const gif = GIFEncoder();
      const delay = Math.round(1000 / fps);
      for (let i = 0; i < frames.length; i++) {
        setTxt('GIF ' + Math.round((i + 1) / frames.length * 100) + '%');
        const palette = quantize(frames[i], 256);
        const index = applyPalette(frames[i], palette);
        gif.writeFrame(index, w, h, { palette, delay });
        if (i % 4 === 3) await new Promise(r => setTimeout(r)); // keep the UI alive
      }
      gif.finish();
      const blob = new Blob([gif.bytes()], { type: 'image/gif' });
      TipoUI._downloadBlob(blob, this._name());
      if (TipoUI.showToast) TipoUI.showToast('GIF saved (' + (blob.size / 1048576).toFixed(1) + ' MB, ' + total + ' frames)');
    } catch (err) {
      console.error(err);
      if (typeof TipoUI !== 'undefined' && TipoUI.showToast) TipoUI.showToast('GIF export failed');
    } finally {
      this._busy = false;
      if (btn) btn.disabled = false;
      setTxt('GIF');
    }
  },
};


/* ============================================================
   TIPÓ — Help Tooltips (padrão do dithering, agora em todas)
   Central registry of succinct PT-BR explanations per tool.
   A "?" icon is injected next to each section title that has an
   entry; hover shows the tooltip, click pins it (mobile).
   Pages with their own inline system (#helpTooltip) are skipped.
   ============================================================ */

const TipoHelp = {
  TEXTS: {
    coil: {
      'Type': 'X/Y-Scale esticam o texto na horizontal/vertical (Y também dita a altura da fita). Weight engrossa o traço.',
      'Ribbon': 'Count = quantos segmentos de fita na espiral (cada um repete o texto). Size engorda a fita além do texto — negativo afina. Hide deixa só as letras; Flat caps = pontas retas.',
      'Spiral': 'Radius abre a espiral a partir do centro. Spacing afasta os caracteres ao longo da curva. Start pula o miolo (começa mais afastado). Spin gira tudo continuamente.',
      'Wave': 'Onda radial que deforma a espiral: Size = amplitude, Count = nº de picos ao redor, Speed anima, Slope endurece a crista (baixo = senoide suave, alto = pico agudo).',
    },
    cylinder: {
      'Cylinder': 'Radius = raio do tubo 3D; Count = quantas linhas de texto envolvem o cilindro; Rotate gira o tubo; Offset defasa cada linha da anterior (efeito hélice).',
      'Wave': 'Ondulação da superfície: Count = nº de ondas, Speed anima, Latitude/Longitude = direção da onda no tubo, Ripple = amplitude.',
      'Type': 'Escala das letras na superfície (X = largura, Y = altura) e Weight = peso do traço.',
      'Tweak Rotation': 'Rotação por LINHA de texto — cada anel gira sobre o próprio eixo. Diferente da Camera, que gira a cena inteira.',
      'Camera': 'Órbita da câmera em X/Y/Z + Zoom. Não muda a geometria, só o ponto de vista.',
    },
    field: {
      'Grid': 'Malha de caracteres: Columns × Rows = densidade; Tracking = espaço horizontal, Line Space = vertical.',
      'Wave': 'Motor da ondulação: Speed anima; X/Y Freq = frequência espacial (quantas ondas cabem no grid em cada eixo).',
      'Amplitude': 'Quanto cada eixo se move: Z = profundidade (letra vem pra frente), X/Y = deslocamento lateral/vertical. Z Smooth suaviza, X Stretch estica as letras com a onda, Str Wave ondula o esticamento.',
      'Stagger': 'Defasagem da onda por célula: Order = ordem (índice/linha/coluna/centro/aleatório), Amount = intensidade (200 = 2 ciclos), Curve = easing da distribuição.',
      'Camera': 'Órbita da câmera em X/Y/Z + Zoom. Não muda a geometria, só o ponto de vista.',
      'Mouse': 'Com Mouse React ligado, as letras fogem do cursor; Strength = força da repulsão.',
    },
    stripes: {
      'Type': 'Escala (X/Y) e peso das letras; Tracking = espaço entre caracteres na fita.',
      'Ribbon': 'Fitas horizontais de texto: Count = quantas, X/Y Space = espaçamento entre elas, Size = altura de cada fita, Offset defasa as linhas.',
      'Stagger': 'Defasagem da onda: Order = por fita (Ribbon) ou por caractere, Amount = intensidade (200 = 2 ciclos), Curve = easing.',
      'Wave': 'Onda que percorre as fitas: Size = amplitude, Speed anima, Wavelength = comprimento da onda, Slope endurece a crista.',
    },
    cascade: {
      'Type': 'X-Scale/Weight = largura e peso das letras; Tracking/Line Space = espaçamentos.',
      'Grid': 'Pirâmide de linhas: Rows = nº de degraus, Length = caracteres por linha.',
      'Wave': 'Speed = velocidade da onda que percorre a pirâmide (0 = desliga a onda); Slope = dureza da crista.',
      'Stagger': 'Defasagem da onda por célula: Mode = ordem, Amount = intensidade (200 = 2 ciclos), Curve = easing. Só age com Wave Speed > 0.',
    },
    flag: {
      'Type': 'X/Y-Scale esticam as letras; Weight = peso do traço; Rows = linhas da bandeira; Padding = espaço entre elas; Ribbon Depth = profundidade 3D da fita.',
      'Wave': 'Tremular da bandeira: X/Y/Z Size = amplitude em cada eixo, Offset defasa colunas, Speed anima, Row Offset defasa cada linha, Slope endurece a crista.',
      'Camera': 'Órbita da câmera em X/Y/Z + Zoom. Não muda a geometria, só o ponto de vista.',
    },
    ribbon: {
      'Type': 'Height = altura das letras na fita; Tracking = espaço entre caracteres; Weight = peso do traço.',
      'Ribbon': 'A fita 3D: Seg Count/Space = resolução e extensão do caminho, Depth = profundidade da dobra, Stretch estica a curva, Count = quantas fitas, Z/X Space afastam as cópias.',
      'Animation': 'Speed = velocidade do texto correndo pela fita; Scale = zoom geral.',
      'Camera': 'Órbita da câmera em X/Y/Z. Não muda a geometria, só o ponto de vista.',
    },
    morisawa: {
      'Type': 'Rows = fileiras; Rhythm = distribuição das alturas: Pyramid (clássico Maeda, grande→pequeno), Wall (parede densa uniforme), Pulse (alturas respirando animadas). Weight = traço do outline; Tracking/Line Space = espaçamentos; Matte = margens; Skew inclina os glyphs na direção do scroll.',
      'Style': 'Glyphs: Fill = cheio, Outline = vazado, Alternate = fileiras alternando cheio/vazado, Highlight = uma fileira dourada CHEIA percorre a grade sobre contornos. As 3 cores ciclam pelas fileiras (Num Colors limita).',
      'Animation': 'Scroll Speed = velocidade do marquee (fileiras de baixo mais rápidas). Direction: Alternate = fileiras vizinhas em sentidos opostos (passarela); One way = todas juntas. Mirror duplica espelhado embaixo; Row flux faz o nº de fileiras oscilar.',
    },
    layers: {
      'Layers': 'Cópias do texto empilhadas com simetria 4-fold: Count = nº de camadas, Speed = scroll em profundidade (0 congela), Inner H/V deslocam o miolo, Rotate gira o conjunto. Block preenche o fundo das letras.',
    },
    danger: {
      'Distortion': 'Malha distorcida por Perlin noise: Speed anima, Radius = alcance da distorção, Complexity = detalhe do ruído.',
      'Grid': 'Columns × Rows repetem o texto na malha; Font Size/Leading = tamanho e entrelinha.',
      'Background': 'Imagem ou vídeo atrás da tipografia distorcida; Clear Media remove.',
      'Mouse': 'Com Mouse React, o centro da distorção segue o cursor; Strength = intensidade.',
    },
    string: {
      'String': 'Fitas de texto ao longo de curvas: Strip Height/Count = espessura e nº de fitas, Points = nós da curva, Curve = tensão, Randomize sorteia outro caminho. O select troca o padrão (wave, river, orbit, spiral...).',
    },
    badge: {
      'Strip (Center)': 'Faixa central de texto: Height = altura, Position desloca na vertical.',
      'Ring': 'Anel de texto circular: Radius, Height das letras e Arc = quanto do círculo o texto ocupa.',
      'Tunnel': 'Anéis concêntricos em profundidade: Count = nº de anéis, Inner = raio inicial, Radius = espalhamento.',
      'Spread': 'Letras soltas ao redor da composição: Font Size e Scale da dispersão.',
      'Master': 'Speed global — gira todas as camadas juntas.',
    },
    clutter: {
      'Layout': 'Count = nº de cópias do texto, Radius/Spread = tamanho e dispersão do enxame, Speed anima.',
      'Mode': 'Distribuição das cópias: ring, cloud, cosmic, sphere, scatter ou vortex — cada um organiza e anima o enxame de um jeito.',
    },
    construct: {
      'Layout': 'Grade modular: Columns × Rows de módulos, Strip Height = altura das faixas, Padding entre células, Speed anima.',
      'Mode': 'Como o texto preenche os módulos: cloud, scribble, zigzag, gradient, box ou matrix.',
    },
    snap: {
      'Animation': 'Letras entram em sequência: Speed = ritmo, Stagger = atraso entre letras, Amplitude = distância do movimento, Easing = curva (0–9: sine → elastic), Organic = jitter natural.',
    },
    flash: {
      'Animation': 'Cicla 8 efeitos de entrada: Scene Length = duração de cada cena, Repeat = repetições antes de trocar de efeito, Easing = curva, Organic = jitter.',
    },
    pow: {
      'Animation': 'O texto explode em partículas e se remonta: Blast Strength = força, Detail = nº de partículas, Particle Size = tamanho, Easing = curva da remontagem. Com Mouse React, a explosão segue o cursor.',
    },
    crash: {
      'Animation': 'Física de queda: Gravity puxa as letras, Bounce = elasticidade do quique, Friction freia no chão.',
    },
    crashclock: {
      'Particles': 'Círculos com colisão dentro do relógio: Count = quantos, Min/Max Size = faixa de tamanho, Packing = densidade do empacotamento.',
      'Clock': 'Scale = tamanho do relógio, Hand Push = força com que os ponteiros empurram as partículas, Hand Width/Border = espessuras.',
      'Physics': 'Gravity + Angle = força e direção da gravidade, Friction amortece, Speed acelera a simulação, Bodies = tipo de corpo simulado.',
    },
    vessel: {
      'Animation': 'O container morfa entre formas: Duration = tempo de cada morph, Pause = espera entre formas, Easing = curva (0–9: sine → elastic).',
    },
    shine: {
      'Animation': 'Raios radiais atrás do texto: Spoke Count/Length = nº e comprimento dos raios, Rotation Speed gira, Scatter espalha as pontas.',
    },
    boost: {
      'Animation': 'Revelação letra a letra: Speed = ritmo, Direction = ângulo de entrada, Overshoot passa do ponto e volta, Easing = curva, Organic = jitter.',
    },
    duplicator: {
      'Element': 'O que é clonado: texto em cycle (cada cópia mostra a letra seguinte), a palavra inteira, ou formas. Size = tamanho base.',
      'Distribution': 'Arranjo das cópias: Grid, Circle, Spiral, Line ou Drawn Path (desenhe direto no canvas). Spread = tamanho do arranjo, Angle gira tudo (anime com ~ e vira um spin), Align alinha cada cópia à direção do caminho.',
      'Per-Copy Offset': 'Mudança progressiva por cópia: Rotate Step soma graus a cada índice, Scale Start→End interpola o tamanho da primeira à última, Fade End esvanece as finais.',
      'Animation': 'Onda que percorre as cópias: Pulse = escala, Twist = rotação, Drift = deslocamento perpendicular, Speed = velocidade. A fase de cada cópia vem do Stagger.',
      'Stagger': 'Ordem em que a onda atinge as cópias: Index/Row/Col/Center/Random. Amount = defasagem total (200 = 2 ciclos), Curve = easing da distribuição.',
    },
    rastro: {
      'Echo Effect': 'Echo temporal (lógica do Adobe): Echo Time = intervalo entre ecos em frames, Echoes = nº de cópias, Intensity/Decay = opacidade inicial e queda por eco. O operador define como os ecos se somam (Composite, Add, Screen...).',
      'Layer / Matte': 'O que vira eco: Full Layer = tudo; Motion Difference isola só o que se move; Drawn Mask = desenhe a área no canvas; Chroma/Luma recortam por cor/brilho. Threshold/Softness calibram o recorte; Background = fundo (Source/Transparente/Sólido).',
      'Source Transform': 'Move e escala a fonte no canvas. Arraste o canvas pra puxar a imagem — o puxão gera rastro e sai na gravação.',
      'Still Motion': 'Pra imagem parada: Orbit/Spin/Push/Zoom criam movimento artificial (o echo só existe quando o layer muda no tempo). Speed/Distance/Angle controlam o gesto.',
      'Echo Transform': 'Cada eco acumula transformação: Rotate gira progressivamente (espiral), Scale Step encolhe/cresce por eco (98% = espiral suave; valores baixos somem rápido), Shift desloca. É o coração do efeito vórtice.',
      'Look': 'Trail Blur borra os ecos mais antigos; Exposure clareia ou atenua o rastro inteiro.',
    },
    overlay: {
      'Pattern': 'A textura procedural: grains de filme (vivos com Animate), Light Leak/Vignette (esticados sobre a mídia), Bokeh, Riso, VHS, papel, tramas... Tudo seamless.',
      'Texture': 'Blend = como a textura mistura com a imagem (Soft Light = sutil, Multiply escurece, Screen clareia). Density/Scale/Roughness/Contrast moldam o padrão; Animate faz o grain viver; dblclick no canvas re-sorteia a semente.',
      'Output': 'Tamanho do tile (maior = menos repetição visível). Base colore a textura com Monochrome desligado. Transparent = Tile PNG sai com alpha (meio-cinza vira transparente).',
    },
    ascii: {
      'Resolution': 'Columns = caracteres por linha (mais = mais detalhe, menor cada glyph). Font Size 0 = auto: preenche o canvas.',
      'Character Set': 'A rampa de caracteres do escuro ao claro. Custom aceita seus próprios caracteres, em ordem de densidade.',
      'Appearance': 'Original Colors pinta cada caractere com a cor da imagem; Monochrome usa uma cor só; Matrix = verde clássico. Background sólido ou transparente.',
      'Fine Tuning': 'Line Height = entrelinha da grade; Contrast empurra os tons pros extremos antes do mapeamento.',
    },
    reticula: {
      'Grid': 'Resolution = células na largura; Min/Max Size = faixa de tamanho dos pontos conforme o brilho; Angle gira a malha; Contrast reforça claro/escuro; Gap afasta os pontos.',
      'Shape': 'A forma de cada célula (círculo, quadrado, linha, texto...). Invert troca claro/escuro; Filled alterna cheio/contorno.',
    },
    pattern: {
      'Pattern': 'Shape = o motivo de cada célula (Quarter Arcs = Truchet clássico). Symmetry = a regra que gira/espelha as células: Random sorteia com seed, Mirror fecha loops, Rotate 90° cria sequências. Columns = densidade da malha.',
      'Motif': 'Scale = tamanho do motivo dentro da célula (>100 = motivos se tocam). Rotation gira todos igualmente. Weight = espessura dos traços (arcos/linhas/cruz). Gap encolhe a área útil da célula. Outline desenha as formas cheias só em contorno.',
      'Motion': 'Spin gira os motivos continuamente; Pulse faz a escala respirar. A onda percorre as células na ordem do Stagger (Center = do meio pra fora); Amount = defasagem. Speed é o relógio geral.',
      'Colors': 'Como as cores se distribuem: Cycle alterna as N cores pela malha, Checker = xadrez com 2, Random sorteia com seed, Single usa só a 1ª.',
      'Export': 'PNG = o canvas como está. Tile PNG = 1 período seamless do padrão (repete perfeito). SVG = o mesmo tile em vetor (abre no Illustrator/Figma). Tile e SVG congelam a animação.',
    },
    mockup: {
      'Art': 'Sua arte entra na cena: Upload, arraste no canvas ou cole (⌘V). Fit: Cover preenche o espaço (corta sobras), Contain mostra inteira. Zoom ajusta dentro do frame. Demo volta pro poster da marca.',
      'Scene': 'O mockup: poster emoldurado, camiseta, phone, cartão em perspectiva na mesa ou outdoor. Angle inclina o objeto (no cartão e outdoor muda a perspectiva). Surface = cor da parede/fundo; Accent = elementos da cena (verso do cartão, arco, pôr-do-sol).',
      'Light': 'Shadows = intensidade das sombras projetadas e dobras. Glow = luz de janela/reflexo de vidro/sol conforme a cena. Grain adiciona textura de filme sutil no resultado.',
      'Export': 'PNG no tamanho do canvas; PNG 2× dobra a resolução (bom pra post e portfólio). Tudo é vetorial-procedural — sem fotos, sem IA.',
    },
    shaper: {
      'Source': 'Imagem, vídeo ou webcam modulam o campo: no Field a luminância DOBRA as bandas (Warp); no Grid ela controla o tamanho da forma em cada célula. None = só a forma pura.',
      'Shape': 'A forma emissora do gradiente: as bandas emanam do CONTORNO dela (campo de distância). Text usa a palavra digitada; Blob é orgânico com seed (Re-roll); Draw = desenhe a forma direto no canvas arrastando.',
      'Gradient': 'Spacing = largura das bandas. Midtones desloca o meio da rampa (clareia/escurece os tons médios). Bands posteriza em N degraus (0 = suave). Dither adiciona grain que mata banding. Warp = quanto a fonte dobra as bandas. Repeat = bandas infinitas; Mirror = loop sem emenda na rampa.',
      'Grid': 'Campo de células: Columns = densidade; Size Min/Max = tamanho da forma conforme a luminosidade da fonte (Invert troca claro/escuro). Stagger defasa a fase do flow por célula — a onda percorre o grid.',
      'Motion': 'Flow faz as bandas emanarem do contorno (negativo = contraem). É o que dá vida ao MP4/GIF.',
    },
    palette: {
      'Source': 'Carregue uma imagem (botão, arraste ou ⌘V) e a paleta é extraída na hora. Demo/Reset volta pra composição da marca. Clicar na imagem dentro do canvas = conta-gotas (a cor vira a base das harmonias).',
      'Extract': 'Colors = quantas cores dominantes extrair (median cut: divide o espaço RGB pela mediana do canal mais largo até formar N grupos). Sort: Population = mais presente primeiro, Luminance = clara → escura, Hue = ordem da roda de cor (cinzas por último).',
      'Harmony': 'Paletas derivadas da base (clique num swatch grande pra trocar): Complementary = oposta (180°), Analogous = vizinhas ±30°, Triadic = 3 cores a 120°, Split = 150°/210°, Tetradic = 4 a 90°, Mono = mesma matiz em 5 luminosidades.',
      'Card': 'Aparência do cartão: Hex Labels mostra códigos e % de presença, Show Image inclui a imagem fonte, Background alterna cream/ink.',
      'Export': 'PNG = o cartão como está. ASE = swatches nativos do Adobe (Illustrator/Photoshop/InDesign). CSS = variáveis :root prontas pra colar. JSON = paleta + harmonias com rgb/hsl/população. Tudo inclui as harmonias visíveis.',
    },
    audiotype: {
      'Grid': 'Columns × Rows da grade de barras; Gap = espaço entre elas; Min/Max Size = faixa de tamanho conforme a luminosidade do texto/imagem.',
      'Mode': 'Barras horizontais, verticais ou pixel grid; o segundo select escolhe o eixo que reage ao áudio (altura, largura ou ambos).',
      'Audio Reactivity': 'Intensity = sensibilidade ao áudio; Frequency = faixa usada (graves/agudos/full); Smoothing suaviza a reação (baixo = nervoso, alto = fluido).',
      'Color Levels': 'Faixas de luminosidade → cor: de 2 a 8 níveis, cada um com sua cor, das sombras às luzes.',
    },
  },

  _tip: null,
  _pinned: false,

  init() {
    if (document.getElementById('helpTooltip')) return; // page has its own system
    const tool = location.pathname.split('/').pop().replace('.html', '');
    const map = this.TEXTS[tool];
    if (!map) return;
    let injected = 0;
    document.querySelectorAll('.section-title').forEach(el => {
      const key = el.textContent.trim();
      if (!map[key] || el.querySelector('.tipo-help-icon')) return;
      const s = document.createElement('span');
      s.className = 'tipo-help-icon';
      s.dataset.help = map[key];
      s.textContent = '?';
      el.appendChild(s);
      injected++;
    });
    if (injected) this._bind();
  },

  _bind() {
    const style = document.createElement('style');
    style.textContent = `
.tipo-help-icon { display:inline-flex; align-items:center; justify-content:center; width:13px; height:13px; border-radius:50%; border:1px solid var(--border-2,#3a3a3a); color:var(--text-5,#777); font-size:9px; font-weight:400; cursor:help; margin-left:6px; flex:none; user-select:none; text-transform:none; letter-spacing:0; vertical-align:middle; }
.tipo-help-icon:hover { border-color:var(--accent,#2A8A7A); color:var(--accent,#2A8A7A); }
#tipoHelpTip { position:fixed; z-index:9999; max-width:260px; background:var(--bg-2,#1e1e1e); border:1px solid var(--border-2,#3a3a3a); color:var(--text-2,#ccc); font-size:11px; line-height:1.55; padding:9px 11px; border-radius:6px; pointer-events:none; opacity:0; transition:opacity .15s; letter-spacing:0; text-transform:none; box-shadow:0 4px 16px rgba(0,0,0,.35); }
`;
    document.head.appendChild(style);
    const tip = document.createElement('div');
    tip.id = 'tipoHelpTip';
    document.body.appendChild(tip);
    this._tip = tip;

    const show = (icon) => {
      tip.textContent = icon.dataset.help;
      tip.style.opacity = '1';
      const r = icon.getBoundingClientRect();
      tip.style.left = '0px'; tip.style.top = '0px'; // reset before measuring
      const tw = tip.offsetWidth, th = tip.offsetHeight;
      let x = r.right + 10, y = r.top - 4;
      if (x + tw > window.innerWidth - 8) x = Math.max(8, r.left - tw - 10);
      if (y + th > window.innerHeight - 8) y = Math.max(8, window.innerHeight - th - 8);
      tip.style.left = x + 'px';
      tip.style.top = y + 'px';
    };
    const hide = () => { tip.style.opacity = '0'; this._pinned = false; };

    document.querySelectorAll('.tipo-help-icon').forEach(icon => {
      icon.addEventListener('mouseenter', () => { if (!this._pinned) show(icon); });
      icon.addEventListener('mouseleave', () => { if (!this._pinned) hide(); });
      icon.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this._pinned) { hide(); return; }
        show(icon);
        this._pinned = true;
      });
    });
    document.addEventListener('click', hide);
    const panel = document.querySelector('.tipo-panel');
    if (panel) panel.addEventListener('scroll', hide);
  },
};


/* ============================================================
   TIPÓ — Share via URL (12.3)
   "Link" button next to the export buttons: copies a URL with the
   whole control state serialized in the hash (#s=id:value;...).
   Opening such a link re-applies every value and dispatches
   input/change so the tool renders exactly what was shared.
   ============================================================ */

const TipoShare = {
  init() {
    const anchor = document.getElementById('tipoGifBtn')
      || document.getElementById('recBtn') || document.getElementById('recordBtn')
      || document.querySelector('[data-share-anchor]');
    if (!anchor || document.getElementById('tipoShareBtn')) return;
    const b = document.createElement('button');
    b.id = 'tipoShareBtn';
    b.type = 'button';
    b.className = anchor.className || 'btn btn-secondary';
    b.textContent = 'Link';
    b.title = 'Copy a link that carries all current settings';
    b.addEventListener('click', () => this.copy());
    anchor.insertAdjacentElement('afterend', b);

    // Apply state from the URL (again later for panels built by JS, e.g. dithering)
    this.apply();
    setTimeout(() => this.apply(), 900);
  },

  _controls() {
    return [...document.querySelectorAll(
      'input[type="range"],input[type="color"],input[type="checkbox"],input[type="text"],select'
    )].filter(el =>
      el.id &&
      !el.closest('#tipoTL') && !el.closest('#tipoBhvPop') && !el.closest('#tipoFontRow') &&
      !el.classList.contains('tipo-hex-input') &&
      el.dataset.noshare === undefined
    );
  },

  url() {
    const s = this._controls().map(el => {
      const v = el.type === 'checkbox' ? (el.checked ? 1 : 0)
        : el.type === 'color' ? el.value.slice(1)
        : el.value;
      return el.id + ':' + encodeURIComponent(v);
    }).join(';');
    return location.origin + location.pathname + '#s=' + s;
  },

  copy() {
    const u = this.url();
    const done = () => { if (TipoUI.showToast) TipoUI.showToast('Link copied — settings included'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(u).then(done, () => window.prompt('Copy this link:', u));
    } else {
      window.prompt('Copy this link:', u);
    }
  },

  apply() {
    const m = location.hash.match(/#s=(.+)/);
    if (!m) return;
    m[1].split(';').forEach(pair => {
      const i = pair.indexOf(':');
      if (i < 1) return;
      const el = document.getElementById(pair.slice(0, i));
      if (!el || el.closest('#tipoTL') || el.closest('#tipoBhvPop')) return;
      let v = decodeURIComponent(pair.slice(i + 1));
      if (el.type === 'checkbox') {
        el.checked = v === '1';
      } else {
        if (el.type === 'color' && v[0] !== '#') v = '#' + v;
        el.value = v;
        if (typeof TipoUI !== 'undefined' && el.type === 'color') TipoUI._syncHex(el);
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
  },
};


/* ============================================================
   TIPÓ — Fullscreen Mode (12.4)
   ⛶ button (or the F key) hides the panel and every floating
   control so the canvas takes the full viewport. F or ESC exits.
   A window resize event is dispatched so p5/canvas tools refit.
   ============================================================ */

const TipoFull = {
  on: false,
  _css: false,

  init() {
    if (!document.getElementById('recBtn') && !document.getElementById('recordBtn')
      && !document.querySelector('[data-share-anchor]')) return;
    if (document.querySelector('.tipo-full-btn')) return;
    this._injectCSS();
    const b = document.createElement('button');
    b.className = 'tipo-full-btn';
    b.title = 'Fullscreen canvas (F) — F or ESC exits';
    b.textContent = '⛶';
    b.addEventListener('click', () => this.toggle());
    document.body.appendChild(b);
    this._btn = b;

    document.addEventListener('keydown', (e) => {
      if (e.target && e.target.matches && e.target.matches('input,textarea,select')) return;
      if (e.key === 'f' || e.key === 'F') { e.preventDefault(); this.toggle(); }
      else if (e.key === 'Escape' && this.on) this.toggle();
    });
  },

  _injectCSS() {
    if (this._css) return;
    this._css = true;
    const s = document.createElement('style');
    s.textContent = `
.tipo-full-btn { position:fixed; top:14px; right:60px; z-index:8999; width:36px; height:36px; border-radius:50%; border:1px solid var(--border-2,#3a3a3a); background:var(--bg-1,#161616); color:var(--text-3,#bbb); font-size:15px; cursor:pointer; }
.tipo-full-btn:hover { border-color:var(--accent,#2A8A7A); color:var(--accent,#2A8A7A); }
body.tipo-full .tipo-panel, body.tipo-full #controlPanel, body.tipo-full .tipo-panel-toggle,
body.tipo-full .tipo-back-btn, body.tipo-full .tipo-theme-toggle, body.tipo-full .tipo-tl-toggle,
body.tipo-full #tipoTL { display:none !important; }
/* the ⛶ button STAYS visible as the way back — touch has no F/ESC */
body.tipo-full .tipo-full-btn { opacity:.55; }
body.tipo-full .tipo-full-btn:hover { opacity:1; }
`;
    document.head.appendChild(s);
  },

  toggle() {
    this.on = !this.on;
    document.body.classList.toggle('tipo-full', this.on);
    if (this._btn) {
      this._btn.textContent = this.on ? '✕' : '⛶';
      this._btn.title = this.on ? 'Exit fullscreen' : 'Fullscreen canvas (F) — F or ESC exits';
    }
    // panels collapse → canvases must refit to the new free space
    window.dispatchEvent(new Event('resize'));
    if (this.on && typeof TipoUI !== 'undefined' && TipoUI.showToast) {
      TipoUI.showToast(document.body.classList.contains('tipo-mobile')
        ? 'Fullscreen — toque no ✕ pra voltar'
        : 'Fullscreen — press F or ESC to exit');
    }
  },
};


// Auto-init: inject "~" buttons once the DOM is ready, and re-scan when
// tools create sliders dynamically (e.g. riso CMYK section, dithering panel)
/* ============================================================
   TIPÓ — Mobile bottom sheet (13.2)
   On small viewports the control panel becomes a draggable
   bottom sheet: tap the grip to open/close, drag to follow the
   finger. Presets are promoted to the top and every section
   collapses except the essentials — preset-first UX on mobile.
   ============================================================ */

const TipoMobile = {
  active: false,

  init() {
    if (!window.matchMedia('(max-width: 768px)').matches) return;
    const panel = document.querySelector('.tipo-panel') || document.getElementById('controlPanel');
    if (!panel || panel.querySelector('.tipo-sheet-grip')) return;
    this.active = true;
    document.body.classList.add('tipo-mobile');

    // grip: the only part visible in the peek state
    const grip = document.createElement('div');
    grip.className = 'tipo-sheet-grip';
    grip.innerHTML = '<span class="tipo-sheet-bar"></span><span class="tipo-sheet-label">Ajustes</span>';
    panel.insertBefore(grip, panel.firstChild);

    // tap toggles; drag follows the finger and snaps on release
    let startY = null, baseOff = 0, panelH = 0, moved = false;
    grip.addEventListener('pointerdown', e => {
      startY = e.clientY;
      moved = false;
      panelH = panel.getBoundingClientRect().height;
      baseOff = panel.classList.contains('sheet-open') ? 0 : panelH - 54;
      panel.classList.add('sheet-drag');
      grip.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    grip.addEventListener('pointermove', e => {
      if (startY === null) return;
      const dy = e.clientY - startY;
      if (Math.abs(dy) > 6) moved = true;
      const off = Math.max(0, Math.min(panelH - 54, baseOff + dy));
      panel.style.transform = `translateY(${off}px)`;
    });
    const setOpen = open => {
      panel.classList.toggle('sheet-open', open);
      // split view: canvas resizes to the space above the sheet so the user
      // tweaks AND watches at the same time (like desktop side-by-side)
      document.body.classList.toggle('tipo-sheet-open', open);
      setTimeout(() => window.dispatchEvent(new Event('resize')), 320);
    };
    const finish = e => {
      if (startY === null) return;
      panel.classList.remove('sheet-drag');
      panel.style.transform = '';
      if (!moved) {
        setOpen(!panel.classList.contains('sheet-open'));
      } else {
        const dy = e.clientY - startY;
        const open = baseOff === 0 ? dy < panelH * 0.3 : dy < -40;
        setOpen(open);
      }
      startY = null;
    };
    grip.addEventListener('pointerup', finish);
    grip.addEventListener('pointercancel', finish);

    // presets first: mobile flow is preset-driven
    const sections = [...panel.querySelectorAll('.section')];
    const presetSec = sections.find(s => s.querySelector('.preset-grid'));
    const textSec = sections.find(s => s.querySelector('#textInput'));
    if (presetSec) (textSec || panel.querySelector('h1') || grip).insertAdjacentElement('afterend', presetSec);

    // collapsible sections — fold everything but the essentials
    const KEEP_OPEN = ['text', 'presets', 'preset', 'source', 'export'];
    panel.querySelectorAll('.section').forEach(sec => {
      const title = sec.querySelector('.section-title');
      if (!title) return;
      const name = title.textContent.trim().toLowerCase();
      if (!KEEP_OPEN.some(k => name.startsWith(k))) sec.classList.add('sec-collapsed');
      title.addEventListener('click', e => {
        if (e.target.classList && e.target.classList.contains('tipo-help-icon')) return;
        sec.classList.toggle('sec-collapsed');
      });
    });

    // panels swap from side column to overlay — let canvases refit.
    // p5 sketches boot AFTER DOMContentLoaded, so fire again later and on load.
    const refit = () => window.dispatchEvent(new Event('resize'));
    requestAnimationFrame(refit);
    setTimeout(refit, 600);
    setTimeout(refit, 1500);
    window.addEventListener('load', () => setTimeout(refit, 100));
  },
};

/* ============================================================
   TIPÓ — Canvas format presets (13.3)
   Floating pill cycles FREE → 9:16 → 1:1 → 4:5 → 16:9. It
   letterboxes the canvas CONTAINER — every tool reads container
   size and refits on resize, so preview, PNG, MP4 and GIF all
   come out in the chosen social aspect. Universal by design.
   ============================================================ */

const TipoFormat = {
  RATIOS: [['free', 0], ['9:16', 9 / 16], ['1:1', 1], ['4:5', 4 / 5], ['16:9', 16 / 9]],
  idx: 0,
  _container: null,
  _btn: null,

  init() {
    const c = document.getElementById('canvasContainer')
      || document.getElementById('canvasWrap') || document.getElementById('canvasArea');
    if (!c || this._btn) return;
    this._container = c;
    const style = document.createElement('style');
    style.textContent = `
.tipo-fmt-btn { position:fixed; top:18px; right:108px; z-index:8999; height:28px; padding:0 12px;
  border-radius:14px; border:1px solid var(--border-2,#3a3a3a); background:var(--bg-1,#161616);
  color:var(--text-4,#999); font-family:var(--font-ui,monospace); font-size:9px; letter-spacing:1.5px;
  cursor:pointer; }
.tipo-fmt-btn:hover { border-color:var(--accent,#2A8A7A); color:var(--accent,#2A8A7A); }
.tipo-fmt-btn.active { border-color:var(--accent,#2A8A7A); color:var(--accent,#2A8A7A); font-weight:700; }
body.tipo-full .tipo-fmt-btn { display:none !important; }
.tipo-mobile .tipo-fmt-btn { top:auto; bottom:68px; right:12px; }
`;
    document.head.appendChild(style);
    const b = document.createElement('button');
    b.className = 'tipo-fmt-btn';
    b.title = 'Formato do canvas: Stories 9:16, feed 1:1 / 4:5, wide 16:9';
    b.textContent = 'FREE';
    b.addEventListener('click', () => this.setIdx((this.idx + 1) % this.RATIOS.length));
    document.body.appendChild(b);
    this._btn = b;
    window.addEventListener('resize', () => this.apply());
    // mobile: formats live as big chips inside the Export section (the pill
    // is hidden by CSS) — Stories/feed framing one tap from the export buttons
    if (document.body.classList.contains('tipo-mobile')) this._initMobileChips();
  },

  setIdx(i) {
    this.idx = i;
    if (this._btn) {
      this._btn.textContent = this.RATIOS[i][0].toUpperCase();
      this._btn.classList.toggle('active', i !== 0);
    }
    if (this._chips) {
      this._chips.forEach((c, j) => c.classList.toggle('active', j === i));
    }
    this.apply();
  },

  _initMobileChips() {
    const secs = [...document.querySelectorAll('.section')];
    const exp = secs.find(s => {
      const t = s.querySelector('.section-title');
      return t && /export/i.test(t.textContent);
    });
    if (!exp) return;
    const wrap = document.createElement('div');
    wrap.id = 'tipoFmtChips';
    const label = document.createElement('div');
    label.style.cssText = 'font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--text-5,#777);margin:2px 0 6px;';
    label.textContent = 'Formato · Stories / Feed';
    const grid = document.createElement('div');
    grid.className = 'preset-grid';
    this._chips = this.RATIOS.map(([name], i) => {
      const chip = document.createElement('span');
      chip.className = 'preset-chip' + (i === this.idx ? ' active' : '');
      chip.textContent = i === 0 ? 'Livre' : name;
      chip.addEventListener('click', () => this.setIdx(i));
      grid.appendChild(chip);
      return chip;
    });
    wrap.appendChild(label);
    wrap.appendChild(grid);
    const title = exp.querySelector('.section-title');
    (title || exp.firstChild).insertAdjacentElement('afterend', wrap);
  },

  apply() {
    const c = this._container;
    if (!c) return;
    const ar = this.RATIOS[this.idx][1];
    if (!ar) {
      if (c.dataset.tipoFmt) {
        delete c.dataset.tipoFmt;
        c.style.flex = ''; c.style.width = ''; c.style.height = '';
        c.style.margin = ''; c.style.alignSelf = ''; c.style.outline = '';
        window.dispatchEvent(new Event('resize'));
      }
      return;
    }
    let availW = window.innerWidth, availH = window.innerHeight;
    const panel = document.querySelector('.tipo-panel') || document.getElementById('controlPanel');
    if (panel && !document.body.classList.contains('tipo-mobile')
      && !document.body.classList.contains('tipo-full')
      && getComputedStyle(panel).position !== 'fixed') {
      availW -= panel.getBoundingClientRect().width;
    }
    if (document.body.classList.contains('tipo-sheet-open')) availH = Math.round(availH * 0.54);
    availW = Math.max(80, availW - 20);
    availH = Math.max(80, availH - 20);
    const w = Math.round(Math.min(availW, availH * ar));
    const h = Math.round(w / ar);
    const changed = c.style.width !== w + 'px' || c.style.height !== h + 'px';
    c.dataset.tipoFmt = '1';
    c.style.flex = 'none';
    c.style.width = w + 'px';
    c.style.height = h + 'px';
    if (document.body.classList.contains('tipo-sheet-open')) {
      // anchor in the visible strip above the half-sheet, not the full viewport
      const top = Math.max(0, (window.innerHeight * 0.54 - h) / 2);
      c.style.margin = top + 'px auto auto';
    } else {
      c.style.margin = 'auto';
    }
    c.style.alignSelf = 'center';
    c.style.outline = '1px solid var(--border-2, #3a3a3a)';
    if (changed) window.dispatchEvent(new Event('resize')); // tools refit; guarded: no-op when unchanged
  },
};

if (typeof document !== 'undefined') {
  const boot = () => {
    TipoBehavior.scan();
    TipoTimeline.init();
    TipoFont.init();
    TipoGIF.init();
    TipoShare.init();
    TipoFull.init();
    TipoHelp.init();
    // gold dot signature after the tool title (mirrors the TIPÓ• logo)
    const h1 = document.querySelector('.tipo-panel h1, #controlPanel h1');
    if (h1 && !h1.querySelector('.tipo-h1-dot') && h1.firstChild) {
      const dot = document.createElement('span');
      dot.className = 'tipo-h1-dot';
      h1.insertBefore(dot, h1.firstChild.nextSibling);
    }
    TipoMobile.init();
    TipoFormat.init();
    // MP4s go through TipoRecorder.download — route them through the
    // share-aware deliver path on mobile
    if (TipoMobile.active && typeof TipoRecorder !== 'undefined') {
      TipoRecorder.download = (blob, filename) => TipoUI._downloadBlob(blob, filename);
    }
    let pending = null;
    new MutationObserver(() => {
      if (pending) return;
      pending = setTimeout(() => { pending = null; TipoBehavior.scan(); }, 200);
    }).observe(document.body, { childList: true, subtree: true });
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}
