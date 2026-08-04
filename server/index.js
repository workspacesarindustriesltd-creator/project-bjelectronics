
import { createApp } from "./app.js";
import { config } from "./config.js";
import { healthcheck } from "./db.js";
import { MySqlRepository } from "./repository.js";

const app = createApp({ repository: new MySqlRepository(), healthcheck });
app.listen(config.port, () => {
  console.log(`BJ Electronics API listening on port ${config.port}`);
});
