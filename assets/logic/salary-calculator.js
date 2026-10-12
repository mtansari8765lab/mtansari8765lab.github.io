/* QuickTools — salary calculator core logic (pure, no DOM).
 * The standard full-time year is 40 hours/week x 52 weeks = 2,080 hours.
 */
(function () {
  'use strict';

  function num(value, name) {
    var n = Number(value);
    if (value === null || value === undefined || value === '' || !isFinite(n)) {
      throw new Error(name + ' must be a number.');
    }
    return n;
  }

  function positive(value, name) {
    var n = num(value, name);
    if (n <= 0) {
      throw new Error(name + ' must be greater than zero.');
    }
    return n;
  }

  function round2(n) {
    return Math.round(n * 100) / 100;
  }

  function annualToHourly(annual, hoursPerWeek) {
    annual = num(annual, 'Annual salary');
    hoursPerWeek = hoursPerWeek === undefined ? 40 : positive(hoursPerWeek, 'Hours per week');
    return round2(annual / (hoursPerWeek * 52));
  }

  function hourlyToAnnual(hourly, hoursPerWeek) {
    hourly = num(hourly, 'Hourly rate');
    hoursPerWeek = hoursPerWeek === undefined ? 40 : positive(hoursPerWeek, 'Hours per week');
    return round2(hourly * hoursPerWeek * 52);
  }

  function annualToMonthly(annual) {
    return round2(num(annual, 'Annual salary') / 12);
  }

  function annualToWeekly(annual) {
    return round2(num(annual, 'Annual salary') / 52);
  }

  function hourlyToMonthly(hourly, hoursPerWeek) {
    return round2(hourlyToAnnual(hourly, hoursPerWeek) / 12);
  }

  // Effective annual pay with overtime beyond 40h/week at the given multiplier.
  function effectiveAnnualWithOvertime(hourly, hoursPerWeek, multiplier) {
    hourly = num(hourly, 'Hourly rate');
    hoursPerWeek = positive(hoursPerWeek, 'Hours per week');
    multiplier = multiplier === undefined ? 1.5 : positive(multiplier, 'Overtime multiplier');
    var regular = Math.min(hoursPerWeek, 40);
    var ot = Math.max(hoursPerWeek - 40, 0);
    return round2(hourly * regular * 52 + hourly * multiplier * ot * 52);
  }

  // Full breakdown from an annual figure.
  function breakdownFromAnnual(annual, hoursPerWeek) {
    var a = num(annual, 'Annual salary');
    return {
      annual: round2(a),
      monthly: annualToMonthly(a),
      weekly: annualToWeekly(a),
      hourly: annualToHourly(a, hoursPerWeek)
    };
  }

  var api = {
    annualToHourly: annualToHourly,
    hourlyToAnnual: hourlyToAnnual,
    annualToMonthly: annualToMonthly,
    annualToWeekly: annualToWeekly,
    hourlyToMonthly: hourlyToMonthly,
    effectiveAnnualWithOvertime: effectiveAnnualWithOvertime,
    breakdownFromAnnual: breakdownFromAnnual
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (typeof window !== 'undefined') {
    window.QuickTools = window.QuickTools || {};
    window.QuickTools.salaryCalculator = api;
  }
})();
