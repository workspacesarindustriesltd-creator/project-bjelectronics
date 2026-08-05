import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Database } from "@phosphor-icons/react";
import { AdminPortal } from "./AdminPortal.jsx";
import { CatalogOperations } from "./CatalogOperations.jsx";

function CatalogNavigationBridge({ onNavigate }) {
  const [target, setTarget] = useState(null);

  useEffect(() => {
    const locate = () => {
      const navigation = document.querySelector(".adm-sidebar nav");
      if (navigation) setTarget(navigation);
    };
    locate();
    const observer = new MutationObserver(locate);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  if (!target) return null;
  return createPortal(
    <button type="button" onClick={() => onNavigate("/admin/catalog")}>
      <Database />
      <span>Catalog operations</span>
    </button>,
    target,
  );
}

export function AdminPlatform() {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const sync = () => setPath(window.location.pathname);
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const navigate = (nextPath) => {
    window.history.replaceState({}, "", nextPath);
    setPath(nextPath);
  };

  if (path.startsWith("/admin/catalog")) {
    return <CatalogOperations onNavigate={navigate} />;
  }

  return <>
    <AdminPortal />
    <CatalogNavigationBridge onNavigate={navigate} />
  </>;
}
