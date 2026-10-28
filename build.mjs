// Builds the static site into ./docs (GitHub Pages serves this folder).
// Usage: node build.mjs
import fs from 'node:fs';
import path from 'node:path';
import SITE from './src/site.config.mjs';
import { CATEGORIES, TOOLS, COMMON_FAQ } from './src/catalog.mjs';
import { badge, glyph } from './src/icons.mjs';

const OUT = 'docs';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const bySlug = Object.fromEntries(TOOLS.map(t => [t.slug, t]));
const catOf = id => CATEGORIES.find(c => c.id === id);
const HUB = { to: 'convert-to-pdf', from: 'convert-from-pdf', organize: 'organize', edit: 'edit', sign: 'sign-and-protect', translate: 'translate', ai: 'ai' };

/* ---------- CDN libraries, pinned ---------- */
const LIB = {
  pdfjs: ['https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'],
  pdflib: ['https://cdn.jsdelivr.net/npm/@cantoo/pdf-lib@2.11.1/dist/pdf-lib.min.js'],
  jszip: ['https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'],
  html2canvas: ['https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'],
  docxpreview: ['https://cdn.jsdelivr.net/npm/docx-preview@0.4.1/dist/docx-preview.min.js'],
  xlsx: ['https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'],
  utif: ['https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js', 'https://cdn.jsdelivr.net/npm/utif@3.1.0/UTIF.js'],
  tesseract: ['https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js'],
  docx: ['https://cdn.jsdelivr.net/npm/docx@9.8.1/dist/index.iife.js'],
  pptx: ['https://cdn.jsdelivr.net/npm/pptxgenjs@4.0.1/dist/pptxgen.bundle.js'],
};
const ENGINE_LIBS = {
  word: ['docxpreview', 'html2canvas'], excel: ['xlsx', 'html2canvas'], ppt: ['html2canvas'], html: ['html2canvas'],
  images: ['utif'], toimage: ['utif'], ocr: ['tesseract'], pdf2word: ['docx'], translate: ['docx'], pdf2excel: ['xlsx'], pdf2ppt: ['pptx'],
};
const scriptsFor = engine => ['jszip', 'pdfjs', 'pdflib', ...(ENGINE_LIBS[engine] || [])].flatMap(k => LIB[k]).map(u => `<script src="${u}"></script>`).join('\n');

/* ---------- shared pieces ---------- */
const FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect x="9" y="3" width="19" height="24" rx="3" fill="#FFB38A" transform="rotate(8 18 15)"/><rect x="4" y="5" width="19" height="24" rx="3" fill="#F2601A"/><path d="M9 12h9M9 16.5h9M9 21h6" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>`;
const logo = root => `<a class="logo" href="${root}" aria-label="${SITE.name} home"><svg viewBox="0 0 32 32" aria-hidden="true"><rect x="9" y="3" width="19" height="24" rx="3" fill="#FFB38A" transform="rotate(8 18 15)"/><rect x="4" y="5" width="19" height="24" rx="3" fill="#F2601A"/><path d="M9 12h9M9 16.5h9M9 21h6" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg><span>${SITE.name}</span><small>PDF</small></a>`;

function head({ title, desc, pathRel, root, schema = [], noindex = false }) {
  const url = SITE.url + pathRel;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
${noindex ? '<meta name="robots" content="noindex">' : ''}
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(SITE.name)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE.url}assets/img/social.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#F2601A">
<link rel="icon" href="${root}favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&family=Caveat:wght@600&family=Dancing+Script:wght@600&display=swap">
<link rel="stylesheet" href="${root}assets/css/site.css">
${schema.map(s => `<script type="application/ld+json">${JSON.stringify(s)}</script>`).join('\n')}
</head>`;
}

