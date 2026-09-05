(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.TipoFotogramaStudio = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // This is an inventory of saved results, not an account billing ledger.
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

  function mount({ getTakes, describePrompt }) {
    const $ = id => document.getElementById(id);
    const button = document.createElement('button');
    button.id = 'studioReviewOpen'; button.type = 'button'; button.textContent = 'Prompts & uso';
    button.className = 'studio-button';
    $('workspaceHeader').appendChild(button);
    const dialog = document.createElement('dialog');
    dialog.id = 'studioReview'; dialog.setAttribute('aria-labelledby', 'studioReviewTitle');
    // Static markup only. All user prompts and gallery metadata use textContent.
    dialog.innerHTML = `
      <header class="studio-heading"><div><span class="studio-eyebrow">Fotograma / transparência</span><h2 id="studioReviewTitle">Por trás da imagem.</h2></div><button class="studio-button" id="studioReviewClose" type="button" aria-label="Fechar revisão">Fechar ×</button></header>
      <nav class="studio-tabs" aria-label="Revisão"><button class="studio-button" id="studioPromptsTab" type="button" aria-pressed="true">Prompts</button><button class="studio-button" id="studioUsageTab" type="button" aria-pressed="false">Uso local</button><button class="studio-button" id="studioLooksTab" type="button" aria-pressed="false">Perfis de cinema</button></nav>
      <section id="studioPrompts"><p class="studio-intro">Veja as instruções que a Tipó realmente usa. Naturalista, Editorial e Experimental mudam a fotografia, não o conteúdo da cena. Perfis de cinema são outra opção, sem empilhar esses looks. Nenhum preset altera os pesos do modelo ou garante fidelidade por si só.</p>
        <div class="studio-picker"><label for="studioPromptSelect">Ferramenta ou etapa</label><select id="studioPromptSelect"><option value="create">Create · prompt compilado</option><option value="cast">Cast</option><option value="product">Product</option><option value="sheets">Sheets</option><option value="styleShift">Animation · imagem estática</option><option value="expand">Expand</option><option value="removeBg">Remove BG</option><option value="director">Enriquecer a cena</option><option value="mood">Análise da Emulsão</option><option value="refs">Análise das referências</option><option value="ficha">Ficha técnica</option></select></div>
        <article class="studio-prompt-card"><div class="studio-card-head"><h3 id="studioPromptTitle"></h3><button id="studioPromptCopy" class="studio-button" type="button">Copiar</button></div><p id="studioPromptNote"></p><pre id="studioPromptBody"></pre><output id="studioPromptCount"></output></article>
        <div class="studio-picker"><label for="studioTakeSelect">Prompt realmente enviado · resultados salvos</label><select id="studioTakeSelect"></select></div><p id="studioTakeNote"></p><pre id="studioTakePrompt"></pre>
      </section>
      <section id="studioUsage" hidden><p class="studio-intro">Somente resultados presentes na galeria deste navegador. Não é o extrato completo da sua conta, nem inclui tentativas falhas, imagens excluídas ou análises auxiliares.</p><div class="studio-metrics"><article><span>Imagens salvas</span><strong id="studioSavedCount">0</strong></article><article><span>Gasto real</span><strong>Não informado</strong><small>Sem dados de cobrança por job; desconhecido não significa US$ 0.</small></article></div><div class="studio-table-wrap"><table><caption>Resultados por provedor, ferramenta e modelo</caption><thead><tr><th>Provedor</th><th>Ferramenta</th><th>Modelo</th><th>Imagens</th></tr></thead><tbody id="studioUsageRows"></tbody></table></div><p>Planos, Unlimited e créditos variam por provedor e canal. Consulte a conta para cobranças. O histórico local permanece sujeito aos limites de armazenamento do navegador.</p></section>
      <section id="studioLooks" hidden><p class="studio-intro">Leituras autorais de trabalhos de cada dupla, com fontes de produção. Não são os prompts privados da plataforma de referência. Câmeras e lentes citadas são exemplos de projetos específicos, não equipamento fixo de um diretor.</p><div id="studioLookCards"></div></section>
      <output id="studioReviewStatus" role="status"></output>`;
    document.body.appendChild(dialog);

    function renderPrompt() {
      try {
        const data = describePrompt($('studioPromptSelect').value);
        $('studioPromptTitle').textContent = data.title;
        $('studioPromptNote').textContent = data.note;
        $('studioPromptBody').textContent = data.body;
        $('studioPromptCount').textContent = `${data.body.length.toLocaleString('pt-BR')} caracteres · revisão local, sem chamada de IA`;
      } catch (error) { $('studioPromptTitle').textContent = 'Revise o brief'; $('studioPromptNote').textContent = 'Nenhuma geração foi enviada.'; $('studioPromptCount').textContent = ''; $('studioPromptBody').textContent = error.message; }
    }
    function renderTake() {
      const take = getTakes().find(t => t.id === $('studioTakeSelect').value);
      $('studioTakePrompt').textContent = take?.params?.prompt || 'Este resultado não tem o prompt registrado.';
      $('studioTakeNote').textContent = take
        ? `${take.params?.promptVersion || 'Versão anterior'}${take.params?.directionLabel ? ' · ' + take.params.directionLabel : ''} · ${take.params?.generatedModel || take.params?.model || take.params?.generation?.model || 'modelo não registrado'}${take.params?.inputLabels?.length ? '\n' + take.params.inputLabels.join('\n') : ''}`
        : 'Ao gerar, o prompt real fica salvo com a imagem. Não reconstruímos prompts antigos com as configurações atuais.';
    }
    function renderUsage() {
      const result = summarize(getTakes());
      $('studioSavedCount').textContent = result.count.toLocaleString('pt-BR');
      $('studioUsageRows').replaceChildren(...result.rows.map(row => {
        const tr = document.createElement('tr');
        [row.provider, row.tool, row.model, row.count].forEach(value => { const td = document.createElement('td'); td.textContent = String(value); tr.appendChild(td); });
        return tr;
      }));
    }
    function renderLooks() {
      $('studioLookCards').replaceChildren(...window.TipoFotogramaDirection.DIRECTIONS.map(profile => {
        const card = document.createElement('article'); card.className = 'studio-prompt-card';
        const title = document.createElement('h3'); title.textContent = profile.label;
        const note = document.createElement('p'); note.textContent = profile.note;
        const camera = document.createElement('p'); camera.textContent = profile.cameraNote;
        const rules = document.createElement('pre'); rules.textContent = Object.entries(profile.slots).map(([slot, text]) => `${slot}: ${text}`).join('\n\n');
        card.append(title, note, camera, rules);
        for (const source of profile.sources || []) {
          const link = document.createElement('a');
          const url = typeof source === 'string' ? source : source.url;
          if (!/^https:\/\//.test(url || '')) continue;
          link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = typeof source === 'string' ? new URL(url).hostname : source.title || source.label || new URL(url).hostname;
          card.appendChild(link);
        }
        return card;
      }));
    }
    function open() {
      const options = getTakes().map(take => { const option = document.createElement('option'); option.value = take.id; option.textContent = `${new Date(take.ts).toLocaleString('pt-BR')} · ${take.caption || 'Imagem'}`; return option; });
      $('studioTakeSelect').replaceChildren(...options); $('studioTakeSelect').disabled = !options.length;
      renderPrompt(); renderTake(); renderUsage(); renderLooks();
      $('keyPop').classList.remove('open');
      dialog.showModal(); $('studioReviewClose').focus();
    }
    button.addEventListener('click', open);
    $('studioReviewClose').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => button.focus());
    $('studioPromptSelect').addEventListener('change', renderPrompt);
    $('studioTakeSelect').addEventListener('change', renderTake);
    $('studioPromptCopy').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText($('studioPromptBody').textContent); $('studioReviewStatus').textContent = 'Prompt copiado.'; }
      catch { $('studioReviewStatus').textContent = 'Selecione o texto do prompt para copiar.'; }
    });
    for (const [name, pane] of [['Prompts', 'studioPrompts'], ['Usage', 'studioUsage'], ['Looks', 'studioLooks']]) {
      $(`studio${name}Tab`).addEventListener('click', () => {
        for (const [other, id] of [['Prompts', 'studioPrompts'], ['Usage', 'studioUsage'], ['Looks', 'studioLooks']]) { $(id).hidden = id !== pane; $(`studio${other}Tab`).setAttribute('aria-pressed', String(id === pane)); }
      });
    }
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
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
  }
  return { summarize, mount };
});
