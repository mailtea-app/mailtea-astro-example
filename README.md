# Mailtea + Astro Example

This example shows how to use [Mailtea](https://mailtea.app) with Astro to send
an email two ways from the same app: through an Astro Action that a form posts
to, and through a plain `POST /api/send` JSON route.

## Prerequisites

To get the most out of this guide, you'll need to:

- [Create an API key](https://studio.mailtea.app/api-keys)
- [Verify your domain](https://docs.mailtea.app/docs/documentation/domains)
- Node 22.18 or newer

## Instructions

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and add your API key and From address:
   ```bash
   cp .env.example .env
   ```
3. Run it:
   ```bash
   npm run dev
   ```
   Open http://localhost:4321 and send yourself a message, or call the JSON
   route directly:
   ```bash
   curl -X POST http://localhost:4321/api/send \
     -H 'content-type: application/json' \
     -d '{"to":"reader@yourdomain.com","subject":"Hello","message":"Sent with Mailtea."}'
   ```

## Action or API route?

Both entry points call the same `sendMessage()` in `src/lib/mailtea.ts`. Only
the way the request reaches it differs.

Use an **Astro Action** (`src/actions/index.ts`) when the caller is your own
Astro UI. You get a Zod schema that validates the input and types the handler,
a `<form action={actions.sendEmail}>` that works without client-side
JavaScript, the result waiting for you in `Astro.getActionResult()`, and a
typed `actions.sendEmail(...)` call from any framework island.

Use an **API route** (`src/pages/api/send.ts`) when the caller is not your
Astro app: a mobile client, a webhook, a cron job, another service, curl. It is
a plain `Request` in and `Response` out, so you own the parsing, the
validation, and the status codes — and nothing about it is Astro-specific.

## What this example covers

- Sending with the [`mailtea-sdk`](https://www.npmjs.com/package/mailtea-sdk)
  Node SDK
- An Astro Action that a plain HTML form posts to, with Zod input validation
- A framework-agnostic `POST /api/send` JSON endpoint
- Server-only secrets through `astro:env`, read at runtime rather than baked
  into the build
- Mapping `MailteaError` onto real status codes instead of an opaque 500 —
  including a Mailtea that cannot be reached at all, which `fetch` reports as
  a bare `TypeError`
- Escaping caller-supplied text before it goes into an HTML email body

## Tests

```bash
npm test
```

The tests run against a stand-in Mailtea on localhost, so they need no API key
and reach nothing outside the machine. They import the API route's `POST`
handler directly and assert on the request the SDK sent (`test/send.test.mjs`),
and on what the route answers when Mailtea rejects the send or cannot be
reached at all (`test/send-errors.test.mjs`).

## Deploying

```bash
npm run build
npm run preview   # node --env-file-if-exists=.env ./dist/server/entry.mjs
```

The built server reads its configuration from the environment, so set
`MAILTEA_API_KEY` and `MAILTEA_FROM` wherever you deploy — no rebuild needed to
change them.

One thing to get right: add the hostname you serve from to
`security.allowedDomains` in `astro.config.mjs`. Astro's CSRF check compares a
form post's `origin` header against `Astro.url`, and the Node adapter only
builds that URL from the request's host when the host is on that list.
Otherwise every form submission answers `403 Cross-site POST form submissions
are forbidden`.

## Learn more

- [Documentation](https://docs.mailtea.app)
- [API reference](https://docs.mailtea.app/docs/api-reference)
- [Node.js SDK](https://github.com/mailtea-app/mailtea-node) ·
  [Python SDK](https://github.com/mailtea-app/mailtea-python) ·
  [MCP server](https://github.com/mailtea-app/mailtea-mcp)