function megaCol(cat, root, limit = 99) {
  const list = TOOLS.filter(t => t.cat === cat);
  return `<div class="mega-col"><p class="mega-h">${esc(catOf(cat).name)}</p><ul>${list.slice(0, limit).map(t => `<li><a href="${root}${t.slug}/">${badge(t.icon, 22)}<span>${esc(t.name)}</span></a></li>`).join('')}</ul></div>`;
}
function header(root) {
  const item = (label, cols, wide) => `<li class="nav-item"><button class="nav-btn" aria-expanded="false">${label}<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button><div class="mega ${wide ? 'wide' : ''}">${cols}</div></li>`;
  return `<a class="skip" href="#main">Skip to content</a>
<header class="site-head">
  <div class="wrap head-row">
    ${logo(root)}
    <nav class="nav" aria-label="Main">
      <ul class="nav-list">
        ${item('Convert', megaCol('to', root) + megaCol('from', root), true)}
        ${item('Organize', megaCol('organize', root) + megaCol('edit', root), true)}
        ${item('Sign & Protect', megaCol('sign', root))}
        ${item('Translate', megaCol('translate', root))}
        ${item('AI Tools', megaCol('ai', root))}
      </ul>
    </nav>
    <div class="head-actions">
      <button class="search-btn" data-site="search" aria-label="Search tools">${glyph('search')}<span>Search tools</span><kbd>Ctrl K</kbd></button>
      <a class="btn btn-brand btn-sm hide-sm" href="${root}tools/">All tools</a>
      <button class="menu-btn" data-site="menu" aria-label="Open menu" aria-expanded="false">${glyph('menu')}</button>
    </div>
  </div>
  <div class="mobile-menu" id="mobileMenu" hidden>
    <div class="wrap">${CATEGORIES.map(c => `<details><summary>${esc(c.name)}</summary><ul>${TOOLS.filter(t => t.cat === c.id).map(t => `<li><a href="${root}${t.slug}/">${badge(t.icon, 22)}${esc(t.name)}</a></li>`).join('')}</ul></details>`).join('')}
      <a class="btn btn-brand" href="${root}tools/">See all ${TOOLS.length} tools</a></div>
  </div>
</header>`;
}
function footer(root) {
  const col = (title, cats) => `<div><p class="foot-h">${title}</p><ul>${TOOLS.filter(t => cats.includes(t.cat)).slice(0, 12).map(t => `<li><a href="${root}${t.slug}/">${esc(t.name)}</a></li>`).join('')}</ul></div>`;
  return `<footer class="site-foot">
  <div class="wrap foot-grid">
    <div class="foot-brand">${logo(root)}<p>${esc(SITE.tagline)}. Files are processed on your own device and never stored on a server.</p>
      <p class="foot-note">${glyph('lock')}Private by design</p></div>
    ${col('Convert to PDF', ['to'])}
    ${col('Convert from PDF', ['from'])}
    ${col('Organize & edit', ['organize', 'edit'])}
    ${col('Sign, translate & AI', ['sign', 'translate', 'ai'])}
  </div>
  <div class="wrap foot-base"><p>© ${SITE.year} ${esc(SITE.name)}. All rights reserved.</p>
    <ul><li><a href="${root}tools/">All tools</a></li><li><a href="${root}about/">About</a></li><li><a href="${root}privacy/">Privacy</a></li><li><a href="${root}terms/">Terms</a></li><li><a href="${root}sitemap.xml">Sitemap</a></li></ul></div>
</footer>
<div class="pal-scrim" id="palScrim" hidden></div>
<div class="pal" id="pal" role="dialog" aria-modal="true" aria-label="Search tools" hidden>
  <div class="pal-top">${glyph('search')}<input id="palInput" type="text" placeholder="Search ${TOOLS.length} tools: merge, word, sign, translate…" autocomplete="off" aria-label="Search tools"><kbd>Esc</kbd></div>
  <p class="pal-title" id="palTitle" hidden></p>
  <ul id="palList" role="listbox"></ul>
</div>
<div class="toast" id="toast" role="status" aria-live="polite" hidden></div>`;
}
const catalogScript = root => `<script>window.QUIRE=Object.assign(window.QUIRE||{},{root:${JSON.stringify(root)},api:${JSON.stringify(SITE.apiEndpoint)},site:${JSON.stringify(SITE.name)}});</script>
<script src="${root}assets/js/catalog.js"></script>
<script src="${root}assets/js/site.js"></script>`;

