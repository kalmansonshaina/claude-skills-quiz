# Quiz capture Worker

A tiny Cloudflare Worker that turns the quiz's email step into a real signup flow:

- **Logs** every completed-quiz lead to Cloudflare KV (durable record).
- **Upserts** the person into [Loops](https://loops.so) with their result (level, score,
  weakest area) as contact properties.
- **Fires a `quiz_completed` event** in Loops, which triggers your email sequence —
  the "email them when they finish" message and any multi-step follow-ups.
- **Flags How-to-AI opt-in** and exposes a CSV export you import into Substack.

Why a Worker at all? Substack has no public "add subscriber" API and blocks direct
browser/server calls (Cloudflare bot challenge — verified). So the reliable pattern is:
capture into an email platform you control (Loops), run your automations there, and feed
How to AI from an export/sync.

---

## Deploy (about 10 minutes)

Prereqs: a free [Cloudflare](https://dash.cloudflare.com/sign-up) account and Node installed.

```bash
cd worker
npm install -g wrangler        # or: npx wrangler ...
wrangler login                 # opens browser, authorizes your Cloudflare account

# 1. Create the KV namespace and copy the printed id into wrangler.toml (LEADS binding)
wrangler kv namespace create LEADS

# 2. Set your secrets
wrangler secret put LOOPS_API_KEY     # paste your Loops API key (Loops → Settings → API)
wrangler secret put EXPORT_TOKEN      # paste any long random string (guards /export)

# 3. Ship it
wrangler deploy
```

`wrangler deploy` prints a URL like
`https://claude-quiz-capture.YOUR-SUBDOMAIN.workers.dev`.

**Final step — connect the site:** open `../index.html`, find the `CONFIG` block near the
top of the script, and set:

```js
var CONFIG = { endpoint: 'https://claude-quiz-capture.YOUR-SUBDOMAIN.workers.dev' };
```

Commit + push, and the live quiz now posts every submission to your Worker.

---

## Set up the Loops side

1. In Loops → **Settings → Contacts**, add these custom properties (types in parens):
   `quizLevel` (number), `quizLevelName` (string), `quizScore` (number),
   `quizGap` (string), `subscribedHowToAI` (boolean).
2. Build a **Loop** (automation) triggered by the **event `quiz_completed`**. First email =
   their fix plan (you can branch on `quizLevel`/`quizGap` for level-specific content),
   then add however many follow-up steps you want.
3. Test: take the quiz on the live site, submit, and confirm the contact + event land in Loops.

## Feed How to AI (Substack)

Opted-in leads are tagged `subscribedHowToAI: yes`. To move them into Substack:

- **Export:** `https://YOUR-WORKER-URL/export?token=YOUR_EXPORT_TOKEN` downloads a CSV.
  Filter to `subscribedHowToAI = yes` and import via Substack → Subscribers → Import.
- Or drive it from Loops (segment on `subscribedHowToAI`) and export from there.

## Prefer a different platform?

The ESP call is isolated in `pushToLoops()` in `src/index.js`. Swap it for **Kit/ConvertKit**
(`POST https://api.convertkit.com/v3/forms/{id}/subscribe`), **MailerLite**, **Resend**, etc.
Everything else (logging, CSV export, CORS) stays the same. If you tell me which one you use,
I'll wire it exactly.

## Local test

```bash
wrangler dev
# in another shell:
curl -X POST http://localhost:8787 -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","subscribe":true,"level":2,"levelName":"You Know It Could Be More","score":12,"gap":"Workflow"}'
```
