#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const store = path.join(dist, "client", "index.html");
const adminSource = path.join(dist, "admin-client");
const adminIndex = path.join(adminSource, "index.html");
const worker = path.join(root, "worker", "index.js");
const hosting = path.join(root, ".openai", "hosting.json");

for (const file of [store, adminIndex, worker, hosting]) {
  if (!existsSync(file)) throw new Error(`Missing production build input: ${file}`);
}

const adminTarget = path.join(dist, "client", "admin");
rmSync(adminTarget, { recursive: true, force: true });
mkdirSync(adminTarget, { recursive: true });
cpSync(adminSource, adminTarget, { recursive: true });
rmSync(adminSource, { recursive: true, force: true });

mkdirSync(path.join(dist, "server"), { recursive: true });
mkdirSync(path.join(dist, ".openai"), { recursive: true });
cpSync(worker, path.join(dist, "server", "index.js"));
cpSync(hosting, path.join(dist, ".openai", "hosting.json"));

console.log("Prepared storefront, administrator portal, worker, and hosting metadata.");
