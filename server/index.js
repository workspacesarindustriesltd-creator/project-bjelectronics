import { existsSync } from "node:fs";
import path from "node:path";
import { createApp } from "./app.js";
import { config, isProduction } from "./config.js";
import { healthcheck } from "./db.js";
import { MySqlRepository } from "./repository.js";

const hasApplicationShells = (directory) =>
  existsSync(path.join(directory, "index.html")) &&
  existsSync(path.join(directory, "admin", "index.html"));

const staticRoot = isProduction
  ? [
      path.resolve(process.cwd(), "dist", "client"),
      path.resolve(process.cwd(), "client"),
    ].find(hasApplicationShells)
  : null;

if (isProduction && !staticRoot) {
  throw new Error(
    "Production storefront and administrator builds are missing. Run npm run build before npm start.",
  );
}

const app = createApp({
  repository: new MySqlRepository(),
  healthcheck,
  staticRoot,
});

app.listen(config.port, "0.0.0.0", () => {
  console.log(`BJ Electronics listening on port ${config.port}`);
});
