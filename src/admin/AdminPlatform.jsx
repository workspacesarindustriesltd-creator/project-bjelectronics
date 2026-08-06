import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Database } from "@phosphor-icons/react";
import { AdminPortal } from "./AdminPortal.jsx";
import { CatalogOperations } from "./CatalogOperations.jsx";
import { OperationsConsole, isOperationsPath } from "./operations/OperationsConsole.jsx";
import "./ui/design-system.css";

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
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;
    const dispatch = () => window.dispatchEvent(new Event("admin:navigation"));

    window.history.pushState = function pushState(...args) {
      originalPushState.apply(this, args);
      dispatch();
    };
    window.history.replaceState = function replaceState(...args) {
      originalReplaceState.apply(this, args);
      dispatch();
    };

    window.addEventListener("popstate", sync);
    window.addEventListener("admin:navigation", sync);
    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener("popstate", sync);
      window.removeEventListener("admin:navigation", sync);
    };
  }, []);

  const navigate = useCallback((nextPath) => {
    window.history.pushState({}, "", nextPath);
    setPath(nextPath);
  }, []);

  if (isOperationsPath(path)) {
    return <OperationsConsole path={path} onNavigate={navigate} />;
  }

  if (path.startsWith("/admin/catalog")) {
    return <CatalogOperations onNavigate={navigate} />;
  }

  return <>
    <AdminPortal />
    <CatalogNavigationBridge onNavigate={navigate} />
  </>;
}