const card = (t, root) => `<li><a class="tcard" href="${root}${t.slug}/" data-cat="${t.cat}">${badge(t.icon, 40)}<b>${esc(t.name)}</b><span>${esc(t.short)}</span></a></li>`;
const faqHtml = list => `<div class="faq">${list.map(([q, a], i) => `<details ${i === 0 ? 'open' : ''}><summary><span>${esc(q)}</span><i aria-hidden="true"></i></summary><p>${esc(a)}</p></details>`).join('')}</div>`;
const faqSchema = list => ({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: list.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });

/* ---------- landing ---------- */
const LANDING_FAQ = [
  ['Is Quire really free?', 'Yes. All tools are free to use with no account, no watermarks and no daily limits.'],
  ['Are my files uploaded to a server?', 'No. Quire runs inside your browser, so your files are opened, changed and saved on your own device. Only the Translate and AI tools send the document’s text, never the file, to a language service.'],
  ['Is there a file size limit?', 'There is no fixed limit. Very large files simply take longer, because your own computer or phone does the work.'],
  ['Can I convert Word, Excel and PowerPoint to PDF?', 'Yes. Quire converts DOCX, XLSX, XLS, CSV and PPTX files to PDF, and PDF back to Word, Excel and PowerPoint.'],
  ['Can I make a scanned PDF searchable?', 'Yes. OCR PDF reads the text in scans in 13 languages, including Hindi and Bengali, and makes it searchable.'],
  ['Does Quire work on mobile?', 'Yes. It works in Chrome, Safari, Edge and Firefox on phones, tablets and computers.'],
];

