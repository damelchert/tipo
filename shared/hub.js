/* Catalogue values are controlled locally; user-entered text is never HTML. */
(() => {
  'use strict';
  const tools = [
    ['fotograma','Fotograma','visual','Imagem com IA','Crie e edite imagens com direção, referências e modelos de IA.','Higgsfield / Google','photo','cinema publicidade cast product sheets animation'],
    ['studio','Studio','visual','Canvas criativo','Combine mídias, camadas e efeitos em um canvas livre.','WebGL · PNG / MP4','studio','composição nodes nós multi frame'],
    ['dithering','Dithering','visual','Textura','Transforme imagem e vídeo em pontos, formas e novas texturas.','Imagem / vídeo · PNG / SVG / MP4','dithering','dither halftone pontilhismo'],
    ['pattern','Pattern','visual','Generativo','Desenhe padrões geométricos que se encaixam e se movem.','Tile · SVG / PNG / MP4','pattern','truchet textura padrão mosaico'],
    ['depthmap','Video Depth Map','visual','Profundidade IA','Converta vídeos em mapas de profundidade para referência.','Vídeo · IA local · MP4','depthmap','depth seedance cinza'],
    ['reticula','Retícula','visual','Textura','Reinterprete imagens em tramas, pontos e meios-tons.','Imagem / vídeo · PNG / MP4','reticula','halftone reticula dots'],
    ['glitch','Glitch','visual','Distorção','Desloque canais, quebre blocos e explore falhas digitais.','Imagem / vídeo · PNG / MP4','glitch','rgb distorção ruído'],
    ['riso','Risograph','visual','Cor & impressão','Simule tintas, sobreimpressão e imperfeições de registro.','Tintas / CMYK · PNG / MP4','riso','risografia impressão tinta'],
    ['cylinder','Cylinder','3d','Tipografia 3D','Envolva suas palavras em cilindros, ondas e rotações.','Texto · PNG / MP4','cylinder','rotação cilindro'],
    ['rastro','Rastro','visual','Movimento','Crie ecos, rastros e sobreposições com máscaras.','Imagem / vídeo · PNG α / MP4','echo','echo rastro eco máscara'],
    ['datamosh','Datamosh','visual','Distorção','Simule arrastos de compressão, fusões e rupturas de cor.','Imagem / vídeo · PNG / MP4','glitch','melt mosh movimento'],
    ['pixelsort','Pixel Sort','visual','Distorção','Reorganize pixels em faixas guiadas por cor e luminosidade.','Imagem / vídeo · PNG / MP4','sort','pixelsort asendorf'],
    ['gradientmap','Gradient Map','visual','Cor','Remapeie a luminosidade com paletas e gradientes próprios.','Imagem / vídeo · PNG / MP4','gradient','duotone cor cores gradiente'],
    ['palette','Palette','visual','Cor','Extraia cores de imagens e construa novas harmonias.','Imagem · ASE / CSS / JSON / PNG','palette','paleta amostra swatch'],
    ['depth','Depth','visual','Profundidade','Transforme imagens em relevos 3D com paralaxe e órbita.','Imagem / vídeo · PNG / MP4','depth','relevo parallax orbit'],
    ['mockup','Mockup','visual','Apresentação','Aplique sua arte em cenas de produto com perspectiva.','Imagem · PNG','mockup','camiseta poster celular apresentação'],
    ['overlay','Overlay','visual','Textura','Crie grão, luz, poeira e sobreposições em movimento.','Texturas · PNG / MP4','overlay','film grain vhs bokeh película'],
    ['ascii','ASCII','visual','Tipografia visual','Traduza imagens e vídeo em caracteres, blocos e símbolos.','Imagem / vídeo · PNG / MP4','ascii','caracteres braille texto'],
    ['audiotype','AudioType','visual','Áudio reativo','Faça letras e imagens pulsarem no ritmo do áudio.','Áudio / microfone · PNG / MP4','audio','som música barras'],
    ['field','Field','3d','Tipografia 3D','Modele um campo de letras com ondas e distorção.','Texto · PNG / MP4','field','grid malha wave onda'],
    ['stripes','Stripes','3d','Tipografia 3D','Anime fitas de texto que atravessam o espaço.','Texto · PNG / MP4','stripes','fitas listras'],
    ['coil','Coil','3d','Tipografia 3D','Enrole palavras em espirais, molas e curvas.','Texto · PNG / MP4','coil','espiral mola'],
    ['flag','Flag','3d','Tipografia 3D','Faça o texto ondular como tecido e superfície.','Texto · PNG / MP4','flag','bandeira wave dobra'],
    ['cascade','Cascade','3d','Tipografia 3D','Componha cascatas de letras com alturas variáveis.','Texto · PNG / MP4','cascade','cascata linhas'],
    ['ribbon','Ribbon','3d','Tipografia 3D','Conduza palavras por fitas e caminhos tridimensionais.','Texto · PNG / MP4','stripes','streamers terrace fita'],
    ['morisawa','Morisawa','3d','Tipografia 3D','Explore composições generativas de ritmo e repetição.','Texto · PNG / MP4','field','japonesa generativo'],
    ['layers','Layers','2d','Tipografia 2D','Empilhe texto em perspectivas, camadas e espirais.','Texto · PNG / MP4','layers','camadas stack'],
    ['danger','Danger','2d','Tipografia 2D','Deforme palavras com ruído e malhas orgânicas.','Texto · PNG / MP4','danger','noise ruído distorção'],
    ['string','String','2d','Tipografia 2D','Desenhe trajetórias curvas para o texto percorrer.','Texto · PNG / MP4','string','bezier caminho curva'],
    ['badge','Badge','composition','Composição','Crie selos circulares com anéis e camadas de texto.','Texto · PNG / MP4','badge','selo círculo emblema'],
    ['clutter','Clutter','composition','Composição','Distribua letras em nuvens, órbitas e vórtices.','Texto · PNG / MP4','clutter','scatter nuvem arranjo'],
    ['construct','Construct','composition','Composição','Monte grades, módulos e composições tipográficas.','Texto · PNG / MP4','construct','grid modular matrix'],
    ['duplicator','Duplicator','composition','Composição','Multiplique elementos com escala, cor e defasagem.','Clones · PNG / MP4','duplicator','cloner clones stagger'],
    ['snap','Snap','animation','Animação','Dê ritmo às letras com entradas e movimentos elásticos.','Texto · PNG / MP4','snap','elástico entrada'],
    ['flash','Flash','animation','Animação','Alterne transformações, cortes e aparições rápidas.','Texto · PNG / MP4','flash','reveal corte'],
    ['pow','Pow','animation','Animação','Exploda palavras e reúna seus caracteres no espaço.','Texto · PNG / MP4','pow','explosão partículas'],
    ['crash','Crash','animation','Animação','Solte suas letras em uma simulação de gravidade.','Texto · PNG / MP4','crash','física gravidade queda'],
    ['crashclock','Crash Clock','animation','Animação','Transforme as horas em um relógio de números físicos.','Relógio · PNG / MP4','clock','hora física'],
    ['vessel','Vessel','animation','Animação','Envolva o texto em uma forma que muda e respira.','Texto · PNG / MP4','vessel','morph contorno'],
    ['shine','Shine','animation','Animação','Projete raios e luz a partir do centro das palavras.','Texto · PNG / MP4','shine','luz radial'],
    ['boost','Boost','animation','Animação','Revele cada letra com impulso e aceleração.','Texto · PNG / MP4','boost','reveal entrada overshoot'],
  ].map(([id,name,category,kind,description,meta,art,tags]) => ({id,name,category,kind,description,meta,art,tags}));

  const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const byId = new Map(tools.map(tool => [tool.id, tool]));
  function readList(key) { try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? [...new Set(value.filter(id => byId.has(id)))].slice(0,41) : []; } catch { return []; } }
  function writeList(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Private mode still has a working catalogue. */ } }
  let favorites = new Set(readList('tipo-hub-favorites'));
  let filter = 'all';
  const grid = document.getElementById('toolGrid');
  const search = document.getElementById('toolSearch');
  const sort = document.getElementById('toolSort');
  const filters = new Set(['all','visual','kinetic','favorites','3d','2d','composition','animation']);
  const filterNames = {visual:'imagem & efeitos',kinetic:'tipografia cinética','3d':'tipografia 3D','2d':'tipografia 2D',composition:'composição',animation:'animação',favorites:'favoritas'};
  const photoPreviews = new Set(['studio','dithering','pattern','reticula','riso','cylinder']);

  // Small, static vector studies keep the whole catalogue useful without
  // mounting dozens of engines or downloading a video for every card.
  function artwork(tool, index) {
    if (tool.id === 'fotograma') return '<img src="assets/hub/fotograma.webp" width="640" height="381" loading="lazy" alt="">';
    if (photoPreviews.has(tool.id)) return `<img src="assets/hub/${tool.id}.webp" width="640" height="381" loading="lazy" alt="">`;
    const palettes = [['#243b34','#b4cec0','#e7bf6c'],['#ddd5c4','#352e28','#926747'],['#a89cab','#2f2430','#eadcbb'],['#dba64d','#2b2924','#e9ddbb'],['#233330','#a2c7b5','#dca3a4']];
    const [bg,ink,accent] = palettes[index % palettes.length];
    const text = (label,x,y,size=48,extra='') => `<text x="${x}" y="${y}" fill="${ink}" font-family="ClashDisplay, sans-serif" font-size="${size}" font-weight="500" ${extra}>${label}</text>`;
    let art='';
    if (tool.art === 'palette' || tool.art === 'gradient') {
      ['#273b34','#6d8b72','#b9c3a0','#e1b778','#b37656','#4c3340'].forEach((color,i) => { art += `<rect x="${i*70}" y="0" width="70" height="250" fill="${color}"/>`; });
      if (tool.art === 'gradient') art += `<circle cx="210" cy="125" r="76" fill="none" stroke="#f7ecd3" stroke-width="1"/>${text('COLOR',62,145,78,'fill="#f7ecd3"')}`;
    } else if (tool.art === 'glitch' || tool.art === 'sort') {
      for(let i=0;i<24;i++) art += `<rect x="${(i*37)%180}" y="${i*11}" width="${120+(i*51)%270}" height="${i%3===0?10:4}" fill="${i%2?ink:accent}" opacity="${.35+(i%3)*.25}"/>`;
      art += text('SIGNAL',30,151,76,'letter-spacing="-3"');
    } else if (['depth','depthmap','coil'].includes(tool.art)) {
      for(let i=15;i>0;i--) art += `<ellipse cx="${210+Math.sin(i*.3)*18}" cy="${130-i*2}" rx="${i*11}" ry="${i*6}" fill="${tool.art==='depthmap'?`hsl(0 0% ${100-i*5}%)`:'none'}" stroke="${ink}" stroke-width="1.5"/>`;
    } else if (['badge','clock','shine'].includes(tool.art)) {
      for(let i=0;i<36;i++) {const a=i*Math.PI/18;art+=`<path d="M${210+Math.cos(a)*60} ${125+Math.sin(a)*60} L${210+Math.cos(a)*104} ${125+Math.sin(a)*104}" stroke="${i%3?ink:accent}" stroke-width="${tool.art==='shine'?2:4}"/>`;}
      art += text(tool.art==='clock'?'12:08':'TIPÓ',tool.art==='clock'?161:161,139,34);
    } else if (['pattern','construct','duplicator','field'].includes(tool.art)) {
      for(let y=0;y<5;y++)for(let x=0;x<8;x++) {let r=8+Math.sin(x*.7+y)*6;art += tool.art==='duplicator'?`<circle cx="${25+x*52}" cy="${25+y*52}" r="${r}" fill="${(x+y)%3?ink:accent}"/>`:text('T',x*56-2,y*57+33,46,`transform="rotate(${(x+y)%2?12:-12} ${x*56+15} ${y*57+20})"`);}
    } else if (tool.art==='ascii') {
      for(let i=0;i<11;i++)art+=text(['@#%*·+  :;::+# @',' .;@##@@.· :: *+',': .:+##%#+::·'][i%3],8,i*25+10,20,'font-family="monospace" letter-spacing="7"');
    } else if (tool.art==='audio') {
      for(let i=0;i<28;i++){const h=16+Math.abs(Math.sin(i*.7))*135;art+=`<rect x="${18+i*14}" y="${125-h/2}" width="8" height="${h}" rx="2" fill="${i%4?ink:accent}"/>`;}
    } else if (tool.art==='mockup') {
      art=`<rect x="104" y="22" width="212" height="210" rx="1" fill="${ink}" transform="rotate(-8 210 125)"/><g transform="rotate(-8 210 125)"><rect x="112" y="30" width="196" height="194" fill="${accent}"/><circle cx="210" cy="120" r="66" fill="${bg}"/>${text('IDEA',146,137,49)}</g>`;
    } else if (tool.art==='overlay') {
      for(let i=0;i<100;i++)art+=`<circle cx="${(i*131)%420}" cy="${(i*79)%250}" r="${1+(i%5)*2}" fill="${ink}" opacity="${.08+(i%4)*.08}"/>`;
      art+=text('GRAIN',64,150,80,'letter-spacing="-2"');
    } else if (['layers','echo'].includes(tool.art)) {
      for(let i=0;i<6;i++)art+=text('TIPÓ',50+i*16,88+i*22,95,`opacity="${.18+i*.13}"`);
    } else if (['stripes','flag','string','danger','cascade'].includes(tool.art)) {
      for(let i=0;i<5;i++){const dx=Math.sin(i*1.6)*40;art+=`<g transform="translate(${dx} ${i*51-18}) rotate(-8 200 30)"><rect width="500" height="46" fill="${i%2?ink:accent}"/><text x="20" y="38" fill="${i%2?bg:ink}" font-family="ClashDisplay,sans-serif" font-size="46">TYPE / TYPE / TYPE</text></g>`;}
    } else if (tool.art==='vessel') {
      art=`<rect x="55" y="55" width="310" height="140" rx="62" fill="${ink}"/><text x="93" y="153" fill="${bg}" font-family="ClashDisplay,sans-serif" font-size="77">FORM</text>`;
    } else {
      const word=tool.art==='crash'?'DROP':tool.art==='pow'?'BOOM':tool.art==='boost'?'GO!':'TIPÓ';
      word.split('').forEach((letter,i)=>{art+=text(letter,40+i*86,tool.art==='crash'?75+i*35:145+Math.sin(i*2)*25,100,`transform="rotate(${tool.art==='pow'?(i-1.5)*12:0} ${80+i*80} 120)"`);});
    }
    return `<svg viewBox="0 0 420 250" aria-hidden="true" focusable="false"><rect width="420" height="250" fill="${bg}"/>${art}</svg>`;
  }

  function render() {
    const query=normalize(search.value.trim());
    let shown=tools.filter(tool => (filter==='all'||filter==='favorites'&&favorites.has(tool.id)||filter==='kinetic'&&tool.category!=='visual'||tool.category===filter) && (!query||query.split(/\s+/).every(part=>normalize(`${tool.name} ${tool.kind} ${tool.description} ${tool.meta} ${tool.tags}`).includes(part))));
    if(sort.value==='name')shown=shown.toSorted((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
    grid.innerHTML=shown.map(tool=>`<article class="hub-tool" data-id="${tool.id}"><a class="hub-tool-link" href="${tool.id}.html" data-tool="${tool.id}"><div class="hub-tool-art">${artwork(tool,tools.indexOf(tool))}<span class="hub-tool-kind">${tool.kind}</span></div><div class="hub-tool-title"><h3>${tool.name}</h3><span aria-hidden="true">↗</span></div><p>${tool.description}</p><span class="hub-tool-meta">${tool.meta}</span></a><button class="hub-tool-favorite" data-favorite="${tool.id}" type="button" aria-label="${favorites.has(tool.id)?'Remover':'Adicionar'} ${tool.name} ${favorites.has(tool.id)?'das':'às'} favoritas" aria-pressed="${favorites.has(tool.id)}">${favorites.has(tool.id)?'★':'☆'}</button></article>`).join('');
    document.getElementById('toolCount').textContent=`${shown.length} ${shown.length===1?'ferramenta':'ferramentas'}${filterNames[filter]?` · ${filterNames[filter]}`:' para criar'}${query?' · busca ativa':''}`;
    document.getElementById('emptyCatalog').hidden=shown.length>0;
    document.getElementById('emptyMessage').textContent=filter==='favorites'&&!favorites.size?'Marque a estrela nas ferramentas que você mais usa. Elas ficam salvas neste navegador.':'Experimente outro nome ou efeito, ou limpe os filtros.';
    document.getElementById('clearFilters').hidden=filter==='all'&&!query;
    document.querySelectorAll('[data-filter]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.filter===filter||(button.dataset.filter==='kinetic'&&['3d','2d','composition','animation'].includes(filter)))));
  }
  function selectFilter(value,changeHash=true) {
    filter=filters.has(value)?value:'all';
    if(changeHash)history.replaceState(null,'',filter==='all'?'#catalog':`#${filter}`);
    render();
  }
  function readHash(scroll=false) {
    const hash=location.hash.slice(1);
    selectFilter(filters.has(hash)?hash:'all',false);
    if(scroll&&hash)document.getElementById('catalog').scrollIntoView();
  }
  function recent() {
    const ids=readList('tipo-hub-recent').slice(0,5);
    document.getElementById('recentSection').hidden=!ids.length;
    document.getElementById('recentTools').innerHTML=ids.map(id=>`<a href="${id}.html" data-tool="${id}">${byId.get(id).name}<span aria-hidden="true">↗</span></a>`).join('');
  }
  document.addEventListener('click',event=>{
    const favorite=event.target.closest('[data-favorite]');
    if(favorite){const id=favorite.dataset.favorite;favorites.has(id)?favorites.delete(id):favorites.add(id);writeList('tipo-hub-favorites',[...favorites]);render();(grid.querySelector(`[data-favorite="${id}"]`)||document.querySelector('[data-filter="favorites"]')).focus({preventScroll:true});return;}
    const link=event.target.closest('a[data-tool]');
    if(link&&byId.has(link.dataset.tool)){const id=link.dataset.tool;writeList('tipo-hub-recent',[id,...readList('tipo-hub-recent').filter(item=>item!==id)].slice(0,8));}
    const button=event.target.closest('[data-filter]');
    if(button)selectFilter(button.dataset.filter);
  });
  search.addEventListener('input',render);sort.addEventListener('change',render);
  const clear=()=>{search.value='';selectFilter('all');search.focus({preventScroll:true});};
  document.getElementById('clearFilters').addEventListener('click',clear);
  document.getElementById('emptyReset').addEventListener('click',clear);
  document.addEventListener('keydown',event=>{if(event.key==='/'&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!event.target.closest('input,textarea,select,[contenteditable="true"]')){event.preventDefault();search.focus();}if(event.key==='Escape'&&event.target===search&&search.value){search.value='';render();}});
  window.addEventListener('hashchange',()=>readHash(true));
  window.addEventListener('pageshow',()=>{favorites=new Set(readList('tipo-hub-favorites'));recent();render();});
  window.addEventListener('storage',event=>{if(event.key==='tipo-hub-favorites'){favorites=new Set(readList('tipo-hub-favorites'));render();}if(event.key==='tipo-hub-recent')recent();});
  const themeButton=document.getElementById('hubTheme');
  const updateTheme=()=>{const dark=document.documentElement.dataset.theme==='dark';themeButton.textContent=dark?'☼':'◐';themeButton.title=dark?'Ativar tema claro':'Ativar tema escuro';themeButton.setAttribute('aria-label',themeButton.title);document.querySelector('meta[name="theme-color"]').content=dark?'#0C0C0A':'#F8F5F0';};
  themeButton.addEventListener('click',()=>{const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=theme;try{localStorage.setItem('tipo-theme',theme);}catch{}updateTheme();});

  // Motion is opt-in: no autoplay download, no competing animation loops.
  const video=document.getElementById('hubMotion');
  const motionButton=document.getElementById('hubMotionToggle');
  const syncMotion=()=>{video.parentElement.classList.toggle('is-playing',!video.paused);motionButton.textContent=video.paused?'▶':'Ⅱ';motionButton.setAttribute('aria-label',video.paused?'Reproduzir prévia de movimento':'Pausar prévia de movimento');};
  motionButton.addEventListener('click',async()=>{if(!video.paused){video.pause();return;}const source=video.querySelector('source');if(!source.src){source.src=source.dataset.src;video.load();}try{await video.play();}catch{motionButton.setAttribute('aria-label','Prévia indisponível. Tentar novamente');}syncMotion();});
  video.addEventListener('play',syncMotion);video.addEventListener('pause',syncMotion);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)video.pause();});
  new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)video.pause();},{threshold:.05}).observe(video.parentElement);
  updateTheme();recent();readHash();
  if(filters.has(location.hash.slice(1)))requestAnimationFrame(()=>document.getElementById('catalog').scrollIntoView());
})();
