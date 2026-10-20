/* QuickTools — extractive text summarizer core logic (pure, no DOM).
 *
 * This is a FREQUENCY-BASED extractive summarizer, not AI and not machine
 * learning. Method: split the text into sentences, count how often each
 * significant word appears in the whole document, score every sentence by the
 * frequencies of the words it contains (length-normalized), keep the
 * top-scoring sentences, and return them in their original order.
 * Nothing is generated or reworded — the summary is a subset of the
 * original sentences.
 */
(function () {
  'use strict';

  // Common English stopwords — frequent but low-information words that would
  // otherwise dominate the frequency table.
  var STOPWORDS = {};
  (
    'a,an,the,and,or,but,if,then,else,when,while,of,at,by,for,with,about,' +
    'into,through,during,before,after,above,below,to,from,up,down,in,out,on,' +
    'off,over,under,again,further,once,here,there,all,any,both,each,few,more,' +
    'most,other,some,such,no,nor,not,only,own,same,so,than,too,very,can,will,' +
    'just,don,should,now,is,am,are,was,were,be,been,being,have,has,had,having,' +
    'do,does,did,doing,would,could,ought,i,you,he,she,it,we,they,me,him,her,' +
    'us,them,my,your,his,its,our,their,mine,yours,hers,ours,theirs,this,that,' +
    'these,those,as,because,until,what,which,who,whom,whose,how,why,where,' +
    'also,however,therefore,thus,hence,nevertheless,nonetheless,although,' +
    'though,since,despite,towards,within,without,between,among,per,via,may,' +
    'might,must,shall,let,one,two,first,second,new,used,using,use,many,much,' +
    'like,get,got,make,made,take,well,still,even,ever,never,always,often,' +
    'every,said,says'
  ).split(',').forEach(function (w) { STOPWORDS[w] = true; });

  function toText(value) {
    return value === null || value === undefined ? '' : String(value);
  }

  // Split into sentences, keeping trailing punctuation. Splits on . ! ? …
  // Decimal points inside numbers ("3.50") and common honorifics ("Dr.")
  // are protected first so they don't create false breaks. Other
  // abbreviations may still split; documented on-page.
  var DOT = '\u0001';
  function splitSentences(text) {
    var t = toText(text).trim().replace(/\s+/g, ' ');
    if (t === '') return [];
    var guarded = t
      .replace(/(\d)\.(\d)/g, '$1' + DOT + '$2')
      .replace(/\b(Mr|Mrs|Ms|Dr|St|Jr|Sr)\./g, '$1' + DOT);
    var parts = guarded.match(/[^.!?…]+[.!?…]+["'”’)\]]*|[^.!?…]+$/g) || [];
    return parts.map(function (s) {
      return s.split(DOT).join('.').trim();
    }).filter(function (s) { return s.length > 0; });
  }

  // Lowercase unicode word tokens, keeping internal apostrophes.
  function tokenize(sentence) {
    var m = sentence.toLowerCase().match(/[\p{L}\p{N}]+(?:'[\p{L}\p{N}]+)?/gu);
    return m || [];
  }

  function countWords(text) {
    var t = toText(text).trim();
    return t === '' ? 0 : t.split(/\s+/).length;
  }

  function scoreSentences(sentences) {
    var freq = {};
    var tokensPerSentence = sentences.map(function (s) {
      var toks = tokenize(s).filter(function (w) { return !STOPWORDS[w]; });
      toks.forEach(function (w) { freq[w] = (freq[w] || 0) + 1; });
      return toks;
    });
    return sentences.map(function (s, i) {
      var toks = tokensPerSentence[i];
      if (toks.length === 0) return { index: i, score: 0 };
      var sum = 0;
      toks.forEach(function (w) { sum += freq[w]; });
      // Length normalization (sqrt) so long sentences don't always win.
      return { index: i, score: sum / Math.sqrt(toks.length) };
    });
  }

  // options: { mode: 'sentences' | 'percent', value: number }
  //   sentences mode: keep `value` sentences (1..total)
  //   percent mode:   keep `value` percent of sentences (1..100)
  function summarize(text, options) {
    var opts = options || {};
    var sentences = splitSentences(text);
    var total = sentences.length;
    var result = {
      sentences: [],
      summary: '',
      originalWords: countWords(text),
      summaryWords: 0,
      originalSentences: total,
      keptSentences: 0,
      compressionPct: 0
    };
    if (total === 0) return result;

    var n;
    if (opts.mode === 'percent') {
      var pct = Number(opts.value);
      if (!isFinite(pct) || pct <= 0 || pct > 100) {
        throw new Error('Percent must be a number between 1 and 100.');
      }
      n = Math.round((total * pct) / 100);
    } else {
      n = Math.floor(Number(opts.value));
      if (!isFinite(n) || n < 1) {
        throw new Error('Sentence count must be a whole number of 1 or more.');
      }
    }
    n = Math.max(1, Math.min(n, total));

    var scored = scoreSentences(sentences);
    // Top-n by score; ties broken by earlier position for stability.
    var top = scored.slice().sort(function (a, b) {
      return b.score - a.score || a.index - b.index;
    }).slice(0, n);
    // Return in original document order.
    top.sort(function (a, b) { return a.index - b.index; });

    var kept = top.map(function (s) { return sentences[s.index]; });
    var summaryText = kept.join(' ');
    result.sentences = kept;
    result.summary = summaryText;
    result.keptSentences = kept.length;
    result.summaryWords = countWords(summaryText);
    result.compressionPct = result.originalWords === 0 ? 0 :
      Math.round((1 - result.summaryWords / result.originalWords) * 100);
    return result;
  }

  var api = {
    splitSentences: splitSentences,
    summarize: summarize,
    tokenize: tokenize,
    STOPWORDS: STOPWORDS
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (typeof window !== 'undefined') {
    window.QuickTools = window.QuickTools || {};
    window.QuickTools.textSummarizer = api;
  }
})();
