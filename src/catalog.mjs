// Every tool on the site. Each entry becomes its own page at /<slug>/.
// engine = which converter in assets/js/app.js does the work; preset = fixed settings for that page.

export const CATEGORIES = [
  { id: 'to', name: 'Convert To PDF', short: 'To PDF', blurb: 'Turn Word, Excel, PowerPoint, images, web pages and text into PDF.' },
  { id: 'from', name: 'Convert From PDF', short: 'From PDF', blurb: 'Get editable Word, Excel and PowerPoint files, images, text or HTML out of a PDF.' },
  { id: 'organize', name: 'Organize PDF', short: 'Organize', blurb: 'Merge, split, reorder, rotate, crop and shrink PDFs.' },
  { id: 'edit', name: 'Edit PDF', short: 'Edit', blurb: 'Add page numbers, headers, watermarks and document details.' },
  { id: 'sign', name: 'Sign & Protect PDF', short: 'Sign & Protect', blurb: 'Sign, lock, unlock, redact and compare documents.' },
  { id: 'translate', name: 'Translate', short: 'Translate', blurb: 'Translate PDF documents between languages.' },
  { id: 'ai', name: 'AI Tools', short: 'AI', blurb: 'Summarize long PDFs and ask questions about them.' },
];

// icon: {to:'word'} = Word → PDF badge, {from:'word'} = PDF → Word badge, {g:'merge'} = line glyph, {lang:['DE','EN']}
const T = [];
const add = (o) => T.push(o);

/* ------------------------------ Convert to PDF ------------------------------ */
add({ slug: 'jpg-to-pdf', name: 'JPG to PDF', cat: 'to', engine: 'images', preset: { accept: 'jpg' }, icon: { to: 'jpg' },
  short: 'Turn JPG photos and scans into a PDF.',
  title: 'JPG to PDF Converter – Free, No Upload',
  desc: 'Convert JPG and JPEG images to PDF in your browser. Set page size, orientation and margins, combine many photos into one file. Free, private, no sign-up.',
  h1: 'Convert JPG to PDF', intro: 'Combine JPG photos, receipts and phone scans into one tidy PDF. Pick A4 or Letter pages, set margins and drag the images into order.',
  steps: ['Choose your JPG images or drop them on the page.', 'Drag them into order and pick page size, orientation and margin.', 'Click “Make PDF” and save the file.'],
  faq: [['Can I put several JPGs in one PDF?', 'Yes. Add as many images as you like; each becomes its own page in the order you set.'], ['Will my photos lose quality?', 'Images are placed at their full resolution. Only phone photos rotated with EXIF data are redrawn so they appear the right way up.']] });
add({ slug: 'word-to-pdf', name: 'Word to PDF', cat: 'to', engine: 'word', icon: { to: 'word' },
  short: 'Convert DOCX documents to PDF.',
  title: 'Word to PDF Converter – Convert DOCX to PDF Free',
  desc: 'Convert Microsoft Word DOCX files to PDF online without uploading them. Keeps page size, fonts, tables and images. Free and private.',
  h1: 'Convert Word to PDF', intro: 'Turn a Word document into a PDF that looks the same on every device. Pages, tables, images and headings keep their layout.',
  steps: ['Choose a .docx file or drop it on the page.', 'Pick the output quality.', 'Click “Convert to PDF” and save the file.'],
  faq: [['Does it work with old .doc files?', 'This converter reads .docx files (Word 2007 and later). Open a .doc file in Word or Google Docs and save it as .docx first.'], ['Can I select the text in the PDF?', 'Pages are rendered as high-resolution images to match your layout exactly. Run the result through OCR PDF if you need searchable text.']] });
add({ slug: 'excel-to-pdf', name: 'Excel to PDF', cat: 'to', engine: 'excel', icon: { to: 'excel' },
  short: 'Turn spreadsheets into printable PDFs.',
  title: 'Excel to PDF Converter – XLSX, XLS & CSV to PDF',
  desc: 'Convert Excel spreadsheets (XLSX, XLS, CSV, ODS) to PDF in your browser. Choose sheets, orientation and gridlines. Free, no upload.',
  h1: 'Convert Excel to PDF', intro: 'Turn spreadsheets into clean PDF tables that are easy to share and print. Each sheet flows across as many pages as it needs.',
  steps: ['Choose an Excel or CSV file.', 'Pick which sheets to include, the orientation and whether to show gridlines.', 'Click “Convert to PDF” and save the file.'],
  faq: [['Which formats are supported?', 'XLSX, XLSM, XLS, ODS and CSV files.'], ['What happens to very wide sheets?', 'Wide sheets are scaled down to fit the page width. Choose landscape for sheets with many columns.']] });
add({ slug: 'png-to-pdf', name: 'PNG to PDF', cat: 'to', engine: 'images', preset: { accept: 'png' }, icon: { to: 'png' },
  short: 'Convert PNG screenshots and graphics to PDF.',
  title: 'PNG to PDF Converter – Free & Private',
  desc: 'Convert PNG images and screenshots to PDF without uploading them. Combine several PNGs into one PDF, choose page size and margins.',
  h1: 'Convert PNG to PDF', intro: 'Put screenshots, diagrams and graphics into a single PDF. PNGs keep their sharp edges and full resolution.',
  steps: ['Choose your PNG files.', 'Arrange them and choose page size and margins.', 'Click “Make PDF” and save the file.'],
  faq: [['Is transparency kept?', 'Yes. Transparent areas of a PNG stay transparent and show the white page beneath.'], ['Is there a limit on the number of images?', 'No. Large batches only take a little longer, because everything runs on your own device.']] });
