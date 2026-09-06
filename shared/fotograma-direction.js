(function initFotogramaDirection(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.TipoFotogramaDirection = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function buildFotogramaDirection() {
  'use strict';

  // Evidence describes specific productions, not a permanent kit or an endorsement.
  // Slots are original, concise visual interpretations; the compiler applies only
  // unowned slots. Never append cameraNote, sources or multiple profiles to a prompt.
  // Art direction is separate: it must not smuggle color/light/texture choices past
  // those slots' manual/reference overrides. The compiler also gates layout authority.
  const CATALOG_NOTE = 'Interpretações visuais da Tipó, não presets oficiais nem reprodução garantida. Equipamentos citados pertencem ao filme indicado; briefing e referências têm prioridade.';
  const ART_DIRECTION_SCOPE = 'Arrange existing elements only where layout is open; preserve identity, design, materials and stated positions. Never add, remove or replace content or change lighting, color, texture or focus.';
  const DIRECTIONS = Object.freeze([
    {
      id: 'villeneuve-deakins',
      label: 'Denis Villeneuve + Roger Deakins',
      note: 'Leitura visual de Blade Runner 2049: escala arquitetônica, área negativa, silhuetas e campos de cor densos; profundidade legível e nitidez digital. Não impõe futuro, névoa ou cenário novo.',
      works: ['Blade Runner 2049 (2017)'],
      cameraNote: 'Em Blade Runner 2049: ALEXA XT Studio e Master Primes, segundo a ARRI. Esse equipamento é contexto histórico, não uma câmera fixa do perfil.',
      sources: [
        { title: 'ARRI — Lighting Blade Runner 2049', url: 'https://www.arri.com/news-en/lighting-blade-runner-2049-/45572-45572' },
        { title: 'ASC — Roger Deakins: Uncanny Valley, Blade Runner 2049', url: 'https://theasc.com/article/uncanny-valley-blade-runner-2049/' },
      ],
      artDirection: 'Separate existing visual masses with generous intervals around one dominant anchor; let empty areas carry weight without adding architecture',
      slots: {
        framing: 'Measured off-center balance, generous negative space and the geometry of existing forms; create tension through empty intervals at the requested shot scale',
        optics: 'Wide spherical clarity, straight edges and deliberate near-to-far scale, without anamorphic streaks',
        dof: 'Layered environmental focus: subject crisp, middle-distance structure readable, no blanket background blur',
        light: 'One dominant motivated source cuts broad, sculptural shapes across existing planes; deep shadow masses and minimal fill preserve essential detail, rather than an even soft wash',
        color: 'Broad, dense color fields with warm-light and cool-shadow separation where the existing illumination permits; preserve specified colors instead of applying amber uniformly',
        texture: 'Clean digital microdetail and smooth highlight roll-off; no added grain, halation or distressed surfaces',
      },
    },
    {
      id: 'fincher-cronenweth',
      label: 'David Fincher + Jeff Cronenweth',
      note: 'Interpretação de Gone Girl: quadro controlado, foco seletivo discreto, luz baixa e recortada, neutros frios e precisão digital. Sem grão de película, névoa ou halation adicionados.',
      works: ['Gone Girl (2014)'],
      cameraNote: 'Em Gone Girl: RED Dragon e Leitz Summilux-C, documentadas pela ASC. Não se aplica automaticamente aos demais filmes de Fincher.',
      sources: [
        { title: 'ASC — AC Gallery: Gone Girl', url: 'https://theasc.com/article/ac-gallery-gone-girl/' },
        { title: 'ASC — Jeff Cronenweth: An Adventurous Eye', url: 'https://theasc.com/article/cronenweth-adventurous-eye/' },
      ],
      artDirection: 'Align existing edges and intervals into controlled spatial relationships; keep a clear visual path to the principal detail without making every arrangement symmetrical',
      slots: {
        framing: 'A locked, clinically precise frame with measured headroom, level verticals and tightly controlled subject placement',
        optics: 'Normal spherical perspective, restrained spatial compression and crisp geometry without wide-angle exaggeration',
        dof: 'Controlled selective focus in close views; environmental views keep the principal plane and background structure legible, with restrained distance falloff',
        light: 'Practical-motivated directional light with negative fill and a narrow lit-to-shadow transition; retain dark-side detail and restrained edge separation, not evenly exposed beauty fill',
        color: 'Desaturated cool neutrals, subdued earth tones and dense separated blacks; protect named colors and skin without a blanket teal-orange wash',
        texture: 'Precise digital pores and fabric detail without added film grain, halation, diffusion haze or sharpening halos',
      },
    },
    {
      id: 'nolan-hoytema',
      label: 'Christopher Nolan + Hoyte van Hoytema',
      note: 'Interpretação de Oppenheimer: proximidade íntima com espaço periférico, foco que separa o sujeito e grão fino de grande formato. Halation discreta só em altas luzes intensas; não altera o formato escolhido.',
      works: ['Oppenheimer (2023)'],
      cameraNote: 'Em Oppenheimer: IMAX MKIV/MSM 9802 e Panavision System 65; película 65mm e ópticas adaptadas por Dan Sasaki, conforme entrevista à Kodak.',
      sources: [{ title: 'Kodak — Hoyte van Hoytema on Oppenheimer', url: 'https://www.kodak.com/en/motion/blog-post/oppenheimer/' }],
      artDirection: 'Give existing near, middle and far elements a clear depth hierarchy around one focal anchor; retain their positions and functional relationships',
      slots: {
        framing: 'A dimensional composition at the requested shot scale, with the principal anchor clearly weighted and surrounding space felt in peripheral vision',
        optics: 'Large-format spherical roundness with dimensional principal forms and gentle peripheral falloff at the chosen distance, never fisheye',
        dof: 'In close views, the principal detail stays sharp against rounded, graduated bokeh; wide views retain spatial depth',
        light: 'Credible directional light from the existing environment gives principal forms rounded volume; retain a clear key-to-shadow gradient and selective highlights, not beauty fill',
        color: 'Rich natural neutrals and nuanced highlight color, with warm-cool separation tied to existing illumination; no blanket orange cast',
        texture: 'Fine, perceptible large-format film grain with resolved material detail and broad tonal latitude, not coarse grit. Restrained warm halation stays tight around existing intense highlights only; no all-over haze or invented light source',
      },
    },
    {
      id: 'anderson-yeoman',
      label: 'Wes Anderson + Robert Yeoman',
      note: 'Interpretação dos quadros em cor de The French Dispatch: frontalidade, simetria e camadas organizadas, foco profundo, blocos cromáticos e grão fino. Pessoas continuam fotográficas, sem virar caricaturas.',
      works: ['The French Dispatch (2021)'],
      cameraNote: 'Em The French Dispatch: ARRICAM ST/LT, Cooke S4 e 35mm Kodak 200T/Double-X, segundo Yeoman. O filme também usou exceções de formato e óptica.',
      sources: [{ title: 'Kodak — Robert Yeoman on The French Dispatch', url: 'https://www.kodak.com/en/motion/blog-post/the-french-dispatch/' }],
      artDirection: 'Give existing rows, pairs and repeated motifs a balanced rhythm with precise intervals; keep a theatrical hierarchy of distinct planes without inventing a matching counterpart',
      slots: {
        framing: 'A frontal, centered tableau with rigorous bilateral balance and clear horizontal layers; keep the camera level',
        optics: 'Rectilinear, stage-like perspective with straight verticals and softly rounded optical detail, not a miniature effect',
        dof: 'Deep focus keeping foreground and background subjects readable',
        light: 'Broad, motivated bounced light reveals each plane with gently directional shadows and even spatial readability; avoid an isolated spotlight or a bleached-white wash',
        color: 'Two or three distinct color families already permitted by the brief, arranged as graphic blocks with warm-cool separation; preserve named colors rather than repainting everything pastel',
        texture: 'Fine visible photochemical grain and rounded contrast; photographic material detail, no plastic miniature or fake aging',
      },
    },
    {
      id: 'malick-lubezki',
      label: 'Terrence Malick + Emmanuel Lubezki',
      note: 'Interpretação de The Tree of Life: câmera próxima e ampla, composição orgânica, luz disponível e pele tátil. Flare sutil só quando há contraluz; não acrescenta natureza, janela ou pôr do sol.',
      works: ['The Tree of Life (2011)'],
      cameraNote: 'Em The Tree of Life: ARRI LT/235, Master Primes e captura 35mm, com sequências 65mm/IMAX; dados da entrevista com Lubezki ao British Cinematographer.',
      sources: [{ title: 'British Cinematographer — Emmanuel Lubezki on The Tree of Life', url: 'https://britishcinematographer.co.uk/emmanuel-lubezki-amc-asc-the-tree-of-life/' }],
      artDirection: 'Favor loose intervals and organic overlaps among existing elements, leaving open paths through the arrangement instead of staged bilateral symmetry',
      slots: {
        framing: 'An off-center viewpoint within the scene at the requested shot scale; asymmetric layers and unforced margins suggest an observed instant',
        optics: 'Immersive spherical perspective with natural proportions. A subtle veiling flare occurs only when an existing light source is aligned into the lens; otherwise keep optical contrast intact',
        dof: 'In close views, near-subject focus falls away organically while context remains recognizable; environmental views keep layered spatial depth, never a creamy blank backdrop',
        light: 'Available light wraps unevenly with natural ambient bounce, creating local transitions between luminous edges and soft shade; keep the existing time, source direction and weather, not a new studio key or sunset',
        color: 'Luminous natural midtones and quiet warm-cool variation tied to existing illumination; retain actual foliage, earth and skin hues rather than a mandatory golden cast',
        texture: 'Organic fine film grain in midtones, supple highlight roll-off and tactile skin; no waxy smoothing or blanket diffusion',
      },
    },
    {
      id: 'meirelles-charlone',
      label: 'Fernando Meirelles + César Charlone',
      note: 'Interpretação de Cidade de Deus, codirigido por Kátia Lund: proximidade documental, diagonais e planos sobrepostos, contraste incisivo e grão Super 16 mais presente. Não inventa desgaste, pobreza ou violência.',
      works: ['Cidade de Deus (2002), codireção de Kátia Lund'],
      cameraNote: 'Em Cidade de Deus: predominância de Super 16 em Aaton A-Minima, combinada com 35mm, conforme relatos de Charlone à ABC. Não é um kit único.',
      sources: [
        { title: 'ABC — Entrevista com César Charlone', url: 'https://abcine.org.br/entrevistas/entrevista-com-cesar-charlone-abc/' },
        { title: 'ABC — Sessão Cidade de Deus, 2002', url: 'https://abcine.org.br/eventos/sessao-abc-2002/' },
      ],
      artDirection: 'Use dense, irregular overlaps of existing elements with a clear route to the principal detail; density must come from the supplied scene, not invented clutter',
      slots: {
        framing: 'A documentary frame with energetic diagonals, uneven margins and overlapping planes at the requested shot scale; never a staged symmetrical tableau',
        optics: 'Wide spherical immediacy with pronounced foreground-to-background scale, keeping faces and product geometry credible',
        dof: 'Working documentary depth: the action and nearby layers remain readable rather than dissolving into portrait bokeh',
        light: 'Directional location light produces hard-soft contrast and decisive shadow edges; preserve available bounce and facial or material detail, without beauty fill or an invented harsh source',
        color: 'Dense earthy color separation, cool-shadow counterweight and punchy print contrast when supported by the scene; preserve named colors rather than imposing ochre on every surface',
        texture: 'Pronounced small-format film grain, coarser than large-format grain and more apparent in midtones and shadows. Preserve material detail beneath the grain; no digital noise blocks, invented wear, dust or scratches',
      },
    },
  ].map(profile => Object.freeze({
    ...profile,
    works: Object.freeze(profile.works),
    sources: Object.freeze(profile.sources.map(source => Object.freeze(source))),
    slots: Object.freeze(profile.slots),
  })));

  function byId(id) { return DIRECTIONS.find(profile => profile.id === id) || DIRECTIONS[0]; }
  return Object.freeze({ CATALOG_NOTE, ART_DIRECTION_SCOPE, DIRECTIONS, byId });
});
