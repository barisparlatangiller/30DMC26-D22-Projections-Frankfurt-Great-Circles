"""
Day 22 · real flight tracks from the adsb.lol open data archive (ODbL), runs in GitHub Actions.
Reads one or more extracted readsb 'globe_history' days, joins each aircraft's traces across days, splits them into flights
(gap > 45 min on the ground or > 3 h anywhere), and keeps flights that start within 25 km of Frankfurt airport and end within
60 km of JFK/EWR, LAX, HND/NRT or CPT. Positions are thinned to ≥ 2 km steps. Gaps without receiver coverage (> 30 min)
are flagged so they can be drawn differently.
  python pipeline/adsblol.py out/tracks_all.json DIR1 [DIR2 ...]
"""
import sys, os, json, gzip, math, glob
from collections import defaultdict

FRA = (50.0379, 8.5622)
DEST = {"ny": [(40.6413, -73.7781), (40.6895, -74.1745)], "la": [(33.9416, -118.4085)], "tk": [(35.5494, 139.7798), (35.7720, 140.3929)], "ct": [(-33.9715, 18.6017)]}


def hav(a, b):
    p1, p2 = math.radians(a[0]), math.radians(b[0]); dp = p2 - p1; dl = math.radians(b[1] - a[1])
    return 2 * 6371.0088 * math.asin(math.sqrt(math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2))


def main(dst, dirs):
    pts = defaultdict(list)     # hex -> [(t, lat, lon, alt, flight)]
    for d in dirs:
        files = glob.glob(os.path.join(d, "**", "trace_full_*.json*"), recursive=True)
        print(d, len(files), "trace files", flush=True)
        for k, f in enumerate(files):
            try:
                with (gzip.open(f, "rt") if True else open(f)) as fh:
                    j = json.load(fh)
            except Exception:
                try:
                    j = json.load(open(f))
                except Exception:
                    continue
            ts = j.get("timestamp", 0); hx = j.get("icao")
            tr = j.get("trace") or []
            if not tr:
                continue
            # quick filter: aircraft must come within 30 km of FRA or of a destination at some point
            near = False
            for p in tr[::20] + [tr[-1]]:
                if p[1] is None:
                    continue
                if abs(p[1] - FRA[0]) < 0.4 and abs(p[2] - FRA[1]) < 0.6:
                    near = True; break
            if not near and hx not in pts:
                continue
            for p in tr:
                fl = None
                if len(p) > 8 and isinstance(p[8], dict):
                    fl = (p[8].get("flight") or "").strip() or None
                alt = p[3] if isinstance(p[3], (int, float)) else 0
                pts[hx].append((ts + p[0], p[1], p[2], alt, fl))
            if k % 20000 == 0:
                print(" ", k, len(pts), flush=True)
    out = {k: [] for k in DEST}
    for hx, P in pts.items():
        P = sorted((x for x in P if x[1] is not None), key=lambda x: x[0])
        if not P:
            continue
        seg = [P[0]]
        segs = []
        for a, b in zip(P, P[1:]):
            gap = b[0] - a[0]
            if gap > 3 * 3600 or (gap > 2700 and a[3] < 1500 and b[3] < 1500):
                segs.append(seg); seg = []
            seg.append(b)
        segs.append(seg)
        for s in segs:
            if len(s) < 50:
                continue
            o = (s[0][1], s[0][2]); e = (s[-1][1], s[-1][2])
            if hav(o, FRA) > 25:
                continue
            for k, aps in DEST.items():
                if min(hav(e, ap) for ap in aps) < 60:
                    fl = next((x[4] for x in s if x[4]), "")
                    thin, gaps, last = [], [], None
                    for x in s:
                        if last is None or hav((last[1], last[2]), (x[1], x[2])) >= 2 or x is s[-1]:
                            if last is not None and x[0] - last[0] > 1800:
                                gaps.append(len(thin))
                            thin.append([round(x[2], 4), round(x[1], 4), int(x[3])]); last = x
                    km = sum(hav((a[1], a[0]), (b[1], b[0])) for a, b in zip(thin, thin[1:]))
                    out[k].append({"hex": hx, "callsign": fl, "t0": s[0][0], "t1": s[-1][0], "km": round(km), "gaps": gaps, "path": thin})
    for k in out:
        out[k].sort(key=lambda r: len(r["gaps"]))
        print(k, [(r["callsign"], r["km"], len(r["path"]), len(r["gaps"])) for r in out[k]][:8], flush=True)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    json.dump(out, open(dst, "w"))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2:])
