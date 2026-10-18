import { DEMO_MODE, README_LOCAL_URL } from "../lib/demo";

/** Pinned above the app in the demo build. Its height is reserved in index.css. */
export function DemoBanner() {
  if (!DEMO_MODE) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-30 flex h-[var(--banner-h)] items-center justify-center border-b border-slate-200 bg-surface-muted px-4 text-center text-xs leading-snug text-slate-600 sm:text-sm"
    >
      <p>
        This demo uses sample data. To try the full app,{" "}
        <a
          href={README_LOCAL_URL}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800"
        >
          run it locally
        </a>
        .
      </p>
    </div>
  );
}
