// Quire tool engine. Each tool page sets data-engine on #app; this file builds the workspace and does the work in the browser.
(() => {
'use strict';
const Q = window.QUIRE || {}; const ROOT = Q.root || '';
const appEl = document.getElementById('app'); if (!appEl) return;
const ENGINE = appEl.dataset.engine; let PRESET = {};
try { PRESET = JSON.parse(appEl.dataset.preset || '{}'); } catch (e) {}
const TOOL = (Q.tools || []).find(t => t.slug === document.body.dataset.tool) || { name: 'Tool', slug: '', icon: '' };
const { PDFDocument, StandardFonts, rgb, degrees } = window.PDFLib || {};
const toast = (m, ms) => (window.QuireSite ? window.QuireSite.toast(m, ms) : alert(m));

/* ================= helpers ================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtSize = b => b < 1024 ? b + ' B' : b < 1048576 ? Math.round(b / 1024) + ' KB' : (b / 1048576).toFixed(1) + ' MB';
const baseName = n => (String(n).replace(/\.[^.]+$/, '').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-')) || 'document';
const pad = (n, w) => String(n).padStart(w, '0');
const extOf = n => ((String(n).match(/\.([a-z0-9]+)$/i) || [, ''])[1]).toLowerCase();
const plural = (n, a, b) => `${n} ${n === 1 ? a : (b || a + 's')}`;
const today = () => new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const MM = 72 / 25.4;
let uidN = 0; const uid = () => 'q' + (++uidN);
const canvasBlob = (c, type, q) => new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error('This page is too large for your browser to draw. Try a lower resolution.')), type, q));
const blobBytes = async b => new Uint8Array(await b.arrayBuffer());
const dataUrlBytes = u => { const s = atob(u.split(',')[1]); const a = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const yieldUI = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));

const IC = {
  upload: 'M12 16V4M7 9l5-5 5 5M4 15v4a1 1 0 001 1h14a1 1 0 001-1v-4', lock: 'M6 11h12v10H6zM8 11V8a4 4 0 018 0v3',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 9a3 3 0 100 6 3 3 0 000-6z', save: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  next: 'M5 12h14M13 6l6 6-6 6', sign: 'M4 18c2.5-.5 4.5-2.5 6.5-5.5L17 6l2 2-6.5 6.5c-3 2-5 3.5-8.5 3.5zM15 8l2 2M4 21h16',
  grid: 'M4 6h7v9H4zM14 9h6v6h-6z', text: 'M5 6h14M12 6v13M9 19h6', plus: 'M12 5v14M5 12h14',
};
const icon = n => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="${IC[n] || IC.plus}"/></svg>`;

/* ================= saving ================= */
const MIME = { pdf: 'application/pdf', jpg: 'image/jpeg', png: 'image/png', bmp: 'image/bmp', tif: 'image/tiff', tiff: 'image/tiff', txt: 'text/plain', md: 'text/markdown', zip: 'application/zip', html: 'text/html', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' };
let dl = null; const dlReady = (async () => { try { if (window.claude && window.claude.use) dl = await window.claude.use('downloads'); } catch (e) { dl = null; } })();
async function saveFile(name, bytes) {
  const blob = new Blob([bytes], { type: MIME[extOf(name)] || 'application/octet-stream' });
  if (window.claude) {
    await dlReady;
    if (dl) { try { await dl.save({ filename: name, data: blob }); toast('Saved ' + name); } catch (e) { const c = e && e.code; toast(c === 'declined' ? 'Save cancelled.' : c === 'rate_limited' ? 'Answer the open save prompt first.' : 'Saving this file type isn’t available here.'); } return; }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 8000);
}

/* ================= PDF helpers ================= */
function openView(bytes, password) { const o = { data: bytes.slice(0), isEvalSupported: false }; if (password != null) o.password = password; return pdfjsLib.getDocument(o).promise; }
async function renderPage(doc, n, { width, scale, upright }) {
  const page = await doc.getPage(n); const rot = upright ? 0 : undefined;
  const v1 = page.getViewport({ scale: 1, rotation: rot });
  const vp = page.getViewport({ scale: width ? width / v1.width : scale, rotation: rot });
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(vp.width)); c.height = Math.max(1, Math.round(vp.height));
  const ctx = c.getContext('2d', { willReadFrequently: true }); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  await page.render({ canvasContext: ctx, viewport: vp }).promise; page.cleanup();
  return { canvas: c, w: v1.width, h: v1.height, vp, v1, page };
}
async function loadLib(item) {
  const d = await PDFDocument.load(item.bytes, { ignoreEncryption: true, updateMetadata: false });
  if (!d.isEncrypted) return d;
  let dec; try { dec = await PDFDocument.load(item.bytes, { password: item.password || '' }); } catch (e) { throw new Error(`${item.name} needs a password. Open it with Unlock PDF first.`); }
  const fresh = await PDFDocument.create(); (await fresh.copyPages(dec, dec.getPageIndices())).forEach(p => fresh.addPage(p)); return fresh;
}
function inkRatio(canvas) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true }); const { width: w, height: h } = canvas; const d = ctx.getImageData(0, 0, w, h).data; let ink = 0, n = 0;
  for (let y = Math.floor(h * 0.02); y < h * 0.98; y += 2) for (let x = Math.floor(w * 0.02); x < w * 0.98; x += 2) { const i = (y * w + x) * 4; n++; if (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114 < 228) ink++; }
  return n ? ink / n : 0;
}
async function rasterPage(doc, i, dpi, q, post) {
  const r = await renderPage(doc, i, { scale: dpi / 72 }); if (post) post(r.canvas);
  const bytes = await blobBytes(await canvasBlob(r.canvas, 'image/jpeg', q)); r.canvas.width = r.canvas.height = 0; return { bytes, w: r.w, h: r.h };
}
function toGray(c) { const ctx = c.getContext('2d', { willReadFrequently: true }); const im = ctx.getImageData(0, 0, c.width, c.height); const d = im.data; for (let i = 0; i < d.length; i += 4) { const g = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114; d[i] = d[i + 1] = d[i + 2] = g; } ctx.putImageData(im, 0, 0); }
function runs(sorted) { const out = []; let s = null, p = null; sorted.forEach(n => { if (s == null) { s = p = n; } else if (n === p + 1) p = n; else { out.push([s, p]); s = p = n; } }); if (s != null) out.push([s, p]); return out.map(([a, b]) => a === b ? `${a}` : `${a}-${b}`).join(', '); }
function parseRanges(str, n) {
  const parts = String(str || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!parts.length) throw new Error('Pick pages, or type a range such as 1-3.');
  return parts.map(p => {
    const m = p.match(/^(\d*)\s*(-)?\s*(\d*)$/); if (!m || (!m[1] && !m[3])) throw new Error(`“${p}” isn’t a page range. Use a form like 2-5.`);
    const a = m[1] ? +m[1] : 1; const b = m[2] ? (m[3] ? +m[3] : n) : a;
    if (a < 1 || b > n || a > b) throw new Error(`“${p}” is outside this file’s ${n} pages.`);
    return { label: p, idx: Array.from({ length: b - a + 1 }, (_, i) => a - 1 + i) };
  });
}
const PAPER = { a4: [595.28, 841.89], letter: [612, 792], legal: [612, 1008], a5: [419.53, 595.28], a3: [841.89, 1190.55] };
const paperName = (w, h) => { const s = [Math.min(w, h), Math.max(w, h)]; for (const [n, d] of [['A4', PAPER.a4], ['Letter', PAPER.letter], ['Legal', PAPER.legal], ['A5', PAPER.a5], ['A3', PAPER.a3]]) if (Math.abs(s[0] - d[0]) < 4 && Math.abs(s[1] - d[1]) < 4) return n; return ''; };
const COLORS = { grey: [0.45, 0.45, 0.47], black: [0.1, 0.1, 0.1], red: [0.78, 0.17, 0.14], blue: [0.1, 0.32, 0.72], orange: [0.95, 0.38, 0.1] };
const cssColor = k => `rgb(${(COLORS[k] || COLORS.grey).map(v => Math.round(v * 255)).join(',')})`;
const fillTokens = (t, n, total, file) => String(t || '').replace(/\{page\}/g, n).replace(/\{total\}/g, total).replace(/\{date\}/g, today()).replace(/\{file\}/g, file);
function latinCheck(font, text, size) { try { return font.widthOfTextAtSize(text, size); } catch (e) { throw new Error('This text uses characters the built-in PDF font can’t show. Use Latin letters, numbers and common symbols.'); } }
const pageSize = (paper, orient) => { let [w, h] = PAPER[paper] || PAPER.a4; if (orient === 'landscape') [w, h] = [h, w]; return [w, h]; };

// Group pdf.js text items into lines, then paragraphs with a size for heading detection.
function textLines(items) {
  const rows = [];
  items.forEach(it => {
    if (!it.str) return; const y = it.transform[5], x = it.transform[4]; const h = Math.abs(it.transform[3]) || Math.hypot(it.transform[2], it.transform[3]) || 10;
    let row = rows.find(r => Math.abs(r.y - y) < Math.max(h, r.h) * 0.5); if (!row) { row = { y, h, items: [] }; rows.push(row); }
    row.items.push({ x, s: it.str, w: it.width || 0, h }); row.h = Math.max(row.h, h);
  });
  rows.sort((a, b) => b.y - a.y);
  return rows.map(r => {
    r.items.sort((a, b) => a.x - b.x); let line = '', end = null, chars = 0, sz = 0;
    r.items.forEach(it => { if (end != null && it.x - end > it.h * 0.18 && !line.endsWith(' ') && !it.s.startsWith(' ')) line += ' '; line += it.s; end = it.x + it.w; chars += it.s.length; sz += it.h * it.s.length; });
    return { y: r.y, x: r.items[0] ? r.items[0].x : 0, text: line.replace(/\s+/g, ' ').trim(), size: chars ? sz / chars : r.h, items: r.items };
  }).filter(l => l.text);
}
function paragraphs(lines) {
  const out = []; let cur = null;
  for (const l of lines) {
    if (cur) {
      const gap = cur.lastY - l.y;
      if (gap > l.size * 1.9 || Math.abs(l.size - cur.size) > cur.size * 0.2) { out.push(cur); cur = null; }
    }
    if (!cur) cur = { text: l.text, size: l.size, lastY: l.y };
    else { cur.text = /[A-Za-z]-$/.test(cur.text) && /^[a-z]/.test(l.text) ? cur.text.slice(0, -1) + l.text : cur.text + ' ' + l.text; cur.lastY = l.y; }
  }
  if (cur) out.push(cur); return out;
}
async function docBlocks(doc, progress) {
  const pages = []; const sizes = [];
  for (let i = 1; i <= doc.numPages; i++) {
    if (progress) progress(`Reading page ${i} of ${doc.numPages}`, (i - 1) / doc.numPages * 0.4);
    const page = await doc.getPage(i); const tc = await page.getTextContent(); const vp = page.getViewport({ scale: 1 });
    const paras = paragraphs(textLines(tc.items)); pages.push({ paras, w: vp.width, h: vp.height });
    paras.forEach(p => sizes.push([p.size, p.text.length]));
  }
  sizes.sort((a, b) => a[0] - b[0]); let total = sizes.reduce((s, x) => s + x[1], 0), acc = 0, body = 11;
  for (const [s, n] of sizes) { acc += n; if (acc >= total / 2) { body = s; break; } }
  pages.forEach(p => p.paras.forEach(b => { b.level = b.size >= body * 1.75 && b.text.length < 160 ? 1 : b.size >= body * 1.28 && b.text.length < 200 ? 2 : 0; }));
  return { pages, body, chars: total };
}

/* ================= offscreen rendering (Office, HTML) ================= */
function host(widthPx) { const h = document.createElement('div'); h.className = 'q-host'; h.style.cssText = `position:fixed;left:-40000px;top:0;width:${widthPx}px;background:#fff;color:#000;z-index:-1;contain:layout`; document.body.appendChild(h); return h; }
async function snap(el, scale, extra) { if (!window.html2canvas) throw new Error('The page renderer didn’t load. Check your connection and reload.'); return html2canvas(el, Object.assign({ scale, backgroundColor: '#ffffff', useCORS: true, logging: false }, extra || {})); }
function whiteCut(canvas, ideal, minY) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true }); const w = canvas.width; const top = Math.max(minY, Math.floor(ideal - (ideal - minY) * 0.25));
  const band = ctx.getImageData(0, top, w, Math.max(1, ideal - top)).data; const rows = ideal - top;
  for (let r = rows - 1; r >= 0; r--) { let white = true; for (let x = 0; x < w; x += 3) { const i = (r * w + x) * 4; if (band[i] < 240 || band[i + 1] < 240 || band[i + 2] < 240) { white = false; break; } } if (white) return top + r; }
  return ideal;
}
async function addCanvasPages(out, canvas, { pageW, pageH, margin, ptPerPx, quality = 0.9, smartCut = true }) {
  const contentH = (pageH - 2 * margin) / ptPerPx; let y = 0; let n = 0;
  while (y < canvas.height - 1) {
    let end = Math.min(canvas.height, y + contentH); if (end < canvas.height && smartCut) end = whiteCut(canvas, Math.floor(end), Math.floor(y + contentH * 0.6));
    const sl = document.createElement('canvas'); sl.width = canvas.width; sl.height = Math.max(1, Math.round(end - y));
    const sctx = sl.getContext('2d'); sctx.fillStyle = '#fff'; sctx.fillRect(0, 0, sl.width, sl.height); sctx.drawImage(canvas, 0, y, canvas.width, sl.height, 0, 0, canvas.width, sl.height);
    const img = await out.embedJpg(await blobBytes(await canvasBlob(sl, 'image/jpeg', quality)));
    const p = out.addPage([pageW, pageH]); p.drawImage(img, { x: margin, y: pageH - margin - sl.height * ptPerPx, width: sl.width * ptPerPx, height: sl.height * ptPerPx });
    sl.width = 0; y = end; n++;
  }
  return n;
}