add({ slug: 'ppt-to-pdf', name: 'PPT to PDF', cat: 'to', engine: 'ppt', icon: { to: 'ppt' },
  short: 'Convert PowerPoint slides to PDF.',
  title: 'PowerPoint to PDF Converter – PPTX to PDF Free',
  desc: 'Convert PowerPoint PPTX presentations to PDF in your browser, one slide per page. Free, private and no sign-up.',
  h1: 'Convert PowerPoint to PDF', intro: 'Turn a PowerPoint deck into a PDF handout, one slide per page, keeping text, shapes, colours and pictures.',
  steps: ['Choose a .pptx file.', 'Pick the output quality.', 'Click “Convert to PDF” and save the file.'],
  faq: [['Are animations and videos kept?', 'No. A PDF is a static document, so each slide is saved as it looks when fully shown.'], ['Does it read old .ppt files?', 'It reads .pptx files. Save older .ppt files as .pptx in PowerPoint, Keynote or Google Slides first.']] });
add({ slug: 'html-to-pdf', name: 'HTML to PDF', cat: 'to', engine: 'html', icon: { to: 'html' },
  short: 'Convert HTML files or code to PDF.',
  title: 'HTML to PDF Converter – Turn HTML Code into PDF',
  desc: 'Convert HTML files or pasted HTML code to a PDF with your choice of paper size and margins. Runs in your browser, nothing uploaded.',
  h1: 'Convert HTML to PDF', intro: 'Turn an HTML file, an email template or a block of HTML code into a paginated PDF.',
  steps: ['Choose an .html file, or paste your HTML in Settings.', 'Pick paper size, orientation and margins.', 'Click “Convert to PDF” and save the file.'],
  faq: [['Can I convert a live website by URL?', 'Browsers block reading other websites directly. Save the page with Ctrl+S (or Cmd+S) as “Webpage, complete” and convert the saved .html file.'], ['Are images included?', 'Images embedded in the HTML or loaded from addresses that allow sharing are included.']] });
add({ slug: 'text-to-pdf', name: 'Text to PDF', cat: 'to', engine: 'text', preset: { accept: 'txt' }, icon: { to: 'text' },
  short: 'Turn plain TXT files into PDF.',
  title: 'Text to PDF Converter – TXT to PDF Online',
  desc: 'Convert plain text (.txt) files or pasted text to PDF. Choose font, size, paper and margins. Free, fast and private.',
  h1: 'Convert Text to PDF', intro: 'Turn notes, logs and plain-text files into a neat PDF with the font and page size you choose.',
  steps: ['Choose a .txt file, or paste text in Settings.', 'Pick the font, size, paper and margins.', 'Click “Convert to PDF” and save the file.'],
  faq: [['Does it support Hindi, Bengali or Arabic text?', 'Yes. Text in other scripts is laid out with your device’s fonts so every character shows correctly.'], ['Is the PDF text selectable?', 'For text in Latin letters, yes. Other scripts are drawn as high-resolution page images.']] });
add({ slug: 'tiff-to-pdf', name: 'TIFF to PDF', cat: 'to', engine: 'images', preset: { accept: 'tiff' }, icon: { to: 'tiff' },
  short: 'Convert single or multi-page TIFF to PDF.',
  title: 'TIFF to PDF Converter – Multi-page TIF to PDF',
  desc: 'Convert TIFF and TIF images, including multi-page faxes and scans, to PDF in your browser. Free, private and no upload.',
  h1: 'Convert TIFF to PDF', intro: 'Turn TIFF scans and faxes into a PDF anyone can open. Every frame of a multi-page TIFF becomes its own PDF page.',
  steps: ['Choose your .tif or .tiff files.', 'Pick page size and margins.', 'Click “Make PDF” and save the file.'],
  faq: [['Are multi-page TIFFs supported?', 'Yes. Each page inside the TIFF becomes a page in the PDF.'], ['Which compressions work?', 'Uncompressed, LZW, PackBits, Deflate, JPEG and CCITT fax compressions are all read.']] });
add({ slug: 'ocr-pdf', name: 'OCR PDF', cat: 'to', engine: 'ocr', icon: { to: 'ocr' },
  short: 'Make scanned PDFs searchable.',
  title: 'OCR PDF – Make Scanned PDFs Searchable Free',
  desc: 'Recognise text in scanned PDFs and add an invisible text layer so you can search, select and copy it. Supports English, Hindi, Bengali and 10 more languages.',
  h1: 'OCR PDF', intro: 'Turn a scanned PDF into a searchable one. Quire reads the text on every page and lays it invisibly over the scan, so the pages look the same but you can search and copy.',
  steps: ['Choose a scanned PDF.', 'Pick the language of the document.', 'Click “Recognise text” and save the searchable PDF and text file.'],
  faq: [['Which languages can it read?', 'English, Hindi, Bengali, Tamil, Telugu, Marathi, Urdu, Arabic, French, German, Spanish, Portuguese and Chinese.'], ['How long does it take?', 'About 5–15 seconds per page, depending on your device. The language data (a few MB) downloads once the first time.']] });
add({ slug: 'rtf-to-pdf', name: 'RTF to PDF', cat: 'to', engine: 'text', preset: { accept: 'rtf' }, icon: { to: 'rtf' },
  short: 'Convert Rich Text Format files to PDF.',
  title: 'RTF to PDF Converter – Free Online',
  desc: 'Convert RTF (Rich Text Format) documents to PDF in your browser. Choose font, size and paper. Nothing is uploaded.',
  h1: 'Convert RTF to PDF', intro: 'Turn RTF documents from WordPad, TextEdit and older word processors into PDF.',
  steps: ['Choose an .rtf file.', 'Pick font, size, paper and margins.', 'Click “Convert to PDF” and save the file.'],
  faq: [['Is formatting like bold and colours kept?', 'The text and paragraphs are kept; character styling such as bold and colours is simplified to plain text.'], ['Are pictures inside the RTF kept?', 'No. Embedded pictures are skipped. Use Word to PDF for documents with images.']] });
