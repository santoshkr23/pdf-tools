# Quire – free PDF tools that run in the browser

Quire is a static website with **50 PDF tools**, each on its own page so it can rank in search on its own. All file processing happens in the visitor's browser, so files are never uploaded. The only exceptions are the Translate and AI tools, which send the document's text to a small worker you control.

**Live site (after you enable GitHub Pages):** https://santoshkr23.github.io/pdf-tools/

## Tools

| Category | Tools |
|---|---|
| Convert to PDF | JPG, Word, Excel, PNG, PowerPoint, HTML, Text, TIFF, RTF, BMP, GIF, Images to PDF, OCR PDF |
| Convert from PDF | PDF to Word, JPG, Excel, PNG, PowerPoint, Text, TIFF, HTML, BMP |
| Organize | Merge, Split, Organize pages, Remove blank pages, Rotate, Compress, Crop, Resize, Pages per sheet |
| Edit | Page numbers, Header & footer, Watermark, Grayscale, Metadata, Flatten form |
| Sign & Protect | Sign, Protect (AES-256), Unlock, Redact, Compare |
| Translate | German→English, English→Arabic, French→English, Any→English, Any→Spanish, Translate PDF (any pair) |
| AI | AI PDF Summarizer, Ask Your PDF |

## Publish on GitHub Pages

1. On GitHub, open the repository and go to **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select the branch **main** and the folder **/docs**, then click **Save**.
4. After a minute or two the site is live at `https://santoshkr23.github.io/pdf-tools/`.

### Using your own domain

1. Add the domain under **Settings → Pages → Custom domain**.
2. In `src/site.config.mjs`, change `url` to `https://your-domain.com/`.
3. Add the domain to `ALLOWED_ORIGINS` in `worker/wrangler.toml`.
4. Rebuild and push.

## Turn on Translate and AI

Follow [worker/README.md](worker/README.md). Until then, those pages explain that the feature isn't connected yet. Every other tool works without any setup.

## Making changes

The pages in `docs/` are generated, so don't edit them directly. Edit these files instead:

| File | What it controls |
|---|---|
| `src/site.config.mjs` | Site name, address, API worker address |
| `src/catalog.mjs` | Every tool: name, category, page title, meta description, intro, steps and FAQs |
| `src/assets/css/site.css` | All styling: colours, fonts, layout |
| `src/assets/js/app.js` | The tool engine: every converter |
| `src/assets/js/site.js` | Menus, search (Ctrl K), category tabs |
| `build.mjs` | Page templates: landing page, tool pages, footer, sitemap |

Then rebuild:

```bash
npm run build      # writes docs/
```

Commit both `src/` and `docs/`.

### Adding a tool

Add an entry to `src/catalog.mjs` that reuses an existing `engine`, for example a new image format page using `engine: 'images'`, and run the build. A new page, its sitemap entry and its menu links appear automatically.

## SEO built in

- One page per tool with a unique title, meta description, H1, how-to steps and FAQ.
- JSON-LD on every page: `WebApplication`, `HowTo`, `FAQPage` and `BreadcrumbList`.
- Canonical URLs, Open Graph and Twitter cards, `sitemap.xml` and `robots.txt`.
- Category hub pages under `/tools/`, plus related-tool links on every page for internal linking.
- Submit `https://santoshkr23.github.io/pdf-tools/sitemap.xml` in Google Search Console after launch.

## How it works

The libraries load from public CDNs at pinned versions:

| Library | Used for |
|---|---|
| [PDF.js](https://mozilla.github.io/pdf.js/) | Reading and rendering PDFs |
| [@cantoo/pdf-lib](https://github.com/cantoo-scribe/pdf-lib) | Writing PDFs and AES-256 encryption |
| [docx-preview](https://github.com/VolodymyrBaydalka/docxjs) | Word → PDF |
| [SheetJS](https://sheetjs.com) | Excel |
| [docx](https://docx.js.org) | PDF → Word |
| [PptxGenJS](https://gitbrent.github.io/PptxGenJS/) | PDF → PowerPoint |
| [UTIF.js](https://github.com/photopea/UTIF.js) | TIFF |
| [html2canvas](https://html2canvas.hertzen.com) | Rendering Office and HTML pages |
| [Tesseract.js](https://tesseract.projectnaptha.com) | OCR |
| [JSZip](https://stuk.github.io/jszip/) | ZIP downloads |

### Known limits

These are honest trade-offs of doing everything in the browser:

- Word, PowerPoint and HTML to PDF produce image-based pages that look like the original. Run OCR PDF on the result if you need selectable text.
- PowerPoint charts and SmartArt may be simplified.
- Compress, Grayscale and Redact redraw affected pages as images.
- Old `.doc` and `.ppt` files must be saved as `.docx` and `.pptx` first.
