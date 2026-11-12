import { NextResponse } from "next/server";
import { getPayPalAccessToken, safePayPalError, signOrderId } from "@/lib/paypal";

export const runtime = "nodejs";

const ALLOWED_CURRENCIES = new Set(["USD", "EUR", "GBP", "CAD", "AUD"]);

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "A valid JSON request body is required." }, { status: 400 });
    }

    const amount = Number(body.amount);
    const currency = typeof body.currency === "string" ? body.currency.toUpperCase() : "USD";
    const description = typeof body.description === "string" ? body.description.trim().slice(0, 127) : "PayPilot payment";

    if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000 || !/^\d+(\.\d{1,2})?$/.test(String(body.amount))) {
      return NextResponse.json({ error: "Enter an amount greater than zero with no more than two decimal places." }, { status: 400 });
    }
    if (!ALLOWED_CURRENCIES.has(currency)) {
      return NextResponse.json({ error: "Supported currencies are USD, EUR, GBP, CAD and AUD." }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    let parsedAppUrl: URL;
    try { parsedAppUrl = new URL(appUrl); } catch {
      return NextResponse.json({ error: "The application return URL is invalid." }, { status: 500 });
    }
    if (process.env.NODE_ENV === "production" && parsedAppUrl.protocol !== "https:") {
      return NextResponse.json({ error: "A secure HTTPS application URL is required in production." }, { status: 500 });
    }

    const { token, baseUrl } = await getPayPalAccessToken();
    const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
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
          return_url: `${parsedAppUrl.origin}/?payment=success`,
          cancel_url: `${parsedAppUrl.origin}/?payment=cancelled`,
          user_action: "PAY_NOW",
          shipping_preference: "NO_SHIPPING"
        } } }
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(20000)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json({ error: safePayPalError(data, "PayPal could not create the order.") }, { status: 502 });
    }

    const approval = Array.isArray(data.links)
      ? data.links.find((link: { rel?: string; href?: string }) =>
          (link.rel === "payer-action" || link.rel === "approve") &&
          typeof link.href === "string" && link.href.startsWith("https://www.sandbox.paypal.com/"))
      : undefined;

    if (typeof data.id !== "string" || !approval?.href) {
      return NextResponse.json({ error: "PayPal did not return a valid Sandbox approval link." }, { status: 502 });
    }

    const result = NextResponse.json({ id: data.id, approvalUrl: approval.href }, { headers: { "Cache-Control": "no-store" } });
    result.cookies.set("pp_order_proof", `${data.id}.${signOrderId(data.id)}`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/paypal/capture-order",
      maxAge: 15 * 60
    });
    return result;
  } catch (error) {
    const message = error instanceof Error && error.name === "TimeoutError"
      ? "PayPal took too long to respond. Please try again."
      : error instanceof Error ? error.message : "Unable to create PayPal order.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