add({ slug: 'bmp-to-pdf', name: 'BMP to PDF', cat: 'to', engine: 'images', preset: { accept: 'bmp' }, icon: { to: 'bmp' },
  short: 'Convert BMP bitmaps to PDF.',
  title: 'BMP to PDF Converter – Free & Private',
  desc: 'Convert BMP bitmap images to PDF online without uploading. Combine several BMP files into one PDF and set page size.',
  h1: 'Convert BMP to PDF', intro: 'Turn bitmap images into a compact PDF. BMPs are compressed on the way, so the PDF is usually much smaller.',
  steps: ['Choose your BMP files.', 'Arrange them and pick page size and margins.', 'Click “Make PDF” and save the file.'],
  faq: [['Why is the PDF smaller than my BMPs?', 'BMP stores pixels uncompressed. The PDF stores them compressed at high quality.'], ['Can I mix BMP with other images?', 'Use Images to PDF to combine BMP, JPG, PNG, GIF and WebP in one file.']] });
add({ slug: 'gif-to-pdf', name: 'GIF to PDF', cat: 'to', engine: 'images', preset: { accept: 'gif' }, icon: { to: 'gif' },
  short: 'Convert GIF images to PDF.',
  title: 'GIF to PDF Converter – Free Online',
  desc: 'Convert GIF images to PDF in your browser. Combine several GIFs into one PDF with your choice of page size. Free, private.',
  h1: 'Convert GIF to PDF', intro: 'Place GIF images on PDF pages. For animated GIFs, the first frame is used.',
  steps: ['Choose your GIF files.', 'Arrange them and pick page size and margins.', 'Click “Make PDF” and save the file.'],
  faq: [['What happens to animation?', 'A PDF page is still, so the first frame of an animated GIF is used.'], ['Is transparency kept?', 'Transparent areas are shown on a white background.']] });
add({ slug: 'images-to-pdf', name: 'Images to PDF', cat: 'to', engine: 'images', preset: { accept: 'img' }, icon: { to: 'img' },
  short: 'Mix JPG, PNG, WebP, GIF and BMP in one PDF.',
  title: 'Images to PDF – Combine JPG, PNG, WebP & More',
  desc: 'Combine JPG, PNG, WebP, GIF, BMP and TIFF images into one PDF. Reorder, set page size and margins. Free and private.',
  h1: 'Convert Images to PDF', intro: 'Mix any common image format in one PDF, one image per page.',
  steps: ['Choose your images.', 'Drag them into order and pick page settings.', 'Click “Make PDF” and save the file.'],
  faq: [['Which formats can I mix?', 'JPG, PNG, WebP, GIF, BMP and TIFF.'], ['Can each image have its own page size?', 'Choose “Fit image” to make each page exactly the size of its picture.']] });

/* ------------------------------ Convert from PDF ------------------------------ */
add({ slug: 'pdf-to-word', name: 'PDF to Word', cat: 'from', engine: 'pdf2word', icon: { from: 'word' },
  short: 'Get an editable DOCX from a PDF.',
  title: 'PDF to Word Converter – Editable DOCX Free',
  desc: 'Convert PDF to an editable Word document (DOCX) in your browser. Keeps headings and paragraphs, or the exact page look. Free, no upload.',
  h1: 'Convert PDF to Word', intro: 'Turn a PDF into a Word document you can edit. Choose editable text with headings and paragraphs, or an exact copy of each page.',
  steps: ['Choose a PDF.', 'Pick “Editable text” or “Exact look”.', 'Click “Convert to Word” and save the .docx file.'],
  faq: [['Will the layout be exactly the same?', '“Editable text” keeps headings, paragraphs and page breaks but not multi-column layouts. “Exact look” keeps every page exactly as it appears, as pictures.'], ['My PDF is a scan. Will it work?', 'Run it through OCR PDF first, then convert the result to Word.']] });
add({ slug: 'pdf-to-jpg', name: 'PDF to JPG', cat: 'from', engine: 'toimage', preset: { fmt: 'jpg' }, icon: { from: 'jpg' },
  short: 'Save PDF pages as JPG images.',
  title: 'PDF to JPG Converter – High Quality, Free',
  desc: 'Convert PDF pages to JPG images at up to 300 dpi. Choose all pages or a range. Runs in your browser, nothing uploaded.',
  h1: 'Convert PDF to JPG', intro: 'Save every page of a PDF, or just the ones you need, as JPG images ready for slides, social posts or messages.',
  steps: ['Choose a PDF.', 'Pick the resolution and which pages to convert.', 'Click “Convert pages” and save the images.'],
  faq: [['What resolution should I choose?', '150 dpi is right for screens and messaging. Pick 300 dpi for printing.'], ['Can I convert just one page?', 'Yes. Type the page number, or a range such as 2-4, in the Pages box.']] });
add({ slug: 'pdf-to-excel', name: 'PDF to Excel', cat: 'from', engine: 'pdf2excel', icon: { from: 'excel' },
  short: 'Pull tables out of a PDF into XLSX.',
  title: 'PDF to Excel Converter – Extract Tables to XLSX',
  desc: 'Extract tables from PDF to an Excel spreadsheet (XLSX). Rows and columns are detected automatically, numbers stay numbers. Free and private.',
  h1: 'Convert PDF to Excel', intro: 'Get the tables out of statements, invoices and reports into a spreadsheet. Columns are lined up and numbers come through as real numbers.',
  steps: ['Choose a PDF.', 'Pick one sheet per page or everything in one sheet.', 'Click “Convert to Excel” and save the .xlsx file.'],
  faq: [['Does it work with scanned statements?', 'Scans hold pictures of text. Run them through OCR PDF first.'], ['Are numbers kept as numbers?', 'Yes. Values such as 1,250.00 become numbers you can add up.']] });
