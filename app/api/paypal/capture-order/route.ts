import { NextRequest, NextResponse } from "next/server";
import { getPayPalAccessToken, safePayPalError, verifyOrderProof } from "@/lib/paypal";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const orderId = body && typeof body.orderId === "string" ? body.orderId.trim() : "";
    if (!/^[A-Za-z0-9-]{10,80}$/.test(orderId)) {
      return NextResponse.json({ error: "A valid PayPal order ID is required." }, { status: 400 });
    }

    const proof = request.cookies.get("pp_order_proof")?.value || "";
    const [proofOrderId, signature] = proof.split(".");
    if (proofOrderId !== orderId || !signature || !verifyOrderProof(orderId, signature)) {
      return NextResponse.json({ error: "This order was not created by this PayPilot session. Start a new payment request." }, { status: 403 });
    }

    const { token, baseUrl } = await getPayPalAccessToken();
    const response = await fetch(`${baseUrl}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": `capture-${orderId}`
      },
      cache: "no-store",
      signal: AbortSignal.timeout(20000)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json({ error: safePayPalError(data, "Payment capture failed.") }, { status: response.status === 422 ? 409 : 502 });
    }

    const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
    const result = NextResponse.json({
      id: data.id,
      status: data.status,
      captureId: capture?.id ?? null,
      captureStatus: capture?.status ?? null,
      payer: data.payer?.name?.given_name || "Customer"
    }, { headers: { "Cache-Control": "no-store" } });
    result.cookies.set("pp_order_proof", "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/paypal/capture-order", maxAge: 0 });
    return result;
  } catch (error) {
    const message = error instanceof Error && error.name === "TimeoutError"
      ? "PayPal capture timed out. Check the order status before retrying."
      : error instanceof Error ? error.message : "Unable to capture payment.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
