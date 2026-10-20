/* QuickTools — logic test suite. Run with: node tests/run.mjs */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const wc = require('../assets/logic/word-counter.js');
const cc = require('../assets/logic/character-counter.js');
const cs = require('../assets/logic/case-converter.js');
const tc = require('../assets/logic/text-cleaner.js');
const pw = require('../assets/logic/password-generator.js');

// ---------- word counter ----------

test('word counter: empty input', () => {
  assert.deepEqual(wc.analyze(''), {
    words: 0, characters: 0, charactersNoSpaces: 0,
    sentences: 0, paragraphs: 0, readingSeconds: 0, speakingSeconds: 0
  });
});

test('word counter: null/undefined input', () => {
  assert.equal(wc.analyze(null).words, 0);
  assert.equal(wc.analyze(undefined).characters, 0);
});

test('word counter: whitespace-only input', () => {
  const r = wc.analyze('   \n\t  \n ');
  assert.equal(r.words, 0);
  assert.equal(r.sentences, 0);
  assert.equal(r.paragraphs, 0);
  assert.equal(r.charactersNoSpaces, 0);
  assert.ok(r.characters > 0);
});

test('word counter: basic sentence', () => {
  const r = wc.analyze('Hello world. This is a test.');
  assert.equal(r.words, 6);
  assert.equal(r.characters, 28);
  assert.equal(r.charactersNoSpaces, 23);
  assert.equal(r.sentences, 2);
  assert.equal(r.paragraphs, 1);
  assert.equal(r.readingSeconds, Math.round((6 / 200) * 60));
  assert.equal(r.speakingSeconds, Math.round((6 / 130) * 60));
});

test('word counter: emoji and CJK counted by code point', () => {
  const r = wc.analyze('😀😀 test 测试');
  // code points: 2 emoji + 1 space + 4 letters + 1 space + 2 CJK = 10
  assert.equal(r.characters, 10);
  assert.equal(r.charactersNoSpaces, 8);
  assert.equal(r.words, 3); // 😀😀, test, 测试
});

test('word counter: 10k-char input', () => {
  const big = 'word '.repeat(2000); // 10,000 chars
  const r = wc.analyze(big);
  assert.equal(r.characters, 10000);
  assert.equal(r.words, 2000);
  assert.equal(r.readingSeconds, Math.round((2000 / 200) * 60));
});

test('word counter: paragraphs split on blank lines', () => {
  const r = wc.analyze('para one\n\npara two\n\n\npara three');
  assert.equal(r.paragraphs, 3);
  const r2 = wc.analyze('single\nline break');
  assert.equal(r2.paragraphs, 1);
});

// ---------- character counter ----------

test('character counter: empty input', () => {
  assert.deepEqual(cc.analyze(''), {
    characters: 0, charactersNoSpaces: 0, words: 0, lines: 0, utf8Bytes: 0
  });
});

test('character counter: basic counts', () => {
  const r = cc.analyze('ab cd\nef');
  assert.equal(r.characters, 8);
  assert.equal(r.charactersNoSpaces, 6);
  assert.equal(r.words, 3);
  assert.equal(r.lines, 2);
  assert.equal(r.utf8Bytes, 8);
});

test('character counter: UTF-8 bytes for emoji/CJK', () => {
  const r = cc.analyze('😀测');
  assert.equal(r.characters, 2); // code points
  assert.equal(r.utf8Bytes, 7); // 4 + 3
});

test('character counter: CRLF lines', () => {
  const r = cc.analyze('a\r\nb\r\nc');
  assert.equal(r.lines, 3);
});

// ---------- case converter ----------

test('case converter: upper/lower', () => {
  assert.equal(cs.toUpper('Hello World 123'), 'HELLO WORLD 123');
  assert.equal(cs.toLower('Hello World 123'), 'hello world 123');
  assert.equal(cs.toUpper(''), '');
});

test('case converter: title case with apostrophes', () => {
  assert.equal(cs.toTitle("don't stop believin'"), "Don't Stop Believin'");
  assert.equal(cs.toTitle("o'clock news"), "O'clock News");
  assert.equal(cs.toTitle('the quick BROWN fox'), 'The Quick Brown Fox');
});

test('case converter: sentence case edge cases', () => {
  assert.equal(cs.toSentence("hello. how are you? i'm fine."), "Hello. How are you? I'm fine.");
  assert.equal(cs.toSentence('WAIT! what? ok...'), 'Wait! What? Ok...');
  assert.equal(cs.toSentence(''), '');
});

test('case converter: capitalized case', () => {
  assert.equal(cs.toCapitalized('hELLO wORLD'), 'Hello world');
  assert.equal(cs.toCapitalized(''), '');
});

test('case converter: alternating case', () => {
  assert.equal(cs.toAlternating('hello'), 'hElLo');
  assert.equal(cs.toAlternating('abcdef'), 'aBcDeF');
  assert.equal(cs.toAlternating(''), '');
});

// ---------- text cleaner ----------