function landing() {
  const root = '';
  const featured = ['merge-pdf', 'word-to-pdf', 'sign-pdf', 'compress-pdf'].map(s => bySlug[s]);
  const schema = [
    { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE.name, url: SITE.url, potentialAction: { '@type': 'SearchAction', target: SITE.url + 'tools/?q={query}', 'query-input': 'required name=query' } },
    { '@context': 'https://schema.org', '@type': 'WebApplication', name: `${SITE.name} PDF Tools`, url: SITE.url, applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } },
    faqSchema(LANDING_FAQ),
  ];
  const tabs = [['all', 'All'], ...CATEGORIES.map(c => [c.id, c.name])];
  const formats = ['PDF', 'DOCX', 'XLSX', 'XLS', 'CSV', 'PPTX', 'JPG', 'PNG', 'WebP', 'TIFF', 'BMP', 'GIF', 'HTML', 'TXT', 'RTF', 'ODS', 'MD'];
  const feat = [
    { id: 'convert', tab: 'Convert & organize', h: 'Turn any file into a PDF, and back again', p: 'Convert Office documents, images and web pages to PDF, or pull editable Word, Excel and PowerPoint files out of a PDF. Then merge, split and tidy pages in the same place.',
      pts: [['bolt', 'Word, Excel, PowerPoint, images, HTML and text'], ['layers', 'Merge, split, reorder, rotate and compress'], ['doc', 'OCR turns scans into searchable PDFs'], ['device', 'Runs on your device, with no queue']], cta: ['word-to-pdf', 'Convert Word to PDF'], vis: 'convert' },
    { id: 'secure', tab: 'Sign & protect', h: 'Sign, lock and redact without leaving your browser', p: 'Draw or type a signature and place it anywhere. Lock files with AES-256 passwords, black out private details for good and compare two versions side by side.',
      pts: [['sign', 'Draw, type or upload your signature'], ['protect', 'AES-256 password protection'], ['redact', 'Permanent redaction, not just a black box'], ['compare', 'Highlight every change between versions']], cta: ['sign-pdf', 'Sign a PDF'], vis: 'sign' },
    { id: 'ai', tab: 'Translate & AI', h: 'Read any document, in any language', p: 'Translate PDFs between 20 languages, including Hindi, Bengali and Arabic, and get an editable Word file back. Summarize long reports or ask questions and get answers with page references.',
      pts: [['globe', '20 languages, including right-to-left Arabic'], ['doc', 'Editable Word output, page by page'], ['ai', 'Short, medium or detailed summaries'], ['ask', 'Ask questions and get page references']], cta: ['translate-pdf', 'Translate a PDF'], vis: 'ai' },
  ];
  const vis = {
    convert: `<div class="mock mock-convert" aria-hidden="true"><div class="mfile" style="--c:#2F6FE4"><b>W</b><span>Report.docx</span></div><div class="marrow">${glyph('next')}</div><div class="msheet"><i></i><i></i><i></i><i class="s"></i><i></i><em>PDF</em></div><div class="mchips"><span>Merge</span><span>Split</span><span>Compress</span><span>OCR</span></div></div>`,
    sign: `<div class="mock mock-sign" aria-hidden="true"><div class="msheet tall"><i></i><i></i><i></i><i></i><i class="s"></i><i></i><svg viewBox="0 0 200 60" class="msig"><path d="M8 40c18-30 28-30 22 4s14-36 30-24-6 26 14 16 24-30 34-14 4 22 22 8 30-16 60-10" fill="none" stroke="#1B3FA0" stroke-width="3.4" stroke-linecap="round"/></svg><span class="mdate">28 October 2026</span></div><div class="mpill">${glyph('lock')}AES-256 locked</div><div class="mpill b">${glyph('check')}Signed</div></div>`,
    ai: `<div class="mock mock-ai" aria-hidden="true"><div class="mbubble"><b>DE</b><p>Die Lieferung erfolgt innerhalb von 14 Tagen nach Zahlungseingang.</p></div><div class="mbubble out"><b>EN</b><p>Delivery takes place within 14 days of receiving payment.</p></div><div class="mbubble ai">${glyph('ai')}<p><b>Summary</b> · 3 key points: delivery in 14 days, 2-year warranty, returns within 30 days.</p></div></div>`,
  };
  return `${head({ title: `${SITE.name} – Free PDF Tools Online: Convert, Edit, Sign & Translate`, desc: `${TOOLS.length} free PDF tools that run in your browser. Convert Word, Excel, PowerPoint and images to PDF, merge, split, compress, sign, protect, OCR and translate PDFs. No upload, no sign-up.`, pathRel: '', root, schema })}
<body class="page-home">
${header(root)}
<main id="main">
  <section class="hero">
    <div class="wrap hero-grid">
      <div class="hero-copy">
        <p class="eyebrow"><span>Free</span>No sign-up · No watermarks · No uploads</p>
        <h1>Every PDF tool you need. <em>None of the uploads.</em></h1>
        <p class="lede">Convert, edit, sign, protect and translate PDFs with ${TOOLS.length} free tools. Files are processed on your own device, so they stay private and there are no size limits.</p>
        <div class="hero-cta"><a class="btn btn-brand btn-lg" href="#tools">Explore all tools</a><a class="btn btn-line btn-lg" href="merge-pdf/">Merge PDF</a></div>
        <ul class="hero-quick">${featured.map(t => `<li><a href="${t.slug}/">${badge(t.icon, 22)}${esc(t.name)}</a></li>`).join('')}</ul>
      </div>
      <div class="hero-visual" aria-hidden="true">
        <div class="app-mock">
          <div class="am-bar"><i></i><i></i><i></i><span>quire / merge-pdf</span></div>
          <div class="am-body">
            <div class="am-side">${['merge', 'split', 'compress', 'sign', 'protect', 'ai'].map((g, i) => `<span class="${i === 0 ? 'on' : ''}">${glyph(g)}</span>`).join('')}</div>
            <div class="am-table">
              <div class="am-sheet s1"><b>1</b><i></i><i></i><i></i><i class="s"></i></div>
              <div class="am-sheet s2"><b>2</b><i></i><i class="s"></i><i></i><i></i></div>
              <div class="am-sheet s3"><b>3</b><i></i><i></i><i class="s"></i><i></i></div>
            </div>
            <div class="am-panel"><p>Settings</p><span class="am-seg"><i class="on"></i><i></i><i></i></span><span class="am-line"></span><span class="am-line short"></span><span class="am-run">Merge files</span></div>
          </div>
        </div>
        <div class="float f1">${glyph('lock')}<span>Stays on your device</span></div>
        <div class="float f2">${glyph('check')}<span>3 files merged · 24 pages</span></div>
      </div>
    </div>
  </section>

  <section class="promo"><div class="wrap promo-row"><p><b>New</b>Translate PDFs into 20 languages and summarize long documents with AI.</p><a href="translate-pdf/">Try Translate PDF ${glyph('next')}</a></div></section>

  <section class="formats" aria-label="Supported formats">
    <div class="wrap"><p class="formats-h">Works with the files you already use</p></div>
    <div class="marquee"><div class="marquee-track">${[...formats, ...formats].map(f => `<span>${f}</span>`).join('')}</div></div>
  </section>

  <section class="tools-sec" id="tools">
    <div class="wrap">
      <h2 class="sec-h">Try the best free PDF tools online</h2>
      <p class="sec-sub">${TOOLS.length} tools, each on its own page. Pick one to start.</p>
      <div class="chips" role="tablist" aria-label="Tool categories">${tabs.map(([id, n], i) => `<button role="tab" class="chip" data-filter="${id}" aria-selected="${i === 0}">${esc(n)}</button>`).join('')}</div>
      <ul class="tgrid" id="tgrid">${TOOLS.map(t => card(t, root)).join('')}</ul>
    </div>
  </section>

  <section class="feat">
    <div class="wrap">
      <h2 class="sec-h">One place for every document job</h2>
      <div class="feat-tabs" role="tablist" aria-label="What you can do">${feat.map((f, i) => `<button role="tab" id="ft-${f.id}" aria-controls="fp-${f.id}" aria-selected="${i === 0}">${esc(f.tab)}</button>`).join('')}</div>
      ${feat.map((f, i) => `<div class="feat-panel" role="tabpanel" id="fp-${f.id}" aria-labelledby="ft-${f.id}" ${i ? 'hidden' : ''}>
        <div><h3>${esc(f.h)}</h3><p>${esc(f.p)}</p><ul class="ticks">${f.pts.map(([g, s]) => `<li>${glyph(g)}<span>${esc(s)}</span></li>`).join('')}</ul><a class="btn btn-brand" href="${f.cta[0]}/">${esc(f.cta[1])}</a></div>
        <div class="feat-vis">${vis[f.vis]}</div></div>`).join('')}
    </div>
  </section>

  <section class="steps-sec">
    <div class="wrap">
      <h2 class="sec-h">How it works</h2>
      <ol class="steps">
        <li><span>1</span><h3>Choose a file</h3><p>Pick a tool, then drop your file on the page or tap “Select file”.</p></li>
        <li><span>2</span><h3>Adjust the settings</h3><p>Reorder pages, choose quality or place your signature. Many tools preview changes live.</p></li>
        <li><span>3</span><h3>Save the result</h3><p>Download the new file, or send it straight into another tool to keep going.</p></li>
      </ol>
    </div>
  </section>

  <section class="trust">
    <div class="wrap trust-grid">
      <div><h2 class="sec-h left">Private by design</h2><p class="sec-sub left">Most online PDF sites copy your documents to their servers. Quire doesn’t: the conversion code runs inside your browser tab, and your files never leave your device.</p></div>
      <ul class="trust-badges">
        <li>${glyph('device')}<b>On-device processing</b><span>Files are opened and saved by your browser.</span></li>
        <li>${glyph('protect')}<b>AES-256 encryption</b><span>The strongest standard PDF password lock.</span></li>
        <li>${glyph('check')}<b>No account needed</b><span>No sign-up, no email, no tracking of files.</span></li>
        <li>${glyph('layers')}<b>Trusted engines</b><span>Built on Mozilla PDF.js and pdf-lib.</span></li>
      </ul>
    </div>
  </section>

  <section class="faq-sec"><div class="wrap narrow"><h2 class="sec-h">Frequently asked questions</h2>${faqHtml(LANDING_FAQ)}</div></section>

  <section class="cta-band"><div class="wrap cta-row"><div><h2>Ready to get your PDF done?</h2><p>Free, private and ready in seconds.</p></div><div class="cta-acts"><a class="btn btn-white btn-lg" href="tools/">See all ${TOOLS.length} tools</a><a class="btn btn-ghost-w btn-lg" href="compress-pdf/">Compress a PDF</a></div></div></section>
</main>
${footer(root)}
${catalogScript(root)}
</body>
</html>`;
}