/* ================= image decoding / encoding ================= */
async function decodeTiff(bytes) {
  if (!window.UTIF) throw new Error('The TIFF reader didn’t load. Check your connection and reload the page.');
  const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength); const ifds = UTIF.decode(buf); const frames = [];
  for (const ifd of ifds) {
    if (ifd.t254 && ifd.t254[0] === 1) continue;
    UTIF.decodeImage(buf, ifd); if (!ifd.width || !ifd.height) continue;
    const rgba = UTIF.toRGBA8(ifd); const c = document.createElement('canvas'); c.width = ifd.width; c.height = ifd.height;
    c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(rgba.buffer, rgba.byteOffset, ifd.width * ifd.height * 4), ifd.width, ifd.height), 0, 0);
    const blob = await canvasBlob(c, 'image/png'); frames.push({ bytes: await blobBytes(blob), url: URL.createObjectURL(blob), w: ifd.width, h: ifd.height, mime: 'image/png' }); c.width = 0;
  }
  if (!frames.length) throw new Error('No pictures were found in this TIFF file.');
  return frames;
}
function canvasToBmp(c) {
  const w = c.width, h = c.height; const d = c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data; const row = Math.ceil(w * 3 / 4) * 4; const size = 54 + row * h;
  const buf = new ArrayBuffer(size); const v = new DataView(buf); v.setUint8(0, 66); v.setUint8(1, 77); v.setUint32(2, size, true); v.setUint32(10, 54, true); v.setUint32(14, 40, true);
  v.setInt32(18, w, true); v.setInt32(22, h, true); v.setUint16(26, 1, true); v.setUint16(28, 24, true); v.setUint32(34, row * h, true); v.setInt32(38, 5906, true); v.setInt32(42, 5906, true);
  const u = new Uint8Array(buf); for (let y = 0; y < h; y++) { let o = 54 + (h - 1 - y) * row; for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; u[o++] = d[i + 2]; u[o++] = d[i + 1]; u[o++] = d[i]; } } return u;
}
function packBitsRows(src, rowLen, rows) { // TIFF PackBits compression, row by row
  const out = new Uint8Array(src.length + Math.ceil(src.length / 128) + rows + 16); let o = 0;
  for (let r = 0; r < rows; r++) {
    let i = r * rowLen; const end = i + rowLen;
    while (i < end) {
      let j = i + 1; while (j < end && j - i < 128 && src[j] === src[i]) j++;
      if (j - i >= 3) { out[o++] = (257 - (j - i)) & 255; out[o++] = src[i]; i = j; continue; }
      let k = i; while (k < end && k - i < 128) { if (k + 2 < end && src[k] === src[k + 1] && src[k] === src[k + 2]) break; k++; }
      out[o++] = k - i - 1; out.set(src.subarray(i, k), o); o += k - i; i = k;
    }
  }
  return out.slice(0, o);
}
function tiffEncode(frames) {
  frames.forEach(f => { f.data = packBitsRows(f.rgb, f.w * 3, f.h); f.rgb = null; });
  const mk = (f, off) => ({ t256: [f.w], t257: [f.h], t258: [8, 8, 8], t259: [32773], t262: [2], t273: [off], t277: [3], t278: [f.h], t279: [f.data.length], t282: [1], t283: [1], t284: [1], t296: [1], t305: ['Quire'] });
  const L = new Uint8Array(UTIF.encode(frames.map(f => mk(f, 0)))).length; let off = L + (L % 2); const offs = frames.map(f => { const o = off; off += f.data.length + (f.data.length % 2); return o; });
  const head = new Uint8Array(UTIF.encode(frames.map((f, i) => mk(f, offs[i])))); const out = new Uint8Array(off); out.set(head, 0); frames.forEach((f, i) => out.set(f.data, offs[i])); return out;
}
function canvasRGB(c) { const d = c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height).data; const o = new Uint8Array(c.width * c.height * 3); for (let i = 0, j = 0; i < d.length; i += 4) { o[j++] = d[i]; o[j++] = d[i + 1]; o[j++] = d[i + 2]; } return o; }
async function embedImage(out, f) {
  if (f.mime === 'image/png' && f.bytes) { try { return await out.embedPng(f.bytes); } catch (e) {} }
  if (f.mime === 'image/jpeg' && f.bytes && !f.exif) { try { return await out.embedJpg(f.bytes); } catch (e) {} }
  const img = new Image(); img.src = f.url; await img.decode();
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0);
  const b = await blobBytes(await canvasBlob(c, 'image/jpeg', 0.92)); c.width = 0; return out.embedJpg(b);
}
const jpegHasRotation = b => { // look for an EXIF orientation tag other than 1
  if (b[0] !== 0xFF || b[1] !== 0xD8) return false; let i = 2;
  while (i < b.length - 10) { if (b[i] !== 0xFF) return false; const m = b[i + 1], len = (b[i + 2] << 8) | b[i + 3]; if (m === 0xE1 && b[i + 4] === 0x45 && b[i + 5] === 0x78) { const t = i + 10; const le = b[t] === 0x49; const r16 = o => le ? b[o] | (b[o + 1] << 8) : (b[o] << 8) | b[o + 1]; const r32 = o => le ? (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0 : ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0; const ifd = t + r32(t + 4); const n = r16(ifd); for (let k = 0; k < n; k++) { const e = ifd + 2 + k * 12; if (r16(e) === 0x0112) return r16(e + 8) !== 1; } return false; } i += 2 + len; }
  return false;
};

/* ================= accepted inputs ================= */
const ACCEPT = {
  pdf: { exts: ['pdf'], input: 'application/pdf,.pdf', label: 'PDF', noun: 'PDF', nouns: 'PDF files' },
  jpg: { exts: ['jpg', 'jpeg', 'jfif'], input: 'image/jpeg,.jpg,.jpeg', label: 'JPG · JPEG', noun: 'JPG image', nouns: 'JPG images' },
  png: { exts: ['png'], input: 'image/png,.png', label: 'PNG', noun: 'PNG image', nouns: 'PNG images' },
  bmp: { exts: ['bmp', 'dib'], input: 'image/bmp,.bmp', label: 'BMP', noun: 'BMP image', nouns: 'BMP images' },
  gif: { exts: ['gif'], input: 'image/gif,.gif', label: 'GIF', noun: 'GIF image', nouns: 'GIF images' },
  tiff: { exts: ['tif', 'tiff'], input: 'image/tiff,.tif,.tiff', label: 'TIF · TIFF', noun: 'TIFF image', nouns: 'TIFF images' },
  img: { exts: ['jpg', 'jpeg', 'jfif', 'png', 'webp', 'gif', 'bmp', 'tif', 'tiff'], input: 'image/*,.tif,.tiff', label: 'JPG · PNG · WebP · GIF · BMP · TIFF', noun: 'image', nouns: 'images' },
  docx: { exts: ['docx'], input: '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document', label: 'DOCX', noun: 'Word document', nouns: 'Word documents' },
  xlsx: { exts: ['xlsx', 'xlsm', 'xls', 'ods', 'csv'], input: '.xlsx,.xlsm,.xls,.ods,.csv', label: 'XLSX · XLS · CSV · ODS', noun: 'spreadsheet', nouns: 'spreadsheets' },
  pptx: { exts: ['pptx'], input: '.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation', label: 'PPTX', noun: 'PowerPoint file', nouns: 'PowerPoint files' },
  html: { exts: ['html', 'htm', 'xhtml'], input: '.html,.htm,text/html', label: 'HTML · HTM', noun: 'HTML file', nouns: 'HTML files' },
  txt: { exts: ['txt', 'text', 'md', 'log', 'csv'], input: '.txt,.text,.md,.log,.csv,text/plain', label: 'TXT · MD · LOG', noun: 'text file', nouns: 'text files' },
  rtf: { exts: ['rtf'], input: '.rtf,application/rtf,text/rtf', label: 'RTF', noun: 'RTF file', nouns: 'RTF files' },
};
const IMG_EXT = new Set(['jpg', 'jpeg', 'jfif', 'png', 'webp', 'gif', 'bmp', 'dib', 'tif', 'tiff']);
const OLD_FMT = { doc: 'Word 97–2003 (.doc)', ppt: 'PowerPoint 97–2003 (.ppt)' };

/* ================= samples ================= */
const NOTES = ['Grass height averaged 31 cm along the north fence line.', 'Standing water in the low corner after Tuesday’s rain.', 'Two new burrows near the oak; both look recently used.', 'Clover has spread roughly a metre since the last visit.', 'Fence post 14 is leaning and needs a new brace.', 'Wind from the west, light, about 12 km/h at 7:40.', 'Soil temperature 14 °C at 10 cm depth.', 'Counted 9 bumblebees on the thistle patch in 5 minutes.'];
const LANG_SAMPLE = {
  de: ['Lieferbedingungen', 'Die Lieferung erfolgt innerhalb von 14 Tagen nach Zahlungseingang.', 'Die Garantie beträgt zwei Jahre ab dem Kaufdatum.', 'Rücksendungen sind innerhalb von 30 Tagen möglich.', 'Bei Fragen wenden Sie sich bitte an unseren Kundendienst.'],
  fr: ['Conditions de livraison', 'La livraison a lieu dans les 14 jours suivant la réception du paiement.', 'La garantie est de deux ans à compter de la date d’achat.', 'Les retours sont acceptés dans un délai de 30 jours.', 'Pour toute question, contactez notre service client.'],
  en: ['Delivery terms', 'Delivery takes place within 14 days of receiving payment.', 'The warranty lasts two years from the date of purchase.', 'Returns are accepted within 30 days.', 'If you have any questions, please contact our customer service team.'],
};
const FIELD = ['Survey of the east meadow', 'Water samples, week 2', 'Bird counts at dawn', 'Notes for the next visit'];
async function samplePdf(title, titles, o = {}) {
  const doc = await PDFDocument.create(); const bold = await doc.embedFont(StandardFonts.HelveticaBold), reg = await doc.embedFont(StandardFonts.Helvetica);
  const tints = [[0.95, 0.38, 0.1], [0.12, 0.53, 0.68], [0.6, 0.27, 0.68], [0.12, 0.6, 0.36]]; const W = 595.28, H = 841.89; const n = titles.length;
  titles.forEach((tt, i) => {
    const p = doc.addPage([W, H]); if (tt === null) return; const c = tints[i % 4];
    p.drawRectangle({ x: 0, y: H - 120, width: W, height: 120, color: rgb(...c) });
    p.drawText(`SAMPLE  ·  PAGE ${i + 1} OF ${n}`, { x: 48, y: H - 50, size: 10, font: bold, color: rgb(1, 1, 1) });
    p.drawText(tt, { x: 48, y: H - 92, size: 26, font: bold, color: rgb(1, 1, 1) });
    const lines = o.lines || NOTES;
    for (let j = 0; j < Math.min(8, lines.length); j++) {
      let line = o.lines ? lines[(j + i) % lines.length] : NOTES[(i * 3 + j) % NOTES.length];
      if (o.variant && i === 1 && j === 2) line = 'Three new burrows near the oak; one is freshly dug.'; if (o.variant && i === 2 && j === 5) continue;
      p.drawText(`${j + 1}.`, { x: 48, y: H - 170 - j * 28, size: 11, font: bold, color: rgb(...c) });
      p.drawText(line, { x: 70, y: H - 170 - j * 28, size: 11, font: reg, color: rgb(0.15, 0.15, 0.15) });
    }
    if (o.table) {
      const rows = [['Item', 'Qty', 'Price', 'Total'], ['Field notebook', '4', '120.00', '480.00'], ['Soil probe', '1', '1,250.00', '1,250.00'], ['Rain gauge', '2', '340.50', '681.00'], ['Trail camera', '1', '5,999.00', '5,999.00']];
      rows.forEach((r, ri) => r.forEach((cell, ci) => p.drawText(cell, { x: 70 + [0, 190, 260, 360][ci], y: 360 - ri * 22, size: 11, font: ri ? reg : bold, color: rgb(0.15, 0.15, 0.15) })));
    } else {
      [3, 5, 4, 7, 6, 8, 5].map(v => v + (i % 3) + (o.variant && i === 3 && v === 7 ? 3 : 0)).forEach((v, k) => p.drawRectangle({ x: 70 + k * 64, y: 160, width: 40, height: v * 26, color: rgb(...c), opacity: 0.3 + k * 0.1 }));
      p.drawLine({ start: { x: 60, y: 158 }, end: { x: W - 60, y: 158 }, thickness: 1, color: rgb(0.3, 0.3, 0.3) });
    }
    p.drawText(`${title}  ·  ${i + 1}`, { x: 48, y: 40, size: 9, font: reg, color: rgb(0.45, 0.45, 0.45) });
  });
  if (o.form) {
    const form = doc.getForm(); const p = doc.getPage(0);
    p.drawText('Observer name', { x: 48, y: 128, size: 10, font: bold, color: rgb(0.2, 0.2, 0.2) }); const tf = form.createTextField('observer'); tf.setText('Priya Sen'); tf.addToPage(p, { x: 150, y: 118, width: 200, height: 22 });
    p.drawText('Site checked', { x: 380, y: 128, size: 10, font: bold, color: rgb(0.2, 0.2, 0.2) }); const cb = form.createCheckBox('checked'); cb.check(); cb.addToPage(p, { x: 460, y: 120, width: 16, height: 16 });
  }
  doc.setTitle(title); doc.setAuthor('Quire sample');
  if (o.lock) doc.encrypt({ userPassword: 'quire', ownerPassword: 'quire-owner' });
  return doc.save();
}
async function sampleImage(i, fmt) {
  const c = document.createElement('canvas'); c.width = 1200; c.height = i ? 1500 : 800; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, c.width, c.height); g.addColorStop(0, i ? '#FFB547' : '#F2601A'); g.addColorStop(1, i ? '#C93C2B' : '#3B1A0C');
  x.fillStyle = g; x.fillRect(0, 0, c.width, c.height); x.fillStyle = 'rgba(255,255,255,.18)'; for (let k = 0; k < 7; k++) { x.beginPath(); x.arc(150 + k * 160, c.height * 0.62 - k * 30, 60 + k * 12, 0, 7); x.fill(); }
  x.fillStyle = '#fff'; x.font = 'bold 64px sans-serif'; x.fillText(`Sample photo ${i + 1}`, 70, 130); x.font = '32px sans-serif'; x.fillText(i ? 'Portrait · 1200 × 1500' : 'Landscape · 1200 × 800', 70, 185);
  let bytes, ext = fmt;
  if (fmt === 'bmp') bytes = canvasToBmp(c);
  else if (fmt === 'tiff') { bytes = tiffEncode([{ w: c.width, h: c.height, rgb: canvasRGB(c) }]); ext = 'tif'; }
  else bytes = await blobBytes(await canvasBlob(c, fmt === 'png' ? 'image/png' : 'image/jpeg', 0.9));
  return new File([bytes], `sample-photo-${i + 1}.${ext}`, { type: MIME[ext] || 'image/jpeg' });
}
async function sampleDocx() {
  const x = s => esc(s); const z = new JSZip();
  z.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  z.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  const p = (t, o = {}) => `<w:p>${o.center ? '<w:pPr><w:jc w:val="center"/><w:spacing w:after="160"/></w:pPr>' : '<w:pPr><w:spacing w:after="160"/></w:pPr>'}<w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>${o.b ? '<w:b/>' : ''}<w:sz w:val="${o.sz || 22}"/>${o.color ? `<w:color w:val="${o.color}"/>` : ''}</w:rPr><w:t xml:space="preserve">${x(t)}</w:t></w:r></w:p>`;
  const cell = (t, b) => `<w:tc><w:tcPr><w:tcW w:w="2250" w:type="dxa"/></w:tcPr>${p(t, { b })}</w:tc>`;
  const rows = [['Item', 'Qty', 'Price', 'Total'], ['Field notebook', '4', '120.00', '480.00'], ['Soil probe', '1', '1,250.00', '1,250.00'], ['Rain gauge', '2', '340.50', '681.00']];
  const table = `<w:tbl><w:tblPr><w:tblW w:w="9000" w:type="dxa"/><w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(s => `<w:${s} w:val="single" w:sz="4" w:color="D9C2B4"/>`).join('')}</w:tblBorders></w:tblPr>${rows.map((r, i) => `<w:tr>${r.map(c => cell(c, !i)).join('')}</w:tr>`).join('')}</w:tbl>`;
  const body = p('Field survey report', { b: true, sz: 44, color: 'F2601A' }) + p('Prepared for the east meadow restoration project · Sample document', { sz: 20, color: '6F635B' }) + p('Summary', { b: true, sz: 30 }) + NOTES.slice(0, 4).map(n => p(n)).join('') + p('Equipment', { b: true, sz: 30 }) + table + p('') + p('Next steps', { b: true, sz: 30 }) + NOTES.slice(4).map(n => p('• ' + n)).join('');
  z.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`);
  return new File([await z.generateAsync({ type: 'uint8array' })], 'sample-report.docx', { type: MIME.docx });
}
function sampleXlsx() {
  const rows = [['Month', 'Region', 'Orders', 'Revenue (₹)', 'Returns'], ...['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].flatMap((m, i) => ['North', 'East', 'South', 'West'].map((r, k) => [m, r, 120 + ((i * 37 + k * 53) % 90), 45000 + ((i * 7919 + k * 3571) % 38000), (i + k) % 6]))];
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Sales 2026');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Region', 'Manager', 'Target'], ['North', 'A. Rao', 1800000], ['East', 'S. Banerjee', 1650000], ['South', 'K. Iyer', 1700000], ['West', 'M. Shah', 1750000]]), 'Targets');
  return new File([XLSX.write(wb, { type: 'array', bookType: 'xlsx' })], 'sample-sales.xlsx', { type: MIME.xlsx });
}
const SAMPLE_HTML = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Georgia,serif;margin:40px;color:#222}h1{color:#F2601A;font-family:Arial,sans-serif}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:8px;text-align:left}th{background:#FFF1E8}.note{background:#FFF7F2;border-left:4px solid #F2601A;padding:12px 16px}</style></head><body><h1>Monthly newsletter</h1><p>Welcome to the October edition. Here is what happened across the project this month.</p><div class="note">Site visits are now on Tuesdays and Thursdays.</div><h2>Highlights</h2><ul><li>Two new volunteers joined the survey team.</li><li>Rainfall was 18% above the monthly average.</li><li>The new trail cameras captured 214 clips.</li></ul><h2>Numbers</h2><table><tr><th>Measure</th><th>September</th><th>October</th></tr><tr><td>Visits</td><td>12</td><td>15</td></tr><tr><td>Species recorded</td><td>41</td><td>47</td></tr><tr><td>Volunteer hours</td><td>96</td><td>128</td></tr></table>${'<p>' + NOTES.join(' ') + '</p>'.repeat(1)}</body></html>`;
const SAMPLE_TEXT = `Field notes – east meadow\n\n${NOTES.join('\n')}\n\nNext visit: Tuesday, 8:00.\nBring: rain gauge, notebook, soil probe.`;
const SAMPLE_RTF = `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Calibri;}}{\\colortbl;\\red242\\green96\\blue26;}\\f0\\fs22{\\b\\fs36\\cf1 Field notes\\par}\\par ${NOTES.slice(0, 5).map(n => n.replace(/[’]/g, "\\'92").replace(/°/g, "\\'b0")).join('\\par ')}\\par\\par Next visit: Tuesday, 8:00.\\par}`;

/* ================= engines ================= */
const LANGS = [['auto', 'Detect automatically'], ['en', 'English'], ['hi', 'Hindi'], ['bn', 'Bengali'], ['ar', 'Arabic'], ['es', 'Spanish'], ['fr', 'French'], ['de', 'German'], ['pt', 'Portuguese'], ['it', 'Italian'], ['ru', 'Russian'], ['zh', 'Chinese (Simplified)'], ['ja', 'Japanese'], ['ko', 'Korean'], ['ur', 'Urdu'], ['ta', 'Tamil'], ['te', 'Telugu'], ['mr', 'Marathi'], ['gu', 'Gujarati'], ['nl', 'Dutch'], ['tr', 'Turkish']];
const RTL = new Set(['ar', 'ur', 'he', 'fa']);
const OCR_LANGS = [['eng', 'English'], ['hin', 'Hindi'], ['ben', 'Bengali'], ['tam', 'Tamil'], ['tel', 'Telugu'], ['mar', 'Marathi'], ['urd', 'Urdu'], ['ara', 'Arabic'], ['fra', 'French'], ['deu', 'German'], ['spa', 'Spanish'], ['por', 'Portuguese'], ['chi_sim', 'Chinese (Simplified)']];
const PDF_IN = { accept: 'pdf' };
const rotSel = (o, i, n) => { if (o.which === 'odd') return i % 2 === 0; if (o.which === 'even') return i % 2 === 1; if (o.which === 'list') { try { return parseRanges(o.list, n).some(g => g.idx.includes(i)); } catch (e) { return false; } } return true; };
function numText(o, i, total) { const st = +o.start || 0; const n = st + i - (o.skip ? 1 : 0); const last = st + total - 1 - (o.skip ? 1 : 0); return { n: `${n}`, page: `Page ${n}`, of: `${n} / ${last}`, pageof: `Page ${n} of ${last}` }[o.fmt]; }
function stampHtml(text, pos, size, w, h, color) { const m = 28; const v = pos[0] === 'b' ? `bottom:${m / h * 100}%` : `top:${m / h * 100}%`; const hz = pos[1] === 'c' ? 'left:50%;transform:translateX(-50%)' : pos[1] === 'r' ? `right:${m / w * 100}%` : `left:${m / w * 100}%`; return `<span class="stamp" style="${v};${hz};font-size:calc(${size} * 100cqw / ${w});color:${color}">${esc(text)}</span>`; }
function drawStamp(p, font, text, pos, size, color) { const tw = latinCheck(font, text, size); const b = p.getMediaBox(); const m = 28; const x = b.x + (pos[1] === 'c' ? (b.width - tw) / 2 : pos[1] === 'r' ? b.width - m - tw : m); const y = b.y + (pos[0] === 'b' ? m : b.height - m - size * 0.75); p.drawText(text, { x, y, size, font, color }); }
const rotOrigin = (cx, cy, w, h, th) => [cx - (w / 2) * Math.cos(th) + (h / 2) * Math.sin(th), cy - (w / 2) * Math.sin(th) - (h / 2) * Math.cos(th)];
const BLANK_T = { strict: 0.0006, normal: 0.004, loose: 0.012 };
function blankSet(f) { const s = new Set(); if (!f || !f.ink) return s; const t = BLANK_T[state.opts.level]; for (let i = 0; i < f.pages; i++) { const auto = f.ink[i] != null && f.ink[i] < t; const o = state.blankOverride[i]; if (o === true || (o == null && auto)) s.add(i); } return s; }
async function api(pathName, body) {
  if (!Q.api) throw new Error('This tool isn’t switched on yet: the site owner still needs to connect its translation and AI service.');
  let r; try { r = await fetch(Q.api.replace(/\/$/, '') + pathName, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); }
  catch (e) { throw new Error('Couldn’t reach the translation and AI service. Check your internet connection and try again.'); }
  let j = null; try { j = await r.json(); } catch (e) {}
  if (!r.ok) throw new Error((j && j.error) || `The service returned an error (${r.status}). Try again in a minute.`);
  return j;
}
const pageOpts = [{ k: 'paper', label: 'Paper', type: 'seg', def: 'a4', choices: [['a4', 'A4'], ['letter', 'Letter'], ['legal', 'Legal']] }, { k: 'orient', label: 'Orientation', type: 'seg', def: 'portrait', choices: [['portrait', 'Portrait'], ['landscape', 'Landscape']] }];

const E = {};

/* ---------- organize ---------- */
E.merge = { accept: 'pdf', multi: true, min: 2, view: 'files', verb: 'Merge files', sample: 'pair', opts: [], empty: 'Drag the files into order. The first file’s pages come first.',
  async run({ files, progress }) {
    const out = await PDFDocument.create();
    for (let i = 0; i < files.length; i++) { progress(`Adding file ${i + 1} of ${files.length}`, i / files.length); const src = await loadLib(files[i]); (await out.copyPages(src, src.getPageIndices())).forEach(p => out.addPage(p)); }
    return { files: [{ name: baseName(files[0].name) + '-merged.pdf', bytes: await out.save() }], note: `${plural(files.length, 'file')} joined into ${plural(out.getPageCount(), 'page')}.` };
  } };
E.split = { accept: 'pdf', view: 'pick', verb: 'Split file',
  opts: [{ k: 'mode', label: 'Output', type: 'seg', def: 'ranges', choices: [['ranges', 'File per range'], ['one', 'One file'], ['each', 'Every page']] },
    { k: 'ranges', label: 'Pages', type: 'text', def: '1-2, 3-', ph: 'e.g. 1-3, 5, 8-', hint: 'Click pages to pick them. “8-” means page 8 to the end.', hideWhen: o => o.mode === 'each' }],
  async run({ files, opts, progress }) {
    const f = files[0]; const src = await loadLib(f); const n = src.getPageCount(); const b = baseName(f.name); const outs = [];
    const groups = opts.mode === 'each' ? Array.from({ length: n }, (_, i) => ({ idx: [i] })) : parseRanges(opts.ranges, n);
    if (opts.mode === 'one') { const out = await PDFDocument.create(); (await out.copyPages(src, groups.flatMap(g => g.idx))).forEach(p => out.addPage(p)); outs.push({ name: `${b}-extract.pdf`, bytes: await out.save() }); }
    else for (let i = 0; i < groups.length; i++) {
      progress(`Making file ${i + 1} of ${groups.length}`, i / groups.length); const out = await PDFDocument.create(); const g = groups[i];
      (await out.copyPages(src, g.idx)).forEach(p => out.addPage(p));
      outs.push({ name: `${b}-${g.idx.length === 1 ? 'page-' + pad(g.idx[0] + 1, String(n).length) : `pages-${g.idx[0] + 1}-${g.idx[g.idx.length - 1] + 1}`}.pdf`, bytes: await out.save() });
    }
    return { files: outs, note: `${plural(outs.length, 'file')} made from ${plural(n, 'page')}.` };
  } };
E.organize = { accept: 'pdf', view: 'organize', verb: 'Save new order', opts: [],
  async run({ files, pages }) {
    if (!pages.length) throw new Error('Every page has been deleted. Use “Restore original” to start again.');
    const f = files[0]; const src = await loadLib(f); const out = await PDFDocument.create(); const fs0 = src.getPage(0).getSize();
    for (const p of pages) {
      if (p.src < 0) { const pg = out.addPage([fs0.width, fs0.height]); if (p.rot) pg.setRotation(degrees(p.rot)); continue; }
      const [pg] = await out.copyPages(src, [p.src]); if (p.rot) pg.setRotation(degrees((pg.getRotation().angle + p.rot) % 360)); out.addPage(pg);
    }
    return { files: [{ name: baseName(f.name) + '-organized.pdf', bytes: await out.save() }], note: `${plural(pages.length, 'page')} in the new order.` };
  } };
E.blank = { accept: 'pdf', view: 'pick', verb: 'Remove pages', sample: 'blank',
  opts: [{ k: 'level', label: 'Counts as blank', type: 'seg', def: 'normal', choices: [['strict', 'Fully empty'], ['normal', 'Almost empty'], ['loose', 'Faint marks']], hint: '“Faint marks” also catches scanner dust and stray lines.' }],
  async run({ files }) {
    const f = files[0]; const drop = blankSet(f);
    if (!drop.size) throw new Error('No pages are marked. Click a page to mark it, or choose a looser setting.');
    if (drop.size === f.pages) throw new Error('Every page is marked. Click the pages you want to keep.');
    const src = await loadLib(f); const out = await PDFDocument.create(); const keep = src.getPageIndices().filter(i => !drop.has(i));
    (await out.copyPages(src, keep)).forEach(p => out.addPage(p));
    return { files: [{ name: baseName(f.name) + '-no-blanks.pdf', bytes: await out.save() }], note: `Removed ${plural(drop.size, 'blank page')} (${runs([...drop].sort((a, b) => a - b).map(i => i + 1))}). ${plural(keep.length, 'page')} kept.` };
  } };
E.rotate = { accept: 'pdf', view: 'pages', verb: 'Rotate pages',
  opts: [{ k: 'angle', label: 'Turn', type: 'seg', def: '90', choices: [['90', '↻ 90°'], ['180', '180°'], ['270', '↺ 90°']] }, { k: 'which', label: 'Pages', type: 'seg', def: 'all', choices: [['all', 'All'], ['odd', 'Odd'], ['even', 'Even'], ['list', 'Listed']] }, { k: 'list', label: 'Page list', type: 'text', def: '1', ph: 'e.g. 2, 5-7', hideWhen: o => o.which !== 'list' }],
  preview: (o, i, f) => rotSel(o, i, f.pages) ? { sheet: `transform:rotate(${o.angle}deg)${o.angle !== '180' ? ' scale(.74)' : ''}` } : null,
  async run({ files, opts }) {
    const doc = await loadLib(files[0]); let n = 0;
    doc.getPages().forEach((p, i) => { if (rotSel(opts, i, doc.getPageCount())) { p.setRotation(degrees((p.getRotation().angle + +opts.angle) % 360)); n++; } });
    if (!n) throw new Error('No pages match that choice.');
    return { files: [{ name: baseName(files[0].name) + '-rotated.pdf', bytes: await doc.save() }], note: `${plural(n, 'page')} turned ${opts.angle === '270' ? '90° anticlockwise' : opts.angle + '° clockwise'}.` };
  } };
E.compress = { accept: 'pdf', view: 'pages', verb: 'Compress file', caveat: 'Text becomes part of the page image, so it can’t be selected afterwards. Best for scans and photo-heavy files.',
  opts: [{ k: 'level', label: 'Strength', type: 'seg', def: 'medium', choices: [['light', 'Light'], ['medium', 'Medium'], ['strong', 'Strong']], hint: 'Light keeps the most detail. Strong gives the smallest file.' }],
  async run({ files, opts, progress }) {
    const L = { light: [150, 0.78], medium: [110, 0.62], strong: [80, 0.45] }[opts.level]; const f = files[0]; const out = await PDFDocument.create();
    for (let i = 1; i <= f.pages; i++) { progress(`Redrawing page ${i} of ${f.pages}`, (i - 1) / f.pages); const r = await rasterPage(f.view, i, L[0], L[1]); const img = await out.embedJpg(r.bytes); out.addPage([r.w, r.h]).drawImage(img, { x: 0, y: 0, width: r.w, height: r.h }); }
    const bytes = await out.save({ useObjectStreams: true }); const diff = 1 - bytes.length / f.size;
    return { files: [{ name: baseName(f.name) + '-compressed.pdf', bytes }], note: diff > 0.02 ? `${fmtSize(f.size)} → ${fmtSize(bytes.length)}, ${Math.round(diff * 100)}% smaller.` : `The result is ${fmtSize(bytes.length)}, no smaller than the original ${fmtSize(f.size)}. This file is already compact, so keep the original.` };
  } };
E.crop = { accept: 'pdf', view: 'pages', verb: 'Crop pages',
  opts: ['top', 'bottom', 'left', 'right'].map(k => ({ k, label: `${k[0].toUpperCase() + k.slice(1)} (mm)`, type: 'number', def: 12, min: 0, max: 200, half: true })),
  preview: (o, i, f, w, h) => { const t = (+o.top || 0) * MM / h * 100, b = (+o.bottom || 0) * MM / h * 100, l = (+o.left || 0) * MM / w * 100, r = (+o.right || 0) * MM / w * 100; return { ov: `<i class="cropshade" style="left:0;right:0;top:0;height:${t}%"></i><i class="cropshade" style="left:0;right:0;bottom:0;height:${b}%"></i><i class="cropshade" style="left:0;top:${t}%;bottom:${b}%;width:${l}%"></i><i class="cropshade" style="right:0;top:${t}%;bottom:${b}%;width:${r}%"></i>` }; },
  async run({ files, opts }) {
    const doc = await loadLib(files[0]); const [t, b, l, r] = ['top', 'bottom', 'left', 'right'].map(k => Math.max(0, +opts[k] || 0) * MM);
    doc.getPages().forEach((p, i) => { const box = p.getMediaBox(); const w = box.width - l - r, h = box.height - t - b; if (w < 20 || h < 20) throw new Error(`Those margins leave nothing of page ${i + 1}. Use smaller numbers.`); p.setCropBox(box.x + l, box.y + b, w, h); });
    return { files: [{ name: baseName(files[0].name) + '-cropped.pdf', bytes: await doc.save() }], note: `${plural(doc.getPageCount(), 'page')} trimmed.` };
  } };
E.resize = { accept: 'pdf', view: 'pages', verb: 'Resize pages',
  opts: [{ k: 'size', label: 'Paper', type: 'select', def: 'a4', choices: [['a4', 'A4 (210 × 297 mm)'], ['letter', 'US Letter (8.5 × 11 in)'], ['legal', 'US Legal (8.5 × 14 in)'], ['a5', 'A5 (148 × 210 mm)'], ['a3', 'A3 (297 × 420 mm)']] }, { k: 'margin', label: 'Margin', type: 'seg', def: '0', choices: [['0', 'None'], ['18', 'Small'], ['36', 'Large']] }],
  async run({ files, opts, progress }) {
    const src = await loadLib(files[0]); const out = await PDFDocument.create(); const m = +opts.margin; const pages = src.getPages(); const emb = await out.embedPages(pages);
    pages.forEach((p, i) => { progress(`Fitting page ${i + 1}`, i / pages.length); const { width: sw, height: sh } = p.getSize(); let [tw, th] = PAPER[opts.size]; if (sw > sh) [tw, th] = [th, tw]; const s = Math.min((tw - 2 * m) / sw, (th - 2 * m) / sh); const np = out.addPage([tw, th]); np.drawPage(emb[i], { x: (tw - sw * s) / 2, y: (th - sh * s) / 2, xScale: s, yScale: s }); const rot = p.getRotation().angle; if (rot) np.setRotation(degrees(rot)); });
    return { files: [{ name: `${baseName(files[0].name)}-${opts.size}.pdf`, bytes: await out.save() }], note: `${plural(pages.length, 'page')} fitted to ${{ a4: 'A4', letter: 'Letter', legal: 'Legal', a5: 'A5', a3: 'A3' }[opts.size]}.` };
  } };
E.nup = { accept: 'pdf', view: 'pages', verb: 'Arrange pages',
  opts: [{ k: 'per', label: 'Pages per sheet', type: 'seg', def: '2', choices: [['2', '2'], ['4', '4'], ['6', '6']] }, { k: 'paper', label: 'Paper', type: 'seg', def: 'a4', choices: [['a4', 'A4'], ['letter', 'Letter']] }, { k: 'border', label: 'Draw a thin border around each page', type: 'check', def: true }],
  async run({ files, opts }) {
    const src = await loadLib(files[0]); const out = await PDFDocument.create(); const per = +opts.per; const [cols, rows] = { 2: [2, 1], 4: [2, 2], 6: [2, 3] }[per];
    let [W, H] = PAPER[opts.paper]; if (per === 2) [W, H] = [H, W]; const m = 22, gap = 12; const cw = (W - 2 * m - gap * (cols - 1)) / cols, ch = (H - 2 * m - gap * (rows - 1)) / rows;
    const pages = src.getPages(); const emb = await out.embedPages(pages);
    for (let s = 0; s < pages.length; s += per) { const sheet = out.addPage([W, H]); for (let k = 0; k < per && s + k < pages.length; k++) { const e = emb[s + k]; const c = k % cols, r = Math.floor(k / cols); const sc = Math.min(cw / e.width, ch / e.height); const w = e.width * sc, h = e.height * sc; const x = m + c * (cw + gap) + (cw - w) / 2; const y = H - m - (r + 1) * ch - r * gap + (ch - h) / 2; sheet.drawPage(e, { x, y, xScale: sc, yScale: sc }); if (opts.border) sheet.drawRectangle({ x, y, width: w, height: h, borderColor: rgb(0.6, 0.6, 0.6), borderWidth: 0.6 }); } }
    return { files: [{ name: `${baseName(files[0].name)}-${per}-up.pdf`, bytes: await out.save() }], note: `${plural(pages.length, 'page')} on ${plural(out.getPageCount(), 'sheet')}.` };
  } };

/* ---------- edit ---------- */
E.numbers = { accept: 'pdf', view: 'pages', verb: 'Add numbers',
  opts: [{ k: 'pos', label: 'Position', type: 'select', def: 'bc', choices: [['bc', 'Bottom centre'], ['br', 'Bottom right'], ['bl', 'Bottom left'], ['tc', 'Top centre'], ['tr', 'Top right'], ['tl', 'Top left']] }, { k: 'fmt', label: 'Format', type: 'select', def: 'n', choices: [['n', '7'], ['page', 'Page 7'], ['of', '7 / 12'], ['pageof', 'Page 7 of 12']] }, { k: 'start', label: 'First number', type: 'number', def: 1, min: 0, max: 9999, half: true }, { k: 'size', label: 'Size (pt)', type: 'number', def: 10, min: 6, max: 36, half: true }, { k: 'skip', label: 'Leave the first page unnumbered', type: 'check', def: false }],
  preview: (o, i, f, w, h) => (o.skip && i === 0) ? null : { ov: stampHtml(numText(o, i, f.pages), o.pos, +o.size || 10, w, h, '#262626') },
  async run({ files, opts }) {
    const doc = await loadLib(files[0]); const font = await doc.embedFont(StandardFonts.Helvetica); const size = +opts.size || 10; let n = 0;
    doc.getPages().forEach((p, i) => { if (opts.skip && i === 0) return; drawStamp(p, font, numText(opts, i, doc.getPageCount()), opts.pos, size, rgb(0.15, 0.15, 0.15)); n++; });
    return { files: [{ name: baseName(files[0].name) + '-numbered.pdf', bytes: await doc.save() }], note: `${plural(n, 'page')} numbered.` };
  } };
E.headerfooter = { accept: 'pdf', view: 'pages', verb: 'Add header & footer',
  opts: [{ k: 'header', label: 'Header', type: 'text', def: '{file}', ph: 'Leave empty for none' }, { k: 'footer', label: 'Footer', type: 'text', def: 'Confidential · {date} · {page} of {total}', ph: 'Leave empty for none' }, { k: 'align', label: 'Alignment', type: 'seg', def: 'c', choices: [['l', 'Left'], ['c', 'Centre'], ['r', 'Right']] }, { k: 'size', label: 'Size (pt)', type: 'number', def: 9, min: 6, max: 24, half: true }, { k: 'color', label: 'Colour', type: 'select', def: 'grey', choices: [['grey', 'Grey'], ['black', 'Black'], ['blue', 'Blue'], ['red', 'Red']], half: true }, { k: 'skip', label: 'Leave the first page plain', type: 'check', def: false }],
  preview: (o, i, f, w, h) => { if (o.skip && i === 0) return null; const nm = f.name.replace(/\.pdf$/i, ''); const s = +o.size || 9; const c = cssColor(o.color); return { ov: (o.header ? stampHtml(fillTokens(o.header, i + 1, f.pages, nm), 't' + o.align, s, w, h, c) : '') + (o.footer ? stampHtml(fillTokens(o.footer, i + 1, f.pages, nm), 'b' + o.align, s, w, h, c) : '') }; },
  async run({ files, opts }) {
    if (!opts.header.trim() && !opts.footer.trim()) throw new Error('Type a header, a footer, or both.');
    const doc = await loadLib(files[0]); const font = await doc.embedFont(StandardFonts.Helvetica); const s = +opts.size || 9; const col = rgb(...(COLORS[opts.color] || COLORS.grey)); const nm = files[0].name.replace(/\.pdf$/i, ''); const total = doc.getPageCount(); let n = 0;
    doc.getPages().forEach((p, i) => { if (opts.skip && i === 0) return; if (opts.header.trim()) drawStamp(p, font, fillTokens(opts.header, i + 1, total, nm), 't' + opts.align, s, col); if (opts.footer.trim()) drawStamp(p, font, fillTokens(opts.footer, i + 1, total, nm), 'b' + opts.align, s, col); n++; });
    return { files: [{ name: baseName(files[0].name) + '-stamped.pdf', bytes: await doc.save() }], note: `Header and footer added to ${plural(n, 'page')}.` };
  } };
E.watermark = { accept: 'pdf', view: 'pages', verb: 'Add watermark',
  opts: [{ k: 'kind', label: 'Watermark', type: 'seg', def: 'text', choices: [['text', 'Text'], ['image', 'Image']] }, { k: 'text', label: 'Text', type: 'text', def: 'DRAFT', hideWhen: o => o.kind !== 'text' }, { k: 'image', label: 'Image', type: 'image', hideWhen: o => o.kind !== 'image' }, { k: 'layout', label: 'Layout', type: 'seg', def: 'single', choices: [['single', 'Once, centred'], ['tile', 'Tiled']] }, { k: 'angle', label: 'Direction', type: 'seg', def: '45', choices: [['45', 'Diagonal'], ['0', 'Straight']] }, { k: 'color', label: 'Colour', type: 'seg', def: 'grey', choices: [['grey', 'Grey'], ['red', 'Red'], ['blue', 'Blue'], ['orange', 'Orange']], hideWhen: o => o.kind !== 'text' }, { k: 'size', label: 'Size', type: 'range', def: 60, min: 10, max: 140, step: 2, unit: ' pt', hideWhen: o => o.kind !== 'text' }, { k: 'scale', label: 'Width', type: 'range', def: 40, min: 10, max: 90, step: 5, unit: '%', hideWhen: o => o.kind !== 'image' }, { k: 'opacity', label: 'Opacity', type: 'range', def: 25, min: 5, max: 90, step: 5, unit: '%' }],
  preview: (o, i, f, w) => {
    const op = o.opacity / 100, rot = -o.angle;
    if (o.kind === 'image') { if (!state.wmImage) return null; return o.layout === 'tile' ? { ov: `<div class="wm-tile" style="transform:rotate(${rot}deg);gap:6% 8%;opacity:${op}">${Array.from({ length: 30 }, () => `<img src="${state.wmImage.url}" style="width:${o.scale * 0.45}cqw" alt="">`).join('')}</div>` } : { ov: `<img class="wm-img" src="${state.wmImage.url}" alt="" style="width:${o.scale}%;opacity:${op};transform:translate(-50%,-50%) rotate(${rot}deg)">` }; }
    const t = esc(o.text || ''); const fs = `calc(${o.size} * 100cqw / ${w})`; const c = cssColor(o.color);
    return o.layout === 'tile' ? { ov: `<div class="wm-tile" style="transform:rotate(${rot}deg);font-size:${fs};color:${c};opacity:${op};gap:2.4em 1.6em">${Array.from({ length: 40 }, () => `<span>${t}</span>`).join('')}</div>` } : { ov: `<div class="wm" style="font-size:${fs};color:${c};opacity:${op};transform:translate(-50%,-50%) rotate(${rot}deg)">${t}</div>` };
  },
  async run({ files, opts }) {
    const doc = await loadLib(files[0]); const op = opts.opacity / 100; const th = (+opts.angle) * Math.PI / 180; let draw;
    if (opts.kind === 'image') {
      if (!state.wmImage) throw new Error('Choose an image for the watermark first.');
      const img = state.wmImage.mime === 'image/png' ? await doc.embedPng(state.wmImage.bytes) : await doc.embedJpg(state.wmImage.bytes);
      draw = (p, cx, cy, W) => { const w = W * opts.scale / 100 * (opts.layout === 'tile' ? 0.45 : 1); const h = w * img.height / img.width; if (cx > -9000) { const [x, y] = rotOrigin(cx, cy, w, h, th); p.drawImage(img, { x, y, width: w, height: h, opacity: op, rotate: degrees(+opts.angle) }); } return [w, h]; };
    } else {
      const text = (opts.text || '').trim(); if (!text) throw new Error('Type the watermark text first.');
      const font = await doc.embedFont(StandardFonts.HelveticaBold); const size = +opts.size; const w = latinCheck(font, text, size); const h = size * 0.72; const color = rgb(...(COLORS[opts.color] || COLORS.grey));
      draw = (p, cx, cy) => { if (cx > -9000) { const [x, y] = rotOrigin(cx, cy, w, h, th); p.drawText(text, { x, y, size, font, color, opacity: op, rotate: degrees(+opts.angle) }); } return [w, h]; };
    }
    doc.getPages().forEach(p => {
      const b = p.getMediaBox(); const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
      if (opts.layout !== 'tile') { draw(p, cx, cy, b.width); return; }
      const [w, h] = draw(p, -9999, -9999, b.width); const sx = w * 1.5 + 40, sy = h * 3.2 + 40; const R = Math.hypot(b.width, b.height);
      for (let gy = -R; gy <= R; gy += sy) for (let gx = -R; gx <= R; gx += sx) { const off = (Math.abs(Math.round(gy / sy)) % 2) * sx / 2; const x = cx + (gx + off) * Math.cos(th) - gy * Math.sin(th), y = cy + (gx + off) * Math.sin(th) + gy * Math.cos(th); if (x > b.x - w && x < b.x + b.width + w && y > b.y - w && y < b.y + b.height + w) draw(p, x, y, b.width); }
    });
    return { files: [{ name: baseName(files[0].name) + '-watermarked.pdf', bytes: await doc.save() }], note: `Watermark added to ${plural(doc.getPageCount(), 'page')}.` };
  } };
E.grayscale = { accept: 'pdf', view: 'pages', verb: 'Convert to grey', caveat: 'Pages are redrawn as images, so text can’t be selected afterwards.',
  opts: [{ k: 'dpi', label: 'Quality', type: 'seg', def: '150', choices: [['110', 'Draft'], ['150', 'Standard'], ['220', 'Print']] }], preview: () => ({ img: 'filter:grayscale(1)' }),
  async run({ files, opts, progress }) {
    const f = files[0]; const out = await PDFDocument.create();
    for (let i = 1; i <= f.pages; i++) { progress(`Converting page ${i} of ${f.pages}`, (i - 1) / f.pages); const r = await rasterPage(f.view, i, +opts.dpi, 0.82, toGray); const img = await out.embedJpg(r.bytes); out.addPage([r.w, r.h]).drawImage(img, { x: 0, y: 0, width: r.w, height: r.h }); }
    return { files: [{ name: baseName(f.name) + '-grayscale.pdf', bytes: await out.save({ useObjectStreams: true }) }], note: `${plural(f.pages, 'page')} converted to grey.` };
  } };
E.info = { accept: 'pdf', view: 'pages', verb: 'Save info',
  opts: [{ k: 'title', label: 'Title', type: 'text', def: '' }, { k: 'author', label: 'Author', type: 'text', def: '' }, { k: 'subject', label: 'Subject', type: 'text', def: '' }, { k: 'keywords', label: 'Keywords', type: 'text', def: '', hint: 'Separate keywords with commas.' }],
  async onFile(item, opts) {
    try {
      const md = await item.view.getMetadata(); const inf = md.info || {}; opts.title = inf.Title || ''; opts.author = inf.Author || ''; opts.subject = inf.Subject || ''; opts.keywords = inf.Keywords || '';
      const s = item.sizes[0] || [0, 0]; const dt = pdfjsLib.PDFDateString ? pdfjsLib.PDFDateString.toDateObject(inf.CreationDate) : null; const pn = paperName(s[0], s[1]);
      state.facts = [['Pages', item.pages], ['File size', fmtSize(item.size)], ['First page', `${Math.round(s[0] / MM)} × ${Math.round(s[1] / MM)} mm${pn ? ' (' + pn + ')' : ''}`], ['PDF version', inf.PDFFormatVersion || '—'], ['Made with', inf.Creator || '—'], ['Producer', inf.Producer || '—'], ['Created', dt ? dt.toLocaleString() : '—'], ['Form fields', inf.IsAcroFormPresent ? 'Yes' : 'No']];
    } catch (e) { state.facts = null; }
  },
  async run({ files, opts }) {
    const doc = await loadLib(files[0]); doc.setTitle(opts.title || ''); doc.setAuthor(opts.author || ''); doc.setSubject(opts.subject || ''); doc.setKeywords(String(opts.keywords || '').split(',').map(s => s.trim()).filter(Boolean)); doc.setModificationDate(new Date());
    return { files: [{ name: baseName(files[0].name) + '.pdf', bytes: await doc.save() }], note: 'Title, author, subject and keywords saved.' };
  } };
E.flatten = { accept: 'pdf', view: 'pages', verb: 'Flatten form', sample: 'form', opts: [], empty: 'No settings. Every form field becomes fixed text on the page.',
  async run({ files }) { const doc = await loadLib(files[0]); const form = doc.getForm(); const n = form.getFields().length; if (!n) throw new Error('This PDF has no fillable form fields to flatten.'); form.flatten(); return { files: [{ name: baseName(files[0].name) + '-flattened.pdf', bytes: await doc.save() }], note: `${plural(n, 'form field')} turned into page content.` }; } };

/* ---------- sign & protect ---------- */
E.sign = { accept: 'pdf', view: 'editor', verb: 'Save signed PDF', opts: [],
  async run({ files }) {
    const f = files[0]; const doc = await loadLib(f); const font = await doc.embedFont(StandardFonts.Helvetica); let count = 0; const cache = new Map();
    for (const [k, list] of Object.entries(state.marks)) {
      if (!list.length) continue; const i = +k; const page = doc.getPage(i); const vp = (await f.view.getPage(i + 1)).getViewport({ scale: 1 });
      for (const m of list) {
        const left = m.x * vp.width, top = m.y * vp.height, w = m.w * vp.width, h = m.h * vp.height; const P = vp.convertToPdfPoint(left, top + h), Qp = vp.convertToPdfPoint(left + 10, top + h); const th = Math.atan2(Qp[1] - P[1], Qp[0] - P[0]);
        if (m.type === 'sig') { let img = cache.get(m.src); if (!img) { img = await doc.embedPng(dataUrlBytes(m.src)); cache.set(m.src, img); } page.drawImage(img, { x: P[0], y: P[1], width: w, height: h, rotate: degrees(th * 180 / Math.PI) }); }
        else { const size = h * 0.74; latinCheck(font, m.text, size); const up = h * 0.2; page.drawText(m.text, { x: P[0] - up * Math.sin(th), y: P[1] + up * Math.cos(th), size, font, color: rgb(0.07, 0.07, 0.09), rotate: degrees(th * 180 / Math.PI) }); }
        count++;
      }
    }
    if (!count) throw new Error('Nothing is placed yet. Add your signature, text or a date to a page first.');
    return { files: [{ name: baseName(f.name) + '-signed.pdf', bytes: await doc.save() }], note: `${plural(count, 'item')} placed on the pages.` };
  } };
E.protect = { accept: 'pdf', view: 'pages', verb: 'Lock with password',
  opts: [{ k: 'pw', label: 'Password', type: 'password', def: '' }, { k: 'pw2', label: 'Type it again', type: 'password', def: '' }, { k: 'print', label: 'Allow printing', type: 'check', def: true }, { k: 'copy', label: 'Allow copying text and images', type: 'check', def: false }, { k: 'edit', label: 'Allow editing and page changes', type: 'check', def: false }, { k: 'owner', label: 'Permissions password (optional)', type: 'password', def: '', hint: 'Lets you change the permissions later. If empty, a random one is used.' }],
  async run({ files, opts }) {
    if (!opts.pw) throw new Error('Choose a password.'); if (opts.pw.length < 4) throw new Error('Use a password of at least 4 characters.'); if (opts.pw !== opts.pw2) throw new Error('The two passwords don’t match.');
    const doc = await loadLib(files[0]); const owner = opts.owner || Array.from(crypto.getRandomValues(new Uint8Array(18)), b => b.toString(36)).join('');
    doc.encrypt({ userPassword: opts.pw, ownerPassword: owner, permissions: { printing: opts.print ? 'highResolution' : false, copying: !!opts.copy, contentAccessibility: true, modifying: !!opts.edit, annotating: !!opts.edit, fillingForms: true, documentAssembly: !!opts.edit } });
    return { files: [{ name: baseName(files[0].name) + '-protected.pdf', bytes: await doc.save(), noPreview: true }], note: 'Locked with AES-256. Keep the password safe: it can’t be recovered.' };
  } };
E.unlock = { accept: 'pdf', view: 'pages', verb: 'Remove password', sample: 'locked', allowLocked: true,
  opts: [{ k: 'pw', label: 'Current password', type: 'password', def: '', hint: 'Leave empty if the file opens without one and only blocks printing or copying.' }],
  async run({ files, opts }) {
    const f = files[0]; let dec; try { dec = await PDFDocument.load(f.bytes, { password: opts.pw || '' }); } catch (e) { throw new Error(opts.pw ? 'That password didn’t work. Check it and try again.' : 'This file needs its password. Type it in Settings.'); }
    const out = await PDFDocument.create(); (await out.copyPages(dec, dec.getPageIndices())).forEach(p => out.addPage(p));
    return { files: [{ name: baseName(f.name) + '-unlocked.pdf', bytes: await out.save() }], note: `Password removed from ${plural(out.getPageCount(), 'page')}.` };
  } };
E.redact = { accept: 'pdf', view: 'editor', verb: 'Apply redactions', caveat: 'Pages with boxes are redrawn as images with the boxes burned in, so the hidden text can’t be copied back out. Other pages stay as they are.',
  opts: [{ k: 'fill', label: 'Box colour', type: 'seg', def: 'black', choices: [['black', 'Black'], ['white', 'White']] }, { k: 'dpi', label: 'Quality of redacted pages', type: 'seg', def: '150', choices: [['110', 'Smaller'], ['150', 'Standard'], ['220', 'Sharp']] }],
  async run({ files, opts, progress }) {
    const f = files[0]; const doc = await loadLib(f); const out = await PDFDocument.create(); const copied = await out.copyPages(doc, doc.getPageIndices()); let red = 0;
    for (let i = 0; i < copied.length; i++) {
      const list = state.marks[i] || []; if (!list.length) { out.addPage(copied[i]); continue; }
      progress(`Redacting page ${i + 1}`, i / copied.length);
      const r = await rasterPage(f.view, i + 1, +opts.dpi, 0.86, c => { const ctx = c.getContext('2d'); ctx.fillStyle = opts.fill === 'white' ? '#fff' : '#000'; list.forEach(m => ctx.fillRect(m.x * c.width - 1, m.y * c.height - 1, m.w * c.width + 2, m.h * c.height + 2)); });
      const img = await out.embedJpg(r.bytes); out.addPage([r.w, r.h]).drawImage(img, { x: 0, y: 0, width: r.w, height: r.h }); red++;
    }
    if (!red) throw new Error('No boxes yet. Drag across the page to cover what you want hidden.');
    return { files: [{ name: baseName(f.name) + '-redacted.pdf', bytes: await out.save() }], note: `${plural(Object.values(state.marks).reduce((a, l) => a + l.length, 0), 'area')} removed on ${plural(red, 'page')}.` };
  } };
E.compare = { accept: 'pdf', multi: true, max: 2, min: 2, view: 'compare', verb: 'Compare versions', sample: 'compare',
  opts: [{ k: 'sens', label: 'Sensitivity', type: 'seg', def: '48', choices: [['80', 'Low'], ['48', 'Normal'], ['24', 'High']], hint: 'High also flags small shifts in spacing.' }],
  async run({ files, opts, progress }) {
    const [A, B] = files; const n = Math.max(A.pages, B.pages); const out = await PDFDocument.create(); const font = await out.embedFont(StandardFonts.HelveticaBold); const pages = []; const th = +opts.sens;
    for (let i = 1; i <= n; i++) {
      progress(`Comparing page ${i} of ${n}`, (i - 1) / n);
      const a = i <= A.pages ? await renderPage(A.view, i, { width: 900 }) : null; const b = i <= B.pages ? await renderPage(B.view, i, { width: 900 }) : null;
      const W = 900, H = Math.max(a ? a.canvas.height : 0, b ? b.canvas.height : 0); const c = document.createElement('canvas'); c.width = W; c.height = H; const ctx = c.getContext('2d', { willReadFrequently: true });
      const get = r => { const t = document.createElement('canvas'); t.width = W; t.height = H; const x = t.getContext('2d', { willReadFrequently: true }); x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); if (r) x.drawImage(r.canvas, 0, 0); return x.getImageData(0, 0, W, H).data; };
      const da = get(a), db = get(b); const im = ctx.createImageData(W, H); const d = im.data; let diff = 0;
      for (let p = 0; p < d.length; p += 4) { const ga = da[p] * 0.299 + da[p + 1] * 0.587 + da[p + 2] * 0.114, gb = db[p] * 0.299 + db[p + 1] * 0.587 + db[p + 2] * 0.114; if (Math.abs(ga - gb) > th) { diff++; if (gb < ga) { d[p] = 226; d[p + 1] = 46; d[p + 2] = 60; } else { d[p] = 30; d[p + 1] = 136; d[p + 2] = 229; } } else { d[p] = d[p + 1] = d[p + 2] = 255 - (255 - Math.min(ga, gb)) * 0.28; } d[p + 3] = 255; }
      ctx.putImageData(im, 0, 0); const pct = diff / (W * H) * 100; const changed = pct > 0.01 || !a || !b;
      const note = !a ? 'Only in changed version' : !b ? 'Only in original' : changed ? `${pct < 0.1 ? '<0.1' : pct.toFixed(1)}% of page changed` : 'No changes';
      pages.push({ i, pct, changed, url: c.toDataURL('image/jpeg', 0.7), note });
      const img = await out.embedJpg(await blobBytes(await canvasBlob(c, 'image/jpeg', 0.85))); const pw = 595.28, ph = pw * H / W + 40; const pg = out.addPage([pw, ph]); pg.drawImage(img, { x: 0, y: 0, width: pw, height: pw * H / W }); pg.drawText(`Page ${i}: ${note}`, { x: 16, y: ph - 26, size: 11, font, color: changed ? rgb(0.75, 0.15, 0.2) : rgb(0.2, 0.5, 0.3) });
      [a, b].forEach(r => { if (r) r.canvas.width = 0; });
    }
    state.cmp = pages; const ch = pages.filter(p => p.changed).map(p => p.i);
    return { files: [{ name: `${baseName(A.name)}-vs-${baseName(B.name)}.pdf`, bytes: await out.save() }], note: ch.length ? `Changes on ${ch.length === 1 ? 'page' : 'pages'} ${runs(ch)}. Red is new in the changed version; blue was in the original.` : 'No visible differences found.' };
  } };

