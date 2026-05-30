import "./index.css";
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./app";

const container = document.getElementById("root");
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker for offline support (only in production builds)
if (
  "serviceWorker" in navigator &&
  (window.location.protocol === "https:" ||
    window.location.hostname === "localhost")
) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`${process.env.PUBLIC_URL || ""}/service-worker.js`)
      .catch(() => {
        // App still works without the service worker
      });
  });
}
