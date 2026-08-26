import {
  MAILTEA_API_BASE_URL,
  MAILTEA_API_KEY,
  MAILTEA_FROM
} from "astro:env/server";
import { Mailtea, MailteaError } from "mailtea-sdk";

export interface Message {
  to: string;
  subject: string;
  message: string;
}

/**
 * Send one message and return its Mailtea id.
 *
 * Both entry points in this example — the Astro Action and the `/api/send`
 * route — call this. Only the transport differs; the send is the same.
 *
 * Throws `MailteaError` on a non-2xx response *and* on a failure to reach the
 * API at all, so a caller only ever has one error type to map.
 *
 * A *missing* variable never reaches here. The named imports above are read
 * when this module is first evaluated, so an unset `MAILTEA_API_KEY` makes the
 * import itself throw `EnvInvalidVariables` — Astro answers 500 and names the
 * variable in the server log. That is the framework's contract, and it is the
 * behaviour you want: the app fails loudly on the first request instead of
 * accepting sends it cannot deliver.
 */
export async function sendMessage({ to, subject, message }: Message): Promise<string> {
  // Cheap to construct — it holds a key and a base URL, opens nothing, and
  // starts no connection — so there is no reason to hoist it to module scope.
  const mailtea = new Mailtea(MAILTEA_API_KEY, {
    // Only needed for local dev or a self-hosted Mailtea. Omit in production.
    baseUrl: MAILTEA_API_BASE_URL
  });

  try {
    const { id } = await mailtea.emails.send({
      from: MAILTEA_FROM,
      to,
      subject,
      html: `<p>${escapeHtml(message)}</p>`,
      // A text part for clients that will not render HTML.
      text: message
    });

    return id;
  } catch (error) {
    if (error instanceof MailteaError) throw error;

    // The SDK turns a *response* into a `MailteaError`. A request that never
    // gets one — DNS, TLS, a refused connection, a typo in
    // `MAILTEA_API_BASE_URL` — comes out of `fetch` as a bare
    // `TypeError: fetch failed`, and that is the likeliest failure in
    // production. Left uncaught it reaches the client as a 500 with an empty
    // body — exactly the opaque failure both callers map errors to avoid — so
    // give it the shape they already handle. `status: 0` is the SDK's own
    // convention for "no response came back".
    throw new MailteaError(
      `Could not reach Mailtea: ${error instanceof Error ? error.message : String(error)}`,
      { status: 0, code: "transport_error" }
    );
  }
}

/** The message is typed by a stranger and lands in an HTML body. Escape it. */
function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