add({ slug: 'pdf-to-png', name: 'PDF to PNG', cat: 'from', engine: 'toimage', preset: { fmt: 'png' }, icon: { from: 'png' },
  short: 'Save PDF pages as sharp PNG images.',
  title: 'PDF to PNG Converter – Lossless Page Images',
  desc: 'Convert PDF pages to lossless PNG images up to 300 dpi. Perfect for text, diagrams and line art. Free, no upload.',
  h1: 'Convert PDF to PNG', intro: 'Export PDF pages as crisp PNG images. PNG keeps text and line art sharp with no compression blur.',
  steps: ['Choose a PDF.', 'Pick the resolution and pages.', 'Click “Convert pages” and save the images.'],
  faq: [['PNG or JPG?', 'PNG is sharper for text and diagrams. JPG is smaller for photos.'], ['Will I get one file per page?', 'Yes, plus a ZIP with all of them when there is more than one.']] });
add({ slug: 'pdf-to-ppt', name: 'PDF to PPT', cat: 'from', engine: 'pdf2ppt', icon: { from: 'ppt' },
  short: 'Turn PDF pages into PowerPoint slides.',
  title: 'PDF to PowerPoint Converter – PDF to PPTX Free',
  desc: 'Convert a PDF into a PowerPoint (PPTX) presentation, one page per slide. Free, private and fast.',
  h1: 'Convert PDF to PowerPoint', intro: 'Turn a PDF into a PowerPoint deck with one page on each slide, ready to present or add speaker notes to.',
  steps: ['Choose a PDF.', 'Pick the image quality.', 'Click “Convert to PowerPoint” and save the .pptx file.'],
  faq: [['Can I edit the text on the slides?', 'Each slide holds a picture of the page, so the look is exact. Add your own text boxes on top in PowerPoint.'], ['What slide size is used?', 'The slides match the shape of your PDF pages.']] });
add({ slug: 'pdf-to-text', name: 'PDF to Text', cat: 'from', engine: 'totext', icon: { from: 'text' },
  short: 'Extract the text of a PDF.',
  title: 'PDF to Text Converter – Extract Text to TXT',
  desc: 'Extract all text from a PDF to a plain text (TXT) or Markdown file, page by page. Free and private.',
  h1: 'Convert PDF to Text', intro: 'Pull the words out of a PDF into a plain text or Markdown file, page by page.',
  steps: ['Choose a PDF.', 'Pick plain text or Markdown.', 'Click “Extract text” and save the file.'],
  faq: [['Why is my result empty?', 'Scanned PDFs hold pictures of text. Use OCR PDF first.'], ['Is the reading order right?', 'Lines are read top to bottom and left to right. Multi-column pages may need a little tidying.']] });
add({ slug: 'pdf-to-tiff', name: 'PDF to TIFF', cat: 'from', engine: 'toimage', preset: { fmt: 'tiff' }, icon: { from: 'tiff' },
  short: 'Convert PDF to a multi-page TIFF.',
  title: 'PDF to TIFF Converter – Multi-page TIFF Free',
  desc: 'Convert PDF pages into a multi-page TIFF or one TIFF per page, up to 300 dpi. Free and private, nothing uploaded.',
  h1: 'Convert PDF to TIFF', intro: 'Create TIFF images for archives, fax systems and print workflows, as one multi-page file or one file per page.',
  steps: ['Choose a PDF.', 'Pick the resolution and whether you want one file or one per page.', 'Click “Convert pages” and save.'],
  faq: [['Can I get all pages in one TIFF?', 'Yes. Choose “One multi-page file”.'], ['Why are TIFF files large?', 'TIFF stores pixels without lossy compression, which keeps full quality.']] });
add({ slug: 'pdf-to-html', name: 'PDF to HTML', cat: 'from', engine: 'pdf2html', icon: { from: 'html' },
  short: 'Turn a PDF into a web page.',
  title: 'PDF to HTML Converter – PDF to Web Page',
  desc: 'Convert a PDF to a single HTML file, either as an exact page copy with selectable text or as clean, readable HTML. Free, no upload.',
  h1: 'Convert PDF to HTML', intro: 'Publish a PDF as a web page. Choose an exact copy of every page with selectable text, or simple HTML with headings and paragraphs.',
  steps: ['Choose a PDF.', 'Pick “Exact look” or “Clean HTML”.', 'Click “Convert to HTML” and save the file.'],
  faq: [['Is it one file?', 'Yes. Images are embedded inside the HTML file, so it works on its own.'], ['Which option is better for SEO?', '“Clean HTML” gives real headings and paragraphs that search engines read best.']] });
add({ slug: 'pdf-to-bmp', name: 'PDF to BMP', cat: 'from', engine: 'toimage', preset: { fmt: 'bmp' }, icon: { from: 'bmp' },
  short: 'Save PDF pages as BMP bitmaps.',
  title: 'PDF to BMP Converter – Free Online',
  desc: 'Convert PDF pages to BMP bitmap images at your chosen resolution. Runs in your browser, free and private.',
  h1: 'Convert PDF to BMP', intro: 'Export PDF pages as uncompressed BMP bitmaps for software that needs them.',
  steps: ['Choose a PDF.', 'Pick resolution and pages.', 'Click “Convert pages” and save the images.'],
  faq: [['Why are BMP files so big?', 'BMP stores every pixel without compression. Use PDF to PNG for smaller lossless files.'], ['Which colour depth is used?', '24-bit colour, which every program can open.']] });

