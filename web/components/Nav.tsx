"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const PAGES = [
  ["/", "Overview"],
  ["/input", "Input data"],
  ["/live", "Live ●"],
  ["/ideas", "Ideas"],
  ["/docs", "Docs"],
] as const;

export default function Nav() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-paper/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-indigo-600 text-xs font-bold text-white">M</span>
          <span className="text-sm font-semibold text-slate-900">MSD Floor-Plan Challenge</span>
        </Link>
        <nav className="flex gap-1 sm:gap-2">
          {PAGES.map(([href, label]) => {
            const active = href === "/" ? path === "/" : path.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
