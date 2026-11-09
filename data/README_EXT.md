# Extended data (data/ext-data.js → window.EXT_DATA)

Loaded alongside story-data.js; nothing in app.js reads it yet, so existing pages are unaffected.

## EXT_DATA.onet  (O*NET Work Context, per BLS occupation code)
14 occupations used by the six career families. Per occupation: name, family, and share (%) of incumbents reporting
workWeekOver40, schedRegular, timePressureDaily, competitionHigh (Highly+Extremely), freedomALot, errorSerious (Very+Extremely),
contactConstant, faceDaily, decideDaily, publicImportant (Very+Extremely), plus `raw` text of the displayed breakdowns.
null = not displayed on the O*NET page. Source: https://www.onetonline.org/link/details/<SOC>

## EXT_DATA.onetFamily  (same measures, employment-weighted to the six families)

## EXT_DATA.h1b  (DOL H-1B LCA disclosures, exact job title, filing years 2020–2025)
titles: data scientist, machine learning engineer, data engineer, software engineer, devops engineer, product manager
per year: n (filings), median salary, dist (% >200k / 150–200k / 100–150k / <100k), employers (count), top (10 employers: median, count).
Gaps: 2019 and earlier excluded (aggregator coverage); software engineer 2020 unavailable.
Source: DOL OFLC LCA data as aggregated by h1bdata.info (index.php?job=<title>&year=<yyyy>).

## EXT_DATA.companySize  (aijobs.net salaries.csv, US, 2024 & 2025, per family)
bySize S/M/L (n, median), employmentType counts, byRemote 0/50/100 (n, median). Caveat: company_size is 'M' for ~98% of rows — no real signal. This CSV is a newer/larger snapshot than story.json's sample; do not mix counts.
