/* QuickTools — image resizer core logic (pure, no DOM).
 * Browser canvas does the actual pixel work; this module holds the
 * dimension math, filename building and size formatting so it is unit-testable.
 */
(function () {
  'use strict';

  function isPositiveInt(n) {
    return typeof n === 'number' && isFinite(n) && Math.floor(n) === n && n > 0;
  }

  // opts: { mode: 'width'|'height'|'percent'|'longest', value: number }
  // Returns { width, height } in whole pixels, aspect preserved, min 1px.
  function calculateDimensions(srcW, srcH, opts) {
    if (!isPositiveInt(srcW) || !isPositiveInt(srcH)) {
      throw new Error('Source dimensions must be positive integers.');
    }
    opts = opts || {};
    var mode = opts.mode || 'percent';
    var value = Number(opts.value);
    var w = srcW;
    var h = srcH;

    if (mode === 'width') {
      if (!(value > 0)) throw new Error('Target width must be greater than 0.');
      w = Math.round(value);
      h = Math.max(1, Math.round((srcH * w) / srcW));
    } else if (mode === 'height') {
      if (!(value > 0)) throw new Error('Target height must be greater than 0.');
      h = Math.round(value);
      w = Math.max(1, Math.round((srcW * h) / srcH));
    } else if (mode === 'longest') {
      if (!(value > 0)) throw new Error('Target longest side must be greater than 0.');
      var scale = value / Math.max(srcW, srcH);
      w = Math.max(1, Math.round(srcW * scale));
      h = Math.max(1, Math.round(srcH * scale));
    } else if (mode === 'percent') {
      if (!(value > 0) || value > 1000) throw new Error('Percentage must be between 1 and 1000.');
      w = Math.max(1, Math.round((srcW * value) / 100));
      h = Math.max(1, Math.round((srcH * value) / 100));
    } else {
      throw new Error('Unknown resize mode: ' + mode);
    }
    return { width: w, height: h };
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

  // Build "photo.jpg" -> "photo-800x600.png" (or with -resized suffix when ext unchanged)
  function buildOutputName(originalName, width, height, ext) {
    var base = String(originalName || 'image').replace(/\.[a-z0-9]+$/i, '');
    if (!base) base = 'image';
    ext = String(ext || 'png').replace(/^\./, '').toLowerCase();
    var sameExt = new RegExp('\\.' + ext + '$', 'i').test(String(originalName || ''));
    var suffix = sameExt ? '-resized' : '';
    return base + '-' + width + 'x' + height + suffix + '.' + ext;
  }

  function mimeForFormat(format) {
    var f = String(format || 'png').toLowerCase();
    if (f === 'jpeg' || f === 'jpg') return 'image/jpeg';
    if (f === 'webp') return 'image/webp';
    return 'image/png';
  }

  var api = {
    calculateDimensions: calculateDimensions,
    formatBytes: formatBytes,
    buildOutputName: buildOutputName,
    mimeForFormat: mimeForFormat
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (typeof window !== 'undefined') {
    window.QuickTools = window.QuickTools || {};
    window.QuickTools.imageResizer = api;
  }
})();
