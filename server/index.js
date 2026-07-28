import { createApp } from "./app.js";
import { healthcheck } from "./db.js";
import { MySqlRepository } from "./repository.js";
import { SSLCommerzGateway } from "./payment-gateway.js";
import { config } from "./config.js";

const app = createApp({
  repository: new MySqlRepository(),
  paymentGateway: new SSLCommerzGateway(),
  healthcheck,
});

app.listen(config.port, () => {
  console.log(`BJ Electronics API listening on port ${config.port}`);
});
