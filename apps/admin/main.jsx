import React from "react";
import { createRoot } from "react-dom/client";
import { AdminPlatform as AdminPortal } from "../../src/admin/AdminPlatform.jsx";
import "../../src/admin/admin-portal.css";
import "../../src/admin-media.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AdminPortal />
  </React.StrictMode>,
);
