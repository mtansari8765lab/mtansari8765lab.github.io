/* QuickTools — image-to-PDF core logic (pure, no DOM).
 * Hand-rolled minimal PDF writer: embeds JPEG images (one per page),
 * no external libraries. Browser canvas re-encodes uploads to JPEG;
 * this module builds the PDF bytes and is fully unit-testable.
 */
(function () {
  'use strict';

  // Fit an image inside a page, preserving aspect ratio. Returns {w,h} in points.
  function fitPage(imgW, imgH, pageW, pageH, margin) {
    margin = margin == null ? 36 : margin; // 0.5 inch default
    var availW = pageW - margin * 2;
    var availH = pageH - margin * 2;
    if (!(imgW > 0) || !(imgH > 0) || !(availW > 0) || !(availH > 0)) {
      throw new Error('Invalid dimensions for page fitting.');
    }
    var scale = Math.min(availW / imgW, availH / imgH, 1); // never upscale
    return { w: imgW * scale, h: imgH * scale };
  }

  function pageSizeFor(name) {
    // Points (1/72 inch). Default US Letter.
    var sizes = {
      letter: [612, 792],
      a4: [595.28, 841.89],
      fit: null // image-sized page, handled by caller
    };
    var key = String(name || 'letter').toLowerCase();
    if (!(key in sizes)) throw new Error('Unknown page size: ' + name);
    return sizes[key];
  }

  // pages: [{ jpeg: Uint8Array, width, height }] — width/height in pixels.
  // opts: { pageSize: 'letter'|'a4'|'fit', title: string }
  // Returns Uint8Array with the complete PDF file bytes.
  //
  // Object layout: 1 = catalog, 2 = pages tree, then per page i:
  //   pageObj = 3+3i, imgObj = 4+3i, contentObj = 5+3i
  function buildPdf(pages, opts) {
    if (!Array.isArray(pages) || pages.length === 0) {
      throw new Error('Add at least one image to build a PDF.');
    }
    opts = opts || {};
    var sizeName = String(opts.pageSize || 'letter').toLowerCase();
    var title = String(opts.title == null ? 'QuickTools images' : opts.title);
    var enc = asciiEncoder();

    pages.forEach(validatePageInput);

    var bodies = {}; // objNum -> Uint8Array
    var maxObj = 2;

    function pageNums(i) {
      return { page: 3 + 3 * i, img: 4 + 3 * i, content: 5 + 3 * i };
    }

    pages.forEach(function (p, i) {
      var nums = pageNums(i);
      maxObj = Math.max(maxObj, nums.content);

      var pageSize = pageSizeFor(sizeName);
      var pw, ph, drawW, drawH, dx, dy;
      if (pageSize === null) { // 'fit': page matches image aspect at 150 dpi
        var ptsPerPx = 72 / 150;
        drawW = p.width * ptsPerPx;
        drawH = p.height * ptsPerPx;
        pw = drawW; ph = drawH; dx = 0; dy = 0;
      } else {
        pw = pageSize[0]; ph = pageSize[1];
        var fitted = fitPage(p.width, p.height, pw, ph, 36);
        drawW = fitted.w; drawH = fitted.h;
        dx = (pw - drawW) / 2; dy = (ph - drawH) / 2;
      }

      var content = enc('q ' + f2(drawW) + ' 0 0 ' + f2(drawH) + ' ' + f2(dx) + ' ' + f2(dy) + ' cm /Im' + i + ' Do Q');
      bodies[nums.content] = concatBytes(
        enc('<< /Length ' + content.length + ' >>\nstream\n'), content, enc('\nendstream'));

      var imgDict = enc('<< /Type /XObject /Subtype /Image /Width ' + p.width +
        ' /Height ' + p.height + ' /ColorSpace /DeviceRGB /BitsPerComponent 8' +
        ' /Filter /DCTDecode /Length ' + p.jpeg.length + ' >>\nstream\n');
      bodies[nums.img] = concatBytes(imgDict, p.jpeg, enc('\nendstream'));

      bodies[nums.page] = enc('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + f2(pw) + ' ' + f2(ph) + ']' +
        ' /Resources << /XObject << /Im' + i + ' ' + nums.img + ' 0 R >> >>' +
        ' /Contents ' + nums.content + ' 0 R >>');
    });

    var kids = pages.map(function (_, i) { return pageNums(i).page + ' 0 R'; }).join(' ');
    bodies[2] = enc('<< /Type /Pages /Kids [' + kids + '] /Count ' + pages.length + ' >>');
    bodies[1] = enc('<< /Type /Catalog /Pages 2 0 R >>');

    // Assemble with xref table.
    var header = enc('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n');
    var offsets = [];
    var parts = [header];
    var pos = header.length;
    for (var n = 1; n <= maxObj; n++) {
      if (!bodies[n]) throw new Error('Internal error: missing object ' + n);
      var head = enc(n + ' 0 obj\n');
      var tail = enc('\nendobj\n');
      offsets.push(pos);
      parts.push(head, bodies[n], tail);
      pos += head.length + bodies[n].length + tail.length;
    }
    var xrefPos = pos;
    var xref = enc('xref\n0 ' + (maxObj + 1) + '\n0000000000 65535 f \n' +
      offsets.map(function (o) { return pad10(o) + ' 00000 n \n'; }).join(''));
    var trailer = enc('trailer\n<< /Size ' + (maxObj + 1) +
      ' /Root 1 0 R /Info << /Title (' + escapePdfString(title) + ')' +
      ' /Producer (QuickTools) >> >>\nstartxref\n' + xrefPos + '\n%%EOF');
    parts.push(xref, trailer);
    return concatBytes.apply(null, parts);
  }

  function validatePageInput(p) {
    if (!p || !(p.jpeg instanceof Uint8Array) || p.jpeg.length < 4) {
      throw new Error('Each page needs JPEG bytes (Uint8Array).');
    }
    if (!(p.width > 0) || !(p.height > 0)) {
      throw new Error('Each page needs positive width/height.');
    }
    // JPEG SOI magic check — canvas always produces real JPEGs.
    if (p.jpeg[0] !== 0xFF || p.jpeg[1] !== 0xD8) {
      throw new Error('Image bytes are not a JPEG (missing SOI marker).');
    }
  }

  function asciiEncoder() {
    return function (str) {
      var out = new Uint8Array(str.length);
      for (var i = 0; i < str.length; i++) out[i] = str.charCodeAt(i) & 0xFF;
      return out;
    };
  }

  function concatBytes() {
    var total = 0;
    for (var i = 0; i < arguments.length; i++) total += arguments[i].length;
    var out = new Uint8Array(total);
    var off = 0;
    for (var j = 0; j < arguments.length; j++) {
      out.set(arguments[j], off);
      off += arguments[j].length;
    }
    return out;
  }

  function pad10(n) {
    var s = String(n);
    while (s.length < 10) s = '0' + s;
    return s;
  }

  function f2(n) {
    return String(Math.round(n * 100) / 100);
  }

  function escapePdfString(s) {
    return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').slice(0, 120);
  }

  var api = {
    buildPdf: buildPdf,
    fitPage: fitPage,
    pageSizeFor: pageSizeFor
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (typeof window !== 'undefined') {
    window.QuickTools = window.QuickTools || {};
    window.QuickTools.imageToPdf = api;
  }
})();