/* ---------- convert to PDF ---------- */
E.images = { accept: PRESET.accept || 'img', multi: true, view: 'files', verb: 'Make PDF', sample: 'images',
  opts: [{ k: 'size', label: 'Page size', type: 'seg', def: 'a4', choices: [['a4', 'A4'], ['letter', 'Letter'], ['fit', 'Fit image']] }, { k: 'orient', label: 'Orientation', type: 'seg', def: 'auto', choices: [['auto', 'Match image'], ['portrait', 'Portrait'], ['landscape', 'Landscape']], hideWhen: o => o.size === 'fit' }, { k: 'margin', label: 'Margin', type: 'seg', def: '18', choices: [['0', 'None'], ['18', 'Small'], ['48', 'Large']] }],
  async run({ files, opts, progress }) {
    const out = await PDFDocument.create(); const m = +opts.margin; const frames = files.flatMap(f => f.frames || [f]); let k = 0;
    for (const f of frames) {
      progress(`Placing image ${++k} of ${frames.length}`, k / frames.length); const img = await embedImage(out, f);
      let iw = img.width * 0.75, ih = img.height * 0.75, pw, ph;
      if (opts.size === 'fit') { pw = iw + 2 * m; ph = ih + 2 * m; } else { [pw, ph] = PAPER[opts.size]; if (opts.orient === 'landscape' || (opts.orient === 'auto' && img.width > img.height)) [pw, ph] = [ph, pw]; const s = Math.min((pw - 2 * m) / iw, (ph - 2 * m) / ih); iw *= s; ih *= s; }
      out.addPage([pw, ph]).drawImage(img, { x: (pw - iw) / 2, y: (ph - ih) / 2, width: iw, height: ih });
    }
    return { files: [{ name: baseName(files[0].name) + (frames.length > 1 ? '-and-more' : '') + '.pdf', bytes: await out.save() }], note: `${plural(frames.length, 'image')} on ${plural(frames.length, 'page')}.` };
  } };
