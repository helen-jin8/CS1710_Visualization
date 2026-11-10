"""Build data/oews-industry.{json,js}: employment and wages for the six career families, by NAICS sector, May 2015-May 2025.

Source: BLS OEWS "National industry-specific" estimates, one zip per year (data/original/oews/oesm{YY}in4.zip),
sheet natsector_M{YYYY}_dl.xlsx (20 NAICS sectors incl. 99 = government).

The six families are built from detailed SOC occupations. BLS changed the SOC in the middle of the range, so each
period uses the codes that existed then (verified against the files):
  May 2015-2018  2010 SOC: no data-scientist, database-architect or QA-tester codes yet
  May 2019-2020  hybrid 2010/2018 SOC: each OEWS release pools three years of survey panels, and only part of the
                 sample carried the new codes (15-2098 "data scientists and math science, all other" = 53k in 2020
                 vs 15-2051 data scientists = 106k in 2021)
  May 2021-2025  2018 SOC (identical to the codes in story.json blsFamily)
So Data Science, Data Engineering and Software Engineering widen between 2018 and 2021; part of their growth over
the series is reclassification. The page shows the years as one continuous timeline; the note is on References.

Per sector x family x year:
  emp     sum of the occupations' employment (suppressed cells, "**", are left out and listed in `suppressed`)
  mean    employment-weighted mean annual wage (exact family mean over the occupations with data)
  median  employment-weighted average of the occupations' median annual wages (an approximation: medians do not add);
          occupations whose median is top-coded ("#") are left out and listed in `topcoded`
  occ     the occupation rows themselves (code, title, emp, median, mean) so the page can show the breakdown

Usage: python build_oews_industry.py   (run from anywhere; paths are relative to this file)
"""
import io, json, re, zipfile, datetime
from pathlib import Path
import pandas as pd

HERE = Path(__file__).resolve().parent
SRC = HERE / 'original' / 'oews'
YEARS = list(range(2015, 2026))

FAMILIES = ['Data Science & Analytics', 'AI & Machine Learning', 'Data Engineering & Architecture',
            'Software Engineering', 'Systems, Cloud & Security', 'Data & Technology Management']
CODES = {
    'soc2010': {
        'Data Science & Analytics': ['15-2031', '15-2041'],
        'AI & Machine Learning': ['15-1111'],
        'Data Engineering & Architecture': ['15-1141'],
        'Software Engineering': ['15-1131', '15-1132', '15-1133'],
        'Systems, Cloud & Security': ['15-1121', '15-1122', '15-1142', '15-1143'],
        'Data & Technology Management': ['11-3021'],
    },
    'hybrid': {
        'Data Science & Analytics': ['15-2031', '15-2041', '15-2098'],
        'AI & Machine Learning': ['15-1221'],
        'Data Engineering & Architecture': ['15-1245'],
        'Software Engineering': ['15-1251', '15-1256'],
        'Systems, Cloud & Security': ['15-1211', '15-1212', '15-1241', '15-1244'],
        'Data & Technology Management': ['11-3021'],
    },
    'soc2018': {   # as in story.json blsFamily
        'Data Science & Analytics': ['15-2051', '15-2041', '15-2031'],
        'AI & Machine Learning': ['15-1221'],
        'Data Engineering & Architecture': ['15-1243', '15-1242'],
        'Software Engineering': ['15-1252', '15-1251', '15-1253'],
        'Systems, Cloud & Security': ['15-1211', '15-1212', '15-1241', '15-1244'],
        'Data & Technology Management': ['11-3021'],
    },
}
def period(y): return 'soc2010' if y <= 2018 else 'hybrid' if y <= 2020 else 'soc2018'

SECTOR_SHORT = {
    '11': 'Agriculture', '21': 'Mining & Oil/Gas', '22': 'Utilities', '23': 'Construction', '31-33': 'Manufacturing',
    '42': 'Wholesale Trade', '44-45': 'Retail Trade', '48-49': 'Transportation & Warehousing', '51': 'Information',
    '52': 'Finance & Insurance', '53': 'Real Estate', '54': 'Professional & Technical Services',
    '55': 'Management of Companies', '56': 'Admin & Support Services', '61': 'Education', '62': 'Health Care',
    '71': 'Arts & Recreation', '72': 'Accommodation & Food', '81': 'Other Services', '99': 'Government',
}

def num(v):
    """BLS cells: number, '**' (suppressed), '*' (not available), '#' (top-coded). Returns (value or None, flag)."""
    s = str(v).strip().replace(',', '')
    if s in ('#',): return None, 'topcoded'
    if s in ('*', '**', '~', 'nan', 'None', ''): return None, 'suppressed'
    try: return float(s), None
    except ValueError: return None, 'suppressed'

