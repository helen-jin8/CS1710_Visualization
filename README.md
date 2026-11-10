# U.S. Data Career Explorer

A scroll-free, page-by-page story site about six data/tech career families.

## Run

Double-click `START_SITE.cmd` (Windows) or `START_SITE.sh` (macOS/Linux), or run:

```
python -m http.server 8000
```

Then open http://localhost:8000/ .

## Story (current state)

Page order (the `pages` array in `render()` in `app.js`), 14 pages:

1. Cover
2. Welcome (the journey ahead: Jobs, Places, Pay, Industries, Levels, 2035, Summary)
3. What responsibility to land on? (career tree)
4. What place to land on? (map)
5. What salary to land on? (salary game)
6. Which mountain do you land on? (pay quartiles)
7. Which industry pays the most, year by year? (industry galaxy)
8. Level up: from Entry to Executive (potion shop, a teaser for page 9)
9. Where is the pay, and where are the people? (one ring of 100 people by experience level; each block reaches out to its level's median pay)
10. Race to 2035: which career opens the most doors?
11. Which door stays open in 2035?
12. Why do some careers open more doors?
13. You made it! Unlock your summary
14. References, data and team (last page: data sources with links, reading notes, team names in `TEAM` in `app.js`)

The old draft pages 14-22 (remote vs. on-site, experience, waterfall, future, Career Passport, references) were removed on 2026-11-09; their code is in `_backups/before-delete-14-22/`.

## Six career families

- Data Science & Analytics: Dot
- AI & Machine Learning: Nova
- Data Engineering & Architecture: Pip
- Software Engineering: Pixel
- Systems, Cloud & Security: Nimbus
- Data & Technology Management: Kit

## Folder layout

```
index.html, app.js, cover.js,      the site itself
styles.css, cover.css
START_SITE.cmd / .sh               local server launchers
spec.docx                          original story specification

assets/cover/                      cover-page character art
assets/fellows/                    character sprite frames, coins, dust, sparks

data/story-data.js                 main story data (window.__STORY__); story.json is the fetch fallback
data/ext-data.js                   O*NET, H-1B, company-size extras (see data/README_EXT.md)
data/oews-industry.js              OEWS by industry, built by data/build_oews_industry.py
data/*.json, h1b_raw.md            source/intermediate copies of the data above
data/original/oews/                raw BLS OEWS zips (input to build_oews_industry.py)
data/original/projections/         raw BLS Employment Projections 2016–26 and 2019–29
data/original/salaries.csv         raw aijobs.net salary sample

_backups/                          snapshots taken before each edit (before-<change>/)
_archive/                          files no longer used by the site (old v15 PNGs, old READMEs/QA notes)
```