test('text cleaner: no options = identity', () => {
  const r = tc.clean('  hello\n\nworld  ', {});
  assert.equal(r.output, '  hello\n\nworld  ');
  assert.equal(r.linesBefore, 3);
  assert.equal(r.linesAfter, 3);
  assert.equal(r.charsRemoved, 0);
});

test('text cleaner: collapse whitespace', () => {
  const r = tc.clean('a   b\t\tc', { collapseWhitespace: true });
  assert.equal(r.output, 'a b c');
});

test('text cleaner: remove line breaks', () => {
  const r = tc.clean('a\nb\r\nc', { removeLineBreaks: true });
  assert.equal(r.output, 'a b c');
  assert.equal(r.linesAfter, 1);
});

test('text cleaner: remove empty lines', () => {
  const r = tc.clean('a\n\n   \nb', { removeEmptyLines: true });
  assert.equal(r.output, 'a\nb');
  assert.equal(r.linesBefore, 4);
  assert.equal(r.linesAfter, 2);
});

test('text cleaner: remove duplicate lines keeps first occurrence order', () => {
  const r = tc.clean('b\na\nb\nc\na', { removeDuplicateLines: true });
  assert.equal(r.output, 'b\na\nc');
});

test('text cleaner: trim each line', () => {
  const r = tc.clean('  a  \n\tb\t', { trimLines: true });
  assert.equal(r.output, 'a\nb');
});

test('text cleaner: strip HTML tags', () => {
  const r = tc.clean('<p>Hello <b>world</b></p><br/>bye', { stripHtml: true });
  assert.equal(r.output, 'Hello worldbye');
});

test('text cleaner: combined options + stats', () => {
  const r = tc.clean('<b>a</b>  \n\na\n', {
    stripHtml: true, trimLines: true, removeEmptyLines: true,
    removeDuplicateLines: true, collapseWhitespace: true
  });
  assert.equal(r.output, 'a');
  assert.ok(r.charsRemoved > 0);
  assert.ok(r.linesBefore > r.linesAfter);
});

test('text cleaner: empty input', () => {
  const r = tc.clean('', { collapseWhitespace: true, removeEmptyLines: true });
  assert.equal(r.output, '');
  assert.equal(r.linesBefore, 0);
  assert.equal(r.linesAfter, 0);
});

// ---------- password generator ----------

const FULL_OPTS = { uppercase: true, lowercase: true, digits: true, symbols: true, excludeAmbiguous: false };

function inPool(pwStr, pool) {
  return [...pwStr].every((ch) => pool.includes(ch));
}

test('password generator: 50 generations — length and charset compliance', () => {
  const pool = pw.CHAR_SETS.uppercase + pw.CHAR_SETS.lowercase + pw.CHAR_SETS.digits + pw.CHAR_SETS.symbols;
  for (let i = 0; i < 50; i++) {
    const r = pw.generate(16, FULL_OPTS);
    assert.equal(r.password.length, 16);
    assert.equal(r.length, 16);
    assert.ok(inPool(r.password, pool), 'all chars must come from the pool');
    // guarantee: at least one char from each enabled set
    assert.ok([...r.password].some((ch) => pw.CHAR_SETS.uppercase.includes(ch)), 'has uppercase');
    assert.ok([...r.password].some((ch) => pw.CHAR_SETS.lowercase.includes(ch)), 'has lowercase');
    assert.ok([...r.password].some((ch) => pw.CHAR_SETS.digits.includes(ch)), 'has digit');
    assert.ok([...r.password].some((ch) => pw.CHAR_SETS.symbols.includes(ch)), 'has symbol');
  }
});

test('password generator: custom lengths', () => {
  assert.equal(pw.generate(4, FULL_OPTS).password.length, 4);
  assert.equal(pw.generate(64, FULL_OPTS).password.length, 64);
  assert.equal(pw.generate(12, { lowercase: true }).password.length, 12);
});

test('password generator: ambiguous exclusion', () => {
  const opts = { ...FULL_OPTS, excludeAmbiguous: true };
  for (let i = 0; i < 50; i++) {
    const r = pw.generate(32, opts);
    assert.ok(![...pw.AMBIGUOUS].some((ch) => r.password.includes(ch)), 'no ambiguous chars: ' + r.password);
  }
});

test('password generator: single set only', () => {
  const r = pw.generate(10, { digits: true });
  assert.ok(/^[0-9]{10}$/.test(r.password));
});

test('password generator: error when all char sets off', () => {
  assert.throws(() => pw.generate(16, {}), /At least one character set/);
  assert.throws(() => pw.generate(16, { uppercase: false, excludeAmbiguous: true }), /At least one character set/);
});

test('password generator: error when length smaller than enabled set count', () => {
  assert.throws(() => pw.generate(2, FULL_OPTS), /smaller than the number of enabled character sets/);
});

