import { existsSync } from "node:fs";
import path from "node:path";
import { createApp } from "./app.js";
import { config, isProduction } from "./config.js";
import { healthcheck } from "./db.js";
import { MySqlRepository } from "./repository.js";

const staticRoot = isProduction
  ? path.resolve(process.cwd(), "dist", "client")
  : null;

if (staticRoot && !existsSync(path.join(staticRoot, "index.html"))) {
  throw new Error("Production storefront build is missing. Run npm run build before npm start.");
}

if (staticRoot && !existsSync(path.join(staticRoot, "admin", "index.html"))) {
  throw new Error("Production administrator build is missing. Run npm run build before npm start.");
}

const app = createApp({
  repository: new MySqlRepository(),
  healthcheck,
  staticRoot,
});

app.listen(config.port, "0.0.0.0", () => {
  console.log(`BJ Electronics listening on port ${config.port}`);
});
