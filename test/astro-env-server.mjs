/**
 * `astro:env/server` is a virtual module the Astro build generates; outside a
 * build there is nothing for Node to resolve it to. This stub stands in for it
 * and reads the same values from `process.env` — which, for `access: "secret"`
 * fields, is where astro:env reads them at runtime anyway.
 */
export const MAILTEA_API_KEY = process.env.MAILTEA_API_KEY;
export const MAILTEA_API_BASE_URL = process.env.MAILTEA_API_BASE_URL;
export const MAILTEA_FROM = process.env.MAILTEA_FROM;
