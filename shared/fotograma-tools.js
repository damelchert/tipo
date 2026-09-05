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
      prompt: 'Transform the reference into a premium cinematic 3D animated feature frame. Preserve the exact subject identity, pose, wardrobe, objects, camera position, composition and lighting direction. Build believable materials, subtle stylization, expressive but anatomically coherent faces, physically motivated light, atmospheric depth, rich surface texture and organic cinema-lens falloff. It must feel art-directed as one complete film frame, never like a generic 3D render.',
    }),
    Object.freeze({
      id: 'feature3d',
      label: 'Feature 3D',
      note: 'formas claras e expressão ampla',
      prompt: 'Transform the reference into a polished family animated-feature 3D frame. Preserve the exact people, recognizable identity, pose, wardrobe, props, composition and camera angle. Use appealing simplified forms, readable silhouettes, warm expressive faces, carefully groomed hair, tactile materials, soft global illumination and controlled cinematic depth. Avoid copying any named franchise, character or studio signature.',
    }),
    Object.freeze({
      id: 'stylized3d',
      label: 'Stylized 3D',
      note: 'design gráfico e volumes ousados',
      prompt: 'Retexturize the reference as a bold stylized 3D editorial frame. Preserve subject identity, body proportions, pose, clothing, object count, composition, perspective and lighting logic. Use graphic surface design, sculpted planes, tactile handcrafted surfaces and decisive color separation. Translate the original lighting into the chosen medium without moving its sources or shadows. Keep the scene authored, not toy-like or template-driven.',
    }),
    Object.freeze({
      id: 'modern2d',
      label: 'Modern 2D',
      note: 'linha editorial e cor chapada',
      prompt: 'Transform the reference into a contemporary hand-drawn 2D animation frame. Preserve the exact identity, pose, wardrobe, objects, spatial relationships, composition and camera angle. Use confident economical linework, designed shape language, layered flat color, restrained texture, selective cel shading and cinematic light grouping. Retain human nuance and environmental depth; avoid vector-clipart stiffness.',
    }),
    Object.freeze({
      id: 'animefilm',
      label: 'Anime Film',
      note: 'desenho manual e fundo pintado',
      prompt: 'Transform the reference into a premium hand-drawn Japanese animated feature-film frame. Preserve the same person, identity, pose, clothing, objects, composition, camera angle and lighting direction. Use expressive clean linework, richly painted backgrounds, subtle cel shading, cinematic color, natural human proportions and quiet photographic observation. Do not imitate a specific living artist or named production.',
    }),
    Object.freeze({
      id: 'clay',
      label: 'Clay',
      note: 'stop-motion tátil',
      prompt: 'Transform the reference into a meticulously crafted stop-motion clay animation frame. Preserve subject identity, pose, wardrobe, props, composition, camera angle and lighting direction. Render hand-shaped clay surfaces, tiny fingerprints, miniature fabric and practical sets, replacement-animation facial design, shallow macro depth and warm physical lighting. Keep proportions coherent and avoid glossy plastic CGI.',
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

  const PRESERVATION_SUFFIX = ' Fidelity is mandatory: do not add, remove or replace people, limbs, wardrobe pieces, products, props or architecture. Do not change ethnicity, age, body shape, gaze, gesture or framing. Change the rendering medium and requested palette, not the scene content. Keep source lighting direction and shadow placement while translating their texture into the chosen medium. Preserve existing legible lettering and product marks; do not add new text, captions, logos, borders or watermarks. Produce one still image, not an animation or contact sheet.';

  function styleById(id) {
    return STYLE_PRESETS.find(style => style.id === id) || STYLE_PRESETS[0];
  }

  function buildStylePrompt(styleId, direction) {
    const style = styleById(styleId);
    const userDirection = validatedDirection(direction);
    const directionClause = userDirection
      ? ` Additional art direction, subordinate to identity and composition fidelity: ${userDirection}.`
      : '';
    return `${style.prompt}${directionClause}${PRESERVATION_SUFFIX}`;
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
    return clean ? ` ${label}: ${clean}.` : '';
  }

  function buildCastPrompt(options = {}) {
    const style = byId(CAST_STYLES, options.styleId);
    const background = byId(CAST_BACKGROUNDS, options.backgroundId);
    const hasReference = options.hasReference === true;
    const identity = hasReference
      ? 'Image 1 is the sole identity authority. Preserve the exact recognizable face, age, ethnicity, skin tone, hair, body proportions and distinctive features.'
      : 'Create one canonical adult character unless the brief specifies another age, with a specific recognizable face, coherent anatomy and stable identity. Follow the written age exactly.';
    return `CAST — canonical character design. ${identity}${directionClause(options.description, 'Character brief')} ${style.prompt} Use a ${background.prompt}. Produce one person in one finished portrait, not a contact sheet. Do not add a second person, duplicate the subject, merge faces, beautify away distinctive features or alter requested wardrobe. Keep hands and anatomy coherent. No text, captions, logos, borders or watermarks.`;
  }

  function buildProductPrompt(options = {}) {
    const style = byId(PRODUCT_STYLES, options.styleId);
    const hasReference = options.hasReference === true;
    const authority = hasReference
      ? 'Image 1 is the sole product authority. Preserve the exact product geometry, proportions, construction, materials, colors, surface finish and components. Preserve every legible brand mark and packaging feature exactly where it exists; do not invent or rewrite label text. A requested camera change may reveal another view of the same object, never redesign it.'
      : 'Create one original product exactly from the written brief, with coherent construction, manufacturable geometry and physically believable materials. Do not invent brand names or label text.';
    return `PRODUCT — faithful commercial image. ${authority}${directionClause(options.direction, 'Campaign direction')} ${style.prompt} Show one canonical product unless the brief explicitly requests a set. Lighting, environment and camera may change, but the product itself may not be redesigned, simplified, duplicated or accessorized. No floating typography, captions, borders or watermarks.`;
  }

  function buildSheetPrompt(options = {}) {
    const type = byId(SHEET_TYPES, options.typeId);
    const subjectProtection = type.id === 'productViews'
      ? 'Preserve exact product geometry, components, materials, colors, branding and distinctive details. Use five clearly separated panels: four complete-object views and one intentional close detail. Infer unseen surfaces conservatively; this is an AI interpretation, not a measured technical drawing.'
      : 'Preserve exact facial identity, age, body proportions, hair, wardrobe and distinctive features across every panel. Change only the requested view, expression or pose. Do not merge faces or invent another person.';
    const layout = type.id === 'expressions'
      ? 'Arrange the six expressions in a 3-by-2 grid with consistent head-and-shoulders crops, eye level and face scale. Keep the complete head and hair inside each panel; the torso may be cropped.'
      : type.id === 'poses'
        ? 'Arrange six full-body poses in a 3-by-2 grid. Keep the complete head, hands and feet inside each panel with clear margins.'
        : type.id === 'characterTurnaround'
          ? 'Arrange four full-body views in one horizontal row. Keep the complete head, hands and feet inside each panel with clear margins. Do not treat unseen clothing details as verified facts.'
          : 'Use a balanced reference-board layout; keep complete objects inside their four view panels and reserve cropping only for the detail panel.';
    return `SHEETS — controlled reference board. Image 1 is the sole identity and design authority. ${type.prompt} Use a consistent neutral studio background, equal panel sizing, stable scale, matched lighting and clear separation between panels. Every panel must depict the same canonical subject — never relatives, variants or multiple products. ${subjectProtection} ${layout}${directionClause(options.direction, 'Additional sheet direction, subordinate to identity and panel-count fidelity')} No decorative layout, added labels, floating typography, borders or watermarks. Preserve lettering that belongs to the source subject.`;
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