/* ------------------------------ Organize ------------------------------ */
add({ slug: 'merge-pdf', name: 'Merge PDF', cat: 'organize', engine: 'merge', icon: { g: 'merge' },
  short: 'Combine several PDFs into one.',
  title: 'Merge PDF – Combine PDF Files Free, No Upload',
  desc: 'Merge PDF files into one document in the order you choose. Drag to reorder, no file size limits, nothing uploaded. Free.',
  h1: 'Merge PDF files', intro: 'Combine several PDFs into one file. Drag them into the right order and merge in seconds.',
  steps: ['Choose two or more PDFs.', 'Drag them into the order you want.', 'Click “Merge files” and save the combined PDF.'],
  faq: [['Is there a limit on files or size?', 'No. Everything runs on your device, so the only limit is its memory.'], ['Can I reorder pages, not just files?', 'Merge first, then open the result in Organize PDF.']] });
add({ slug: 'split-pdf', name: 'Split PDF', cat: 'organize', engine: 'split', icon: { g: 'split' },
  short: 'Extract pages or split by range.',
  title: 'Split PDF – Extract Pages from PDF Free',
  desc: 'Split a PDF by page ranges, extract selected pages into a new file, or save every page separately. Free and private.',
  h1: 'Split PDF', intro: 'Pick pages by clicking them or type ranges. Save each range as its own PDF, all picked pages as one file, or every page separately.',
  steps: ['Choose a PDF.', 'Click pages or type ranges such as 1-3, 7.', 'Click “Split file” and save the results.'],
  faq: [['How do I extract a single page?', 'Click that page, choose “One file”, then split.'], ['What does “8-” mean?', 'From page 8 to the last page.']] });
add({ slug: 'organize-pdf', name: 'Organize PDF', cat: 'organize', engine: 'organize', icon: { g: 'organize' },
  short: 'Reorder, rotate, copy or delete pages.',
  title: 'Organize PDF – Reorder, Delete & Rotate Pages',
  desc: 'Rearrange PDF pages by dragging, rotate single pages, duplicate, delete or insert blank pages. Free online, no upload.',
  h1: 'Organize PDF pages', intro: 'See every page, drag them into a new order, turn the sideways ones, delete what you don’t need and add blank pages.',
  steps: ['Choose a PDF.', 'Drag, rotate, copy or delete pages.', 'Click “Save new order” and save the PDF.'],
  faq: [['Can I undo changes?', 'Use “Restore original” at any time before saving.'], ['Can I insert a blank page?', 'Yes. Use “Add blank page”, then drag it where you want.']] });
add({ slug: 'remove-blank-pages', name: 'Remove Blank Pages', cat: 'organize', engine: 'blank', icon: { g: 'blank' },
  short: 'Find and delete empty pages.',
  title: 'Remove Blank Pages from PDF – Automatic & Free',
  desc: 'Automatically find and remove blank pages from scanned PDFs. Review the picks before saving. Free and private.',
  h1: 'Remove blank pages from a PDF', intro: 'Duplex scans are full of empty backs. Quire finds them for you; check the picks, then save a clean file.',
  steps: ['Choose a PDF.', 'Check the pages marked “Remove” and click any to change.', 'Click “Remove pages” and save.'],
  faq: [['What if it marks a page I need?', 'Click the page to keep it.'], ['What counts as blank?', 'Choose “Fully empty”, “Almost empty” or “Faint marks” to set how strict the check is.']] });
add({ slug: 'rotate-pdf', name: 'Rotate PDF', cat: 'organize', engine: 'rotate', icon: { g: 'rotate' },
  short: 'Turn pages the right way up.',
  title: 'Rotate PDF – Rotate Pages Permanently, Free',
  desc: 'Rotate all PDF pages or only odd, even or chosen pages by 90° or 180° and save permanently. Free, no upload.',
  h1: 'Rotate PDF pages', intro: 'Fix sideways or upside-down pages for good. Turn every page, odd or even pages, or a list you choose.',
  steps: ['Choose a PDF.', 'Pick the turn and which pages.', 'Click “Rotate pages” and save.'],
  faq: [['Is the rotation permanent?', 'Yes. The saved PDF opens the right way in every viewer.'], ['Can I rotate just one page?', 'Choose “Listed” and type the page number.']] });
add({ slug: 'compress-pdf', name: 'Compress PDF', cat: 'organize', engine: 'compress', icon: { g: 'compress' },
  short: 'Shrink scanned and image-heavy PDFs.',
  title: 'Compress PDF – Reduce PDF File Size Free',
  desc: 'Reduce the size of scanned and image-heavy PDFs for email and upload limits. Three strength levels. Free and private.',
  h1: 'Compress PDF', intro: 'Make big scanned PDFs small enough to email or upload to government and job portals.',
  steps: ['Choose a PDF.', 'Pick Light, Medium or Strong.', 'Click “Compress file” and save the smaller PDF.'],
  faq: [['How much smaller will it get?', 'Scans often shrink by 50–90%. PDFs that are mostly text are usually small already.'], ['Will I still be able to select text?', 'No. Pages are redrawn as images, which is what makes scans much smaller.']] });
add({ slug: 'crop-pdf', name: 'Crop PDF', cat: 'organize', engine: 'crop', icon: { g: 'crop' },
  short: 'Trim margins from every page.',
  title: 'Crop PDF – Trim PDF Margins Online Free',
  desc: 'Crop the margins of PDF pages by millimetres with a live preview of what gets trimmed. Free, private, no sign-up.',
  h1: 'Crop PDF margins', intro: 'Trim white margins or unwanted edges from every page. The shaded area shows exactly what will go.',
  steps: ['Choose a PDF.', 'Set top, bottom, left and right margins in millimetres.', 'Click “Crop pages” and save.'],
  faq: [['Can the cropped area be recovered?', 'The trimmed edges are hidden, not deleted, so editing apps can restore them.'], ['Can I crop pages differently?', 'This tool trims the same margin from every page.']] });
