import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import useFile from "./stores/file";
import useJson from "./stores/json";
import useConfig from "./stores/config";
import "./styles/global.css";
import "./styles/modal.css";

// Dev-only store handles for debugging/inspection.
if (import.meta.env.DEV) {
  (window as any).__stores = { useFile, useJson, useConfig };
}

// The jsoncrack-react canvas + Monaco load lazily; the shell renders first.
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
