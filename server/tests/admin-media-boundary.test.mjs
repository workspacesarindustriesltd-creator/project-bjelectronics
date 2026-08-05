import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { transformAdminSource } from "../../scripts/admin-boundary-plugin.mjs";
import { transformAdminMediaSource } from "../../scripts/admin-media-plugin.mjs";

const root = process.cwd();
const read = (file) => readFile(path.join(root, file), "utf8");

test("administrator production source includes media management after credential hardening", async () => {
  const source = await read("src/AdminApp.jsx");
  const secured = transformAdminSource(source);
  const integrated = transformAdminMediaSource(secured);

  assert.match(integrated, /import \{ MediaManager \}/);
  assert.match(integrated, /\["media", ImageSquare, "Media"\]/);
  assert.match(integrated, /<MediaManager adminRequest=\{adminRequest\}/);
  assert.match(integrated, /https:\/\/bjelectronics\.shop\/admin/);
  assert.doesNotMatch(integrated, /https:\/\/admin\.bjelectronics\.shop/);
  assert.doesNotMatch(integrated, /8-hour expiry/);
});

test("client media manager never references the Cloudinary API secret", async () => {
  const source = await read("src/admin/MediaManager.jsx");

  assert.match(source, /\/api\/admin\/media\/signature/);
  assert.match(source, /FormData/);
  assert.match(source, /f_auto,q_auto:good/);
  assert.doesNotMatch(source, /CLOUDINARY_API_SECRET|apiSecret/);
});
