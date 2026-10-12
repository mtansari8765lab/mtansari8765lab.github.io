/* QuickTools — image format converter core logic (pure, no DOM).
 * Converts between PNG / JPEG / WebP via browser canvas; this module holds
 * validation, filename building and size formatting.
 */
(function () {
  'use strict';

  var SUPPORTED_INPUT = /^image\/(png|jpe?g|webp|gif|bmp|avif)$/i;
  var OUTPUTS = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp'
  };

  function isSupportedImageFile(file) {
    if (!file) return false;
    var type = String(file.type || '');
    if (SUPPORTED_INPUT.test(type)) return true;
    // Some browsers leave .type empty — fall back to extension.
    return /\.(png|jpe?g|webp|gif|bmp|avif)$/i.test(String(file.name || ''));
  }

  function normalizeOutputFormat(format) {
    var f = String(format || 'png').toLowerCase().replace(/^\./, '');
    if (f === 'jpeg') f = 'jpg';
    if (!OUTPUTS[f]) throw new Error('Unsupported output format: ' + format + '. Choose PNG, JPG or WebP.');
    return f;
  }

  function mimeForFormat(format) {
    return OUTPUTS[normalizeOutputFormat(format)];
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

  // "photo.JPG" + png -> "photo.png"; "photo.png" + png -> "photo-converted.png"
  function buildOutputName(originalName, format) {
    var f = normalizeOutputFormat(format);
    var name = String(originalName || 'image');
    var base = name.replace(/\.[a-z0-9]+$/i, '');
    if (!base) base = 'image';
    var already = new RegExp('\\.' + (f === 'jpg' ? 'jpe?g' : f) + '$', 'i').test(name);
    return base + (already ? '-converted' : '') + '.' + f;
  }

  var api = {
    isSupportedImageFile: isSupportedImageFile,
    normalizeOutputFormat: normalizeOutputFormat,
    mimeForFormat: mimeForFormat,
    formatBytes: formatBytes,
    buildOutputName: buildOutputName
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (typeof window !== 'undefined') {
    window.QuickTools = window.QuickTools || {};
    window.QuickTools.imageConverter = api;
  }
})();
