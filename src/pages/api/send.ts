import type { APIRoute } from "astro";
import { MailteaError } from "mailtea-sdk";
import { sendMessage } from "../../lib/mailtea.ts";

/**
 * POST /api/send
 *
 * The framework-agnostic half of this example: a JSON endpoint any client can
 * call. Unlike an Action, nothing validates the body for you, so it does that
 * itself before touching the Mailtea SDK.
 *
 *   curl -X POST http://localhost:4321/api/send \
 *     -H 'content-type: application/json' \
 *     -d '{"to":"reader@yourdomain.com","subject":"Hi","message":"Hello"}'
 */
export const POST: APIRoute = async ({ request }) => {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return json(415, { error: "Send application/json." });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "Body is not valid JSON." });
  }

  const { to, subject, message } = (body ?? {}) as Record<string, unknown>;
  if (typeof to !== "string" || typeof subject !== "string" || typeof message !== "string") {
    return json(400, { error: "to, subject and message are required strings." });
  }

  try {
    return json(200, { id: await sendMessage({ to, subject, message }) });
  } catch (error) {
    if (error instanceof MailteaError) {
      // The SDK carries the API's status, so a rejected address stays a 4xx
      // here instead of turning into an opaque 500. Everything else is an
      // upstream failure and becomes a 502: a 5xx from Mailtea is not this
      // route's 5xx, and `status: 0` means no response came back at all
      // (`sendMessage` labels transport failures that way).
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      return json(status, { error: error.message, request_id: error.requestId });
    }
    throw error;
  }
};

function json(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" }
  });
}
