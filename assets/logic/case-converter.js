/* QuickTools — case converter core logic (pure, no DOM).
 * Title Case treats apostrophes inside words sensibly: "don't" -> "Don't",
 * "o'clock" -> "O'clock". Sentence case capitalises the first letter after
 * sentence-ending punctuation (. ! ? …).
 */
(function () {
  'use strict';

  function toText(value) {
    return value === null || value === undefined ? '' : String(value);
  }

  function toUpper(text) {
    return toText(text).toUpperCase();
  }

  function toLower(text) {
    return toText(text).toLowerCase();
  }

  // Capitalise the first letter of each word; internal apostrophes do not
  // start a new word ("don't" -> "Don't").
  function toTitle(text) {
    const t = toText(text);
    return t.replace(/[\p{L}\p{N}]+(?:'[\p{L}\p{N}]+)*/gu, function (word) {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });
  }

  // Lowercase everything, then capitalise the first letter of the text and
  // the first letter following sentence-ending punctuation.
  function toSentence(text) {
    const t = toText(text).toLowerCase();
    return t.replace(/(^\s*\p{L})|([.!?…]+['"”’)\]]*\s+\p{L})/gu, function (m) {
      return m.toUpperCase();
    });
  }

  // Capitalised case: first alphabetic character upper, everything else lower.
  function toCapitalized(text) {
    const t = toText(text).toLowerCase();
    return t.replace(/\p{L}/u, function (m) { return m.toUpperCase(); });
  }

  // aLtErNaTiNg case: even positions lower, odd positions upper.
  function toAlternating(text) {
    const cps = [...toText(text)];
    return cps
      .map(function (ch, i) { return i % 2 === 0 ? ch.toLowerCase() : ch.toUpperCase(); })
      .join('');
  }

  const api = {
    toUpper: toUpper,
    toLower: toLower,
    toTitle: toTitle,
    toSentence: toSentence,
    toCapitalized: toCapitalized,
    toAlternating: toAlternating
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (typeof window !== 'undefined') {
    window.QuickTools = window.QuickTools || {};
    window.QuickTools.caseConverter = api;
  }
})();
