# Quire API worker (translation and AI)

The Translate and AI tools need API keys. Keys must never be put in the website itself, because anyone could read them there. This small Cloudflare Worker holds the keys and does the calls for the site. Cloudflare's free plan allows 100,000 requests a day.

## 1. Get your keys

| Tool | Provider | Where to get the key |
|---|---|---|
| Translate pages | **DeepL** (best quality; free plan: 500,000 characters a month) | https://www.deepl.com/pro-api |
| Translate pages | **or Google Cloud Translation** (supports Hindi, Bengali, Tamil, Telugu and other Indian languages) | https://console.cloud.google.com → enable “Cloud Translation API” → Credentials → API key |
| AI Summarizer, Ask Your PDF | **Anthropic (Claude)** | https://console.anthropic.com → API keys |

You only need one translation provider. Choose Google if you want Indian languages: DeepL doesn't support all of them.

## 2. Deploy the worker

You need Node.js 18 or newer.

```bash
cd worker
npx wrangler login                          # opens the browser to sign in to Cloudflare
npx wrangler secret put DEEPL_API_KEY       # paste your DeepL key   (or GOOGLE_API_KEY)
npx wrangler secret put ANTHROPIC_API_KEY   # paste your Claude key
npx wrangler deploy
```

Before deploying, check `wrangler.toml`:

- `TRANSLATE_PROVIDER`: `"deepl"` or `"google"`
- `ALLOWED_ORIGINS`: your site's address. Add your custom domain here if you use one.

`wrangler deploy` prints an address such as `https://quire-api.<your-name>.workers.dev`. Open it in a browser. You should see `{"ok":true,"translate":true,"ai":true}`.

## 3. Connect the site

1. Open `src/site.config.mjs` and set `apiEndpoint` to the worker address. Don't add a trailing slash.
2. Rebuild the site and push:

```bash
npm run build
git add -A && git commit -m "Connect translation and AI service" && git push
```

## Costs and limits

- Each request is capped at about 30,000 characters for translation and 320,000 characters for AI. The site splits long documents automatically.
- The worker only answers requests from the addresses in `ALLOWED_ORIGINS`. To protect your API budget further, add a rate-limiting rule in the Cloudflare dashboard (Security → WAF → Rate limiting rules), for example 30 requests a minute per IP.
- The default AI model is `claude-haiku-5-5`, which is fast and inexpensive. Change `AI_MODEL` in `wrangler.toml` for a stronger model.
