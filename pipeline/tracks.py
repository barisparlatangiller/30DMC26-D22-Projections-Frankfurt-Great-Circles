"""
Day 22 · pick one real Lufthansa flight per route from the adsb.lol extract (build/tracks_all.json) → docs/data/tracks.json.
km = length along the recorded positions (gaps without receivers are bridged by the shortest path, so real tracks are if
anything a little longer than shown).
"""
import json, datetime
d = json.load(open("build/tracks_all.json"))
rt = {r["id"]: r for r in json.load(open("docs/data/routes.json"))["routes"]}
PICK = {"ny": ("DLH400", "2026-11-21"), "la": ("DLH456", "2026-11-21"), "tk": ("DLH716", "2026-11-20"), "ct": ("DLH576", "2026-11-20")}
out = {}
for k, (cs, day) in PICK.items():
    r = next(x for x in d[k] if x["callsign"] == cs and datetime.datetime.fromtimestamp(x["t0"], datetime.UTC).date().isoformat() == day)
    dur = (r["t1"] - r["t0"]) / 3600
    out[k] = {"callsign": cs, "date": day, "km": r["km"], "hours": round(dur, 2), "gaps": r["gaps"], "path": [[p[0], p[1]] for p in r["path"]],
              "extra_km": r["km"] - rt[k]["gc_km"], "extra_pct": round((r["km"] - rt[k]["gc_km"]) / rt[k]["gc_km"] * 100, 1)}
    print(k, cs, day, r["km"], "km", round(dur, 1), "h  vs shortest", rt[k]["gc_km"], f"+{out[k]['extra_km']} km ({out[k]['extra_pct']}%)")
json.dump(out, open("docs/data/tracks.json", "w"), separators=(",", ":"))
