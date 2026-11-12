import { NextResponse } from "next/server";

export const runtime = "nodejs";

async function getAccessToken() {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new Error("PayPal sandbox credentials are not configured.");
  const base = process.env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com";
  const response = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials",
    cache: "no-store"
  });
  if (!response.ok) throw new Error("PayPal authentication failed. Check your sandbox credentials.");
  const data = await response.json();
  return { token: data.access_token as string, base };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const amount = Number(body.amount);
    const currency = String(body.currency || "USD").toUpperCase();
    const description = String(body.description || "PayPilot payment").slice(0, 127);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000) {
      return NextResponse.json({ error: "Enter a valid amount greater than zero." }, { status: 400 });
    }
    if (!/^[A-Z]{3}$/.test(currency)) {
      return NextResponse.json({ error: "Use a valid three-letter currency code." }, { status: 400 });
    }

    const { token, base } = await getAccessToken();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const response = await fetch(`${base}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": crypto.randomUUID()
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{ description, amount: { currency_code: currency, value: amount.toFixed(2) } }],
        payment_source: { paypal: { experience_context: {
          return_url: `${appUrl}/?payment=success`,
          cancel_url: `${appUrl}/?payment=cancelled`,
          user_action: "PAY_NOW",
          shipping_preference: "NO_SHIPPING"
        } } }
      }),
      cache: "no-store"
    });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: data.message || "PayPal could not create the order." }, { status: response.status });
    const approve = data.links?.find((link: { rel: string; href: string }) => link.rel === "payer-action" || link.rel === "approve");
    return NextResponse.json({ id: data.id, approvalUrl: approve?.href });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create PayPal order." }, { status: 500 });
  }
}