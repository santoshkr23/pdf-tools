// SVG icons shared by the page builder and the in-browser app.

export const GLYPHS = {
  merge: 'M4 4h6v7H4zM14 4h6v7h-6zM7 11v2.5l5 4.5 5-4.5V11M12 18v2',
  split: 'M8 3h8v7H8zM4 15h6v6H4zM14 15h6v6h-6zM12 10v2.5M7 15v-2.5h10V15',
  organize: 'M4 4h6v7H4zM14 4h6v7h-6zM4 15h6v5H4zM14 15h6v5h-6z',
  blank: 'M6 3h9l3 3v15H6zM9.5 11.5l5 5M14.5 11.5l-5 5',
  compress: 'M8 3l4 4 4-4M8 21l4-4 4 4M4 12h16',
  gray: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 3v18M12 8h6.5M12 12h9M12 16h6.5',
  rotate: 'M20 12a8 8 0 11-2.4-5.7M20 4v5h-5',
  crop: 'M6 2v16h16M2 6h16v16',
  resize: 'M4 4h6M4 4v6M20 20h-6M20 20v-6M4 4l6.5 6.5M20 20l-6.5-6.5',
  nup: 'M3 5h18v14H3zM12 5v14M6 9h3M6 12h3M6 15h2M15 9h3M15 12h3M15 15h2',
  numbers: 'M6 3h12v18H6zM10 9v6M14 9v6M8.5 10.5h7M8.5 13.5h7',
  header: 'M6 3h12v18H6zM9 6.5h6M9 17.5h6M9 11h6M9 13.5h4',
  watermark: 'M12 3c3 4 6 7.5 6 11a6 6 0 01-12 0c0-3.5 3-7 6-11z',
  sign: 'M4 18c2.5-.5 4.5-2.5 6.5-5.5L17 6l2 2-6.5 6.5c-3 2-5 3.5-8.5 3.5zM15 8l2 2M4 21h16',
  redact: 'M6 3h12v18H6zM8.5 7h7M8.5 15.5h4M8 11.5h8',
  protect: 'M6 11h12v10H6zM8 11V8a4 4 0 018 0v3M12 15v2',
  unlock: 'M6 11h12v10H6zM8 11V8a4 4 0 017.6-1.7M12 15v2',
  flatten: 'M12 4l9 5-9 5-9-5zM3 15l9 5 9-5',
  compare: 'M3 4h7v16H3zM14 4h7v16h-7zM6 8h1M17 8h1M6 12h1M17 12.5h1M6 16h1M10 12h4',
  info: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 11v6M12 7.5h.01',
  ai: 'M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9z',
  ask: 'M4 5h16v11H9l-5 4zM9.5 9a2.5 2.5 0 114 2c-.9.5-1.5 1-1.5 2M12 14.5h.01',
  search: 'M11 4.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM20 20l-4.3-4.3',
  upload: 'M12 16V4M7 9l5-5 5 5M4 15v4a1 1 0 001 1h14a1 1 0 001-1v-4',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  lock: 'M6 11h12v10H6zM8 11V8a4 4 0 018 0v3',
  save: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 9a3 3 0 100 6 3 3 0 000-6z',
  next: 'M5 12h14M13 6l6 6-6 6',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6L6 18',
  bolt: 'M13 3L5 13h6l-1 8 8-10h-6z',
  device: 'M5 4h14v11H5zM3 19h18M9 15v4M15 15v4',
  globe: 'M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z',
  layers: 'M12 4l9 5-9 5-9-5zM3 15l9 5 9-5',
  doc: 'M6 3h9l3 3v15H6zM15 3v3h3',
};

export const glyph = (name, cls = 'i') =>
  `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${GLYPHS[name] || GLYPHS.doc}"/></svg>`;

const FMT = {
  jpg: ['#8E44AD', 'JPG'], png: ['#E0384B', 'PNG'], word: ['#2F6FE4', 'W'], excel: ['#1E9E5A', 'X'],
  ppt: ['#E0552B', 'P'], html: ['#2D2D2D', '</>'], text: ['#1C87B5', 'T'], tiff: ['#6B2A6B', 'TIF'],
  ocr: ['#F2601A', 'OCR'], rtf: ['#2457A6', 'RTF'], bmp: ['#6C5CE7', 'BMP'], gif: ['#E8A00A', 'GIF'], img: ['#0E9F9A', 'IMG'],
};
const BRAND = '#F2601A';
const arrow = `<path d="M30.5 4.5c3 .4 5 2.6 5.4 5.6" fill="none" stroke="${BRAND}" stroke-width="2.4" stroke-linecap="round"/><path d="M33 9.4l2.9 1.2 1.1-3" fill="none" stroke="${BRAND}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;
const tileText = (t, x, y, w, color) => {
  const fs = t.length >= 3 ? 7.4 : t.length === 2 ? 9 : 11.5;
  return `<text x="${x + w / 2}" y="${y + w / 2 + fs * 0.36}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="${fs}" fill="${color}">${t.replace('<', '&lt;').replace('>', '&gt;')}</text>`;
};

// The coloured file badges used on cards and tool headers.
export function badge(spec, size = 40) {
  const open = `<svg class="badge" width="${size}" height="${size}" viewBox="0 0 40 40" aria-hidden="true">`;
  if (spec.to) {
    const [c] = FMT[spec.to];
    const back = `<path d="M17 7H8a3 3 0 00-3 3v17a3 3 0 003 3h6" fill="none" stroke="${c}" stroke-width="3.2" stroke-linecap="round"/>`;
    return `${open}${back}${arrow}<rect x="15" y="13" width="21" height="21" rx="3.2" fill="${BRAND}"/>${spec.to === 'ocr' ? `<path d="M19 19v-2.5h2.6M32 19v-2.5h-2.6M19 28v2.5h2.6M32 28v2.5h-2.6" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round"/>${tileText('OCR', 15, 13, 21, '#fff')}` : tileText('PDF', 15, 13, 21, '#fff')}</svg>`;
  }
  if (spec.from) {
    const [c, l] = FMT[spec.from];
    const back = `<path d="M17 7H8a3 3 0 00-3 3v17a3 3 0 003 3h6" fill="none" stroke="${BRAND}" stroke-width="3.2" stroke-linecap="round"/>`;
    return `${open}${back}${arrow}<rect x="15" y="13" width="21" height="21" rx="3.2" fill="${c}"/>${tileText(l, 15, 13, 21, '#fff')}</svg>`;
  }
  if (spec.lang) {
    const [a, b] = spec.lang;
    const first = a === '🌐' ? `<g transform="translate(5 4) scale(.62)" fill="none" stroke="${BRAND}" stroke-width="2.4"><path d="${GLYPHS.globe}"/></g>`
      : `<rect x="3" y="3" width="17" height="14" rx="2.5" fill="#FFE3D3"/>${`<text x="11.5" y="13.4" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="8.6" fill="${BRAND}">${a}</text>`}`;
    return `${open}${first}<path d="M9 20.5v4.5h4" fill="none" stroke="${BRAND}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M11.4 22.6L14 25l-2.6 2.4" fill="none" stroke="${BRAND}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><rect x="16" y="17" width="20" height="18" rx="3" fill="${BRAND}"/><text x="26" y="29.4" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="9.6" fill="#fff">${b}</text></svg>`;
  }
  const g = GLYPHS[spec.g] || GLYPHS.doc;
  return `${open}<rect x="2" y="2" width="36" height="36" rx="9" fill="#FFE8DB"/><g transform="translate(8 8)"><path d="${g}" fill="none" stroke="${BRAND}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" transform="scale(1)"/></g></svg>`;
}