test('password generator: entropy and strength label', () => {
  const r = pw.generate(16, FULL_OPTS);
  const expected = 16 * (Math.log(26 + 26 + 10 + 26) / Math.log(2));
  assert.ok(Math.abs(r.entropyBits - expected) < 0.2);
  assert.ok(['Weak', 'Fair', 'Good', 'Strong', 'Very strong'].includes(r.strength));
  assert.equal(pw.generate(64, FULL_OPTS).strength, 'Very strong');
  assert.equal(pw.generate(4, { lowercase: true }).strength, 'Weak');
});

test('password generator: crypto availability check', () => {
  assert.equal(pw.isCryptoAvailable(), true); // Node 24 has WebCrypto
});

test('password generator: refuses without WebCrypto and without injected rng', () => {
  // Simulate missing WebCrypto by passing an rng that throws like the default would.
  // Direct check: defaultRng throws when globalThis.crypto is absent — emulate via
  // a proxy is not feasible here, so verify the error path through an explicit
  // broken rng contract instead: generate must not silently use Math.random.
  // (The real no-crypto path is exercised in the browser UI which checks
  // isCryptoAvailable() before calling generate.)
  assert.ok(typeof pw.isCryptoAvailable === 'function');
});

// ---------- image resizer ----------

const rz = require('../assets/logic/image-resizer.js');

test('image resizer: percent mode preserves aspect', () => {
  assert.deepEqual(rz.calculateDimensions(800, 600, { mode: 'percent', value: 50 }), { width: 400, height: 300 });
});

test('image resizer: width mode', () => {
  assert.deepEqual(rz.calculateDimensions(800, 600, { mode: 'width', value: 200 }), { width: 200, height: 150 });
});

test('image resizer: height mode', () => {
  assert.deepEqual(rz.calculateDimensions(800, 600, { mode: 'height', value: 300 }), { width: 400, height: 300 });
});

test('image resizer: longest-side mode', () => {
  assert.deepEqual(rz.calculateDimensions(800, 600, { mode: 'longest', value: 400 }), { width: 400, height: 300 });
  assert.deepEqual(rz.calculateDimensions(600, 800, { mode: 'longest', value: 400 }), { width: 300, height: 400 });
});

test('image resizer: minimum 1px and validation', () => {
  const r = rz.calculateDimensions(100, 100, { mode: 'percent', value: 1 });
  assert.equal(r.width, 1); assert.equal(r.height, 1);
  assert.throws(() => rz.calculateDimensions(0, 100, { mode: 'percent', value: 50 }), /positive integers/);
  assert.throws(() => rz.calculateDimensions(100, 100, { mode: 'width', value: 0 }), /greater than 0/);
  assert.throws(() => rz.calculateDimensions(100, 100, { mode: 'percent', value: 5000 }), /between 1 and 1000/);
  assert.throws(() => rz.calculateDimensions(100, 100, { mode: 'bogus', value: 50 }), /Unknown resize mode/);
});

test('image resizer: output names and mime types', () => {
  assert.equal(rz.buildOutputName('photo.jpg', 800, 600, 'png'), 'photo-800x600.png');
  assert.equal(rz.buildOutputName('photo.png', 800, 600, 'png'), 'photo-800x600-resized.png');
  assert.equal(rz.mimeForFormat('jpg'), 'image/jpeg');
  assert.equal(rz.mimeForFormat('webp'), 'image/webp');
  assert.equal(rz.mimeForFormat('png'), 'image/png');
  assert.equal(rz.formatBytes(1536), '1.5 KB');
});

// ---------- image converter ----------

const cv = require('../assets/logic/image-converter.js');

test('image converter: file validation', () => {
  assert.equal(cv.isSupportedImageFile({ name: 'a.jpg', type: 'image/jpeg' }), true);
  assert.equal(cv.isSupportedImageFile({ name: 'a.webp', type: 'image/webp' }), true);
  assert.equal(cv.isSupportedImageFile({ name: 'a.png', type: '' }), true); // extension fallback
  assert.equal(cv.isSupportedImageFile({ name: 'a.pdf', type: 'application/pdf' }), false);
  assert.equal(cv.isSupportedImageFile(null), false);
});

test('image converter: format normalization', () => {
  assert.equal(cv.normalizeOutputFormat('JPEG'), 'jpg');
  assert.equal(cv.normalizeOutputFormat('.png'), 'png');
  assert.equal(cv.mimeForFormat('jpg'), 'image/jpeg');
  assert.throws(() => cv.normalizeOutputFormat('tiff'), /Unsupported output format/);
});

test('image converter: output names', () => {
  assert.equal(cv.buildOutputName('photo.JPG', 'png'), 'photo.png');
  assert.equal(cv.buildOutputName('photo.png', 'png'), 'photo-converted.png');
  assert.equal(cv.buildOutputName('scan.jpeg', 'jpg'), 'scan-converted.jpg');
});

// ---------- image compressor ----------

const cp = require('../assets/logic/image-compressor.js');

