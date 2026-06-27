import React from "react";

export function Section({
  id, eyebrow, title, children, className = "",
}: {
  id?: string; eyebrow?: string; title?: string;
  children: React.ReactNode; className?: string;
}) {
  return (
    <section id={id} className={`mx-auto w-full max-w-6xl px-5 py-16 md:py-24 ${className}`}>
      {eyebrow && (
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
          {eyebrow}
        </p>
      )}
      {title && (
        <h2 className="mb-8 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

export function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{value}</div>
      {sub && <div className="mt-1 text-sm text-slate-500">{sub}</div>}
    </div>
  );
}

export function Chip({ color, children }: { color?: string; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700"
    >
      {color && <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />}
      {children}
    </span>
  );
}
