/* QuickTools — word counter core logic (pure, no DOM).
 * Unicode-safe: characters are counted by code point, not UTF-16 code units.
 */
(function () {
  'use strict';

  function toText(value) {
    return value === null || value === undefined ? '' : String(value);
  }

  function codePoints(text) {
    return [...text];
  }

  function isWhitespace(ch) {
    return /\s/.test(ch);
  }

  function analyze(text) {
    const t = toText(text);
    const cps = codePoints(t);

    const characters = cps.length;
    let charactersNoSpaces = 0;
    for (const ch of cps) {
      if (!isWhitespace(ch)) charactersNoSpaces++;
    }

    const trimmed = t.trim();
    const words = trimmed === '' ? 0 : trimmed.split(/\s+/).length;

    // Sentences: split on sentence-ending punctuation, count non-empty segments.
    // Heuristic — abbreviations like "Mr." count as boundaries; documented on-page.
    const sentences =
      trimmed === ''
        ? 0
        : t.split(/[.!?…]+/).filter(function (s) { return s.trim().length > 0; }).length;

    // Paragraphs: blocks of text separated by one or more blank lines.
    const paragraphs =
      trimmed === '' ? 0 : trimmed.split(/\r?\n\s*\r?\n/).length;

    const readingSeconds = Math.round((words / 200) * 60); // 200 wpm
    const speakingSeconds = Math.round((words / 130) * 60); // 130 wpm

    return {
      words: words,
      characters: characters,
      charactersNoSpaces: charactersNoSpaces,
      sentences: sentences,
      paragraphs: paragraphs,
      readingSeconds: readingSeconds,
      speakingSeconds: speakingSeconds
    };
  }

  const api = { analyze: analyze };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (typeof window !== 'undefined') {
    window.QuickTools = window.QuickTools || {};
    window.QuickTools.wordCounter = api;
  }
})();
