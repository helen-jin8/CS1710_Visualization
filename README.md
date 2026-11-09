# U.S. Data Career Explorer

An interactive, game-styled data story about six data & tech career families in the U.S.
You pick a pixel-art character, "land" on a career, and follow it through real data on job
titles, geography, salary, employers and ten-year outlook. Built for CS 1710 (Harvard).

## How to run locally
Any static server works; no build step.

```bash
python3 -m http.server 8000      # then open http://localhost:8000/
```
Keyboard: ← → switch character on the cover, ← → ↑/space to run and jump in the coin game.

## The story so far (8 pages)
1. **Cover** — pick one of six characters: Data Science, AI & ML, Data Engineering, Software Engineering, Systems / Cloud / Security, Data & Tech Management.
2. **What responsibility to land on?** — characters fall from the sky into piles; pile height = number of people holding each job title in the salary sample.
3. **What place to land on?** — characters land on a U.S. map; states light up by their share of that career's jobs; click a state for its six-career mix.
4. **What salary to land on?** — a mini-game: run and jump to catch the coin, then name the salary you want.
5. **Which mountain do you land on?** — your number is dropped onto the six careers' salary distributions; drag the line to re-score against any career.
6. **Which door stays open in 2035?** — pay-vs-benchmark panel linked to an alluvial flow from today's hiring demand to BLS projected openings; hover to follow one career across both.
7. **Which company pays the most, year by year?** — employer "galaxy": each bubble is one employer × job title × year from H-1B filings (position = filings and median offer, size = filings). Pin an employer to see its 2020–25 trail; press ▶ to animate the years.
8. **Race to 2035: whose jobs grow the most?** — place a bet on a career, then watch six runners race on BLS 2025–35 growth.

## Data
| File | Source | Notes |
|---|---|---|
| `data/story.json` / `story-data.js` | aijobs.net salary survey (U.S. residents, 2024); BLS OEWS May 2025 state employment & wages; BLS Employment Projections 2025–35; BLS OOH industry shares; O*NET skills; BEA regional price parities | Core dataset for pages 1–6, 8–17 |
| `data/ext-data.js` | DOL OFLC H-1B LCA disclosures (via h1bdata.info), exact job title, filing years 2020–25; O*NET Work Context for 14 SOC occupations | Pages 6–7. See `data/README_EXT.md` |
| `data/original/salaries.csv` | aijobs.net full export (151k rows) | Used only for employment type / remote ratio |

Caveats worth stating up front: H-1B filings cover foreign-national hiring only and report base salary, so they understate total compensation and omit employers that don't sponsor visas. Salary-survey figures are self-reported. All limitations are also noted on the relevant pages.

## Tech
Vanilla JavaScript, hand-written SVG, CSS animations. No framework, no bundler, no runtime dependencies.
Fonts: Press Start 2P, Silkscreen, VT323 (Google Fonts). Pixel art generated with image-generation tools and hand-cut into sprite frames.

## Project structure
index.html entry
app.js all pages, data access, interactions
cover.js/.css cover page + global pixel UI
styles.css legacy base styles
assets/cover six character portraits
assets/fellows sprite frames (fall/land/run/jump), coin, sparkle
data/ datasets (see above)

