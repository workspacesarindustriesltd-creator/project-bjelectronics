#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const clientRoot = path.join(root, "dist", "client");
const storeAssets = path.join(clientRoot, "assets");
const adminAssets = path.join(clientRoot, "admin", "assets");

function collectJavaScript(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectJavaScript(target);
    if (entry.isFile() && /\.(?:js|mjs)$/.test(entry.name) && statSync(target).size > 0) return [target];
    return [];
  });
}

function readBundle(files, label) {
  if (!files.length) throw new Error(`No ${label} JavaScript bundle was produced.`);
  return files.map((file) => readFileSync(file, "utf8")).join("\n");
}

const storefrontBundle = readBundle(collectJavaScript(storeAssets), "storefront");
const administratorBundle = readBundle(collectJavaScript(adminAssets), "administrator");

const storefrontForbidden = [
  "/api/admin",
  "Administrator portal",
  "Commerce control center",
  "admin@bjelectronics.shop",
  "admin12345",
  "bj-admin-demo",
  "CLOUDINARY_API_SECRET",
  "UPSTASH_REDIS_REST_TOKEN",
];

const administratorForbidden = [
  "admin@bjelectronics.shop",
  "admin12345",
  "bj-admin-demo",
  "Local preview credentials are prefilled",
  "CLOUDINARY_API_SECRET",
  "UPSTASH_REDIS_REST_TOKEN",
  "private-secret",
];

for (const pattern of storefrontForbidden) {
  if (storefrontBundle.includes(pattern)) throw new Error(`Storefront bundle contains forbidden administrator content: ${pattern}`);
}

for (const pattern of administratorForbidden) {
  if (administratorBundle.includes(pattern)) throw new Error(`Administrator bundle contains forbidden credential content: ${pattern}`);
}

for (const requiredPattern of [
  "/api/admin/media/signature",
  "Upload to Cloudinary",
  "Create product from media",
]) {
  if (!administratorBundle.includes(requiredPattern)) {
    throw new Error(`Administrator bundle is missing required media integration: ${requiredPattern}`);
  }
}

for (const required of [
  path.join(clientRoot, "index.html"),
  path.join(clientRoot, "admin", "index.html"),
]) {
  if (!existsSync(required)) throw new Error(`Missing required application shell: ${required}`);
}

console.log("Verified storefront, administrator, credential, Redis, and Cloudinary bundle boundaries.");