/* ---------- tool page ---------- */
function toolPage(t) {
  const root = '../'; const cat = catOf(t.cat);
  const related = [...TOOLS.filter(x => x.cat === t.cat && x.slug !== t.slug), ...TOOLS.filter(x => x.cat !== t.cat && x.engine === t.engine)].slice(0, 8);
  const faq = [...t.faq, ...COMMON_FAQ];
  const pathRel = t.slug + '/';
  const schema = [
    { '@context': 'https://schema.org', '@type': 'WebApplication', name: `${t.name} – ${SITE.name}`, url: SITE.url + pathRel, description: t.desc, applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any', browserRequirements: 'Requires JavaScript', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } },
    { '@context': 'https://schema.org', '@type': 'HowTo', name: t.h1, step: t.steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, text: s })) },
    faqSchema(faq),
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: SITE.name, item: SITE.url },
      { '@type': 'ListItem', position: 2, name: cat.name, item: `${SITE.url}tools/${HUB[t.cat]}/` },
      { '@type': 'ListItem', position: 3, name: t.name, item: SITE.url + pathRel }] },
  ];
  const needsApi = t.engine === 'translate' || t.engine === 'ai';
  return `${head({ title: `${t.title} | ${SITE.name}`, desc: t.desc, pathRel, root, schema })}
<body class="page-tool" data-tool="${t.slug}">
${header(root)}
<main id="main">
  <section class="tool-hero">
    <div class="wrap">
      <nav class="crumbs" aria-label="Breadcrumb"><a href="${root}">Home</a><span>/</span><a href="${root}tools/${HUB[t.cat]}/">${esc(cat.name)}</a><span>/</span><span aria-current="page">${esc(t.name)}</span></nav>
      <div class="tool-title">${badge(t.icon, 56)}<div><h1>${esc(t.h1)}</h1><p>${esc(t.intro)}</p></div></div>
      ${needsApi ? `<p class="notice">${glyph('globe')}<span>This tool sends the document’s text (not the file) over an encrypted connection to a ${t.engine === 'ai' ? 'AI' : 'translation'} service to do the work. Every other ${SITE.name} tool works entirely on your device.</span></p>` : ''}
    </div>
  </section>
  <section class="tool-app"><div class="wrap"><div id="app" class="app" data-engine="${t.engine}" data-preset='${esc(JSON.stringify(t.preset || {}))}'>
    <noscript><p class="notice">This tool needs JavaScript. Please turn it on in your browser settings.</p></noscript>
    <div class="app-loading"><span class="spin"></span>Loading ${esc(t.name)}…</div>
  </div></div></section>

  <section class="info-sec">
    <div class="wrap info-grid">
      <div><h2>How to ${esc(t.h1.charAt(0).toLowerCase() + t.h1.slice(1))}</h2>
        <ol class="howto">${t.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol></div>
      <ul class="whys">
        <li>${glyph('device')}<div><b>${needsApi ? 'Your file stays with you' : 'Nothing leaves your device'}</b><p>${needsApi ? 'Only the text is sent for processing; the PDF itself is never uploaded or stored.' : 'Your file is processed in this browser tab and is never uploaded or stored anywhere.'}</p></div></li>
        <li>${glyph('bolt')}<div><b>Fast, with no queue</b><p>Work starts the moment you click, with no waiting for uploads or downloads.</p></div></li>
        <li>${glyph('check')}<div><b>Free, with no watermark</b><p>No account, no daily limit and nothing stamped on your pages.</p></div></li>
      </ul>
    </div>
  </section>

  <section class="faq-sec"><div class="wrap narrow"><h2 class="sec-h">${esc(t.name)}: questions and answers</h2>${faqHtml(faq)}</div></section>

  <section class="related"><div class="wrap"><h2 class="sec-h">Related tools</h2><ul class="tgrid">${related.map(x => card(x, root)).join('')}</ul></div></section>
</main>
${footer(root)}
${catalogScript(root)}
${scriptsFor(t.engine)}
<script src="${root}assets/js/app.js"></script>
</body>
</html>`;
}