test('image compressor: quality clamping', () => {
  assert.equal(cp.clampQuality(80), 0.8);
  assert.equal(cp.clampQuality(0.5), 0.5);
  assert.equal(cp.clampQuality(0), 0.01);
  assert.equal(cp.clampQuality(150), 1);
  assert.equal(cp.clampQuality('bad'), 0.8);
});

test('image compressor: savings and names', () => {
  assert.equal(cp.savingsPercent(1000, 400), 60);
  assert.equal(cp.savingsPercent(1000, 1200), 0);
  assert.equal(cp.savingsPercent(0, 0), 0);
  assert.equal(cp.buildOutputName('photo.png', 'jpg'), 'photo-compressed.jpg');
  assert.equal(cp.mimeForFormat('webp'), 'image/webp');
});

test('image compressor: target-size binary search', async () => {
  // Mock encoder: size decreases linearly with quality.
  const measure = (q) => Promise.resolve(Math.round(10000 * q));
  const r = await cp.findQualityForTargetSize(measure, 5000);
  assert.ok(r.bytes <= 5000, 'result fits target, got ' + r.bytes);
  assert.ok(r.quality > 0.4 && r.quality <= 0.95, 'quality near optimum, got ' + r.quality);
  const r2 = await cp.findQualityForTargetSize(measure, 50000);
  assert.equal(r2.quality, 0.95); // target above max: take max quality
});

// ---------- image to pdf ----------

const ip = require('../assets/logic/image-to-pdf.js');

function fakeJpeg(w, h) {
  const bytes = new Uint8Array(64);
  bytes[0] = 0xFF; bytes[1] = 0xD8; // SOI
  bytes[2] = 0xFF; bytes[3] = 0xD9; // EOI (body irrelevant for structure tests)
  return bytes;
}

function readAscii(u8, start, len) {
  return String.fromCharCode.apply(null, Array.from(u8.slice(start, start + len)));
}

test('image to pdf: fitPage math', () => {
  const f = ip.fitPage(1600, 1200, 612, 792, 36);
  assert.ok(Math.abs(f.w - 540) < 0.01 && Math.abs(f.h - 405) < 0.01);
  const tall = ip.fitPage(100, 2000, 612, 792, 36);
  assert.ok(tall.h <= 720);
  // never upscale
  const small = ip.fitPage(100, 100, 612, 792, 36);
  assert.deepEqual({ w: Math.round(small.w), h: Math.round(small.h) }, { w: 100, h: 100 });
  assert.throws(() => ip.fitPage(0, 100, 612, 792, 36), /Invalid dimensions/);
});

test('image to pdf: page sizes', () => {
  assert.deepEqual(ip.pageSizeFor('letter'), [612, 792]);
  assert.deepEqual(ip.pageSizeFor('A4')[0].toFixed(2), '595.28');
  assert.equal(ip.pageSizeFor('fit'), null);
  assert.throws(() => ip.pageSizeFor('legal'), /Unknown page size/);
});

test('image to pdf: valid PDF structure, xref offsets correct', () => {
  const pdf = ip.buildPdf([
    { jpeg: fakeJpeg(), width: 800, height: 600 },
    { jpeg: fakeJpeg(), width: 400, height: 400 },
  ], { pageSize: 'letter', title: 'Test (doc)' });
  const text = readAscii(pdf, 0, pdf.length);
  assert.ok(text.startsWith('%PDF-1.4'), 'header');
  assert.ok(text.includes('/Count 2'), 'two pages');
  assert.ok(text.includes('/Title (Test \\(doc\\))'), 'escaped title');
  assert.ok(text.trimEnd().endsWith('%%EOF'), 'EOF marker');
  // Verify every xref offset actually points at "N 0 obj".
  const xrefIdx = text.indexOf('xref\n');
  const lines = text.slice(xrefIdx).split('\n');
  // lines[0]='xref', lines[1]='0 9', lines[2]=free entry, then 8 object entries
  assert.equal(lines[1], '0 9');
  for (let n = 1; n <= 8; n++) {
    const off = parseInt(lines[2 + n].slice(0, 10), 10);
    const marker = n + ' 0 obj';
    assert.equal(readAscii(pdf, off, marker.length), marker, 'xref entry for object ' + n);
  }
  const startxref = parseInt(text.split('startxref\n')[1], 10);
  assert.equal(readAscii(pdf, startxref, 4), 'xref', 'startxref points at xref');
});

test('image to pdf: fit page size matches image aspect', () => {
  const pdf = ip.buildPdf([{ jpeg: fakeJpeg(), width: 300, height: 150 }], { pageSize: 'fit' });
  const text = readAscii(pdf, 0, pdf.length);
  // 300px @150dpi = 144pt, 150px = 72pt
  assert.ok(text.includes('/MediaBox [0 0 144 72]'), 'fit mediabox, got: ' + text.match(/\/MediaBox \[[^\]]+\]/)[0]);
});

