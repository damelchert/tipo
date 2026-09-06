(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.TipoFotogramaStudio = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Inventory only. Stored generation instructions are not read by this UI.
  function summarize(takes) {
    const rows = new Map();
    for (const take of takes || []) {
      const p = take.params || {};
      const provider = p.provider || (p.utilityTool ? 'higgsfield' : 'não registrado');
      const model = p.generatedModel || p.generation?.model || p.model || 'não registrado';
      const tool = p.utilityTool || 'create';
      const key = JSON.stringify([provider, tool, model]);
      const row = rows.get(key) || { provider, tool, model, count: 0 };
      row.count++;
      rows.set(key, row);
    }
    return { count: (takes || []).length, rows: [...rows.values()].sort((a, b) => b.count - a.count) };
  }

  function mount({ getTakes }) {
    const $ = id => document.getElementById(id);
    const button = document.createElement('button');
    button.id = 'studioReviewOpen'; button.type = 'button'; button.textContent = 'Uso';
    button.className = 'studio-button'; button.setAttribute('aria-label', 'Ver uso local da galeria');
    $('workspaceHeader').appendChild(button);
    const dialog = document.createElement('dialog');
    dialog.id = 'studioReview'; dialog.setAttribute('aria-labelledby', 'studioReviewTitle');
    dialog.innerHTML = `
      <header class="studio-heading"><div><span class="studio-eyebrow">Fotograma / galeria</span><h2 id="studioReviewTitle">Uso local.</h2></div><button class="studio-button" id="studioReviewClose" type="button" aria-label="Fechar uso local">Fechar ×</button></header>
      <section id="studioUsage">
        <p class="studio-intro">Um resumo das imagens salvas neste navegador, por ferramenta, provedor e modelo. Não é o extrato completo da sua conta: não inclui tentativas falhas, imagens excluídas ou análises auxiliares.</p>
        <div class="studio-metrics"><article><span>Imagens salvas</span><strong id="studioSavedCount">0</strong></article><article><span>Gasto real</span><strong>Não informado</strong><small>Não recebemos cobrança por imagem; valor desconhecido não significa US$ 0.</small></article></div>
        <div class="studio-table-wrap"><table><caption>Resultados por provedor, ferramenta e modelo</caption><thead><tr><th>Provedor</th><th>Ferramenta</th><th>Modelo</th><th>Imagens</th></tr></thead><tbody id="studioUsageRows"></tbody></table></div>
        <p id="studioUsageEmpty" hidden>Sua contagem começa quando uma imagem é salva na galeria.</p>
        <p>Planos e créditos variam por provedor. Consulte sua conta para conferir cobranças. O histórico local depende do armazenamento deste navegador.</p>
      </section>`;
    document.body.appendChild(dialog);

    function renderUsage() {
      const result = summarize(getTakes());
      $('studioSavedCount').textContent = result.count.toLocaleString('pt-BR');
      $('studioUsageEmpty').hidden = result.count > 0;
      const labels = { create: 'Create', cast: 'Cast', product: 'Product', sheets: 'Sheets', styleShift: 'Animation', expand: 'Expand', removeBg: 'Remove BG', multiAngle: 'Multi Angle' };
      $('studioUsageRows').replaceChildren(...result.rows.map(row => {
        const tr = document.createElement('tr');
        [row.provider, labels[row.tool] || row.tool, row.model, row.count].forEach(value => {
          const td = document.createElement('td'); td.textContent = String(value); tr.appendChild(td);
        });
        return tr;
      }));
    }
    button.addEventListener('click', () => {
      renderUsage(); $('keyPop').classList.remove('open');
      dialog.showModal(); $('studioReviewClose').focus();
    });
    $('studioReviewClose').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => button.focus());

    const accountObserver = new MutationObserver(() => {
      const open = $('keyPop').classList.contains('open'); $('keyBtn').setAttribute('aria-expanded', String(open));
      if (open) $('keyClose').focus();
    });
    accountObserver.observe($('keyPop'), { attributes: true, attributeFilter: ['class'] });
    $('keyPop').addEventListener('keydown', event => {
      if (event.key === 'Escape') { $('keyPop').classList.remove('open'); $('keyBtn').focus(); }
      if (event.key !== 'Tab') return;
      const controls = [...$('keyPop').querySelectorAll('button, input, select, summary, a')].filter(el => !el.disabled && el.getClientRects().length);
      const first = controls[0], last = controls.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
  }
  return { summarize, mount };
});
