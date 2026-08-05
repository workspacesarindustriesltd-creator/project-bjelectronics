const forbiddenAdminPatterns = [
  "admin@bjelectronics.shop",
  "admin12345",
  "bj-admin-demo",
  "Local preview credentials are prefilled",
];

function replaceRequired(source, search, replacement, label) {
  if (!source.includes(search)) throw new Error(`Could not apply administrator boundary transform: ${label}.`);
  return source.replace(search, replacement);
}

export function transformAdminSource(source) {
  let code = source;

  code = replaceRequired(
    code,
    'const isLocalPreview = ["localhost", "127.0.0.1", "terminal.local"].includes(window.location.hostname);\n',
    "",
    "local preview flag",
  );

  code = replaceRequired(
    code,
    '  const [form, setForm] = useState({ email: isLocalPreview ? "admin@bjelectronics.shop" : "", password: isLocalPreview ? "admin12345" : "" });',
    '  const [form, setForm] = useState({ email: "", password: "" });',
    "credential defaults",
  );

  const fallbackStart = '    } catch (requestError) {\n      if (isLocalPreview && form.email === "admin@bjelectronics.shop" && form.password === "admin12345") {';
  const fallbackEnd = '    } finally {\n      setBusy(false);';
  const fallbackStartIndex = code.indexOf(fallbackStart);
  const fallbackEndIndex = code.indexOf(fallbackEnd, fallbackStartIndex);
  if (fallbackStartIndex === -1 || fallbackEndIndex === -1) {
    throw new Error("Could not remove administrator demo login fallback.");
  }
  code = `${code.slice(0, fallbackStartIndex)}    } catch (requestError) {\n      setError(requestError.message);\n${code.slice(fallbackEndIndex)}`;

  code = replaceRequired(
    code,
    '          {isLocalPreview && <div className="ops-demo-note"><ShieldCheck /> Local preview credentials are prefilled. Replace them through environment variables before production.</div>}\n',
    "",
    "local credential notice",
  );

  const sessionStart = '    adminRequest("/api/admin/auth/me")';
  const sessionEnd = '    return () => window.removeEventListener("popstate", syncPath);';
  const sessionStartIndex = code.indexOf(sessionStart);
  const sessionEndIndex = code.indexOf(sessionEnd, sessionStartIndex);
  if (sessionStartIndex === -1 || sessionEndIndex === -1) {
    throw new Error("Could not replace administrator session bootstrap.");
  }
  code = `${code.slice(0, sessionStartIndex)}    adminRequest("/api/admin/auth/me")\n      .then((response) => setUser(response.user))\n      .catch(() => setUser(null))\n      .finally(() => setLoading(false));\n${code.slice(sessionEndIndex)}`;

  code = replaceRequired(
    code,
    '    sessionStorage.removeItem("bj-admin-demo");\n',
    "",
    "demo session cleanup",
  );

  const remaining = forbiddenAdminPatterns.filter((pattern) => code.includes(pattern));
  if (remaining.length) {
    throw new Error(`Administrator boundary verification failed: ${remaining.join(", ")}`);
  }

  return code;
}

export function adminBoundaryPlugin() {
  return {
    name: "bj-admin-credential-boundary",
    enforce: "pre",
    transform(code, id) {
      if (!/[\\/]src[\\/]AdminApp\.jsx$/.test(id)) return null;
      return { code: transformAdminSource(code), map: null };
    },
  };
}
