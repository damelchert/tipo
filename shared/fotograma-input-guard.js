(function initFotogramaInputGuard(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.TipoFotogramaInputGuard = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function buildFotogramaInputGuard() {
  'use strict';

  // A deterministic intent filter, not an authorization or confidentiality
  // boundary. Public client code and locally installed code remain inspectable.
  // Normalize for detection only: never rewrite the user's creative input.
  const ERROR_CODE = 'FOTOGRAMA_INPUT_BLOCKED';
  const PUBLIC_MESSAGE = 'Pedido não permitido. Descreva o resultado visual desejado.';

  function normalize(value) {
    return String(value == null ? '' : value)
      .normalize('NFKC')
      .replace(/[\u00ad\u034f\u061c\u180e\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g, '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  const internalTarget = [
    '(?:system|developer|hidden|internal|private|secret|initial|original)\\s*(?:prompt|instructions?|rules?|polic(?:y|ies)|configuration)',
    '(?:prompt|instrucoes|instrucao|regras?|diretrizes|politicas?|configurac(?:ao|oes))\\s+(?:(?:do|de|da|dos|das)\\s+)?(?:sistema|desenvolvedor|intern[oa]s?|ocult[oa]s?|secret[oa]s?|privad[oa]s?)',
    '(?:your|suas?|seus?)\\s+(?:system\\s+|developer\\s+|internal\\s+|hidden\\s+|safety\\s+)?(?:prompts?|instructions?|rules?|polic(?:y|ies)|configurations?|instrucoes|instrucao|regras?|diretrizes|politicas?|configurac(?:ao|oes))',
    '(?:receitas?|recipes?)\\s+(?:intern[oa]s?\\s+|internal\\s+|hidden\\s+|secret[oa]s?\\s+)?(?:do|de|da|dos|das|of|for|behind)\\s+(?:the\\s+)?(?:looks?|presets?|tipo|fotograma|assistente|assistant)',
    '(?:codigo\\s+fonte|source\\s+code)\\b.{0,60}\\b(?:compilador\\s+(?:de\\s+)?prompts?|prompt\\s+compiler|tipo|fotograma)',
  ].join('|');
  const extractVerb = '(?:show|reveal|display|print|repeat|recite|copy|return|output|dump|extract|disclose|provide|share|tell|give|translate|summarize|explain|list|read|write|revele|revelar|mostre|mostrar|exiba|exibir|exponha|imprima|imprimir|repita|repetir|transcreva|copie|copiar|liste|extraia|extrair|compartilhe|descreva|explique|traduza|traduzir|resuma|forneca|leia|escreva|diga|envie|passe|me\\s+(?:de|da)|quero\\s+ver|gostaria\\s+de\\s+ver|want\\s+to\\s+see)';
  const extraction = new RegExp('\\b' + extractVerb + '\\b[\\s\\S]{0,180}\\b(?:' + internalTarget + ')\\b', 'i');
  const extractionQuestion = new RegExp('\\b(?:what\\s+(?:is|are)|qual\\s+(?:e|era)|quais\\s+(?:sao|eram))\\b[\\s\\S]{0,80}\\b(?:' + internalTarget + ')\\b', 'i');
  const reverseExtraction = new RegExp('\\b(?:' + internalTarget + ')\\b\\s*[:=,]\\s*' + extractVerb + '\\b', 'i');

  const bypassVerb = '(?:ignore|ignorar|ignora|disregard|forget|override|bypass|disable|circumvent|desconsidere|esqueca|burle|contorne|desative|anule|substitua)';
  const priorTarget = [
    internalTarget,
    '(?:(?:all|the|any)\\s+)*(?:previous|prior|above|earlier|system|developer)\\s+(?:instructions?|rules?|prompts?|polic(?:y|ies))',
    '(?:instrucoes|instrucao|regras?|prompts?)\\s+(?:anterior(?:es)?|previas?|acima|iniciais?|do\\s+sistema)',
    '(?:todas?\\s+(?:as?\\s+)?|all\\s+)(?:instrucoes|regras?|instructions?|rules?)',
  ].join('|');
  const bypass = new RegExp('\\b' + bypassVerb + '\\b[\\s\\S]{0,100}\\b(?:' + priorTarget + ')\\b', 'i');
  const privilegedMode = /\b(?:enable|activate|enter|ative|ativar|habilite|entrar|entre)\b.{0,60}\b(?:developer mode|admin mode|unrestricted mode|modo (?:desenvolvedor|administrador|sem restricoes))\b/i;

  function inspect(value) {
    // Safety rules belonging to a named physical workplace are not this
    // application's instructions. Remove only that target, not its sentence:
    // an additional request for a system prompt is still detected normally.
    const text = normalize(value).replace(/\b(?:regras?|instrucoes|normas)\s+internas?\s+de\s+seguranca\s+(?:de|em|para)\s+(?:(?:uma|a|esta)\s+)?(?:fabrica|oficina|escola|obra|edificio)\b/g, 'normas de seguranca de local fisico');
    const blocked = extraction.test(text) || extractionQuestion.test(text) ||
      reverseExtraction.test(text) || bypass.test(text) || privilegedMode.test(text);
    return { blocked, code: blocked ? ERROR_CODE : null };
  }

  function assertAllowed(...values) {
    if (!values.some(value => inspect(value).blocked)) return;
    const error = new Error(PUBLIC_MESSAGE);
    error.code = ERROR_CODE;
    error.status = 400;
    throw error;
  }

  return Object.freeze({ normalize, inspect, assertAllowed, PUBLIC_MESSAGE, ERROR_CODE });
});
