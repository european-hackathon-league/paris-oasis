import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROOT = path.resolve(process.cwd(), "..");
const OUTPUTS = path.join(ROOT, "outputs");

const DIRS = [
  { dir: "generated_web", label: "Your last web run", metrics: "web_metrics.json" },
  { dir: "generated_unet", label: "Full MI300X run", metrics: "full_metrics.json" as string | null },
];

async function listIds(dir: string): Promise<string[]> {
  try {
    const files = await readdir(path.join(OUTPUTS, dir));
    return files.filter((f) => f.endsWith(".pickle")).map((f) => f.slice(0, -7))
      .sort((a, b) => Number(a) - Number(b));
  } catch { return []; }
}

async function readMetrics(name: string | null): Promise<Record<string, number> | null> {
  if (!name) return null;
  try { return JSON.parse(await readFile(path.join(OUTPUTS, name), "utf8")); } catch { return null; }
}

async function mtime(dir: string): Promise<number | null> {
  try { return (await stat(path.join(OUTPUTS, dir))).mtimeMs; } catch { return null; }
}

// GET /api/results -> generated runs with metrics + sample ids
export async function GET() {
  const runs = [];
  for (const d of DIRS) {
    const ids = await listIds(d.dir);
    if (!ids.length) continue;
    runs.push({
      dir: d.dir,
      label: d.label,
      count: ids.length,
      ids: ids.slice(0, 120),
      metrics: await readMetrics(d.metrics),
      updatedAt: await mtime(d.dir),
    });
  }
  // static reference baselines (from the repo's documented evaluations)
  const baselines = [
    { name: "Retrieval v1", fid: 36.0, density: 0.91, coverage: 0.89 },
    { name: "Retrieval v2 (structure-aware)", fid: 34.1, density: 0.87, coverage: 0.91 },
  ];
  return Response.json({ runs, baselines });
}
