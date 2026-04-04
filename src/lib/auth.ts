const DEFAULT_PRODUCTION_SITE_URL = "https://twone.xyz";

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function getSiteUrl() {
  const configuredSiteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.SITE_URL ||
    process.env.APP_URL;

  if (configuredSiteUrl) {
    return trimTrailingSlash(configuredSiteUrl);
  }

  if (process.env.NODE_ENV === "production") {
    return DEFAULT_PRODUCTION_SITE_URL;
  }

  return "http://localhost:3000";
}

export function getAuthCallbackUrl(next = "/assistant") {
  const callbackUrl = new URL("/auth/callback", getSiteUrl());

  if (next) {
    callbackUrl.searchParams.set("next", next);
  }

  return callbackUrl.toString();
}
