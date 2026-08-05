#!/usr/bin/env node
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");

if (!existsSync(dist)) {
  throw new Error("Production output directory is missing. Run the application builds first.");
}

writeFileSync(path.join(dist, ".nvmrc"), "22\n");
console.log("Pinned the managed production artifact to Node.js 22.");
