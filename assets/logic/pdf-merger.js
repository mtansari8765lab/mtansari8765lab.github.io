/* QuickTools — PDF merger core logic (pure, no DOM).
 * Merging uses the vendored pdf-lib (assets/vendor/pdf-lib.min.js, MIT),
 * loaded as window.PDFLib in the browser or required in Node tests.
 * This module validates inputs and orchestrates the merge.
 */
(function () {
  'use strict';

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

  function buildOutputName() {
    var d = new Date();
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return 'merged-' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) +
      '-' + p(d.getHours()) + p(d.getMinutes()) + '.pdf';
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

  // pdfLib: the PDFLib namespace (window.PDFLib or require('pdf-lib')).
  // buffers: Array of Uint8Array/ArrayBuffer with PDF bytes. Returns Promise<Uint8Array>.
  function mergePdfs(buffers, pdfLib) {
    if (!pdfLib || !pdfLib.PDFDocument) {
      return Promise.reject(new Error('PDF engine failed to load. Please reload the page.'));
    }
    if (!Array.isArray(buffers) || buffers.length < 2) {
      return Promise.reject(new Error('Select at least two PDF files to merge.'));
    }
    for (var i = 0; i < buffers.length; i++) {
      var b = buffers[i] instanceof Uint8Array ? buffers[i] : new Uint8Array(buffers[i]);
      if (!hasPdfMagic(b)) {
        return Promise.reject(new Error('File #' + (i + 1) + ' is not a valid PDF (missing %PDF header).'));
      }
    }
    var PDFDocument = pdfLib.PDFDocument;
    return PDFDocument.create().then(function (merged) {
      var chain = Promise.resolve();
      buffers.forEach(function (buf) {
        chain = chain.then(function () {
          return PDFDocument.load(buf, { ignoreEncryption: false }).then(function (src) {
            return merged.copyPages(src, src.getPageIndices()).then(function (copied) {
              copied.forEach(function (page) { merged.addPage(page); });
            });
          });
        });
      });
      return chain.then(function () { return merged.save(); });
    });
  }

  var api = {
    hasPdfMagic: hasPdfMagic,
    isPdfFile: isPdfFile,
    buildOutputName: buildOutputName,
    formatBytes: formatBytes,
    mergePdfs: mergePdfs
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (typeof window !== 'undefined') {
    window.QuickTools = window.QuickTools || {};
    window.QuickTools.pdfMerger = api;
  }
})();