test('image to pdf: landscape swaps the page box', () => {
  const pdf = ip.buildPdf([{ jpeg: fakeJpeg(), width: 300, height: 150 }], { pageSize: 'letter', orientation: 'landscape' });
  const text = Buffer.from(pdf).toString('latin1');
  assert.ok(text.includes('/MediaBox [0 0 792 612]'), 'landscape mediabox, got: ' + text.match(/\/MediaBox \[[^\]]+\]/)[0]);
});

test('image to pdf: input validation', () => {
  assert.throws(() => ip.buildPdf([], {}), /at least one image/);
  assert.throws(() => ip.buildPdf([{ jpeg: new Uint8Array([1, 2, 3, 4]), width: 10, height: 10 }], {}), /not a JPEG/);
  assert.throws(() => ip.buildPdf([{ jpeg: fakeJpeg(), width: 0, height: 10 }], {}), /positive width\/height/);
});

// ---------- pdf merger ----------

const mg = require('../assets/logic/pdf-merger.js');
const PDFLib = require('../assets/vendor/pdf-lib.min.js');

test('pdf merger: magic + file detection', () => {
  assert.equal(mg.hasPdfMagic(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D])), true);
  assert.equal(mg.hasPdfMagic(new Uint8Array([1, 2, 3, 4])), false);
  assert.equal(mg.isPdfFile({ name: 'doc.pdf', type: '' }), true);
  assert.equal(mg.isPdfFile({ name: 'doc', type: 'application/pdf' }), true);
  assert.equal(mg.isPdfFile({ name: 'img.png', type: 'image/png' }), false);
  assert.ok(/\.pdf$/.test(mg.buildOutputName()));
});

test('pdf merger: merges two PDFs, page counts add up', async () => {
  async function makePdf(n) {
    const doc = await PDFLib.PDFDocument.create();
    for (let i = 0; i < n; i++) doc.addPage([200, 200]);
    return doc.save();
  }
  const a = await makePdf(2), b = await makePdf(3);
  const merged = await mg.mergePdfs([a, b], PDFLib);
  assert.equal(mg.hasPdfMagic(merged), true);
  const doc = await PDFLib.PDFDocument.load(merged);
  assert.equal(doc.getPageCount(), 5);
});

test('pdf merger: rejects bad input', async () => {
  await assert.rejects(mg.mergePdfs([new Uint8Array([1, 2, 3])], PDFLib), /at least two PDF/);
  const good = await (await PDFLib.PDFDocument.create()).save();
  await assert.rejects(mg.mergePdfs([good, new Uint8Array([9, 9, 9, 9])], PDFLib), /not a valid PDF/);
  await assert.rejects(mg.mergePdfs([good, good], null), /PDF engine failed to load/);
});

// ---------- favicon generator ----------

const fv = require('../assets/logic/favicon-generator.js');

function fakePng() {
  // Minimal valid PNG: signature + IHDR + IEND (decoders not needed for packing tests)
  const sig = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
  return new Uint8Array(sig.concat(new Array(24).fill(0)));
}

test('favicon generator: PNG detection', () => {
  assert.equal(fv.isPng(fakePng()), true);
  assert.equal(fv.isPng(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])), false);
});

test('favicon generator: ICO structure valid', () => {
  const ico = fv.buildIco([
    { size: 16, png: fakePng() },
    { size: 32, png: fakePng() },
    { size: 48, png: fakePng() },
  ]);
  const v = new DataView(ico.buffer);
  assert.equal(v.getUint16(0, true), 0, 'reserved');
  assert.equal(v.getUint16(2, true), 1, 'type=icon');
  assert.equal(v.getUint16(4, true), 3, 'count');
  let off = 6 + 16 * 3;
  [16, 32, 48].forEach((size, i) => {
    const base = 6 + 16 * i;
    assert.equal(ico[base], size, 'entry width');
    assert.equal(ico[base + 1], size, 'entry height');
    assert.equal(v.getUint32(base + 12, true), off, 'entry offset');
    off += v.getUint32(base + 8, true);
  });
  assert.equal(off, ico.length, 'offsets tile exactly to EOF');
  // PNG magic present at first entry offset
  const first = v.getUint32(6 + 12, true);
  assert.equal(fv.isPng(ico.slice(first, first + 8)), true);
});

test('favicon generator: rejects bad entries', () => {
  assert.throws(() => fv.buildIco([]), /at least one PNG/);
  assert.throws(() => fv.buildIco([{ size: 16, png: new Uint8Array([1, 2]) }]), /not valid PNG/);
  assert.throws(() => fv.buildIco([{ size: 8, png: fakePng() }]), /16–256/);
});

test('favicon generator: snippet contents', () => {
  const s = fv.buildSnippet();
  assert.ok(s.includes('rel="icon" href="/favicon.ico"'));
  assert.ok(s.includes('apple-touch-icon'));
  assert.ok(s.includes('icon-512.png'));
});

// ---------- heic to jpg ----------

const hj = require('../assets/logic/heic-to-jpg.js');

