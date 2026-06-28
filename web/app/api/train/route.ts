import { NextRequest } from "next/server";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { openSync } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const execFileP = promisify(execFile);

const ROOT = path.resolve(process.cwd(), "..");
const OUTPUTS = path.join(ROOT, "outputs");
const RUNS = path.join(OUTPUTS, "runs");
const STATE = path.join(OUTPUTS, "web_train.json");
const LOG = path.join(OUTPUTS, "web_train.log");
const SCRIPT = path.join(ROOT, "scripts", "web_train.sh");

type Config = { size: number; epochs: number; batch: number; ntrain: number; ntest: number };
type State = {
  pid: number | null;
  config: Config;
  startedAt: number;
  finishedAt: number | null;
  status: "running" | "done" | "stopped" | "error";
  runId?: string;
  modelName?: string;
};

type ProcInfo = { pid: number; elapsedSec: number; args: string };

// A training run that this panel did NOT start (manual CLI run, another Claude
// instance, any model). We surface whatever telemetry we can find for it.
type Foreign = {
  source: "registry" | "process";
  pid: number | null;
  model: string;
  config: Record<string, string | number>;
  elapsedSec: number;
  startedAt: number | null;
  epochs: { epoch: number; total: number; loss: number }[];
  curEpoch: number | null;
  totalEpochs: number | null;
  loss: number | null;
  etaSec: number | null;
  tail: string[];
  liveLoss: boolean; // false => detected but no per-epoch progress on disk
};

function clamp(v: unknown, lo: number, hi: number, dflt: number): number {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return dflt;
  return Math.min(Math.max(n, lo), hi);
}

function alive(pid: number | null): boolean {
  if (!pid) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

async function readState(): Promise<State | null> {
  try { return JSON.parse(await readFile(STATE, "utf8")); } catch { return null; }
}

// Every model trainer prints "epoch N/M  loss=X" — one parser covers them all.
function parseLog(text: string) {
  const lines = text.split("\n").filter(Boolean);
  const epochs: { epoch: number; total: number; loss: number }[] = [];
  let phase = "";
  let metrics: Record<string, number> | null = null;
  for (const ln of lines) {
    const e = ln.match(/epoch\s+(\d+)\/(\d+)\s+loss=([\d.]+)/);
    if (e) epochs.push({ epoch: +e[1], total: +e[2], loss: +e[3] });
    const p = ln.match(/\[web-train\]\s+PHASE\s+(\w+)/);
    if (p) phase = p[1];
    const f = ln.match(/FID\s+([\d.]+)/);
    if (f) metrics = { ...(metrics || {}), fid: +f[1] };
    const d = ln.match(/Density\s+([\d.]+)/);
    if (d) metrics = { ...(metrics || {}), density: +d[1] };
    const c = ln.match(/Coverage\s+([\d.]+)/);
    if (c) metrics = { ...(metrics || {}), coverage: +c[1] };
  }
  return { phase, epochs, metrics, tail: lines.slice(-40) };
}

// List every training process on the box (ANY model, web-started or manual), so
// we always know the GPU is occupied and can report what is running.
async function listTraining(): Promise<ProcInfo[]> {
  try {
    const { stdout } = await execFileP("ps", ["-eo", "pid=,etimes=,args="], {
      timeout: 5000,
      maxBuffer: 8 * 1024 * 1024,
    });
    const out: ProcInfo[] = [];
    for (const line of stdout.split("\n")) {
      const m = line.match(/^\s*(\d+)\s+(\d+)\s+(.*)$/);
      if (!m) continue;
      const args = m[3];
      if (!/\bpython[0-9.]*\b/.test(args)) continue;
      if (!/\btrain\b/.test(args)) continue;
      if (!/(\S*model\S*\.py|unet_seg\.py)\b/.test(args)) continue;
      out.push({ pid: +m[1], elapsedSec: +m[2], args });
    }
    return out;
  } catch {
    return [];
  }
}

function num(re: RegExp, s: string): number | undefined {
  const m = s.match(re);
  return m ? Number(m[1]) : undefined;
}

// Turn a raw command line into a human label + the config we can recover from it.
function describeProc(p: ProcInfo): Foreign {
  const script = p.args.match(/(\S*model\S*\.py|unet_seg\.py)/)?.[1] ?? "training";
  const base = script.split("/").pop()!.replace(/_model\.py$|\.py$/, "");
  const model = base.replace(/_/g, " ");
  const config: Record<string, string | number> = {};
  const epochs = num(/--epochs\s+(\d+)/, p.args);
  const batch = num(/--batch\s+(\d+)/, p.args);
  const size = num(/--size\s+(\d+)/, p.args);
  const n = num(/--n\s+(\d+)/, p.args);
  const data = p.args.match(/--data\s+(\S+)/)?.[1];
  if (epochs != null) config.epochs = epochs;
  if (batch != null) config.batch = batch;
  if (size != null) config.size = size;
  if (n != null) config.samples = n;
  if (data) config.data = data.split("/").pop()!;
  return {
    source: "process",
    pid: p.pid,
    model,
    config,
    elapsedSec: p.elapsedSec,
    startedAt: null,
    epochs: [],
    curEpoch: null,
    totalEpochs: epochs ?? null,
    loss: null,
    etaSec: null,
    tail: [],
    liveLoss: false,
  };
}

// A run launched through scripts/trainwatch.sh leaves a status JSON + a log we
// can parse for the full loss curve and an ETA. This is the rich path.
async function readRegistry(): Promise<Foreign[]> {
  let files: string[];
  try { files = await readdir(RUNS); } catch { return []; }
  const out: Foreign[] = [];
  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    try {
      const meta = JSON.parse(await readFile(path.join(RUNS, f), "utf8"));
      const isRunning = meta.status === "running" && alive(meta.pid);
      if (!isRunning) continue;
      let log = "";
      try { log = await readFile(path.join(RUNS, f.replace(/\.json$/, ".log")), "utf8"); } catch { /* none */ }
      const parsed = parseLog(log);
      const last = parsed.epochs[parsed.epochs.length - 1];
      const startedAt: number = meta.startedAt ?? Date.now();
      const elapsedSec = Math.max(0, Math.round((Date.now() - startedAt) / 1000));
      const total = last?.total ?? meta.total ?? null;
      const cur = last?.epoch ?? null;
      const eta = cur && total && cur > 0 ? Math.round((elapsedSec / cur) * (total - cur)) : null;
      out.push({
        source: "registry",
        pid: meta.pid ?? null,
        model: meta.name ?? meta.id ?? "training",
        config: meta.config ?? {},
        elapsedSec,
        startedAt,
        epochs: parsed.epochs,
        curEpoch: cur,
        totalEpochs: total,
        loss: last?.loss ?? null,
        etaSec: eta,
        tail: parsed.tail,
        liveLoss: parsed.epochs.length > 0,
      });
    } catch { /* skip bad entry */ }
  }
  return out;
}

