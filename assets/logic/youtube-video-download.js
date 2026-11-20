/* MaxTools — YouTube Video Download Guide core logic (pure, no DOM).
 * This module only parses and normalizes YouTube URLs. It never fetches
 * anything from YouTube, never extracts media streams, and never calls
 * any downloader API. Its job is to tell the user whether a pasted link
 * is a valid YouTube video link, what the video ID is, and which official
 * YouTube page that video lives on — so the guide can point at the
 * official workflows (YouTube Studio download for your own uploads,
 * Google Takeout, YouTube Premium offline viewing) instead of promising
 * a file download this site cannot lawfully provide.
 */
(function () {
  'use strict';

  var VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

  var YOUTUBE_HOSTS = {
    'youtube.com': true,
    'www.youtube.com': true,
    'm.youtube.com': true,
    'music.youtube.com': true,
    'youtu.be': true,
    'www.youtu.be': true,
    'youtube-nocookie.com': true,
    'www.youtube-nocookie.com': true
  };

  function isNonEmptyString(v) {
    return typeof v === 'string' && v.trim().length > 0;
  }

  function parseQuery(search) {
    var out = {};
    if (!search) return out;
    var q = search.charAt(0) === '?' ? search.slice(1) : search;
    q.split('&').forEach(function (pair) {
      if (!pair) return;
      var eq = pair.indexOf('=');
      var key = eq === -1 ? pair : pair.slice(0, eq);
      var val = eq === -1 ? '' : pair.slice(eq + 1);
      try { key = decodeURIComponent(key.replace(/\+/g, ' ')); } catch (e) { /* keep raw */ }
      try { val = decodeURIComponent(val.replace(/\+/g, ' ')); } catch (e) { /* keep raw */ }
      if (!(key in out)) out[key] = val;
    });
    return out;
  }

  function parseUrl(raw) {
    var s = String(raw || '').trim();
    if (!s) return { ok: false, error: 'Paste a YouTube link first.' };
    var withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(s) ? s : 'https://' + s;
    var u;
    try {
      u = new URL(withScheme);
    } catch (e) {
      return { ok: false, error: 'That does not look like a link. Paste a full YouTube video URL.' };
    }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return { ok: false, error: 'Only http(s) YouTube links are accepted.' };
    }
    var host = u.hostname.toLowerCase();
    if (!YOUTUBE_HOSTS[host]) {
      return { ok: false, error: 'That link is not a youtube.com or youtu.be address.' };
    }
    return { ok: true, url: u, host: host };
  }

  function extractVideoId(u, host) {
    var path = u.pathname.replace(/\/+$/, '');
    var query = parseQuery(u.search);

    // Short links: youtu.be/<id>
    if (host === 'youtu.be' || host === 'www.youtu.be') {
      var seg = path.split('/').filter(Boolean)[0];
      return seg || null;
    }

    // /watch?v=<id> (also handles music.youtube.com and attribution links)
    if (path === '/watch' && query.v) return query.v;
    if (query.v) return query.v;

    // /shorts/<id>, /live/<id>, /embed/<id>, /v/<id>
    var m = path.match(/^\/(shorts|live|embed|v)\/([A-Za-z0-9_-]+)/);
    if (m) return m[2];

    // /attribution_link?u=/watch?v=<id>
    if (path === '/attribution_link' && query.u) {
      var inner = parseUrl(query.u);
      if (inner.ok) return extractVideoId(inner.url, inner.host);
    }

    return null;
  }

  function kindOf(u, host) {
    var path = u.pathname;
    if (/^\/shorts\//.test(path)) return 'short';
    if (/^\/live\//.test(path)) return 'live';
    if (/^\/embed\//.test(path)) return 'embed';
    return 'video';
  }

  function buildWatchUrl(videoId) {
    return 'https://www.youtube.com/watch?v=' + videoId;
  }

  function buildStudioUrl(videoId) {
    return 'https://studio.youtube.com/video/' + videoId + '/edit';
  }

  function parseYouTubeUrl(raw) {
    var parsed = parseUrl(raw);
    if (!parsed.ok) return { ok: false, error: parsed.error };
    var u = parsed.url;
    var host = parsed.host;

    var id = extractVideoId(u, host);
    if (!id) {
      return {
        ok: false,
        error: 'No video found in that link. Paste a link to a single video — channel, playlist and home-page links do not point at one video.'
      };
    }
    if (!VIDEO_ID_RE.test(id)) {
      return {
        ok: false,
        error: 'The video ID in that link is not valid. YouTube video IDs are 11 characters of letters, numbers, - and _.'
      };
    }
    return {
      ok: true,
      videoId: id,
      kind: kindOf(u, host),
      watchUrl: buildWatchUrl(id),
      studioUrl: buildStudioUrl(id)
    };
  }

  var api = {
    parseYouTubeUrl: parseYouTubeUrl,
    buildWatchUrl: buildWatchUrl,
    buildStudioUrl: buildStudioUrl
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (typeof window !== 'undefined') {
    window.QuickTools = window.QuickTools || {};
    window.QuickTools.youtubeVideoDownload = api;
  }
})();
