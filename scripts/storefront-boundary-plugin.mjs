const ADMIN_SECTION_START = "\nfunction AdminDashboard(";
const PROFILE_SECTION_START = "\nfunction ProfilePage(";

const forbiddenStorefrontPatterns = [
  "/api/admin",
  "adminLoginUrl",
  "Administrator portal",
  "Commerce control center",
  "demoCustomers",
  "function AdminDashboard",
];

function removeSection(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`Could not enforce storefront boundary between ${startMarker.trim()} and ${endMarker.trim()}.`);
  }
  return `${source.slice(0, start)}${source.slice(end)}`;
}

export function transformStorefrontSource(source) {
  let code = source.replace('import { adminLoginUrl } from "./domain-config.js";\n', "");

  code = code.replace(
    /const demoCoupons = \[[\s\S]*?\];\n\nconst demoCustomers = \[[\s\S]*?\];\n\n/,
    "",
  );

  code = removeSection(code, ADMIN_SECTION_START, PROFILE_SECTION_START);

  code = code.replace(
    '        {mode === "login" && <div className="demo-logins"><span>Demo customer</span><button onClick={useDemo}>Use customer account</button><a href={adminLoginUrl}>Administrator portal <ArrowSquareOut /></a></div>}',
    '        {mode === "login" && <div className="demo-logins"><span>Demo customer</span><button onClick={useDemo}>Use customer account</button></div>}',
  );

  code = code.replace(
    '  if (authUser.role === "admin") return (\n    <main className="shell profile-page"><section className="account-empty"><ShieldCheck size={48} weight="duotone" /><h3>Administrator access has moved</h3><p>Store operations now use a separate protected administration portal.</p><a className="primary-button" href={adminLoginUrl}>Open BJ Admin <ArrowSquareOut /></a></section></main>\n  );\n',
    '  if (authUser.role === "admin") return <AuthPanel onAuthenticated={setAuthUser} />;\n',
  );

  const remaining = forbiddenStorefrontPatterns.filter((pattern) => code.includes(pattern));
  if (remaining.length) {
    throw new Error(`Storefront boundary verification failed: ${remaining.join(", ")}`);
  }

  return code;
}

export function storefrontBoundaryPlugin() {
  return {
    name: "bj-storefront-admin-boundary",
    enforce: "pre",
    transform(code, id) {
      if (!/[\\/]src[\\/]App\.jsx$/.test(id)) return null;
      return { code: transformStorefrontSource(code), map: null };
    },
  };
}
