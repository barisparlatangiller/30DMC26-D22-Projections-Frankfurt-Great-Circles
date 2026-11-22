/* Day 22 · Why do flights curve on the map? */
"use strict";
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const cv = $("#map"), ctx = cv.getContext("2d");
const C = { ocean: "#dde7eb", land: "#ebe3d4", landLine: "#c8bca9", grat: "rgba(90,110,120,.16)", ink: "#2b2723" };
let RT, TR = {}, LAND, LAND110, proj, kind = "mercator", sel = "la", W = 0, H = 0, DPR = 1, rot = null, t0 = performance.now();
const NOTES = {
  mercator: "<b>Web Mercator</b> — the map on your phone. Real tracks and the shortest paths bow towards the pole; the dotted “straight” line keeps one compass heading and is longer.",
  gnomonic: "<b>Gnomonic</b> — every great circle is a straight line. It can show less than half the Earth, so it is centred on the selected route.",
  orthographic: "<b>Globe</b> — the Earth from space. Drag to turn. Here the great circles look like what they are: the shortest way.",
  azeq: "<b>Distance from Frankfurt</b> — every line from the centre is straight and true to scale. Rings every 2,500 km."
};
const hm = m => m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} min` : `${m} min`;
const fmt = n => Math.round(n).toLocaleString("en-US");

function size() {
  DPR = Math.min(2, devicePixelRatio || 1);
  const r = cv.getBoundingClientRect(); W = r.width; H = r.height;
  cv.width = W * DPR; cv.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  setProj(kind, true);
}
function mid(r) { return d3.geoInterpolate([RT.origin.lon, RT.origin.lat], [r.lon, r.lat])(0.5); }
function setProj(k, keepRot) {
  kind = k;
  const pad = 30, top = 70, ext = [[pad, top], [W - pad, H - pad - 60]];
  const r = RT.routes.find(x => x.id === sel);
  if (k === "mercator") {
    proj = d3.geoMercator().rotate([-10, 0]);
    proj.fitExtent(ext, { type: "MultiPoint", coordinates: [[-135, 72], [155, -40]] });
  } else if (k === "gnomonic") {
    const m = mid(r); proj = d3.geoGnomonic().rotate([-m[0], -m[1]]).clipAngle(68);
    proj.fitExtent(ext, { type: "MultiPoint", coordinates: [[RT.origin.lon, RT.origin.lat], [r.lon, r.lat]] }); proj.scale(proj.scale() * 0.82);
  } else if (k === "orthographic") {
    const m = mid(r); if (!keepRot || !rot) rot = [-m[0], -Math.max(-60, Math.min(60, m[1]))];
    proj = d3.geoOrthographic().rotate(rot).clipAngle(90);
    proj.fitExtent(ext, { type: "Sphere" });
  } else {
    proj = d3.geoAzimuthalEquidistant().rotate([-RT.origin.lon, -RT.origin.lat]).clipAngle(120);
    proj.fitExtent(ext, d3.geoCircle().center([RT.origin.lon, RT.origin.lat]).radius(100)());
  }
  $$("#projbar button").forEach(b => b.classList.toggle("on", b.dataset.p === k));
  $("#projnote").innerHTML = NOTES[k];
}
function lineStr(path, coords, col, w, dash, a = 1) {
  ctx.save(); ctx.globalAlpha = a; ctx.beginPath(); path({ type: "LineString", coordinates: coords });
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.setLineDash(dash || []); ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke(); ctx.restore();
}
function visible(p) { return kind !== "orthographic" || d3.geoDistance(p, [-proj.rotate()[0], -proj.rotate()[1]]) < Math.PI / 2 - 0.01; }
function label(p, txt, col, big) {
  if (!visible(p)) return; const q = proj(p); if (!q || isNaN(q[0])) return;
  ctx.beginPath(); ctx.arc(q[0], q[1], big ? 6 : 5, 0, 7); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = "#fff"; ctx.stroke();
  ctx.font = `600 ${big ? 15 : 14}px Inter`; ctx.textAlign = "left"; ctx.lineWidth = 4; ctx.strokeStyle = "rgba(246,242,234,.92)";
  ctx.strokeText(txt, q[0] + 9, q[1] - 7); ctx.fillStyle = C.ink; ctx.fillText(txt, q[0] + 9, q[1] - 7);
}
function plane(pts, f, col) {
  const n = pts.length - 1, i = Math.min(n - 1, Math.floor(f * n));
  const a = pts[i], b = pts[i + 1]; if (!visible(a)) return;
  const pa = proj(a), pb = proj(b); if (!pa || !pb || isNaN(pa[0]) || isNaN(pb[0])) return;
  const u = f * n - i, x = pa[0] + (pb[0] - pa[0]) * u, y = pa[1] + (pb[1] - pa[1]) * u, ang = Math.atan2(pb[1] - pa[1], pb[0] - pa[0]);
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-6, -6); ctx.lineTo(-3, 0); ctx.lineTo(-6, 6); ctx.closePath();
  ctx.fillStyle = col; ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke(); ctx.fill(); ctx.restore();
}
function draw(now) {
  ctx.clearRect(0, 0, W, H);
  const path = d3.geoPath(proj, ctx);
  ctx.beginPath(); path({ type: "Sphere" }); ctx.fillStyle = C.ocean; ctx.fill();
  ctx.beginPath(); path(d3.geoGraticule10()); ctx.strokeStyle = C.grat; ctx.lineWidth = 1; ctx.stroke();
  ctx.beginPath(); path(kind === "gnomonic" ? LAND110 : LAND); ctx.fillStyle = C.land; ctx.fill(); ctx.strokeStyle = C.landLine; ctx.lineWidth = 0.7; ctx.stroke();
  if (kind === "azeq") for (let km = 2500; km <= 20000; km += 2500) {
    ctx.beginPath(); path(d3.geoCircle().center([RT.origin.lon, RT.origin.lat]).radius(km / 111.195)()); ctx.strokeStyle = "rgba(60,80,90,.28)"; ctx.setLineDash([3, 4]); ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
    const q = proj([RT.origin.lon, RT.origin.lat + km / 111.195]); if (q && km <= 10000) { ctx.font = "500 11px DM Mono"; ctx.fillStyle = "#5f6f76"; ctx.fillText(`${fmt(km)} km`, q[0] + 4, q[1] - 3); }
  }
  ctx.beginPath(); path({ type: "Sphere" }); ctx.strokeStyle = "rgba(60,80,90,.35)"; ctx.lineWidth = 1.2; ctx.stroke();
  const showRh = $("#showrh").checked, tt = ((now - t0) / 1000) % 12 / 10;
  for (const r of RT.routes) {
    const on = r.id === sel, a = on ? 1 : 0.55;
    if (showRh) lineStr(path, r.rh, r.color, 1.6, [2, 5], a * 0.9);
    lineStr(path, r.gcPts, r.color, on ? 2.2 : 1.6, [7, 6], a);
    const tr = TR[r.id];
    if (tr) {
      const G = new Set(tr.gaps), w = on ? 4.2 : 3; let seg = [tr.path[0]];
      for (let i = 1; i < tr.path.length; i++) {
        if (G.has(i)) { lineStr(path, seg, r.color, w, null, a); lineStr(path, [tr.path[i - 1], tr.path[i]], r.color, w * 0.6, [1, 6], a); seg = [tr.path[i]]; }
        else seg.push(tr.path[i]);
      }
      lineStr(path, seg, r.color, w, null, a);
    }
    const pts = tr ? tr.path : r.gcPts, f = Math.min(1, tt * Math.max(...RT.routes.map(x => x.gc_km)) / r.gc_km);
    if (f < 1) plane(pts, f, r.color);
  }
  for (const r of RT.routes) label([r.lon, r.lat], r.name, r.color);
  label([RT.origin.lon, RT.origin.lat], "Frankfurt", C.ink, true);
  requestAnimationFrame(draw);
}
function list() {
  $("#routes").innerHTML = RT.routes.map(r => {
    const tr = TR[r.id];
    return `<div class="rt ${r.id === sel ? "on" : ""}" data-id="${r.id}"><span class="bar" style="background:${r.color}"></span><div><b>Frankfurt → ${r.name}</b>
      <div class="m">${tr ? `real track ${fmt(tr.km)} km · ` : ""}shortest ${fmt(r.gc_km)} km · “straight” +${hm(r.extra_min)}</div></div></div>`;
  }).join("");
  $$(".rt").forEach(e => e.onclick = () => { sel = e.dataset.id; rot = null; setProj(kind); list(); card(); });
  $("#tbl tbody").innerHTML = RT.routes.map(r => `<tr><td style="color:${r.color}">${r.name}</td><td>${fmt(r.gc_km)} km</td><td>+${fmt(r.extra_km)} km</td><td>+${hm(r.extra_min)}</td></tr>`).join("");
}
function card() {
  const r = RT.routes.find(x => x.id === sel), tr = TR[r.id];
  $("#card").innerHTML = `<b style="color:${r.color}">Frankfurt → ${r.name} (${r.code})</b>
    <div class="k"><span>Shortest path (great circle)</span><span>${fmt(r.gc_km)} km · ${hm(Math.round(r.gc_km / 900 * 60))}</span>
    <span>“Straight” Mercator line</span><span>${fmt(r.rhumb_km)} km (+${r.extra_pct}%)</span>
    ${tr ? `<span>Real track ${tr.callsign.replace("DLH", "LH")}, ${tr.date}</span><span>${fmt(tr.km)} km (+${Math.round((tr.km - r.gc_km) / r.gc_km * 1000) / 10}%)</span>` : ""}
    <span>Heading at take-off: shortest / “straight”</span><span>${r.heading_gc}° / ${r.heading_rhumb}°</span>
    <span>Highest latitude on the shortest path</span><span>${r.max_lat}° N</span></div>
    <div class="note"><b>Real flights:</b> ${r.note}</div>`;
}
async function init() {
  const j = u => fetch(u).then(x => x.ok ? x.json() : null);
  const [rt, l50, l110, tr] = await Promise.all([j("data/routes.json"), j("data/land-50m.json"), j("data/land-110m.json"), j("data/tracks.json")]);
  RT = rt; LAND = topojson.feature(l50, l50.objects.land); LAND110 = topojson.feature(l110, l110.objects.land); TR = tr || {};
  const m = d3.geoMercator().scale(1).translate([0, 0]);
  for (const r of RT.routes) {
    const A = [RT.origin.lon, RT.origin.lat], B = [r.lon, r.lat], gi = d3.geoInterpolate(A, B);
    r.gcPts = d3.range(0, 1.0001, 1 / 200).map(gi);
    const a = m(A), b = m(B); r.rh = d3.range(0, 1.0001, 1 / 200).map(t => m.invert([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]));
  }
  $$("#projbar button").forEach(b => b.onclick = () => { rot = null; setProj(b.dataset.p); });
  const leg = document.createElement("div"); leg.id = "legend";
  leg.innerHTML = `${Object.keys(TR).length ? `<div><i></i>real Lufthansa track (20–21 Nov 2026)</div><div><i style="border-top:3px dotted #5a524a"></i>no ADS-B receivers there</div>` : ""}<div><i class="gc"></i>shortest path (great circle)</div><div><i class="rh"></i>“straight” line on Mercator</div>`;
  $("#stage").appendChild(leg);
  d3.select ? 0 : 0;
  let drag = null;
  cv.addEventListener("pointerdown", e => { if (kind === "orthographic") { drag = [e.clientX, e.clientY, proj.rotate()]; cv.setPointerCapture(e.pointerId); } });
  cv.addEventListener("pointermove", e => { if (!drag) return; const k = 0.25; rot = [drag[2][0] + (e.clientX - drag[0]) * k, Math.max(-85, Math.min(85, drag[2][1] - (e.clientY - drag[1]) * k))]; proj.rotate(rot); });
  cv.addEventListener("pointerup", () => drag = null);
  addEventListener("resize", size);
  size(); list(); card(); requestAnimationFrame(draw);
  window.READY = true;
}
init();
