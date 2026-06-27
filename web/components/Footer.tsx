export default function Footer() {
  return (
    <footer id="about" className="border-t border-slate-200 bg-slate-900 text-slate-300">
      <div className="mx-auto max-w-6xl px-5 py-12 text-sm">
        <div className="grid gap-8 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="font-semibold text-white">MSD Floor-Plan Challenge</div>
            <p className="mt-2 max-w-md text-slate-400">
              A live tool for the Modified Swiss Dwellings generative challenge: draw a structure and
              generate a plan, train models on the GPU, and browse the real dataset — everything rendered
              and scored live with the official MSD tooling.
            </p>
            <a
              href="/studio"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              ✦ Open the Studio →
            </a>
          </div>

          <div>
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Dataset</div>
            <ul className="space-y-2">
              <li><a className="text-slate-300 hover:text-indigo-300" href="https://archilyse.standfest.science/modified-swiss-dwellings" target="_blank" rel="noopener noreferrer">Archilyse · MSD overview</a></li>
              <li><a className="text-slate-300 hover:text-indigo-300" href="https://data.4tu.nl/datasets/e1d89cb5-6872-48fc-be63-aadd687ee6f9" target="_blank" rel="noopener noreferrer">4TU.ResearchData (official)</a></li>
              <li><a className="text-slate-300 hover:text-indigo-300" href="https://www.kaggle.com/datasets/caspervanengelenburg/modified-swiss-dwellings" target="_blank" rel="noopener noreferrer">Kaggle mirror</a></li>
            </ul>
          </div>

          <div>
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Papers &amp; code</div>
            <ul className="space-y-2">
              <li><a className="text-slate-300 hover:text-indigo-300" href="https://arxiv.org/abs/2407.10121" target="_blank" rel="noopener noreferrer">MSD paper (ECCV 2024)</a></li>
              <li><a className="text-slate-300 hover:text-indigo-300" href="https://github.com/caspervanengelenburg/msd" target="_blank" rel="noopener noreferrer">MSD GitHub</a></li>
              <li><a className="text-slate-300 hover:text-indigo-300" href="/research">Full reading list →</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-slate-800 pt-6 text-xs text-slate-500">
          EHL Paris · Challenge 1 — single source of truth for the project.
        </div>
      </div>
    </footer>
  );
}
