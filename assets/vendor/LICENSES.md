# Vendored third-party libraries

These files are served from QuickTools' own hosting (same origin) so tool pages
make zero external network requests. Both are MIT-licensed; the license texts
below are included as required.

## pdf-lib.min.js
- **Source:** pdf-lib v1.17.1 (https://github.com/Hopding/pdf-lib)
- **License:** MIT — Copyright (c) 2019 Andrew Dillon
- **Used by:** PDF Merger tool (client-side PDF merging)
- **Note:** UMD build; in the browser it registers `window.PDFLib`, in Node it
  exports via `module.exports` (used by the test suite).

## heic2any.min.js
- **Source:** heic2any v0.0.4 (https://github.com/alexcorvi/heic2any)
- **License:** MIT — Copyright 2017 Yahoo Inc.
- **Used by:** HEIC to JPG tool (client-side HEIC decoding; bundles its WASM decoder)
- **Note:** UMD build; in the browser it registers `window.heic2any`.

### MIT License (applies to both)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
