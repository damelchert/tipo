(function initFotogramaProviders(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.TipoFotogramaProviders = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function buildFotogramaProviders() {
  'use strict';

  const ALL_RATIOS = ['21:9', '16:9', '3:2', '4:3', '5:4', '1:1', '4:5', '3:4', '2:3', '9:16'];
  const SEEDREAM_LITE_RATIOS = ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'];
  const SEEDREAM_PRO_RATIOS = ['21:9', '16:9', '3:2', '4:3', '1:1', '3:4', '2:3', '9:16'];
  const SEEDREAM_45_RATIOS = ['21:9', '16:9', '3:2', '4:3', '1:1', '3:4', '2:3', '9:16'];
  const GPT_IMAGE_RATIOS = ['21:9', '16:9', '3:2', '4:3', '1:1', '3:4', '2:3', '9:16'];

  // Custos verificados na conta Creator em 20/08/2026. São estimativas de UI:
  // o bridge devolve o saldo real depois que o CLI concluir o job.
  const HIGGSFIELD_MODELS = Object.freeze([
    Object.freeze({
      name: 'nano_banana_2', label: 'Nano Banana Pro', cost: 2,
      costs: Object.freeze({ '2K': 2, '4K': 4 }),
      resolutions: ['2K', '4K'], aspectRatios: ALL_RATIOS, promptMode: 'measured-description',
    }),
    Object.freeze({
      name: 'nano_banana_flash', label: 'Nano Banana 2', cost: 2,
      costs: Object.freeze({ '2K': 2, '4K': 3 }),
      resolutions: ['2K', '4K'], aspectRatios: ALL_RATIOS,
    }),
    Object.freeze({
      name: 'seedream_v5_lite', label: 'Seedream 5 Lite', cost: 1,
      resolutions: [], aspectRatios: SEEDREAM_LITE_RATIOS,
    }),
    Object.freeze({
      name: 'seedream_v5_pro', label: 'Seedream 5 Pro', cost: 3,
      resolutions: ['2K'], aspectRatios: SEEDREAM_PRO_RATIOS,
    }),
    Object.freeze({
      name: 'seedream_v4_5', label: 'Seedream 4.5', cost: 1,
      resolutions: [], aspectRatios: SEEDREAM_45_RATIOS,
    }),
    Object.freeze({
      name: 'gpt_image_2', label: 'GPT Image 2', cost: 7,
      costs: Object.freeze({ '2K': 7, '4K': 12 }),
      resolutions: ['2K', '4K'], aspectRatios: GPT_IMAGE_RATIOS,
    }),
  ]);

  const modelByName = name => HIGGSFIELD_MODELS.find(model => model.name === name) || null;
  const estimateCost = (model, resolution) => {
    const config = typeof model === 'string' ? modelByName(model) : model;
    if (!config) return null;
    return (config.costs && config.costs[String(resolution || '').toUpperCase()]) || config.cost;
  };

  function normalizeBridgeUrl(value, base) {
    const raw = String(value || '').trim() || 'http://127.0.0.1:4789';
    const url = new URL(raw, base || 'http://127.0.0.1');
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('O bridge precisa usar HTTP ou HTTPS');
    if (url.username || url.password) throw new Error('Não coloque credenciais na URL do bridge');
    const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
    if (url.protocol !== 'https:' && !loopback) throw new Error('Bridge remoto precisa usar HTTPS');
    url.hash = '';
    url.search = '';
    return url.href.replace(/\/$/, '');
  }

  class ProviderError extends Error {
    constructor(message, status, detail) {
      super(message);
      this.name = 'ProviderError';
      this.status = status || 0;
      this.detail = String(detail || '').slice(0, 240);
    }
  }

  class HiggsfieldBridgeAdapter {
    constructor(baseUrl, options) {
      this.baseUrl = normalizeBridgeUrl(baseUrl);
      this.timeoutMs = (options && options.timeoutMs) || 22 * 60 * 1000;
    }

    async request(path, options) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await fetch(`${this.baseUrl}${path}`, {
          ...(options || {}),
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
            ...((options && options.body) ? { 'Content-Type': 'application/json' } : {}),
            ...((options && options.headers) || {}),
          },
        });
        let payload = null;
        try { payload = await response.json(); } catch (error) {}
        if (!response.ok) {
          throw new ProviderError(
            (payload && payload.error) || `Higgsfield bridge respondeu ${response.status}`,
            response.status,
            payload && payload.detail,
          );
        }
        return payload || {};
      } catch (error) {
        if (error && error.name === 'AbortError') throw new ProviderError('Higgsfield demorou além do limite', 504);
        if (error instanceof ProviderError) throw error;
        throw new ProviderError('Não consegui alcançar o Higgsfield bridge', 0, error && error.message);
      } finally {
        clearTimeout(timer);
      }
    }

    health() {
      return this.request('/health', { method: 'GET' });
    }

    generate(input) {
      return this.request('/generate', { method: 'POST', body: JSON.stringify(input) });
    }

    runTool(input) {
      return this.request('/tool', { method: 'POST', body: JSON.stringify(input) });
    }
  }

  class ProviderRouter {
    constructor() { this.adapters = new Map(); }
    register(name, adapter) {
      if (!name || !adapter || typeof adapter.generate !== 'function') throw new Error('Adapter de imagem inválido');
      this.adapters.set(name, adapter);
      return this;
    }
    async generate(name, input) {
      const adapter = this.adapters.get(name);
      if (!adapter) throw new Error(`Provedor de imagem indisponível: ${name}`);
      return adapter.generate(input);
    }
  }

  return {
    HIGGSFIELD_MODELS,
    HiggsfieldBridgeAdapter,
    ProviderError,
    ProviderRouter,
    estimateCost,
    modelByName,
    normalizeBridgeUrl,
  };
});
