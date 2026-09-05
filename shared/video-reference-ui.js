/* Local reference preparation. Never sends media to Google or Higgsfield. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let initialized = false, source = null, controller = null, busy = false;
  const resultURLs = [];
  const abortError = () => new DOMException('Cancelado', 'AbortError');
  const bytes = n => n < 1048576 ? `${Math.round(n / 1024)} KB` : `${(n / 1048576).toFixed(1)} MB`;
  const time = value => `${Math.floor(value / 60)}:${(value % 60).toFixed(1).padStart(4, '0')}`;

  function init() {
    if (initialized) return;
    initialized = true;
    $('videoReferenceControls').innerHTML = `
      <p class="vr-intro">Transforme uma referência em um loop leve ou em frames com timestamps. Sem chave. Sem créditos de IA.</p>
      <fieldset id="vrSourceFields" class="vr-card">
        <legend>01 / Seu vídeo</legend>
        <button id="vrUpload" class="btn btn-secondary" type="button">Escolher vídeo</button>
        <input id="vrFile" type="file" accept="video/*,.mp4,.mov,.webm,.m4v" hidden>
        <p class="vr-hint">MP4, MOV ou WebM compatível com seu navegador. Até 300 MB no upload.</p>
        <label for="vrLink">Ou cole um link direto</label>
        <div class="vr-link-row"><input id="vrLink" type="url" placeholder="https://…/video.mp4" autocomplete="off" spellcheck="false"><button id="vrLoadLink" type="button" class="btn btn-secondary">Abrir</button></div>
        <p class="vr-hint">O servidor precisa permitir acesso externo (CORS). Links de páginas do YouTube, Vimeo ou Instagram não são arquivos de vídeo.</p>
        <button id="vrClear" type="button" class="vr-text-button" hidden>Remover vídeo</button>
      </fieldset>
      <fieldset id="vrOptions" class="vr-card" disabled>
        <legend>02 / Trecho & saída</legend>
        <label for="vrMode">O que exportar</label>
        <select id="vrMode"><option value="both">GIF + prancha de frames</option><option value="gif">Somente GIF animado</option><option value="sheet">Somente prancha para análise</option></select>
        <div class="vr-two"><label for="vrStart">Início (s)<input id="vrStart" type="number" min="0" step="0.1" value="0"></label><label for="vrEnd">Fim (s)<input id="vrEnd" type="number" min="0.1" step="0.1" value="8"></label></div>
        <div class="vr-two"><button id="vrMarkStart" type="button" class="vr-text-button">Usar posição inicial</button><button id="vrMarkEnd" type="button" class="vr-text-button">Usar posição final</button></div>
        <p class="vr-hint">GIF: até 30 segundos por trecho. Prancha: pode cobrir o vídeo inteiro.</p>
        <div id="vrGifOptions">
          <label for="vrPreset">Preset do GIF</label>
          <select id="vrPreset"><option value="compact">Compacto · arquivo menor</option><option value="balanced" selected>Equilibrado · referência visual</option><option value="motion">Movimento · mais fluido</option><option value="custom">Personalizado</option></select>
          <div class="vr-two"><label for="vrWidth">Lado maior<select id="vrWidth"><option value="320">320 px</option><option value="512" selected>512 px</option><option value="720">720 px</option></select></label><label for="vrFPS">Frames por segundo<select id="vrFPS"><option value="3">3 FPS</option><option value="6" selected>6 FPS</option><option value="12">12 FPS</option></select></label></div>
          <label for="vrColors">Cores da paleta</label><select id="vrColors"><option value="64">64 · menor</option><option value="128" selected>128 · equilibrado</option><option value="256">256 · mais cor</option></select>
        </div>
        <div id="vrSheetOptions"><label for="vrSheetFrames">Frames na prancha</label><select id="vrSheetFrames"><option value="6">6 frames</option><option value="9" selected>9 frames</option><option value="12">12 frames</option></select></div>
      </fieldset>
      <div class="vr-notice"><strong>Para analisar no GPT</strong><p>A prancha JPG mostra a sequência em uma imagem estática. Um GIF animado pode não ser interpretado por inteiro — e pode ficar maior que o MP4 original. Arquivo menor não garante menos tokens: dimensões, detalhe e modelo também contam. Nenhuma saída inclui áudio.</p><a href="https://developers.openai.com/api/docs/guides/images-vision#image-input-requirements" target="_blank" rel="noopener noreferrer">Requisitos de imagem da OpenAI ↗</a></div>
      <div class="vr-actions"><div id="vrEstimate" class="vr-hint">Adicione um vídeo para começar.</div><button id="vrGenerate" class="btn" type="button" disabled>Gerar GIF + prancha</button><button id="vrCancel" class="btn btn-secondary" type="button" hidden>Cancelar</button><progress id="vrProgress" max="100" value="0" aria-label="Progresso da conversão" hidden></progress><div id="vrStatus" role="status" aria-live="polite"></div></div>`;
    $('videoReferenceWorkspace').innerHTML = `
      <header class="vr-workspace-head"><div><span class="vr-eyebrow">Referência em movimento</span><h2>Menos arquivo.<br>Mais contexto.</h2></div><span class="vr-local">Processamento local</span></header>
      <div id="vrDrop" class="vr-drop"><button id="vrDropPick" type="button"><span aria-hidden="true">▻</span><strong>Solte seu vídeo aqui</strong><span>ou clique para escolher um arquivo</span></button></div>
      <figure id="vrSourceView" class="vr-source" hidden><video id="vrPreview" controls playsinline muted preload="metadata" aria-label="Vídeo de origem"></video><figcaption><span id="vrSourceInfo"></span><span>Original · sem alterações</span></figcaption></figure>
      <div id="vrResults" hidden><div class="vr-results-head"><h3>Pronto para compartilhar</h3><p>Exportações desta sessão. Baixe antes de fechar a página.</p></div><div id="vrResultGrid"></div></div>`;
    wireEvents();
  }

  function setStatus(message, error = false) {
    $('vrStatus').textContent = message;
    $('vrStatus').classList.toggle('vr-error', error);
  }

  function options() {
    return { mode: $('vrMode').value, start: Number($('vrStart').value), end: Number($('vrEnd').value),
      fps: Number($('vrFPS').value), width: Number($('vrWidth').value), colors: Number($('vrColors').value), sheetFrames: Number($('vrSheetFrames').value) };
  }

  function update() {
    const opts = options(), duration = opts.end - opts.start;
    $('vrGifOptions').hidden = opts.mode === 'sheet';
    $('vrSheetOptions').hidden = opts.mode === 'gif';
    $('vrSourceFields').disabled = busy;
    $('vrOptions').disabled = busy || !source;
    $('vrDropPick').disabled = busy;
    $('vrCancel').hidden = !busy;
    $('vrGenerate').textContent = busy ? 'Processando…' : opts.mode === 'gif' ? 'Gerar GIF' : opts.mode === 'sheet' ? 'Gerar prancha JPG' : 'Gerar GIF + prancha';
    let invalid = '';
    if (source) {
      if ($('vrStart').value === '' || $('vrEnd').value === '') invalid = 'Informe início e fim do trecho.';
      else try { window.VideoReferenceEngine.validateOptions(source.decoder, opts); } catch (error) { invalid = error.message; }
    }
    $('vrGenerate').disabled = busy || !source || !!invalid;
    $('vrEstimate').textContent = !source ? 'Adicione um vídeo para começar.' : invalid || `${duration.toFixed(1)} s selecionados${opts.mode !== 'sheet' ? ` · ~${Math.ceil(duration * opts.fps)} frames no GIF` : ''}${opts.mode !== 'gif' ? ` · ${opts.sheetFrames} frames na prancha` : ''}`;
    $('vrEstimate').classList.toggle('vr-error', !!invalid);
    $('vrPreview').controls = !busy;
  }

  function validateLink(value) {
    let url;
    try { url = new URL(value.trim()); } catch { throw new Error('Cole uma URL HTTPS completa do arquivo de vídeo.'); }
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Use um link HTTPS sem usuário ou senha na URL.');
    const host = url.hostname.toLowerCase();
    if (host === 'localhost' || host.endsWith('.local') || host.includes(':') || /^\d+(?:\.\d+){3}$/.test(host)) throw new Error('Use um link público do vídeo. Para arquivos locais, use Escolher vídeo.');
    if (/(^|\.)(youtube\.com|youtu\.be|instagram\.com|tiktok\.com|vimeo\.com)$/.test(host)) throw new Error('Esse é um link de página, não um arquivo de vídeo. Baixe o vídeo que você pode usar e faça o upload aqui.');
    return url.href;
  }

  function loadVideo(url, remote, signal) {
    const video = document.createElement('video');
    video.muted = true; video.playsInline = true; video.preload = 'auto';
    if (remote) video.crossOrigin = 'anonymous';
    return new Promise((resolve, reject) => {
      const cleanup = () => { clearTimeout(timer); video.removeEventListener('loadeddata', ready); video.removeEventListener('error', fail); signal.removeEventListener('abort', cancel); };
      const rejectVideo = error => { cleanup(); video.removeAttribute('src'); video.load(); reject(error); };
      const fail = () => rejectVideo(new Error(remote ? 'Não consegui abrir esse vídeo. O link precisa ser direto e permitir CORS. Se necessário, baixe o arquivo e use o upload.' : 'Este arquivo não abriu no navegador. Tente MP4 com codec H.264; alguns MOV/HEVC não são compatíveis.'));
      const cancel = () => rejectVideo(abortError());
      const ready = () => {
        if (!Number.isFinite(video.duration) || video.duration <= 0 || video.duration > 86400 || !video.videoWidth || video.videoWidth * video.videoHeight > 40000000) return rejectVideo(new Error('Use um vídeo com duração definida de até 24 h e resolução de até 40 megapixels. Streams ao vivo não são aceitos.'));
        cleanup(); resolve(video);
      };
      const timer = setTimeout(() => rejectVideo(new Error('O vídeo demorou para abrir. Tente um arquivo local ou outro link direto.')), 30000);
      video.addEventListener('loadeddata', ready); video.addEventListener('error', fail); signal.addEventListener('abort', cancel, { once: true });
      if (signal.aborted) return cancel();
      video.src = url; video.load();
    });
  }

  function releaseSource() {
    if (!source) return;
    source.decoder.removeAttribute('src'); source.decoder.load();
    if (source.objectURL) URL.revokeObjectURL(source.url);
    source = null;
  }

  function clearResults() {
    $('vrResultGrid').replaceChildren();
    resultURLs.splice(0).forEach(url => URL.revokeObjectURL(url));
    $('vrResults').hidden = true;
  }

  async function openSource(file, link) {
    if (busy) return;
    let candidateURL = '', objectURL = false;
    try {
      if (file) {
        if (!file.size || file.size > 300 * 1048576) throw new Error('Escolha um vídeo não vazio de até 300 MB.');
        if (!file.type.startsWith('video/') && !/\.(mp4|mov|webm|m4v)$/i.test(file.name)) throw new Error('Escolha um arquivo de vídeo, não uma imagem.');
        candidateURL = URL.createObjectURL(file); objectURL = true;
      } else candidateURL = validateLink(link);
      busy = true; controller = new AbortController(); update();
      $('vrProgress').hidden = true; setStatus('Abrindo o vídeo…');
      const decoder = await loadVideo(candidateURL, !file, controller.signal);
      if (controller.signal.aborted) { decoder.removeAttribute('src'); decoder.load(); throw abortError(); }
      $('vrPreview').pause(); releaseSource(); clearResults();
      source = { decoder, url: candidateURL, objectURL, name: file ? file.name : 'Vídeo por link' };
      // Restoring the decoder position may briefly lower readyState after export.
      // Re-enable controls when that seek settles, without requiring a new input.
      decoder.addEventListener('seeked', () => { if (!busy && source?.decoder === decoder) update(); });
      decoder.addEventListener('loadeddata', () => { if (!busy && source?.decoder === decoder) update(); });
      candidateURL = '';
      const preview = $('vrPreview');
      if (file) preview.removeAttribute('crossorigin'); else preview.crossOrigin = 'anonymous';
      preview.src = source.url; preview.load();
      $('vrSourceInfo').textContent = `${source.name} · ${decoder.videoWidth} × ${decoder.videoHeight} · ${time(decoder.duration)}${file ? ` · ${bytes(file.size)}` : ''}`;
      $('vrStart').value = '0'; $('vrEnd').value = String(Math.min(8, decoder.duration));
      $('vrStart').max = $('vrEnd').max = String(decoder.duration);
      $('vrSourceView').hidden = false; $('vrDrop').hidden = true; $('vrClear').hidden = false;
      setStatus('Vídeo pronto. Escolha o trecho e a saída.');
    } catch (error) { setStatus(error.name === 'AbortError' ? 'Abertura cancelada.' : error.message, error.name !== 'AbortError'); }
    finally { if (candidateURL && objectURL) URL.revokeObjectURL(candidateURL); busy = false; controller = null; update(); }
  }

  function showResults(result) {
    clearResults();
    for (const [kind, data] of Object.entries(result)) {
      if (!data?.blob || !['gif', 'sheet'].includes(kind)) continue;
      const url = URL.createObjectURL(data.blob); resultURLs.push(url);
      const card = document.createElement('article'); card.className = 'vr-result';
      const image = document.createElement('img'); image.src = url; image.alt = kind === 'gif' ? 'GIF do trecho selecionado' : 'Prancha sequencial com timestamps';
      const title = document.createElement('h4'); title.textContent = kind === 'gif' ? 'GIF animado' : 'Prancha para análise';
      const detail = document.createElement('p'); detail.textContent = `${data.width} × ${data.height} · ${data.frames} frames · ${bytes(data.blob.size)}`;
      const download = document.createElement('a'); download.href = url; download.className = 'btn';
      const extension = data.blob.type === 'image/gif' ? 'gif' : data.blob.type === 'image/png' ? 'png' : 'jpg';
      download.download = `tipo_referencia_${kind === 'gif' ? 'loop' : 'frames'}_${new Date().toISOString().replace(/[:.]/g, '-')}.${extension}`;
      download.textContent = `Baixar ${extension.toUpperCase()}`;
      card.append(image, title, detail, download); $('vrResultGrid').append(card);
    }
    $('vrResults').hidden = false;
  }

  async function generate() {
    if (busy || !source || $('vrGenerate').disabled) return;
    const snapshot = options();
    busy = true; controller = new AbortController(); $('vrPreview').pause(); update();
    $('vrProgress').hidden = false; $('vrProgress').value = 0; setStatus('Preparando a conversão local…');
    let lastAnnouncement = 0;
    try {
      const result = await window.VideoReferenceEngine.convert(source.decoder, snapshot, { signal: controller.signal, onProgress(progress) {
        $('vrProgress').value = progress.percent;
        if (performance.now() - lastAnnouncement < 250 && progress.percent < 100) return;
        lastAnnouncement = performance.now();
        setStatus(`${Math.round(progress.percent)}% · ${Math.round(progress.elapsed || 0)} s decorridos${Number.isFinite(progress.eta) ? ` · ~${Math.ceil(progress.eta)} s restantes` : ''}`);
      } });
      if (controller.signal.aborted) throw abortError();
      showResults(result); $('vrProgress').value = 100;
      setStatus('Pronto. Baixe as exportações no painel de resultados.');
      if (document.body.classList.contains('video-reference-active')) {
        if (document.body.classList.contains('tipo-mobile')) {
          $('panel').classList.remove('sheet-open');
          document.body.classList.remove('tipo-sheet-open');
          document.querySelector('.tipo-sheet-grip')?.setAttribute('aria-expanded', 'false');
        }
        const workspace = $('videoReferenceWorkspace');
        workspace.scrollTop += $('vrResults').getBoundingClientRect().top - workspace.getBoundingClientRect().top - 24;
      }
    } catch (error) { setStatus(error.name === 'AbortError' ? 'Conversão cancelada. Nenhum arquivo parcial foi criado.' : error.message || 'A conversão falhou. Tente um trecho menor.', error.name !== 'AbortError'); $('vrProgress').hidden = true; }
    finally { busy = false; controller = null; update(); }
  }

  function wireEvents() {
    ['vrUpload', 'vrDropPick'].forEach(id => $(id).addEventListener('click', () => $('vrFile').click()));
    $('vrFile').addEventListener('change', e => { const file = e.target.files[0]; e.target.value = ''; if (file) openSource(file); });
    $('vrLoadLink').addEventListener('click', () => openSource(null, $('vrLink').value));
    $('vrLink').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); if (!busy) openSource(null, $('vrLink').value); } });
    $('vrClear').addEventListener('click', () => {
      if (busy) return;
      $('vrPreview').pause(); $('vrPreview').removeAttribute('src'); $('vrPreview').load();
      releaseSource(); clearResults(); $('vrSourceView').hidden = true; $('vrDrop').hidden = false; $('vrClear').hidden = true; $('vrLink').value = ''; $('vrProgress').hidden = true; setStatus(''); update();
    });
    $('videoReferenceWorkspace').addEventListener('dragover', e => { e.preventDefault(); if (!busy) $('videoReferenceWorkspace').classList.add('vr-dropping'); });
    $('videoReferenceWorkspace').addEventListener('dragleave', e => { if (!$('videoReferenceWorkspace').contains(e.relatedTarget)) $('videoReferenceWorkspace').classList.remove('vr-dropping'); });
    $('videoReferenceWorkspace').addEventListener('drop', e => {
      e.preventDefault(); e.stopPropagation(); $('videoReferenceWorkspace').classList.remove('vr-dropping');
      if (busy) return;
      const file = e.dataTransfer.files[0];
      if (file) openSource(file); else { const link = e.dataTransfer.getData('text/uri-list').split('\n').find(line => line && !line.startsWith('#')) || e.dataTransfer.getData('text/plain'); if (link) { $('vrLink').value = link; openSource(null, link); } }
    });
    $('vrOptions').addEventListener('input', update);
    ['vrWidth', 'vrFPS', 'vrColors'].forEach(id => $(id).addEventListener('change', () => { $('vrPreset').value = 'custom'; }));
    $('vrPreset').addEventListener('change', () => {
      const preset = { compact: [320, 3, 64], balanced: [512, 6, 128], motion: [512, 12, 128] }[$('vrPreset').value];
      if (preset) { ['vrWidth', 'vrFPS', 'vrColors'].forEach((id, i) => { $(id).value = String(preset[i]); }); update(); }
    });
    const markPosition = id => {
      if (!source || busy) return;
      $(id).value = String(Math.max(0, Math.min(source.decoder.duration, Number($('vrPreview').currentTime.toFixed(1)))));
      update();
    };
    $('vrMarkStart').addEventListener('click', () => markPosition('vrStart'));
    $('vrMarkEnd').addEventListener('click', () => markPosition('vrEnd'));
    $('vrGenerate').addEventListener('click', generate);
    $('vrCancel').addEventListener('click', () => { controller?.abort(); setStatus('Cancelando…'); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) $('vrPreview').pause(); });
    window.addEventListener('pagehide', () => { controller?.abort(); $('vrPreview').pause(); });
  }

  window.FotogramaVideoReference = { setActive(active) { if (active) { init(); update(); } else if (initialized) $('vrPreview').pause(); }, validateLink };
  if (location.hash === '#video-gif') window.addEventListener('DOMContentLoaded', () => setFotogramaTool('videoReference'), { once: true });
})();