export async function GET() {
  const st = await readState();
  let log = "";
  try { log = await readFile(LOG, "utf8"); } catch { /* none yet */ }
  const running = !!st && alive(st.pid);

  const procs = await listTraining();
  const gpuBusy = procs.length > 0;

  // Pick the active foreign run to surface: prefer a richly-telemetered registry
  // run, else fall back to whatever raw process we detected. Only relevant when
  // THIS panel isn't the one running.
  let foreign: Foreign | null = null;
  if (!running) {
    const registry = await readRegistry();
    if (registry.length) {
      foreign = registry.sort((a, b) => b.elapsedSec - a.elapsedSec)[0];
    } else if (procs.length) {
      const p = procs.sort((a, b) => b.elapsedSec - a.elapsedSec)[0];
      foreign = describeProc(p);
    }
  }

  const parsed = parseLog(log);
  let status = st?.status ?? "idle";
  if (st && st.status === "running" && !running) status = "done"; // process exited

  return Response.json({
    running,
    gpuBusy,
    foreignRun: !!foreign,
    foreign,
    status,
    config: st?.config ?? null,
    startedAt: st?.startedAt ?? null,
    phase: parsed.phase,
    epochs: parsed.epochs,
    metrics: parsed.metrics,
    tail: parsed.tail,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const action = body?.action;

  if (action === "stop") {
    const st = await readState();
    // Only ever stop the run THIS panel started — never a foreign/CLI run.
    if (st?.pid && alive(st.pid)) {
      try { process.kill(-st.pid, "SIGTERM"); } catch { try { process.kill(st.pid, "SIGTERM"); } catch { /* gone */ } }
    }
    if (st) await writeFile(STATE, JSON.stringify({ ...st, status: "stopped", finishedAt: Date.now() }));
    return Response.json({ ok: true, stopped: true });
  }

  if (action === "start") {
    const existing = await readState();
    if (existing && alive(existing.pid)) {
      return Response.json({ ok: false, error: "A training run is already active — stop it first." }, { status: 409 });
    }
    // Guard against ANY training process (manual CLI run, another model, another
    // Claude instance) so we never run two trainings at once on the single GPU.
    if ((await listTraining()).length > 0) {
      return Response.json({ ok: false, error: "The GPU is already busy with another training run. Wait for it to finish." }, { status: 409 });
    }
    const config: Config = {
      size: clamp(body?.size, 64, 512, 128),
      epochs: clamp(body?.epochs, 1, 300, 20),
      batch: clamp(body?.batch, 1, 128, 32),
      ntrain: clamp(body?.ntrain, 1, 4572, 1000),
      ntest: clamp(body?.ntest, 1, 800, 200),
    };
    await mkdir(OUTPUTS, { recursive: true });
    const startedAt = Date.now();
    const runId = `web-${startedAt}`;
    const modelName = `U-Net · ${config.size}px · ${config.epochs}ep`;
    const fd = openSync(LOG, "w"); // truncate
    const child = spawn("bash", [SCRIPT], {
      cwd: ROOT,
      detached: true,
      stdio: ["ignore", fd, fd],
      env: {
        ...process.env,
        SIZE: String(config.size),
        EPOCHS: String(config.epochs),
        BATCH: String(config.batch),
        NTRAIN: String(config.ntrain),
        NTEST: String(config.ntest),
        RUN_ID: runId,
        MODEL_NAME: modelName,
      },
    });
    child.unref();
    const st: State = { pid: child.pid ?? null, config, startedAt, finishedAt: null, status: "running", runId, modelName };
    await writeFile(STATE, JSON.stringify(st));
    return Response.json({ ok: true, pid: child.pid, runId, config });
  }

  return Response.json({ ok: false, error: "unknown action" }, { status: 400 });
}