/* ---------- hubs & simple pages ---------- */
function hubPage(cat) {
  const root = cat ? '../../' : '../'; const c = cat ? catOf(cat) : null;
  const list = cat ? TOOLS.filter(t => t.cat === cat) : TOOLS;
  const pathRel = cat ? `tools/${HUB[cat]}/` : 'tools/';
  const title = cat ? `${c.name} – Free Online Tools | ${SITE.name}` : `All ${TOOLS.length} Free PDF Tools | ${SITE.name}`;
  const desc = cat ? `${c.blurb} ${list.length} free tools that run in your browser with no upload.` : `Browse all ${TOOLS.length} free PDF tools: convert, organize, edit, sign, protect, translate and summarize PDFs in your browser.`;
  return `${head({ title, desc, pathRel, root })}
<body class="page-hub">
${header(root)}
<main id="main">
  <section class="tool-hero"><div class="wrap">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="${root}">Home</a><span>/</span>${cat ? `<a href="${root}tools/">All tools</a><span>/</span><span aria-current="page">${esc(c.name)}</span>` : '<span aria-current="page">All tools</span>'}</nav>
    <h1 class="hub-h">${cat ? esc(c.name) : `All ${TOOLS.length} PDF tools`}</h1><p class="hub-p">${cat ? esc(c.blurb) : 'Every tool runs in your browser. Pick one to open its page.'}</p>
    ${cat ? '' : `<div class="hub-search"><label class="sr" for="hubQ">Filter tools</label>${glyph('search')}<input id="hubQ" type="search" placeholder="Filter tools, e.g. “excel” or “password”"></div>`}
  </div></section>
  <section class="tools-sec tight"><div class="wrap">
    ${(cat ? [c] : CATEGORIES).map(cc => `<div class="hub-group" data-group="${cc.id}">${cat ? '' : `<h2 class="hub-cat"><a href="${root}tools/${HUB[cc.id]}/">${esc(cc.name)}</a><span>${TOOLS.filter(t => t.cat === cc.id).length}</span></h2>`}<ul class="tgrid">${TOOLS.filter(t => t.cat === cc.id).map(t => card(t, root)).join('')}</ul></div>`).join('')}
    <p class="hub-empty" id="hubEmpty" hidden>No tool matches that. Try “merge”, “word” or “sign”.</p>
  </div></section>
</main>
${footer(root)}
${catalogScript(root)}
</body>
</html>`;
}
function textPage(slug, title, desc, bodyHtml) {
  const root = '../';
  return `${head({ title: `${title} | ${SITE.name}`, desc, pathRel: slug + '/', root })}
<body class="page-text">
${header(root)}
<main id="main"><section class="tool-hero"><div class="wrap narrow"><h1 class="hub-h">${esc(title)}</h1></div></section>
<section class="prose"><div class="wrap narrow">${bodyHtml}</div></section></main>
${footer(root)}
${catalogScript(root)}
</body>
</html>`;
}

