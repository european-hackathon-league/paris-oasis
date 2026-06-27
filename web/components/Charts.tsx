import { data } from "../app/data";

export function RoomTypeChart() {
  const types = data.roomTypes.filter((t) => t.count > 0).sort((a, b) => b.count - a.count);
  const max = Math.max(...types.map((t) => t.count));
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">Room types across the dataset</h3>
      <p className="mb-5 text-xs text-slate-500">
        Frequency over {data.stats.statsOver.toLocaleString()} sampled apartments · colors match the official MSD palette
      </p>
      <div className="space-y-2.5">
        {types.map((t) => (
          <div key={t.id} className="flex items-center gap-3">
            <div className="w-24 shrink-0 text-right text-xs font-medium text-slate-600">{t.name}</div>
            <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-slate-100">
              <div
                className="h-full rounded-md transition-all"
                style={{ width: `${(t.count / max) * 100}%`, background: t.color }}
              />
            </div>
            <div className="w-14 shrink-0 text-xs tabular-nums text-slate-500">
              {t.count.toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RoomsHistogram() {
  const h = data.roomsHistogram.filter((b) => b.count > 0);
  const max = Math.max(...h.map((b) => b.count));
  const W = 520, H = 200, pad = 24;
  const bw = (W - pad * 2) / h.length;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">Rooms per apartment</h3>
      <p className="mb-5 text-xs text-slate-500">
        Distribution of node counts · median {data.stats.medianRooms}, mean {data.stats.avgRooms}
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Histogram of rooms per apartment">
        {h.map((b, i) => {
          const bh = (b.count / max) * (H - pad * 2);
          return (
            <g key={b.rooms}>
              <rect
                x={pad + i * bw + 1} y={H - pad - bh}
                width={Math.max(bw - 2, 1)} height={bh}
                rx={2} fill="#4f46e5" opacity={0.85}
              />
              {i % 4 === 0 && (
                <text x={pad + i * bw + bw / 2} y={H - 8} textAnchor="middle"
                  fontSize="9" fill="#64748b">{b.rooms}</text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
