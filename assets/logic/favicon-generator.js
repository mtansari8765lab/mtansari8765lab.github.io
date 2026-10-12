/* QuickTools — favicon generator core logic (pure, no DOM).
 * Builds a real multi-size .ico file (PNG-compressed entries, valid in all
 * modern browsers) and the HTML snippet to install it. Browser canvas
 * renders the source image at each size; this module packs the bytes.
 */
(function () {
  'use strict';

  var ICO_SIZES = [16, 32, 48];
  var PNG_SIZES = [180, 192, 512]; // apple-touch-icon, PWA icons

  // entries: [{ size: number (16/32/48), png: Uint8Array }]
  // Returns Uint8Array with the complete .ico file.
  function buildIco(entries) {
    if (!Array.isArray(entries) || entries.length === 0) {
      throw new Error('Provide at least one PNG image to pack.');
    }
    entries.forEach(function (e, i) {
      if (!(e.size >= 16 && e.size <= 256)) {
        throw new Error('Entry #' + (i + 1) + ': ICO size must be 16–256.');
      }
      if (!(e.png instanceof Uint8Array) || e.png.length < 8 || !isPng(e.png)) {
        throw new Error('Entry #' + (i + 1) + ': not valid PNG bytes.');
      }
    });

    var headerLen = 6 + 16 * entries.length;
    var total = headerLen;
    entries.forEach(function (e) { total += e.png.length; });

    var out = new Uint8Array(total);
    var view = new DataView(out.buffer);
    view.setUint16(0, 0, true); // reserved
    view.setUint16(2, 1, true); // type: icon
    view.setUint16(4, entries.length, true); // count

    var offset = headerLen;
    entries.forEach(function (e, i) {
      var base = 6 + 16 * i;
      out[base] = e.size === 256 ? 0 : e.size; // width (0 = 256)
      out[base + 1] = e.size === 256 ? 0 : e.size; // height
      out[base + 2] = 0; // color palette count
      out[base + 3] = 0; // reserved
      view.setUint16(base + 4, 1, true); // color planes
      view.setUint16(base + 6, 32, true); // bits per pixel
      view.setUint32(base + 8, e.png.length, true); // bytes in resource
      view.setUint32(base + 12, offset, true); // image offset
      out.set(e.png, offset);
      offset += e.png.length;
    });
    return out;
  }

  function isPng(bytes) {
    return bytes.length >= 8 &&
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47 &&
      bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A;
  }

  // Standard snippet referencing the generated files.
  function buildSnippet() {
    return [
      '<link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48">',
      '<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
      '<!-- Optional PWA icons -->',
      '<link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png">',
      '<link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png">'
    ].join('\n');
  }

  function formatBytes(bytes) {
    if (!(bytes >= 0)) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    var units = ['KB', 'MB'];
    var v = bytes / 1024;
    var u = 0;
    while (v >= 1024 && u < units.length - 1) { v /= 1024; u++; }
    return (v >= 100 ? Math.round(v) : v.toFixed(1)) + ' ' + units[u];
  }

  var api = {
    ICO_SIZES: ICO_SIZES,
    PNG_SIZES: PNG_SIZES,
    buildIco: buildIco,
    isPng: isPng,
    buildSnippet: buildSnippet,
    formatBytes: formatBytes
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (typeof window !== 'undefined') {
    window.QuickTools = window.QuickTools || {};
    window.QuickTools.faviconGenerator = api;
  }
})();
