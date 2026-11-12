const PAYPAL_SANDBOX = "https://api-m.sandbox.paypal.com";

export function getPayPalBaseUrl() {
  const configured = process.env.PAYPAL_BASE_URL || PAYPAL_SANDBOX;
  if (configured !== PAYPAL_SANDBOX) {
    throw new Error("Only the PayPal Sandbox endpoint is enabled in this prototype.");
  }
  return PAYPAL_SANDBOX;
}

export async function getPayPalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("PayPal Sandbox credentials are not configured.");
  }

  const baseUrl = getPayPalBaseUrl();
  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
    signal: AbortSignal.timeout(15000)
  });

  if (!response.ok) {
    throw new Error("PayPal authentication failed. Check the Sandbox app credentials.");
  }

  const data = await response.json();
  if (typeof data.access_token !== "string" || !data.access_token) {
    throw new Error("PayPal did not return an access token.");
  }

  return { token: data.access_token as string, baseUrl };
}

export function safePayPalError(data: unknown, fallback: string) {
  if (data && typeof data === "object" && "message" in data &&
      typeof (data as { message?: unknown }).message === "string") {
    return (data as { message: string }).message.slice(0, 240);
  }
  return fallback;
}
