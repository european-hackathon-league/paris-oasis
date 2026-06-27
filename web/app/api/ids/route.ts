import { NextRequest } from "next/server";
import { readdir } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROOT = path.resolve(process.cwd(), "..");
const MSD = path.join(ROOT, "data", "modified-swiss-dwellings-v2");

// GET /api/ids?split=train  ->  { split, count, ids: [...] }
export async function GET(req: NextRequest) {
  const split = req.nextUrl.searchParams.get("split") === "test" ? "test" : "train";
  const dir = path.join(MSD, split, "graph_out");
  try {
    const files = await readdir(dir);
    const ids = files
      .filter((f) => f.endsWith(".pickle"))
      .map((f) => f.slice(0, -".pickle".length))
      .sort((a, b) => Number(a) - Number(b));
    return Response.json({ split, count: ids.length, ids });
  } catch (e: unknown) {
    return Response.json(
      { split, count: 0, ids: [], error: String((e as Error)?.message || e) },
      { status: 500 },
    );
  }
}
