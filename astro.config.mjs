import node from "@astrojs/node";
import { defineConfig, envField, passthroughImageService } from "astro/config";

export default defineConfig({
  // Sending email needs a server. `output: "server"` renders every page and API
  // route on demand, which is what both the Action and `/api/send` rely on.
  output: "server",
  adapter: node({ mode: "standalone" }),

  // No images here, so skip Astro's sharp-based optimizer and the native
  // dependency it needs. Drop this once you add images worth optimizing.
  image: { service: passthroughImageService() },

  security: {
    // Astro's CSRF check compares a form POST's `origin` header against
    // `Astro.url`. On the Node adapter that URL is built from the request's
    // host only when the host matches one of these patterns — otherwise Astro
    // falls back to `http://localhost` and every form post 403s. Add the
    // hostname you deploy to (`{ hostname: "app.acme.com" }`).
    allowedDomains: [{ hostname: "localhost" }, { hostname: "127.0.0.1" }]
  },

  env: {
    schema: {
      // `access: "secret"` does two things that matter here: the value never
      // reaches the client bundle, and it is read from the environment at
      // runtime rather than inlined at build time — so one build can run
      // against production, a self-hosted instance, or a local API.
      MAILTEA_API_KEY: envField.string({ context: "server", access: "secret" }),
      MAILTEA_FROM: envField.string({ context: "server", access: "secret" }),
      // Only set for local dev or a self-hosted Mailtea. Unset in production.
      MAILTEA_API_BASE_URL: envField.string({
        context: "server",
        access: "secret",
        optional: true
      })
    }
  }
});
