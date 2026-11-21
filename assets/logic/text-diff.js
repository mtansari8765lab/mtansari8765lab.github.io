/* QuickTools — text diff core logic (pure, no DOM).
 * Word-level diff via Hirschberg's algorithm (linear-space LCS, 1975):
 * finds the longest common subsequence of the two token streams and
 * reports everything else as additions or deletions. Tokens are runs
 * of non-whitespace (words, with punctuation attached) and runs of
 * whitespace, so joining the parts reproduces each input exactly.
 * Runs in O(n*m) time and O(m) space — no full DP table is kept.
 */
(function () {
  'use strict';

  function toText(value) {
    return value === null || value === undefined ? '' : String(value);
  }

  // Split into tokens: non-whitespace runs and whitespace runs.
  function tokenize(text) {
    if (text === '') return [];
    var m = text.match(/\S+|\s+/g);
    return m || [];
  }

  function isWord(token) {
    return /\S/.test(token);
  }

  function countWords(text) {
    var toks = tokenize(toText(text));
    var n = 0;
    for (var i = 0; i < toks.length; i++) {
      if (isWord(toks[i])) n++;
    }
    return n;
  }

  // Last row of the LCS dynamic-programming table for token arrays a, b:
  // row[k] = LCS length of a vs b[0..k). Only two rows are kept.
  function lcsRow(a, b) {
    var m = b.length;
    var prev = new Array(m + 1);
    var curr = new Array(m + 1);
    for (var j = 0; j <= m; j++) prev[j] = 0;
    for (var i = 0; i < a.length; i++) {
      curr[0] = 0;
      for (var k = 0; k < m; k++) {
        if (a[i] === b[k]) curr[k + 1] = prev[k] + 1;
        else curr[k + 1] = prev[k + 1] > curr[k] ? prev[k + 1] : curr[k];
      }
      var tmp = prev;
      prev = curr;
      curr = tmp;
    }
    return prev;
  }

  // Hirschberg divide-and-conquer. Appends {type, token} ops to `out`,
  // where type is 'same', 'add' (in modified only) or 'del' (in original only).
  function hirschberg(a, b, out) {
    var n = a.length;
    var m = b.length;
    if (n === 0) {
      for (var j = 0; j < m; j++) out.push({ type: 'add', token: b[j] });
      return;
    }
    if (m === 0) {
      for (var i = 0; i < n; i++) out.push({ type: 'del', token: a[i] });
      return;
    }
    if (n === 1) {
      var idx = b.indexOf(a[0]);
      if (idx === -1) {
        out.push({ type: 'del', token: a[0] });
        for (var k = 0; k < m; k++) out.push({ type: 'add', token: b[k] });
      } else {
        for (var k2 = 0; k2 < idx; k2++) out.push({ type: 'add', token: b[k2] });
        out.push({ type: 'same', token: a[0] });
        for (var k3 = idx + 1; k3 < m; k3++) out.push({ type: 'add', token: b[k3] });
      }
      return;
    }
    var mid = Math.floor(n / 2);
    var left = lcsRow(a.slice(0, mid), b);
    // LCS of a[mid..] vs b[k..] equals lcsRow of the reversed tails
    // at index (m - k), so the best split k maximises left[k] + right[m - k].
    var right = lcsRow(a.slice(mid).reverse(), b.slice().reverse());
    var bestK = 0;
    var bestVal = -1;
    for (var k = 0; k <= m; k++) {
      var v = left[k] + right[m - k];
      if (v > bestVal) {
        bestVal = v;
        bestK = k;
      }
    }
    hirschberg(a.slice(0, mid), b.slice(0, bestK), out);
    hirschberg(a.slice(mid), b.slice(bestK), out);
  }

  // Compare two texts. Returns:
  //   parts: [{type: 'same'|'add'|'del', text}] — consecutive tokens of
  //          one type merged; joining 'same'+'del' parts gives the
  //          original, joining 'same'+'add' parts gives the modified.
  //   identical: true only when the two inputs are exactly equal.
  //   wordsOriginal / wordsModified: word counts of each input.
  //   wordsAdded / wordsRemoved / wordsUnchanged: word counts per part type.
  function diff(original, modified) {
    var a = tokenize(toText(original));
    var b = tokenize(toText(modified));
    var ops = [];
    hirschberg(a, b, ops);
    var parts = [];
    for (var i = 0; i < ops.length; i++) {
      var op = ops[i];
      var last = parts[parts.length - 1];
      if (last && last.type === op.type) last.text += op.token;
      else parts.push({ type: op.type, text: op.token });
    }
    var wordsAdded = 0;
    var wordsRemoved = 0;
    var wordsUnchanged = 0;
    for (var p = 0; p < parts.length; p++) {
      var w = countWords(parts[p].text);
      if (parts[p].type === 'add') wordsAdded += w;
      else if (parts[p].type === 'del') wordsRemoved += w;
      else wordsUnchanged += w;
    }
    return {
      parts: parts,
      identical: toText(original) === toText(modified),
      wordsOriginal: countWords(original),
      wordsModified: countWords(modified),
      wordsAdded: wordsAdded,
      wordsRemoved: wordsRemoved,
      wordsUnchanged: wordsUnchanged
    };
  }

  const api = { diff: diff, countWords: countWords };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (typeof window !== 'undefined') {
    window.QuickTools = window.QuickTools || {};
    window.QuickTools.textDiff = api;
  }
})();
