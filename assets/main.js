/* QuickTools — shared site JS (no frameworks, no external requests). */
(function () {
  'use strict';

  // Mobile nav toggle
  function initNav() {
    var toggle = document.querySelector('.nav-toggle');
    var nav = document.querySelector('.main-nav');
    if (!toggle || !nav) return;
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // Footer year
  function initYear() {
    var el = document.getElementById('year');
    if (el) el.textContent = String(new Date().getFullYear());
  }

  // Tools directory live filter
  function initToolFilter() {
    var input = document.getElementById('tool-filter');
    if (!input) return;
    var cards = Array.prototype.slice.call(document.querySelectorAll('[data-tool-name]'));
    var empty = document.getElementById('filter-empty');
    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase();
      var visible = 0;
      cards.forEach(function (card) {
        var hay = (card.getAttribute('data-tool-name') + ' ' + card.textContent).toLowerCase();
        var show = q === '' || hay.indexOf(q) !== -1;
        card.style.display = show ? '' : 'none';
        if (show) visible++;
      });
      if (empty) empty.style.display = visible === 0 ? '' : 'none';
    });
  }

  // Copy helper with clipboard API + fallback
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'absolute';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      try {
        var ok = document.execCommand('copy');
        document.body.removeChild(ta);
        ok ? resolve() : reject(new Error('copy failed'));
      } catch (e) {
        document.body.removeChild(ta);
        reject(e);
      }
    });
  }

  // Download helper (client-side Blob)
  function downloadText(filename, text) {
    var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  // Brief "Copied" feedback on buttons with data-copy-feedback
  function flashButton(btn, message) {
    var original = btn.textContent;
    btn.textContent = message || 'Copied!';
    btn.disabled = true;
    setTimeout(function () {
      btn.textContent = original;
      btn.disabled = false;
    }, 1200);
  }

  function formatDuration(totalSeconds) {
    totalSeconds = Math.max(0, Math.round(totalSeconds));
    var m = Math.floor(totalSeconds / 60);
    var s = totalSeconds % 60;
    if (m === 0) return s + ' sec';
    return m + ' min ' + s + ' sec';
  }

  document.addEventListener('DOMContentLoaded', function () {
    initNav();
    initYear();
    initToolFilter();
  });

  window.QuickTools = window.QuickTools || {};
  window.QuickTools.copyText = copyText;
  window.QuickTools.downloadText = downloadText;
  window.QuickTools.flashButton = flashButton;
  window.QuickTools.formatDuration = formatDuration;

  // --- Batch 2: shared file helpers for converter tools ---

  function readFileAsDataURL(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(new Error('Could not read file: ' + (file.name || 'unknown'))); };
      reader.readAsDataURL(file);
    });
  }

  function readFileAsArrayBuffer(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(new Error('Could not read file: ' + (file.name || 'unknown'))); };
      reader.readAsArrayBuffer(file);
    });
  }

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('Could not decode that file as an image.')); };
      img.src = src;
    });
  }

  function canvasToBlob(canvas, mime, quality) {
    return new Promise(function (resolve, reject) {
      if (canvas.toBlob) {
        canvas.toBlob(function (blob) {
          blob ? resolve(blob) : reject(new Error('Image encoding failed in this browser.'));
        }, mime, quality);
      } else {
        try {
          var dataUrl = canvas.toDataURL(mime, quality);
          var parts = dataUrl.split(',');
          var bin = atob(parts[1]);
          var bytes = new Uint8Array(bin.length);
          for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          resolve(new Blob([bytes], { type: mime }));
        } catch (e) {
          reject(new Error('Image encoding failed in this browser.'));
        }
      }
    });
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 4000);
  }

  // Wire a .drop-zone element: click opens picker, drag-drop/directory works.
  // onFiles(files: File[]) called with the dropped or picked files.
  function setupDropZone(zone, input, onFiles) {
    zone.addEventListener('click', function () { input.click(); });
    zone.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
    });
    input.addEventListener('change', function () {
      if (input.files && input.files.length) onFiles(Array.prototype.slice.call(input.files));
      input.value = '';
    });
    ['dragenter', 'dragover'].forEach(function (evt) {
      zone.addEventListener(evt, function (e) { e.preventDefault(); zone.classList.add('drag-over'); });
    });
    ['dragleave', 'drop'].forEach(function (evt) {
      zone.addEventListener(evt, function (e) { e.preventDefault(); zone.classList.remove('drag-over'); });
    });
    zone.addEventListener('drop', function (e) {
      var files = e.dataTransfer && e.dataTransfer.files;
      if (files && files.length) onFiles(Array.prototype.slice.call(files));
    });
  }

  function showError(box, message) {
    box.style.display = '';
    box.textContent = message;
  }

  function hideError(box) {
    box.style.display = 'none';
    box.textContent = '';
  }

  window.QuickTools.readFileAsDataURL = readFileAsDataURL;
  window.QuickTools.readFileAsArrayBuffer = readFileAsArrayBuffer;
  window.QuickTools.loadImage = loadImage;
  window.QuickTools.canvasToBlob = canvasToBlob;
  window.QuickTools.downloadBlob = downloadBlob;
  window.QuickTools.setupDropZone = setupDropZone;
  window.QuickTools.showError = showError;
  window.QuickTools.hideError = hideError;
})();