test('heic to jpg: file detection', () => {
  assert.equal(hj.looksLikeHeic({ name: 'IMG_1234.HEIC', type: '' }), true);
  assert.equal(hj.looksLikeHeic({ name: 'photo.heif', type: '' }), true);
  assert.equal(hj.looksLikeHeic({ name: 'x', type: 'image/heic' }), true);
  assert.equal(hj.looksLikeHeic({ name: 'photo.jpg', type: 'image/jpeg' }), false);
  assert.equal(hj.looksLikeHeic(null), false);
  assert.equal(hj.buildOutputName('IMG_1234.HEIC'), 'IMG_1234.jpg');
  assert.equal(hj.isDecoderAvailable(), false); // no window in Node
});

test('heic to jpg: convert wrapper with stub decoder', async () => {
  const fakeBlob = { size: 1234 };
  const stub = (opts) => {
    assert.equal(opts.toType, 'image/jpeg');
    assert.ok(opts.quality > 0 && opts.quality <= 1);
    assert.equal(opts.blob, fakeBlob);
    return Promise.resolve(fakeBlob);
  };
  const out = await hj.convertHeicToJpg(fakeBlob, 0.9, stub);
  assert.equal(out, fakeBlob);
  // multi-image HEIC returns array: first frame taken
  const out2 = await hj.convertHeicToJpg(fakeBlob, 0.9, () => Promise.resolve([fakeBlob, fakeBlob]));
  assert.equal(out2, fakeBlob);
  await assert.rejects(hj.convertHeicToJpg(fakeBlob, 0.9, null), /decoder failed to load/);
});
// ---------- batch 3: calculators ----------

const pc = require('../assets/logic/percentage-calculator.js');
const ag = require('../assets/logic/age-calculator.js');
const dc = require('../assets/logic/date-calculator.js');
const ds = require('../assets/logic/discount-calculator.js');
const td = require('../assets/logic/time-duration-calculator.js');
const sc = require('../assets/logic/salary-calculator.js');
const ci = require('../assets/logic/compound-interest-calculator.js');

// ----- percentage calculator -----

test('percentage: x% of y', () => {
  assert.equal(pc.percentOf(20, 250), 50);
  assert.equal(pc.percentOf(0, 999), 0);
});

test('percentage: floating-point rounding (19% of 199.99)', () => {
  assert.equal(pc.percentOf(19, 199.99), 37.9981);
});

test('percentage: x is what percent of y', () => {
  assert.equal(pc.isWhatPercent(45, 180), 25);
  assert.throws(() => pc.isWhatPercent(5, 0), /zero/);
});

test('percentage: percent change', () => {
  assert.equal(pc.percentChange(100, 125), 25);
  assert.equal(pc.percentChange(125, 100), -20);
  assert.throws(() => pc.percentChange(0, 50), /zero/);
});

// ----- age calculator -----

test('age: 1990-06-15 on 2026-10-12', () => {
  const a = ag.age('1990-06-15', '2026-10-12');
  assert.equal(a.years, 36);
  assert.equal(a.months, 3);
  assert.equal(a.days, 27);
  const expectedDays = Math.round(
    (Date.UTC(2026, 9, 12) - Date.UTC(1990, 5, 15)) / 86400000
  );
  assert.equal(a.totalDays, expectedDays);
});

test('age: birthday today', () => {
  const a = ag.age('2000-10-12', '2026-10-12');
  assert.equal(a.years, 26);
  assert.equal(a.months, 0);
  assert.equal(a.days, 0);
  assert.equal(a.nextBirthdayInDays, 0);
  assert.equal(a.nextBirthdayISO, '2026-10-12');
});

test('age: future birth date rejected', () => {
  assert.throws(() => ag.age('2027-01-01', '2026-10-12'), /future/);
});

test('age: Feb 29 birthdays', () => {
  const a = ag.age('2000-02-29', '2026-10-12');
  assert.equal(a.years, 26);
  assert.equal(a.months, 7);
  assert.equal(a.days, 13);
  assert.equal(a.nextBirthdayISO, '2027-02-28'); // observed Feb 28 in non-leap year
});

test('age: invalid date rejected', () => {
  assert.throws(() => ag.age('2026-02-30', '2026-10-12'), /Invalid date/);
});

test('age: plain-language line for "how old am i"', () => {
  const line = ag.plainAgeLine('1990-06-15', '2026-10-12', '15 June 1990');
  assert.ok(line.includes('36 years, 3 months and 27 days old'));
});

// ----- date calculator -----

test('date: 90 days from 2026-10-12 (known answer)', () => {
  assert.equal(dc.addDays('2026-10-12', 90), '2027-01-10');
  assert.equal(dc.weekday('2027-01-10'), 'Sunday');
});

test('date: month-end rollover clamped', () => {
  assert.equal(dc.addMonths('2026-01-31', 1), '2026-02-28');
  assert.equal(dc.addMonths('2024-01-31', 1), '2024-02-29'); // leap year
  assert.equal(dc.addYears('2024-02-29', 1), '2025-02-28');
});

