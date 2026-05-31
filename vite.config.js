import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { handleTikTokOAuthCallback } from "./api/_tiktokOAuth.js";
import socialAccountsHandler from "./api/social-accounts/index.js";
import profileAccountsHandler from "./api/social-accounts/profile-accounts.js";
import disconnectTikTokHandler from "./api/social-accounts/tiktok/disconnect.js";

function applyBackendEnv(env) {
  const keys = [
    "TIKTOK_CLIENT_KEY",
    "TIKTOK_CLIENT_SECRET",
    "TIKTOK_REDIRECT_URI",
    "VITE_TIKTOK_CLIENT_KEY",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];

  keys.forEach((key) => {
    if (!process.env[key] && env[key]) {
      process.env[key] = env[key];
    }
  });
}

function tiktokOAuthPlugin() {
  return {
    name: "socialflow-tiktok-oauth",
    configureServer(server) {
      server.middlewares.use("/api/auth/tiktok/token", handleTikTokOAuthCallback);
      server.middlewares.use("/api/auth/tiktok/callback", handleTikTokOAuthCallback);
      server.middlewares.use("/api/social-accounts/tiktok/disconnect", disconnectTikTokHandler);
      server.middlewares.use("/api/social-accounts/profile-accounts", profileAccountsHandler);
      server.middlewares.use("/api/social-accounts", socialAccountsHandler);
    },
  };
}

export default defineConfig(({ mode }) => {
  applyBackendEnv(loadEnv(mode, process.cwd(), ""));

  return {
    plugins: [react(), tiktokOAuthPlugin()],
    server: {
      host: "localhost",
      port: 5175,
      strictPort: true,
    },
  };
});
