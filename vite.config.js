import { defineConfig } from "vite";
import { handleBeta } from "./server/beta.mjs";

const betaSignup = {
  name: "side-quest-beta-signup",
  configureServer(server) {
    server.middlewares.use(handleBeta);
  },
  configurePreviewServer(server) {
    server.middlewares.use(handleBeta);
  },
};

export default defineConfig({
  plugins: [betaSignup],
  build: { target: "es2020" },
});
