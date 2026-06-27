"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Config = { size: number; epochs: number; batch: number; ntrain: number; ntest: number };
type Status = {
  running: boolean;
  status: string;
  config: Config | null;
  startedAt: number | null;
  phase: string;
  epochs: { epoch: number; total: number; loss: number }[];
  metrics: Record<string, number> | null;
  tail: string[];
};

const PRESETS: { name: string; sub: string; cfg: Config }[] = [
  { name: "Quick", sub: "~1 min · sanity", cfg: { size: 128, epochs: 10, batch: 32, ntrain: 500, ntest: 100 } },
  { name: "Standard", sub: "few min", cfg: { size: 128, epochs: 25, batch: 32, ntrain: 1500, ntest: 300 } },
  { name: "Full", sub: "256px · all data", cfg: { size: 256, epochs: 100, batch: 32, ntrain: 4572, ntest: 800 } },
];

function LossSpark({ epochs }: { epochs: { epoch: number; loss: number }[] }) {
  if (epochs.length < 2) return null;
  const w = 280, h = 56, pad = 4;
  const losses = epochs.map((e) => e.loss);
  const min = Math.min(...losses), max = Math.max(...losses);
  const rng = max - min || 1;
  const pts = epochs.map((e, i) => {
    const x = pad + (i / (epochs.length - 1)) * (w - 2 * pad);
    const y = pad + (1 - (e.loss - min) / rng) * (h - 2 * pad);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg width={w} height={h} className="rounded-md bg-slate-50">
      <polyline points={pts.join(" ")} fill="none" stroke="#4f46e5" strokeWidth={1.8} />
    </svg>
  );
}

export default function TrainPanel() {
  const [cfg, setCfg] = useState<Config>(PRESETS[0].cfg);
  const [st, setSt] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    try {
      const r = await fetch("/api/train", { cache: "no-store" });
      setSt(await r.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    poll();
    timer.current = setInterval(poll, 2000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [poll]);

  const start = async () => {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/train", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", ...cfg }),
      });
      const d = await r.json();
      if (!d.ok) setErr(d.error || "could not start");
      await poll();
    } catch (e) { setErr(String(e)); } finally { setBusy(false); }
  };

  const stop = async () => {
    setBusy(true);
    try {
      await fetch("/api/train", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
      });
      await poll();
    } finally { setBusy(false); }
  };

  const running = st?.running;
  const last = st?.epochs?.[st.epochs.length - 1];
  const cur = last?.epoch ?? 0;
  const tot = last?.total ?? st?.config?.epochs ?? cfg.epochs;
  const pct = running && tot ? Math.round((cur / tot) * 100) : st?.status === "done" ? 100 : 0;

  const fields: [keyof Config, string, number, number][] = [
    ["size", "Resolution (px)", 64, 512],
    ["epochs", "Epochs", 1, 300],
    ["batch", "Batch size", 1, 128],
    ["ntrain", "Train samples", 1, 4572],
    ["ntest", "Test samples", 1, 800],
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* presets */}
      <div className="mb-4 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.name}
            disabled={running}
            onClick={() => setCfg(p.cfg)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <div className="font-semibold text-slate-900">{p.name}</div>
            <div className="text-xs text-slate-400">{p.sub}</div>
          </button>
        ))}
      </div>

      {/* config grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {fields.map(([k, label, lo, hi]) => (
          <label key={k} className="text-xs font-medium text-slate-500">
            {label}
            <input
              type="number" min={lo} max={hi} value={cfg[k]} disabled={running}
              onChange={(e) => setCfg((c) => ({ ...c, [k]: Number(e.target.value) }))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-indigo-400 disabled:bg-slate-50"
            />
          </label>
        ))}
      </div>

      {/* actions */}
      <div className="mt-4 flex items-center gap-3">
        {!running ? (
          <button onClick={start} disabled={busy}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
            ▶ Start training run
          </button>
        ) : (
          <button onClick={stop} disabled={busy}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50">
            ■ Stop
          </button>
        )}
        <span className={`inline-flex items-center gap-1.5 text-sm ${running ? "text-emerald-600" : "text-slate-400"}`}>
          <span className={`h-2 w-2 rounded-full ${running ? "animate-pulse bg-emerald-500" : "bg-slate-300"}`} />
          {running ? `running · ${st?.phase || "train"}` : st?.status ?? "idle"}
        </span>
        {err && <span className="text-sm text-rose-600">{err}</span>}
      </div>

      {/* progress */}
      {(running || (st?.epochs?.length ?? 0) > 0) && (
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">
              {st?.phase === "predict" ? "Predicting test plans…" :
                st?.phase === "eval" ? "Computing FID / density / coverage…" :
                `Epoch ${cur} / ${tot}`}
            </span>
            <span className="font-mono text-slate-500">
              {last ? `loss ${last.loss.toFixed(4)}` : ""}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div className="h-full bg-indigo-600 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-4">
            <LossSpark epochs={st?.epochs ?? []} />
            {st?.metrics && (
              <div className="flex gap-3 text-sm">
                {st.metrics.fid != null && <Metric label="FID" v={st.metrics.fid.toFixed(2)} />}
                {st.metrics.density != null && <Metric label="Density" v={st.metrics.density.toFixed(3)} />}
                {st.metrics.coverage != null && <Metric label="Coverage" v={st.metrics.coverage.toFixed(3)} />}
              </div>
            )}
          </div>
          {/* log tail */}
          {st?.tail?.length ? (
            <pre className="mt-3 max-h-40 overflow-auto rounded-lg bg-slate-900 p-3 text-xs leading-relaxed text-slate-200">
              {st.tail.join("\n")}
            </pre>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Metric({ label, v }: { label: string; v: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className="font-semibold text-slate-900">{v}</div>
    </div>
  );
}
