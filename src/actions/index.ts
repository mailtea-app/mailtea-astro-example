import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:schema";
import { MailteaError } from "mailtea-sdk";
import { sendMessage } from "../lib/mailtea.ts";

export const server = {
  sendEmail: defineAction({
    // `accept: "form"` lets a plain <form> post straight to the action, so the
    // page still works before (or without) client-side JavaScript.
    accept: "form",
    // Astro validates against this schema before `handler` runs, and infers the
    // argument types from it.
    input: z.object({
      to: z.string().email(),
      subject: z.string().min(1).max(200),
      message: z.string().min(1).max(5000)
    }),
    handler: async (input) => {
      try {
        return { id: await sendMessage(input) };
      } catch (error) {
        if (error instanceof MailteaError) {
          // Surface the API's own message. A 4xx is the caller's problem (an
          // unverified domain, a suppressed address); anything else is ours.
          throw new ActionError({
            code: error.status >= 400 && error.status < 500
              ? "BAD_REQUEST"
              : "INTERNAL_SERVER_ERROR",
            message: error.message
          });
        }
        throw error;
      }
    }
  })
};