add({ slug: 'resize-pdf', name: 'Resize PDF', cat: 'organize', engine: 'resize', icon: { g: 'resize' },
  short: 'Fit pages to A4, Letter and more.',
  title: 'Resize PDF Pages – Change to A4, Letter, A5',
  desc: 'Change the page size of a PDF to A4, US Letter, Legal, A5 or A3, keeping proportions and orientation. Free online.',
  h1: 'Resize PDF pages', intro: 'Fit every page onto standard paper so the document prints properly anywhere.',
  steps: ['Choose a PDF.', 'Pick the paper size and margin.', 'Click “Resize pages” and save.'],
  faq: [['Will content be stretched?', 'No. Pages are scaled evenly and centred on the new paper.'], ['Are landscape pages kept landscape?', 'Yes. Each page keeps its own orientation.']] });
add({ slug: 'pages-per-sheet', name: 'Pages per Sheet', cat: 'organize', engine: 'nup', icon: { g: 'nup' },
  short: 'Print 2, 4 or 6 pages on one sheet.',
  title: 'Pages per Sheet – N-up PDF (2, 4, 6 Up) Free',
  desc: 'Put 2, 4 or 6 PDF pages on each sheet for handouts and paper-saving prints. Free, private, no upload.',
  h1: 'Put several pages on one sheet', intro: 'Save paper by printing two, four or six pages on each sheet, with optional borders.',
  steps: ['Choose a PDF.', 'Pick pages per sheet and paper size.', 'Click “Arrange pages” and save.'],
  faq: [['Is the text still readable at 4-up?', 'Yes for most documents. Use 2-up for small print.'], ['Which order are pages placed in?', 'Left to right, then top to bottom.']] });

/* ------------------------------ Edit ------------------------------ */
add({ slug: 'add-page-numbers', name: 'Page Numbers', cat: 'edit', engine: 'numbers', icon: { g: 'numbers' },
  short: 'Number pages in any corner.',
  title: 'Add Page Numbers to PDF – Free & Easy',
  desc: 'Add page numbers to a PDF in any corner or margin, with formats like “Page 3 of 12”. Live preview. Free and private.',
  h1: 'Add page numbers to a PDF', intro: 'Number your pages with a live preview. Choose position, format, size and starting number.',
  steps: ['Choose a PDF.', 'Pick position, format and starting number.', 'Click “Add numbers” and save.'],
  faq: [['Can I skip the cover page?', 'Yes. Tick “Leave the first page unnumbered”.'], ['Can I start from a number other than 1?', 'Yes. Set “First number”.']] });
add({ slug: 'header-footer-pdf', name: 'Header & Footer', cat: 'edit', engine: 'headerfooter', icon: { g: 'header' },
  short: 'Add text to the top and bottom of pages.',
  title: 'Add Header and Footer to PDF – Free Online',
  desc: 'Add a header and footer to every PDF page with placeholders for page number, total pages, date and file name. Free.',
  h1: 'Add a header and footer to a PDF', intro: 'Stamp a title, a date or “Confidential” on every page. Use {page}, {total}, {date} and {file} as placeholders.',
  steps: ['Choose a PDF.', 'Type the header and footer text.', 'Click “Add header & footer” and save.'],
  faq: [['What placeholders can I use?', '{page}, {total}, {date} and {file}.'], ['Can I leave the cover plain?', 'Yes. Tick “Leave the first page plain”.']] });
add({ slug: 'watermark-pdf', name: 'Watermark PDF', cat: 'edit', engine: 'watermark', icon: { g: 'watermark' },
  short: 'Stamp text or a logo across pages.',
  title: 'Watermark PDF – Add Text or Logo Watermark Free',
  desc: 'Add a text or image watermark such as DRAFT or your logo to every page of a PDF. Diagonal or tiled, with live preview.',
  h1: 'Add a watermark to a PDF', intro: 'Mark documents as DRAFT or CONFIDENTIAL, or stamp your logo, once or tiled across every page.',
  steps: ['Choose a PDF.', 'Type your text or pick a logo, then set size, angle and opacity.', 'Click “Add watermark” and save.'],
  faq: [['Can I use my logo?', 'Yes. Choose “Image” and pick a PNG or JPG. Transparent PNGs look best.'], ['Can the watermark be removed?', 'It is drawn into the page, so it can’t be switched off in a normal viewer.']] });
add({ slug: 'grayscale-pdf', name: 'Grayscale PDF', cat: 'edit', engine: 'grayscale', icon: { g: 'gray' },
  short: 'Convert colour PDFs to black and white.',
  title: 'Grayscale PDF – Convert PDF to Black & White',
  desc: 'Convert a colour PDF to grayscale for black-and-white printing and smaller files. Free, private, no upload.',
  h1: 'Convert PDF to grayscale', intro: 'Turn every page into shades of grey, ready for black-and-white printing.',
  steps: ['Choose a PDF.', 'Pick the quality.', 'Click “Convert to grey” and save.'],
  faq: [['Will text stay selectable?', 'No. Pages are redrawn as grey images.'], ['Does it save ink?', 'It stops printers mixing coloured inks for black and grey areas.']] });
add({ slug: 'edit-pdf-metadata', name: 'PDF Metadata', cat: 'edit', engine: 'info', icon: { g: 'info' },
  short: 'See and edit title, author and details.',
  title: 'Edit PDF Metadata – Title, Author, Keywords',
  desc: 'View PDF details and edit the title, author, subject and keywords stored inside the file. Free and private.',
  h1: 'View and edit PDF metadata', intro: 'See a PDF’s page size, version and creator, and change the title, author, subject and keywords stored inside it.',
  steps: ['Choose a PDF.', 'Edit the title, author, subject and keywords.', 'Click “Save info” and save the PDF.'],
  faq: [['Why does metadata matter?', 'Search engines and document systems show the title and author, and use keywords to find files.'], ['Is anything else changed?', 'No. Pages stay exactly as they were.']] });
