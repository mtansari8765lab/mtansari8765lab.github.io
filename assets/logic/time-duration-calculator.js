/* QuickTools — time duration calculator core logic (pure, no DOM).
 * Overnight spans are supported: end earlier than start means "next day".
 * An identical start and end means zero duration (not 24 hours) — documented on-page.
 */
(function () {
  'use strict';

  function parseTime(s) {
    s = String(s === null || s === undefined ? '' : s).trim();
    var m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(s);
    if (!m) {
      throw new Error('Invalid time "' + s + '" — expected HH:MM (24-hour).');
    }
    return +m[1] * 60 + +m[2];
  }

  function durationMinutes(start, end) {
    var s = typeof start === 'string' ? parseTime(start) : minutes(start, 'Start');
    var e = typeof end === 'string' ? parseTime(end) : minutes(end, 'End');
    if (e < s) {
      e += 1440; // overnight
    }
    return e - s;
  }

  function minutes(v, name) {
    var n = Number(v);
    if (!isFinite(n) || Math.floor(n) !== n || n < 0) {
      throw new Error(name + ' time must be a whole number of minutes.');
    }
    return n;
  }

  function formatHm(totalMinutes) {
    var h = Math.floor(totalMinutes / 60);
    var m = totalMinutes % 60;
    if (h === 0) return m + 'm';
    if (m === 0) return h + 'h';
    return h + 'h ' + m + 'm';
  }

  // Sum a list of {start, end} rows into a total duration.
  function timesheetTotal(rows) {
    if (!Array.isArray(rows)) {
      throw new Error('Timesheet rows must be a list.');
    }
    var total = 0;
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (!r || !r.start || !r.end) continue;
      total += durationMinutes(r.start, r.end);
    }
    return { minutes: total, formatted: formatHm(total), hours: Math.round((total / 60) * 100) / 100 };
  }

  var api = {
    parseTime: parseTime,
    durationMinutes: durationMinutes,
    formatHm: formatHm,
    timesheetTotal: timesheetTotal
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (typeof window !== 'undefined') {
    window.QuickTools = window.QuickTools || {};
    window.QuickTools.timeDurationCalculator = api;
  }
})();
