// Quire API – a small Cloudflare Worker that keeps your translation and AI keys secret.
// Routes:  POST /translate  { texts: string[], source: 'auto'|'de'|…, target: 'en'|… }  →  { texts: string[], detected?: string }
//          POST /ai         { task: 'summarize'|'ask', text, question?, length?, language?, title? }  →  { text }
// Settings (wrangler.toml [vars] or the Cloudflare dashboard):
//   ALLOWED_ORIGINS     comma-separated site addresses allowed to call this worker, e.g. https://santoshkr23.github.io
//   TRANSLATE_PROVIDER  "deepl" or "google"
//   AI_MODEL            Claude model for the AI tools (default claude-haiku-5-5)
// Secrets (wrangler secret put NAME):  DEEPL_API_KEY, GOOGLE_API_KEY, ANTHROPIC_API_KEY

const MAX_TRANSLATE_CHARS = 30000;   // per request (the site sends ~12k at a time)
const MAX_AI_CHARS = 320000;         // per request

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    const okOrigin = allowed.length === 0 || allowed.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    const cors = { 'Access-Control-Allow-Origin': okOrigin ? origin || '*' : 'null', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'content-type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' };
    const reply = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { ...cors, 'content-type': 'application/json' } });

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (!okOrigin) return reply({ error: 'This site isn’t allowed to use the service.' }, 403);
    const path = new URL(request.url).pathname.replace(/\/+$/, '');
    if (request.method === 'GET' && path === '') return reply({ ok: true, translate: !!(env.DEEPL_API_KEY || env.GOOGLE_API_KEY), ai: !!env.ANTHROPIC_API_KEY });
    if (request.method !== 'POST') return reply({ error: 'Use POST.' }, 405);

    let body; try { body = await request.json(); } catch (e) { return reply({ error: 'The request wasn’t valid JSON.' }, 400); }
    try {
      if (path === '/translate') return reply(await translate(body, env));
      if (path === '/ai') return reply(await ai(body, env));
      return reply({ error: 'Unknown address.' }, 404);
    } catch (e) {
      return reply({ error: e.publicMessage || 'The service had a problem. Try again in a minute.' }, e.status || 502);
    }
  },
};

const fail = (msg, status = 400) => Object.assign(new Error(msg), { publicMessage: msg, status });

/* ---------------- translation ---------------- */
async function translate({ texts, source = 'auto', target }, env) {
  if (!Array.isArray(texts) || !texts.length || !target) throw fail('Send texts and a target language.');
  if (texts.length > 128) throw fail('Send at most 128 paragraphs at a time.');
  const chars = texts.reduce((n, t) => n + String(t).length, 0);
  if (chars > MAX_TRANSLATE_CHARS) throw fail('Too much text in one request.');
  const provider = (env.TRANSLATE_PROVIDER || (env.DEEPL_API_KEY ? 'deepl' : 'google')).toLowerCase();
  if (provider === 'deepl') return deepl(texts, source, target, env);
  return google(texts, source, target, env);
}

async function deepl(texts, source, target, env) {
  const key = env.DEEPL_API_KEY; if (!key) throw fail('Translation isn’t set up yet (missing DeepL key).', 503);
  const host = key.endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com';
  const tgt = { en: 'EN-US', pt: 'PT-BR', zh: 'ZH-HANS' }[target] || target.toUpperCase();
  const body = { text: texts.map(String), target_lang: tgt, preserve_formatting: true };
  if (source && source !== 'auto') body.source_lang = source.toUpperCase();
  const r = await fetch(`${host}/v2/translate`, { method: 'POST', headers: { Authorization: `DeepL-Auth-Key ${key}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (r.status === 456) throw fail('This month’s translation allowance has been used up. Try again next month.', 429);
  if (r.status === 429) throw fail('The translation service is busy. Wait a moment and try again.', 429);
  if (r.status === 400) throw fail('DeepL doesn’t support that language pair. Try another target language.', 400);
  if (!r.ok) throw fail(`The translation service returned an error (${r.status}).`, 502);
  const j = await r.json();
  return { texts: j.translations.map(t => t.text), detected: j.translations[0] && j.translations[0].detected_source_language ? j.translations[0].detected_source_language.toLowerCase() : undefined };
}

async function google(texts, source, target, env) {
  const key = env.GOOGLE_API_KEY; if (!key) throw fail('Translation isn’t set up yet (missing Google key).', 503);
  const code = c => ({ zh: 'zh-CN' }[c] || c);
  const body = { q: texts.map(String), target: code(target), format: 'text' };
  if (source && source !== 'auto') body.source = code(source);
  const r = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(key)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (r.status === 429) throw fail('The translation service is busy. Wait a moment and try again.', 429);
  if (!r.ok) throw fail(`The translation service returned an error (${r.status}).`, 502);
  const j = await r.json(); const tr = j.data.translations;
  return { texts: tr.map(t => t.translatedText), detected: tr[0] && tr[0].detectedSourceLanguage };
}

/* ---------------- AI (Claude) ---------------- */
async function ai({ task, text, question, length = 'medium', language, title }, env) {
  const key = env.ANTHROPIC_API_KEY; if (!key) throw fail('The AI tools aren’t set up yet (missing Anthropic key).', 503);
  text = String(text || ''); if (text.length < 20) throw fail('There’s no text to work with.');
  if (text.length > MAX_AI_CHARS) text = text.slice(0, MAX_AI_CHARS);
  const lang = language ? `Write your answer in ${language}.` : (task === 'ask' ? 'Answer in the language of the question.' : 'Write in the same language as the document.');
  let system, user;
  if (task === 'ask') {
    if (!question || !String(question).trim()) throw fail('Type a question first.');
    system = `You answer questions about a document the user uploaded. Use only the document. Each page starts with a marker like [Page 3]; cite pages in brackets, for example (page 3). If the document doesn't contain the answer, say so plainly. Be concise and use Markdown for lists. ${lang}`;
    user = `<document title="${String(title || '').replace(/"/g, '')}">\n${text}\n</document>\n\nQuestion: ${String(question).slice(0, 2000)}`;
  } else {
    const shape = { short: 'three to five bullet points', medium: 'a two-sentence overview followed by five to eight bullet points', detailed: 'short sections with "##" headings, each with a few bullet points' }[length] || 'a two-sentence overview followed by five to eight bullet points';
    system = `You summarize documents. Write ${shape}. Keep names, dates, amounts and deadlines exact. Add page references like (page 4) for key facts; each page starts with a marker like [Page 4]. Use Markdown. Don't add anything that isn't in the document. ${lang}`;
    user = `<document title="${String(title || '').replace(/"/g, '')}">\n${text}\n</document>\n\nSummarize this document.`;
  }
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: env.AI_MODEL || 'claude-haiku-5-5', max_tokens: length === 'detailed' ? 2500 : 1500, system, messages: [{ role: 'user', content: user }] }),
  });
  if (r.status === 429 || r.status === 529) throw fail('The AI service is busy. Wait a moment and try again.', 429);
  if (r.status === 400) throw fail('This document is too long for the AI service. Try a shorter PDF.', 400);
  if (!r.ok) throw fail(`The AI service returned an error (${r.status}).`, 502);
  const j = await r.json();
  return { text: (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n').trim() };
}
