/* QuickTools — holiday countdown logic (pure, no DOM).
 * Holiday dates are computed date-only in UTC terms, so DST transitions
 * can never shift a result. Movable feasts (Easter family) use the Gregorian
 * computus; US "nth weekday" holidays are computed by rule. Islamic and
 * Hindu festival dates are hardcoded for 2026-2030 (verified for 2026 via
 * published calendars) and drift-estimated outside that range; all are
 * flagged approximate because lunar dates depend on moon sighting.
 */
(function () {
  'use strict';

  var DAY_MS = 86400000;

  function toISO(y, m, d) {
    return (
      String(y).padStart(4, '0') + '-' +
      String(m).padStart(2, '0') + '-' +
      String(d).padStart(2, '0')
    );
  }

  function parseISO(s) {
    s = String(s === null || s === undefined ? '' : s);
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) throw new Error('Invalid date "' + s + '" — expected YYYY-MM-DD.');
    var y = +m[1], mo = +m[2], d = +m[3];
    var dt = new Date(Date.UTC(y, mo - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) {
      throw new Error('Invalid date "' + s + '" — that calendar date does not exist.');
    }
    return { y: y, m: mo, d: d };
  }

  function daysBetween(aISO, bISO) {
    var a = parseISO(aISO), b = parseISO(bISO);
    return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / DAY_MS);
  }

  function shiftISO(iso, n) {
    var c = parseISO(iso);
    var dt = new Date(Date.UTC(c.y, c.m - 1, c.d) + n * DAY_MS);
    return toISO(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  }

  function weekdayOf(y, m, d) {
    return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  }

  // Gregorian computus — returns { y, m, d } for Easter Sunday.
  // Verified: 2025-04-20, 2026-04-05, 2027-03-28, 2028-04-16, 2029-04-01, 2030-04-21.
  function easterSunday(y) {
    var a = y % 19, b = Math.floor(y / 100), c = y % 100;
    var d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    var g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    var i = Math.floor(c / 4), k = c % 4;
    var l = (32 + 2 * e + 2 * i - h - k) % 7;
    var m = Math.floor((a + 11 * h + 22 * l) / 451);
    var month = Math.floor((h + l - 7 * m + 114) / 31);
    var day = ((h + l - 7 * m + 114) % 31) + 1;
    return { y: y, m: month, d: day };
  }

  // nth weekday of a month (weekday 0=Sunday, n=1..4). Returns { y, m, d }.
  function nthWeekday(y, month, weekday, n) {
    var first = weekdayOf(y, month, 1);
    var d = 1 + ((weekday - first + 7) % 7) + (n - 1) * 7;
    return { y: y, m: month, d: d };
  }

  // Last weekday of a month. Returns { y, m, d }.
  function lastWeekday(y, month, weekday) {
    var dim = new Date(Date.UTC(y, month, 0)).getUTCDate();
    var last = weekdayOf(y, month, dim);
    var d = dim - ((last - weekday + 7) % 7);
    return { y: y, m: month, d: d };
  }

  // Hardcoded lunar-calendar tables: { 2026: [m, d], ... }.
  // Outside the table range, step by the mean Islamic year (354.367 days)
  // from the nearest known date until landing in the requested year.
  // Always flagged approximate by the caller.
  function tableDate(entry, year) {
    var t = entry.table;
    var years = Object.keys(t).map(Number).sort(function (a, b) { return a - b; });
    if (t[year]) return { y: year, m: t[year][0], d: t[year][1] };
    var nearest = years.reduce(function (a, b) {
      return Math.abs(b - year) < Math.abs(a - year) ? b : a;
    });
    var stepMs = 354.367 * DAY_MS;
    var dir = year > nearest ? 1 : -1;
    var cur = Date.UTC(nearest, t[nearest][0] - 1, t[nearest][1]);
    var guard = 0;
    while (guard++ < 60) {
      var d = new Date(cur);
      var cy = d.getUTCFullYear();
      if (cy === year) return { y: cy, m: d.getUTCMonth() + 1, d: d.getUTCDate() };
      if ((dir === 1 && cy > year) || (dir === -1 && cy < year)) break; // safety net
      cur += dir * stepMs;
    }
    var f = new Date(cur);
    return { y: f.getUTCFullYear(), m: f.getUTCMonth() + 1, d: f.getUTCDate() };
  }

  /* ------------------------------------------------------------------ */
  /* Holiday database.                                                   */
  /* fixed: [month, day]                                                 */
  /* easterOffset: days relative to Easter Sunday (e.g. -2 = Good Friday)*/
  /* rule: 'nthWeekday' {month, weekday, n} | 'lastWeekday' {month, weekday} */
  /*   | 'thanksgivingPlus' {offset} (US Thanksgiving + N days)           */
  /* table: { year: [month, day] } for lunar-calendar festivals           */
  /* kw: extra search keywords. tags: region/faith labels.               */
  /* approx: true when the date is an estimate (moon sighting).           */
  /* ------------------------------------------------------------------ */
  var HOLIDAYS = [
    // ---- Fixed-date observances ----
    { name: "New Year's Day", kw: 'new year january 1st first day year', tags: ['Global'], fixed: [1, 1] },
    { name: "Valentine's Day", kw: 'valentine valentines love february 14', tags: ['Global'], fixed: [2, 14] },
    { name: "St. Patrick's Day", kw: 'st patricks patty ireland irish march 17', tags: ['Ireland', 'US'], fixed: [3, 17] },
    { name: "April Fools' Day", kw: 'april fools prank joke', tags: ['Fun'], fixed: [4, 1] },
    { name: 'Earth Day', kw: 'earth day environment planet april 22', tags: ['Global'], fixed: [4, 22] },
    { name: 'Star Wars Day', kw: 'star wars may the 4th fourth', tags: ['Fun'], fixed: [5, 4] },
    { name: 'Cinco de Mayo', kw: 'cinco de mayo mexico fifth may', tags: ['Mexico', 'US'], fixed: [5, 5] },
    { name: 'Juneteenth', kw: 'juneteenth freedom emancipation day june 19', tags: ['US'], fixed: [6, 19] },
    { name: 'Independence Day (US)', kw: 'independence day 4th of july fourth july america usa fireworks', tags: ['US'], fixed: [7, 4] },
    { name: 'Bastille Day', kw: 'bastille day france french national day july 14', tags: ['France'], fixed: [7, 14] },
    { name: 'Halloween', kw: 'halloween spooky scary october 31 trick treat', tags: ['Global'], fixed: [10, 31] },
    { name: 'Bonfire Night', kw: 'bonfire night guy fawkes november 5 uk', tags: ['UK'], fixed: [11, 5] },
    { name: 'Veterans Day', kw: 'veterans day military november 11', tags: ['US'], fixed: [11, 11] },
    { name: 'Remembrance Day', kw: 'remembrance day poppy armistice november 11', tags: ['UK', 'Canada'], fixed: [11, 11] },
    { name: 'Christmas Eve', kw: 'christmas eve december 24', tags: ['Christian'], fixed: [12, 24] },
    { name: 'Christmas Day', kw: 'christmas xmas december 25 santa', tags: ['Christian', 'Global'], fixed: [12, 25] },
    { name: 'Boxing Day', kw: 'boxing day december 26', tags: ['UK', 'Canada'], fixed: [12, 26] },
    { name: 'Kwanzaa', kw: 'kwanzaa december 26 african american', tags: ['US'], fixed: [12, 26] },
    { name: "New Year's Eve", kw: 'new years eve december 31 countdown party', tags: ['Global'], fixed: [12, 31] },
    { name: 'Makar Sankranti', kw: 'makar sankranti pongal uttarayan kite january 14', tags: ['Hindu', 'India'], fixed: [1, 14], approx: true },
    { name: 'Republic Day (India)', kw: 'republic day india january 26', tags: ['India'], fixed: [1, 26] },
    { name: 'Australia Day', kw: 'australia day january 26', tags: ['Australia'], fixed: [1, 26] },
    { name: 'Kashmir Day', kw: 'kashmir day solidarity february 5', tags: ['Pakistan'], fixed: [2, 5] },
    { name: 'Pakistan Day', kw: 'pakistan day resolution march 23', tags: ['Pakistan'], fixed: [3, 23] },
    { name: 'Labour Day', kw: 'labour day labor workers may day international', tags: ['Global'], fixed: [5, 1] },
    { name: 'Canada Day', kw: 'canada day july 1', tags: ['Canada'], fixed: [7, 1] },
    { name: 'Independence Day (Pakistan)', kw: 'pakistan independence day 14 august azadi jashn e azadi', tags: ['Pakistan'], fixed: [8, 14] },
    { name: 'Independence Day (India)', kw: 'india independence day 15 august', tags: ['India'], fixed: [8, 15] },
    { name: 'Gandhi Jayanti', kw: 'gandhi jayanti mahatma october 2', tags: ['India'], fixed: [10, 2] },
    { name: 'Iqbal Day', kw: 'iqbal day allama iqbal november 9', tags: ['Pakistan'], fixed: [11, 9] },
    { name: 'Quaid-e-Azam Day', kw: 'quaid day quaideazam jinnah birthday december 25', tags: ['Pakistan'], fixed: [12, 25] },

    // ---- US rule-based holidays ----
    { name: 'Martin Luther King Jr. Day', kw: 'martin luther king mlk day january', tags: ['US'], rule: 'nthWeekday', month: 1, weekday: 1, n: 3 },
    { name: "Presidents' Day", kw: 'presidents day washington birthday february', tags: ['US'], rule: 'nthWeekday', month: 2, weekday: 1, n: 3 },
    { name: 'Memorial Day', kw: 'memorial day may soldiers veterans', tags: ['US'], rule: 'lastWeekday', month: 5, weekday: 1 },
    { name: 'Labor Day (US)', kw: 'labor day us september workers', tags: ['US'], rule: 'nthWeekday', month: 9, weekday: 1, n: 1 },
    { name: 'Columbus Day', kw: 'columbus day indigenous peoples october', tags: ['US'], rule: 'nthWeekday', month: 10, weekday: 1, n: 2 },
    { name: 'Thanksgiving Day', kw: 'thanksgiving turkey november feast', tags: ['US'], rule: 'nthWeekday', month: 11, weekday: 4, n: 4 },
    { name: 'Black Friday', kw: 'black friday shopping sale deals', tags: ['US', 'Shopping'], rule: 'thanksgivingPlus', offset: 1 },
    { name: 'Cyber Monday', kw: 'cyber monday online shopping sale deals', tags: ['US', 'Shopping'], rule: 'thanksgivingPlus', offset: 4 },
    { name: "Mother's Day", kw: 'mothers day mom mum may', tags: ['US'], rule: 'nthWeekday', month: 5, weekday: 0, n: 2 },
    { name: "Father's Day", kw: 'fathers day dad june', tags: ['US'], rule: 'nthWeekday', month: 6, weekday: 0, n: 3 },

    // ---- Easter family (Gregorian computus) ----
    { name: 'Shrove Tuesday', kw: 'shrove tuesday pancake day mardi gras', tags: ['Christian'], easterOffset: -47 },
    { name: 'Ash Wednesday', kw: 'ash wednesday lent begins ashes', tags: ['Christian'], easterOffset: -46 },
    { name: 'Palm Sunday', kw: 'palm sunday holy week', tags: ['Christian'], easterOffset: -7 },
    { name: 'Maundy Thursday', kw: 'maundy thursday holy thursday', tags: ['Christian'], easterOffset: -3 },
    { name: 'Good Friday', kw: 'good friday crucifixion', tags: ['Christian'], easterOffset: -2 },
    { name: 'Easter Sunday', kw: 'easter easter sunday eggs bunny resurrection', tags: ['Christian'], easterOffset: 0 },
    { name: 'Easter Monday', kw: 'easter monday', tags: ['Christian', 'UK', 'Canada'], easterOffset: 1 },
    { name: 'Pentecost', kw: 'pentecost whit sunday holy spirit', tags: ['Christian'], easterOffset: 49 },
    { name: 'Trinity Sunday', kw: 'trinity sunday', tags: ['Christian'], easterOffset: 56 },
    { name: 'Corpus Christi', kw: 'corpus christi eucharist', tags: ['Christian'], easterOffset: 60 },

    // ---- Islamic (lunar; approximate, subject to moon sighting) ----
    { name: 'Ramadan begins', kw: 'ramadan ramazan fasting month begins start', tags: ['Islamic'], approx: true,
      table: { 2026: [2, 18], 2027: [2, 7], 2028: [1, 28], 2029: [1, 16], 2030: [1, 5] } },
    { name: 'Shab-e-Barat', kw: 'shab e barat baraat night forgiveness', tags: ['Islamic'], approx: true,
      table: { 2026: [2, 3], 2027: [1, 23], 2028: [1, 12], 2029: [1, 1], 2030: [12, 21] } },
    { name: 'Laylat al-Qadr', kw: 'laylat al qadr night power decree shab e qadr', tags: ['Islamic'], approx: true,
      table: { 2026: [3, 16], 2027: [3, 5], 2028: [2, 23], 2029: [2, 11], 2030: [1, 31] } },
    { name: 'Eid al-Fitr', kw: 'eid al fitr eid ul fitr ramadan eid sweet eid choti eid', tags: ['Islamic'], approx: true,
      table: { 2026: [3, 20], 2027: [3, 10], 2028: [2, 28], 2029: [2, 16], 2030: [2, 5] } },
    { name: 'Eid al-Adha', kw: 'eid al adha eid ul adha bakra eid bakrid festival sacrifice bari eid', tags: ['Islamic'], approx: true,
      table: { 2026: [5, 27], 2027: [5, 17], 2028: [5, 5], 2029: [4, 24], 2030: [4, 13] } },
    { name: 'Islamic New Year', kw: 'islamic new year hijri new year muharram 1st', tags: ['Islamic'], approx: true,
      table: { 2026: [6, 16], 2027: [6, 6], 2028: [5, 25], 2029: [5, 14], 2030: [5, 3] } },
    { name: 'Day of Ashura', kw: 'ashura muharram 10th imam hussain', tags: ['Islamic'], approx: true,
      table: { 2026: [6, 25], 2027: [6, 15], 2028: [6, 3], 2029: [5, 23], 2030: [5, 12] } },
    { name: 'Mawlid al-Nabi', kw: 'mawlid milad un nabi prophet muhammad birthday eid milad', tags: ['Islamic'], approx: true,
      table: { 2026: [8, 25], 2027: [8, 15], 2028: [8, 3], 2029: [7, 23], 2030: [7, 12] } },

    // ---- Hindu (lunisolar; approximate) ----
    { name: 'Maha Shivratri', kw: 'maha shivratri shivaratri shiva night', tags: ['Hindu'], approx: true,
      table: { 2026: [2, 15], 2027: [2, 5], 2028: [1, 25], 2029: [2, 13], 2030: [2, 2] } },
    { name: 'Holi', kw: 'holi festival colors spring phagwah', tags: ['Hindu'], approx: true,
      table: { 2026: [3, 4], 2027: [2, 22], 2028: [3, 11], 2029: [2, 28], 2030: [3, 18] } },
    { name: 'Raksha Bandhan', kw: 'raksha bandhan rakhi brother sister', tags: ['Hindu'], approx: true,
      table: { 2026: [8, 28], 2027: [8, 17], 2028: [8, 5], 2029: [8, 24], 2030: [8, 13] } },
    { name: 'Janmashtami', kw: 'janmashtami krishna birthday gokulashtami', tags: ['Hindu'], approx: true,
      table: { 2026: [9, 4], 2027: [8, 24], 2028: [8, 12], 2029: [8, 31], 2030: [8, 20] } },
    { name: 'Ganesh Chaturthi', kw: 'ganesh chaturthi ganpati vinayaka chavithi', tags: ['Hindu'], approx: true,
      table: { 2026: [9, 14], 2027: [9, 3], 2028: [8, 22], 2029: [9, 10], 2030: [8, 30] } },
    { name: 'Dussehra', kw: 'dussehra vijayadashami dasara navratri', tags: ['Hindu'], approx: true,
      table: { 2026: [10, 20], 2027: [10, 9], 2028: [9, 27], 2029: [10, 16], 2030: [10, 5] } },
    { name: 'Diwali', kw: 'diwali deepavali festival lights lakshmi', tags: ['Hindu'], approx: true,
      table: { 2026: [11, 8], 2027: [10, 29], 2028: [10, 17], 2029: [11, 5], 2030: [10, 26] } },
    { name: 'Guru Nanak Jayanti', kw: 'guru nanak jayanti gurpurab sikh', tags: ['Sikh', 'Hindu'], approx: true,
      table: { 2026: [11, 24], 2027: [11, 13], 2028: [11, 1], 2029: [11, 20], 2030: [11, 9] } },

    // ---- Chinese lunisolar ----
    { name: 'Chinese New Year', kw: 'chinese new year lunar new year spring festival', tags: ['Chinese'], approx: true,
      table: { 2026: [2, 17], 2027: [2, 6], 2028: [1, 26], 2029: [2, 13], 2030: [2, 3] } }
  ];

  // Occurrence of a holiday in a given year -> ISO date string.
  function occurrenceDate(entry, year) {
    var dt;
    if (entry.fixed) {
      dt = { y: year, m: entry.fixed[0], d: entry.fixed[1] };
    } else if (typeof entry.easterOffset === 'number') {
      var e = easterSunday(year);
      var d = new Date(Date.UTC(e.y, e.m - 1, e.d) + entry.easterOffset * DAY_MS);
      dt = { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() };
    } else if (entry.rule === 'nthWeekday') {
      dt = nthWeekday(year, entry.month, entry.weekday, entry.n);
    } else if (entry.rule === 'lastWeekday') {
      dt = lastWeekday(year, entry.month, entry.weekday);
    } else if (entry.rule === 'thanksgivingPlus') {
      var th = nthWeekday(year, 11, 4, 4);
      var d2 = new Date(Date.UTC(th.y, th.m - 1, th.d) + entry.offset * DAY_MS);
      dt = { y: d2.getUTCFullYear(), m: d2.getUTCMonth() + 1, d: d2.getUTCDate() };
    } else if (entry.table) {
      dt = tableDate(entry, year);
    } else {
      throw new Error('Holiday "' + entry.name + '" has no date rule.');
    }
    return toISO(dt.y, dt.m, dt.d);
  }

  // Next occurrence on or after fromISO -> { iso, daysAway, approx }.
  function nextOccurrence(entry, fromISO) {
    var y = parseISO(fromISO).y;
    var iso = occurrenceDate(entry, y);
    if (iso < fromISO) iso = occurrenceDate(entry, y + 1);
    return { iso: iso, daysAway: daysBetween(fromISO, iso), approx: !!entry.approx };
  }

  // Relevance-ranked search over names + keywords.
  function searchHolidays(q, limit) {
    q = String(q || '').trim().toLowerCase();
    if (!q) return [];
    var scored = [];
    HOLIDAYS.forEach(function (h) {
      var name = h.name.toLowerCase();
      var kw = String(h.kw || '').toLowerCase();
      var score = -1;
      if (name === q) score = 0;
      else if (name.toLowerCase().indexOf(q) === 0) score = 1;
      else if (name.toLowerCase().indexOf(q) !== -1) score = 2;
      else if (kw.split(' ').some(function (w) { return w.indexOf(q) === 0; })) score = 3;
      else if (kw.indexOf(q) !== -1) score = 4;
      if (score >= 0) scored.push({ h: h, score: score });
    });
    scored.sort(function (a, b) { return a.score - b.score || (a.h.name < b.h.name ? -1 : 1); });
    return scored.slice(0, limit || 8).map(function (s) { return s.h; });
  }

  // Next `count` upcoming holidays from fromISO, soonest first.
  function upcomingHolidays(fromISO, count) {
    var list = HOLIDAYS.map(function (h) {
      var n = nextOccurrence(h, fromISO);
      return { name: h.name, iso: n.iso, daysAway: n.daysAway, approx: n.approx, tags: h.tags.slice() };
    });
    list.sort(function (a, b) {
      return a.daysAway - b.daysAway || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
    });
    return list.slice(0, count || 12);
  }

  var WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];

  function formatLong(iso) {
    var c = parseISO(iso);
    return WEEKDAYS[weekdayOf(c.y, c.m, c.d)] + ', ' + MONTHS[c.m - 1] + ' ' + c.d + ', ' + c.y;
  }

  var api = {
    HOLIDAYS: HOLIDAYS,
    easterSunday: easterSunday,
    occurrenceDate: occurrenceDate,
    nextOccurrence: nextOccurrence,
    searchHolidays: searchHolidays,
    upcomingHolidays: upcomingHolidays,
    formatLong: formatLong,
    daysBetween: daysBetween
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (typeof window !== 'undefined') {
    window.QuickTools = window.QuickTools || {};
    window.QuickTools.holidayCountdown = api;
  }
})();