add({ slug: 'flatten-pdf', name: 'Flatten PDF', cat: 'edit', engine: 'flatten', icon: { g: 'flatten' },
  short: 'Lock filled form answers in place.',
  title: 'Flatten PDF Form – Lock Fillable Fields Free',
  desc: 'Flatten a filled PDF form so the answers become part of the page and can no longer be edited. Free, private.',
  h1: 'Flatten a PDF form', intro: 'Turn filled-in form fields into fixed text so nobody can change the answers after you send them.',
  steps: ['Choose a filled PDF form.', 'Check the preview.', 'Click “Flatten form” and save.'],
  faq: [['Can I undo flattening?', 'No. Keep your original if you might need to edit the answers.'], ['What if the PDF has no form?', 'Quire tells you, and nothing is changed.']] });

/* ------------------------------ Sign & Protect ------------------------------ */
add({ slug: 'sign-pdf', name: 'Sign PDF', cat: 'sign', engine: 'sign', icon: { g: 'sign' },
  short: 'Draw, type or upload a signature.',
  title: 'Sign PDF Online Free – Add Signature to PDF',
  desc: 'Sign a PDF by drawing, typing or uploading your signature, and add text and dates anywhere. Free, private, no account.',
  h1: 'Sign a PDF', intro: 'Draw, type or upload your signature and place it, along with your name and today’s date, anywhere on the pages.',
  steps: ['Choose a PDF.', 'Create your signature, then place it, text or a date on the page.', 'Click “Save signed PDF”.'],
  faq: [['Is this a legally valid e-signature?', 'It adds a visible signature image, which many agreements accept. It is not a certificate-based digital signature.'], ['Is my signature stored?', 'No. It exists only in this browser tab.']] });
add({ slug: 'protect-pdf', name: 'Protect PDF', cat: 'sign', engine: 'protect', icon: { g: 'protect' },
  short: 'Lock a PDF with a password.',
  title: 'Protect PDF with Password – AES-256 Encryption',
  desc: 'Password-protect a PDF with AES-256 encryption and choose whether people can print, copy or edit. Free, private, no upload.',
  h1: 'Protect a PDF with a password', intro: 'Lock a PDF with strong AES-256 encryption so only people with the password can open it.',
  steps: ['Choose a PDF.', 'Type a password twice and pick the permissions.', 'Click “Lock with password” and save.'],
  faq: [['How strong is the protection?', 'AES-256, the strongest standard PDF encryption.'], ['What if I forget the password?', 'It can’t be recovered. Keep the original file or store the password safely.']] });
add({ slug: 'unlock-pdf', name: 'Unlock PDF', cat: 'sign', engine: 'unlock', icon: { g: 'unlock' },
  short: 'Remove a PDF password you know.',
  title: 'Unlock PDF – Remove PDF Password Free',
  desc: 'Remove the password and printing or copying limits from a PDF you are allowed to open. Free, private, no upload.',
  h1: 'Unlock a PDF', intro: 'Remove the password from a PDF you can open, so you don’t have to type it every time.',
  steps: ['Choose a protected PDF.', 'Type its current password.', 'Click “Remove password” and save.'],
  faq: [['Can it crack a password I don’t know?', 'No. You need the password to open the file.'], ['What about PDFs that only block printing?', 'Leave the password empty and the limits are removed.']] });
add({ slug: 'redact-pdf', name: 'Redact PDF', cat: 'sign', engine: 'redact', icon: { g: 'redact' },
  short: 'Black out private information for good.',
  title: 'Redact PDF – Black Out Text Permanently Free',
  desc: 'Permanently black out names, numbers and private details in a PDF. Covered content is removed, not just hidden. Free and private.',
  h1: 'Redact a PDF', intro: 'Draw boxes over names, account numbers or anything private. The content underneath is removed for good.',
  steps: ['Choose a PDF.', 'Drag boxes over what you want removed.', 'Click “Apply redactions” and save.'],
  faq: [['Is the hidden text really gone?', 'Yes. Redacted pages are redrawn as images with the boxes burned in, so nothing can be copied out.'], ['Do other pages change?', 'No. Only pages with boxes are redrawn.']] });
add({ slug: 'compare-pdf', name: 'Compare PDF', cat: 'sign', engine: 'compare', icon: { g: 'compare' },
  short: 'Spot changes between two versions.',
  title: 'Compare PDF Files – Find Differences Free',
  desc: 'Compare two PDF versions page by page and highlight every change. Added content in red, removed in blue. Free, no upload.',
  h1: 'Compare two PDFs', intro: 'Find every change between two versions of a contract, drawing or report, highlighted page by page.',
  steps: ['Choose the original and the changed PDF.', 'Pick the sensitivity.', 'Click “Compare versions” and review or save the report.'],
  faq: [['What do the colours mean?', 'Red is new in the changed version; blue was in the original.'], ['Can it compare scans?', 'Yes, as long as both are scanned the same way.']] });

/* ------------------------------ Translate ------------------------------ */
const trFaq = [['Is my document uploaded?', 'Only the text is sent, over an encrypted connection, to this site’s translation service. The PDF itself stays on your device.'], ['What do I get back?', 'An editable Word document with the translated text, page by page, plus a plain text copy.']];
add({ slug: 'german-to-english', name: 'German to English', cat: 'translate', engine: 'translate', preset: { source: 'de', target: 'en' }, icon: { lang: ['DE', 'EN'] },
  short: 'Translate German PDFs into English.',
  title: 'Translate German PDF to English – Free Online',
  desc: 'Translate a German PDF document into English and get an editable Word file back, page by page.',
  h1: 'Translate PDF from German to English', intro: 'Translate German letters, contracts and reports into English. You get an editable Word document page by page.',
  steps: ['Choose a German PDF.', 'Check the languages.', 'Click “Translate” and save the Word document.'], faq: trFaq });
