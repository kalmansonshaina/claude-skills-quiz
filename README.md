# How Bad Are You at Claude? — Skills Assessment Quiz

A 3-minute interactive diagnostic that scores how well you use Claude, identifies your
weakest skill area, and points you to the exact fix. Built as a single self-contained
`index.html` (no build step, no dependencies) and hosted on GitHub Pages.

**Live site:** https://kalmansonshaina.github.io/claude-skills-quiz/

## What it does

- **Intro** → 3 warm-up "about you" questions (1 slider, 2 choice — unscored)
- **28 scored questions** across 5 sections: Beginner, Practical, Workflow, Advanced, Expert
- Two motivational **break** screens at the halfway and final-stretch points
- A **result** screen with an animated score ring (0–28), your level (1–4), your weakest
  area, and your first fix
- An **email capture** screen (with an opt-in to Ruben's Substack, *How to AI*) and a
  **confirmation** screen
- Progress is saved to `localStorage`, so you can close the tab and pick up where you left off

## Email capture

The email screen posts the completed result (email, level, score, weakest area, opt-in) to
a Cloudflare Worker (`/worker`) that logs the lead, upserts the contact in
[Loops](https://loops.so), and fires a `quiz_completed` event to trigger your email
sequence. The *How to AI* opt-in is tracked so those subscribers can be exported/imported
into Substack (Substack has no public subscribe API, so a direct push isn't possible).

Capture is **off until you deploy the Worker** — the quiz runs fine without it. See
[`worker/README.md`](worker/README.md) for the ~10-minute setup, then paste the Worker URL
into the `CONFIG.endpoint` value near the top of the script in `index.html`.

## Levels

| Score | Level | Name |
|-------|-------|------|
| 0–7   | 1 | Barely Scratching the Surface |
| 8–15  | 2 | You Know It Could Be More |
| 16–22 | 3 | Still Doing It All Yourself |
| 23–28 | 4 | Miles Ahead of Everyone |

## Implementation notes

This was recreated from an HTML/CSS/JS prototype exported from
[Claude Design](https://claude.ai/design). The original prototype used a small React-based
template runtime (`sc-if`/`sc-for`/`{{ }}` bindings). It has been re-implemented in
dependency-free vanilla JavaScript that reproduces the exact visuals and logic — a state
machine driving `render()` with targeted DOM updates for the score animation and slider.

Fonts (Newsreader + Hanken Grotesk) load from Google Fonts. Everything else is inline.

## Running locally

It's a static file — just open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```
