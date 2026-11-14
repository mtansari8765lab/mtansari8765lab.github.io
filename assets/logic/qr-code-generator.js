/* QuickTools — QR code generator core logic (pure, no DOM).
 * Rendering uses the vendored qrcode-generator 1.4.4
 * (assets/vendor/qrcode-generator.js, MIT, Kazuhiko Arase),
 * loaded as a global `qrcode` function in the browser. This module
 * never touches the DOM: it builds/validates the payload strings,
 * and turns a generated code object into SVG markup. The page passes
 * the qrcode function in, so a failed library load is a clean error,
 * not a crash. Codes are static only: the data is encoded directly
 * in the pattern, so codes never expire and nothing is tracked.
 */
(function () {
  'use strict';

  var MAX_BYTES = 2953; // byte-mode capacity of the largest QR version
  var EC_LEVELS = ['L', 'M', 'Q', 'H'];

  function byteLength(str) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(str).length;
    // Fallback: count UTF-8 bytes by hand.
    var n = 0;
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c < 0x80) n += 1;
      else if (c < 0x800) n += 2;
      else if (c >= 0xD800 && c <= 0xDBFF) { n += 4; i++; }
      else n += 3;
    }
    return n;
  }

  function isNonEmptyString(v) {
    return typeof v === 'string' && v.trim().length > 0;
  }

  function escapeWifiField(v) {
    return String(v).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/:/g, '\\:');
  }

  function validUrl(raw) {
    var s = String(raw || '').trim();
    if (!s) return { ok: false, error: 'Enter a URL.' };
    var withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(s) ? s : 'https://' + s;
    try {
      var u = new URL(withScheme);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') {
        return { ok: false, error: 'Only http:// and https:// URLs can be encoded.' };
      }
      if (!u.hostname || u.hostname.indexOf('.') === -1) {
        return { ok: false, error: 'That URL needs a domain, e.g. https://example.com.' };
      }
      return { ok: true, value: withScheme };
    } catch (e) {
      return { ok: false, error: 'That does not look like a valid URL.' };
    }
  }

  function validEmail(raw) {
    var s = String(raw || '').trim();
    if (!s) return { ok: false, error: 'Enter an email address.' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) {
      return { ok: false, error: 'That does not look like an email address.' };
    }
    return { ok: true, value: s };
  }

  function validPhone(raw) {
    var s = String(raw || '').trim().replace(/[\s().-]/g, '');
    if (!s) return { ok: false, error: 'Enter a phone number.' };
    if (!/^\+?[0-9]{5,15}$/.test(s)) {
      return { ok: false, error: 'Enter a phone number with 5–15 digits, optionally starting with +.' };
    }
    return { ok: true, value: s };
  }

  // Build the payload string for a code type. `input` is a plain object
  // with the fields for that type. Throws Error with a user-facing
  // message on invalid input.
  function buildPayload(type, input) {
    input = input || {};
    var payload;
    if (type === 'url') {
      var u = validUrl(input.url);
      if (!u.ok) throw new Error(u.error);
      payload = u.value;
    } else if (type === 'text') {
      if (!isNonEmptyString(input.text)) throw new Error('Enter some text to encode.');
      payload = String(input.text);
    } else if (type === 'wifi') {
      if (!isNonEmptyString(input.ssid)) throw new Error('Enter the Wi-Fi network name (SSID).');
      var sec = String(input.security || 'WPA');
      if (sec !== 'WPA' && sec !== 'WEP' && sec !== 'nopass') {
        throw new Error('Choose a Wi-Fi security type: WPA, WEP or open (no password).');
      }
      if (sec !== 'nopass' && !isNonEmptyString(input.password)) {
        throw new Error('Enter the Wi-Fi password, or choose "Open (no password)".');
      }
      payload = 'WIFI:T:' + sec + ';S:' + escapeWifiField(input.ssid) +
        ';P:' + escapeWifiField(input.password || '') + ';';
      if (input.hidden) payload += 'H:true;';
      payload += ';';
    } else if (type === 'email') {
      var e = validEmail(input.email);
      if (!e.ok) throw new Error(e.error);
      payload = 'mailto:' + e.value;
      var qs = [];
      if (isNonEmptyString(input.subject)) qs.push('subject=' + encodeURIComponent(input.subject));
      if (isNonEmptyString(input.body)) qs.push('body=' + encodeURIComponent(input.body));
      if (qs.length) payload += '?' + qs.join('&');
    } else if (type === 'tel') {
      var p = validPhone(input.phone);
      if (!p.ok) throw new Error(p.error);
      payload = 'tel:' + p.value;
    } else if (type === 'sms') {
      var s = validPhone(input.phone);
      if (!s.ok) throw new Error(s.error);
      payload = 'SMSTO:' + s.value + ':' + String(input.message || '');
    } else {
      throw new Error('Unknown QR code type.');
    }
    if (byteLength(payload) > MAX_BYTES) {
      throw new Error('That is too much data for one QR code (max about 2,900 characters). Shorten it and try again.');
    }
    return payload;
  }

  function validateEcLevel(level) {
    var l = String(level || 'M').toUpperCase();
    if (EC_LEVELS.indexOf(l) === -1) throw new Error('Unknown error-correction level.');
    return l;
  }

  // Create a QR code object via the injected qrcode function.
  // Returns { count, isDark(row, col) } — a thin, testable wrapper.
  function createQr(qrcodeFn, payload, ecLevel) {
    if (typeof qrcodeFn !== 'function') {
      throw new Error('QR engine failed to load. Please reload the page.');
    }
    var level = validateEcLevel(ecLevel);
    var qr = qrcodeFn(0, level); // 0 = auto-select version
    qr.addData(payload);
    qr.make();
    return { count: qr.getModuleCount(), isDark: function (r, c) { return qr.isDark(r, c); } };
  }

  function escapeXml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Render a code object ({count, isDark}) as a standalone SVG string.
  // `size` is the output width/height in px; `quiet` is the quiet-zone
  // width in modules (4 is the ISO minimum — keep it).
  function renderSvg(code, size, dark, light, quiet) {
    if (!code || typeof code.count !== 'number' || typeof code.isDark !== 'function') {
      throw new Error('Invalid QR code object.');
    }
    size = Math.max(64, Math.min(4096, Math.floor(size) || 256));
    quiet = (quiet === undefined ? 4 : Math.max(0, Math.floor(quiet)));
    dark = dark || '#000000';
    light = light || '#ffffff';
    var count = code.count;
    var total = count + quiet * 2;
    var cell = size / total;
    var parts = [];
    parts.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size +
      '" viewBox="0 0 ' + size + ' ' + size + '" role="img" aria-label="QR code">');
    parts.push('<rect width="' + size + '" height="' + size + '" fill="' + escapeXml(light) + '"/>');
    for (var r = 0; r < count; r++) {
      for (var c = 0; c < count; c++) {
        if (code.isDark(r, c)) {
          var x = (c + quiet) * cell;
          var y = (r + quiet) * cell;
          parts.push('<rect x="' + x.toFixed(2) + '" y="' + y.toFixed(2) +
            '" width="' + cell.toFixed(2) + '" height="' + cell.toFixed(2) +
            '" fill="' + escapeXml(dark) + '"/>');
        }
      }
    }
    parts.push('</svg>');
    return parts.join('');
  }

  // Draw a code object onto a canvas 2d context (for PNG download).
  function drawToCanvas(code, ctx, size, dark, light, quiet) {
    if (!code || !ctx) throw new Error('Invalid QR code or canvas.');
    size = Math.max(64, Math.min(4096, Math.floor(size) || 512));
    quiet = (quiet === undefined ? 4 : Math.max(0, Math.floor(quiet)));
    var count = code.count;
    var total = count + quiet * 2;
    var cell = size / total;
    ctx.fillStyle = light || '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = dark || '#000000';
    for (var r = 0; r < count; r++) {
      for (var c = 0; c < count; c++) {
        if (code.isDark(r, c)) {
          ctx.fillRect(Math.round((c + quiet) * cell), Math.round((r + quiet) * cell),
            Math.ceil(cell), Math.ceil(cell));
        }
      }
    }
    return size;
  }

  function buildDownloadName(ext) {
    var d = new Date();
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return 'qr-code-' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) +
      '-' + p(d.getHours()) + p(d.getMinutes()) + '.' + ext;
  }

  var api = {
    MAX_BYTES: MAX_BYTES,
    EC_LEVELS: EC_LEVELS,
    byteLength: byteLength,
    validUrl: validUrl,
    validEmail: validEmail,
    validPhone: validPhone,
    buildPayload: buildPayload,
    validateEcLevel: validateEcLevel,
    createQr: createQr,
    renderSvg: renderSvg,
    drawToCanvas: drawToCanvas,
    buildDownloadName: buildDownloadName
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (typeof window !== 'undefined') {
    window.QuickTools = window.QuickTools || {};
    window.QuickTools.qrCodeGenerator = api;
  }
})();
