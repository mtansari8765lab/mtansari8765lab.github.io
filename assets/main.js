/* MaxTools — shared site JS. The window.QuickTools namespace is preserved for existing tool wiring. */
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
    Array.prototype.forEach.call(nav.querySelectorAll('a'), function (link) {
      link.addEventListener('click', function () {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Theme toggle: dark by default, light only when the visitor chooses it.
  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }

  function syncThemeToggle() {
    var btn = document.querySelector('.theme-toggle');
    if (!btn) return;
    var light = currentTheme() === 'light';
    btn.setAttribute('aria-pressed', light ? 'true' : 'false');
    btn.setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
    var label = btn.querySelector('.theme-toggle-label');
    if (label) label.textContent = light ? 'Dark' : 'Light';
    var icon = btn.querySelector('.theme-toggle-icon');
    if (icon) icon.textContent = light ? '☾' : '☀';
  }

  function initTheme() {
    var btn = document.querySelector('.theme-toggle');
    syncThemeToggle();
    if (!btn) return;
    btn.addEventListener('click', function () {
      var next = currentTheme() === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('maxtools-theme', next); } catch (e) {}
      syncThemeToggle();
    });
  }

  // Footer year
  function initYear() {
    var el = document.getElementById('year');
    if (el) el.textContent = String(new Date().getFullYear());
  }

  // Tools directory live filter, with optional ?q= and ?category= entry points.
  function initToolFilter() {
    var input = document.getElementById('tool-filter');
    if (!input) return;
    var cards = Array.prototype.slice.call(document.querySelectorAll('[data-tool-name]'));
    var empty = document.getElementById('filter-empty');
    var category = '';
    try {
      var params = new URLSearchParams(window.location.search);
      var initialQuery = params.get('q') || '';
      category = (params.get('category') || '').toLowerCase();
      if (initialQuery) input.value = initialQuery;
    } catch (e) {}

    function applyFilter() {
      var q = input.value.trim().toLowerCase();
      var visible = 0;
      cards.forEach(function (card) {
        var hay = ((card.getAttribute('data-tool-name') || '') + ' ' +
          (card.getAttribute('data-category') || '') + ' ' + card.textContent).toLowerCase();
        var categoryMatch = category === '' || card.getAttribute('data-category') === category;
        var show = categoryMatch && (q === '' || hay.indexOf(q) !== -1);
        card.style.display = show ? '' : 'none';
        if (show) visible++;
      });
      if (empty) empty.style.display = visible === 0 ? '' : 'none';
    }

    input.addEventListener('input', applyFilter);
    applyFilter();
  }

  // Homepage search filters the homepage library while typing; submitting opens the directory.
  function initHomeSearch() {
    var input = document.getElementById('home-tool-search');
    if (!input) return;
    var cards = Array.prototype.slice.call(document.querySelectorAll('.home-tool-grid .tool-card'));
    var status = document.getElementById('home-search-status');
    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase();
      var visible = 0;
      cards.forEach(function (card) {
        var hay = ((card.getAttribute('data-tool-name') || '') + ' ' +
          (card.getAttribute('data-category') || '') + ' ' + card.textContent).toLowerCase();
        var show = q === '' || hay.indexOf(q) !== -1;
        card.style.display = show ? '' : 'none';
        if (show) visible++;
      });
      if (!status) return;
      if (q === '') status.textContent = '';
      else if (visible === 0) status.textContent = 'No tools match that search yet. Try a shorter word.';
      else if (visible === 1) status.textContent = '1 tool matches below.';
      else status.textContent = visible + ' tools match below.';
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
    initTheme();
    initYear();
    initToolFilter();
    initHomeSearch();
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
