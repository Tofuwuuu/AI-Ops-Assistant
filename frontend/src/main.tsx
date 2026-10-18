import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { DEMO_MODE } from "./lib/demo";

// Reserves room for the pinned demo banner before the first paint.
if (DEMO_MODE) document.documentElement.classList.add("demo-mode");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