def read_year(y):
    yy = str(y)[2:]
    z = zipfile.ZipFile(SRC / f'oesm{yy}in4.zip')
    name = next(n for n in z.namelist() if re.search(r'natsector_M\d{4}_dl\.xlsx$', n))
    df = pd.read_excel(io.BytesIO(z.read(name)), dtype=str)
    df.columns = [c.strip().lower() for c in df.columns]
    df['naics'] = df['naics'].str.strip()
    df['occ_code'] = df['occ_code'].str.strip()
    return df, name

out = {'meta': {}, 'sectors': {}, 'years': YEARS, 'families': FAMILIES, 'data': {}, 'national': {}}
for y in YEARS:
    df, fname = read_year(y)
    codes = CODES[period(y)]
    wanted = {c for cs in codes.values() for c in cs}
    sub = df[df['occ_code'].isin(wanted)]
    dup = sub.duplicated(['naics', 'occ_code']).sum()
    assert dup == 0, f'{y}: {dup} duplicate sector/occupation rows'
    missing = wanted - set(sub['occ_code'])
    assert not missing, f'{y}: codes not in file: {missing}'
    for n, t in df[['naics', 'naics_title']].drop_duplicates().values:
        out['sectors'][n] = {'title': t.strip(), 'short': SECTOR_SHORT.get(n, t.strip())}
    yd = out['data'][str(y)] = {}
    nat = {f: {'emp': 0.0, 'wsum_mean': 0.0, 'emp_mean': 0.0, 'wsum_med': 0.0, 'emp_med': 0.0} for f in FAMILIES}
    for naics, g in sub.groupby('naics'):
        sd = yd[naics] = {}
        for fam in FAMILIES:
            rows = g[g['occ_code'].isin(codes[fam])]
            emp = wm = em = wmed = emed = 0.0
            occ, supp, topc = [], [], []
            for _, r in rows.iterrows():
                e, ef = num(r['tot_emp']); md, mf = num(r['a_median']); mn, _ = num(r['a_mean'])
                occ.append({'code': r['occ_code'], 'title': r['occ_title'].strip(),
                            'emp': int(e) if e is not None else None,
                            'median': int(md) if md is not None else ('#' if mf == 'topcoded' else None),
                            'mean': int(mn) if mn is not None else None})
                if e is None: supp.append(r['occ_code']); continue
                emp += e
                if mn is not None: wm += e * mn; em += e
                if md is not None: wmed += e * md; emed += e
                elif mf == 'topcoded': topc.append(r['occ_code'])
            sd[fam] = {'emp': int(emp), 'mean': round(wm / em) if em else None, 'median': round(wmed / emed) if emed else None,
                       'suppressed': supp, 'topcoded': topc, 'occ': occ}
            n_ = nat[fam]; n_['emp'] += emp; n_['wsum_mean'] += wm; n_['emp_mean'] += em; n_['wsum_med'] += wmed; n_['emp_med'] += emed
    out['national'][str(y)] = {f: {'emp': int(v['emp']), 'mean': round(v['wsum_mean'] / v['emp_mean']) if v['emp_mean'] else None,
                                   'median': round(v['wsum_med'] / v['emp_med']) if v['emp_med'] else None} for f, v in nat.items()}
    print(f'{y}: {fname}  sectors={sub["naics"].nunique()}  rows={len(sub)}')

out['meta'] = {
    'built': datetime.date.today().isoformat(),
    'source': 'U.S. Bureau of Labor Statistics, Occupational Employment and Wage Statistics (OEWS), national industry-specific '
              'estimates by NAICS sector, May 2015 - May 2025. https://www.bls.gov/oes/tables.htm (files oesm{YY}in4.zip)',
    'periods': {'2015-2018': '2010 SOC', '2019-2020': 'hybrid 2010/2018 SOC', '2021-2025': '2018 SOC'},
    'familyCodes': {'2015-2018': CODES['soc2010'], '2019-2020': CODES['hybrid'], '2021-2025': CODES['soc2018']},
    'breaks': {
        'Data Science & Analytics': 'data scientists only partly counted in 2019-2020 (15-2098) and fully from 2021 (15-2051)',
        'Data Engineering & Architecture': 'database architects added from 2019 (15-1245, then 15-1243)',
        'Software Engineering': 'software QA analysts and testers added from 2019 (15-1256, then 15-1253)',
    },
    'fields': {'emp': 'employment (sum of occupations with published employment)',
               'mean': 'employment-weighted mean annual wage',
               'median': 'employment-weighted average of occupation median annual wages (approximation)',
               'suppressed': 'occupation codes whose employment BLS did not publish for this sector',
               'topcoded': 'occupation codes whose median is top-coded by BLS (left out of `median`)'},
    'caveat': 'OEWS estimates are not designed for year-to-year comparison; small changes are within sampling error. '
              'Values are May reference period estimates.',
}
(HERE / 'oews-industry.json').write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
(HERE / 'oews-industry.js').write_text('window.OEWS_IND = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
print('wrote', HERE / 'oews-industry.json', 'and .js')