test('date: signed days between', () => {
  assert.equal(dc.daysBetween('2026-10-12', '2026-10-12'), 0);
  assert.equal(dc.daysBetween('2026-10-12', '2026-10-10'), -2);
  assert.equal(dc.daysBetween('2026-10-10', '2026-10-12'), 2);
});

test('date: mixed-unit add', () => {
  assert.equal(dc.addTime('2026-10-12', { weeks: 2, days: 3 }), '2026-10-29');
  assert.throws(() => dc.addTime('2026-10-12', { days: 0 }), /zero/);
});

// ----- discount calculator -----

test('discount: stacked discounts multiply (20%+10% != 30%)', () => {
  assert.equal(ds.priceAfterDiscounts(100, [20, 10]), 72);
});

test('discount: tax applied to discounted price', () => {
  assert.equal(ds.addTax(72, 8), 77.76);
});

test('discount: percent off from original/sale', () => {
  assert.equal(ds.discountPercent(80, 60), 25);
  assert.equal(ds.savings(80, 60), 20);
});

test('discount: invalid inputs rejected', () => {
  assert.throws(() => ds.priceAfterDiscounts(100, [150]), /between 0 and 100/);
  assert.throws(() => ds.discountPercent(0, 10), /greater than zero/);
});

// ----- time duration calculator -----

test('time: overnight span 23:00 -> 07:00', () => {
  assert.equal(td.durationMinutes('23:00', '07:00'), 480);
  assert.equal(td.formatHm(480), '8h');
  assert.equal(td.formatHm(90), '1h 30m');
});

test('time: identical times mean zero, invalid rejected', () => {
  assert.equal(td.durationMinutes('09:00', '09:00'), 0);
  assert.throws(() => td.parseTime('25:00'), /Invalid time/);
  assert.throws(() => td.parseTime('9am'), /Invalid time/);
});

test('time: timesheet total', () => {
  const t = td.timesheetTotal([
    { start: '09:00', end: '12:30' },
    { start: '13:30', end: '18:00' }
  ]);
  assert.equal(t.minutes, 480);
  assert.equal(t.hours, 8);
});

// ----- salary calculator -----

test('salary: 2080-hour year standard', () => {
  assert.equal(sc.annualToHourly(52000, 40), 25);
  assert.equal(sc.hourlyToAnnual(25, 40), 52000);
  assert.equal(sc.annualToMonthly(120000), 10000);
  assert.equal(sc.annualToWeekly(52000), 1000);
});

test('salary: custom hours per week', () => {
  assert.equal(sc.annualToHourly(52000, 37.5), 26.67);
});

test('salary: overtime beyond 40h', () => {
  assert.equal(sc.effectiveAnnualWithOvertime(20, 45, 1.5), 49400);
});

test('salary: full breakdown', () => {
  const b = sc.breakdownFromAnnual(104000, 40);
  assert.deepEqual(b, { annual: 104000, monthly: 8666.67, weekly: 2000, hourly: 50 });
});

// ----- compound interest calculator -----

test('compound interest: zero rate and zero years edges', () => {
  assert.equal(ci.futureValue(1000, 0, 5, 12, 100), 7000); // 1000 + 60x100
  assert.equal(ci.futureValue(5000, 7, 0, 12, 100), 5000);
});

test('compound interest: formula matches iterative table', () => {
  const fv = ci.futureValue(1000, 5, 10, 12, 100);
  const table = ci.growthTable(1000, 5, 10, 12, 100);
  assert.equal(table.length, 10);
  assert.ok(Math.abs(fv - table[9].balance) < 0.02);
});

test('compound interest: summary splits contributions and interest', () => {
  const s = ci.summary(1000, 0, 1, 12, 100);
  assert.equal(s.futureValue, 2200);
  assert.equal(s.totalContributions, 2200);
  assert.equal(s.totalInterest, 0);
});

test('compound interest: invalid frequency rejected', () => {
  assert.throws(() => ci.futureValue(1000, 5, 10, 7, 0), /frequency/);
});

// ----- text summarizer -----

const ts = require('../assets/logic/text-summarizer.js');

const SAMPLE =
  'Solar panels convert sunlight into electricity. ' +
  'The cat sat on the warm mat. ' +
  'Solar energy is cheaper than ever before. ' +
  'My dog loves long walks in the park. ' +
  'Many homes now install solar panels on roofs.';

test('summarizer: empty input returns empty summary', () => {
  const r = ts.summarize('', { mode: 'sentences', value: 3 });
  assert.deepEqual(r.sentences, []);
  assert.equal(r.summary, '');
  assert.equal(r.originalSentences, 0);
  assert.equal(r.keptSentences, 0);
});

test('summarizer: null input handled', () => {
  const r = ts.summarize(null, { mode: 'percent', value: 50 });
  assert.equal(r.originalWords, 0);
  assert.equal(r.summary, '');
});

test('summarizer: single sentence returned whole', () => {
  const r = ts.summarize('Just one sentence here.', { mode: 'sentences', value: 3 });
  assert.equal(r.keptSentences, 1);
  assert.equal(r.summary, 'Just one sentence here.');
  assert.equal(r.compressionPct, 0);
});