add({ slug: 'english-to-arabic', name: 'English to Arabic', cat: 'translate', engine: 'translate', preset: { source: 'en', target: 'ar' }, icon: { lang: ['EN', 'AR'] },
  short: 'Translate English PDFs into Arabic.',
  title: 'Translate English PDF to Arabic – Online',
  desc: 'Translate an English PDF into Arabic with right-to-left formatting in an editable Word document.',
  h1: 'Translate PDF from English to Arabic', intro: 'Translate English documents into Arabic. The Word file is set right-to-left so it reads naturally.',
  steps: ['Choose an English PDF.', 'Check the languages.', 'Click “Translate” and save the Word document.'], faq: trFaq });
add({ slug: 'french-to-english', name: 'French to English', cat: 'translate', engine: 'translate', preset: { source: 'fr', target: 'en' }, icon: { lang: ['FR', 'EN'] },
  short: 'Translate French PDFs into English.',
  title: 'Translate French PDF to English – Free Online',
  desc: 'Translate a French PDF document into English and download an editable Word file.',
  h1: 'Translate PDF from French to English', intro: 'Translate French documents into English, page by page, as an editable Word file.',
  steps: ['Choose a French PDF.', 'Check the languages.', 'Click “Translate” and save the Word document.'], faq: trFaq });
add({ slug: 'translate-pdf-to-english', name: 'Multi-languages to English', cat: 'translate', engine: 'translate', preset: { source: 'auto', target: 'en' }, icon: { lang: ['🌐', 'EN'] },
  short: 'Any language into English.',
  title: 'Translate Any PDF to English – Auto-detect Language',
  desc: 'Translate a PDF in any language into English. The source language is detected automatically.',
  h1: 'Translate any PDF to English', intro: 'Upload a PDF in any language; the language is detected and translated into English.',
  steps: ['Choose a PDF in any language.', 'Leave the source on “Detect” or pick it.', 'Click “Translate” and save the Word document.'], faq: trFaq });
add({ slug: 'translate-pdf-to-spanish', name: 'Multi-languages to Spanish', cat: 'translate', engine: 'translate', preset: { source: 'auto', target: 'es' }, icon: { lang: ['🌐', 'ES'] },
  short: 'Any language into Spanish.',
  title: 'Translate Any PDF to Spanish – Auto-detect',
  desc: 'Translate a PDF in any language into Spanish, with automatic language detection. Get an editable Word document.',
  h1: 'Translate any PDF to Spanish', intro: 'Translate PDFs from any language into Spanish, as an editable Word document.',
  steps: ['Choose a PDF.', 'Leave the source on “Detect” or pick it.', 'Click “Translate” and save the Word document.'], faq: trFaq });
add({ slug: 'translate-pdf', name: 'Translate PDF', cat: 'translate', engine: 'translate', preset: { source: 'auto', target: 'hi' }, icon: { lang: ['🌐', 'HI'] },
  short: 'Choose any two languages.',
  title: 'Translate PDF – Any Language, Including Hindi',
  desc: 'Translate PDF documents between English, Hindi, Bengali, Arabic, Spanish, French, German and more.',
  h1: 'Translate a PDF', intro: 'Pick any source and target language, including Hindi and Bengali, and get an editable translation.',
  steps: ['Choose a PDF.', 'Pick the source and target languages.', 'Click “Translate” and save the Word document.'], faq: trFaq });

/* ------------------------------ AI ------------------------------ */
const aiFaq = [['Is my document uploaded?', 'Only the extracted text is sent, over an encrypted connection, to this site’s AI service to write the answer. The PDF itself stays on your device.'], ['Does it work on scans?', 'Run scanned PDFs through OCR PDF first so there is text to read.']];
add({ slug: 'ai-pdf-summarizer', name: 'AI PDF Summarizer', cat: 'ai', engine: 'ai', preset: { task: 'summarize' }, icon: { g: 'ai' },
  short: 'Get the key points of a long PDF.',
  title: 'AI PDF Summarizer – Summarize PDF Documents',
  desc: 'Summarize long PDF reports, papers and contracts into clear key points with AI. Choose short, medium or detailed summaries.',
  h1: 'Summarize a PDF with AI', intro: 'Get the main points of a long report, paper or contract in seconds, as a short brief or a detailed summary.',
  steps: ['Choose a PDF.', 'Pick the summary length and language.', 'Click “Summarize” and read or save the result.'], faq: aiFaq });
add({ slug: 'ask-pdf', name: 'Ask Your PDF', cat: 'ai', engine: 'ai', preset: { task: 'ask' }, icon: { g: 'ask' },
  short: 'Ask questions, get answers from the PDF.',
  title: 'Ask PDF – Chat with Your PDF Using AI',
  desc: 'Ask questions about a PDF and get answers drawn from its text, with page references. Works with reports, manuals and contracts.',
  h1: 'Ask questions about your PDF', intro: 'Ask anything about a document, such as a deadline, a figure or a clause, and get an answer with the pages it came from.',
  steps: ['Choose a PDF.', 'Type your question.', 'Click “Ask” and read the answer.'], faq: aiFaq });

export const TOOLS = T;

// Questions shown on every tool page, after the tool's own.
export const COMMON_FAQ = [
  ['Is it free?', 'Yes. Every tool is free with no sign-up, no watermark and no daily limit.'],
  ['Are my files uploaded?', 'No. Files are opened and processed by your browser on your own device. The only exceptions are the Translate and AI tools, which send the document’s text, never the file, to a translation or AI service.'],
  ['Does it work on my phone?', 'Yes. Quire works in modern browsers on Android, iPhone, Windows, Mac and Linux.'],
];
