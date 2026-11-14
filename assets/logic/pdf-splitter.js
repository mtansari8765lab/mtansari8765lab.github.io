/* QuickTools — PDF splitter core logic (pure, no DOM).
 * Splitting uses the vendored pdf-lib (assets/vendor/pdf-lib.min.js,
 * MIT), loaded as window.PDFLib in the browser or required in Node
 * tests — the same stack as the PDF merger. Everything runs in the
 * browser: the file is never uploaded anywhere.
 */
(function () {
  'use strict';

  var MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB stated limit

  function hasPdfMagic(bytes) {
    return bytes instanceof Uint8Array && bytes.length >= 4 &&
      bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46; // %PDF
  }

  function isPdfFile(file) {
    if (!file) return false;
    var type = String(file.type || '').toLowerCase();
    if (type === 'application/pdf') return true;
    return /\.pdf$/i.test(String(file.name || ''));
  }

  function formatBytes(bytes) {
    if (!(bytes >= 0)) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    var units = ['KB', 'MB', 'GB'];
    var v = bytes / 1024;
    var u = 0;
    while (v >= 1024 && u < units.length - 1) { v /= 1024; u++; }
    return (v >= 100 ? Math.round(v) : v.toFixed(1)) + ' ' + units[u];
  }

  // Parse a page-range spec like "1-3, 5, 8-" against totalPages.
  // Also accepts "all", "odd", "even" (case-insensitive).
  // Returns a sorted array of unique 1-based page numbers.
  // Throws Error with a user-facing message on bad input.
  function parsePageSpec(spec, totalPages) {
    totalPages = Math.floor(totalPages);
    if (!(totalPages > 0)) throw new Error('This PDF has no pages to split.');
    var s = String(spec == null ? '' : spec).trim().toLowerCase();
    if (s === '' ) throw new Error('Enter the pages to extract, e.g. 1-3, 5.');
    if (s === 'all') {
      var all = [];
      for (var i = 1; i <= totalPages; i++) all.push(i);
      return all;
    }
    if (s === 'odd' || s === 'even') {
      var out = [];
      for (var p = 1; p <= totalPages; p++) {
        if (s === 'odd' ? p % 2 === 1 : p % 2 === 0) out.push(p);
      }
      return out;
    }
    var pages = [];
    var parts = s.split(',');
    for (var j = 0; j < parts.length; j++) {
      var part = parts[j].trim();
      if (!part) throw new Error('Empty entry in page list — check for a stray comma in "' + spec + '".');
      var m = /^(\d+)\s*-\s*(\d*)$/.exec(part);
      if (m) {
        var start = parseInt(m[1], 10);
        var end = m[2] === '' ? totalPages : parseInt(m[2], 10);
        if (start < 1) throw new Error('Page numbers start at 1, not 0.');
        if (end < start) throw new Error('Range "' + part + '" is backwards — the end page must be after the start page.');
        if (start > totalPages) throw new Error('Page ' + start + ' does not exist — this PDF has ' + totalPages + ' page' + (totalPages === 1 ? '' : 's') + '.');
        if (end > totalPages) throw new Error('Page ' + end + ' does not exist — this PDF has ' + totalPages + ' page' + (totalPages === 1 ? '' : 's') + '.');
        for (var k = start; k <= end; k++) pages.push(k);
      } else if (/^\d+$/.test(part)) {
        var n = parseInt(part, 10);
        if (n < 1) throw new Error('Page numbers start at 1, not 0.');
        if (n > totalPages) throw new Error('Page ' + n + ' does not exist — this PDF has ' + totalPages + ' page' + (totalPages === 1 ? '' : 's') + '.');
        pages.push(n);
      } else {
        throw new Error('Could not understand "' + part + '". Use pages like 1-3, 5, 8- or the words all, odd, even.');
      }
    }
    pages.sort(function (a, b) { return a - b; });
    var deduped = [];
    pages.forEach(function (p) { if (deduped.indexOf(p) === -1) deduped.push(p); });
    return deduped;
  }

  // Split a spec into contiguous ranges, e.g. "1-3, 5" -> [[1,3],[5,5]].
  // Used for the "one file per range" mode.
  function parseRanges(spec, totalPages) {
    var pages = parsePageSpec(spec, totalPages);
    var ranges = [];
    pages.forEach(function (p) {
      var last = ranges[ranges.length - 1];
      if (last && last[1] === p - 1) last[1] = p;
      else ranges.push([p, p]);
    });
    return ranges;
  }

  function describeRange(range) {
    return range[0] === range[1] ? String(range[0]) : range[0] + '-' + range[1];
  }

  function buildOutputName(baseName, suffix) {
    var base = String(baseName || 'document').replace(/\.pdf$/i, '').replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'document';
    return base + '-' + suffix + '.pdf';
  }

  function checkPdfLib(pdfLib) {
    if (!pdfLib || !pdfLib.PDFDocument) {
      throw new Error('PDF engine failed to load. Please reload the page.');
    }
  }

  function checkBytes(bytes) {
    var b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    if (!hasPdfMagic(b)) throw new Error('That file is not a valid PDF (missing %PDF header).');
    return b;
  }

  // Load a PDF and return its page count. Rejects on encrypted files
  // with a plain-English message (pdf-lib throws on encrypted input).
  function getPageCount(bytes, pdfLib) {
    var b;
    try {
      checkPdfLib(pdfLib);
      b = checkBytes(bytes);
    } catch (e) { return Promise.reject(e); }
    return pdfLib.PDFDocument.load(b, { ignoreEncryption: false }).then(
      function (doc) { return doc.getPageCount(); },
      function (e) {
        if (/encrypted/i.test(String(e && e.message))) {
          throw new Error('This PDF is password-protected. Open it in a PDF reader, remove the password, save, and then split it.');
        }
        throw new Error('Could not read that PDF: ' + (e && e.message ? e.message : 'unknown error'));
      }
    );
  }

  // Extract the given 1-based pages into one new PDF.
  // Returns Promise<Uint8Array>.
  function extractPages(bytes, pages, pdfLib) {
    var b;
    try {
      checkPdfLib(pdfLib);
      b = checkBytes(bytes);
    } catch (e) { return Promise.reject(e); }
    if (!Array.isArray(pages) || pages.length === 0) {
      return Promise.reject(new Error('Choose at least one page to extract.'));
    }
    return pdfLib.PDFDocument.load(b, { ignoreEncryption: false }).then(
      function (src) {
        return pdfLib.PDFDocument.create().then(function (out) {
          return out.copyPages(src, pages.map(function (p) { return p - 1; })).then(function (copied) {
            copied.forEach(function (page) { out.addPage(page); });
            return out.save();
          });
        });
      },
      function (e) {
        if (/encrypted/i.test(String(e && e.message))) {
          throw new Error('This PDF is password-protected. Open it in a PDF reader, remove the password, save, and then split it.');
        }
        throw new Error('Could not read that PDF: ' + (e && e.message ? e.message : 'unknown error'));
      }
    );
  }

  // Burst a PDF into one single-page PDF per page.
  // Returns Promise<Array<{page: number, bytes: Uint8Array}>>.
  function burstPages(bytes, pdfLib) {
    var b;
    try {
      checkPdfLib(pdfLib);
      b = checkBytes(bytes);
    } catch (e) { return Promise.reject(e); }
    return pdfLib.PDFDocument.load(b, { ignoreEncryption: false }).then(
      function (src) {
        var results = [];
        var chain = Promise.resolve();
        src.getPageIndices().forEach(function (idx) {
          chain = chain.then(function () {
            return pdfLib.PDFDocument.create().then(function (out) {
              return out.copyPages(src, [idx]).then(function (copied) {
                out.addPage(copied[0]);
                return out.save();
              }).then(function (saved) {
                results.push({ page: idx + 1, bytes: saved });
              });
            });
          });
        });
        return chain.then(function () { return results; });
      },
      function (e) {
        if (/encrypted/i.test(String(e && e.message))) {
          throw new Error('This PDF is password-protected. Open it in a PDF reader, remove the password, save, and then split it.');
        }
        throw new Error('Could not read that PDF: ' + (e && e.message ? e.message : 'unknown error'));
      }
    );
  }

  var api = {
    MAX_FILE_BYTES: MAX_FILE_BYTES,
    hasPdfMagic: hasPdfMagic,
    isPdfFile: isPdfFile,
    formatBytes: formatBytes,
    parsePageSpec: parsePageSpec,
    parseRanges: parseRanges,
    describeRange: describeRange,
    buildOutputName: buildOutputName,
    getPageCount: getPageCount,
    extractPages: extractPages,
    burstPages: burstPages
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (typeof window !== 'undefined') {
    window.QuickTools = window.QuickTools || {};
    window.QuickTools.pdfSplitter = api;
  }
})();
