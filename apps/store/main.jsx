import React from "react";
import { createRoot } from "react-dom/client";
import { StoreApp } from "../../src/store/StoreApp.jsx";
import { initializeStorefrontConfig } from "../../src/store/runtime-config.js";
import "../../src/store/store.css";

async function bootstrapStorefront() {
  await initializeStorefrontConfig();
  createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <StoreApp />
    </React.StrictMode>,
  );
}

bootstrapStorefront();
