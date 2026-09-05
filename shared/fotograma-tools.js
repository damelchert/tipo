(function initFotogramaTools(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.TipoFotogramaTools = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function buildFotogramaTools() {
  'use strict';

  // Share the Create brief budget. Never silently discard production direction.
  const MAX_DIRECTION_CHARS = 12000;

  const TOOL_COSTS = Object.freeze({
    multiAngle: 0.2,
    expand: 2,
    removeBg: 1,
  });

  const EXPAND_RATIOS = Object.freeze(['21:9', '16:9', '3:2', '4:3', '1:1', '3:4', '2:3', '9:16']);

  const STYLE_PRESETS = Object.freeze([
    Object.freeze({
      id: 'film3d',
      label: '3D Film',
      note: 'cinema, matéria e luz natural',
      prompt: 'Render the reference as a cinematic 3D animated feature frame with subtly sculpted forms, believable materials and detailed surface texture.',
    }),
    Object.freeze({
      id: 'feature3d',
      label: 'Feature 3D',
      note: 'formas claras e expressão ampla',
      prompt: 'Render the reference as a family animated-feature 3D frame with simplified forms, readable silhouettes, groomed hair and tactile materials.',
    }),
    Object.freeze({
      id: 'stylized3d',
      label: 'Stylized 3D',
      note: 'design gráfico e volumes ousados',
      prompt: 'Render the reference as a stylized 3D editorial frame with sculpted planes, graphic surface patterns and handcrafted material texture.',
    }),
    Object.freeze({
      id: 'modern2d',
      label: 'Modern 2D',
      note: 'linha editorial e cor chapada',
      prompt: 'Render the reference as a contemporary hand-drawn 2D animation frame with economical linework, layered flat color and restrained cel shading.',
    }),
    Object.freeze({
      id: 'animefilm',
      label: 'Anime Film',
      note: 'desenho manual e fundo pintado',
      prompt: 'Render the reference as a hand-drawn Japanese animated feature-film frame with clean linework, painted backgrounds and subtle cel shading.',
    }),
    Object.freeze({
      id: 'clay',
      label: 'Clay',
      note: 'stop-motion tátil',
      prompt: 'Render the reference as a stop-motion clay animation frame with hand-shaped surfaces, tiny fingerprints, miniature fabric and practical-set texture.',
    }),
  ]);

  const CAST_STYLES = Object.freeze([
    Object.freeze({ id: 'natural', label: 'Natural', note: 'casting realista e direto', prompt: 'Natural documentary casting portrait, believable skin, restrained grooming, ordinary human asymmetry and honest wardrobe texture.' }),
    Object.freeze({ id: 'cinematic', label: 'Cinematic', note: 'presença e luz de longa', prompt: 'Cinematic character portrait with motivated light, dimensional separation, restrained color and the presence of a narrative-film casting still.' }),
    Object.freeze({ id: 'editorial', label: 'Editorial', note: 'moda e atitude controlada', prompt: 'Editorial casting portrait with intentional styling, confident posture, precise silhouette, material detail and sophisticated magazine restraint.' }),
    Object.freeze({ id: 'advertising', label: 'Advertising', note: 'polimento de campanha', prompt: 'Contemporary advertising casting portrait with approachable expression, clean commercial finish, controlled highlights and premium but believable polish.' }),
  ]);

  const CAST_BACKGROUNDS = Object.freeze([
    Object.freeze({ id: 'white', label: 'Branco', note: 'recorte limpo', prompt: 'seamless warm-white casting backdrop with a soft contact shadow' }),
    Object.freeze({ id: 'studioGrey', label: 'Cinza estúdio', note: 'volume neutro', prompt: 'neutral mid-grey studio sweep with subtle tonal falloff and grounded contact shadow' }),
    Object.freeze({ id: 'location', label: 'Locação', note: 'contexto discreto', prompt: 'restrained real location related to the character, softly separated and never competing with the person' }),
    Object.freeze({ id: 'night', label: 'Noturno', note: 'practical motivado', prompt: 'minimal night environment with one motivated practical source and deep readable separation' }),
  ]);

  const PRODUCT_STYLES = Object.freeze([
    Object.freeze({ id: 'studio', label: 'Studio', note: 'catálogo premium', prompt: 'Premium studio product photograph with controlled gradients, exact edges, honest materials and a physically plausible contact shadow.' }),
    Object.freeze({ id: 'campaign', label: 'Campaign', note: 'key visual publicitário', prompt: 'High-end campaign key visual with authored art direction, decisive composition, sculpted light and a premium contemporary finish.' }),
    Object.freeze({ id: 'lifestyle', label: 'Lifestyle', note: 'produto em contexto', prompt: 'Believable lifestyle product photograph in a purposeful real environment, with the product remaining the clear hero and all interactions physically plausible.' }),
    Object.freeze({ id: 'macro', label: 'Macro detail', note: 'matéria e acabamento', prompt: 'Precision macro product photograph emphasizing construction, surface finish, seams and functional details without deforming the object.' }),
  ]);

  const SHEET_TYPES = Object.freeze([
    Object.freeze({ id: 'characterTurnaround', label: 'Character 360°', note: 'frente, ¾, perfil e costas', prompt: 'Create a clean character turnaround sheet showing the same single character in front, three-quarter, side and back views.' }),
    Object.freeze({ id: 'expressions', label: 'Expressões', note: 'seis estados faciais', prompt: 'Create a six-panel facial expression sheet of the same single character: neutral, joy, concern, anger, surprise and quiet concentration.' }),
    Object.freeze({ id: 'poses', label: 'Poses', note: 'seis poses de corpo inteiro', prompt: 'Create a six-panel full-body pose sheet of the same single character with varied natural actions while preserving body, face, wardrobe and proportions.' }),
    Object.freeze({ id: 'productViews', label: 'Produto 360°', note: 'vistas e detalhe técnico', prompt: 'Create a clean multi-view sheet showing the same single product in every panel: front, three-quarter, side, rear and detail views.' }),
  ]);

  const PRESERVATION_SUFFIX = 'Fidelity is mandatory: retain identity, expression, body proportions, pose, wardrobe, object count, composition and camera angle. Change only the rendering medium and requested palette or surface treatment. Keep source lighting, shadows, exposure and focus. Preserve existing legible lettering and product marks. Add no captions, borders or watermarks. Produce one still image, not an animation or contact sheet.';

  function styleById(id) {
    return STYLE_PRESETS.find(style => style.id === id) || STYLE_PRESETS[0];
  }

  function buildStylePrompt(styleId, direction) {
    const style = styleById(styleId);
    return `${style.prompt}\n${PRESERVATION_SUFFIX}${directionClause(direction, 'Art direction for palette and surface treatment; source fidelity stays fixed')}`;
  }

  function byId(items, id) {
    return items.find(item => item.id === id) || items[0];
  }

  function validatedDirection(value) {
    const clean = String(value || '').trim();
    if (clean.length > MAX_DIRECTION_CHARS) throw new RangeError(`A direção ultrapassou ${MAX_DIRECTION_CHARS.toLocaleString('pt-BR')} caracteres. Reduza apenas o excedente; nenhum trecho será cortado automaticamente.`);
    return clean;
  }

  function directionClause(value, label = 'Additional direction') {
    const clean = validatedDirection(value);
    // Keep the original brief as one separate block, including punctuation and line breaks.
    return clean ? `\n${label}:\n${clean}` : '';
  }

  function buildCastPrompt(options = {}) {
    const style = byId(CAST_STYLES, options.styleId);
    const background = byId(CAST_BACKGROUNDS, options.backgroundId);
    const hasReference = options.hasReference === true;
    const identity = hasReference
      ? 'Image 1 is the sole identity authority: retain face, age, ethnicity, skin tone, hair, body proportions and distinctive features.'
      : 'Create one canonical adult character unless the brief specifies another age; follow that age exactly.';
    return `CAST — one finished character portrait. ${identity} Do not add a second person or merge faces. Keep anatomy and requested wardrobe coherent. Explicit brief instructions override style and background defaults, not referenced identity. Keep physical lettering already present or requested; add no captions, borders or watermarks.\nStyle default: ${style.prompt}\nBackground default: ${background.prompt}.${directionClause(options.description, 'Character brief')}`;
  }

  function buildProductPrompt(options = {}) {
    const style = byId(PRODUCT_STYLES, options.styleId);
    const hasReference = options.hasReference === true;
    const authority = hasReference
      ? 'Image 1 is the product authority. Preserve exact product geometry, components, materials, colors and finish. Preserve every legible brand mark and packaging feature; do not invent or rewrite label text. A new view must depict the same design; infer unseen surfaces conservatively.'
      : 'Build the product described in the brief with coherent construction and believable materials. Include brand names and label text only when supplied in the brief.';
    return `PRODUCT — faithful commercial image. ${authority} Show one product; include sets or accessories only when explicitly requested. Lighting, environment and camera may change, not product design. The brief overrides style defaults. Add no floating typography, captions, borders or watermarks.\nStyle default: ${style.prompt}${directionClause(options.direction, 'Campaign direction')}`;
  }

  function buildSheetPrompt(options = {}) {
    const type = byId(SHEET_TYPES, options.typeId);
    const subjectProtection = type.id === 'productViews'
      ? 'Preserve exact product geometry, components, materials, colors and branding. Use five clearly separated panels: four complete-object views and one close detail. Infer unseen surfaces conservatively; this is an AI interpretation, not a measured technical drawing.'
      : 'Preserve facial identity, age, body proportions, hair, wardrobe and distinctive features. Change only the requested view, expression or pose.';
    const layout = type.id === 'expressions'
      ? 'Arrange the six expressions in a 3-by-2 grid with consistent head-and-shoulders crops, eye level and face scale. Keep the complete head and hair inside each panel; the torso may be cropped.'
      : type.id === 'poses'
        ? 'Arrange six full-body poses in a 3-by-2 grid. Keep the complete head, hands and feet inside each panel with clear margins.'
        : type.id === 'characterTurnaround'
          ? 'Arrange four full-body views in one horizontal row. Keep the complete head, hands and feet inside each panel with clear margins. Do not treat unseen clothing details as verified facts.'
          : 'Use equal panel sizes. Keep complete objects at consistent scale in the four view panels; the detail panel may use a larger scale and a close crop.';
    return `SHEETS — one reference board. Image 1 is the sole identity and design authority. ${type.prompt} ${subjectProtection} ${layout} Use a neutral background, matched lighting and clear panel separation. Preserve source lettering; add no labels, decorative borders or watermarks.${directionClause(options.direction, 'Sheet brief, subordinate to identity and panel-count fidelity')}`;
  }

  function clampInteger(value, min, max, fallback = 0) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, Math.round(number)));
  }

  return {
    EXPAND_RATIOS,
    MAX_DIRECTION_CHARS,
    CAST_BACKGROUNDS,
    CAST_STYLES,
    PRODUCT_STYLES,
    SHEET_TYPES,
    STYLE_PRESETS,
    TOOL_COSTS,
    buildCastPrompt,
    buildProductPrompt,
    buildSheetPrompt,
    buildStylePrompt,
    clampInteger,
    styleById,
    validatedDirection,
  };
});
