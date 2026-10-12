/* QuickTools — image compressor core logic (pure, no DOM).
 * Compression itself happens on a browser canvas (toBlob with quality);
 * this module holds quality math, target-size search, filename building
 * and size formatting so it is unit-testable.
 */
(function () {
  'use strict';

  function clampQuality(q) {
    var n = Number(q);
    if (!isFinite(n)) return 0.8;
    if (n > 1) n = n / 100; // accept 1-100 as well as 0-1
    if (n < 0.01) return 0.01;
    if (n > 1) return 1;
    return n;
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

  function savingsPercent(originalBytes, compressedBytes) {
    if (!(originalBytes > 0)) return 0;
    var pct = Math.round((1 - compressedBytes / originalBytes) * 100);
    return pct < 0 ? 0 : pct;
  }

  function buildOutputName(originalName, format) {
    var f = String(format || 'jpg').toLowerCase().replace(/^\./, '');
    if (f === 'jpeg') f = 'jpg';
    var base = String(originalName || 'image').replace(/\.[a-z0-9]+$/i, '');
    if (!base) base = 'image';
    return base + '-compressed.' + f;
  }

  function mimeForFormat(format) {
    var f = String(format || 'jpg').toLowerCase();
    if (f === 'png') return 'image/png'; // lossless; quality ignored
    if (f === 'webp') return 'image/webp';
    return 'image/jpeg';
  }

  // Binary-search the highest quality whose encoded size is <= targetBytes.
  // measure(quality01) -> Promise<number> (bytes). Pure w.r.t. the encoder.
  function findQualityForTargetSize(measure, targetBytes, opts) {
    opts = opts || {};
    var iterations = opts.iterations || 7;
    var lo = 0.05;
    var hi = 0.95;
    return measure(hi).then(function (hiSize) {
      if (hiSize <= targetBytes) return { quality: hi, bytes: hiSize };
      return step(measure, targetBytes, lo, hi, iterations);
    });
  }

  function step(measure, targetBytes, lo, hi, remaining) {
    if (remaining <= 0) {
      return measure(lo).then(function (size) { return { quality: lo, bytes: size }; });
    }
    var mid = (lo + hi) / 2;
    return measure(mid).then(function (size) {
      if (size <= targetBytes) return step(measure, targetBytes, mid, hi, remaining - 1);
      return step(measure, targetBytes, lo, mid, remaining - 1);
    });
  }

  var api = {
    clampQuality: clampQuality,
    formatBytes: formatBytes,
    savingsPercent: savingsPercent,
    buildOutputName: buildOutputName,
    mimeForFormat: mimeForFormat,
    findQualityForTargetSize: findQualityForTargetSize
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (typeof window !== 'undefined') {
    window.QuickTools = window.QuickTools || {};
    window.QuickTools.imageCompressor = api;
  }
})();
