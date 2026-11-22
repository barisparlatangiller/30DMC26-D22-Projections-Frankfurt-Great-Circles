"""
Day 22 · Projections · Frankfurt great circles.
For each route: great-circle (geodesic, WGS84) distance, the length of the line that is straight on a Mercator map
(rhumb line / loxodrome, constant compass heading), the extra flight time at 900 km/h, initial heading, highest latitude.
  python pipeline/routes.py   →  docs/data/routes.json
"""
import json, math
from pyproj import Geod

G = Geod(ellps="WGS84")
FRA = {"name": "Frankfurt", "code": "FRA", "lon": 8.5622, "lat": 50.0379}
DEST = [("ny", "New York", "JFK", -73.7781, 40.6413, "#cf6a52"), ("la", "Los Angeles", "LAX", -118.4085, 33.9416, "#3f7d8c"),
        ("tk", "Tokyo", "HND", 139.7798, 35.5494, "#c08a3e"), ("ct", "Cape Town", "CPT", 18.6017, -33.9715, "#6f8f4e")]
V = 900.0
NOTE = {
    "ny": "Real tracks follow the North Atlantic Tracks, re-drawn twice a day around the jet stream; westbound and eastbound flights use different ones.",
    "la": "Real flights stay close to this great circle, over the North Sea, Greenland and Canada.",
    "tk": "The great circle crosses Russia. European airlines have not been allowed into Russian airspace since 2022, so real flights detour, usually by more than an hour.",
    "ct": "Real flights stay close to this line over Africa, as long as every overflight permit is in place.",
}


def rhumb(lon1, lat1, lon2, lat2, R=6371.0088):
    p1, p2 = math.radians(lat1), math.radians(lat2); dp = p2 - p1; dl = math.radians(lon2 - lon1)
    if abs(dl) > math.pi:
        dl -= math.copysign(2 * math.pi, dl)
    dpsi = math.log(math.tan(math.pi / 4 + p2 / 2) / math.tan(math.pi / 4 + p1 / 2))
    q = dp / dpsi if abs(dpsi) > 1e-12 else math.cos(p1)
    brg = (math.degrees(math.atan2(dl, dpsi)) + 360) % 360
    return math.hypot(dp, q * dl) * R, brg


def main():
    out = {"origin": FRA, "speed_kmh": V, "routes": []}
    for k, n, c, lo, la, col in DEST:
        az, _, d = G.inv(FRA["lon"], FRA["lat"], lo, la)
        pts = G.npts(FRA["lon"], FRA["lat"], lo, la, 400)
        rh, brg = rhumb(FRA["lon"], FRA["lat"], lo, la)
        gc = d / 1000
        out["routes"].append({"id": k, "name": n, "code": c, "lon": lo, "lat": la, "color": col,
                              "gc_km": round(gc), "rhumb_km": round(rh), "extra_km": round(rh - gc), "extra_pct": round((rh - gc) / gc * 100, 1),
                              "gc_h": round(gc / V, 2), "extra_min": round((rh - gc) / V * 60), "heading_gc": round((az + 360) % 360),
                              "heading_rhumb": round(brg), "max_lat": round(max(p[1] for p in pts), 1),
                              "angle_deg": round(gc / 6371.0088 * 180 / math.pi, 1), "note": NOTE[k]})
    open("docs/data/routes.json", "w").write(json.dumps(out, indent=1, ensure_ascii=False))
    for r in out["routes"]:
        print(r["code"], r["gc_km"], r["rhumb_km"], r["extra_km"], r["extra_min"], "min", r["heading_gc"], r["heading_rhumb"], r["max_lat"])


if __name__ == "__main__":
    main()
