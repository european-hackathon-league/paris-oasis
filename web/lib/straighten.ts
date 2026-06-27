// Geometry for the Studio: turn freehand strokes into clean straight wall
// segments, snapping junctions and trimming short overlaps so a hand sketch
// reads like real building walls.

export type Pt = { x: number; y: number };
export type Seg = { a: Pt; b: Pt };

const RDP_EPS = 7;     // simplification tolerance (px, in 512 space)
const SNAP_DEG = 13;   // snap a segment to H/V within this angle
const CLUSTER = 18;    // merge endpoints within this distance
const MIN_LEN = 12;    // drop segments shorter than this

function dist(a: Pt, b: Pt) { return Math.hypot(a.x - b.x, a.y - b.y); }

function perpDist(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  return Math.abs((p.x - a.x) * dy - (p.y - a.y) * dx) / len;
}

function rdp(pts: Pt[], eps: number): Pt[] {
  if (pts.length < 3) return pts;
  let dmax = 0, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = perpDist(pts[i], pts[0], pts[pts.length - 1]);
    if (d > dmax) { dmax = d; idx = i; }
  }
  if (dmax > eps) {
    return rdp(pts.slice(0, idx + 1), eps).slice(0, -1).concat(rdp(pts.slice(idx), eps));
  }
  return [pts[0], pts[pts.length - 1]];
}

// one freehand stroke -> straightened polyline (axis-snapped, diagonals kept)
function straightenStroke(points: Pt[]): Pt[] {
  if (points.length < 2) return points;
  const simp = rdp(points, RDP_EPS);
  if (simp.length < 2) return [points[0], points[points.length - 1]];
  const out: Pt[] = [simp[0]];
  let cur = simp[0];
  for (let i = 1; i < simp.length; i++) {
    const nx = simp[i];
    const ang = (Math.atan2(nx.y - cur.y, nx.x - cur.x) * 180) / Math.PI;
    const a = ((ang % 180) + 180) % 180;
    const s: Pt = { x: nx.x, y: nx.y };
    if (a < SNAP_DEG || a > 180 - SNAP_DEG) s.y = cur.y;
    else if (Math.abs(a - 90) < SNAP_DEG) s.x = cur.x;
    out.push(s);
    cur = s;
  }
  return out;
}

// project point p onto segment a-b, return the closest point ON the segment
function projectOnSeg(p: Pt, a: Pt, b: Pt): { pt: Pt; t: number; d: number } {
  const dx = b.x - a.x, dy = b.y - a.y;
  const l2 = dx * dx + dy * dy || 1;
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  const pt = { x: a.x + t * dx, y: a.y + t * dy };
  return { pt, t, d: dist(p, pt) };
}

// strokes -> cleaned straight wall segments
export function strokesToSegments(strokes: Pt[][]): Seg[] {
  // 1. straighten each stroke into segments
  let segs: Seg[] = [];
  for (const st of strokes) {
    const poly = straightenStroke(st);
    for (let i = 0; i < poly.length - 1; i++) segs.push({ a: poly[i], b: poly[i + 1] });
  }
  segs = segs.filter((s) => dist(s.a, s.b) >= MIN_LEN);
  if (!segs.length) return [];

  // 2. cluster all endpoints; snap each to its cluster centroid (junctions meet)
  const ends: Pt[] = [];
  segs.forEach((s) => { ends.push(s.a, s.b); });
  const reps: Pt[] = [];
  const snap = (p: Pt): Pt => {
    for (const r of reps) if (dist(p, r) <= CLUSTER) return r;
    const r = { x: p.x, y: p.y };
    reps.push(r);
    return r;
  };
  // build clusters greedily, then average members for a stable centroid
  const members = new Map<Pt, Pt[]>();
  for (const e of ends) {
    const r = snap(e);
    if (!members.has(r)) members.set(r, []);
    members.get(r)!.push(e);
  }
  for (const [r, ms] of members) {
    r.x = ms.reduce((s, m) => s + m.x, 0) / ms.length;
    r.y = ms.reduce((s, m) => s + m.y, 0) / ms.length;
  }
  segs = segs.map((s) => ({ a: snap(s.a), b: snap(s.b) })).filter((s) => dist(s.a, s.b) >= MIN_LEN);

  // 3. T-junctions: snap a dangling endpoint onto a nearby segment interior
  const verts = reps;
  for (const s of segs) {
    for (const key of ["a", "b"] as const) {
      const p = s[key];
      let best: { pt: Pt; d: number } | null = null;
      for (const o of segs) {
        if (o === s) continue;
        const pr = projectOnSeg(p, o.a, o.b);
        if (pr.t > 0.05 && pr.t < 0.95 && pr.d <= CLUSTER) {
          if (!best || pr.d < best.d) best = { pt: pr.pt, d: pr.d };
        }
      }
      if (best) { p.x = best.pt.x; p.y = best.pt.y; }
    }
  }
  void verts;

  // 4. drop degenerate + de-duplicate
  const seen = new Set<string>();
  const out: Seg[] = [];
  for (const s of segs) {
    if (dist(s.a, s.b) < MIN_LEN) continue;
    const k = [s.a.x, s.a.y, s.b.x, s.b.y].map((n) => Math.round(n)).sort().join(",");
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

// render straight wall segments to a PNG data URL (white bg, black walls)
export function segmentsToDataURL(segs: Seg[], size = 512, lineWidth = 6): string {
  const cv = document.createElement("canvas");
  cv.width = size; cv.height = size;
  const c = cv.getContext("2d")!;
  c.fillStyle = "#ffffff"; c.fillRect(0, 0, size, size);
  c.strokeStyle = "#111111"; c.lineWidth = lineWidth; c.lineCap = "round"; c.lineJoin = "round";
  for (const s of segs) {
    c.beginPath();
    c.moveTo(s.a.x, s.a.y);
    c.lineTo(s.b.x, s.b.y);
    c.stroke();
  }
  return cv.toDataURL("image/png");
}
