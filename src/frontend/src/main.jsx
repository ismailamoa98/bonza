// main.jsx — React 18 entry point.
// Mounts the App into #root and pulls in Tailwind via index.css.
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