E.word = { accept: 'docx', view: 'files', verb: 'Convert to PDF', sample: 'docx', caveat: 'Pages are rendered as high-resolution images so they look exactly like your document. Use OCR PDF afterwards if you need selectable text.',
  opts: [{ k: 'q', label: 'Quality', type: 'seg', def: '2', choices: [['1.5', 'Standard'], ['2', 'High'], ['3', 'Print']] }],
  async run({ files, opts, progress }) {
    const f = files[0]; const h = host(1200); h.style.width = 'auto';
    try {
      progress('Reading the document', 0.05);
      try { await docx.renderAsync(f.bytes, h, h, { inWrapper: false, breakPages: true, ignoreLastRenderedPageBreak: false, experimental: true, useBase64URL: true, renderHeaders: true, renderFooters: true, renderFootnotes: true }); }
      catch (e) { throw new Error('This Word file couldn’t be read. It may be damaged, password-protected or not a .docx file.'); }
      await document.fonts.ready; await sleep(250);
      const secs = $$('section.docx', h); if (!secs.length) throw new Error('No pages were found in this document.');
      const out = await PDFDocument.create(); const s = +opts.q;
      for (let i = 0; i < secs.length; i++) {
        progress(`Drawing page ${i + 1} of ${secs.length}`, 0.1 + i / secs.length * 0.85);
        const sec = secs[i]; const wPx = sec.offsetWidth; const pageHpx = (parseFloat(sec.style.minHeight) || 0) * (/pt$/.test(sec.style.minHeight) ? 4 / 3 : 1) || wPx * 1.4142;
        const canvas = await snap(sec, s); const ptPerPx = 0.75 / s; const W = wPx * 0.75, H = pageHpx * 0.75;
        if (sec.offsetHeight > pageHpx * 1.04) await addCanvasPages(out, canvas, { pageW: W, pageH: H, margin: 0, ptPerPx, quality: 0.92 });
        else { const img = await out.embedJpg(await blobBytes(await canvasBlob(canvas, 'image/jpeg', 0.92))); out.addPage([W, H]).drawImage(img, { x: 0, y: H - canvas.height * ptPerPx, width: canvas.width * ptPerPx, height: canvas.height * ptPerPx }); }
        canvas.width = 0; await yieldUI();
      }
      return { files: [{ name: baseName(f.name) + '.pdf', bytes: await out.save() }], note: `${plural(out.getPageCount(), 'page')} converted from ${f.name}.` };
    } finally { h.remove(); }
  } };
E.excel = { accept: 'xlsx', view: 'files', verb: 'Convert to PDF', sample: 'xlsx',
  opts: [{ k: 'sheets', label: 'Sheets', type: 'seg', def: 'all', choices: [['all', 'All sheets'], ['first', 'First sheet']] }, ...pageOpts.map(o => o.k === 'orient' ? Object.assign({}, o, { def: 'landscape' }) : o), { k: 'grid', label: 'Show gridlines', type: 'check', def: true }, { k: 'head', label: 'Repeat the first row on every page', type: 'check', def: true }],
  async run({ files, opts, progress }) {
    const f = files[0]; let wb; try { wb = XLSX.read(f.bytes, { type: 'array', cellDates: true, cellStyles: true }); } catch (e) { throw new Error('This spreadsheet couldn’t be read. It may be damaged or password-protected.'); }
    const names = opts.sheets === 'first' ? wb.SheetNames.slice(0, 1) : wb.SheetNames; const [W, H] = pageSize(opts.paper, opts.orient); const m = 30; const cw = (W - 2 * m) * 4 / 3; const titleH = 22;
    const out = await PDFDocument.create(); const font = await out.embedFont(StandardFonts.HelveticaBold); let done = 0;
    for (const name of names) {
      const ws = wb.Sheets[name]; if (!ws || !ws['!ref']) continue; progress(`Laying out “${name}”`, done / names.length);
      const h = host(cw); h.style.width = 'max-content';
      h.innerHTML = `<style>.q-x table{border-collapse:collapse;font:12px/1.35 Arial,Helvetica,sans-serif;color:#111;background:#fff}.q-x td{padding:3px 7px;white-space:nowrap;vertical-align:top;${opts.grid ? 'border:1px solid #cfcfcf;' : ''}}.q-x td[data-t="n"]{text-align:right}.q-x tr:first-child td{font-weight:700;background:#f4f4f4}</style><div class="q-x">${XLSX.utils.sheet_to_html(ws, { header: '', footer: '' })}</div>`;
      const table = $('table', h); if (!table) { h.remove(); continue; }
      const tw = table.offsetWidth; const sc = Math.min(1, cw / tw); const ch = (H - 2 * m - titleH) * 4 / 3 / sc;
      // lock column widths so hiding rows keeps the layout
      const rows = Array.from(table.rows); let model = rows.reduce((best, r) => (r.cells.length > (best ? best.cells.length : 0) && !Array.from(r.cells).some(c => c.colSpan > 1)) ? r : best, null);
      if (model) { const cg = document.createElement('colgroup'); Array.from(model.cells).forEach(c => { const col = document.createElement('col'); col.style.width = c.offsetWidth + 'px'; cg.appendChild(col); }); table.prepend(cg); table.style.tableLayout = 'fixed'; table.style.width = tw + 'px'; }
      const heights = rows.map(r => r.offsetHeight); const headH = opts.head ? heights[0] : 0;
      const groups = []; let start = opts.head ? 1 : 0; if (opts.head && rows.length === 1) start = 0;
      while (start < rows.length) { let used = headH, end = start; while (end < rows.length && (used + heights[end] <= ch || end === start)) { used += heights[end]; end++; } groups.push([start, end]); start = end; }
      if (!groups.length) groups.push([0, rows.length]);
      for (let g = 0; g < groups.length; g++) {
        const [a, b] = groups[g]; rows.forEach((r, i) => { r.style.display = (i >= a && i < b) || (opts.head && i === 0) ? '' : 'none'; });
        const canvas = await snap(table, 2 * sc); // 1 canvas px = 0.375 pt on the page
        const img = await out.embedJpg(await blobBytes(await canvasBlob(canvas, 'image/jpeg', 0.93))); const p = out.addPage([W, H]);
        const w = canvas.width * 0.375, hh = canvas.height * 0.375;
        p.drawImage(img, { x: m, y: H - m - titleH - hh, width: w, height: hh });
        try { p.drawText(`${name}${groups.length > 1 ? `  ·  ${g + 1} of ${groups.length}` : ''}`, { x: m, y: H - m - 12, size: 10, font, color: rgb(0.35, 0.3, 0.28) }); } catch (e) {}
        canvas.width = 0; await yieldUI();
      }
      h.remove(); done++;
    }
    if (!out.getPageCount()) throw new Error('These sheets are empty.');
    return { files: [{ name: baseName(f.name) + '.pdf', bytes: await out.save() }], note: `${plural(done, 'sheet')} on ${plural(out.getPageCount(), 'page')}.` };
  } };
E.ppt = { accept: 'pptx', view: 'files', verb: 'Convert to PDF', caveat: 'Slides are drawn in your browser: text, shapes, colours, pictures and tables come across, but charts, SmartArt and special effects may be simplified.',
  opts: [{ k: 'q', label: 'Quality', type: 'seg', def: '2', choices: [['1.5', 'Standard'], ['2', 'High'], ['3', 'Print']] }],
  async run({ files, opts, progress }) {
    const f = files[0]; progress('Reading the presentation', 0.05);
    let deck; try { deck = await readPptx(f.bytes); } catch (e) { console.error(e); throw new Error('This PowerPoint file couldn’t be read. It may be damaged or not a .pptx file.'); }
    const out = await PDFDocument.create(); const s = +opts.q; const h = host(deck.w);
    try {
      for (let i = 0; i < deck.slides.length; i++) {
        progress(`Drawing slide ${i + 1} of ${deck.slides.length}`, 0.1 + i / deck.slides.length * 0.88);
        h.innerHTML = deck.slides[i]; const el = h.firstElementChild; await Promise.all($$('img', el).map(im => im.decode().catch(() => {}))); await document.fonts.ready;
        const canvas = await snap(el, s); const img = await out.embedJpg(await blobBytes(await canvasBlob(canvas, 'image/jpeg', 0.92)));
        out.addPage([deck.w * 0.75, deck.h * 0.75]).drawImage(img, { x: 0, y: 0, width: deck.w * 0.75, height: deck.h * 0.75 }); canvas.width = 0; await yieldUI();
      }
    } finally { h.remove(); deck.urls.forEach(u => URL.revokeObjectURL(u)); }
    if (!out.getPageCount()) throw new Error('No slides were found in this file.');
    return { files: [{ name: baseName(f.name) + '.pdf', bytes: await out.save() }], note: `${plural(out.getPageCount(), 'slide')} converted.` };
  } };
E.html = { accept: 'html', view: 'files', verb: 'Convert to PDF', sample: 'html', paste: 'html',
  opts: [...pageOpts, { k: 'margin', label: 'Margin', type: 'seg', def: '36', choices: [['0', 'None'], ['20', 'Small'], ['36', 'Normal'], ['56', 'Large']] }],
  async run({ files, opts, progress }) {
    const f = files[0]; const [W, H] = pageSize(opts.paper, opts.orient); const m = +opts.margin; const cw = Math.round((W - 2 * m) * 4 / 3);
    let html = f.text != null ? f.text : new TextDecoder().decode(f.bytes); html = html.replace(/<script[\s\S]*?<\/script>/gi, '');
    if (!/<html|<body|<head/i.test(html)) html = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial,Helvetica,sans-serif;line-height:1.5}</style></head><body>${html}</body></html>`;
    progress('Laying out the page', 0.1);
    const ifr = document.createElement('iframe'); ifr.style.cssText = `position:fixed;left:-40000px;top:0;width:${cw}px;height:800px;border:0;background:#fff`; document.body.appendChild(ifr);
    try {
      const d = ifr.contentDocument; d.open(); d.write(html); d.close();
      await new Promise(r => { if (d.readyState === 'complete') r(); else ifr.onload = r; setTimeout(r, 4000); });
      if (!d.body) throw new Error('This HTML has no body to convert.');
      d.body.style.margin = d.body.style.margin || '0'; await Promise.all(Array.from(d.images).map(im => im.decode ? im.decode().catch(() => {}) : null)); await sleep(150);
      const Hpx = Math.max(d.documentElement.scrollHeight, d.body.scrollHeight); ifr.style.height = Hpx + 'px';
      progress('Drawing the page', 0.4);
      const canvas = await html2canvas(d.documentElement, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false, windowWidth: cw, windowHeight: Hpx, width: cw, height: Hpx });
      const out = await PDFDocument.create(); progress('Splitting into pages', 0.8);
      await addCanvasPages(out, canvas, { pageW: W, pageH: H, margin: m, ptPerPx: 0.375, quality: 0.9 });
      return { files: [{ name: baseName(f.name) + '.pdf', bytes: await out.save() }], note: `${plural(out.getPageCount(), 'page')} created.` };
    } finally { ifr.remove(); }
  } };
E.text = { accept: PRESET.accept || 'txt', view: 'files', verb: 'Convert to PDF', sample: PRESET.accept === 'rtf' ? 'rtf' : 'txt', paste: PRESET.accept === 'rtf' ? null : 'text',
  opts: [{ k: 'font', label: 'Font', type: 'seg', def: 'helv', choices: [['helv', 'Sans'], ['times', 'Serif'], ['mono', 'Mono']] }, { k: 'size', label: 'Size (pt)', type: 'number', def: 11, min: 6, max: 36, half: true }, { k: 'margin', label: 'Margin (mm)', type: 'number', def: 20, min: 0, max: 60, half: true }, ...pageOpts],
  async run({ files, opts, progress }) {
    const f = files[0]; let text = f.text != null ? f.text : (f.ext === 'rtf' ? rtfToText(new TextDecoder('latin1').decode(f.bytes)) : new TextDecoder().decode(f.bytes));
    text = text.replace(/\r\n?/g, '\n').replace(/\t/g, '    '); if (!text.trim()) throw new Error('This file has no text in it.');
    const [W, H] = pageSize(opts.paper, opts.orient); const m = (+opts.margin || 0) * MM; const size = +opts.size || 11; const lh = size * 1.42; const out = await PDFDocument.create();
    const font = await out.embedFont({ helv: StandardFonts.Helvetica, times: StandardFonts.TimesRoman, mono: StandardFonts.Courier }[opts.font]);
    let latin = true; try { font.widthOfTextAtSize(text.slice(0, 200000), size); } catch (e) { latin = false; }
    const maxW = W - 2 * m; progress('Laying out the text', 0.2);
    if (latin) {
      const lines = wrapText(text, s => font.widthOfTextAtSize(s, size), maxW); const per = Math.max(1, Math.floor((H - 2 * m) / lh));
      for (let i = 0; i < lines.length; i += per) { const p = out.addPage([W, H]); lines.slice(i, i + per).forEach((l, k) => { if (l) p.drawText(l, { x: m, y: H - m - size - k * lh, size, font, color: rgb(0.1, 0.1, 0.1) }); }); }
    } else {
      const scale = 200 / 72; const fam = { helv: 'Arial, "Noto Sans", "Nirmala UI", "Segoe UI", sans-serif', times: '"Times New Roman", "Noto Serif", serif', mono: '"Courier New", "Noto Sans Mono", monospace' }[opts.font];
      const c = document.createElement('canvas'); c.width = Math.round(W * scale); c.height = Math.round(H * scale); const ctx = c.getContext('2d'); ctx.font = `${size * scale}px ${fam}`;
      const rtl = /[\u0590-\u08FF]/.test(text); const lines = wrapText(text, s => ctx.measureText(s).width / scale, maxW); const per = Math.max(1, Math.floor((H - 2 * m) / lh));
      for (let i = 0; i < lines.length; i += per) {
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.fillStyle = '#1a1a1a'; ctx.font = `${size * scale}px ${fam}`; ctx.textBaseline = 'alphabetic'; ctx.direction = rtl ? 'rtl' : 'ltr'; ctx.textAlign = rtl ? 'right' : 'left';
        lines.slice(i, i + per).forEach((l, k) => ctx.fillText(l, (rtl ? W - m : m) * scale, (m + size + k * lh) * scale));
        const img = await out.embedJpg(await blobBytes(await canvasBlob(c, 'image/jpeg', 0.9))); out.addPage([W, H]).drawImage(img, { x: 0, y: 0, width: W, height: H });
        progress(`Page ${Math.floor(i / per) + 1}`, 0.2 + i / lines.length * 0.75);
      }
      c.width = 0;
    }
    return { files: [{ name: baseName(f.name) + '.pdf', bytes: await out.save() }], note: `${plural(out.getPageCount(), 'page')} created${latin ? ' with selectable text' : ''}.` };
  } };
E.ocr = { accept: 'pdf', view: 'pages', verb: 'Recognise text', caveat: 'The first run downloads the reading engine and language data (about 5–15 MB). Pages are read on your device, which takes a few seconds each.',
  opts: [{ k: 'lang', label: 'Document language', type: 'select', def: 'eng', choices: OCR_LANGS }, { k: 'plusEng', label: 'Also look for English words', type: 'check', def: true }, { k: 'dpi', label: 'Accuracy', type: 'seg', def: '250', choices: [['200', 'Fast'], ['250', 'Balanced'], ['300', 'Best']] }, { k: 'skip', label: 'Skip pages that already have text', type: 'check', def: true }],
  async run({ files, opts, progress }) {
    if (!window.Tesseract) throw new Error('The text reader didn’t load. Check your connection and reload the page.');
    const f = files[0]; const langs = opts.lang + (opts.plusEng && opts.lang !== 'eng' ? '+eng' : '');
    progress('Loading the text reader (first time only)…', 0.02);
    const worker = await Tesseract.createWorker(langs, 1, { logger: m => { if (m.status && m.status.includes('loading') && m.progress != null) progress(`Downloading language data… ${Math.round(m.progress * 100)}%`, 0.02 + m.progress * 0.06); } });
    try {
      const src = await loadLib(f); const out = await PDFDocument.create(); const copied = await out.copyPages(src, src.getPageIndices()); const texts = []; let done = 0, skipped = 0;
      for (let i = 0; i < copied.length; i++) {
        const pg = out.addPage(copied[i]); const pjs = await f.view.getPage(i + 1);
        if (opts.skip) { const tc = await pjs.getTextContent(); const t = tc.items.map(x => x.str).join('').trim(); if (t.length > 40) { texts.push(`----- Page ${i + 1} -----\n` + textLines(tc.items).map(l => l.text).join('\n')); skipped++; continue; } }
        progress(`Reading page ${i + 1} of ${copied.length}`, 0.08 + i / copied.length * 0.9);
        const v1 = pjs.getViewport({ scale: 1, rotation: 0 }); const sc = Math.min(+opts.dpi / 72, 4200 / Math.max(v1.width, v1.height));
        const r = await renderPage(f.view, i + 1, { scale: sc, upright: true });
        const res = await worker.recognize(r.canvas, { pdfTitle: f.name, pdfTextOnly: true }, { text: true, pdf: true });
        texts.push(`----- Page ${i + 1} -----\n${(res.data.text || '').trim()}`);
        if (res.data.pdf) {
          const [emb] = await out.embedPdf(new Uint8Array(res.data.pdf)); const box = pg.getCropBox();
          pg.drawPage(emb, { x: box.x, y: box.y, xScale: box.width / emb.width, yScale: box.height / emb.height });
        }
        r.canvas.width = 0; done++;
      }
      const name = baseName(f.name);
      return { files: [{ name: name + '-ocr.pdf', bytes: await out.save() }, { name: name + '-ocr.txt', bytes: new TextEncoder().encode(texts.join('\n\n') + '\n'), text: texts.join('\n\n') }], note: `Text recognised on ${plural(done, 'page')}${skipped ? `; ${plural(skipped, 'page')} already had text` : ''}. The PDF is now searchable.` };
    } finally { await worker.terminate(); }
  } };

/* ---------- convert from PDF ---------- */
E.toimage = { accept: 'pdf', view: 'pages', verb: 'Convert pages',
  opts: [
    ...(PRESET.fmt === 'jpg' || PRESET.fmt === 'png' ? [{ k: 'fmt', label: 'Format', type: 'seg', def: PRESET.fmt, choices: [['jpg', 'JPG'], ['png', 'PNG']], hint: 'PNG is sharper for text; JPG is smaller for photos.' }] : []),
    { k: 'dpi', label: 'Resolution', type: 'seg', def: '150', choices: [['72', '72 dpi'], ['150', '150 dpi'], ['220', '220 dpi'], ['300', '300 dpi']] },
    { k: 'pages', label: 'Pages', type: 'text', def: '', ph: 'All pages', hint: 'Leave empty for every page, or type ranges like 1-3, 6.' },
    ...(PRESET.fmt === 'tiff' ? [{ k: 'multi', label: 'Output', type: 'seg', def: 'one', choices: [['one', 'One multi-page file'], ['each', 'One file per page']] }] : [])],
  async run({ files, opts, progress }) {
    const f = files[0]; const n = f.pages; const b = baseName(f.name); const fmt = opts.fmt || PRESET.fmt || 'jpg';
    const list = String(opts.pages || '').trim() ? [...new Set(parseRanges(opts.pages, n).flatMap(g => g.idx))].sort((x, y) => x - y) : Array.from({ length: n }, (_, i) => i);
    const outs = []; const frames = [];
    for (let k = 0; k < list.length; k++) {
      const i = list[k] + 1; progress(`Rendering page ${i} (${k + 1} of ${list.length})`, k / list.length);
      const { canvas } = await renderPage(f.view, i, { scale: +opts.dpi / 72 }); const nm = `${b}-page-${pad(i, String(n).length)}`;
      if (fmt === 'bmp') outs.push({ name: nm + '.bmp', bytes: canvasToBmp(canvas) });
      else if (fmt === 'tiff') { const fr = { w: canvas.width, h: canvas.height, rgb: canvasRGB(canvas) }; if (opts.multi === 'each') outs.push({ name: nm + '.tif', bytes: tiffEncode([fr]) }); else frames.push(fr); }
      else outs.push({ name: `${nm}.${fmt}`, bytes: await blobBytes(await canvasBlob(canvas, fmt === 'png' ? 'image/png' : 'image/jpeg', 0.9)) });
      canvas.width = 0; await yieldUI();
    }
    if (frames.length) { progress('Writing the TIFF file', 0.97); outs.push({ name: `${b}.tif`, bytes: tiffEncode(frames) }); }
    return { files: outs, note: `${plural(list.length, 'page')} saved as ${fmt.toUpperCase()} at ${opts.dpi} dpi${frames.length ? ' in one multi-page file' : ''}.` };
  } };
E.totext = { accept: 'pdf', view: 'pages', verb: 'Extract text', caveat: 'Scanned pages are pictures of text and come out empty. Use OCR PDF first for scans.',
  opts: [{ k: 'fmt', label: 'Format', type: 'seg', def: 'txt', choices: [['txt', 'Plain text'], ['md', 'Markdown']] }, { k: 'marks', label: 'Mark where each page starts', type: 'check', def: true }],
  async run({ files, opts, progress }) {
    const f = files[0]; const parts = []; let chars = 0;
    for (let i = 1; i <= f.pages; i++) { progress(`Reading page ${i} of ${f.pages}`, (i - 1) / f.pages); const tc = await (await f.view.getPage(i)).getTextContent(); const text = textLines(tc.items).map(l => l.text).join('\n'); chars += text.replace(/\s/g, '').length; parts.push(opts.marks ? (opts.fmt === 'md' ? `## Page ${i}\n\n${text}` : `----- Page ${i} -----\n${text}`) : text); }
    if (!chars) throw new Error('No text was found. This looks like a scanned PDF; run it through OCR PDF first.');
    const body = (opts.fmt === 'md' ? `# ${f.name.replace(/\.pdf$/i, '')}\n\n` : '') + parts.join('\n\n') + '\n';
    return { files: [{ name: `${baseName(f.name)}.${opts.fmt}`, bytes: new TextEncoder().encode(body), text: body }], note: `${chars.toLocaleString()} characters from ${plural(f.pages, 'page')}.` };
  } };
E.pdf2word = { accept: 'pdf', view: 'pages', verb: 'Convert to Word',
  opts: [{ k: 'mode', label: 'Output', type: 'seg', def: 'text', choices: [['text', 'Editable text'], ['layout', 'Exact look']], hint: '“Editable text” keeps headings and paragraphs. “Exact look” puts a picture of each page in Word.' }],
  async run({ files, opts, progress }) {
    const f = files[0]; const D = window.docx; if (!D) throw new Error('The Word writer didn’t load. Check your connection and reload.');
    const first = f.sizes[0] || [595, 842]; let doc;
    if (opts.mode === 'layout') {
      const sections = [];
      for (let i = 1; i <= f.pages; i++) {
        progress(`Drawing page ${i} of ${f.pages}`, (i - 1) / f.pages); const r = await renderPage(f.view, i, { scale: 2 }); const data = await blobBytes(await canvasBlob(r.canvas, 'image/jpeg', 0.88)); r.canvas.width = 0;
        sections.push({ properties: { page: { size: { width: Math.round(r.w * 20), height: Math.round(r.h * 20) }, margin: { top: 0, right: 0, bottom: 0, left: 0, header: 0, footer: 0 } } }, children: [new D.Paragraph({ spacing: { before: 0, after: 0 }, children: [new D.ImageRun({ type: 'jpg', data, transformation: { width: Math.floor(r.w * 96 / 72 * 0.995), height: Math.floor(r.h * 96 / 72 * 0.995) } })] })] });
      }
      doc = new D.Document({ sections });
    } else {
      const { pages, chars } = await docBlocks(f.view, progress); if (chars < 20) throw new Error('No text was found. This looks like a scanned PDF; run it through OCR PDF first, or choose “Exact look”.');
      const children = []; pages.forEach((pg, pi) => pg.paras.forEach((b, bi) => { children.push(new D.Paragraph({ heading: b.level === 1 ? D.HeadingLevel.HEADING_1 : b.level === 2 ? D.HeadingLevel.HEADING_2 : undefined, pageBreakBefore: pi > 0 && bi === 0, spacing: { after: 140 }, children: [new D.TextRun({ text: b.text })] })); }));
      doc = new D.Document({ styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } }, sections: [{ properties: { page: { size: { width: Math.round(first[0] * 20), height: Math.round(first[1] * 20) }, margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } } }, children }] });
    }
    progress('Writing the Word file', 0.96);
    return { files: [{ name: baseName(f.name) + '.docx', bytes: await blobBytes(await D.Packer.toBlob(doc)), noPreview: true }], note: `${plural(f.pages, 'page')} converted${opts.mode === 'layout' ? ' as page pictures' : ' to editable text'}.` };
  } };
