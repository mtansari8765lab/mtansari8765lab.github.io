/* QuickTools — HEIC-to-JPG core logic (pure, no DOM).
 * Decoding uses the vendored heic2any (assets/vendor/heic2any.min.js, MIT),
 * loaded as window.heic2any in the browser. iPhones save photos as HEIC by
 * default; this module validates inputs and wraps the decoder.
 */
(function () {
  'use strict';

  function looksLikeHeic(file) {
    if (!file) return false;
    var type = String(file.type || '').toLowerCase();
    if (type === 'image/heic' || type === 'image/heif' || type === 'image/heic-sequence' || type === 'image/heif-sequence') {
      return true;
    }
    return /\.hei[cf]$/i.test(String(file.name || ''));
  }

  function isDecoderAvailable() {
    return typeof window !== 'undefined' && typeof window.heic2any === 'function';
  }

  function buildOutputName(originalName) {
    var base = String(originalName || 'photo').replace(/\.[a-z0-9]+$/i, '');
    if (!base) base = 'photo';
    return base + '.jpg';
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

  // Convert one HEIC blob to a JPEG blob. decoder defaults to window.heic2any
  // so tests can inject a stub. quality: 0-1.
  function convertHeicToJpg(blob, quality, decoder) {
    var decode = decoder || (typeof window !== 'undefined' ? window.heic2any : undefined);
    if (typeof decode !== 'function') {
      return Promise.reject(new Error('HEIC decoder failed to load. Please reload the page and try again.'));
    }
    var q = Number(quality);
    if (!isFinite(q) || q <= 0 || q > 1) q = 0.92;
    return Promise.resolve(decode({ blob: blob, toType: 'image/jpeg', quality: q })).then(function (result) {
      var out = Array.isArray(result) ? result[0] : result; // multi-image HEIC: take first
      if (!out || typeof out.size !== 'number') {
        throw new Error('The decoder returned an unexpected result.');
      }
      return out;
    });
  }

  var api = {
    looksLikeHeic: looksLikeHeic,
    isDecoderAvailable: isDecoderAvailable,
    buildOutputName: buildOutputName,
    formatBytes: formatBytes,
    convertHeicToJpg: convertHeicToJpg
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (typeof window !== 'undefined') {
    window.QuickTools = window.QuickTools || {};
    window.QuickTools.heicToJpg = api;
  }
})();
