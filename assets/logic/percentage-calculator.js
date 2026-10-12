/* QuickTools — percentage calculator core logic (pure, no DOM). */
(function () {
  'use strict';

  function num(value, name) {
    var n = Number(value);
    if (value === null || value === undefined || value === '' || !isFinite(n)) {
      throw new Error(name + ' must be a number.');
    }
    return n;
  }

  function round(value, places) {
    var p = places === undefined ? 4 : places;
    var f = Math.pow(10, p);
    return Math.round(value * f) / f;
  }

  // "What is pct% of value?"  e.g. 19% of 199.99 = 37.9981
  function percentOf(pct, value) {
    pct = num(pct, 'Percentage');
    value = num(value, 'Value');
    return round((value * pct) / 100);
  }

  // "part is what percent of whole?"
  function isWhatPercent(part, whole) {
    part = num(part, 'Value');
    whole = num(whole, 'Of-value');
    if (whole === 0) {
      throw new Error('Cannot divide by zero — the "of" value must not be zero.');
    }
    return round((part / whole) * 100);
  }

  // Percent increase/decrease from `from` to `to`. Positive = increase.
  function percentChange(from, to) {
    from = num(from, 'Original value');
    to = num(to, 'New value');
    if (from === 0) {
      throw new Error('Percent change from zero is undefined — the original value must not be zero.');
    }
    return round(((to - from) / Math.abs(from)) * 100);
  }

  var api = {
    percentOf: percentOf,
    isWhatPercent: isWhatPercent,
    percentChange: percentChange,
    round: round
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (typeof window !== 'undefined') {
    window.QuickTools = window.QuickTools || {};
    window.QuickTools.percentageCalculator = api;
  }
})();
