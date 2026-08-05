import React from "react";
import { createRoot } from "react-dom/client";
import { StoreApp } from "../../src/store/StoreApp.jsx";
import "../../src/store/store.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <StoreApp />
  </React.StrictMode>,
);
