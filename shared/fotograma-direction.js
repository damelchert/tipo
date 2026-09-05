(function initFotogramaDirection(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.TipoFotogramaDirection = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function buildFotogramaDirection() {
  'use strict';

  // Evidence describes specific productions, not a permanent kit or an endorsement.
  // Slots are original, concise visual interpretations; the compiler applies only
  // unowned slots. Never append cameraNote, sources or multiple profiles to a prompt.
  const CATALOG_NOTE = 'Interpretações visuais da Tipó, não presets oficiais nem reprodução garantida. Equipamentos citados pertencem ao filme indicado; briefing e referências têm prioridade.';
  const DIRECTIONS = Object.freeze([
    {
      id: 'villeneuve-deakins',
      label: 'Denis Villeneuve + Roger Deakins',
      note: 'Espaço arquitetônico, tensão silenciosa e luz motivada. Leitura visual de Blade Runner 2049, não um filtro futurista obrigatório.',
      works: ['Blade Runner 2049 (2017)'],
      cameraNote: 'Em Blade Runner 2049: ALEXA XT Studio e Master Primes, segundo a ARRI. Esse equipamento é contexto histórico, não uma câmera fixa do perfil.',
      sources: [{ title: 'ARRI — Lighting Blade Runner 2049', url: 'https://www.arri.com/news-en/lighting-blade-runner-2049-/45572-45572' }],
      slots: {
        framing: 'A composed environmental view with deliberate negative space around the subject',
        optics: 'Clean spherical perspective with controlled edges',
        dof: 'Keep the subject clear and the architecture legible',
        light: 'One broad motivated source defining the subject against restrained ambient light',
        color: 'A restrained palette drawn from the setting with one dominant hue',
        texture: 'Clean detailed surfaces with gentle tonal transitions',
      },
    },
    {
      id: 'fincher-cronenweth',
      label: 'David Fincher + Jeff Cronenweth',
      note: 'Geometria precisa, observação contida e sombras com informação. Interpretação do suspense de Gone Girl.',
      works: ['Gone Girl (2014)'],
      cameraNote: 'Em Gone Girl: RED Dragon e Leitz Summilux-C, documentadas pela ASC. Não se aplica automaticamente aos demais filmes de Fincher.',
      sources: [
        { title: 'ASC — AC Gallery: Gone Girl', url: 'https://theasc.com/article/ac-gallery-gone-girl/' },
        { title: 'ASC — Jeff Cronenweth: An Adventurous Eye', url: 'https://theasc.com/article/cronenweth-adventurous-eye/' },
      ],
      slots: {
        framing: 'A steady observational composition with precise spatial relationships',
        optics: 'Neutral perspective and crisp, undistorted geometry',
        dof: 'Focus on the subject while retaining meaningful environmental detail',
        light: 'Motivated practical light with restrained fill and readable shadows',
        color: 'Muted cool neutrals with natural skin color',
        texture: 'Fine digital detail without added film grain or artificial sharpening',
      },
    },
    {
      id: 'nolan-hoytema',
      label: 'Christopher Nolan + Hoyte van Hoytema',
      note: 'Proximidade humana e espaço imersivo. Interpretação da fotografia de Oppenheimer, sem exigir espetáculo ou trocar o formato escolhido.',
      works: ['Oppenheimer (2023)'],
      cameraNote: 'Em Oppenheimer: IMAX MKIV/MSM 9802 e Panavision System 65; película 65mm e ópticas adaptadas por Dan Sasaki, conforme entrevista à Kodak.',
      sources: [{ title: 'Kodak — Hoyte van Hoytema on Oppenheimer', url: 'https://www.kodak.com/en/motion/blog-post/oppenheimer/' }],
      slots: {
        framing: 'An intimate viewpoint that keeps the surrounding space present',
        optics: 'Natural wide perspective with gentle peripheral falloff',
        dof: 'Precise subject focus with gradual separation into the surroundings',
        light: 'Naturalistic directional light with a credible source in the scene',
        color: 'Restrained natural colors and lifelike skin',
        texture: 'Fine film-like texture with clear facial and material detail',
      },
    },
    {
      id: 'anderson-yeoman',
      label: 'Wes Anderson + Robert Yeoman',
      note: 'Tableau frontal, organização gráfica e espaço legível. Interpretação dos quadros em cor de The French Dispatch, sem transformar pessoas em caricaturas.',
      works: ['The French Dispatch (2021)'],
      cameraNote: 'Em The French Dispatch: ARRICAM ST/LT, Cooke S4 e 35mm Kodak 200T/Double-X, segundo Yeoman. O filme também usou exceções de formato e óptica.',
      sources: [{ title: 'Kodak — Robert Yeoman on The French Dispatch', url: 'https://www.kodak.com/en/motion/blog-post/the-french-dispatch/' }],
      slots: {
        framing: 'A frontal balanced tableau with clearly organized subject placement',
        optics: 'Straight architectural lines and gently rounded optical rendering',
        dof: 'Deep focus keeping foreground and background subjects readable',
        light: 'Soft diffuse light maintaining clear detail across the set',
        color: 'Coordinated muted color blocks with intact subject colors',
        texture: 'Fine photographic grain and tactile set materials',
      },
    },
    {
      id: 'malick-lubezki',
      label: 'Terrence Malick + Emmanuel Lubezki',
      note: 'Observação próxima, luz disponível e gesto espontâneo. Interpretação de The Tree of Life, sem acrescentar natureza ou pôr do sol ao briefing.',
      works: ['The Tree of Life (2011)'],
      cameraNote: 'Em The Tree of Life: ARRI LT/235, Master Primes e captura 35mm, com sequências 65mm/IMAX; dados da entrevista com Lubezki ao British Cinematographer.',
      sources: [{ title: 'British Cinematographer — Emmanuel Lubezki on The Tree of Life', url: 'https://britishcinematographer.co.uk/emmanuel-lubezki-amc-asc-the-tree-of-life/' }],
      slots: {
        framing: 'A close observational viewpoint with an unforced, off-center composition',
        optics: 'Immersive wide spherical perspective without distorted anatomy',
        dof: 'Natural focus transition keeping the subject connected to the setting',
        light: 'Available-light appearance with soft ambient bounce',
        color: 'Natural earth colors and believable skin tones',
        texture: 'Fine organic film texture with unpolished material detail',
      },
    },
    {
      id: 'meirelles-charlone',
      label: 'Fernando Meirelles + César Charlone',
      note: 'Presença documental, proximidade e matéria urbana. Interpretação de Cidade de Deus, codirigido por Kátia Lund; não acrescenta violência ou pobreza à cena.',
      works: ['Cidade de Deus (2002), codireção de Kátia Lund'],
      cameraNote: 'Em Cidade de Deus: predominância de Super 16 em Aaton A-Minima, combinada com 35mm, conforme relatos de Charlone à ABC. Não é um kit único.',
      sources: [
        { title: 'ABC — Entrevista com César Charlone', url: 'https://abcine.org.br/entrevistas/entrevista-com-cesar-charlone-abc/' },
        { title: 'ABC — Sessão Cidade de Deus, 2002', url: 'https://abcine.org.br/eventos/sessao-abc-2002/' },
      ],
      slots: {
        framing: 'An immediate documentary viewpoint close to the action',
        optics: 'Natural wide perspective that retains the surrounding context',
        dof: 'Keep the principal action and nearby environment readable',
        light: 'Location-motivated light with directional contrast',
        color: 'Warm earthy color separation while retaining natural skin',
        texture: 'Visible organic film texture with honest surface wear',
      },
    },
  ].map(profile => Object.freeze({
    ...profile,
    works: Object.freeze(profile.works),
    sources: Object.freeze(profile.sources.map(source => Object.freeze(source))),
    slots: Object.freeze(profile.slots),
  })));

  function byId(id) { return DIRECTIONS.find(profile => profile.id === id) || DIRECTIONS[0]; }
  return Object.freeze({ CATALOG_NOTE, DIRECTIONS, byId });
});
