import { NextRequest } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, readFile, mkdir } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const execFileP = promisify(execFile);
const ROOT = path.resolve(process.cwd(), "..");
const PY = path.join(ROOT, ".venv", "bin", "python");
const SCRIPT = path.join(ROOT, "scripts", "parametric_predict.py");
const DIR = path.join(ROOT, "outputs", "canvas");

// POST { image: dataURL(outline png), rooms: [{type,count}], areas?: {type:m2} }
//   -> { ok, doc, image: dataURL(generated plan) }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const m = (body?.image || "").match(/^data:image\/png;base64,(.+)$/);
  if (!m) return Response.json({ ok: false, error: "expected a PNG data URL in 'image'" }, { status: 400 });

  const rooms = (Array.isArray(body?.rooms) ? body.rooms : [])
    .map((r: { type: number; count: number }) => ({
      type: Math.min(8, Math.max(0, Math.floor(Number(r.type) || 0))),
      count: Math.min(20, Math.max(0, Math.floor(Number(r.count) || 0))),
    }))
    .filter((r: { count: number }) => r.count > 0);
  if (!rooms.length) return Response.json({ ok: false, error: "add at least one room" }, { status: 400 });

  const areas: Record<string, number> = {};
  if (body?.areas && typeof body.areas === "object") {
    for (const [k, v] of Object.entries(body.areas)) {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) areas[String(Math.floor(Number(k)))] = n;
    }
  }
  const program = JSON.stringify({ rooms, areas });

  await mkdir(DIR, { recursive: true });
  const stamp = `${Date.now()}_${Math.floor(performance.now())}`;
  const sketch = path.join(DIR, `prog_${stamp}.png`);
  const plan = path.join(DIR, `progplan_${stamp}.png`);
  await writeFile(sketch, Buffer.from(m[1], "base64"));

  let doc: unknown;
  try {
    const { stdout } = await execFileP(
      PY, [SCRIPT, "--in", sketch, "--out", plan, "--program", program],
      { cwd: ROOT, timeout: 60000, maxBuffer: 4 << 20 },
    );
    doc = JSON.parse(stdout.trim().split("\n").filter(Boolean).pop() || "{}");
  } catch (e: unknown) {
    const msg = (e as { stderr?: string; message?: string })?.stderr ||
      (e as { message?: string })?.message || "generation failed";
    return Response.json({ ok: false, error: String(msg).slice(-300) }, { status: 500 });
  }
  if (doc && typeof doc === "object" && (doc as { ok?: boolean }).ok === false) {
    return Response.json({ ok: false, error: (doc as { error?: string }).error || "failed" }, { status: 400 });
  }

  try {
    const buf = await readFile(plan);
    return Response.json({ ok: true, doc, image: `data:image/png;base64,${buf.toString("base64")}` });
  } catch {
    return Response.json({ ok: false, error: "plan was not generated" }, { status: 500 });
  }
}
