# Why do flights curve on the map? · Frankfurt

**#30DayMapChallenge 2026 · Day 22 · Projections**

👉 **Live map:** https://barisparlatangiller.github.io/30DMC26-D22-Projections-Frankfurt-Great-Circles/

Four real Lufthansa flights from Frankfurt (20–21 Nov 2026) — LH400 New York, LH456 Los Angeles, LH716 Tokyo, LH576 Cape Town — on four projections: Web Mercator, gnomonic, orthographic (globe) and azimuthal equidistant centred on Frankfurt.

- On Mercator the shortest path (great circle) looks curved; the line that looks straight keeps one compass heading and is longer: +1,212 km to Los Angeles, +1,366 km to Tokyo, +36 km to Cape Town.
- Three of the four real flights stayed within 2.2% of the shortest path. LH716 to Tokyo flew 11,382 km, 1,998 km (21%) more, because the shortest path crosses Russia, closed to European airlines since 2022.

## Data
- Flight tracks: adsb.lol open data, globe_history 2026-11-20/21 (ODbL 1.0) — `.github/workflows/fetch.yml` → `pipeline/adsblol.py` → `pipeline/tracks.py`
- Land: Natural Earth (public domain) via world-atlas
- Distances: pyproj (WGS84 geodesics); rhumb lines on a 6,371 km sphere — `pipeline/routes.py`
