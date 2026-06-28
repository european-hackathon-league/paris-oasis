"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Slide = { id: string; label: string; dark: boolean };

/**
 * Full-screen presentation deck.
 * Owns the snap scroll-container, the right-side slide indicator and keyboard
 * navigation. Slides are declared in the markup as `<section data-slide>` with
 * an optional `data-label` (shown in the indicator) and `data-theme="dark"`
 * (so the overlay chrome can flip its colour over dark slides).
 */
export default function Deck({ children }: { children: React.ReactNode }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [active, setActive] = useState(0);

  const sectionsOf = useCallback(() => {
    const root = scroller.current;
    if (!root) return [] as HTMLElement[];
    return Array.from(root.querySelectorAll<HTMLElement>("section[data-slide]"));
  }, []);

  // Discover the slides and track which one is on screen.
  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const sections = sectionsOf();
    sections.forEach((el, i) => {
      if (!el.id) el.id = `slide-${i + 1}`;
    });
    setSlides(
      sections.map((el, i) => ({
        id: el.id,
        label: el.dataset.label ?? `Slide ${i + 1}`,
        dark: el.dataset.theme === "dark",
      })),
    );

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const idx = sections.indexOf(e.target as HTMLElement);
            if (idx >= 0) setActive(idx);
          }
        }
      },
      { root, threshold: 0.6 },
    );
    sections.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [sectionsOf]);

  const goTo = useCallback(
    (i: number) => {
      const sections = sectionsOf();
      if (!sections.length) return;
      const idx = Math.max(0, Math.min(i, sections.length - 1));
      sections[idx]?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [sectionsOf],
  );

  // Keyboard navigation - one slide per key, like a real deck.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      switch (e.key) {
        case "ArrowDown":
        case "PageDown":
          e.preventDefault();
          goTo(active + 1);
          break;
        case "ArrowUp":
        case "PageUp":
          e.preventDefault();
          goTo(active - 1);
          break;
        case " ":
          if (t?.tagName === "BUTTON" || t?.tagName === "A") return;
          e.preventDefault();
          goTo(active + (e.shiftKey ? -1 : 1));
          break;
        case "Home":
          e.preventDefault();
          goTo(0);
          break;
        case "End":
          e.preventDefault();
          goTo(slides.length - 1);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, slides.length, goTo]);

  const dark = slides[active]?.dark ?? false;

  return (
    <>
      <div
        ref={scroller}
        className="deck h-[100dvh] snap-y snap-mandatory overflow-x-hidden overflow-y-scroll overscroll-y-contain scroll-smooth bg-paper"
      >
        {children}
      </div>

      {/* Back to top / brand mark - no bar, just a mark that recolours per slide */}
      <button
        type="button"
        onClick={() => goTo(0)}
        aria-label="Back to start"
        className={`fixed left-4 top-4 z-30 flex items-center gap-2 transition-colors md:left-6 md:top-6 ${
          dark ? "text-white" : "text-slate-900"
        }`}
      >
        <span className="grid h-7 w-7 place-items-center rounded-md bg-indigo-600 text-xs font-bold text-white shadow-sm">
          M
        </span>
        <span className="text-sm font-semibold">MSD Challenge</span>
      </button>

      {/* Right-side slide indicator */}
      <nav
        aria-label="Slides"
        className={`fixed right-3 top-1/2 z-30 flex -translate-y-1/2 flex-col items-end gap-3 transition-colors md:right-5 ${
          dark ? "text-white" : "text-slate-900"
        }`}
      >
        {slides.map((s, i) => {
          const isActive = i === active;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => goTo(i)}
              aria-label={s.label}
              aria-current={isActive ? "true" : undefined}
              className="group relative flex h-4 items-center justify-end"
            >
              <span className="pointer-events-none absolute right-6 hidden whitespace-nowrap rounded-md bg-slate-900/90 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-sm transition-opacity duration-200 group-hover:opacity-100 md:block">
                {s.label}
              </span>
              <span
                className={`block rounded-full bg-current transition-all duration-300 ${
                  isActive
                    ? "h-5 w-1.5 opacity-100"
                    : "h-1.5 w-1.5 opacity-40 group-hover:opacity-80"
                }`}
              />
            </button>
          );
        })}
      </nav>
    </>
  );
}
