(function initFotogramaTools(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.TipoFotogramaTools = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function buildFotogramaTools() {
  'use strict';

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
      prompt: 'Retexturize the reference as a bold stylized 3D editorial frame. Preserve subject identity, pose, clothing, object count, composition, perspective and lighting logic. Use intentionally designed proportions, graphic volumes, sculpted planes, tactile handcrafted surfaces, decisive color separation and dramatic yet coherent lighting. Keep the scene sophisticated and authored, not toy-like or template-driven.',
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

  const PRESERVATION_SUFFIX = ' Fidelity is mandatory: do not add, remove or replace people, limbs, wardrobe pieces, products, props or architecture. Do not change ethnicity, age, body shape, gaze, gesture or framing. No text, captions, logos, borders or watermarks.';

  function styleById(id) {
    return STYLE_PRESETS.find(style => style.id === id) || STYLE_PRESETS[0];
  }

  function buildStylePrompt(styleId, direction) {
    const style = styleById(styleId);
    const userDirection = String(direction || '').trim();
    const directionClause = userDirection
      ? ` Additional art direction, subordinate to identity and composition fidelity: ${userDirection.slice(0, 1200)}.`
      : '';
    return `${style.prompt}${directionClause}${PRESERVATION_SUFFIX}`;
  }

  function clampInteger(value, min, max, fallback = 0) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, Math.round(number)));
  }

  return {
    EXPAND_RATIOS,
    STYLE_PRESETS,
    TOOL_COSTS,
    buildStylePrompt,
    clampInteger,
    styleById,
  };
});
