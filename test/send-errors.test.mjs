/**
 * The happy path lives in `send.test.mjs`. This file covers the half people
 * copy wrong: what `/api/send` answers when the send does not work.
 *
 * It is a separate file because `MAILTEA_API_BASE_URL` is read once, when the
 * route module is first imported — and `node --test` runs each test file in
 * its own process, so this one can point at a failing API without disturbing
 * the other.
 */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { registerHooks } from "node:module";
import { after, test } from "node:test";

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

// A Mailtea that fails on purpose. Which way it fails is chosen by the subject,
// so both cases can share one base URL — and therefore one process.
const api = createServer((req, res) => {
  let raw = "";
  req.on("data", (chunk) => {
    raw += chunk;
  });
  req.on("end", () => {
    const subject = JSON.parse(raw || "{}").subject;

    // No response at all, the way an outage or a wrong host looks from here.
    if (subject === "unreachable") return req.socket.destroy();

    // How the real API refuses a `from` on an unverified domain: 422, an
    // `error` string, and an `x-request-id` worth quoting in a support thread.
    res.writeHead(422, {
      "content-type": "application/json",
      "x-request-id": "req_00000000000000000000000000000000"
    });
    res.end(
      JSON.stringify({
        error: "Invalid 'from'. You can only send from a verified email domain."
      })
    );
  });
});
await new Promise((resolve) => api.listen(0, "127.0.0.1", resolve));
after(() => new Promise((resolve) => api.close(resolve)));

process.env.MAILTEA_API_KEY = "mt_pat_test";
process.env.MAILTEA_API_BASE_URL = `http://127.0.0.1:${api.address().port}`;
process.env.MAILTEA_FROM = "Acme <hello@unverified.test>";

const { POST } = await import("../src/pages/api/send.ts");

const post = (body) =>
  POST({
    request: new Request("http://localhost/api/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    })
  });

test("passes the API's own 4xx and message through, not an opaque 500", async () => {
  const response = await post({
    to: "reader@acme.test",
    subject: "rejected",
    message: "Sent with Mailtea."
  });

  assert.equal(response.status, 422);
  assert.deepEqual(await response.json(), {
    error: "Invalid 'from'. You can only send from a verified email domain.",
    request_id: "req_00000000000000000000000000000000"
  });
});

test("answers 502, with a body, when Mailtea cannot be reached", async () => {
  const response = await post({
    to: "reader@acme.test",
    subject: "unreachable",
    message: "Sent with Mailtea."
  });

  // Not a 500, and not an empty body: a caller can tell "Mailtea is down" from
  // "your request was wrong" without reading our server logs.
  assert.equal(response.status, 502);
  assert.match((await response.json()).error, /^Could not reach Mailtea: /);
});