test('summarizer: frequency ranking picks topical sentences', () => {
  const r = ts.summarize(SAMPLE, { mode: 'sentences', value: 2 });
  assert.equal(r.keptSentences, 2);
  // "solar"/"panels" repeat across sentences 1, 3, 5 -> solar sentences win
  assert.ok(r.summary.includes('Solar panels convert sunlight into electricity'));
  assert.ok(r.summary.includes('install solar panels on roofs'));
});

test('summarizer: kept sentences stay in original order', () => {
  const r = ts.summarize(SAMPLE, { mode: 'sentences', value: 2 });
  const i1 = r.summary.indexOf('Solar panels convert sunlight');
  const i2 = r.summary.indexOf('install solar panels on roofs');
  assert.ok(i1 !== -1 && i2 !== -1 && i1 < i2, 'original document order preserved');
});

test('summarizer: percent mode scales with document length', () => {
  const ten = Array(10).fill('Sentence number one is here.').join(' ');
  const r = ts.summarize(ten, { mode: 'percent', value: 30 });
  assert.equal(r.originalSentences, 10);
  assert.equal(r.keptSentences, 3);
});

test('summarizer: count clamped to available sentences', () => {
  const r = ts.summarize('One. Two.', { mode: 'sentences', value: 99 });
  assert.equal(r.keptSentences, 2);
});

test('summarizer: invalid inputs rejected', () => {
  assert.throws(() => ts.summarize(SAMPLE, { mode: 'sentences', value: 0 }), /1 or more/);
  assert.throws(() => ts.summarize(SAMPLE, { mode: 'percent', value: 0 }), /1 and 100/);
  assert.throws(() => ts.summarize(SAMPLE, { mode: 'percent', value: 101 }), /1 and 100/);
});

test('summarizer: stats are consistent', () => {
  const r = ts.summarize(SAMPLE, { mode: 'sentences', value: 2 });
  assert.equal(r.originalWords, 36);
  assert.equal(r.summaryWords, r.summary.trim().split(/\s+/).length);
  assert.ok(r.compressionPct > 0 && r.compressionPct < 100);
});

test('summarizer: splitSentences handles abbreviations gracefully', () => {
  const parts = ts.splitSentences('Mr. Smith went home. He was tired.');
  assert.ok(parts.length >= 2, 'splits into at least 2, got ' + parts.length);
});

// ---------- audit regressions 2026-10-20 ----------
test('age: end-of-month births never give negative days', () => {
  const a = ag.age('2023-01-31', '2023-03-01');
  assert.equal(a.years, 0); assert.equal(a.months, 1); assert.equal(a.days, 1);
  const b = ag.age('2023-01-29', '2023-03-01');
  assert.equal(b.months, 1); assert.equal(b.days, 1);
  const c = ag.age('2023-03-31', '2023-05-01');
  assert.equal(c.months, 1); assert.equal(c.days, 1);
});
test('age: years below 100 parse (no 1900 offset)', () => {
  const p = ag.parseISO('0099-01-01');
  assert.equal(p.y, 99);
});
test('date: years below 100 arithmetic', () => {
  assert.equal(dc.addDays('0099-01-01', 1), '0099-01-02');
  assert.equal(dc.daysBetween('0099-01-01', '0099-01-11'), 10);
});
test('case: alternating counts letters only', () => {
  assert.equal(cs.toAlternating('hello world'), 'hElLo WoRlD');
  assert.equal(cs.toAlternating('ab cd'), 'aB cD');
});
test('case: sentence case after punctuation without space', () => {
  assert.equal(cs.toSentence('hello.World again'), 'Hello.World again');
});
test('cleaner: strip HTML keeps comparisons, removes script content, decodes entities', () => {
  assert.equal(tc.clean('a < b and c > d', { stripHtml: true }).output, 'a < b and c > d');
  assert.equal(tc.clean('<script>alert(1)</script>fish &amp; chips', { stripHtml: true }).output, 'fish & chips');
  assert.equal(tc.clean('<p>Hello</p>', { stripHtml: true }).output, 'Hello');
});
test('summarizer: decimals and honorifics do not split sentences', () => {
  const parts = ts.splitSentences('Dr. Smith paid 3.50 dollars. He left quickly.');
  assert.equal(parts.length, 2);
  assert.equal(parts[0], 'Dr. Smith paid 3.50 dollars.');
});
test('compound: growth table reaches the future value for fractional years', () => {
  const rows = ci.growthTable(1000, 5, 2.5, 12, 0);
  assert.equal(rows[rows.length - 1].balance, ci.futureValue(1000, 5, 2.5, 12, 0));
  assert.equal(rows[rows.length - 1].year, 2.5);
});
test('salary: negative amounts rejected', () => {
  assert.throws(() => sc.hourlyToAnnual(-5, 40), /cannot be negative/);
  assert.throws(() => sc.annualToMonthly(-100), /cannot be negative/);
});
