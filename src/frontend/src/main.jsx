// main.jsx — app entry: Sentry init (lib/sentry), consent-gated analytics init (lib/analytics), router.
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { initSentry } from "./lib/sentry";
import { initAnalytics } from "./lib/analytics";

initSentry();
initAnalytics(); // no-op without a key / without analytics consent; re-inits on opt-in

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
