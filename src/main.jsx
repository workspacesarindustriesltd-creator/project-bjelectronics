import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import { AdminApp } from "./AdminApp.jsx";
import "./styles.css";
import "./admin-styles.css";

const isAdminSurface =
  window.location.hostname.startsWith("admin.") ||
  window.location.pathname.startsWith("/admin");
const RootApp = isAdminSurface ? AdminApp : App;

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>,
);
