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
- An **email capture** screen and a **confirmation** screen
- Progress is saved to `localStorage`, so you can close the tab and pick up where you left off

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
