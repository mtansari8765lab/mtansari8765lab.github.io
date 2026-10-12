/* QuickTools — date helpers + date calculator core logic (pure, no DOM).
 * All math is date-only in UTC terms: DST transitions can never shift a result.
 */
(function () {
  'use strict';

  var DAY_MS = 86400000;

  function parseISO(s) {
    s = String(s === null || s === undefined ? '' : s);
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) {
      throw new Error('Invalid date "' + s + '" — expected YYYY-MM-DD.');
    }
    var y = +m[1], mo = +m[2], d = +m[3];
    var dt = new Date(Date.UTC(y, mo - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) {
      throw new Error('Invalid date "' + s + '" — that calendar date does not exist.');
    }
    return { y: y, m: mo, d: d };
  }

  function toISO(y, m, d) {
    return (
      String(y).padStart(4, '0') + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0')
    );
  }

  function daysInMonth(y, m) {
    return new Date(Date.UTC(y, m, 0)).getUTCDate();
  }

  // Signed number of days from date a to date b (b - a). Zero when equal.
  function daysBetween(aISO, bISO) {
    var a = parseISO(aISO), b = parseISO(bISO);
    return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / DAY_MS);
  }

  function int(value, name) {
    var n = Number(value);
    if (!isFinite(n) || Math.floor(n) !== n) {
      throw new Error(name + ' must be a whole number.');
    }
    return n;
  }

  function nonZero(n, name) {
    if (n === 0) {
      throw new Error(name + ' cannot be zero.');
    }
    return n;
  }

  function addDaysISO(iso, n) {
    var c = parseISO(iso);
    n = nonZero(int(n, 'Days'), 'Days');
    var dt = new Date(Date.UTC(c.y, c.m - 1, c.d) + n * DAY_MS);
    return toISO(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  }

  function addMonthsISO(iso, n) {
    var c = parseISO(iso);
    n = nonZero(int(n, 'Months'), 'Months');
    var total = c.y * 12 + (c.m - 1) + n;
    var y = Math.floor(total / 12);
    var m = (total % 12) + 1;
    var d = Math.min(c.d, daysInMonth(y, m)); // Jan 31 + 1 month -> Feb 28/29 (clamped)
    return toISO(y, m, d);
  }

  function addYearsISO(iso, n) {
    var c = parseISO(iso);
    n = nonZero(int(n, 'Years'), 'Years');
    var y = c.y + n;
    var d = Math.min(c.d, daysInMonth(y, c.m)); // Feb 29 + 1 year -> Feb 28 (clamped)
    return toISO(y, c.m, d);
  }

  // Add/subtract a mix of units. At least one unit must be non-zero.
  function addTimeISO(iso, parts) {
    var out = iso;
    var dy = int(parts && parts.days !== undefined ? parts.days : 0, 'Days');
    var wk = int(parts && parts.weeks !== undefined ? parts.weeks : 0, 'Weeks');
    var mo = int(parts && parts.months !== undefined ? parts.months : 0, 'Months');
    var yr = int(parts && parts.years !== undefined ? parts.years : 0, 'Years');
    if (dy === 0 && wk === 0 && mo === 0 && yr === 0) {
      throw new Error('Enter a value other than zero.');
    }
    if (yr !== 0) out = addYearsISO(out, yr);
    if (mo !== 0) out = addMonthsISO(out, mo);
    if (wk !== 0) out = addDaysISO(out, wk * 7);
    if (dy !== 0) out = addDaysISO(out, dy);
    return out;
  }

  var WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function weekdayISO(iso) {
    var c = parseISO(iso);
    return WEEKDAYS[new Date(Date.UTC(c.y, c.m - 1, c.d)).getUTCDay()];
  }

  var api = {
    parseISO: parseISO,
    daysBetween: daysBetween,
    addDays: addDaysISO,
    addMonths: addMonthsISO,
    addYears: addYearsISO,
    addTime: addTimeISO,
    weekday: weekdayISO,
    daysInMonth: daysInMonth
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (typeof window !== 'undefined') {
    window.QuickTools = window.QuickTools || {};
    window.QuickTools.dateCalculator = api;
  }
})();