/* ---------- write everything ---------- */
fs.rmSync(OUT, { recursive: true, force: true });
const write = (p, s) => { const f = path.join(OUT, p); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s); };
const copyDir = (from, to) => { for (const e of fs.readdirSync(from, { withFileTypes: true })) { const a = path.join(from, e.name), b = path.join(to, e.name); if (e.isDirectory()) { fs.mkdirSync(b, { recursive: true }); copyDir(a, b); } else fs.copyFileSync(a, b); } };
fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });
copyDir('src/assets', path.join(OUT, 'assets'));

write('assets/js/catalog.js', `// Generated by build.mjs\nwindow.QUIRE=Object.assign(window.QUIRE||{},${JSON.stringify({
  cats: CATEGORIES.map(c => ({ id: c.id, name: c.name })),
  tools: TOOLS.map(t => ({ slug: t.slug, name: t.name, cat: t.cat, engine: t.engine, short: t.short, icon: badge(t.icon, 34), kw: (t.title + ' ' + t.desc).toLowerCase() })),
})});\n`);
write('index.html', landing());
TOOLS.forEach(t => write(`${t.slug}/index.html`, toolPage(t)));
write('tools/index.html', hubPage(null));
CATEGORIES.forEach(c => write(`tools/${HUB[c.id]}/index.html`, hubPage(c.id)));
write('about/index.html', textPage('about', 'About Quire', 'Quire is a set of free PDF tools that run in your browser.', `
<p>Quire is a free collection of ${TOOLS.length} PDF tools: converters, organizers, signing, password protection, OCR, translation and AI summaries.</p>
<h2>Why it runs in your browser</h2><p>Most online PDF services copy your files to their servers to process them. Quire does the work inside your browser tab instead, using open-source engines such as Mozilla’s PDF.js and pdf-lib. Your documents never leave your device, there’s no upload wait, and there’s no file size limit beyond your device’s memory.</p>
<h2>What it’s built with</h2><p>PDF.js, pdf-lib, JSZip, SheetJS, docx-preview, docx, PptxGenJS, UTIF.js, html2canvas and Tesseract.js.</p>`));
write('privacy/index.html', textPage('privacy', 'Privacy policy', 'How Quire handles your files and data.', `
<p>Last updated ${SITE.year}.</p>
<h2>Your files</h2><p>Files you open in Quire are read and processed by your web browser on your own device. They are not uploaded to or stored on our servers.</p>
<h2>Translate and AI tools</h2><p>The Translate and AI tools extract the text of your document in your browser and send that text over an encrypted (HTTPS) connection to our processing service, which forwards it to a translation provider (such as DeepL or Google Translate) or an AI provider (Anthropic) and returns the result. We do not store the text. The providers process it under their own terms.</p>
<h2>Website data</h2><p>Your browser may remember small preferences such as thumbnail size in local storage on your device. We do not use advertising cookies.</p>
<h2>Contact</h2><p>Questions about privacy can be sent through the contact details on the project’s GitHub page.</p>`));
write('terms/index.html', textPage('terms', 'Terms of use', 'Terms for using Quire’s free PDF tools.', `
<p>Quire is provided free of charge, as is, without warranties of any kind. You are responsible for the files you process and for having the right to process them, including documents you unlock or translate.</p>
<p>Keep copies of important originals. Some conversions, such as Word to PDF or PDF to Excel, approximate the original layout.</p>
<p>Do not use the Translate or AI tools to send content you are not allowed to share with third-party processors.</p>`));
write('404.html', `${head({ title: `Page not found | ${SITE.name}`, desc: 'This page could not be found.', pathRel: '404.html', root: SITE.url, noindex: true })}
<body class="page-text"><main id="main" class="nf"><div class="wrap narrow"><p class="eyebrow"><span>404</span>Page not found</p><h1 class="hub-h">This page has gone missing</h1><p>The link may be old or mistyped. Pick a tool instead:</p><p><a class="btn btn-brand" href="${SITE.url}tools/">See all tools</a> <a class="btn btn-line" href="${SITE.url}">Go home</a></p></div></main></body></html>`);
write('favicon.svg', FAVICON);
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE.url}sitemap.xml\n`);
const urls = ['', 'tools/', ...CATEGORIES.map(c => `tools/${HUB[c.id]}/`), ...TOOLS.map(t => t.slug + '/'), 'about/', 'privacy/', 'terms/'];
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${SITE.url}${u}</loc><changefreq>monthly</changefreq><priority>${u === '' ? '1.0' : u.startsWith('tools') ? '0.7' : '0.8'}</priority></url>`).join('\n')}\n</urlset>\n`);
write('.nojekyll', '');
console.log(`Built ${urls.length} pages into ./${OUT}`);
