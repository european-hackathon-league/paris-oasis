import Reveal from "./Reveal";
import ModelPreview from "./ModelPreview";

type Metric = { label: string; value: string };

/**
 * A model-explainer slide: a tight narrative + headline metrics + a compact
 * "how it works" on the left, and a LIVE gallery of the model's own generated
 * plans on the right. Kept deliberately light on text.
 */
export default function DeepDive({
  index,
  name,
  score,
  summary,
  metrics,
  how,
  paper,
  preview,
  dark = false,
  accent = "#4f46e5",
}: {
  index: string;
  name: string;
  score: string;
  summary: string;
  metrics: Metric[];
  how: string[];
  paper?: { name: string; idea: string; href: string };
  preview?: { dir: string };
  dark?: boolean;
  accent?: string;
}) {
  const sub = dark ? "text-slate-300" : "text-slate-600";
  const muted = dark ? "text-slate-400" : "text-slate-500";
  const card = dark ? "border-white/15 bg-white/5" : "border-slate-200 bg-white";
  const chip = dark ? "border-white/15 bg-white/5 text-slate-200" : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <div className="mx-auto grid w-full max-w-6xl items-center gap-10 py-20 lg:grid-cols-[1.6fr_1fr] lg:gap-12">
      <Reveal variant="left">
        <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: accent }}>
          Top model · {index}
        </p>
        <h2 className={`mt-3 text-3xl font-semibold tracking-tight md:text-5xl ${dark ? "text-white" : "text-slate-900"}`}>
          {name}
        </h2>
        <p className="mt-2 text-sm font-semibold" style={{ color: accent }}>
          {score}
        </p>
        <p className={`mt-5 max-w-xl text-lg ${sub}`}>{summary}</p>

        <div className="mt-6 flex flex-wrap gap-2.5">
          {metrics.map((m) => (
            <span key={m.label} className={`rounded-xl border px-3 py-2 text-sm ${chip}`}>
              <span className="font-semibold">{m.value}</span> <span className={muted}>{m.label}</span>
            </span>
          ))}
        </div>

        <ol className="mt-6 space-y-2">
          {how.map((step, i) => (
            <li key={i} className="flex gap-2.5">
              <span
                className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white"
                style={{ background: accent }}
              >
                {i + 1}
              </span>
              <span className={`text-sm leading-relaxed ${dark ? "text-slate-300" : "text-slate-600"}`}>{step}</span>
            </li>
          ))}
        </ol>

        {paper && (
          <p className="mt-5 max-w-xl text-sm">
            <span className={muted}>Based on </span>
            <a href={paper.href} target="_blank" rel="noopener noreferrer" className="font-medium underline" style={{ color: accent }}>
              {paper.name} ↗
            </a>
            <span className={muted}> - {paper.idea}</span>
          </p>
        )}
      </Reveal>

      <Reveal variant="right" delay={120}>
        <div className={`mx-auto w-full max-w-[300px] rounded-2xl border p-4 shadow-sm lg:mx-0 lg:ml-auto ${card}`}>
          {preview ? (
            <ModelPreview dir={preview.dir} dark={dark} />
          ) : (
            <p className={`text-sm ${muted}`}>No live preview for this model.</p>
          )}
        </div>
      </Reveal>
    </div>
  );
}
