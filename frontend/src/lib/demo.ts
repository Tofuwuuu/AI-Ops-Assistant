/**
 * Demo mode: the public Vercel build sets VITE_DEMO_MODE=true at build time.
 * It is the only switch for sample data. Local dev and Docker never set it, so
 * they always talk to the real API and show real errors.
 */
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

export const DEMO_WRITE_TOOLTIP = "Works in the local version.";

export const README_LOCAL_URL =
  "https://github.com/Tofuwuuu/AI-Ops-Assistant#run-the-full-app-locally";

/**
 * Props for any control that writes data. In demo mode the control is
 * disabled and explains why; otherwise it keeps its own disabled state.
 */
export function writeLock(disabled = false) {
  if (!DEMO_MODE) return { disabled };
  return {
    disabled: true,
    title: DEMO_WRITE_TOOLTIP,
    "aria-disabled": true,
    "data-demo-locked": "",
  } as const;
}
