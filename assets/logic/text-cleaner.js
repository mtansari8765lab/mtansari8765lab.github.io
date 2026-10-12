/* QuickTools — text cleaner core logic (pure, no DOM).
 * Operations are applied in a fixed, documented order:
 *   1. strip HTML tags
 *   2. remove line breaks (replaced with a single space)
 *   3. remove empty lines
 *   4. trim each line
 *   5. remove duplicate lines (keeps the FIRST occurrence, exact match)
 *   6. collapse extra horizontal whitespace (spaces/tabs, not newlines)
 */
(function () {
  'use strict';

  function toText(value) {
    return value === null || value === undefined ? '' : String(value);
  }

  function lineCount(s) {
    return s === '' ? 0 : s.split(/\r?\n/).length;
  }

  function clean(text, options) {
    const t = toText(text);
    const opts = options || {};
    const linesBefore = lineCount(t);

    let out = t;

    if (opts.stripHtml) {
      out = out.replace(/<[^>]*>/g, '');
    }
    if (opts.removeLineBreaks) {
      out = out.replace(/\r?\n/g, ' ');
    }
    if (opts.removeEmptyLines) {
      out = out
        .split(/\r?\n/)
        .filter(function (line) { return line.trim() !== ''; })
        .join('\n');
    }
    if (opts.trimLines) {
      out = out
        .split(/\r?\n/)
        .map(function (line) { return line.trim(); })
        .join('\n');
    }
    if (opts.removeDuplicateLines) {
      const seen = new Set();
      out = out
        .split(/\r?\n/)
        .filter(function (line) {
          if (seen.has(line)) return false;
          seen.add(line);
          return true;
        })
        .join('\n');
    }
    if (opts.collapseWhitespace) {
      out = out.replace(/[ \t\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]+/g, ' ');
    }

    const linesAfter = lineCount(out);
    const charsRemoved = t.length - out.length;

    return {
      output: out,
      linesBefore: linesBefore,
      linesAfter: linesAfter,
      charsRemoved: charsRemoved
    };
  }

  const api = { clean: clean };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (typeof window !== 'undefined') {
    window.QuickTools = window.QuickTools || {};
    window.QuickTools.textCleaner = api;
  }
})();
