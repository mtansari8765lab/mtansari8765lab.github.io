/* QuickTools — discount calculator core logic (pure, no DOM).
 * Multiple discounts stack multiplicatively (20% then 10% = 28% off, not 30%),
 * and tax is applied to the discounted price.
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

  function round2(n) {
    return Math.round(n * 100) / 100;
  }

  function pct(value, name) {
    var n = num(value, name);
    if (n < 0 || n > 100) {
      throw new Error(name + ' must be between 0 and 100.');
    }
    return n;
  }

  // Apply a list of sequential percentage discounts to a price.
  function priceAfterDiscounts(price, discounts) {
    price = num(price, 'Price');
    if (price < 0) {
      throw new Error('Price cannot be negative.');
    }
    if (!Array.isArray(discounts)) {
      throw new Error('Discounts must be a list.');
    }
    var out = price;
    for (var i = 0; i < discounts.length; i++) {
      var d = discounts[i];
      if (d === null || d === undefined || d === '') continue;
      out = out * (1 - pct(d, 'Discount ' + (i + 1)) / 100);
    }
    return round2(out);
  }

  // "Original $X, sale $Y — what percent off?"
  function discountPercent(original, sale) {
    original = num(original, 'Original price');
    sale = num(sale, 'Sale price');
    if (original <= 0) {
      throw new Error('Original price must be greater than zero.');
    }
    return Math.round((((original - sale) / original) * 100) * 100) / 100;
  }

  // Tax is applied to the (already discounted) price.
  function addTax(price, taxPct) {
    price = num(price, 'Price');
    taxPct = pct(taxPct === '' || taxPct === null || taxPct === undefined ? 0 : taxPct, 'Tax');
    return round2(price * (1 + taxPct / 100));
  }

  function savings(original, finalPrice) {
    return round2(num(original, 'Original price') - num(finalPrice, 'Final price'));
  }

  var api = {
    priceAfterDiscounts: priceAfterDiscounts,
    discountPercent: discountPercent,
    addTax: addTax,
    savings: savings
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (typeof window !== 'undefined') {
    window.QuickTools = window.QuickTools || {};
    window.QuickTools.discountCalculator = api;
  }
})();
