/* QuickTools — password generator core logic (pure, no DOM).
 * SECURITY: randomness comes ONLY from WebCrypto (crypto.getRandomValues).
 * If WebCrypto is unavailable the module refuses to generate — there is
 * deliberately no Math.random() fallback.
 */
(function () {
  'use strict';

  var CHAR_SETS = {
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    digits: '0123456789',
    symbols: '!@#$%^&*()-_=+[]{};:,.<>?/'
  };
  var AMBIGUOUS = 'l1I0O';
  var SET_ORDER = ['uppercase', 'lowercase', 'digits', 'symbols'];

  function isCryptoAvailable() {
    return (
      typeof globalThis !== 'undefined' &&
      typeof globalThis.crypto !== 'undefined' &&
      typeof globalThis.crypto.getRandomValues === 'function'
    );
  }

  function defaultRng() {
    if (!isCryptoAvailable()) {
      throw new Error('WebCrypto (crypto.getRandomValues) is unavailable — refusing to generate a password.');
    }
    return globalThis.crypto.getRandomValues.bind(globalThis.crypto);
  }

  // Uniform random integer in [0, max) using rejection sampling to avoid
  // modulo bias. getRandomValues fills a Uint32Array.
  function randomInt(getRandomValues, max) {
    if (max <= 0) throw new RangeError('max must be positive');
    var range = 0x100000000; // 2^32
    var limit = range - (range % max);
    var buf = new Uint32Array(1);
    var x;
    do {
      getRandomValues(buf);
      x = buf[0];
    } while (x >= limit);
    return x % max;
  }

  function filterAmbiguous(chars) {
    return chars
      .split('')
      .filter(function (c) { return AMBIGUOUS.indexOf(c) === -1; })
      .join('');
  }

  // options: { uppercase, lowercase, digits, symbols, excludeAmbiguous }
  // getRandomValues: optional injection for tests (defaults to WebCrypto).
  function generate(length, options, getRandomValues) {
    var opts = options || {};
    var rng = getRandomValues || defaultRng();

    var len = Math.floor(Number(length));
    if (!isFinite(len) || len < 1) {
      throw new RangeError('Password length must be a positive integer.');
    }

    var enabledSets = [];
    var pool = '';
    for (var i = 0; i < SET_ORDER.length; i++) {
      var name = SET_ORDER[i];
      if (opts[name]) {
        var chars = CHAR_SETS[name];
        if (opts.excludeAmbiguous) chars = filterAmbiguous(chars);
        if (chars.length === 0) {
          throw new Error('Character set "' + name + '" is empty after exclusions.');
        }
        enabledSets.push(chars);
        pool += chars;
      }
    }
    if (enabledSets.length === 0) {
      throw new Error('At least one character set must be enabled.');
    }
    if (len < enabledSets.length) {
      throw new RangeError(
        'Length (' + len + ') is smaller than the number of enabled character sets (' +
        enabledSets.length + '); cannot guarantee one character from each set.'
      );
    }

    // Guarantee at least one character from each enabled set.
    var charsArr = [];
    for (var s = 0; s < enabledSets.length; s++) {
      charsArr.push(enabledSets[s].charAt(randomInt(rng, enabledSets[s].length)));
    }
    // Fill the rest from the full pool.
    for (var k = charsArr.length; k < len; k++) {
      charsArr.push(pool.charAt(randomInt(rng, pool.length)));
    }
    // Fisher–Yates shuffle with the same secure RNG.
    for (var j = charsArr.length - 1; j > 0; j--) {
      var r = randomInt(rng, j + 1);
      var tmp = charsArr[j];
      charsArr[j] = charsArr[r];
      charsArr[r] = tmp;
    }

    var password = charsArr.join('');
    var entropyBits = len * (Math.log(pool.length) / Math.log(2));
    return {
      password: password,
      length: len,
      poolSize: pool.length,
      entropyBits: Math.round(entropyBits * 10) / 10,
      strength: strengthLabel(entropyBits)
    };
  }

  function strengthLabel(bits) {
    if (bits < 40) return 'Weak';
    if (bits < 60) return 'Fair';
    if (bits < 80) return 'Good';
    if (bits < 100) return 'Strong';
    return 'Very strong';
  }

  var api = {
    generate: generate,
    isCryptoAvailable: isCryptoAvailable,
    CHAR_SETS: CHAR_SETS,
    AMBIGUOUS: AMBIGUOUS
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (typeof window !== 'undefined') {
    window.QuickTools = window.QuickTools || {};
    window.QuickTools.passwordGenerator = api;
  }
})();
