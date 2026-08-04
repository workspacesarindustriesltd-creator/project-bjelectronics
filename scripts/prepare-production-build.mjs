#!/usr/bin/env node
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const store = path.join(dist, "client", "index.html");
const adminSource = path.join(dist, "admin-client");
const adminIndex = path.join(adminSource, "index.html");
const worker = path.join(root, "worker", "index.js");
const hosting = path.join(root, ".openai", "hosting.json");
const packageJson = path.join(root, "package.json");
const packageLock = path.join(root, "package-lock.json");
const serverSource = path.join(root, "server");
const databaseSource = path.join(root, "database");
const migrationSource = path.join(root, "scripts", "migrate.mjs");

for (const file of [
  store,
  adminIndex,
  worker,
  hosting,
  packageJson,
  packageLock,
  path.join(serverSource, "index.js"),
  path.join(databaseSource, "schema.sql"),
  migrationSource,
]) {
  if (!existsSync(file)) throw new Error(`Missing production build input: ${file}`);
}

const adminTarget = path.join(dist, "client", "admin");
rmSync(adminTarget, { recursive: true, force: true });
mkdirSync(adminTarget, { recursive: true });
cpSync(adminSource, adminTarget, { recursive: true });
rmSync(adminSource, { recursive: true, force: true });

// Preserve the existing static-worker package for OpenAI Sites compatibility.
mkdirSync(path.join(dist, "server"), { recursive: true });
mkdirSync(path.join(dist, ".openai"), { recursive: true });
cpSync(worker, path.join(dist, "server", "index.js"));
cpSync(hosting, path.join(dist, ".openai", "hosting.json"));

// Build a self-contained managed Node.js runtime for Hostinger output-directory deployments.
const runtime = path.join(dist, "runtime");
rmSync(runtime, { recursive: true, force: true });
mkdirSync(path.join(runtime, "scripts"), { recursive: true });
cpSync(serverSource, path.join(runtime, "server"), { recursive: true });
cpSync(databaseSource, path.join(runtime, "database"), { recursive: true });
cpSync(migrationSource, path.join(runtime, "scripts", "migrate.mjs"));

const sourcePackage = JSON.parse(readFileSync(packageJson, "utf8"));
const runtimePackage = {
  ...sourcePackage,
  main: "index.js",
  scripts: {
    start: "node index.js",
    "db:migrate": "node runtime/scripts/migrate.mjs",
  },
};

writeFileSync(path.join(dist, "package.json"), `${JSON.stringify(runtimePackage, null, 2)}\n`);
cpSync(packageLock, path.join(dist, "package-lock.json"));
writeFileSync(path.join(dist, "index.js"), 'import "./runtime/server/index.js";\n');
writeFileSync(path.join(dist, ".nvmrc"), "20\n");

console.log(
  "Prepared storefront, administrator portal, managed Node.js runtime, worker, and hosting metadata.",
);
