/* QuickTools — age calculator core logic (pure, no DOM).
 * Date-only UTC arithmetic; DST transitions can never shift a result.
 * Feb 29 birthdays are observed on Feb 28 in non-leap years (documented on-page).
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

  function daysInMonth(y, m) {
    return new Date(Date.UTC(y, m, 0)).getUTCDate();
  }

  function daysBetween(a, b) {
    return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / DAY_MS);
  }

  // The observed birthday in a given year (Feb 29 -> Feb 28 when not a leap year).
  function observedBirthday(birth, year) {
    return { y: year, m: birth.m, d: Math.min(birth.d, daysInMonth(year, birth.m)) };
  }

  function age(birthISO, onISO) {
    var b = parseISO(birthISO);
    var o = parseISO(onISO);
    if (daysBetween(b, o) < 0) {
      throw new Error('The birth date is in the future relative to the "as of" date.');
    }

    var years = o.y - b.y;
    var months = o.m - b.m;
    var days = o.d - b.d;
    if (days < 0) {
      months -= 1;
      var prevM = o.m - 1 < 1 ? 12 : o.m - 1;
      var prevY = o.m - 1 < 1 ? o.y - 1 : o.y;
      days += daysInMonth(prevY, prevM);
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }

    var totalDays = daysBetween(b, o);

    var thisYear = observedBirthday(b, o.y);
    var next = daysBetween(o, thisYear) > 0 ? thisYear : observedBirthday(b, o.y + 1);
    var nextIn = daysBetween(o, next);

    return {
      years: years,
      months: months,
      days: days,
      totalDays: totalDays,
      totalWeeks: Math.floor(totalDays / 7),
      totalMonths: years * 12 + months,
      nextBirthdayInDays: nextIn,
      nextBirthdayISO:
        String(next.y).padStart(4, '0') + '-' + String(next.m).padStart(2, '0') + '-' + String(next.d).padStart(2, '0')
    };
  }

  // Plain-language answer for "how old am I" style queries.
  function plainAgeLine(birthISO, onISO, birthLabel) {
    var a = age(birthISO, onISO);
    var label = birthLabel || birthISO;
    return (
      'If you were born on ' + label + ', you are ' + a.years + ' years, ' + a.months +
      ' months and ' + a.days + ' days old.'
    );
  }

  var api = {
    parseISO: parseISO,
    age: age,
    plainAgeLine: plainAgeLine
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (typeof window !== 'undefined') {
    window.QuickTools = window.QuickTools || {};
    window.QuickTools.ageCalculator = api;
  }
})();
