/* QuickTools — compound interest calculator core logic (pure, no DOM).
 * FV = P(1+r/n)^(nt) + PMT_per_period * (((1+r/n)^(nt) - 1) / (r/n)),
 * where monthly contributions are spread evenly across compounding periods.
 */
(function () {
  'use strict';

  var VALID_FREQUENCIES = [1, 2, 4, 12, 365];

  function num(value, name) {
    var n = Number(value);
    if (value === null || value === undefined || value === '' || !isFinite(n)) {
      throw new Error(name + ' must be a number.');
    }
    return n;
  }

  function nonNegative(value, name) {
    var n = num(value, name);
    if (n < 0) {
      throw new Error(name + ' cannot be negative.');
    }
    return n;
  }

  function round2(n) {
    return Math.round(n * 100) / 100;
  }

  function checkFrequency(n) {
    n = num(n, 'Compounding frequency');
    if (VALID_FREQUENCIES.indexOf(n) === -1) {
      throw new Error('Compounding frequency must be one of: ' + VALID_FREQUENCIES.join(', ') + '.');
    }
    return n;
  }

  function futureValue(principal, annualRatePct, years, compoundsPerYear, monthlyContribution) {
    principal = nonNegative(principal, 'Principal');
    var rate = nonNegative(annualRatePct, 'Annual rate') / 100;
    years = nonNegative(years, 'Years');
    var n = checkFrequency(compoundsPerYear === undefined ? 12 : compoundsPerYear);
    var monthly = monthlyContribution === undefined || monthlyContribution === '' ? 0 : nonNegative(monthlyContribution, 'Monthly contribution');

    var periods = n * years;
    if (periods === 0) {
      return round2(principal);
    }
    var ratePerPeriod = rate / n;
    var pmtPerPeriod = (monthly * 12) / n;

    var fvPrincipal = principal * Math.pow(1 + ratePerPeriod, periods);
    var fvAnnuity = 0;
    if (ratePerPeriod === 0) {
      fvAnnuity = pmtPerPeriod * periods;
    } else {
      fvAnnuity = pmtPerPeriod * ((Math.pow(1 + ratePerPeriod, periods) - 1) / ratePerPeriod);
    }
    return round2(fvPrincipal + fvAnnuity);
  }

  // Year-by-year schedule computed iteratively (independent check of the closed form).
  function growthTable(principal, annualRatePct, years, compoundsPerYear, monthlyContribution) {
    var n = checkFrequency(compoundsPerYear === undefined ? 12 : compoundsPerYear);
    var rate = nonNegative(annualRatePct, 'Annual rate') / 100;
    var totalYears = Math.floor(nonNegative(years, 'Years'));
    var monthly = monthlyContribution === undefined || monthlyContribution === '' ? 0 : nonNegative(monthlyContribution, 'Monthly contribution');
    var ratePerPeriod = rate / n;
    var pmtPerPeriod = (monthly * 12) / n;

    var rows = [];
    var balance = nonNegative(principal, 'Principal');
    var contributed = principal;
    for (var y = 1; y <= totalYears; y++) {
      var start = balance;
      for (var p = 0; p < n; p++) {
        balance = balance * (1 + ratePerPeriod) + pmtPerPeriod;
      }
      contributed += monthly * 12;
      rows.push({
        year: y,
        balance: round2(balance),
        interest: round2(balance - start - monthly * 12),
        contributions: round2(contributed)
      });
    }
    return rows;
  }

  function summary(principal, annualRatePct, years, compoundsPerYear, monthlyContribution) {
    var fv = futureValue(principal, annualRatePct, years, compoundsPerYear, monthlyContribution);
    var totalContrib = round2(
      nonNegative(principal, 'Principal') +
        (monthlyContribution === undefined || monthlyContribution === '' ? 0 : nonNegative(monthlyContribution, 'Monthly contribution')) *
          12 * nonNegative(years, 'Years')
    );
    return {
      futureValue: fv,
      totalContributions: totalContrib,
      totalInterest: round2(fv - totalContrib)
    };
  }

  var api = {
    futureValue: futureValue,
    growthTable: growthTable,
    summary: summary
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (typeof window !== 'undefined') {
    window.QuickTools = window.QuickTools || {};
    window.QuickTools.compoundInterestCalculator = api;
  }
})();
