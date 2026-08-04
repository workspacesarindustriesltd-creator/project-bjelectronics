
import React from "react";
import { createRoot } from "react-dom/client";
import { AdminApp } from "../../src/AdminApp.jsx";
import "../../src/styles.css";
import "../../src/admin-styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AdminApp />
  </React.StrictMode>,
);
