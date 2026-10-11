import { env } from "../config/env";

export type RevalidateSettings = { secret: string | null; frontendUrl: string };

export const revalidateTags = async (
  tags: string[],
  settings: RevalidateSettings,
  fetchImpl: typeof fetch = fetch,
) => {
  if (!settings.secret) return false;
  try {
    const response = await fetchImpl(`${settings.frontendUrl}/api/revalidate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-revalidate-secret": settings.secret },
      body: JSON.stringify({ tags }),
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) console.error(`Revalidation refused (${response.status}) for ${tags.join(", ")}`);
    return response.ok;
  } catch (error) {
    console.error(`Revalidation failed for ${tags.join(", ")}:`, error instanceof Error ? error.message : error);
    return false;
  }
};

/** Fire and forget: a failure only delays the site by the 5 minute cache expiry. */
export const notifyVenuesChanged = (...slugs: string[]) => {
  const { revalidateSecret, frontendUrl, isProduction } = env();
  const tags = ["venues", ...slugs.map((slug) => `venue:${slug}`)];
  if (!revalidateSecret && !isProduction) console.log(`[dev] revalidation skipped: ${tags.join(", ")}`);
  void revalidateTags(tags, { secret: revalidateSecret, frontendUrl });
};

/** Landing page content and testimonials share one cache tag. */
export const notifyHomeChanged = () => {
  const { revalidateSecret, frontendUrl, isProduction } = env();
  if (!revalidateSecret && !isProduction) console.log("[dev] revalidation skipped: home");
  void revalidateTags(["home"], { secret: revalidateSecret, frontendUrl });
};
