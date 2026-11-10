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

## OEWS_IND  (data/oews-industry.js → window.OEWS_IND; built by data/build_oews_industry.py)
BLS OEWS national industry-specific estimates, May 2015 – May 2025, by NAICS sector (20 sectors incl. 99 = government).
Used by page 6 ("Which industry pays the most, year by year?"), shown as one continuous timeline.
Raw files: data/original/oews/oesm{YY}in4.zip (sheet natsector_M{YYYY}_dl.xlsx).
data[year][naics][family] = {emp, mean, median, suppressed, topcoded, occ:[{code,title,emp,median,mean}]}; national[year][family] = {emp, mean, median}.
mean = employment-weighted mean wage; median = employment-weighted average of occupation medians (approximation).
SOC periods: 2015–18 = 2010 SOC, 2019–20 = hybrid, 2021–25 = 2018 SOC (codes per period in meta.familyCodes).
Data scientists, database architects and QA testers have no codes before 2019 and are only partly counted in 2019–20
(15-2098 = 53k in 2020 vs 15-2051 = 106k in 2021), so DS / Data Eng / Software widen up to 2021 (meta.breaks).
OEWS is not designed for year-to-year comparison.