E.pdf2excel = { accept: 'pdf', view: 'pages', verb: 'Convert to Excel', caveat: 'Works with PDFs that contain real text, such as exported statements and reports. Run scans through OCR PDF first.',
  opts: [{ k: 'sheets', label: 'Sheets', type: 'seg', def: 'page', choices: [['page', 'One per page'], ['one', 'All in one']] }],
  async run({ files, opts, progress }) {
    const f = files[0]; const wb = XLSX.utils.book_new(); const all = []; let cells = 0;
    for (let i = 1; i <= f.pages; i++) {
      progress(`Reading page ${i} of ${f.pages}`, (i - 1) / f.pages); const tc = await (await f.view.getPage(i)).getTextContent(); const grid = tableFromItems(tc.items); cells += grid.reduce((a, r) => a + r.filter(c => c !== '').length, 0);
      if (opts.sheets === 'page') { const ws = XLSX.utils.aoa_to_sheet(grid.length ? grid : [['(no text on this page)']]); ws['!cols'] = colWidths(grid); XLSX.utils.book_append_sheet(wb, ws, `Page ${i}`); }
      else { if (all.length) all.push([]); all.push(...grid); }
    }
    if (!cells) throw new Error('No text was found. This looks like a scanned PDF; run it through OCR PDF first.');
    if (opts.sheets === 'one') { const ws = XLSX.utils.aoa_to_sheet(all); ws['!cols'] = colWidths(all); XLSX.utils.book_append_sheet(wb, ws, 'PDF data'); }
    return { files: [{ name: baseName(f.name) + '.xlsx', bytes: new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' })), noPreview: true }], note: `${cells.toLocaleString()} cells from ${plural(f.pages, 'page')}.` };
  } };
E.pdf2ppt = { accept: 'pdf', view: 'pages', verb: 'Convert to PowerPoint',
  opts: [{ k: 'q', label: 'Image quality', type: 'seg', def: '2', choices: [['1.5', 'Standard'], ['2', 'High'], ['3', 'Print']] }, { k: 'notes', label: 'Put each page’s text in the speaker notes', type: 'check', def: true }],
  async run({ files, opts, progress }) {
    const f = files[0]; const P = new PptxGenJS(); const [w0, h0] = f.sizes[0] || [720, 540]; P.defineLayout({ name: 'PDF', width: w0 / 72, height: h0 / 72 }); P.layout = 'PDF'; P.title = f.name;
    for (let i = 1; i <= f.pages; i++) {
      progress(`Adding page ${i} of ${f.pages}`, (i - 1) / f.pages); const r = await renderPage(f.view, i, { scale: +opts.q }); const data = r.canvas.toDataURL('image/jpeg', 0.9); r.canvas.width = 0;
      const s = P.addSlide(); const sc = Math.min(w0 / r.w, h0 / r.h); const w = r.w * sc / 72, h = r.h * sc / 72; s.addImage({ data, x: (w0 / 72 - w) / 2, y: (h0 / 72 - h) / 2, w, h });
      if (opts.notes) { const tc = await (await f.view.getPage(i)).getTextContent(); const t = textLines(tc.items).map(l => l.text).join('\n'); if (t) s.addNotes(t); }
      await yieldUI();
    }
    progress('Writing the PowerPoint file', 0.97); const bytes = await P.write({ outputType: 'uint8array' });
    return { files: [{ name: baseName(f.name) + '.pptx', bytes: new Uint8Array(bytes), noPreview: true }], note: `${plural(f.pages, 'slide')} created.` };
  } };
E.pdf2html = { accept: 'pdf', view: 'pages', verb: 'Convert to HTML',
  opts: [{ k: 'mode', label: 'Style', type: 'seg', def: 'exact', choices: [['exact', 'Exact look'], ['clean', 'Clean HTML']], hint: '“Exact look” copies each page with selectable text. “Clean HTML” gives headings and paragraphs.' }],
  async run({ files, opts, progress }) {
    const f = files[0]; const title = f.name.replace(/\.pdf$/i, ''); let body = ''; let css = '';
    if (opts.mode === 'clean') {
      const { pages } = await docBlocks(f.view, progress);
      body = `<article>\n<h1>${esc(title)}</h1>\n` + pages.map((p, i) => `<section id="page-${i + 1}">\n${p.paras.map(b => b.level === 1 ? `<h2>${esc(b.text)}</h2>` : b.level === 2 ? `<h3>${esc(b.text)}</h3>` : `<p>${esc(b.text)}</p>`).join('\n')}\n</section>`).join('\n<hr>\n') + '\n</article>';
      css = 'body{font:17px/1.65 Georgia,serif;color:#222;max-width:46rem;margin:3rem auto;padding:0 1.2rem}h1,h2,h3{font-family:Arial,sans-serif;line-height:1.2}hr{border:0;border-top:1px solid #ddd;margin:2.5rem 0}';
    } else {
      const parts = [];
      for (let i = 1; i <= f.pages; i++) {
        progress(`Converting page ${i} of ${f.pages}`, (i - 1) / f.pages); const r = await renderPage(f.view, i, { scale: 1.5 }); const img = r.canvas.toDataURL('image/jpeg', 0.82); r.canvas.width = 0;
        const page = await f.view.getPage(i); const vp = page.getViewport({ scale: 4 / 3 }); const tc = await page.getTextContent();
        const spans = tc.items.filter(it => it.str && it.str.trim()).map(it => { const tx = pdfjsLib.Util.transform(vp.transform, it.transform); const fh = Math.hypot(tx[2], tx[3]); return `<span style="left:${tx[4].toFixed(1)}px;top:${(tx[5] - fh).toFixed(1)}px;font-size:${fh.toFixed(1)}px" data-w="${(it.width * vp.scale).toFixed(1)}">${esc(it.str)}</span>`; }).join('');
        parts.push(`<div class="page" style="width:${vp.width.toFixed(0)}px;height:${vp.height.toFixed(0)}px;background-image:url(${img})">${spans}</div>`);
      }
      body = parts.join('\n');
      css = 'body{margin:0;background:#e9e6e3;padding:24px 0}.page{position:relative;margin:0 auto 24px;background-size:100% 100%;box-shadow:0 2px 12px rgba(0,0,0,.2);max-width:100%}.page span{position:absolute;color:transparent;white-space:pre;transform-origin:0 0;line-height:1;font-family:sans-serif}.page span::selection{background:rgba(242,96,26,.35)}';
      body += `\n<script>document.querySelectorAll('.page span').forEach(function(s){var w=+s.dataset.w;if(w&&s.offsetWidth)s.style.transform='scaleX('+(w/s.offsetWidth)+')';});<\/script>`;
    }
    const html = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${esc(title)}</title>\n<style>${css}</style>\n</head>\n<body>\n${body}\n</body>\n</html>\n`;
    return { files: [{ name: baseName(f.name) + '.html', bytes: new TextEncoder().encode(html), text: opts.mode === 'clean' ? html : null, noPreview: opts.mode !== 'clean' }], note: `${plural(f.pages, 'page')} converted to ${opts.mode === 'clean' ? 'clean HTML' : 'one HTML file with selectable text'}.` };
  } };

/* ---------- translate & AI ---------- */
E.translate = { accept: 'pdf', view: 'pages', verb: 'Translate',
  opts: [{ k: 'source', label: 'From', type: 'select', def: PRESET.source || 'auto', choices: LANGS }, { k: 'target', label: 'To', type: 'select', def: PRESET.target || 'en', choices: LANGS.filter(l => l[0] !== 'auto') }],
  async run({ files, opts, progress }) {
    if (opts.source === opts.target) throw new Error('Pick two different languages.');
    const f = files[0]; const D = window.docx; const { pages, chars } = await docBlocks(f.view, progress);
    if (chars < 5) throw new Error('No text was found. This looks like a scanned PDF; run it through OCR PDF first.');
    if (chars > 150000) throw new Error(`This document has ${chars.toLocaleString()} characters. Split it into parts under 150,000 characters (about 50 pages) and translate them one at a time.`);
    const flat = []; pages.forEach((p, pi) => p.paras.forEach(b => flat.push({ pi, b })));
    const batches = []; let cur = [], len = 0; flat.forEach(x => { if (cur.length >= 60 || len + x.b.text.length > 12000) { batches.push(cur); cur = []; len = 0; } cur.push(x); len += x.b.text.length; }); if (cur.length) batches.push(cur);
    let detected = null;
    for (let i = 0; i < batches.length; i++) {
      progress(`Translating part ${i + 1} of ${batches.length}`, 0.4 + i / batches.length * 0.55);
      const res = await api('/translate', { texts: batches[i].map(x => x.b.text), source: opts.source, target: opts.target });
      if (!res || !Array.isArray(res.texts) || res.texts.length !== batches[i].length) throw new Error('The translation service sent back an unexpected answer. Try again.');
      res.texts.forEach((t, k) => { batches[i][k].b.out = t; }); detected = detected || res.detected;
    }
    const rtl = RTL.has(opts.target); const tName = (LANGS.find(l => l[0] === opts.target) || [, opts.target])[1];
    const children = []; pages.forEach((pg, pi) => pg.paras.forEach((b, bi) => children.push(new D.Paragraph({ bidirectional: rtl, alignment: rtl ? D.AlignmentType.RIGHT : undefined, heading: b.level === 1 ? D.HeadingLevel.HEADING_1 : b.level === 2 ? D.HeadingLevel.HEADING_2 : undefined, pageBreakBefore: pi > 0 && bi === 0, spacing: { after: 140 }, children: [new D.TextRun({ text: b.out || b.text, rightToLeft: rtl })] }))));
    const doc = new D.Document({ styles: { default: { document: { run: { font: rtl ? 'Arial' : 'Calibri', size: 22 } } } }, sections: [{ properties: { page: { margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } } }, children }] });
    const txt = pages.map((p, i) => `----- Page ${i + 1} -----\n` + p.paras.map(b => b.out || b.text).join('\n\n')).join('\n\n');
    const nm = `${baseName(f.name)}-${opts.target}`;
    return { files: [{ name: nm + '.docx', bytes: await blobBytes(await D.Packer.toBlob(doc)), noPreview: true }, { name: nm + '.txt', bytes: new TextEncoder().encode(txt), text: txt }], note: `${chars.toLocaleString()} characters translated into ${tName}${detected ? ` (detected source: ${detected.toUpperCase()})` : ''}.`, answer: txt.length < 6000 ? txt : null };
  } };
E.ai = { accept: 'pdf', view: 'pages', verb: PRESET.task === 'ask' ? 'Ask' : 'Summarize',
  opts: PRESET.task === 'ask' ? [{ k: 'question', label: 'Your question', type: 'textarea', def: '', ph: 'e.g. What is the notice period, and on which page is it?' }, { k: 'lang', label: 'Answer in', type: 'select', def: 'same', choices: [['same', 'The question’s language'], ...LANGS.filter(l => l[0] !== 'auto')] }]
    : [{ k: 'length', label: 'Length', type: 'seg', def: 'medium', choices: [['short', 'Short'], ['medium', 'Medium'], ['detailed', 'Detailed']] }, { k: 'lang', label: 'Write the summary in', type: 'select', def: 'same', choices: [['same', 'The document’s language'], ...LANGS.filter(l => l[0] !== 'auto')] }],
  async run({ files, opts, progress }) {
    const f = files[0]; if (PRESET.task === 'ask' && !String(opts.question || '').trim()) throw new Error('Type your question first.');
    const parts = []; let chars = 0;
    for (let i = 1; i <= f.pages; i++) { progress(`Reading page ${i} of ${f.pages}`, (i - 1) / f.pages * 0.4); const tc = await (await f.view.getPage(i)).getTextContent(); const t = textLines(tc.items).map(l => l.text).join('\n'); chars += t.length; parts.push(`[Page ${i}]\n${t}`); }
    if (chars < 20) throw new Error('No text was found. This looks like a scanned PDF; run it through OCR PDF first.');
    let text = parts.join('\n\n'); let cut = false; if (text.length > 300000) { text = text.slice(0, 300000); cut = true; }
    progress(PRESET.task === 'ask' ? 'Finding the answer…' : 'Writing the summary…', 0.55);
    const langName = opts.lang === 'same' ? null : (LANGS.find(l => l[0] === opts.lang) || [, null])[1];
    const res = await api('/ai', { task: PRESET.task || 'summarize', text, question: opts.question || '', length: opts.length || 'medium', language: langName, title: f.name });
    const answer = String(res && res.text || '').trim(); if (!answer) throw new Error('The AI service returned an empty answer. Try again.');
    const md = `# ${PRESET.task === 'ask' ? 'Answer' : 'Summary'}: ${f.name}\n\n${PRESET.task === 'ask' ? `**Question:** ${opts.question}\n\n` : ''}${answer}\n`;
    return { files: [{ name: `${baseName(f.name)}-${PRESET.task === 'ask' ? 'answer' : 'summary'}.md`, bytes: new TextEncoder().encode(md), text: md }], note: cut ? 'The document is very long, so only the first ~300,000 characters were used.' : `Based on ${plural(f.pages, 'page')} of text.`, answer };
  } };

/* ---------- helpers for converters ---------- */
function wrapText(text, measure, maxW) {
  const out = [];
  text.split('\n').forEach(par => {
    if (!par.trim()) { out.push(''); return; }
    const words = par.split(/(\s+)/); let line = '';
    for (const w of words) {
      if (!w) continue; const test = line + w;
      if (measure(test.trimEnd()) <= maxW) { line = test; continue; }
      if (line.trim()) { out.push(line.trimEnd()); line = w.trimStart(); }
      else line = w;
      while (line && measure(line) > maxW) { let k = line.length; while (k > 1 && measure(line.slice(0, k)) > maxW) k--; out.push(line.slice(0, k)); line = line.slice(k); }
    }
    if (line.trim() || line === '') out.push(line.trimEnd());
  });
  return out;
}
function rtfToText(rtf) {
  const SKIP = new Set(['fonttbl', 'colortbl', 'stylesheet', 'info', 'pict', 'object', 'header', 'footer', 'headerl', 'headerr', 'headerf', 'footerl', 'footerr', 'footerf', 'xmlnstbl', 'listtable', 'listoverridetable', 'rsidtbl', 'generator', 'themedata', 'colorschememapping', 'latentstyles', 'datastore', 'mmathPr', 'pgdsctbl', 'fldinst', 'bkmkstart', 'bkmkend', 'shppict', 'nonshppict', 'filetbl', 'revtbl']);
  const MAP = { emdash: '—', endash: '–', bullet: '•', lquote: '‘', rquote: '’', ldblquote: '“', rdblquote: '”', tab: '\t', cell: '\t', par: '\n', line: '\n', row: '\n', sect: '\n\n', page: '\n\n' };
  const dec = new TextDecoder('windows-1252'); let out = '', i = 0, skip = false, uc = 1, ucSkip = 0; const stack = [];
  while (i < rtf.length) {
    const c = rtf[i];
    if (c === '{') { stack.push({ skip, uc }); i++; continue; }
    if (c === '}') { const s = stack.pop() || { skip: false, uc: 1 }; skip = s.skip; uc = s.uc; i++; continue; }
    if (c === '\\') {
      const n = rtf[i + 1];
      if (n === '\\' || n === '{' || n === '}') { if (!skip) out += n; i += 2; continue; }
      if (n === '*') { skip = true; i += 2; continue; }
      if (n === "'") { if (!skip) { if (ucSkip > 0) ucSkip--; else out += dec.decode(new Uint8Array([parseInt(rtf.substr(i + 2, 2), 16)])); } i += 4; continue; }
      if (n === '~') { if (!skip) out += '\u00A0'; i += 2; continue; }
      if (n === '\n' || n === '\r') { if (!skip) out += '\n'; i += 2; continue; }
      const m = /^\\([a-zA-Z]+)(-?\d+)? ?/.exec(rtf.slice(i, i + 48)); if (!m) { i += 2; continue; }
      const w = m[1], arg = m[2]; i += m[0].length;
      if (SKIP.has(w)) { skip = true; continue; } if (skip) continue;
      if (w === 'uc') uc = +arg; else if (w === 'u') { let code = +arg; if (code < 0) code += 65536; out += String.fromCharCode(code); ucSkip = uc; } else if (MAP[w]) out += MAP[w];
      continue;
    }
    if (c === '\r' || c === '\n') { i++; continue; }
    if (!skip) { if (ucSkip > 0) ucSkip--; else out += c; }
    i++;
  }
  return out.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
function tableFromItems(items) {
  const rows = []; items.forEach(it => { if (!it.str || !it.str.trim()) return; const y = it.transform[5], x = it.transform[4], h = Math.abs(it.transform[3]) || 10; let r = rows.find(r => Math.abs(r.y - y) < Math.max(h, r.h) * 0.45); if (!r) { r = { y, h, items: [] }; rows.push(r); } r.items.push({ x, w: it.width || 0, s: it.str, h }); });
  rows.sort((a, b) => b.y - a.y);
  const cellsByRow = rows.map(r => { r.items.sort((a, b) => a.x - b.x); const cells = []; let cur = null; r.items.forEach(it => { if (cur && it.x - cur.end < Math.max(it.h * 0.9, 4)) { cur.s += (it.x - cur.end > it.h * 0.15 ? ' ' : '') + it.s; cur.end = it.x + it.w; } else { cur = { x: it.x, end: it.x + it.w, s: it.s }; cells.push(cur); } }); return cells; });
  const starts = cellsByRow.flat().map(c => c.x).sort((a, b) => a - b); const anchors = [];
  starts.forEach(x => { const a = anchors[anchors.length - 1]; if (a && x - a.max < 9) { a.max = x; a.n++; a.sum += x; } else anchors.push({ min: x, max: x, sum: x, n: 1 }); });
  const cols = anchors.map(a => a.sum / a.n);
  const num = s => { const t = s.trim().replace(/[₹$€£,\s]/g, ''); const neg = /^\(.*\)$/.test(t); const v = t.replace(/[()]/g, ''); return /^-?\d+(\.\d+)?%?$/.test(v) && !/^0\d/.test(v) ? (v.endsWith('%') ? parseFloat(v) / 100 : parseFloat(v)) * (neg ? -1 : 1) : null; };
  return cellsByRow.map(cells => { const row = new Array(cols.length).fill(''); cells.forEach(c => { let k = 0, best = Infinity; cols.forEach((x, i) => { const d = Math.abs(x - c.x); if (d < best) { best = d; k = i; } }); const v = num(c.s); row[k] = row[k] === '' ? (v != null ? v : c.s.trim()) : `${row[k]} ${c.s.trim()}`; }); while (row.length && row[row.length - 1] === '') row.pop(); return row; });
}
const colWidths = grid => { const w = []; grid.forEach(r => r.forEach((c, i) => { w[i] = Math.min(60, Math.max(w[i] || 6, String(c).length + 2)); })); return w.map(x => ({ wch: x })); };

/* ---------- PowerPoint reader ---------- */
async function readPptx(bytes) {
  const zip = await JSZip.loadAsync(bytes); const urls = [];
  const xml = async p => { const f = zip.file(p); return f ? new DOMParser().parseFromString(await f.async('text'), 'application/xml') : null; };
  const relsOf = async p => { const dir = p.slice(0, p.lastIndexOf('/') + 1); const d = await xml(dir + '_rels/' + p.slice(p.lastIndexOf('/') + 1) + '.rels'); const map = {}; if (d) Array.from(d.getElementsByTagName('Relationship')).forEach(r => { map[r.getAttribute('Id')] = { target: resolve(dir, r.getAttribute('Target')), type: r.getAttribute('Type') || '', ext: r.getAttribute('TargetMode') === 'External' }; }); return map; };
  const resolve = (dir, t) => { if (t.startsWith('/')) return t.slice(1); const parts = (dir + t).split('/'); const out = []; parts.forEach(p => { if (p === '..') out.pop(); else if (p !== '.') out.push(p); }); return out.join('/'); };
  const kids = (el, name) => el ? Array.from(el.children).filter(c => c.localName === name) : [];
  const kid = (el, name) => kids(el, name)[0] || null;
  const desc = (el, name) => el ? el.getElementsByTagNameNS('*', name)[0] || null : null;
  const pres = await xml('ppt/presentation.xml'); const sz = desc(pres, 'sldSz'); const CX = +sz.getAttribute('cx'), CY = +sz.getAttribute('cy'); const PX = 1 / 9525;
  const presRels = await relsOf('ppt/presentation.xml');
  const slidePaths = Array.from(pres.getElementsByTagNameNS('*', 'sldId')).map(e => { const id = e.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') || e.getAttribute('r:id'); return presRels[id] && presRels[id].target; }).filter(Boolean);
  // theme colours
  const themeRel = Object.values(presRels).find(r => r.type.endsWith('/theme')); const theme = themeRel ? await xml(themeRel.target) : null; const scheme = {};
  const cs = desc(theme, 'clrScheme'); if (cs) Array.from(cs.children).forEach(c => { const s = desc(c, 'srgbClr'), y = desc(c, 'sysClr'); scheme[c.localName] = s ? s.getAttribute('val') : y ? (y.getAttribute('lastClr') || '000000') : '000000'; });
  const alias = { bg1: 'lt1', tx1: 'dk1', bg2: 'lt2', tx2: 'dk2' };
  const majorFont = (desc(desc(theme, 'majorFont'), 'latin') || { getAttribute: () => null }).getAttribute('typeface'); const minorFont = (desc(desc(theme, 'minorFont'), 'latin') || { getAttribute: () => null }).getAttribute('typeface');
  const hexAdj = (hex, el) => {
    let [r, g, b] = [0, 2, 4].map(i => parseInt(hex.substr(i, 2), 16) / 255); if (!el) return '#' + hex;
    let h, s, l; { const mx = Math.max(r, g, b), mn = Math.min(r, g, b); l = (mx + mn) / 2; if (mx === mn) h = s = 0; else { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; } }
    let alpha = 1; Array.from(el.children).forEach(m => { const v = +m.getAttribute('val') / 100000; if (m.localName === 'lumMod') l *= v; else if (m.localName === 'lumOff') l += v; else if (m.localName === 'tint') l = l + (1 - l) * (1 - v); else if (m.localName === 'shade') l *= v; else if (m.localName === 'alpha') alpha = v; });
    l = Math.max(0, Math.min(1, l)); const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; const f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
    const rgbv = s === 0 ? [l, l, l] : [f(h + 1 / 3), f(h), f(h - 1 / 3)]; return alpha < 1 ? `rgba(${rgbv.map(v => Math.round(v * 255)).join(',')},${alpha})` : '#' + rgbv.map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
  };
  const color = el => { if (!el) return null; const s = kid(el, 'srgbClr'); if (s) return hexAdj(s.getAttribute('val'), s); const c = kid(el, 'schemeClr'); if (c) { const k = c.getAttribute('val'); return hexAdj(scheme[alias[k] || k] || '000000', c); } const y = kid(el, 'sysClr'); if (y) return hexAdj(y.getAttribute('lastClr') || '000000', y); const p = kid(el, 'prstClr'); if (p) return p.getAttribute('val'); return null; };
  const fillOf = spPr => { if (!spPr) return null; const sf = kid(spPr, 'solidFill'); if (sf) return color(sf); const gf = kid(spPr, 'gradFill'); if (gf) { const gs = desc(gf, 'gs'); return gs ? color(gs) : null; } return null; };
  const xfrmOf = (el) => { const x = desc(el, 'xfrm'); if (!x) return null; const off = kid(x, 'off'), ext = kid(x, 'ext'); if (!off || !ext) return null; return { x: +off.getAttribute('x'), y: +off.getAttribute('y'), w: +ext.getAttribute('cx'), h: +ext.getAttribute('cy'), rot: +(x.getAttribute('rot') || 0) / 60000, flipH: x.getAttribute('flipH') === '1' }; };
  const phKey = sp => { const ph = desc(kid(sp, 'nvSpPr') || kid(sp, 'nvPicPr') || sp, 'ph'); if (!ph) return null; return { type: ph.getAttribute('type') || 'body', idx: ph.getAttribute('idx') || '' }; };
  const phMap = async (doc) => { const m = []; if (!doc) return m; Array.from(doc.getElementsByTagNameNS('*', 'sp')).forEach(sp => { const k = phKey(sp); if (k) m.push({ k, xfrm: xfrmOf(kid(sp, 'spPr')), sp }); }); return m; };
  const findPh = (maps, k) => { for (const m of maps) { const hit = m.find(x => x.k.idx && x.k.idx === k.idx && k.idx) || m.find(x => x.k.type === k.type) || (/^(body|obj)$/.test(k.type) ? m.find(x => x.k.type === 'body') : null) || (k.type === 'ctrTitle' ? m.find(x => x.k.type === 'title') : null); if (hit) return hit; } return null; };
  const bgOf = (doc) => { const bg = desc(doc, 'bg'); if (!bg) return null; const pr = desc(bg, 'bgPr'); if (pr) { const f = fillOf(pr); if (f) return { color: f }; const blip = desc(pr, 'blip'); if (blip) return { blip: blip.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'embed') }; } const ref = desc(bg, 'bgRef'); if (ref) return { color: color(ref) }; return null; };
  const imgUrl = async (rels, id) => { const r = rels[id]; if (!r || r.ext) return null; const f = zip.file(r.target); if (!f) return null; const ext = extOf(r.target); if (!/^(png|jpe?g|gif|bmp|webp|svg)$/.test(ext)) return null; const blob = new Blob([await f.async('uint8array')], { type: ext === 'svg' ? 'image/svg+xml' : 'image/' + (ext === 'jpg' ? 'jpeg' : ext) }); const u = URL.createObjectURL(blob); urls.push(u); return u; };
  const masterSize = (doc, type) => { const st = desc(doc, 'txStyles'); if (!st) return null; const which = /title/i.test(type) ? 'titleStyle' : /^(body|obj|subTitle)$/.test(type) ? 'bodyStyle' : 'otherStyle'; const sEl = desc(st, which); const d = sEl ? desc(desc(sEl, 'lvl1pPr'), 'defRPr') : null; return d && d.getAttribute('sz') ? +d.getAttribute('sz') / 100 : null; };
  const slides = [];
  for (const sp of slidePaths) {
    const doc = await xml(sp); const rels = await relsOf(sp); const layoutRel = Object.values(rels).find(r => r.type.endsWith('/slideLayout'));
    const layout = layoutRel ? await xml(layoutRel.target) : null; const lRels = layoutRel ? await relsOf(layoutRel.target) : {};
    const masterRel = Object.values(lRels).find(r => r.type.endsWith('/slideMaster')); const master = masterRel ? await xml(masterRel.target) : null; const mRels = masterRel ? await relsOf(masterRel.target) : {};
    const maps = [await phMap(layout), await phMap(master)];
    let bg = bgOf(doc) || bgOf(layout) || bgOf(master); let bgCss = 'background:#fff;';
    if (bg && bg.color) bgCss = `background:${bg.color};`; else if (bg && bg.blip) { const u = await imgUrl(bgOf(doc) ? rels : bgOf(layout) ? lRels : mRels, bg.blip); if (u) bgCss = `background:#fff url(${u}) center/cover no-repeat;`; }
    let html = '';
    const walk = async (parent, tf, R = rels) => {
      for (const el of Array.from(parent.children)) {
        const ln = el.localName;
        if (ln === 'grpSp') { const gx = desc(kid(el, 'grpSpPr'), 'xfrm'); if (gx) { const g = n => kid(gx, n); const off = g('off'), ext = g('ext'), choff = g('chOff'), chext = g('chExt'); const sx = (+ext.getAttribute('cx')) / ((+chext.getAttribute('cx')) || 1), sy = (+ext.getAttribute('cy')) / ((+chext.getAttribute('cy')) || 1); const nt = { ox: tf.ox + (+off.getAttribute('x') - (+choff.getAttribute('x')) * sx) * tf.sx, oy: tf.oy + (+off.getAttribute('y') - (+choff.getAttribute('y')) * sy) * tf.sy, sx: tf.sx * sx, sy: tf.sy * sy }; await walk(el, nt, R); } else await walk(el, tf, R); continue; }
        if (!['sp', 'pic', 'graphicFrame', 'cxnSp'].includes(ln)) continue;
        const spPr = kid(el, 'spPr'); const k = phKey(el); let xf = xfrmOf(ln === 'graphicFrame' ? el : spPr); let ph = k ? findPh(maps, k) : null; if (!xf && ph) xf = ph.xfrm; if (!xf) continue;
        const L = (tf.ox + xf.x * tf.sx) * PX, T = (tf.oy + xf.y * tf.sy) * PX, W = xf.w * tf.sx * PX, H = xf.h * tf.sy * PX;
        const box = `position:absolute;left:${L.toFixed(1)}px;top:${T.toFixed(1)}px;width:${W.toFixed(1)}px;height:${H.toFixed(1)}px;${xf.rot ? `transform:rotate(${xf.rot}deg);` : ''}`;
        if (ln === 'pic') { const blip = desc(el, 'blip'); const id = blip && blip.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'embed'); const u = id ? await imgUrl(R, id) : null; if (u) html += `<img src="${u}" style="${box}object-fit:fill" alt="">`; continue; }
        if (ln === 'cxnSp') { const lnEl = desc(spPr, 'ln'); const c = lnEl ? (fillOf(lnEl) || '#888') : '#888'; const wpx = lnEl && lnEl.getAttribute('w') ? Math.max(1, +lnEl.getAttribute('w') * PX) : 1.5; html += `<div style="${box}"><svg width="100%" height="100%" viewBox="0 0 ${Math.max(W, 1)} ${Math.max(H, 1)}" preserveAspectRatio="none" style="overflow:visible;position:absolute;inset:0"><line x1="0" y1="${xf.flipH ? H : 0}" x2="${W}" y2="${xf.flipH ? 0 : H}" stroke="${c}" stroke-width="${wpx}"/></svg></div>`; continue; }
        if (ln === 'graphicFrame') { const tbl = desc(el, 'tbl'); if (!tbl) continue; const rowsHtml = Array.from(tbl.getElementsByTagNameNS('*', 'tr')).map(tr => `<tr>${kids(tr, 'tc').map(tc => { const f = fillOf(kid(tc, 'tcPr')); return `<td style="border:1px solid #bbb;padding:4px 6px;vertical-align:top;${f ? `background:${f};` : ''}">${paras(kid(tc, 'txBody'), 14, minorFont)}</td>`; }).join('')}</tr>`).join(''); html += `<div style="${box}"><table style="border-collapse:collapse;width:100%;font-family:'${minorFont || 'Calibri'}',Arial,sans-serif">${rowsHtml}</table></div>`; continue; }
        // shape
        let fill = fillOf(spPr); if (!fill && kid(spPr, 'noFill') == null) { const st = kid(el, 'style'); const fr = st ? kid(st, 'fillRef') : null; if (fr && +fr.getAttribute('idx') > 0 && !k) fill = color(fr); }
        const lnEl = kid(spPr, 'ln'); let border = ''; if (lnEl && !kid(lnEl, 'noFill')) { const c = fillOf(lnEl); if (c) border = `border:${Math.max(1, (+lnEl.getAttribute('w') || 12700) * PX).toFixed(1)}px solid ${c};`; }
        const geom = desc(spPr, 'prstGeom'); const g = geom ? geom.getAttribute('prst') : 'rect'; const radius = g === 'ellipse' ? 'border-radius:50%;' : g === 'roundRect' ? 'border-radius:12px;' : '';
        const body = kid(el, 'txBody'); const bodyPr = body ? kid(body, 'bodyPr') : null; const anchor = bodyPr ? bodyPr.getAttribute('anchor') : null;
        const ins = n => bodyPr && bodyPr.getAttribute(n) != null ? +bodyPr.getAttribute(n) * PX : null;
        const pad = `padding:${ins('tIns') ?? 4.8}px ${ins('rIns') ?? 9.6}px ${ins('bIns') ?? 4.8}px ${ins('lIns') ?? 9.6}px;`;
        const fontScale = (() => { const na = bodyPr ? kid(bodyPr, 'normAutofit') : null; return na && na.getAttribute('fontScale') ? +na.getAttribute('fontScale') / 100000 : 1; })();
        const defSize = (k && (masterSize(master, k.type))) || (k && /title/i.test(k.type) ? 44 : 18);
        const isTitle = k && /title/i.test(k.type); const face = isTitle ? majorFont : minorFont;
        const valign = (anchor || (isTitle ? 'ctr' : 't')) === 'ctr' ? 'center' : anchor === 'b' ? 'flex-end' : 'flex-start';
        const stl = kid(el, 'style'); const fRef = stl ? kid(stl, 'fontRef') : null; const inner = body ? paras(body, defSize * fontScale, face, k && /^(body|obj)$/.test(k.type), fRef ? color(fRef) : null) : '';
        if (!fill && !border && !inner) continue;
        html += `<div style="${box}${fill ? `background:${fill};` : ''}${border}${radius}box-sizing:border-box;${pad}display:flex;flex-direction:column;justify-content:${valign};overflow:visible">${inner}</div>`;
      }
    };
    const paras = (body, defSize, face, bullets, defColor) => {
      if (!body) return '';
      return kids(body, 'p').map(p => {
        const pPr = kid(p, 'pPr'); const algn = pPr ? pPr.getAttribute('algn') : null; const lvl = pPr ? +(pPr.getAttribute('lvl') || 0) : 0;
        const ta = algn === 'ctr' ? 'center' : algn === 'r' ? 'right' : algn === 'just' ? 'justify' : 'left';
        let maxSz = 0; const runsHtml = Array.from(p.children).map(r => {
          if (r.localName === 'br') return '<br>'; if (r.localName !== 'r' && r.localName !== 'fld') return '';
          const rPr = kid(r, 'rPr'); const t = kid(r, 't'); const txt = t ? t.textContent : ''; const sz = rPr && rPr.getAttribute('sz') ? +rPr.getAttribute('sz') / 100 * (defSize / (defSize || 1)) : defSize; maxSz = Math.max(maxSz, sz);
          const col = rPr ? color(kid(rPr, 'solidFill')) : null; const b = rPr && rPr.getAttribute('b') === '1', it = rPr && rPr.getAttribute('i') === '1', u = rPr && rPr.getAttribute('u') && rPr.getAttribute('u') !== 'none';
          const lat = rPr ? kid(rPr, 'latin') : null; const fnt = lat && lat.getAttribute('typeface') && !lat.getAttribute('typeface').startsWith('+') ? lat.getAttribute('typeface') : null;
          return `<span style="font-size:${(sz * 4 / 3).toFixed(1)}px;${col ? `color:${col};` : ''}${b ? 'font-weight:700;' : ''}${it ? 'font-style:italic;' : ''}${u ? 'text-decoration:underline;' : ''}${fnt ? `font-family:'${fnt}',Arial,sans-serif;` : ''}">${esc(txt)}</span>`;
        }).join('');
        const end = kid(p, 'endParaRPr'); if (!maxSz) maxSz = end && end.getAttribute('sz') ? +end.getAttribute('sz') / 100 : defSize;
        const hasBullet = pPr && kid(pPr, 'buChar') ? kid(pPr, 'buChar').getAttribute('char') : (bullets && runsHtml && !(pPr && kid(pPr, 'buNone')) ? '•' : null);
        return `<p style="margin:0 0 ${(maxSz * 0.25).toFixed(1)}px ${(lvl * 28 + (hasBullet ? 22 : 0))}px;text-align:${ta};line-height:1.15;font-size:${(maxSz * 4 / 3).toFixed(1)}px;font-family:'${face || 'Calibri'}',Calibri,Arial,sans-serif;color:${defColor || '#222'};${hasBullet ? 'text-indent:-18px;' : ''}">${hasBullet && runsHtml ? `<span>${esc(hasBullet)}&nbsp;&nbsp;</span>` : ''}${runsHtml || '&nbsp;'}</p>`;
      }).join('');
    };
    const tree = desc(desc(doc, 'cSld'), 'spTree'); if (tree) await walk(tree, { ox: 0, oy: 0, sx: 1, sy: 1 });
    // layout and master shapes that aren't placeholders (logos, bands) sit behind slide content
    let behind = ''; for (const [d, r] of [[master, mRels], [layout, lRels]]) { if (!d) continue; const t = desc(desc(d, 'cSld'), 'spTree'); if (!t) continue; const keep = html; html = ''; const clone = t.cloneNode(true); Array.from(clone.children).forEach(c => { if (phKey(c) || !['sp', 'pic', 'grpSp', 'cxnSp'].includes(c.localName)) c.remove(); }); await walk(clone, { ox: 0, oy: 0, sx: 1, sy: 1 }, r); behind += html; html = keep; }
    slides.push(`<div style="position:relative;width:${CX * PX}px;height:${CY * PX}px;overflow:hidden;${bgCss}font-family:'${minorFont || 'Calibri'}',Calibri,Arial,sans-serif">${behind}${html}</div>`);
  }
  return { w: CX * PX, h: CY * PX, slides, urls };
}

/* ================= state ================= */
const ENG = E[ENGINE]; if (!ENG) { appEl.innerHTML = '<p class="notice">This tool couldn’t start. Please reload the page.</p>'; return; }
const ACC = ACCEPT[ENG.accept] || ACCEPT.pdf;
const state = { files: [], pages: [], results: [], note: '', answer: null, busy: false, opts: {}, zoom: 150, marks: {}, edPage: 0, blankOverride: {}, cmp: null, facts: null, wmImage: null,
  sig: { tab: 'draw', pad: null, name: '', font: 'Caveat', color: 'black', upload: null, text: 'Your name' } };
ENG.opts.forEach(o => { if ('def' in o) state.opts[o.k] = o.def; });
try { const z = +localStorage.getItem('quire-zoom'); if (z >= 100 && z <= 260) state.zoom = z; } catch (e) {}
const libsMissing = () => !window.pdfjsLib || !window.PDFLib;

/* ================= rendering ================= */
function optField(o) {
  const v = state.opts[o.k]; const id = `o-${o.k}`; const hid = o.hideWhen && o.hideWhen(state.opts) ? 'hidden' : ''; const hint = o.hint ? `<p class="hint" id="${id}-hint">${o.hint}</p>` : '';
  switch (o.type) {
    case 'seg': return `<fieldset class="field" data-field="${o.k}" ${hid}><legend>${o.label}</legend><div class="seg">${o.choices.map(([val, lab], i) => `<label><input type="radio" name="${id}" id="${id}-${i}" data-opt="${o.k}" value="${val}" ${v === val ? 'checked' : ''}><span>${lab}</span></label>`).join('')}</div>${hint}</fieldset>`;
    case 'text': case 'password': return `<div class="field" data-field="${o.k}" ${hid}><label for="${id}">${o.label}</label><input class="inp" type="${o.type}" id="${id}" data-opt="${o.k}" value="${esc(v)}" placeholder="${esc(o.ph || '')}" autocomplete="${o.type === 'password' ? 'new-password' : 'off'}">${hint}</div>`;
    case 'textarea': return `<div class="field" data-field="${o.k}" ${hid}><label for="${id}">${o.label}</label><textarea class="inp" id="${id}" data-opt="${o.k}" placeholder="${esc(o.ph || '')}">${esc(v)}</textarea>${hint}</div>`;
    case 'number': return `<div class="field" data-field="${o.k}" ${hid}><label for="${id}">${o.label}</label><input class="inp" type="number" id="${id}" data-opt="${o.k}" value="${v}" min="${o.min}" max="${o.max}" inputmode="numeric">${hint}</div>`;
    case 'range': return `<div class="field" data-field="${o.k}" ${hid}><label for="${id}">${o.label}<output id="${id}-out">${v}${o.unit || ''}</output></label><input type="range" id="${id}" data-opt="${o.k}" data-unit="${o.unit || ''}" value="${v}" min="${o.min}" max="${o.max}" step="${o.step || 1}">${hint}</div>`;
    case 'select': return `<div class="field" data-field="${o.k}" ${hid}><label for="${id}">${o.label}</label><select class="inp" id="${id}" data-opt="${o.k}">${o.choices.map(([val, lab]) => `<option value="${val}" ${v === val ? 'selected' : ''}>${esc(lab)}</option>`).join('')}</select>${hint}</div>`;
    case 'check': return `<label class="check" data-field="${o.k}" ${hid}><input type="checkbox" id="${id}" data-opt="${o.k}" ${v ? 'checked' : ''}>${o.label}</label>`;
    case 'image': return `<div class="field" data-field="${o.k}" ${hid}><label>${o.label}</label>${state.wmImage ? `<img class="thumbimg" src="${state.wmImage.url}" alt="Watermark image">` : ''}<div class="row"><button class="btn btn-line btn-sm" data-act="wm-pick" type="button">${state.wmImage ? 'Change image' : 'Choose PNG or JPG'}</button></div><p class="hint">A PNG with a transparent background looks best.</p></div>`;
  }
  return '';
}
function optsHtml() { let h = ''; const L = ENG.opts; for (let i = 0; i < L.length; i++) { if (L[i].half && L[i + 1] && L[i + 1].half) { h += `<div class="two">${optField(L[i])}${optField(L[i + 1])}</div>`; i++; } else h += optField(L[i]); } return h; }

function render() {
  if (libsMissing()) { appEl.innerHTML = '<p class="notice">The PDF engine couldn’t load. Check your internet connection, turn off any content blocker for this site, and reload the page.</p>'; return; }
  const showWork = state.files.length || ENG.view === 'compare';
  if (!showWork) { renderDrop(); return; }
  if (!$('#table', appEl)) {
    appEl.innerHTML = `<div class="work"><section class="table" id="table" aria-label="Your files"><div class="tbar" id="tbar"></div><div class="tbody" id="tbody"></div></section>
      <aside class="side" aria-label="Settings"><div class="side-scroll" id="insp"></div><div class="runbox"><button class="btn btn-brand btn-block" id="run" data-act="run" type="button">${esc(ENG.verb)}</button><div class="prog" aria-hidden="true"><i id="progBar"></i></div><p class="status" id="status" role="status"></p></div></aside></div>
      <section class="output" id="output" hidden aria-live="polite"></section>`;
  }
  renderInspector(); renderTable(); renderOutput();
}
function renderDrop() {
  const many = ENG.multi; const what = many ? ACC.nouns : ACC.noun;
  appEl.innerHTML = `<div class="dropzone" id="drop">
    <button class="btn btn-brand" data-act="pick" type="button">${icon('upload')}Select ${esc(what)}</button>
    <p>or drop ${many ? 'them' : 'it'} here</p>
    <p class="types">${esc(ACC.label)}${ENG.accept === 'docx' ? ' · not ' + OLD_FMT.doc : ENG.accept === 'pptx' ? ' · not ' + OLD_FMT.ppt : ''}</p>
    <div class="dz-alt">${hasSample() ? `<button class="btn btn-quiet btn-sm" data-act="sample" type="button">Try a sample${ENG.sample === 'locked' ? ' (password: quire)' : ''}</button>` : ''}${ENG.paste ? `<button class="btn btn-quiet btn-sm" data-act="paste-open" type="button">${icon('text')}Paste ${ENG.paste === 'html' ? 'HTML code' : 'text'} instead</button>` : ''}</div>
    <div class="paste" id="paste" hidden><label class="sr" for="pasteBox">Paste here</label><textarea id="pasteBox" placeholder="${ENG.paste === 'html' ? '<h1>Hello</h1><p>Paste your HTML here…</p>' : 'Paste or type your text here…'}"></textarea><button class="btn btn-brand" data-act="paste-use" type="button">Use this ${ENG.paste === 'html' ? 'HTML' : 'text'}</button></div>
    <p class="status" id="status" role="status"></p>
  </div>`;
}
const hasSample = () => { const s = ENG.sample || (ENG.accept === 'pdf' ? 'pdf' : null); if (!s) return false; if (ENGINE === 'images' && ENG.accept === 'gif') return false; return true; };

function renderInspector() {
  const ins = $('#insp'); if (!ins) return; let extra = '';
  if (ENGINE === 'organize') extra = `<div class="isec"><h2>Page actions</h2><div class="row"><button class="btn btn-line btn-sm" data-act="org-reverse" type="button">Reverse order</button><button class="btn btn-line btn-sm" data-act="org-rotall" type="button">Turn all ↻</button></div><div class="row"><button class="btn btn-line btn-sm" data-act="org-blank" type="button">Add blank page</button><button class="btn btn-line btn-sm" data-act="org-reset" type="button">Restore original</button></div><p class="hint">Each page has its own move, turn, copy and delete buttons.</p></div>`;
  if (ENGINE === 'blank') extra = `<div class="isec"><h2>Found</h2><p class="hint" id="blankInfo">Checking pages…</p></div>`;
  if (ENGINE === 'info' && state.facts) extra = `<div class="isec"><h2>File facts</h2><dl class="facts">${state.facts.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl></div>`;
  if (ENGINE === 'sign') extra = signPanel();
  if (ENGINE === 'redact') extra = `<div class="isec"><h2>How to redact</h2><p class="hint">Drag across the page to draw a box. Drag a box to move it, use its corner to resize, or its × to remove it.</p><div class="row"><button class="btn btn-line btn-sm" data-act="mk-clear" type="button">Clear this page</button></div></div>`;
  ins.innerHTML = `${ENG.opts.length ? `<div class="isec"><h2>Settings</h2>${optsHtml()}</div>` : ''}${extra}${!ENG.opts.length && !extra ? `<div class="isec"><h2>Settings</h2><p class="hint">${esc(ENG.empty || 'No settings needed.')}</p></div>` : ''}${ENG.caveat ? `<div class="isec"><p class="hint">${esc(ENG.caveat)}</p></div>` : ''}`;
  if (ENGINE === 'sign') initSigPad(); if (ENGINE === 'blank') updateBlankInfo();
}
function tbarHtml() {
  const f = state.files; if (ENG.view === 'compare') return `<div class="sum"><b>Two versions</b><span class="mono">PDF</span></div>${f.length ? '<button class="btn btn-quiet btn-sm" data-act="cmp-swap" type="button">Swap</button><button class="btn btn-quiet btn-sm" data-act="clear" type="button">Clear</button>' : ''}`;
  const pages = f.reduce((a, x) => a + (x.pages || (x.frames ? x.frames.length : 0)), 0); const total = f.reduce((a, x) => a + x.size, 0);
  const name = f.length === 1 ? esc(f[0].name) : plural(f.length, ACC.noun.split(' ').pop());
  const zoom = ['pages', 'pick', 'organize', 'files'].includes(ENG.view);
  return `<div class="sum"><b title="${f.length === 1 ? esc(f[0].name) : ''}">${name}</b><span class="mono">${pages ? plural(pages, f[0].kind === 'pdf' ? 'page' : 'image') + ' · ' : ''}${fmtSize(total)}${f[0].locked ? ' · locked' : ''}</span></div>
    ${zoom ? `<label class="zoom"><span class="sr">Thumbnail size</span>${icon('grid')}<input type="range" id="zoom" min="100" max="260" step="10" value="${state.zoom}"></label>` : ''}
    <button class="btn btn-line btn-sm" data-act="pick" type="button">${icon(ENG.multi ? 'plus' : 'upload')}${ENG.multi ? 'Add more' : 'Replace'}</button><button class="btn btn-quiet btn-sm" data-act="clear" type="button">Clear</button>`;
}
function renderTable() {
  const tb = $('#tbody'); if (!tb) return; $('#tbar').innerHTML = tbarHtml();
  if (ENG.view === 'compare') { tb.innerHTML = compareHtml(); return; }
  const f = state.files[0]; if (!f) return;
  if (f.locked) { tb.innerHTML = `<div class="sheets" style="--thumb:${state.zoom}px"><figure class="pg"><div class="sheet locked">${icon('lock')}</div><figcaption><b>${esc(f.name)}</b></figcaption></figure></div><p class="hint" style="text-align:center;margin-top:18px">This PDF is password-protected. Type the password in Settings, then press “${esc(ENG.verb)}”.</p>`; return; }
  if (ENG.view === 'files') { tb.innerHTML = filesHtml(); return; }
  ensureThumbs(f);
  if (ENG.view === 'editor') { renderEditor(); return; }
  tb.innerHTML = ENG.view === 'organize' ? organizeHtml(f) : pagesHtml(f);
  if (ENG.view === 'pick') refreshPick();
}
function sheetHtml(f, i, extraStyle, ovHtml) { const s = f.sizes[i] || f.sizes[0] || [595, 842]; const th = f.pageThumbs && f.pageThumbs[i]; return `<div class="sheet" data-sheet="${f.id}-${i}" style="aspect-ratio:${s[0]}/${s[1]};${extraStyle || ''}">${th ? `<img src="${th}" alt="" data-img>` : `<i class="ph" data-ph="${f.id}-${i}"></i>`}<div class="ov">${ovHtml || ''}</div></div>`; }
function pagesHtml(f) {
  const max = Math.min(f.pages, 400);
  return `<div class="sheets ${ENG.view === 'pick' ? 'pickable' : ''}" id="grid" style="--thumb:${state.zoom}px">${Array.from({ length: max }, (_, i) => { const s = f.sizes[i] || f.sizes[0] || [595, 842]; const pv = ENG.preview ? ENG.preview(state.opts, i, f, s[0], s[1]) : null; return `<figure class="pg" data-p="${i}" ${ENG.view === 'pick' ? 'role="button" tabindex="0"' : ''}>${sheetHtml(f, i, pv && pv.sheet, pv && pv.ov)}<figcaption>${i + 1}</figcaption></figure>`; }).join('')}</div>${f.pages > max ? `<p class="hint" style="text-align:center;margin-top:16px">Showing the first ${max} of ${f.pages} pages. All pages are processed.</p>` : ''}`;
}
function refreshPreviews() {
  const f = state.files[0]; if (!ENG.preview || !f || f.locked) return;
  $$('#grid .pg').forEach(fig => { const i = +fig.dataset.p; const s = f.sizes[i] || f.sizes[0]; const pv = ENG.preview(state.opts, i, f, s[0], s[1]) || {}; const sh = fig.querySelector('.sheet'); sh.style.cssText = `aspect-ratio:${s[0]}/${s[1]};${pv.sheet || ''}`; fig.querySelector('.ov').innerHTML = pv.ov || ''; const img = sh.querySelector('img'); if (img) img.style.cssText = pv.img || ''; });
}
function filesHtml() {
  const n = state.files.length;
  return `<div class="sheets" id="grid" style="--thumb:${state.zoom}px">${state.files.map((f, i) => {
    const s = f.kind === 'img' ? [f.w, f.h] : (f.sizes && f.sizes[0]) || [595, 842];
    const sheet = f.kind === 'doc' ? `<div class="sheet doc">${TOOL.icon || ''}</div>` : f.locked ? `<div class="sheet locked">${icon('lock')}</div>` : `<div class="sheet" style="aspect-ratio:${s[0]}/${s[1]}"><img src="${f.thumb}" alt=""></div>`;
    const meta = f.kind === 'pdf' ? plural(f.pages, 'page') : f.kind === 'img' ? (f.frames && f.frames.length > 1 ? plural(f.frames.length, 'page') : `${f.w} × ${f.h}`) : (f.text != null ? plural(f.text.length, 'character') : f.ext.toUpperCase());
    return `<figure class="pg" ${n > 1 || ENG.multi ? 'draggable="true"' : ''} data-i="${i}">${ENG.multi ? `<span class="order">${i + 1}</span>` : ''}${sheet}<figcaption><b title="${esc(f.name)}">${esc(f.name)}</b></figcaption><span class="mono" style="color:var(--muted);font-size:11px">${meta} · ${fmtSize(f.size)}</span>
      <div class="acts">${ENG.multi ? `<button class="mini" data-act="mv" data-i="${i}" data-d="-1" aria-label="Move ${esc(f.name)} earlier" ${i === 0 ? 'disabled' : ''} type="button">←</button>` : ''}<button class="mini del" data-act="rm" data-i="${i}" aria-label="Remove ${esc(f.name)}" type="button">✕</button>${ENG.multi ? `<button class="mini" data-act="mv" data-i="${i}" data-d="1" aria-label="Move ${esc(f.name)} later" ${i === n - 1 ? 'disabled' : ''} type="button">→</button>` : ''}</div></figure>`;
  }).join('')}</div>`;
}
function organizeHtml(f) {
  const n = state.pages.length;
  return `<p class="hint" style="margin:0 0 20px">${plural(n, 'page')} in the new file. Drag a page to move it.</p><div class="sheets" id="grid" style="--thumb:${state.zoom}px">${state.pages.map((p, i) => {
    const sw = p.rot % 180 ? ' scale(.74)' : ''; const sheet = p.src < 0 ? `<div class="sheet" style="aspect-ratio:${(f.sizes[0] || [595, 842]).join('/')};transform:rotate(${p.rot}deg)${sw}"><div class="ov"></div></div>` : sheetHtml(f, p.src, `transform:rotate(${p.rot}deg)${sw}`);
    return `<figure class="pg" draggable="true" data-i="${i}">${p.src < 0 ? '<span class="tag">Blank</span>' : p.dup ? '<span class="tag">Copy</span>' : ''}${sheet}<figcaption>${p.src < 0 ? 'new' : 'p. ' + (p.src + 1)}${p.rot ? ` · ${p.rot}°` : ''}</figcaption>
      <div class="acts"><button class="mini" data-act="pg-mv" data-i="${i}" data-d="-1" aria-label="Move earlier" ${i === 0 ? 'disabled' : ''} type="button">←</button><button class="mini" data-act="pg-rot" data-i="${i}" aria-label="Turn page" type="button">↻</button><button class="mini" data-act="pg-dup" data-i="${i}" aria-label="Copy page" type="button">⧉</button><button class="mini del" data-act="pg-del" data-i="${i}" aria-label="Delete page" type="button">✕</button><button class="mini" data-act="pg-mv" data-i="${i}" data-d="1" aria-label="Move later" ${i === n - 1 ? 'disabled' : ''} type="button">→</button></div></figure>`;
  }).join('')}</div>`;
}
const buildPages = () => { const f = state.files[0]; state.pages = f && !f.locked ? Array.from({ length: f.pages }, (_, i) => ({ src: i, rot: 0 })) : []; };

/* pick views */
function refreshPick() {
  const f = state.files[0]; if (!f) return;
  if (ENGINE === 'split') {
    const o = state.opts; const hint = $('#o-ranges-hint'); let groups = [];
    if (o.mode === 'each') groups = Array.from({ length: f.pages }, (_, i) => ({ idx: [i] }));
    else { try { groups = parseRanges(o.ranges, f.pages); if (hint) { hint.className = 'hint'; hint.textContent = `Click pages to pick them. This file has ${plural(f.pages, 'page')}.`; } } catch (e) { if (hint) { hint.className = 'hint err'; hint.textContent = e.message; } } }
    const owner = {}; groups.forEach((g, gi) => g.idx.forEach(i => { if (!(i in owner)) owner[i] = gi + 1; }));
    $$('#grid .pg').forEach(fig => { const i = +fig.dataset.p; const on = i in owner; fig.classList.toggle('on', on); fig.setAttribute('aria-pressed', on); let tag = fig.querySelector('.tag'); if (on && o.mode === 'ranges' && groups.length > 1) { if (!tag) { tag = document.createElement('span'); tag.className = 'tag'; fig.prepend(tag); } tag.textContent = 'File ' + owner[i]; } else if (tag) tag.remove(); });
  } else if (ENGINE === 'blank') {
    const drop = blankSet(f);
    $$('#grid .pg').forEach(fig => { const i = +fig.dataset.p; const d = drop.has(i); fig.classList.toggle('drop-me', d); fig.classList.add('on'); fig.setAttribute('aria-pressed', d); let tag = fig.querySelector('.tag'); if (d) { if (!tag) { tag = document.createElement('span'); tag.className = 'tag warn'; fig.prepend(tag); } tag.textContent = 'Remove'; } else if (tag) tag.remove(); });
    updateBlankInfo();
  }
}
function updateBlankInfo() { const el = $('#blankInfo'); const f = state.files[0]; if (!el || !f) return; const done = f.ink ? f.ink.filter(v => v != null).length : 0; const d = blankSet(f); el.textContent = done < f.pages ? `Checking pages… ${done} of ${f.pages}` : d.size ? `${plural(d.size, 'page')} marked to remove: ${runs([...d].sort((a, b) => a - b).map(i => i + 1))}. Click a page to change it.` : 'No blank pages found. Click any page to mark it yourself.'; }
function pickPage(i) {
  const f = state.files[0];
  if (ENGINE === 'split') {
    const o = state.opts; if (o.mode === 'each') { o.mode = 'ranges'; const r = $('#o-mode-0'); if (r) r.checked = true; const fr = $('[data-field="ranges"]'); if (fr) fr.hidden = false; }
    const sel = new Set(); try { parseRanges(o.ranges, f.pages).forEach(g => g.idx.forEach(x => sel.add(x))); } catch (e) {}
    sel.has(i) ? sel.delete(i) : sel.add(i); o.ranges = runs([...sel].sort((a, b) => a - b).map(x => x + 1)); const inp = $('#o-ranges'); if (inp) inp.value = o.ranges;
  } else if (ENGINE === 'blank') { state.blankOverride[i] = !blankSet(f).has(i); }
  refreshPick();
}
async function ensureThumbs(f) {
  if (f.thumbing || f.locked || !f.view) return; f.thumbing = true;
  for (let i = 0; i < Math.min(f.pages, 400); i++) {
    if (f.pageThumbs[i]) continue; if (!state.files.includes(f)) break;
    try {
      const r = await renderPage(f.view, i + 1, { width: 240 }); f.sizes[i] = [r.w, r.h]; f.ink[i] = inkRatio(r.canvas); f.pageThumbs[i] = r.canvas.toDataURL('image/jpeg', 0.78); r.canvas.width = 0;
      $$(`[data-ph="${f.id}-${i}"]`).forEach(ph => { const img = document.createElement('img'); img.src = f.pageThumbs[i]; img.alt = ''; img.dataset.img = ''; ph.replaceWith(img); });
      $$(`[data-sheet="${f.id}-${i}"]`).forEach(sh => { sh.style.aspectRatio = `${r.w}/${r.h}`; });
      if (ENGINE === 'blank' && (i % 4 === 3 || i === f.pages - 1)) refreshPick();
      if (ENG.preview && i === 0) refreshPreviews();
    } catch (e) { f.ink[i] = 1; }
  }
  if (ENGINE === 'blank') { for (let i = 400; i < f.pages; i++) f.ink[i] = 1; refreshPick(); }
  f.thumbing = false;
}

/* ================= editor (sign & redact) ================= */
function renderEditor() {
  const f = state.files[0]; const tb = $('#tbody'); const p = Math.min(state.edPage, f.pages - 1); state.edPage = p; const s = f.sizes[p] || f.sizes[0] || [595, 842];
  tb.innerHTML = `<div class="ed"><div class="strip" aria-label="Pages">${Array.from({ length: Math.min(f.pages, 400) }, (_, i) => { const c = (state.marks[i] || []).length; return `<button data-act="ed-go" data-i="${i}" aria-current="${i === p}" aria-label="Page ${i + 1}" type="button">${c ? `<span class="cnt">${c}</span>` : ''}${sheetHtml(f, i)}<span class="n">${i + 1}</span></button>`; }).join('')}</div>
    <div class="ed-main"><div class="ed-nav"><button class="mini" data-act="ed-go" data-i="${p - 1}" ${p === 0 ? 'disabled' : ''} aria-label="Previous page" type="button">‹</button><span class="mono">Page ${p + 1} of ${f.pages}</span><button class="mini" data-act="ed-go" data-i="${p + 1}" ${p === f.pages - 1 ? 'disabled' : ''} aria-label="Next page" type="button">›</button></div>
      <div class="ed-page" id="edPage" style="aspect-ratio:${s[0]}/${s[1]}"><canvas id="edCanvas"></canvas><div class="ed-ov ${ENGINE === 'redact' ? 'drawable' : ''}" id="edOv"></div></div>
      <p class="hint">${ENGINE === 'redact' ? 'Drag across the page to cover something.' : 'Add items from Settings, then drag them into place. Double-click text to edit it.'}</p></div></div>`;
  renderMarks(); drawEdPage();
}
let edToken = 0;
async function drawEdPage() { const f = state.files[0]; const cv = $('#edCanvas'); const box = $('#edPage'); if (!cv || !box) return; const tok = ++edToken; const W = box.clientWidth * Math.min(2, devicePixelRatio || 1); try { const r = await renderPage(f.view, state.edPage + 1, { width: W }); if (tok !== edToken || !document.body.contains(cv)) return; cv.width = r.canvas.width; cv.height = r.canvas.height; cv.getContext('2d').drawImage(r.canvas, 0, 0); box.style.aspectRatio = `${r.w}/${r.h}`; r.canvas.width = 0; } catch (e) {} }
function renderMarks() {
  const ov = $('#edOv'); if (!ov) return; const list = state.marks[state.edPage] || []; const white = state.opts.fill === 'white';
  ov.innerHTML = list.map(m => `<div class="mk ${m.type === 'box' ? 'mk-box' + (white ? ' white' : '') : ''}" data-id="${m.id}" style="left:${m.x * 100}%;top:${m.y * 100}%;width:${m.w * 100}%;height:${m.h * 100}%">${m.type === 'sig' ? `<img src="${m.src}" alt="Signature">` : m.type === 'box' ? '' : `<span class="mk-t" style="font-size:${m.h * 74}cqh" spellcheck="false">${esc(m.text)}</span>`}<button class="mk-x" data-act="mk-del" data-id="${m.id}" aria-label="Remove" type="button">×</button><span class="mk-r" data-r="1"></span></div>`).join('');
  $$('.strip button').forEach(b => { const i = +b.dataset.i; const c = (state.marks[i] || []).length; let cnt = b.querySelector('.cnt'); if (c) { if (!cnt) { cnt = document.createElement('span'); cnt.className = 'cnt'; b.prepend(cnt); } cnt.textContent = c; } else if (cnt) cnt.remove(); });
}
const addMark = m => { const k = state.edPage; (state.marks[k] = state.marks[k] || []).push(Object.assign({ id: uid() }, m)); renderMarks(); };
let drag = null;
document.addEventListener('pointerdown', e => {
  const ov = e.target.closest('#edOv'); if (!ov || e.button > 0 || e.target.closest('.mk-x')) return;
  const mk = e.target.closest('.mk'); const rect = ov.getBoundingClientRect(); const fx = (e.clientX - rect.left) / rect.width, fy = (e.clientY - rect.top) / rect.height; const list = state.marks[state.edPage] || [];
  if (mk) { const tEl = e.target.closest('.mk-t'); if (tEl && tEl.isContentEditable) return; const m = list.find(x => x.id === mk.dataset.id); if (!m) return; drag = { kind: e.target.dataset.r ? 'resize' : 'move', m, el: mk, sx: fx, sy: fy, ox: m.x, oy: m.y, ow: m.w, oh: m.h, rect }; $$('.mk.active').forEach(n => n.classList.remove('active')); mk.classList.add('active'); }
  else if (ENGINE === 'redact') { const el = document.createElement('div'); el.className = 'drawing'; ov.appendChild(el); drag = { kind: 'draw', el, sx: fx, sy: fy, rect }; }
  else { $$('.mk.active').forEach(n => n.classList.remove('active')); return; }
  ov.setPointerCapture(e.pointerId); e.preventDefault();
});
document.addEventListener('pointermove', e => {
  if (!drag) return; const r = drag.rect; const fx = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), fy = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
  if (drag.kind === 'draw') { const x = Math.min(fx, drag.sx), y = Math.min(fy, drag.sy), w = Math.abs(fx - drag.sx), h = Math.abs(fy - drag.sy); Object.assign(drag.el.style, { left: x * 100 + '%', top: y * 100 + '%', width: w * 100 + '%', height: h * 100 + '%' }); drag.cur = { x, y, w, h }; }
  else if (drag.kind === 'move') { const m = drag.m; m.x = Math.max(0, Math.min(1 - m.w, drag.ox + fx - drag.sx)); m.y = Math.max(0, Math.min(1 - m.h, drag.oy + fy - drag.sy)); drag.el.style.left = m.x * 100 + '%'; drag.el.style.top = m.y * 100 + '%'; }
  else { const m = drag.m; let w = Math.max(0.02, Math.min(1 - m.x, drag.ow + fx - drag.sx)); if (m.type === 'box') { m.w = w; m.h = Math.max(0.01, Math.min(1 - m.y, drag.oh + fy - drag.sy)); } else { const ratio = drag.oh / drag.ow; if (m.y + w * ratio > 1) w = (1 - m.y) / ratio; m.w = w; m.h = w * ratio; const tt = drag.el.querySelector('.mk-t'); if (tt) tt.style.fontSize = m.h * 74 + 'cqh'; } drag.el.style.width = m.w * 100 + '%'; drag.el.style.height = m.h * 100 + '%'; }
});
document.addEventListener('pointerup', () => { if (!drag) return; if (drag.kind === 'draw') { drag.el.remove(); const c = drag.cur; if (c && c.w > 0.008 && c.h > 0.006) addMark(Object.assign({ type: 'box' }, c)); } drag = null; });
document.addEventListener('dblclick', e => { const tEl = e.target.closest('.mk-t'); if (!tEl) return; tEl.contentEditable = 'true'; tEl.focus(); const sel = getSelection(); const rg = document.createRange(); rg.selectNodeContents(tEl); sel.removeAllRanges(); sel.addRange(rg); });
document.addEventListener('focusout', e => { const tEl = e.target.closest && e.target.closest('.mk-t'); if (!tEl) return; tEl.contentEditable = 'false'; const id = tEl.closest('.mk').dataset.id; const m = (state.marks[state.edPage] || []).find(x => x.id === id); if (m) { m.text = tEl.textContent.trim() || m.text; tEl.textContent = m.text; } });

function signPanel() {
  const s = state.sig; const tab = (k, l) => `<label><input type="radio" name="sigtab" value="${k}" data-sig="tab" ${s.tab === k ? 'checked' : ''}><span>${l}</span></label>`;
  return `<div class="isec"><h2>Your signature</h2><div class="seg" role="radiogroup" aria-label="Signature method">${tab('draw', 'Draw')}${tab('type', 'Type')}${tab('upload', 'Upload')}</div>
    <div ${s.tab === 'draw' ? '' : 'hidden'}><canvas class="pad" id="sigPad" width="700" height="250" aria-label="Draw your signature here"></canvas><div class="row" style="margin-top:8px"><button class="btn btn-quiet btn-sm" data-act="sig-clear" type="button">Clear</button></div></div>
    <div ${s.tab === 'type' ? '' : 'hidden'} class="field"><label for="sigName">Type your name</label><input class="inp" id="sigName" data-sig="name" value="${esc(s.name)}" placeholder="Jane Doe" autocomplete="name"><div class="seg">${['Caveat', 'Dancing Script'].map(fn => `<label><input type="radio" name="sigfont" value="${fn}" data-sig="font" ${s.font === fn ? 'checked' : ''}><span style="font-family:'${fn}',cursive;font-size:18px">${esc(s.name || 'Signature')}</span></label>`).join('')}</div></div>
    <div ${s.tab === 'upload' ? '' : 'hidden'} class="field">${s.upload ? `<img class="thumbimg" src="${s.upload}" alt="Uploaded signature">` : ''}<div class="row"><button class="btn btn-line btn-sm" data-act="sig-upload" type="button">${s.upload ? 'Change image' : 'Choose an image'}</button></div><p class="hint">A photo of your signature on white paper works; the white becomes transparent.</p></div>
    <fieldset class="field"><legend>Ink</legend><div class="seg">${[['black', 'Black'], ['blue', 'Blue']].map(([k, l]) => `<label><input type="radio" name="sigcolor" value="${k}" data-sig="color" ${s.color === k ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div></fieldset>
    <button class="btn btn-brand" data-act="place-sig" type="button">${icon('sign')}Place signature on page</button></div>
    <div class="isec"><h2>Text & date</h2><div class="field"><label for="markText">Text</label><input class="inp" id="markText" data-sig="text" value="${esc(s.text)}"></div><div class="row"><button class="btn btn-line btn-sm" data-act="place-text" type="button">Add text</button><button class="btn btn-line btn-sm" data-act="place-date" type="button">Add today’s date</button></div><button class="btn btn-quiet btn-sm" data-act="mk-clear" type="button">Clear this page</button></div>`;
}
function initSigPad() {
  const c = $('#sigPad'); if (!c) return; const ctx = c.getContext('2d'); if (state.sig.pad) { const im = new Image(); im.onload = () => ctx.drawImage(im, 0, 0); im.src = state.sig.pad; }
  let down = false, last = null; const pt = e => { const r = c.getBoundingClientRect(); return [(e.clientX - r.left) * c.width / r.width, (e.clientY - r.top) * c.height / r.height]; };
  c.addEventListener('pointerdown', e => { down = true; last = pt(e); c.setPointerCapture(e.pointerId); ctx.beginPath(); ctx.arc(last[0], last[1], 2.2, 0, 7); ctx.fillStyle = '#111'; ctx.fill(); });
  c.addEventListener('pointermove', e => { if (!down) return; const p = pt(e); ctx.strokeStyle = '#111'; ctx.lineWidth = 4.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(last[0], last[1]); ctx.lineTo(p[0], p[1]); ctx.stroke(); last = p; });
  const end = () => { if (down) { down = false; state.sig.pad = c.toDataURL('image/png'); } }; c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
}
function trimCanvas(c) { const ctx = c.getContext('2d', { willReadFrequently: true }); const { width: w, height: h } = c; const d = ctx.getImageData(0, 0, w, h).data; let x0 = w, y0 = h, x1 = -1, y1 = -1; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 12) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } if (x1 < 0) return null; const p = 6; x0 = Math.max(0, x0 - p); y0 = Math.max(0, y0 - p); x1 = Math.min(w - 1, x1 + p); y1 = Math.min(h - 1, y1 + p); const o = document.createElement('canvas'); o.width = x1 - x0 + 1; o.height = y1 - y0 + 1; o.getContext('2d').drawImage(c, x0, y0, o.width, o.height, 0, 0, o.width, o.height); return o; }
async function signatureImage() {
  const s = state.sig; const ink = s.color === 'blue' ? '#1B3FA0' : '#111318'; const c = document.createElement('canvas'); let ctx;
  if (s.tab === 'draw') { if (!s.pad) throw new Error('Draw your signature in the box first.'); const im = new Image(); im.src = s.pad; await im.decode(); c.width = im.width; c.height = im.height; ctx = c.getContext('2d'); ctx.drawImage(im, 0, 0); }
  else if (s.tab === 'type') { if (!s.name.trim()) throw new Error('Type your name first.'); await document.fonts.load(`600 120px "${s.font}"`); c.width = 1600; c.height = 360; ctx = c.getContext('2d'); ctx.font = `600 150px "${s.font}", cursive`; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; ctx.fillText(s.name.trim(), 30, 190); }
  else { if (!s.upload) throw new Error('Choose an image of your signature first.'); const im = new Image(); im.src = s.upload; await im.decode(); const sc = Math.min(1, 1400 / im.width); c.width = im.width * sc; c.height = im.height * sc; ctx = c.getContext('2d'); ctx.drawImage(im, 0, 0, c.width, c.height); const id = ctx.getImageData(0, 0, c.width, c.height); const d = id.data; for (let i = 0; i < d.length; i += 4) { const l = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114; d[i + 3] = l > 200 ? 0 : l > 150 ? Math.round((200 - l) * 5.1) : 255; } ctx.putImageData(id, 0, 0); }
  ctx.globalCompositeOperation = 'source-in'; ctx.fillStyle = ink; ctx.fillRect(0, 0, c.width, c.height);
  const t = trimCanvas(c); if (!t) throw new Error('The signature is empty. Draw or type it first.'); return { src: t.toDataURL('image/png'), aspect: t.width / t.height };
}

/* ================= compare ================= */
function compareHtml() {
  const slot = (k, title) => { const f = state.files[k]; return `<div class="slot"><h3>${title}</h3>${f ? `<div class="sheet" style="aspect-ratio:${(f.sizes[0] || [595, 842]).join('/')}"><img src="${f.thumb}" alt=""></div><span class="meta"><b>${esc(f.name)}</b><span class="mono">${plural(f.pages, 'page')}</span></span><button class="btn btn-line btn-sm" data-act="slot" data-i="${k}" type="button">Replace</button>` : `<div class="empty"><div><p class="hint" style="margin-bottom:10px">${k ? 'The newer or edited copy' : 'The earlier copy'}</p><button class="btn btn-brand btn-sm" data-act="slot" data-i="${k}" type="button">${icon('upload')}Choose PDF</button></div></div>`}</div>`; };
  let h = `<div class="cmp">${slot(0, 'Original')}${slot(1, 'Changed version')}</div>`;
  if (!state.files.length) h += `<p class="hint" style="text-align:center;margin-top:16px">Drop two PDFs here, or <button class="btn btn-quiet btn-sm" data-act="sample" type="button">try a sample pair</button></p>`;
  if (state.cmp) h += `<div class="diffs"><h3>Page by page</h3><div class="legend"><span><i style="background:#E22E3C"></i>New in changed version</span><span><i style="background:#1E88E5"></i>Removed from original</span></div><div class="sheets" style="--thumb:${state.zoom + 20}px">${state.cmp.map(p => `<figure class="pg">${p.changed ? '<span class="tag warn">Changed</span>' : ''}<div class="sheet"><img src="${p.url}" alt="Differences on page ${p.i}"></div><figcaption>Page ${p.i} · ${esc(p.note)}</figcaption></figure>`).join('')}</div></div>`;
  return h;
}

/* ================= output ================= */
function mdToHtml(md) {
  const lines = esc(md).split('\n'); let out = '', list = false;
  lines.forEach(l => { const b = l.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'); if (/^#{1,3} /.test(l)) { if (list) { out += '</ul>'; list = false; } out += `<h3>${b.replace(/^#+ /, '')}</h3>`; } else if (/^\s*[-*•] /.test(l)) { if (!list) { out += '<ul>'; list = true; } out += `<li>${b.replace(/^\s*[-*•] /, '')}</li>`; } else if (!l.trim()) { if (list) { out += '</ul>'; list = false; } } else { if (list) { out += '</ul>'; list = false; } out += `<p>${b}</p>`; } });
  return out + (list ? '</ul>' : '');
}
function renderOutput() {
  const el = $('#output'); if (!el) return; if (!state.results.length) { el.hidden = true; el.innerHTML = ''; return; }
  const R = state.results; const multi = R.length > 1; const pdfOne = R.length === 1 && extOf(R[0].name) === 'pdf' && !R[0].noPreview; el.hidden = false;
  el.innerHTML = `<div class="out-head"><div><h2>${multi ? `${R.length} files ready` : 'Done! Your file is ready.'}</h2><p>${esc(state.note)}</p></div>
    <div class="row">${multi ? `<button class="btn btn-brand btn-lg" data-act="save-all" type="button">${icon('save')}Download all (ZIP)</button>` : `<button class="btn btn-brand btn-lg" data-act="save" data-i="0" type="button">${icon('save')}Download ${esc(extOf(R[0].name).toUpperCase())}</button>`}${pdfOne ? `<button class="btn btn-line btn-lg" data-act="continue" type="button">${icon('next')}Continue with…</button>` : ''}<button class="btn btn-quiet" data-act="again" type="button">Start over</button></div></div>
    ${state.answer ? `<div class="answer">${mdToHtml(state.answer)}</div>` : ''}
    <ul class="outs" ${state.answer ? 'style="margin-top:14px"' : ''}>${R.slice(0, 300).map((r, i) => `<li>${r.thumb ? `<img class="th" src="${r.thumb}" alt="">` : `<span class="th">${esc(extOf(r.name).toUpperCase())}</span>`}<div class="meta"><b title="${esc(r.name)}">${esc(r.name)}</b><span class="mono">${fmtSize(r.bytes.length)}</span></div><div class="row" style="flex-wrap:nowrap">${r.noPreview ? '' : `<button class="mini" data-act="view" data-i="${i}" aria-label="Preview ${esc(r.name)}" type="button">${icon('eye')}</button>`}<button class="mini" data-act="save" data-i="${i}" aria-label="Download ${esc(r.name)}" type="button">${icon('save')}</button></div></li>`).join('')}</ul>
    ${R.length > 300 ? `<p class="hint" style="margin-top:10px">Showing the first 300. The ZIP holds all ${R.length}.</p>` : ''}`;
}
async function makeThumbs(list) {
  for (const r of list.slice(0, 80)) { try { const e = extOf(r.name); if (e === 'jpg' || e === 'png') r.thumb = URL.createObjectURL(new Blob([r.bytes], { type: MIME[e] })); else if (e === 'pdf' && !r.noPreview) { const d = await openView(r.bytes); const { canvas } = await renderPage(d, 1, { width: 100 }); r.thumb = canvas.toDataURL('image/jpeg', 0.8); d.destroy(); } } catch (e) {} }
}

/* ================= adding files ================= */
async function makeItem(file) {
  const ext = extOf(file.name); const isPdf = ext === 'pdf' || file.type === 'application/pdf';
  const ok = ACC.exts.includes(ext) || (isPdf && ENG.accept === 'pdf') || (ENG.accept === 'img' && /^image\//.test(file.type));
  if (!ok) { if (OLD_FMT[ext]) throw new Error(`${file.name} is a ${OLD_FMT[ext]} file. Save it as ${ext === 'doc' ? '.docx' : '.pptx'} first, then try again.`); throw new Error(`${file.name} isn’t a ${ACC.label} file, so it was skipped.`); }
  const it = { id: uid(), name: file.name, size: file.size, ext, bytes: await blobBytes(file), sizes: [], pageThumbs: [], ink: [], mime: file.type };
  if (isPdf) {
    it.kind = 'pdf';
    try { it.view = await openView(it.bytes); } catch (e) { if (e && e.name === 'PasswordException') { it.locked = true; it.pages = 0; return it; } throw new Error(`${file.name} couldn’t be opened. It may be damaged.`); }
    it.pages = it.view.numPages; it.pageThumbs = new Array(it.pages).fill(null); it.ink = new Array(it.pages).fill(null);
    const r = await renderPage(it.view, 1, { width: 240 }); it.sizes[0] = [r.w, r.h]; it.thumb = r.canvas.toDataURL('image/jpeg', 0.78); it.pageThumbs[0] = it.thumb; it.ink[0] = inkRatio(r.canvas); r.canvas.width = 0;
  } else if (IMG_EXT.has(ext) || /^image\//.test(file.type)) {
    it.kind = 'img';
    if (ext === 'tif' || ext === 'tiff') { it.frames = await decodeTiff(it.bytes); Object.assign(it, { url: it.frames[0].url, thumb: it.frames[0].url, w: it.frames[0].w, h: it.frames[0].h }); }
    else { it.mime = ext === 'png' ? 'image/png' : /^(jpe?g|jfif)$/.test(ext) ? 'image/jpeg' : (file.type || 'image/' + ext); it.url = URL.createObjectURL(file); it.thumb = it.url; const img = new Image(); img.src = it.url; try { await img.decode(); } catch (e) { throw new Error(`${file.name} couldn’t be read as an image.`); } it.w = img.naturalWidth; it.h = img.naturalHeight; if (it.mime === 'image/jpeg') it.exif = jpegHasRotation(it.bytes); }
  } else { it.kind = 'doc'; }
  return it;
}
const dropItem = f => { try { if (f && f.view) f.view.destroy(); } catch (e) {} };
function clearFiles() { state.files.forEach(dropItem); state.files = []; state.pages = []; state.marks = {}; state.edPage = 0; state.blankOverride = {}; state.cmp = null; state.facts = null; }
async function addFiles(list, slot) {
  const incoming = Array.from(list); if (!incoming.length) return; setStatus('Reading files…'); let added = 0;
  for (const file of incoming) {
    let it; try { it = await makeItem(file); } catch (e) { toast(e.message); continue; }
    if (it.locked && !ENG.allowLocked) { toast(`${file.name} is password-protected. Open it with Unlock PDF first.`); dropItem(it); continue; }
    if (ENG.view === 'compare') { const k = slot != null ? slot : state.files.length >= 2 ? 1 : state.files.length; if (state.files[k]) dropItem(state.files[k]); state.files[k] = it; state.files = state.files.filter(Boolean); state.cmp = null; slot = null; }
    else if (ENG.multi) state.files.push(it); else { clearFiles(); state.files.push(it); }
    added++; if (ENG.onFile) await ENG.onFile(it, state.opts);
  }
  setStatus(''); if (!added) { if (!state.files.length) render(); return; }
  state.results = []; state.answer = null; if (ENG.view === 'organize') buildPages();
  render();
}
function addText(text) {
  if (!text.trim()) { toast(`Paste some ${ENG.paste === 'html' ? 'HTML' : 'text'} first.`); return; }
  clearFiles(); const bytes = new TextEncoder().encode(text);
  state.files.push({ id: uid(), name: ENG.paste === 'html' ? 'pasted.html' : 'pasted-text.txt', size: bytes.length, ext: ENG.paste === 'html' ? 'html' : 'txt', bytes, text, kind: 'doc', sizes: [], pageThumbs: [], ink: [] }); state.results = []; render();
}
async function addSample() {
  setStatus('Making a sample…'); const pdf = (b, n) => new File([b], n, { type: 'application/pdf' });
  try {
    const s = ENG.sample || 'pdf';
    if (ENGINE === 'translate' || ENGINE === 'ai') { const lang = PRESET.source && LANG_SAMPLE[PRESET.source] ? PRESET.source : PRESET.source === 'auto' && PRESET.target === 'en' ? 'fr' : 'en'; const L = LANG_SAMPLE[lang]; return addFiles([pdf(await samplePdf(L[0], [L[0], L[0] + ' (2)'], { lines: L.slice(1) }), `sample-${lang}.pdf`)]); }
    if (ENGINE === 'pdf2excel') return addFiles([pdf(await samplePdf('Invoice', ['Invoice 2026-114'], { table: true }), 'sample-invoice.pdf')]);
    switch (s) {
      case 'images': { const fmt = { jpg: 'jpg', png: 'png', bmp: 'bmp', tiff: 'tiff', img: 'jpg' }[ENG.accept] || 'jpg'; return addFiles([await sampleImage(0, fmt), await sampleImage(1, fmt)]); }
      case 'pair': return addFiles([pdf(await samplePdf('Field notes', FIELD), 'sample-field-notes.pdf'), pdf(await samplePdf('Appendix', ['Equipment list', 'Contact sheet']), 'sample-appendix.pdf')]);
      case 'compare': await addFiles([pdf(await samplePdf('Field notes', FIELD), 'field-notes-v1.pdf')], 0); return addFiles([pdf(await samplePdf('Field notes', FIELD, { variant: true }), 'field-notes-v2.pdf')], 1);
      case 'blank': return addFiles([pdf(await samplePdf('Scanned notes', [FIELD[0], null, FIELD[1], FIELD[2], null, FIELD[3]]), 'sample-scan-with-blanks.pdf')]);
      case 'form': return addFiles([pdf(await samplePdf('Site form', FIELD.slice(0, 2), { form: true }), 'sample-filled-form.pdf')]);
      case 'locked': toast('The sample’s password is: quire', 6000); return addFiles([pdf(await samplePdf('Locked notes', FIELD.slice(0, 3), { lock: true }), 'sample-locked.pdf')]);
      case 'docx': return addFiles([await sampleDocx()]);
      case 'xlsx': return addFiles([sampleXlsx()]);
      case 'html': return addFiles([new File([SAMPLE_HTML], 'sample-newsletter.html', { type: 'text/html' })]);
      case 'txt': return addFiles([new File([SAMPLE_TEXT], 'sample-notes.txt', { type: 'text/plain' })]);
      case 'rtf': return addFiles([new File([SAMPLE_RTF], 'sample-notes.rtf', { type: 'application/rtf' })]);
      default: return addFiles([pdf(await samplePdf('Field notes', FIELD), 'sample-field-notes.pdf')]);
    }
  } catch (e) { console.error(e); setStatus('The sample couldn’t be made: ' + e.message, true); }
}

/* ================= run ================= */
function setStatus(msg, err) { const s = $('#status'); if (s) { s.textContent = msg; s.className = 'status' + (err ? ' err' : ''); } }
function setProg(v) { const b = $('#progBar'); if (b) b.style.width = Math.round(Math.max(0, Math.min(1, v)) * 100) + '%'; }
async function run() {
  if (state.busy) return;
  if (!state.files.length) { setStatus(ENG.view === 'compare' ? 'Add both versions first.' : `Add ${ENG.multi ? 'your ' + ACC.nouns : 'a ' + ACC.noun} first.`, true); return; }
  if (ENG.min && state.files.length < ENG.min) { setStatus(ENG.view === 'compare' ? 'Add the changed version too.' : 'Add at least two files.', true); return; }
  const btn = $('#run'); state.busy = true; btn.disabled = true; btn.innerHTML = '<span class="spin" style="width:16px;height:16px;border-width:2px"></span>Working…'; setProg(0.02);
  const started = performance.now();
  try {
    const res = await ENG.run({ files: state.files, opts: state.opts, pages: state.pages, progress: (m, v) => { setStatus(m); if (v != null) setProg(v); } });
    setStatus('Preparing previews…'); setProg(0.97); state.results = res.files; state.note = res.note || ''; state.answer = res.answer || null;
    await makeThumbs(state.results); setStatus(`Done in ${((performance.now() - started) / 1000).toFixed(1)} s.`); setProg(1);
    if (ENG.view === 'compare') renderTable(); renderOutput();
    $('#output').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' });
  } catch (e) { console.error(e); setStatus(e && e.message ? e.message : 'Something went wrong while processing this file.', true); setProg(0); }
  finally { state.busy = false; btn.disabled = false; btn.textContent = ENG.verb; setTimeout(() => setProg(0), 1500); }
}
async function saveAll() { const zip = new JSZip(); state.results.forEach(r => zip.file(r.name, r.bytes)); setStatus('Packing ZIP…'); const bytes = await zip.generateAsync({ type: 'uint8array' }); setStatus(''); await saveFile(`${baseName(state.files[0] ? state.files[0].name : 'quire')}-${TOOL.slug || ENGINE}.zip`, bytes); }

/* ================= viewer ================= */
let vState = null;
function ensureViewer() {
  if ($('#viewer')) return;
  document.body.insertAdjacentHTML('beforeend', `<div class="v-scrim" id="vScrim" hidden></div><div class="viewer" id="viewer" role="dialog" aria-modal="true" aria-label="Preview" hidden><header><b id="vName"></b><span class="mono" id="vPage"></span><button class="mini" data-act="v-prev" aria-label="Previous page" type="button">‹</button><button class="mini" data-act="v-next" aria-label="Next page" type="button">›</button><button class="btn btn-brand btn-sm" data-act="v-save" type="button">Download</button><button class="btn btn-line btn-sm" data-act="v-close" type="button">Close</button></header><div class="vbody" id="vBody"></div></div>`);
  $('#vScrim').addEventListener('click', closeViewer);
}
async function openViewer(r) {
  ensureViewer(); vState = { r, page: 1, pages: 1 }; $('#vName').textContent = r.name; $('#viewer').hidden = false; $('#vScrim').hidden = false; const e = extOf(r.name); const body = $('#vBody');
  if (e === 'pdf') { r.view = r.view || await openView(r.bytes); vState.pages = r.view.numPages; await drawViewer(); }
  else if (e === 'jpg' || e === 'png') { body.innerHTML = `<img src="${r.thumb || URL.createObjectURL(new Blob([r.bytes], { type: MIME[e] }))}" alt="">`; navViewer(); }
  else { body.innerHTML = `<pre>${esc(r.text != null ? r.text : new TextDecoder().decode(r.bytes))}</pre>`; navViewer(); }
  $('[data-act="v-close"]').focus();
}
function navViewer() { $('#vPage').textContent = vState.pages > 1 ? `${vState.page} / ${vState.pages}` : ''; $$('[data-act="v-prev"],[data-act="v-next"]').forEach(b => b.hidden = vState.pages < 2); $('[data-act="v-prev"]').disabled = vState.page <= 1; $('[data-act="v-next"]').disabled = vState.page >= vState.pages; }
async function drawViewer() { const body = $('#vBody'); const dpr = Math.min(2, devicePixelRatio || 1); const W = Math.min(980, body.clientWidth - 48) * dpr; const r = await renderPage(vState.r.view, vState.page, { width: W }); r.canvas.style.width = (W / dpr) + 'px'; body.innerHTML = ''; body.appendChild(r.canvas); navViewer(); }
function closeViewer() { const v = $('#viewer'); if (!v) return; v.hidden = true; $('#vScrim').hidden = true; vState = null; }

/* ================= hand-off between tools ================= */
const IDB = {
  open() { return new Promise((res, rej) => { const r = indexedDB.open('quire', 1); r.onupgradeneeded = () => r.result.createObjectStore('h'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); },
  async put(v) { const db = await this.open(); return new Promise((res, rej) => { const tx = db.transaction('h', 'readwrite'); tx.objectStore('h').put(v, 'handoff'); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); },
  async take() { const db = await this.open(); return new Promise(res => { const tx = db.transaction('h', 'readwrite'); const st = tx.objectStore('h'); const g = st.get('handoff'); g.onsuccess = () => { st.delete('handoff'); res(g.result || null); }; g.onerror = () => res(null); }); },
};
const PDF_ENGINES = new Set(Object.keys(E).filter(k => E[k].accept === 'pdf'));
function continueWith() {
  const r = state.results[0]; if (!r || !window.QuireSite) return;
  window.QuireSite.openPalette({ title: 'Send this PDF to…', filter: t => PDF_ENGINES.has(t.engine) && t.slug !== TOOL.slug, onPick: async slug => { try { await IDB.put({ name: r.name, bytes: r.bytes, t: Date.now() }); location.href = `${ROOT}${slug}/?from=continue`; } catch (e) { toast('Your browser blocked passing the file along. Download it and add it on the next page.'); } } });
}

/* ================= events ================= */
const picker = document.createElement('input'); picker.type = 'file'; picker.hidden = true; document.body.appendChild(picker); let pickMode = null;
function openPicker(mode, accept, multiple) { pickMode = mode; picker.accept = accept; picker.multiple = multiple; picker.value = ''; picker.click(); }
picker.addEventListener('change', async () => {
  const files = Array.from(picker.files); if (!files.length) return; const mode = pickMode; pickMode = null;
  if (mode === 'wm') { const f = files[0]; if (!/^image\/(png|jpeg)$/.test(f.type)) { toast('Use a PNG or JPG image for the watermark.'); return; } const url = URL.createObjectURL(f); state.wmImage = { bytes: await blobBytes(f), mime: f.type, url }; renderInspector(); refreshPreviews(); return; }
  if (mode === 'sig') { const rd = new FileReader(); rd.onload = () => { state.sig.upload = rd.result; renderInspector(); }; rd.readAsDataURL(files[0]); return; }
  if (mode && mode.startsWith('slot')) return addFiles(files, +mode.slice(4));
  addFiles(files);
});
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-act]'); if (!b || b.disabled) return; const act = b.dataset.act; const i = +b.dataset.i;
  const move = (arr, from, to) => { if (to < 0 || to >= arr.length) return; const [x] = arr.splice(from, 1); arr.splice(to, 0, x); };
  switch (act) {
    case 'pick': openPicker('files', ACC.input, !!ENG.multi); break;
    case 'slot': openPicker('slot' + i, ACCEPT.pdf.input, false); break;
    case 'wm-pick': openPicker('wm', 'image/png,image/jpeg', false); break;
    case 'sig-upload': openPicker('sig', 'image/png,image/jpeg,image/webp', false); break;
    case 'sample': addSample(); break;
    case 'paste-open': { const p = $('#paste'); p.hidden = false; $('#pasteBox').focus(); break; }
    case 'paste-use': addText($('#pasteBox').value); break;
    case 'clear': clearFiles(); state.results = []; state.answer = null; if (ENG.onFile) ENG.opts.forEach(o => { if ('def' in o) state.opts[o.k] = o.def; }); appEl.innerHTML = ''; render(); break;
    case 'again': clearFiles(); state.results = []; state.answer = null; appEl.innerHTML = ''; render(); appEl.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); break;
    case 'mv': move(state.files, i, i + +b.dataset.d); renderTable(); break;
    case 'rm': dropItem(state.files.splice(i, 1)[0]); state.results = []; if (!state.files.length) { appEl.innerHTML = ''; render(); } else { renderTable(); renderOutput(); } break;
    case 'pg-mv': move(state.pages, i, i + +b.dataset.d); renderTable(); break;
    case 'pg-rot': state.pages[i].rot = (state.pages[i].rot + 90) % 360; renderTable(); break;
    case 'pg-dup': state.pages.splice(i + 1, 0, Object.assign({}, state.pages[i], { dup: true })); renderTable(); break;
    case 'pg-del': state.pages.splice(i, 1); renderTable(); break;
    case 'org-reverse': state.pages.reverse(); renderTable(); break;
    case 'org-rotall': state.pages.forEach(p => p.rot = (p.rot + 90) % 360); renderTable(); break;
    case 'org-blank': state.pages.push({ src: -1, rot: 0 }); renderTable(); break;
    case 'org-reset': buildPages(); renderTable(); break;
    case 'cmp-swap': state.files.reverse(); state.cmp = null; renderTable(); break;
    case 'ed-go': if (state.files[0] && i >= 0 && i < state.files[0].pages) { state.edPage = i; renderEditor(); } break;
    case 'mk-del': { const l = state.marks[state.edPage] || []; state.marks[state.edPage] = l.filter(m => m.id !== b.dataset.id); renderMarks(); break; }
    case 'mk-clear': state.marks[state.edPage] = []; renderMarks(); break;
    case 'sig-clear': { const c = $('#sigPad'); c.getContext('2d').clearRect(0, 0, c.width, c.height); state.sig.pad = null; break; }
    case 'place-sig': { try { const s = await signatureImage(); const f = state.files[0]; const sz = f.sizes[state.edPage] || f.sizes[0]; const w = 0.28, h = w * (sz[0] / sz[1]) / s.aspect; addMark({ type: 'sig', src: s.src, x: 0.5 - w / 2, y: 0.7, w, h }); if (matchMedia('(max-width: 940px)').matches) $('#edPage').scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (x) { toast(x.message); } break; }
    case 'place-text': case 'place-date': { const text = act === 'place-date' ? today() : (state.sig.text || '').trim(); if (!text) { toast('Type the text to add first.'); break; } const f = state.files[0]; const sz = f.sizes[state.edPage] || f.sizes[0]; const h = 14 / sz[1]; const w = Math.min(0.9, text.length * 7.4 / sz[0]); addMark({ type: 'text', text, x: 0.1, y: act === 'place-date' ? 0.82 : 0.76, w, h }); break; }
    case 'run': run(); break;
    case 'save': { const r = state.results[i]; if (r) saveFile(r.name, r.bytes); break; }
    case 'save-all': saveAll(); break;
    case 'view': openViewer(state.results[i]); break;
    case 'continue': continueWith(); break;
    case 'v-close': closeViewer(); break;
    case 'v-prev': if (vState && vState.page > 1) { vState.page--; drawViewer(); } break;
    case 'v-next': if (vState && vState.page < vState.pages) { vState.page++; drawViewer(); } break;
    case 'v-save': if (vState) saveFile(vState.r.name, vState.r.bytes); break;
  }
});
appEl.addEventListener('click', e => { const fig = e.target.closest('.pickable .pg'); if (fig && !e.target.closest('button')) pickPage(+fig.dataset.p); });
appEl.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.pickable .pg')) { e.preventDefault(); pickPage(+e.target.dataset.p); } });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#viewer') && !$('#viewer').hidden) closeViewer(); else if (vState && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { const bt = $(`[data-act="v-${e.key === 'ArrowRight' ? 'next' : 'prev'}"]`); if (bt && !bt.disabled) bt.click(); } });
function onOpt(e) {
  const el = e.target;
  if (el.id === 'zoom') { state.zoom = +el.value; const g = $('#grid'); if (g) g.style.setProperty('--thumb', state.zoom + 'px'); try { localStorage.setItem('quire-zoom', state.zoom); } catch (x) {} return; }
  if (el.dataset && el.dataset.sig) { const k = el.dataset.sig; state.sig[k] = el.value; if (k === 'tab' || k === 'font') renderInspector(); else if (k === 'name') $$('input[data-sig="font"] + span').forEach(s => s.textContent = el.value || 'Signature'); return; }
  if (!el.dataset || !el.dataset.opt) return; const k = el.dataset.opt;
  state.opts[k] = el.type === 'checkbox' ? el.checked : (el.type === 'number' || el.type === 'range') ? +el.value : el.value;
  if (el.type === 'range') { const out = $('#' + el.id + '-out'); if (out) out.textContent = state.opts[k] + (el.dataset.unit || ''); }
  ENG.opts.forEach(o => { if (o.hideWhen) { const f = appEl.querySelector(`[data-field="${o.k}"]`); if (f) f.hidden = o.hideWhen(state.opts); } });
  if (ENG.view === 'pick') refreshPick(); if (ENG.preview) refreshPreviews(); if (ENGINE === 'redact' && k === 'fill') renderMarks();
}
appEl.addEventListener('input', onOpt); appEl.addEventListener('change', onOpt);

/* drag & drop */
const hasFilesDT = e => e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');
['dragover', 'drop'].forEach(ev => window.addEventListener(ev, e => { if (hasFilesDT(e)) e.preventDefault(); }));
let dragFrom = null;
appEl.addEventListener('dragover', e => { if (hasFilesDT(e)) { const t = $('#table') || $('#drop'); if (t) t.classList.add('over'); return; } if (dragFrom == null) return; const card = e.target.closest('.pg[draggable]'); if (!card) return; e.preventDefault(); $$('.target').forEach(n => n.classList.remove('target')); card.classList.add('target'); });
appEl.addEventListener('dragleave', e => { if (!appEl.contains(e.relatedTarget)) $$('.over').forEach(n => n.classList.remove('over')); });
appEl.addEventListener('drop', e => {
  $$('.over').forEach(n => n.classList.remove('over'));
  if (hasFilesDT(e)) { e.preventDefault(); let slot; const s = e.target.closest('.slot'); if (s) slot = $$('.slot').indexOf(s); addFiles(e.dataTransfer.files, slot); return; }
  if (dragFrom == null) return; const card = e.target.closest('.pg[draggable]'); if (!card) return; e.preventDefault();
  const to = +card.dataset.i; const arr = ENG.view === 'organize' ? state.pages : state.files; if (to !== dragFrom) { const [x] = arr.splice(dragFrom, 1); arr.splice(to, 0, x); } dragFrom = null; renderTable();
});
appEl.addEventListener('dragstart', e => { const card = e.target.closest('.pg[draggable]'); if (!card) return; dragFrom = +card.dataset.i; card.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(dragFrom)); });
appEl.addEventListener('dragend', () => { dragFrom = null; $$('.dragging,.target').forEach(n => n.classList.remove('dragging', 'target')); });
window.addEventListener('resize', () => { if (ENG.view === 'editor' && $('#edCanvas')) { clearTimeout(window.__rz); window.__rz = setTimeout(drawEdPage, 200); } });
window.addEventListener('beforeunload', e => { if (state.busy) { e.preventDefault(); e.returnValue = ''; } });

/* ================= start ================= */
render();
if (new URLSearchParams(location.search).get('from') === 'continue') {
  IDB.take().then(h => { if (h && h.bytes && Date.now() - h.t < 10 * 60 * 1000) addFiles([new File([h.bytes], h.name, { type: 'application/pdf' })]); history.replaceState(null, '', location.pathname); }).catch(() => {});
}
window.QuireApp = { state, engine: ENGINE, addFiles, run, E };
})();
