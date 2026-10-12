/* QuickTools — character counter core logic (pure, no DOM).
 * Unicode-safe: characters are counted by code point. UTF-8 byte length
 * uses TextEncoder (available in browsers and Node >= 11).
 */
(function () {
  'use strict';

  function toText(value) {
    return value === null || value === undefined ? '' : String(value);
  }

  function analyze(text) {
    const t = toText(text);
    const cps = [...t];

    const characters = cps.length;
    let charactersNoSpaces = 0;
    for (const ch of cps) {
      if (!/\s/.test(ch)) charactersNoSpaces++;
    }

    const trimmed = t.trim();
    const words = trimmed === '' ? 0 : trimmed.split(/\s+/).length;
    const lines = t === '' ? 0 : t.split(/\r?\n/).length;

    let utf8Bytes;
    if (typeof TextEncoder !== 'undefined') {
      utf8Bytes = new TextEncoder().encode(t).length;
    } else {
      // Fallback: manual UTF-8 length computation from code points.
      utf8Bytes = 0;
      for (const ch of cps) {
        const cp = ch.codePointAt(0);
        if (cp < 0x80) utf8Bytes += 1;
        else if (cp < 0x800) utf8Bytes += 2;
        else if (cp < 0x10000) utf8Bytes += 3;
        else utf8Bytes += 4;
      }
    }

    return {
      characters: characters,
      charactersNoSpaces: charactersNoSpaces,
      words: words,
      lines: lines,
      utf8Bytes: utf8Bytes
    };
  }

  const api = { analyze: analyze };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (typeof window !== 'undefined') {
    window.QuickTools = window.QuickTools || {};
    window.QuickTools.characterCounter = api;
  }
})();
