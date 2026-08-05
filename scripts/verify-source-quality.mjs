#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
const scriptRoots = ["server", "scripts", "worker"];
const sourceExtensions = new Set([".js", ".mjs"]);
const forbiddenClientValues = [
  "admin@bjelectronics.shop",
  "admin12345",
  "CLOUDINARY_API_SECRET",
  "UPSTASH_REDIS_REST_TOKEN",
  "GITHUB_CLIENT_SECRET",
  "GOOGLE_CLIENT_SECRET",
];

function collect(directory) {
  const output = [];
  for (const entry of readdirSync(directory)) {
    const absolute = path.join(directory, entry);
    const stats = statSync(absolute);
    if (stats.isDirectory()) output.push(...collect(absolute));
    else if (sourceExtensions.has(path.extname(entry))) output.push(absolute);
  }
  return output;
}

if (!String(packageJson.engines?.node || "").includes("22")) {
  throw new Error("package.json must declare the tested Node.js 22 runtime.");
}

for (const directory of scriptRoots) {
  for (const file of collect(path.join(root, directory))) {
    execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
  }
}

for (const relative of ["src/admin-enterprise", "src/store", "src/shared"]) {
  const directory = path.join(root, relative);
  for (const file of collect(directory)) {
    const source = readFileSync(file, "utf8");
    for (const value of forbiddenClientValues) {
      if (source.includes(value)) {
        throw new Error(`Frontend source ${path.relative(root, file)} contains forbidden value ${value}.`);
      }
    }
  }
}

console.log("Verified Node.js syntax, runtime targeting, and frontend credential boundaries.");
