"""
Day 22 · real flight tracks from the OpenSky Network (runs in GitHub Actions).
Finds recent departures from Frankfurt (EDDF) to New York (KJFK/KEWR), Los Angeles (KLAX), Tokyo (RJTT/RJAA) and Cape Town (FACT),
then downloads each aircraft's track (ADS-B positions). Keeps up to 3 flights per destination.
  python pipeline/opensky.py out/tracks.json
Data: The OpenSky Network, https://opensky-network.org (Schäfer et al. 2014) — non-commercial / research use.
"""
import sys, json, time, os
import requests

API = "https://opensky-network.org/api"
DEST = {"ny": ["KJFK", "KEWR"], "la": ["KLAX"], "tk": ["RJTT", "RJAA"], "ct": ["FACT"]}
S = requests.Session()
TOKEN = None


def auth():
    global TOKEN
    cid, sec = os.environ.get("OPENSKY_CLIENT_ID"), os.environ.get("OPENSKY_CLIENT_SECRET")
    if cid and sec:
        r = S.post("https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token",
                   data={"grant_type": "client_credentials", "client_id": cid, "client_secret": sec}, timeout=60)
        print("auth", r.status_code)
        if r.ok:
            TOKEN = r.json()["access_token"]; S.headers["Authorization"] = f"Bearer {TOKEN}"


def get(path, **params):
    for k in range(4):
        r = S.get(API + path, params=params, timeout=120)
        print(r.status_code, path, params, flush=True)
        if r.status_code == 200:
            return r.json()
        if r.status_code in (404,):
            return None
        time.sleep(10 * (k + 1))
    return None


def main(dst):
    auth()
    now = int(time.time())
    picks = {k: [] for k in DEST}
    for day in range(1, 29):
        end = now - day * 86400 + 86400; begin = end - 86400
        fl = get("/flights/departure", airport="EDDF", begin=begin, end=end) or []
        for f in fl:
            for k, aps in DEST.items():
                if f.get("estArrivalAirport") in aps and len(picks[k]) < 3:
                    picks[k].append(f)
        print(day, {k: len(v) for k, v in picks.items()}, flush=True)
        if all(len(v) >= 3 for v in picks.values()):
            break
        time.sleep(2)
    out = {}
    for k, fs in picks.items():
        out[k] = []
        for f in fs:
            t = get("/tracks/all", icao24=f["icao24"], time=f["firstSeen"] + 1800)
            if t and t.get("path"):
                out[k].append({"icao24": f["icao24"], "callsign": (f.get("callsign") or "").strip(), "firstSeen": f["firstSeen"], "lastSeen": f["lastSeen"],
                               "arr": f.get("estArrivalAirport"), "path": [[p[0], p[2], p[1], p[3]] for p in t["path"]]})   # t, lon, lat, alt
            time.sleep(2)
        print(k, [(x["callsign"], len(x["path"])) for x in out[k]], flush=True)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    json.dump(out, open(dst, "w"))


if __name__ == "__main__":
    main(sys.argv[1])
