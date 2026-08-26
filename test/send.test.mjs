import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { after, test } from "node:test";
import { startMockMailtea } from "./mock-mailtea.mjs";

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "astro:env/server") {
      return {
        url: new URL("./astro-env-server.mjs", import.meta.url).href,
        shortCircuit: true
      };
    }
    return next(specifier, context);
  }
});

const mailtea = await startMockMailtea();
after(() => mailtea.close());

// Set before the route is imported: the env stub reads process.env once.
process.env.MAILTEA_API_KEY = "mt_pat_test";
process.env.MAILTEA_API_BASE_URL = mailtea.url;
process.env.MAILTEA_FROM = "Acme <hello@acme.test>";

const { POST } = await import("../src/pages/api/send.ts");

const post = (body) =>
  POST({
    request: new Request("http://localhost/api/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    })
  });

test("sends the message and returns the email id", async () => {
  const response = await post({
    to: "reader@acme.test",
    subject: "Hello from Astro",
    message: "Sent with Mailtea."
  });

  assert.equal(response.status, 200);
  assert.match((await response.json()).id, /^txemail_/);

  assert.equal(mailtea.last.method, "POST");
  assert.equal(mailtea.last.path, "/v1/emails");
  assert.equal(mailtea.last.authorization, "Bearer mt_pat_test");
  assert.equal(mailtea.last.body.from, "Acme <hello@acme.test>");
  assert.equal(mailtea.last.body.to, "reader@acme.test");
  assert.equal(mailtea.last.body.subject, "Hello from Astro");
  assert.equal(mailtea.last.body.html, "<p>Sent with Mailtea.</p>");
});

test("escapes the message before it reaches the HTML body", async () => {
  await post({
    to: "reader@acme.test",
    subject: "Escaping",
    message: "<script>alert(1)</script>"
  });

  assert.equal(mailtea.last.body.html, "<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>");
});

test("rejects an incomplete body without calling the API", async () => {
  const before = mailtea.requests.length;
  const response = await post({ to: "reader@acme.test" });

  assert.equal(response.status, 400);
  assert.equal(mailtea.requests.length, before);
});
